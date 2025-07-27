# System Design Algorithms 🏗️

## 🎯 **Overview**

System Design Algorithms focus on building scalable, reliable, and efficient distributed systems. These algorithms and patterns are crucial for handling large-scale applications, managing resources, and ensuring high availability in production environments.

## 🔄 **Load Balancing Algorithms**

### **Round Robin Load Balancer**

```java
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

public class LoadBalancers {

    static class Server {
        String id;
        String address;
        boolean isHealthy;
        int weight;
        int currentConnections;

        Server(String id, String address, int weight) {
            this.id = id;
            this.address = address;
            this.weight = weight;
            this.isHealthy = true;
            this.currentConnections = 0;
        }
    }

    // Round Robin Load Balancer
    static class RoundRobinLoadBalancer {
        private List<Server> servers;
        private AtomicInteger currentIndex;

        public RoundRobinLoadBalancer(List<Server> servers) {
            this.servers = new ArrayList<>(servers);
            this.currentIndex = new AtomicInteger(0);
        }

        public Server getNextServer() {
            List<Server> healthyServers = getHealthyServers();
            if (healthyServers.isEmpty()) {
                throw new RuntimeException("No healthy servers available");
            }

            int index = currentIndex.getAndIncrement() % healthyServers.size();
            return healthyServers.get(index);
        }

        private List<Server> getHealthyServers() {
            return servers.stream()
                    .filter(server -> server.isHealthy)
                    .collect(ArrayList::new, ArrayList::add, ArrayList::addAll);
        }
    }

    // Weighted Round Robin Load Balancer
    static class WeightedRoundRobinLoadBalancer {
        private List<Server> servers;
        private List<Server> weightedList;
        private AtomicInteger currentIndex;

        public WeightedRoundRobinLoadBalancer(List<Server> servers) {
            this.servers = servers;
            this.currentIndex = new AtomicInteger(0);
            buildWeightedList();
        }

        private void buildWeightedList() {
            weightedList = new ArrayList<>();
            for (Server server : servers) {
                for (int i = 0; i < server.weight; i++) {
                    weightedList.add(server);
                }
            }
        }

        public Server getNextServer() {
            List<Server> healthyWeightedServers = weightedList.stream()
                    .filter(server -> server.isHealthy)
                    .collect(ArrayList::new, ArrayList::add, ArrayList::addAll);

            if (healthyWeightedServers.isEmpty()) {
                throw new RuntimeException("No healthy servers available");
            }

            int index = currentIndex.getAndIncrement() % healthyWeightedServers.size();
            return healthyWeightedServers.get(index);
        }
    }

    // Least Connections Load Balancer
    static class LeastConnectionsLoadBalancer {
        private List<Server> servers;

        public LeastConnectionsLoadBalancer(List<Server> servers) {
            this.servers = servers;
        }

        public synchronized Server getNextServer() {
            return servers.stream()
                    .filter(server -> server.isHealthy)
                    .min(Comparator.comparingInt(s -> s.currentConnections))
                    .orElseThrow(() -> new RuntimeException("No healthy servers available"));
        }

        public synchronized void releaseConnection(Server server) {
            server.currentConnections = Math.max(0, server.currentConnections - 1);
        }

        public synchronized void acquireConnection(Server server) {
            server.currentConnections++;
        }
    }

    // Consistent Hashing Load Balancer
    static class ConsistentHashingLoadBalancer {
        private TreeMap<Long, Server> ring;
        private List<Server> servers;
        private int virtualNodes;

        public ConsistentHashingLoadBalancer(List<Server> servers, int virtualNodes) {
            this.servers = servers;
            this.virtualNodes = virtualNodes;
            this.ring = new TreeMap<>();
            buildRing();
        }

        private void buildRing() {
            for (Server server : servers) {
                addServerToRing(server);
            }
        }

        private void addServerToRing(Server server) {
            for (int i = 0; i < virtualNodes; i++) {
                String virtualNodeKey = server.id + ":" + i;
                long hash = hash(virtualNodeKey);
                ring.put(hash, server);
            }
        }

        public Server getServer(String key) {
            if (ring.isEmpty()) {
                throw new RuntimeException("No servers available");
            }

            long hash = hash(key);
            Map.Entry<Long, Server> entry = ring.ceilingEntry(hash);

            if (entry == null) {
                entry = ring.firstEntry();
            }

            return entry.getValue();
        }

        public void addServer(Server server) {
            servers.add(server);
            addServerToRing(server);
        }

        public void removeServer(Server server) {
            servers.remove(server);
            for (int i = 0; i < virtualNodes; i++) {
                String virtualNodeKey = server.id + ":" + i;
                long hash = hash(virtualNodeKey);
                ring.remove(hash);
            }
        }

        private long hash(String key) {
            // Simple hash function (use better hashing in production)
            return key.hashCode() & 0x7FFFFFFF;
        }
    }
}
```

