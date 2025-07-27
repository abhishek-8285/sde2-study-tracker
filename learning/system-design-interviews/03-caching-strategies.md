# Caching Strategies 🚀

Master multi-level caching, cache invalidation patterns, and performance optimization with practical Java implementations for system design interviews.

## Table of Contents

- [Cache Hierarchy & Multi-Level Caching](#cache-hierarchy--multi-level-caching)
- [Cache Replacement Policies](#cache-replacement-policies)
- [Cache Invalidation Strategies](#cache-invalidation-strategies)
- [Distributed Caching](#distributed-caching)
- [Cache-Aside vs Write-Through vs Write-Behind](#cache-aside-vs-write-through-vs-write-behind)
- [Cache Stampede Prevention](#cache-stampede-prevention)

---

## Cache Hierarchy & Multi-Level Caching

### Multi-Level Cache Implementation

```java
public class MultiLevelCacheManager {

    private final CacheLevel l1Cache;  // In-memory (fastest)
    private final CacheLevel l2Cache;  // Redis (fast)
    private final CacheLevel l3Cache;  // Distributed cache (slower)
    private final DataSource dataSource; // Database (slowest)

    private final CacheMetrics metrics;

    public MultiLevelCacheManager() {
        this.l1Cache = new InMemoryCache(1000); // 1000 entries
        this.l2Cache = new RedisCache("localhost:6379");
        this.l3Cache = new DistributedCache("cache-cluster");
        this.dataSource = createDataSource();
        this.metrics = new CacheMetrics();
    }

    public <T> CompletableFuture<T> get(String key, Class<T> valueType,
                                       Function<String, T> dataLoader) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.nanoTime();

            try {
                // L1 Cache check
                Optional<T> l1Result = l1Cache.get(key, valueType);
                if (l1Result.isPresent()) {
                    metrics.recordHit(CacheLevel.L1, System.nanoTime() - startTime);
                    return l1Result.get();
                }

                // L2 Cache check
                Optional<T> l2Result = l2Cache.get(key, valueType);
                if (l2Result.isPresent()) {
                    // Populate L1 cache
                    l1Cache.put(key, l2Result.get(), Duration.ofMinutes(5));
                    metrics.recordHit(CacheLevel.L2, System.nanoTime() - startTime);
                    return l2Result.get();
                }

                // L3 Cache check
                Optional<T> l3Result = l3Cache.get(key, valueType);
                if (l3Result.isPresent()) {
                    // Populate L2 and L1 caches
                    l2Cache.put(key, l3Result.get(), Duration.ofHours(1));
                    l1Cache.put(key, l3Result.get(), Duration.ofMinutes(5));
                    metrics.recordHit(CacheLevel.L3, System.nanoTime() - startTime);
                    return l3Result.get();
                }

                // Load from data source
                T value = dataLoader.apply(key);
                if (value != null) {
                    // Populate all cache levels
                    l3Cache.put(key, value, Duration.ofDays(1));
                    l2Cache.put(key, value, Duration.ofHours(1));
                    l1Cache.put(key, value, Duration.ofMinutes(5));
                }

                metrics.recordMiss(System.nanoTime() - startTime);
                return value;

            } catch (Exception e) {
                metrics.recordError();
                throw new RuntimeException("Cache lookup failed", e);
            }
        });
    }

    public <T> CompletableFuture<Void> put(String key, T value) {
        return CompletableFuture.runAsync(() -> {
            // Write to all cache levels
            l1Cache.put(key, value, Duration.ofMinutes(5));
            l2Cache.put(key, value, Duration.ofHours(1));
            l3Cache.put(key, value, Duration.ofDays(1));
        });
    }

    public CompletableFuture<Void> invalidate(String key) {
        return CompletableFuture.runAsync(() -> {
            l1Cache.invalidate(key);
            l2Cache.invalidate(key);
            l3Cache.invalidate(key);
        });
    }

    // Cache warming strategy
    public void warmCache(List<String> popularKeys, Function<String, Object> dataLoader) {
        ExecutorService warmupExecutor = Executors.newFixedThreadPool(10);

        List<CompletableFuture<Void>> warmupTasks = popularKeys.stream()
            .map(key -> CompletableFuture.runAsync(() -> {
                try {
                    Object value = dataLoader.apply(key);
                    if (value != null) {
                        put(key, value);
                    }
                } catch (Exception e) {
                    System.err.println("Failed to warm cache for key: " + key);
                }
            }, warmupExecutor))
            .collect(Collectors.toList());

        CompletableFuture.allOf(warmupTasks.toArray(new CompletableFuture[0]))
            .thenRun(() -> {
                System.out.println("Cache warmup completed for " + popularKeys.size() + " keys");
                warmupExecutor.shutdown();
            });
    }

    public CacheStatistics getStatistics() {
        return metrics.getStatistics();
    }
}

// In-Memory Cache Implementation with LRU
public class InMemoryCache implements CacheLevel {
    private final int maxSize;
    private final Map<String, CacheEntry> cache;

    public InMemoryCache(int maxSize) {
        this.maxSize = maxSize;
        this.cache = new LinkedHashMap<String, CacheEntry>(maxSize + 1, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, CacheEntry> eldest) {
                return size() > maxSize;
            }
        };
    }

    @Override
    public synchronized <T> Optional<T> get(String key, Class<T> valueType) {
        CacheEntry entry = cache.get(key);
        if (entry != null && !entry.isExpired()) {
            return Optional.of(valueType.cast(entry.getValue()));
        } else if (entry != null && entry.isExpired()) {
            cache.remove(key);
        }
        return Optional.empty();
    }

    @Override
    public synchronized <T> void put(String key, T value, Duration ttl) {
        long expirationTime = System.currentTimeMillis() + ttl.toMillis();
        cache.put(key, new CacheEntry(value, expirationTime));
    }

    @Override
    public synchronized void invalidate(String key) {
        cache.remove(key);
    }

    private static class CacheEntry {
        private final Object value;
        private final long expirationTime;

        public CacheEntry(Object value, long expirationTime) {
            this.value = value;
            this.expirationTime = expirationTime;
        }

        public Object getValue() { return value; }

        public boolean isExpired() {
            return System.currentTimeMillis() > expirationTime;
        }
    }
}

// Redis Cache Implementation
public class RedisCache implements CacheLevel {
    private final Jedis jedis;
    private final ObjectMapper objectMapper;

    public RedisCache(String connectionString) {
        this.jedis = new Jedis(connectionString);
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public <T> Optional<T> get(String key, Class<T> valueType) {
        try {
            String json = jedis.get(key);
            if (json != null) {
                T value = objectMapper.readValue(json, valueType);
                return Optional.of(value);
            }
        } catch (Exception e) {
            System.err.println("Redis get failed for key: " + key);
        }
        return Optional.empty();
    }

    @Override
    public <T> void put(String key, T value, Duration ttl) {
        try {
            String json = objectMapper.writeValueAsString(value);
            jedis.setex(key, (int) ttl.getSeconds(), json);
        } catch (Exception e) {
            System.err.println("Redis put failed for key: " + key);
        }
    }

    @Override
    public void invalidate(String key) {
        jedis.del(key);
    }
}

// Cache metrics collection
public class CacheMetrics {
    private final AtomicLong l1Hits = new AtomicLong(0);
    private final AtomicLong l2Hits = new AtomicLong(0);
    private final AtomicLong l3Hits = new AtomicLong(0);
    private final AtomicLong misses = new AtomicLong(0);
    private final AtomicLong errors = new AtomicLong(0);
    private final AtomicLong totalResponseTime = new AtomicLong(0);
    private final AtomicLong totalRequests = new AtomicLong(0);

    public void recordHit(CacheLevel level, long responseTimeNanos) {
        switch (level) {
            case L1: l1Hits.incrementAndGet(); break;
            case L2: l2Hits.incrementAndGet(); break;
            case L3: l3Hits.incrementAndGet(); break;
        }
        totalResponseTime.addAndGet(responseTimeNanos);
        totalRequests.incrementAndGet();
    }

    public void recordMiss(long responseTimeNanos) {
        misses.incrementAndGet();
        totalResponseTime.addAndGet(responseTimeNanos);
        totalRequests.incrementAndGet();
    }

    public void recordError() {
        errors.incrementAndGet();
        totalRequests.incrementAndGet();
    }

    public CacheStatistics getStatistics() {
        long total = totalRequests.get();
        if (total == 0) return new CacheStatistics(0, 0, 0, 0, 0, 0, 0);

        double hitRate = (l1Hits.get() + l2Hits.get() + l3Hits.get()) * 100.0 / total;
        double avgResponseTimeMs = totalResponseTime.get() / 1_000_000.0 / total;

        return new CacheStatistics(
            l1Hits.get() * 100.0 / total,  // L1 hit rate
            l2Hits.get() * 100.0 / total,  // L2 hit rate
            l3Hits.get() * 100.0 / total,  // L3 hit rate
            hitRate,                       // Overall hit rate
            misses.get() * 100.0 / total,  // Miss rate
            avgResponseTimeMs,             // Avg response time
            errors.get()                   // Error count
        );
    }
}
```

---

## Cache Replacement Policies

### Advanced Cache Replacement Algorithms

```java
public abstract class CacheReplacementPolicy<K, V> {
    protected final int maxSize;
    protected final Map<K, V> cache;

    public CacheReplacementPolicy(int maxSize) {
        this.maxSize = maxSize;
        this.cache = new ConcurrentHashMap<>();
    }

    public abstract V get(K key);
    public abstract void put(K key, V value);
    public abstract void remove(K key);
    protected abstract K selectEvictionCandidate();

    protected void evictIfNecessary() {
        while (cache.size() >= maxSize) {
            K evictionKey = selectEvictionCandidate();
            if (evictionKey != null) {
                cache.remove(evictionKey);
                onEviction(evictionKey);
            } else {
                break; // No candidate found
            }
        }
    }

    protected void onEviction(K key) {
        // Override for custom eviction logic
    }
}

// LRU (Least Recently Used) Implementation
public class LRUCache<K, V> extends CacheReplacementPolicy<K, V> {
    private final LinkedHashMap<K, V> accessOrder;

    public LRUCache(int maxSize) {
        super(maxSize);
        this.accessOrder = new LinkedHashMap<K, V>(maxSize + 1, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
                return size() > maxSize;
            }
        };
    }

    @Override
    public synchronized V get(K key) {
        return accessOrder.get(key);
    }

    @Override
    public synchronized void put(K key, V value) {
        accessOrder.put(key, value);
    }

    @Override
    public synchronized void remove(K key) {
        accessOrder.remove(key);
    }

    @Override
    protected K selectEvictionCandidate() {
        return accessOrder.keySet().iterator().next(); // First entry is least recently used
    }
}

// LFU (Least Frequently Used) Implementation
public class LFUCache<K, V> extends CacheReplacementPolicy<K, V> {
    private final Map<K, Integer> frequencies;
    private final Map<Integer, LinkedHashSet<K>> frequencyBuckets;
    private int minFrequency;

    public LFUCache(int maxSize) {
        super(maxSize);
        this.frequencies = new ConcurrentHashMap<>();
        this.frequencyBuckets = new ConcurrentHashMap<>();
        this.minFrequency = 1;
    }

    @Override
    public synchronized V get(K key) {
        V value = cache.get(key);
        if (value != null) {
            updateFrequency(key);
        }
        return value;
    }

    @Override
    public synchronized void put(K key, V value) {
        if (maxSize <= 0) return;

        if (cache.containsKey(key)) {
            cache.put(key, value);
            updateFrequency(key);
            return;
        }

        evictIfNecessary();

        cache.put(key, value);
        frequencies.put(key, 1);
        frequencyBuckets.computeIfAbsent(1, k -> new LinkedHashSet<>()).add(key);
        minFrequency = 1;
    }

    @Override
    public synchronized void remove(K key) {
        if (cache.containsKey(key)) {
            int freq = frequencies.get(key);
            frequencyBuckets.get(freq).remove(key);
            frequencies.remove(key);
            cache.remove(key);
        }
    }

    @Override
    protected K selectEvictionCandidate() {
        LinkedHashSet<K> minFreqSet = frequencyBuckets.get(minFrequency);
        return minFreqSet != null && !minFreqSet.isEmpty() ?
               minFreqSet.iterator().next() : null;
    }

    private void updateFrequency(K key) {
        int oldFreq = frequencies.get(key);
        int newFreq = oldFreq + 1;

        frequencies.put(key, newFreq);

        // Remove from old frequency bucket
        frequencyBuckets.get(oldFreq).remove(key);
        if (frequencyBuckets.get(oldFreq).isEmpty() && oldFreq == minFrequency) {
            minFrequency++;
        }

        // Add to new frequency bucket
        frequencyBuckets.computeIfAbsent(newFreq, k -> new LinkedHashSet<>()).add(key);
    }
}

// FIFO (First In, First Out) Implementation
public class FIFOCache<K, V> extends CacheReplacementPolicy<K, V> {
    private final Queue<K> insertionOrder;

    public FIFOCache(int maxSize) {
        super(maxSize);
        this.insertionOrder = new LinkedList<>();
    }

    @Override
    public synchronized V get(K key) {
        return cache.get(key);
    }

    @Override
    public synchronized void put(K key, V value) {
        if (!cache.containsKey(key)) {
            evictIfNecessary();
            insertionOrder.offer(key);
        }
        cache.put(key, value);
    }

    @Override
    public synchronized void remove(K key) {
        if (cache.containsKey(key)) {
            cache.remove(key);
            insertionOrder.remove(key);
        }
    }

    @Override
    protected K selectEvictionCandidate() {
        return insertionOrder.poll();
    }
}

// Adaptive Replacement Cache (ARC) - More sophisticated
public class ARCCache<K, V> extends CacheReplacementPolicy<K, V> {
    private final int c; // Target size
    private final LinkedHashMap<K, V> t1; // Recent cache entries
    private final LinkedHashMap<K, V> t2; // Frequent cache entries
    private final Set<K> b1; // Ghost entries for t1
    private final Set<K> b2; // Ghost entries for t2
    private int p; // Target size for t1

    public ARCCache(int maxSize) {
        super(maxSize);
        this.c = maxSize;
        this.t1 = new LinkedHashMap<>();
        this.t2 = new LinkedHashMap<>();
        this.b1 = new LinkedHashSet<>();
        this.b2 = new LinkedHashSet<>();
        this.p = 0;
    }

    @Override
    public synchronized V get(K key) {
        // Check t1 and t2
        V value = t1.get(key);
        if (value != null) {
            // Move from t1 to t2
            t1.remove(key);
            t2.put(key, value);
            return value;
        }

        value = t2.get(key);
        if (value != null) {
            // Move to front of t2
            t2.remove(key);
            t2.put(key, value);
            return value;
        }

        return null;
    }

    @Override
    public synchronized void put(K key, V value) {
        // Case 1: Key in t1 or t2
        if (t1.containsKey(key) || t2.containsKey(key)) {
            if (t1.containsKey(key)) {
                t1.remove(key);
                t2.put(key, value);
            } else {
                t2.remove(key);
                t2.put(key, value);
            }
            return;
        }

        // Case 2: Key in b1
        if (b1.contains(key)) {
            p = Math.min(c, p + Math.max(1, b2.size() / b1.size()));
            replace(key);
            b1.remove(key);
            t2.put(key, value);
            return;
        }

        // Case 3: Key in b2
        if (b2.contains(key)) {
            p = Math.max(0, p - Math.max(1, b1.size() / b2.size()));
            replace(key);
            b2.remove(key);
            t2.put(key, value);
            return;
        }

        // Case 4: New key
        if (t1.size() + b1.size() == c) {
            if (t1.size() < c) {
                b1.remove(b1.iterator().next());
                replace(key);
            } else {
                t1.remove(t1.keySet().iterator().next());
            }
        } else if (t1.size() + b1.size() < c) {
            if (t1.size() + t2.size() + b1.size() + b2.size() >= c) {
                if (t1.size() + t2.size() + b1.size() + b2.size() == 2 * c) {
                    b2.remove(b2.iterator().next());
                }
                replace(key);
            }
        }

        t1.put(key, value);
    }

    private void replace(K key) {
        if (!t1.isEmpty() && (t1.size() > p || (b2.contains(key) && t1.size() == p))) {
            K evicted = t1.keySet().iterator().next();
            t1.remove(evicted);
            b1.add(evicted);
        } else if (!t2.isEmpty()) {
            K evicted = t2.keySet().iterator().next();
            t2.remove(evicted);
            b2.add(evicted);
        }
    }

    @Override
    public synchronized void remove(K key) {
        t1.remove(key);
        t2.remove(key);
        b1.remove(key);
        b2.remove(key);
    }

    @Override
    protected K selectEvictionCandidate() {
        // ARC handles eviction internally
        return null;
    }
}
```

---

## Cache Invalidation Strategies

### Event-Driven Cache Invalidation

```java
public class CacheInvalidationManager {

    private final CacheInvalidator cacheInvalidator;
    private final EventPublisher eventPublisher;
    private final Set<String> taggedKeys;

    public CacheInvalidationManager(CacheInvalidator cacheInvalidator,
                                  EventPublisher eventPublisher) {
        this.cacheInvalidator = cacheInvalidator;
        this.eventPublisher = eventPublisher;
        this.taggedKeys = ConcurrentHashMap.newKeySet();
    }

    // Tag-based invalidation
    public void invalidateByTag(String tag) {
        List<String> keysToInvalidate = findKeysByTag(tag);

        CompletableFuture<Void> invalidationTask = CompletableFuture.runAsync(() -> {
            keysToInvalidate.parallelStream().forEach(key -> {
                try {
                    cacheInvalidator.invalidate(key);
                } catch (Exception e) {
                    System.err.println("Failed to invalidate key: " + key);
                }
            });
        });

        invalidationTask.thenRun(() -> {
            eventPublisher.publish(new CacheInvalidationEvent(tag, keysToInvalidate.size()));
        });
    }

    // Pattern-based invalidation
    public void invalidateByPattern(String pattern) {
        Pattern regex = Pattern.compile(pattern);

        CompletableFuture.runAsync(() -> {
            taggedKeys.parallelStream()
                     .filter(key -> regex.matcher(key).matches())
                     .forEach(key -> {
                         try {
                             cacheInvalidator.invalidate(key);
                         } catch (Exception e) {
                             System.err.println("Failed to invalidate key: " + key);
                         }
                     });
        });
    }

    // Time-based invalidation (TTL)
    public class TTLInvalidationScheduler {
        private final ScheduledExecutorService scheduler;
        private final Map<String, ScheduledFuture<?>> ttlTasks;

        public TTLInvalidationScheduler() {
            this.scheduler = Executors.newScheduledThreadPool(5);
            this.ttlTasks = new ConcurrentHashMap<>();
        }

        public void scheduleInvalidation(String key, Duration ttl) {
            // Cancel existing TTL task if any
            ScheduledFuture<?> existingTask = ttlTasks.get(key);
            if (existingTask != null) {
                existingTask.cancel(false);
            }

            // Schedule new invalidation
            ScheduledFuture<?> task = scheduler.schedule(() -> {
                cacheInvalidator.invalidate(key);
                ttlTasks.remove(key);
                eventPublisher.publish(new CacheTTLExpiredEvent(key));
            }, ttl.toMillis(), TimeUnit.MILLISECONDS);

            ttlTasks.put(key, task);
        }

        public void cancelInvalidation(String key) {
            ScheduledFuture<?> task = ttlTasks.remove(key);
            if (task != null) {
                task.cancel(false);
            }
        }

        public void shutdown() {
            ttlTasks.values().forEach(task -> task.cancel(false));
            scheduler.shutdown();
        }
    }

    // Database change-based invalidation
    @EventListener
    public void handleDatabaseUpdate(DatabaseUpdateEvent event) {
        String affectedEntity = event.getEntityType();
        Object entityId = event.getEntityId();

        // Invalidate specific entity cache
        String entityKey = affectedEntity + ":" + entityId;
        cacheInvalidator.invalidate(entityKey);

        // Invalidate related caches
        switch (affectedEntity) {
            case "User":
                invalidateUserRelatedCaches(entityId.toString());
                break;
            case "Product":
                invalidateProductRelatedCaches(entityId.toString());
                break;
            case "Order":
                invalidateOrderRelatedCaches(entityId.toString());
                break;
        }
    }

    private void invalidateUserRelatedCaches(String userId) {
        // Invalidate user profile, preferences, orders, etc.
        List<String> relatedKeys = Arrays.asList(
            "user:profile:" + userId,
            "user:preferences:" + userId,
            "user:orders:" + userId,
            "user:recommendations:" + userId
        );

        relatedKeys.forEach(cacheInvalidator::invalidate);
    }

    private void invalidateProductRelatedCaches(String productId) {
        // Invalidate product details, related products, search results, etc.
        invalidateByPattern("product:" + productId + ".*");
        invalidateByPattern("search:.*"); // Invalidate all search results
        invalidateByTag("category:" + getProductCategory(productId));
    }

    private void invalidateOrderRelatedCaches(String orderId) {
        String userId = getUserIdFromOrder(orderId);
        if (userId != null) {
            cacheInvalidator.invalidate("user:orders:" + userId);
            cacheInvalidator.invalidate("order:" + orderId);
        }
    }

    // Cache warming after invalidation
    public void invalidateAndWarm(String key, Supplier<Object> dataLoader) {
        CompletableFuture
            .runAsync(() -> cacheInvalidator.invalidate(key))
            .thenRunAsync(() -> {
                try {
                    Object freshData = dataLoader.get();
                    if (freshData != null) {
                        cacheInvalidator.put(key, freshData);
                    }
                } catch (Exception e) {
                    System.err.println("Failed to warm cache for key: " + key);
                }
            });
    }

    // Supporting methods
    private List<String> findKeysByTag(String tag) {
        // Implementation depends on cache technology
        // Redis: KEYS pattern, Memcached: custom tag mapping
        return taggedKeys.stream()
                        .filter(key -> key.startsWith(tag + ":"))
                        .collect(Collectors.toList());
    }

    private String getProductCategory(String productId) {
        // Fetch product category from database or cache
        return "electronics"; // Placeholder
    }

    private String getUserIdFromOrder(String orderId) {
        // Fetch user ID from order data
        return "user123"; // Placeholder
    }
}

// Write-through cache with automatic invalidation
public class WriteThroughCache<K, V> {
    private final Cache<K, V> cache;
    private final DataStore<K, V> dataStore;
    private final CacheInvalidationManager invalidationManager;

    public WriteThroughCache(Cache<K, V> cache, DataStore<K, V> dataStore,
                           CacheInvalidationManager invalidationManager) {
        this.cache = cache;
        this.dataStore = dataStore;
        this.invalidationManager = invalidationManager;
    }

    public V get(K key) {
        V value = cache.get(key);
        if (value == null) {
            value = dataStore.load(key);
            if (value != null) {
                cache.put(key, value);
            }
        }
        return value;
    }

    public void put(K key, V value) {
        // Write to both cache and data store
        CompletableFuture<Void> cacheWrite = CompletableFuture.runAsync(() ->
            cache.put(key, value));
        CompletableFuture<Void> dataStoreWrite = CompletableFuture.runAsync(() ->
            dataStore.save(key, value));

        CompletableFuture.allOf(cacheWrite, dataStoreWrite)
            .thenRun(() -> {
                // Invalidate related caches
                invalidateRelatedCaches(key, value);
            });
    }

    public void remove(K key) {
        CompletableFuture<Void> cacheRemove = CompletableFuture.runAsync(() ->
            cache.remove(key));
        CompletableFuture<Void> dataStoreRemove = CompletableFuture.runAsync(() ->
            dataStore.delete(key));

        CompletableFuture.allOf(cacheRemove, dataStoreRemove)
            .thenRun(() -> {
                // Invalidate related caches
                invalidateRelatedCaches(key, null);
            });
    }

    private void invalidateRelatedCaches(K key, V value) {
        // Determine which other caches might be affected by this change
        String keyString = key.toString();

        if (keyString.startsWith("user:")) {
            invalidationManager.invalidateByPattern("user:" + extractUserId(keyString) + ":.*");
        } else if (keyString.startsWith("product:")) {
            invalidationManager.invalidateByPattern("product:" + extractProductId(keyString) + ":.*");
            invalidationManager.invalidateByTag("search");
        }
    }

    private String extractUserId(String key) {
        return key.split(":")[1];
    }

    private String extractProductId(String key) {
        return key.split(":")[1];
    }
}

// Event classes
public static class CacheInvalidationEvent {
    private final String tag;
    private final int invalidatedCount;
    private final Instant timestamp;

    public CacheInvalidationEvent(String tag, int invalidatedCount) {
        this.tag = tag;
        this.invalidatedCount = invalidatedCount;
        this.timestamp = Instant.now();
    }

    // Getters
    public String getTag() { return tag; }
    public int getInvalidatedCount() { return invalidatedCount; }
    public Instant getTimestamp() { return timestamp; }
}

public static class CacheTTLExpiredEvent {
    private final String key;
    private final Instant timestamp;

    public CacheTTLExpiredEvent(String key) {
        this.key = key;
        this.timestamp = Instant.now();
    }

    // Getters
    public String getKey() { return key; }
    public Instant getTimestamp() { return timestamp; }
}

public static class DatabaseUpdateEvent {
    private final String entityType;
    private final Object entityId;
    private final String operation; // INSERT, UPDATE, DELETE

    public DatabaseUpdateEvent(String entityType, Object entityId, String operation) {
        this.entityType = entityType;
        this.entityId = entityId;
        this.operation = operation;
    }

    // Getters
    public String getEntityType() { return entityType; }
    public Object getEntityId() { return entityId; }
    public String getOperation() { return operation; }
}
```

---

## Cache Stampede Prevention

### Circuit Breaker for Cache Misses

```java
public class CacheStampedeProtection<K, V> {

    private final Cache<K, V> cache;
    private final DataLoader<K, V> dataLoader;
    private final Map<K, CompletableFuture<V>> ongoingLoads;
    private final Semaphore loadingSemaphore;
    private final Duration lockTimeout;

    public CacheStampedeProtection(Cache<K, V> cache, DataLoader<K, V> dataLoader,
                                 int maxConcurrentLoads, Duration lockTimeout) {
        this.cache = cache;
        this.dataLoader = dataLoader;
        this.ongoingLoads = new ConcurrentHashMap<>();
        this.loadingSemaphore = new Semaphore(maxConcurrentLoads);
        this.lockTimeout = lockTimeout;
    }

    public CompletableFuture<V> get(K key) {
        // First, try to get from cache
        V cachedValue = cache.get(key);
        if (cachedValue != null) {
            return CompletableFuture.completedFuture(cachedValue);
        }

        // Check if there's an ongoing load for this key
        CompletableFuture<V> existingLoad = ongoingLoads.get(key);
        if (existingLoad != null) {
            return existingLoad;
        }

        // Start a new load operation
        CompletableFuture<V> loadFuture = new CompletableFuture<>();
        CompletableFuture<V> existingFuture = ongoingLoads.putIfAbsent(key, loadFuture);

        if (existingFuture != null) {
            // Another thread started loading, wait for that
            return existingFuture;
        }

        // We're responsible for loading
        CompletableFuture.runAsync(() -> {
            try {
                // Acquire semaphore to limit concurrent loads
                boolean acquired = loadingSemaphore.tryAcquire(lockTimeout.toMillis(),
                                                             TimeUnit.MILLISECONDS);
                if (!acquired) {
                    loadFuture.completeExceptionally(
                        new TimeoutException("Failed to acquire load semaphore"));
                    return;
                }

                try {
                    V value = dataLoader.load(key);
                    if (value != null) {
                        cache.put(key, value);
                    }
                    loadFuture.complete(value);
                } catch (Exception e) {
                    loadFuture.completeExceptionally(e);
                } finally {
                    loadingSemaphore.release();
                }

            } catch (InterruptedException e) {
                loadFuture.completeExceptionally(e);
            } finally {
                ongoingLoads.remove(key);
            }
        });

        return loadFuture;
    }

    // Probabilistic cache refresh to prevent thundering herd
    public CompletableFuture<V> getWithProbabilisticRefresh(K key, Duration cacheExpiry,
                                                           double refreshProbability) {
        CacheEntry<V> entry = cache.getWithMetadata(key);

        if (entry != null) {
            long ageMs = System.currentTimeMillis() - entry.getCreationTime();
            long expiryMs = cacheExpiry.toMillis();

            // Calculate refresh probability based on age
            double ageFactor = (double) ageMs / expiryMs;
            double currentRefreshProb = refreshProbability * ageFactor;

            if (Math.random() < currentRefreshProb) {
                // Asynchronously refresh cache in background
                CompletableFuture.runAsync(() -> {
                    try {
                        V freshValue = dataLoader.load(key);
                        if (freshValue != null) {
                            cache.put(key, freshValue);
                        }
                    } catch (Exception e) {
                        // Log error but don't fail the request
                        System.err.println("Background refresh failed for key: " + key);
                    }
                });
            }

            return CompletableFuture.completedFuture(entry.getValue());
        }

        // Cache miss, load normally
        return get(key);
    }

    // Stale-while-revalidate pattern
    public CompletableFuture<V> getStaleWhileRevalidate(K key, Duration staleThreshold) {
        CacheEntry<V> entry = cache.getWithMetadata(key);

        if (entry != null) {
            long ageMs = System.currentTimeMillis() - entry.getCreationTime();

            if (ageMs > staleThreshold.toMillis()) {
                // Data is stale, start background revalidation
                CompletableFuture.runAsync(() -> {
                    try {
                        V freshValue = dataLoader.load(key);
                        if (freshValue != null) {
                            cache.put(key, freshValue);
                        }
                    } catch (Exception e) {
                        System.err.println("Revalidation failed for key: " + key);
                    }
                });
            }

            // Return stale data immediately
            return CompletableFuture.completedFuture(entry.getValue());
        }

        // No cached data, load synchronously
        return get(key);
    }

    // Batched loading to reduce database load
    public CompletableFuture<Map<K, V>> getBatch(Set<K> keys) {
        Map<K, V> results = new ConcurrentHashMap<>();
        Set<K> missingKeys = new HashSet<>();

        // Check cache for all keys
        for (K key : keys) {
            V cachedValue = cache.get(key);
            if (cachedValue != null) {
                results.put(key, cachedValue);
            } else {
                missingKeys.add(key);
            }
        }

        if (missingKeys.isEmpty()) {
            return CompletableFuture.completedFuture(results);
        }

        // Load missing keys in batch
        return CompletableFuture.supplyAsync(() -> {
            try {
                Map<K, V> loadedValues = dataLoader.loadBatch(missingKeys);

                // Cache the loaded values
                loadedValues.forEach(cache::put);

                // Merge with cached results
                results.putAll(loadedValues);
                return results;

            } catch (Exception e) {
                throw new RuntimeException("Batch load failed", e);
            }
        });
    }

    // Cache warming with controlled concurrency
    public CompletableFuture<Void> warmCache(List<K> keys, int batchSize) {
        List<List<K>> batches = Lists.partition(keys, batchSize);

        List<CompletableFuture<Void>> batchFutures = batches.stream()
            .map(batch -> CompletableFuture.runAsync(() -> {
                try {
                    Map<K, V> batchResults = dataLoader.loadBatch(new HashSet<>(batch));
                    batchResults.forEach(cache::put);
                } catch (Exception e) {
                    System.err.println("Cache warming batch failed: " + e.getMessage());
                }
            }))
            .collect(Collectors.toList());

        return CompletableFuture.allOf(batchFutures.toArray(new CompletableFuture[0]));
    }
}

// Data loader interface
public interface DataLoader<K, V> {
    V load(K key) throws Exception;
    Map<K, V> loadBatch(Set<K> keys) throws Exception;
}

// Cache entry with metadata
public static class CacheEntry<V> {
    private final V value;
    private final long creationTime;
    private final long accessCount;

    public CacheEntry(V value) {
        this.value = value;
        this.creationTime = System.currentTimeMillis();
        this.accessCount = 1;
    }

    // Getters
    public V getValue() { return value; }
    public long getCreationTime() { return creationTime; }
    public long getAccessCount() { return accessCount; }
}

// Cache interface with metadata support
public interface Cache<K, V> {
    V get(K key);
    CacheEntry<V> getWithMetadata(K key);
    void put(K key, V value);
    void remove(K key);
    void clear();
}
```

**📊 Cache Strategy Comparison:**

| Strategy          | Cache Hit Rate | Write Performance | Consistency | Complexity |
| ----------------- | -------------- | ----------------- | ----------- | ---------- |
| **Cache-Aside**   | Medium-High    | Fast              | Eventual    | Low        |
| **Write-Through** | High           | Slow              | Strong      | Medium     |
| **Write-Behind**  | High           | Fast              | Weak        | High       |
| **Refresh-Ahead** | Very High      | Fast              | Eventual    | High       |

---

## Summary & Best Practices

### 🎯 Key Takeaways

✅ **Multi-Level Caching**: L1 (memory) → L2 (Redis) → L3 (distributed) → Database  
✅ **Choose Right Eviction Policy**: LRU for general use, LFU for hot data, ARC for adaptive  
✅ **Prevent Cache Stampede**: Use locks, probabilistic refresh, stale-while-revalidate  
✅ **Smart Invalidation**: Tag-based, pattern-based, event-driven invalidation  
✅ **Monitor Cache Performance**: Hit rates, response times, eviction rates

### 📈 Caching Implementation Checklist

- [ ] Identified cache levels and TTL strategies
- [ ] Implemented appropriate eviction policy
- [ ] Set up cache invalidation mechanisms
- [ ] Added cache stampede protection
- [ ] Implemented cache warming strategies
- [ ] Set up monitoring and alerting
- [ ] Planned for cache failures

### ⚠️ Common Caching Pitfalls

- **Cache stampede**: Multiple requests loading same data
- **Stale data**: Not invalidating related caches
- **Memory leaks**: No proper eviction policies
- **Cache penetration**: Queries for non-existent data
- **Cache avalanche**: Mass cache expiration

**📈 Next Steps:**
Ready to dive into messaging systems? Continue with [Message Queues & Event Streaming](./04-messaging-event-streaming.md) to learn about pub/sub patterns, event sourcing, and stream processing.

---

_💡 Pro Tip: Cache effectiveness depends on access patterns. Monitor hit rates and adjust TTL based on data update frequency. Use cache tags for efficient bulk invalidation and implement circuit breakers to prevent cascade failures._