## 💾 **Caching Algorithms**

### **LRU Cache Implementation**

```java
import java.util.*;

public class CachingAlgorithms {

    // LRU Cache using HashMap + Doubly Linked List
    static class LRUCache<K, V> {
        private final int capacity;
        private final Map<K, Node<K, V>> cache;
        private final Node<K, V> head;
        private final Node<K, V> tail;

        static class Node<K, V> {
            K key;
            V value;
            Node<K, V> prev;
            Node<K, V> next;

            Node(K key, V value) {
                this.key = key;
                this.value = value;
            }
        }

        public LRUCache(int capacity) {
            this.capacity = capacity;
            this.cache = new HashMap<>();
            this.head = new Node<>(null, null);
            this.tail = new Node<>(null, null);
            head.next = tail;
            tail.prev = head;
        }

        public V get(K key) {
            Node<K, V> node = cache.get(key);
            if (node == null) {
                return null;
            }

            // Move to head (mark as recently used)
            moveToHead(node);
            return node.value;
        }

        public void put(K key, V value) {
            Node<K, V> existing = cache.get(key);

            if (existing != null) {
                existing.value = value;
                moveToHead(existing);
            } else {
                Node<K, V> newNode = new Node<>(key, value);

                if (cache.size() >= capacity) {
                    // Remove least recently used
                    Node<K, V> last = removeTail();
                    cache.remove(last.key);
                }

                cache.put(key, newNode);
                addToHead(newNode);
            }
        }

        private void addToHead(Node<K, V> node) {
            node.prev = head;
            node.next = head.next;
            head.next.prev = node;
            head.next = node;
        }

        private void removeNode(Node<K, V> node) {
            node.prev.next = node.next;
            node.next.prev = node.prev;
        }

        private void moveToHead(Node<K, V> node) {
            removeNode(node);
            addToHead(node);
        }

        private Node<K, V> removeTail() {
            Node<K, V> last = tail.prev;
            removeNode(last);
            return last;
        }
    }

    // LFU Cache (Least Frequently Used)
    static class LFUCache<K, V> {
        private final int capacity;
        private final Map<K, Node<K, V>> cache;
        private final Map<Integer, DoublyLinkedList<K, V>> frequencies;
        private int minFrequency;

        static class Node<K, V> {
            K key;
            V value;
            int frequency;
            Node<K, V> prev;
            Node<K, V> next;

            Node(K key, V value) {
                this.key = key;
                this.value = value;
                this.frequency = 1;
            }
        }

        static class DoublyLinkedList<K, V> {
            Node<K, V> head;
            Node<K, V> tail;

            DoublyLinkedList() {
                head = new Node<>(null, null);
                tail = new Node<>(null, null);
                head.next = tail;
                tail.prev = head;
            }

            void addToHead(Node<K, V> node) {
                node.next = head.next;
                node.prev = head;
                head.next.prev = node;
                head.next = node;
            }

            void removeNode(Node<K, V> node) {
                node.prev.next = node.next;
                node.next.prev = node.prev;
            }

            Node<K, V> removeTail() {
                if (tail.prev == head) return null;
                Node<K, V> last = tail.prev;
                removeNode(last);
                return last;
            }

            boolean isEmpty() {
                return head.next == tail;
            }
        }

        public LFUCache(int capacity) {
            this.capacity = capacity;
            this.cache = new HashMap<>();
            this.frequencies = new HashMap<>();
            this.minFrequency = 0;
        }

        public V get(K key) {
            Node<K, V> node = cache.get(key);
            if (node == null) {
                return null;
            }

            updateFrequency(node);
            return node.value;
        }

        public void put(K key, V value) {
            if (capacity <= 0) return;

            Node<K, V> existing = cache.get(key);
            if (existing != null) {
                existing.value = value;
                updateFrequency(existing);
                return;
            }

            if (cache.size() >= capacity) {
                evictLFU();
            }

            Node<K, V> newNode = new Node<>(key, value);
            cache.put(key, newNode);
            frequencies.computeIfAbsent(1, k -> new DoublyLinkedList<>()).addToHead(newNode);
            minFrequency = 1;
        }

        private void updateFrequency(Node<K, V> node) {
            int oldFreq = node.frequency;
            int newFreq = oldFreq + 1;

            // Remove from old frequency list
            DoublyLinkedList<K, V> oldList = frequencies.get(oldFreq);
            oldList.removeNode(node);

            // Update minimum frequency if necessary
            if (oldFreq == minFrequency && oldList.isEmpty()) {
                minFrequency++;
            }

            // Add to new frequency list
            node.frequency = newFreq;
            frequencies.computeIfAbsent(newFreq, k -> new DoublyLinkedList<>()).addToHead(node);
        }

        private void evictLFU() {
            DoublyLinkedList<K, V> minFreqList = frequencies.get(minFrequency);
            Node<K, V> nodeToEvict = minFreqList.removeTail();
            if (nodeToEvict != null) {
                cache.remove(nodeToEvict.key);
            }
        }
    }
}
```

## 🔍 **Rate Limiting Algorithms**

### **Rate Limiter Implementations**

```java
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

public class RateLimiters {

    // Token Bucket Rate Limiter
    static class TokenBucketRateLimiter {
        private final long capacity;
        private final long refillRate;
        private final Map<String, Bucket> buckets;

        static class Bucket {
            private long tokens;
            private long lastRefillTime;
            private final long capacity;
            private final long refillRate;

            Bucket(long capacity, long refillRate) {
                this.capacity = capacity;
                this.refillRate = refillRate;
                this.tokens = capacity;
                this.lastRefillTime = System.currentTimeMillis();
            }

            synchronized boolean allowRequest(long tokensRequested) {
                refill();
                if (tokens >= tokensRequested) {
                    tokens -= tokensRequested;
                    return true;
                }
                return false;
            }

            private void refill() {
                long now = System.currentTimeMillis();
                long tokensToAdd = ((now - lastRefillTime) / 1000) * refillRate;
                tokens = Math.min(capacity, tokens + tokensToAdd);
                lastRefillTime = now;
            }
        }

        public TokenBucketRateLimiter(long capacity, long refillRate) {
            this.capacity = capacity;
            this.refillRate = refillRate;
            this.buckets = new ConcurrentHashMap<>();
        }

        public boolean allowRequest(String clientId, long tokensRequested) {
            Bucket bucket = buckets.computeIfAbsent(clientId,
                k -> new Bucket(capacity, refillRate));
            return bucket.allowRequest(tokensRequested);
        }
    }

    // Sliding Window Log Rate Limiter
    static class SlidingWindowLogRateLimiter {
        private final int maxRequests;
        private final long windowSizeMs;
        private final Map<String, List<Long>> requestLogs;

        public SlidingWindowLogRateLimiter(int maxRequests, long windowSizeMs) {
            this.maxRequests = maxRequests;
            this.windowSizeMs = windowSizeMs;
            this.requestLogs = new ConcurrentHashMap<>();
        }

        public synchronized boolean allowRequest(String clientId) {
            long now = System.currentTimeMillis();
            List<Long> logs = requestLogs.computeIfAbsent(clientId, k -> new ArrayList<>());

            // Remove old requests outside the window
            logs.removeIf(timestamp -> now - timestamp > windowSizeMs);

            if (logs.size() < maxRequests) {
                logs.add(now);
                return true;
            }

            return false;
        }
    }

    // Fixed Window Counter Rate Limiter
    static class FixedWindowCounterRateLimiter {
        private final int maxRequests;
        private final long windowSizeMs;
        private final Map<String, WindowCounter> counters;

        static class WindowCounter {
            private long windowStart;
            private int count;
            private final long windowSizeMs;

            WindowCounter(long windowSizeMs) {
                this.windowSizeMs = windowSizeMs;
                this.windowStart = System.currentTimeMillis();
                this.count = 0;
            }

            synchronized boolean allowRequest() {
                long now = System.currentTimeMillis();

                // Reset window if expired
                if (now - windowStart >= windowSizeMs) {
                    windowStart = now;
                    count = 0;
                }

                count++;
                return count <= maxRequests;
            }
        }

        public FixedWindowCounterRateLimiter(int maxRequests, long windowSizeMs) {
            this.maxRequests = maxRequests;
            this.windowSizeMs = windowSizeMs;
            this.counters = new ConcurrentHashMap<>();
        }

        public boolean allowRequest(String clientId) {
            WindowCounter counter = counters.computeIfAbsent(clientId,
                k -> new WindowCounter(windowSizeMs));
            return counter.allowRequest();
        }
    }

    // Sliding Window Counter Rate Limiter
    static class SlidingWindowCounterRateLimiter {
        private final int maxRequests;
        private final long windowSizeMs;
        private final Map<String, SlidingWindow> windows;

        static class SlidingWindow {
            private long currentWindowStart;
            private int currentWindowCount;
            private int previousWindowCount;
            private final long windowSizeMs;

            SlidingWindow(long windowSizeMs) {
                this.windowSizeMs = windowSizeMs;
                this.currentWindowStart = System.currentTimeMillis();
                this.currentWindowCount = 0;
                this.previousWindowCount = 0;
            }

            synchronized boolean allowRequest(int maxRequests) {
                long now = System.currentTimeMillis();

                // Check if we need to slide the window
                if (now - currentWindowStart >= windowSizeMs) {
                    previousWindowCount = currentWindowCount;
                    currentWindowCount = 0;
                    currentWindowStart = now;
                }

                // Calculate weighted count
                double timeIntoCurrentWindow = now - currentWindowStart;
                double percentageOfWindow = timeIntoCurrentWindow / windowSizeMs;
                double weightedPreviousCount = previousWindowCount * (1 - percentageOfWindow);
                double estimatedCount = weightedPreviousCount + currentWindowCount;

                if (estimatedCount < maxRequests) {
                    currentWindowCount++;
                    return true;
                }

                return false;
            }
        }

        public SlidingWindowCounterRateLimiter(int maxRequests, long windowSizeMs) {
            this.maxRequests = maxRequests;
            this.windowSizeMs = windowSizeMs;
            this.windows = new ConcurrentHashMap<>();
        }

        public boolean allowRequest(String clientId) {
            SlidingWindow window = windows.computeIfAbsent(clientId,
                k -> new SlidingWindow(windowSizeMs));
            return window.allowRequest(maxRequests);
        }
    }
}
```

## 🎯 **Distributed Consensus Algorithms**

### **RAFT Consensus Algorithm (Simplified)**

```java
import java.util.*;
import java.util.concurrent.*;

public class RaftConsensus {

    enum NodeState {
        FOLLOWER, CANDIDATE, LEADER
    }

    static class LogEntry {
        final int term;
        final String command;
        final long timestamp;

        LogEntry(int term, String command) {
            this.term = term;
            this.command = command;
            this.timestamp = System.currentTimeMillis();
        }
    }

    static class RaftNode {
        private final String nodeId;
        private final List<String> clusterNodes;
        private volatile NodeState state;
        private volatile int currentTerm;
        private volatile String votedFor;
        private final List<LogEntry> log;
        private volatile int commitIndex;
        private volatile int lastApplied;

        // Leader state
        private final Map<String, Integer> nextIndex;
        private final Map<String, Integer> matchIndex;

        // Timing
        private volatile long lastHeartbeat;
        private volatile long electionTimeout;
        private final Random random;

        public RaftNode(String nodeId, List<String> clusterNodes) {
            this.nodeId = nodeId;
            this.clusterNodes = new ArrayList<>(clusterNodes);
            this.state = NodeState.FOLLOWER;
            this.currentTerm = 0;
            this.votedFor = null;
            this.log = new ArrayList<>();
            this.commitIndex = -1;
            this.lastApplied = -1;
            this.nextIndex = new ConcurrentHashMap<>();
            this.matchIndex = new ConcurrentHashMap<>();
            this.random = new Random();
            resetElectionTimeout();
        }

        public synchronized void startElection() {
            state = NodeState.CANDIDATE;
            currentTerm++;
            votedFor = nodeId;
            resetElectionTimeout();

            int votes = 1; // Vote for self
            int majority = (clusterNodes.size() / 2) + 1;

            // Request votes from other nodes (simplified)
            for (String node : clusterNodes) {
                if (!node.equals(nodeId)) {
                    if (requestVote(node)) {
                        votes++;
                    }
                }
            }

            if (votes >= majority) {
                becomeLeader();
            } else {
                state = NodeState.FOLLOWER;
            }
        }

        private void becomeLeader() {
            state = NodeState.LEADER;

            // Initialize leader state
            for (String node : clusterNodes) {
                if (!node.equals(nodeId)) {
                    nextIndex.put(node, log.size());
                    matchIndex.put(node, -1);
                }
            }

            // Send initial heartbeats
            sendHeartbeats();
        }

        public synchronized boolean appendEntries(String leaderId, int term,
                                                  int prevLogIndex, int prevLogTerm,
                                                  List<LogEntry> entries, int leaderCommit) {
            lastHeartbeat = System.currentTimeMillis();

            // Reply false if term < currentTerm
            if (term < currentTerm) {
                return false;
            }

            // Update term and convert to follower if necessary
            if (term > currentTerm) {
                currentTerm = term;
                votedFor = null;
                state = NodeState.FOLLOWER;
            }

            // Reply false if log doesn't contain an entry at prevLogIndex
            if (prevLogIndex >= 0 &&
                (prevLogIndex >= log.size() || log.get(prevLogIndex).term != prevLogTerm)) {
                return false;
            }

            // Delete conflicting entries and append new ones
            if (!entries.isEmpty()) {
                int insertIndex = prevLogIndex + 1;

                // Remove conflicting entries
                if (insertIndex < log.size()) {
                    log.subList(insertIndex, log.size()).clear();
                }

                // Append new entries
                log.addAll(entries);
            }

            // Update commit index
            if (leaderCommit > commitIndex) {
                commitIndex = Math.min(leaderCommit, log.size() - 1);
                applyLogEntries();
            }

            return true;
        }

        private boolean requestVote(String candidateId) {
            // Simplified vote request logic
            // In real implementation, this would be a network call
            return random.nextBoolean(); // Random vote for simulation
        }

        private void sendHeartbeats() {
            if (state != NodeState.LEADER) return;

            for (String node : clusterNodes) {
                if (!node.equals(nodeId)) {
                    sendAppendEntries(node, Collections.emptyList());
                }
            }
        }

        private void sendAppendEntries(String nodeId, List<LogEntry> entries) {
            int nextIdx = nextIndex.getOrDefault(nodeId, 0);
            int prevLogIndex = nextIdx - 1;
            int prevLogTerm = prevLogIndex >= 0 ? log.get(prevLogIndex).term : -1;

            // In real implementation, this would be a network call
            boolean success = appendEntries(this.nodeId, currentTerm, prevLogIndex,
                                          prevLogTerm, entries, commitIndex);

            if (success) {
                nextIndex.put(nodeId, nextIdx + entries.size());
                matchIndex.put(nodeId, nextIdx + entries.size() - 1);
            } else {
                // Decrement nextIndex and retry
                nextIndex.put(nodeId, Math.max(0, nextIdx - 1));
            }
        }

        public synchronized boolean addLogEntry(String command) {
            if (state != NodeState.LEADER) {
                return false;
            }

            LogEntry entry = new LogEntry(currentTerm, command);
            log.add(entry);

            // Replicate to followers
            for (String node : clusterNodes) {
                if (!node.equals(nodeId)) {
                    sendAppendEntries(node, Arrays.asList(entry));
                }
            }

            return true;
        }

        private void applyLogEntries() {
            while (lastApplied < commitIndex) {
                lastApplied++;
                LogEntry entry = log.get(lastApplied);
                // Apply entry to state machine
                System.out.println("Applied: " + entry.command);
            }
        }

        private void resetElectionTimeout() {
            electionTimeout = System.currentTimeMillis() + 150 + random.nextInt(150);
        }

        public void checkElectionTimeout() {
            if (state != NodeState.LEADER &&
                System.currentTimeMillis() > electionTimeout) {
                startElection();
            }
        }
    }
}
```

## 🔄 **Sharding and Partitioning**

### **Consistent Hashing for Sharding**

```java
import java.util.*;

public class ShardingAlgorithms {

    // Consistent Hashing Sharding
    static class ConsistentHashSharding {
        private final TreeMap<Long, String> ring;
        private final Set<String> shards;
        private final int virtualNodes;

        public ConsistentHashSharding(int virtualNodes) {
            this.ring = new TreeMap<>();
            this.shards = new HashSet<>();
            this.virtualNodes = virtualNodes;
        }

        public void addShard(String shardId) {
            shards.add(shardId);
            for (int i = 0; i < virtualNodes; i++) {
                String virtualNode = shardId + ":" + i;
                long hash = hash(virtualNode);
                ring.put(hash, shardId);
            }
        }

        public void removeShard(String shardId) {
            shards.remove(shardId);
            for (int i = 0; i < virtualNodes; i++) {
                String virtualNode = shardId + ":" + i;
                long hash = hash(virtualNode);
                ring.remove(hash);
            }
        }

        public String getShard(String key) {
            if (ring.isEmpty()) {
                throw new RuntimeException("No shards available");
            }

            long hash = hash(key);
            Map.Entry<Long, String> entry = ring.ceilingEntry(hash);

            if (entry == null) {
                entry = ring.firstEntry();
            }

            return entry.getValue();
        }

        public Map<String, List<String>> rebalance(List<String> keys) {
            Map<String, List<String>> shardToKeys = new HashMap<>();

            for (String shard : shards) {
                shardToKeys.put(shard, new ArrayList<>());
            }

            for (String key : keys) {
                String shard = getShard(key);
                shardToKeys.get(shard).add(key);
            }

            return shardToKeys;
        }

        private long hash(String key) {
            // Simple hash function (use better hashing in production)
            return Math.abs(key.hashCode()) & 0x7FFFFFFF;
        }
    }

    // Range-based Sharding
    static class RangeBasedSharding {
        private final TreeMap<String, String> ranges;

        static class ShardRange {
            final String startKey;
            final String endKey;
            final String shardId;

            ShardRange(String startKey, String endKey, String shardId) {
                this.startKey = startKey;
                this.endKey = endKey;
                this.shardId = shardId;
            }
        }

        public RangeBasedSharding() {
            this.ranges = new TreeMap<>();
        }

        public void addRange(String startKey, String endKey, String shardId) {
            ranges.put(startKey, shardId);
        }

        public String getShard(String key) {
            Map.Entry<String, String> entry = ranges.floorEntry(key);

            if (entry == null) {
                throw new RuntimeException("No shard found for key: " + key);
            }

            return entry.getValue();
        }

        public void splitShard(String shardId, String splitKey, String newShardId) {
            // Find the range to split
            String startKey = null;
            for (Map.Entry<String, String> entry : ranges.entrySet()) {
                if (entry.getValue().equals(shardId)) {
                    startKey = entry.getKey();
                    break;
                }
            }

            if (startKey != null) {
                ranges.put(splitKey, newShardId);
            }
        }
    }

    // Hash-based Sharding
    static class HashBasedSharding {
        private final List<String> shards;

        public HashBasedSharding(List<String> shards) {
            this.shards = new ArrayList<>(shards);
        }

        public String getShard(String key) {
            int hash = Math.abs(key.hashCode());
            int shardIndex = hash % shards.size();
            return shards.get(shardIndex);
        }

        public void addShard(String shardId) {
            shards.add(shardId);
        }

        public void removeShard(String shardId) {
            shards.remove(shardId);
        }

        public Map<String, List<String>> redistributeKeys(List<String> keys) {
            Map<String, List<String>> distribution = new HashMap<>();

            for (String shard : shards) {
                distribution.put(shard, new ArrayList<>());
            }

            for (String key : keys) {
                String shard = getShard(key);
                distribution.get(shard).add(key);
            }

            return distribution;
        }
    }
}
```

## 📊 **Monitoring and Metrics**

### **Circuit Breaker Pattern**

```java
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class CircuitBreaker {

    enum State {
        CLOSED, OPEN, HALF_OPEN
    }

    private volatile State state = State.CLOSED;
    private final AtomicInteger failureCount = new AtomicInteger(0);
    private final AtomicLong lastFailureTime = new AtomicLong(0);
    private final int failureThreshold;
    private final long timeout;
    private final long retryTimePeriod;

    public CircuitBreaker(int failureThreshold, long timeout, long retryTimePeriod) {
        this.failureThreshold = failureThreshold;
        this.timeout = timeout;
        this.retryTimePeriod = retryTimePeriod;
    }

    public <T> T call(java.util.function.Supplier<T> operation) throws Exception {
        if (state == State.OPEN) {
            if (System.currentTimeMillis() - lastFailureTime.get() > retryTimePeriod) {
                state = State.HALF_OPEN;
            } else {
                throw new Exception("Circuit breaker is OPEN");
            }
        }

        try {
            T result = operation.get();
            onSuccess();
            return result;
        } catch (Exception e) {
            onFailure();
            throw e;
        }
    }

    private void onSuccess() {
        failureCount.set(0);
        state = State.CLOSED;
    }

    private void onFailure() {
        int failures = failureCount.incrementAndGet();
        lastFailureTime.set(System.currentTimeMillis());

        if (failures >= failureThreshold) {
            state = State.OPEN;
        }
    }

    public State getState() {
        return state;
    }

    public int getFailureCount() {
        return failureCount.get();
    }
}
```

### **Metrics Collection**

```java
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.LongAdder;

public class MetricsCollector {

    // Counter metric
    static class Counter {
        private final LongAdder count = new LongAdder();

        public void increment() {
            count.increment();
        }

        public void increment(long value) {
            count.add(value);
        }

        public long getCount() {
            return count.sum();
        }
    }

    // Gauge metric
    static class Gauge {
        private volatile double value;

        public void setValue(double value) {
            this.value = value;
        }

        public double getValue() {
            return value;
        }
    }

    // Histogram metric
    static class Histogram {
        private final LongAdder count = new LongAdder();
        private final LongAdder sum = new LongAdder();
        private final ConcurrentHashMap<Long, LongAdder> buckets = new ConcurrentHashMap<>();
        private final long[] boundaries;

        public Histogram(long[] boundaries) {
            this.boundaries = boundaries.clone();
            for (long boundary : boundaries) {
                buckets.put(boundary, new LongAdder());
            }
        }

        public void observe(long value) {
            count.increment();
            sum.add(value);

            for (long boundary : boundaries) {
                if (value <= boundary) {
                    buckets.get(boundary).increment();
                }
            }
        }

        public long getCount() {
            return count.sum();
        }

        public double getMean() {
            long totalCount = getCount();
            return totalCount > 0 ? (double) sum.sum() / totalCount : 0.0;
        }

        public long getBucketCount(long boundary) {
            LongAdder bucket = buckets.get(boundary);
            return bucket != null ? bucket.sum() : 0;
        }
    }

    // Timer metric
    static class Timer {
        private final Histogram histogram;

        public Timer(long[] boundaries) {
            this.histogram = new Histogram(boundaries);
        }

        public TimerContext time() {
            return new TimerContext(this);
        }

        public void record(long durationMs) {
            histogram.observe(durationMs);
        }

        public long getCount() {
            return histogram.getCount();
        }

        public double getMeanDuration() {
            return histogram.getMean();
        }

        static class TimerContext implements AutoCloseable {
            private final Timer timer;
            private final long startTime;

            TimerContext(Timer timer) {
                this.timer = timer;
                this.startTime = System.currentTimeMillis();
            }

            @Override
            public void close() {
                timer.record(System.currentTimeMillis() - startTime);
            }
        }
    }

    // Metrics registry
    private final ConcurrentHashMap<String, Counter> counters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Gauge> gauges = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Histogram> histograms = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Timer> timers = new ConcurrentHashMap<>();

    public Counter counter(String name) {
        return counters.computeIfAbsent(name, k -> new Counter());
    }

    public Gauge gauge(String name) {
        return gauges.computeIfAbsent(name, k -> new Gauge());
    }

    public Histogram histogram(String name, long[] boundaries) {
        return histograms.computeIfAbsent(name, k -> new Histogram(boundaries));
    }

    public Timer timer(String name, long[] boundaries) {
        return timers.computeIfAbsent(name, k -> new Timer(boundaries));
    }
}
```

## 🎮 **Problem Categories**

### **System Design Fundamentals**

1. **Design URL Shortener** - Hashing and database design
2. **Design Chat System** - Real-time messaging and scaling
3. **Design News Feed** - Timeline generation and caching
4. **Design Rate Limiter** - Throttling and resource protection

### **Scalability Patterns**

1. **Design Search Autocomplete** - Trie data structure at scale
2. **Design Web Crawler** - Distributed crawling and coordination
3. **Design Video Streaming** - CDN and content delivery
4. **Design Notification System** - Message queuing and delivery

### **Data Management**

1. **Design Distributed Cache** - Consistency and partitioning
2. **Design Key-Value Store** - Distributed storage and replication
3. **Design File System** - Metadata management and storage
4. **Design Analytics Platform** - Data pipeline and processing

### **Advanced System Design**

1. **Design Payment System** - Transaction processing and reliability
2. **Design Stock Exchange** - Low latency and high throughput
3. **Design Gaming Leaderboard** - Real-time ranking and updates
4. **Design Ride Sharing Service** - Geospatial indexing and matching

---

_Master system design algorithms to build scalable, reliable, and efficient distributed systems!_
