# Fundamentals & Scalability 🚀

Master the foundational concepts of scalable system design with practical Java implementations and real-world examples.

## Table of Contents

- [Scalability Fundamentals](#scalability-fundamentals)
- [Performance Metrics & SLAs](#performance-metrics--slas)
- [Horizontal vs Vertical Scaling](#horizontal-vs-vertical-scaling)
- [Load Distribution Patterns](#load-distribution-patterns)
- [Stateless vs Stateful Services](#stateless-vs-stateful-services)
- [CAP Theorem in Practice](#cap-theorem-in-practice)

---

## Scalability Fundamentals

### Understanding Scale Requirements

```java
public class ScalabilityCalculator {

    public static class SystemRequirements {
        private final long dailyActiveUsers;
        private final double avgRequestsPerUserPerDay;
        private final double peakLoadMultiplier;

        public SystemRequirements(long dailyActiveUsers,
                                double avgRequestsPerUserPerDay,
                                double peakLoadMultiplier) {
            this.dailyActiveUsers = dailyActiveUsers;
            this.avgRequestsPerUserPerDay = avgRequestsPerUserPerDay;
            this.peakLoadMultiplier = peakLoadMultiplier;
        }

        public long calculatePeakRequestsPerSecond() {
            // Peak requests = DAU * avg_requests * peak_multiplier / seconds_in_day
            return (long) ((dailyActiveUsers * avgRequestsPerUserPerDay * peakLoadMultiplier) / 86400);
        }

        public long calculateStorageRequirements(int avgDataPerUserKB, int retentionYears) {
            // Total storage = users * data_per_user * retention_years * growth_factor
            double growthFactor = Math.pow(1.2, retentionYears); // 20% yearly growth
            return (long) (dailyActiveUsers * avgDataPerUserKB * 365 * retentionYears * growthFactor);
        }

        public double calculateBandwidthRequirements(int avgResponseSizeKB) {
            long peakRPS = calculatePeakRequestsPerSecond();
            // Bandwidth in Mbps = (requests_per_second * response_size_kb * 8) / 1024
            return (peakRPS * avgResponseSizeKB * 8.0) / 1024.0;
        }
    }

    // Example: Social media platform like Instagram
    public static void main(String[] args) {
        SystemRequirements instagram = new SystemRequirements(
            500_000_000L,  // 500M DAU
            50,            // 50 requests per user per day
            3.0            // 3x peak load during prime time
        );

        System.out.println("Peak RPS: " + instagram.calculatePeakRequestsPerSecond());
        System.out.println("Storage needed (5 years): " +
            instagram.calculateStorageRequirements(100, 5) + " KB");
        System.out.println("Bandwidth needed: " +
            instagram.calculateBandwidthRequirements(50) + " Mbps");
    }
}
```

### Scalability Patterns Implementation

```java
// 1. Connection Pooling for Database Scalability
public class DatabaseConnectionPool {
    private final BlockingQueue<Connection> pool;
    private final String url;
    private final String username;
    private final String password;
    private final int maxPoolSize;

    public DatabaseConnectionPool(String url, String username, String password, int maxPoolSize) {
        this.url = url;
        this.username = username;
        this.password = password;
        this.maxPoolSize = maxPoolSize;
        this.pool = new LinkedBlockingQueue<>();

        // Initialize pool with connections
        initializePool();
    }

    private void initializePool() {
        try {
            for (int i = 0; i < maxPoolSize; i++) {
                Connection conn = DriverManager.getConnection(url, username, password);
                pool.offer(conn);
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to initialize connection pool", e);
        }
    }

    public Connection getConnection() throws InterruptedException {
        return pool.take(); // Blocks if no connection available
    }

    public void returnConnection(Connection connection) {
        if (connection != null) {
            pool.offer(connection);
        }
    }

    // Resource cleanup
    public void shutdown() {
        pool.forEach(conn -> {
            try {
                conn.close();
            } catch (SQLException e) {
                // Log error
            }
        });
    }
}

// 2. Asynchronous Processing for Better Throughput
public class AsyncTaskProcessor {
    private final ExecutorService executorService;
    private final BlockingQueue<Runnable> taskQueue;

    public AsyncTaskProcessor(int threadPoolSize, int queueCapacity) {
        this.taskQueue = new LinkedBlockingQueue<>(queueCapacity);
        this.executorService = new ThreadPoolExecutor(
            threadPoolSize / 2,  // core pool size
            threadPoolSize,      // maximum pool size
            60L,                 // keep alive time
            TimeUnit.SECONDS,
            taskQueue,
            new ThreadFactoryBuilder()
                .setNameFormat("async-processor-%d")
                .setDaemon(true)
                .build(),
            new ThreadPoolExecutor.CallerRunsPolicy() // Backpressure handling
        );
    }

    public CompletableFuture<Void> processAsync(Runnable task) {
        return CompletableFuture.runAsync(task, executorService);
    }

    public <T> CompletableFuture<T> processAsync(Supplier<T> task) {
        return CompletableFuture.supplyAsync(task, executorService);
    }

    // Example: Processing user registration asynchronously
    public CompletableFuture<User> registerUserAsync(UserRegistrationRequest request) {
        return CompletableFuture
            .supplyAsync(() -> validateUser(request), executorService)
            .thenCompose(validatedRequest ->
                CompletableFuture.supplyAsync(() -> saveUser(validatedRequest), executorService))
            .thenCompose(savedUser ->
                CompletableFuture.supplyAsync(() -> sendWelcomeEmail(savedUser), executorService)
                .thenApply(__ -> savedUser));
    }

    private UserRegistrationRequest validateUser(UserRegistrationRequest request) {
        // Validation logic
        return request;
    }

    private User saveUser(UserRegistrationRequest request) {
        // Database save logic
        return new User(request.getEmail(), request.getName());
    }

    private void sendWelcomeEmail(User user) {
        // Email sending logic (can be delegated to external service)
    }

    public void shutdown() {
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(60, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
        }
    }
}
```

---

## Performance Metrics & SLAs

### Metrics Collection and SLA Monitoring

```java
// Service Level Agreement (SLA) monitoring
public class SLAMonitor {
    private final AtomicLong totalRequests = new AtomicLong(0);
    private final AtomicLong successfulRequests = new AtomicLong(0);
    private final AtomicLong totalResponseTime = new AtomicLong(0);
    private final Map<Integer, AtomicLong> responseTimeHistogram = new ConcurrentHashMap<>();

    // SLA targets
    private static final double AVAILABILITY_SLA = 99.9; // 99.9%
    private static final long RESPONSE_TIME_SLA_MS = 200; // 200ms for 95th percentile
    private static final double SUCCESS_RATE_SLA = 99.5; // 99.5%

    public void recordRequest(long responseTimeMs, boolean isSuccess) {
        totalRequests.incrementAndGet();
        if (isSuccess) {
            successfulRequests.incrementAndGet();
        }
        totalResponseTime.addAndGet(responseTimeMs);

        // Update histogram (simplified - in production use proper percentile calculation)
        int bucket = (int) (responseTimeMs / 50) * 50; // 50ms buckets
        responseTimeHistogram.computeIfAbsent(bucket, k -> new AtomicLong(0)).incrementAndGet();
    }

    public SLAReport generateReport() {
        long total = totalRequests.get();
        long successful = successfulRequests.get();

        double availability = (total > 0) ? (successful * 100.0) / total : 100.0;
        double avgResponseTime = (total > 0) ? totalResponseTime.get() / (double) total : 0.0;
        double p95ResponseTime = calculateP95ResponseTime();

        return new SLAReport(availability, avgResponseTime, p95ResponseTime,
                           isAvailabilitySLAMet(availability),
                           isResponseTimeSLAMet(p95ResponseTime),
                           isSuccessRateSLAMet(availability));
    }

    private double calculateP95ResponseTime() {
        long total = totalRequests.get();
        long p95Threshold = (long) (total * 0.95);
        long count = 0;

        for (Map.Entry<Integer, AtomicLong> entry : responseTimeHistogram.entrySet()) {
            count += entry.getValue().get();
            if (count >= p95Threshold) {
                return entry.getKey();
            }
        }
        return 0.0;
    }

    private boolean isAvailabilitySLAMet(double availability) {
        return availability >= AVAILABILITY_SLA;
    }

    private boolean isResponseTimeSLAMet(double p95ResponseTime) {
        return p95ResponseTime <= RESPONSE_TIME_SLA_MS;
    }

    private boolean isSuccessRateSLAMet(double successRate) {
        return successRate >= SUCCESS_RATE_SLA;
    }

    public static class SLAReport {
        private final double availability;
        private final double avgResponseTime;
        private final double p95ResponseTime;
        private final boolean availabilitySLAMet;
        private final boolean responseTimeSLAMet;
        private final boolean successRateSLAMet;

        public SLAReport(double availability, double avgResponseTime, double p95ResponseTime,
                        boolean availabilitySLAMet, boolean responseTimeSLAMet, boolean successRateSLAMet) {
            this.availability = availability;
            this.avgResponseTime = avgResponseTime;
            this.p95ResponseTime = p95ResponseTime;
            this.availabilitySLAMet = availabilitySLAMet;
            this.responseTimeSLAMet = responseTimeSLAMet;
            this.successRateSLAMet = successRateSLAMet;
        }

        @Override
        public String toString() {
            return String.format(
                "SLA Report:\n" +
                "  Availability: %.2f%% (Target: %.1f%%) - %s\n" +
                "  Avg Response Time: %.2fms\n" +
                "  P95 Response Time: %.2fms (Target: %dms) - %s\n" +
                "  Success Rate SLA: %s",
                availability, AVAILABILITY_SLA, availabilitySLAMet ? "✅ MET" : "❌ MISSED",
                avgResponseTime,
                p95ResponseTime, RESPONSE_TIME_SLA_MS, responseTimeSLAMet ? "✅ MET" : "❌ MISSED",
                successRateSLAMet ? "✅ MET" : "❌ MISSED"
            );
        }
    }
}
```

### Circuit Breaker Pattern for Resilience

```java
public class CircuitBreaker {
    private final int failureThreshold;
    private final long timeoutMillis;
    private final long retryTimeoutMillis;

    private AtomicInteger failureCount = new AtomicInteger(0);
    private AtomicLong lastFailureTime = new AtomicLong(0);
    private AtomicReference<State> state = new AtomicReference<>(State.CLOSED);

    public enum State {
        CLOSED,    // Normal operation
        OPEN,      // Circuit is open, failing fast
        HALF_OPEN  // Testing if service is back
    }

    public CircuitBreaker(int failureThreshold, long timeoutMillis, long retryTimeoutMillis) {
        this.failureThreshold = failureThreshold;
        this.timeoutMillis = timeoutMillis;
        this.retryTimeoutMillis = retryTimeoutMillis;
    }

    public <T> T execute(Supplier<T> operation) throws CircuitBreakerException {
        if (state.get() == State.OPEN) {
            if (System.currentTimeMillis() - lastFailureTime.get() > retryTimeoutMillis) {
                state.set(State.HALF_OPEN);
            } else {
                throw new CircuitBreakerException("Circuit breaker is OPEN");
            }
        }

        try {
            T result = callWithTimeout(operation);
            onSuccess();
            return result;
        } catch (Exception e) {
            onFailure();
            throw new CircuitBreakerException("Operation failed", e);
        }
    }

    private <T> T callWithTimeout(Supplier<T> operation) throws Exception {
        CompletableFuture<T> future = CompletableFuture.supplyAsync(operation);
        try {
            return future.get(timeoutMillis, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new Exception("Operation timed out", e);
        }
    }

    private void onSuccess() {
        failureCount.set(0);
        state.set(State.CLOSED);
    }

    private void onFailure() {
        failureCount.incrementAndGet();
        lastFailureTime.set(System.currentTimeMillis());

        if (failureCount.get() >= failureThreshold) {
            state.set(State.OPEN);
        }
    }

    public State getState() {
        return state.get();
    }

    public static class CircuitBreakerException extends RuntimeException {
        public CircuitBreakerException(String message) {
            super(message);
        }

        public CircuitBreakerException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}

// Usage example for external service calls
public class ExternalServiceClient {
    private final CircuitBreaker circuitBreaker;
    private final HttpClient httpClient;

    public ExternalServiceClient() {
        this.circuitBreaker = new CircuitBreaker(5, 3000, 30000); // 5 failures, 3s timeout, 30s retry
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    }

    public String callExternalService(String endpoint) {
        return circuitBreaker.execute(() -> {
            try {
                HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(Duration.ofSeconds(3))
                    .build();

                HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() != 200) {
                    throw new RuntimeException("HTTP " + response.statusCode());
                }

                return response.body();
            } catch (Exception e) {
                throw new RuntimeException("Service call failed", e);
            }
        });
    }
}
```

---

## Horizontal vs Vertical Scaling

### Horizontal Scaling Implementation

```java
// Load balancer for horizontal scaling
public class LoadBalancer {
    private final List<ServiceInstance> instances;
    private final AtomicInteger currentIndex = new AtomicInteger(0);
    private final LoadBalancingStrategy strategy;

    public enum LoadBalancingStrategy {
        ROUND_ROBIN,
        WEIGHTED_ROUND_ROBIN,
        LEAST_CONNECTIONS,
        RANDOM
    }

    public LoadBalancer(List<ServiceInstance> instances, LoadBalancingStrategy strategy) {
        this.instances = new ArrayList<>(instances);
        this.strategy = strategy;
    }

    public ServiceInstance getNextInstance() {
        switch (strategy) {
            case ROUND_ROBIN:
                return roundRobin();
            case WEIGHTED_ROUND_ROBIN:
                return weightedRoundRobin();
            case LEAST_CONNECTIONS:
                return leastConnections();
            case RANDOM:
                return random();
            default:
                return roundRobin();
        }
    }

    private ServiceInstance roundRobin() {
        int index = currentIndex.getAndIncrement() % instances.size();
        return instances.get(index);
    }

    private ServiceInstance weightedRoundRobin() {
        int totalWeight = instances.stream().mapToInt(ServiceInstance::getWeight).sum();
        int randomWeight = ThreadLocalRandom.current().nextInt(totalWeight);

        int currentWeight = 0;
        for (ServiceInstance instance : instances) {
            currentWeight += instance.getWeight();
            if (randomWeight < currentWeight) {
                return instance;
            }
        }
        return instances.get(0); // fallback
    }

    private ServiceInstance leastConnections() {
        return instances.stream()
            .min(Comparator.comparingInt(ServiceInstance::getActiveConnections))
            .orElse(instances.get(0));
    }

    private ServiceInstance random() {
        int index = ThreadLocalRandom.current().nextInt(instances.size());
        return instances.get(index);
    }

    // Health check and instance management
    public void performHealthCheck() {
        instances.parallelStream().forEach(instance -> {
            try {
                boolean isHealthy = checkInstanceHealth(instance);
                instance.setHealthy(isHealthy);
            } catch (Exception e) {
                instance.setHealthy(false);
            }
        });

        // Remove unhealthy instances
        instances.removeIf(instance -> !instance.isHealthy());
    }

    private boolean checkInstanceHealth(ServiceInstance instance) {
        try {
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(instance.getUrl() + "/health"))
                .timeout(Duration.ofSeconds(3))
                .build();

            HttpResponse<String> response = client.send(request,
                HttpResponse.BodyHandlers.ofString());

            return response.statusCode() == 200;
        } catch (Exception e) {
            return false;
        }
    }

    public static class ServiceInstance {
        private final String id;
        private final String url;
        private final int weight;
        private volatile boolean healthy = true;
        private final AtomicInteger activeConnections = new AtomicInteger(0);

        public ServiceInstance(String id, String url, int weight) {
            this.id = id;
            this.url = url;
            this.weight = weight;
        }

        public void incrementConnections() {
            activeConnections.incrementAndGet();
        }

        public void decrementConnections() {
            activeConnections.decrementAndGet();
        }

        // Getters and setters
        public String getId() { return id; }
        public String getUrl() { return url; }
        public int getWeight() { return weight; }
        public boolean isHealthy() { return healthy; }
        public void setHealthy(boolean healthy) { this.healthy = healthy; }
        public int getActiveConnections() { return activeConnections.get(); }
    }
}
```

### Auto-Scaling Implementation

```java
public class AutoScaler {
    private final CloudProvider cloudProvider;
    private final MetricsCollector metricsCollector;
    private final ScheduledExecutorService scheduler;

    // Scaling policies
    private final double CPU_SCALE_UP_THRESHOLD = 70.0;
    private final double CPU_SCALE_DOWN_THRESHOLD = 30.0;
    private final double MEMORY_SCALE_UP_THRESHOLD = 80.0;
    private final int MIN_INSTANCES = 2;
    private final int MAX_INSTANCES = 20;
    private final int SCALE_UP_COOLDOWN_MINUTES = 5;
    private final int SCALE_DOWN_COOLDOWN_MINUTES = 10;

    private volatile Instant lastScaleUp = Instant.EPOCH;
    private volatile Instant lastScaleDown = Instant.EPOCH;

    public AutoScaler(CloudProvider cloudProvider, MetricsCollector metricsCollector) {
        this.cloudProvider = cloudProvider;
        this.metricsCollector = metricsCollector;
        this.scheduler = Executors.newScheduledThreadPool(1);

        // Start monitoring
        scheduler.scheduleAtFixedRate(this::evaluateScaling, 0, 1, TimeUnit.MINUTES);
    }

    private void evaluateScaling() {
        try {
            SystemMetrics metrics = metricsCollector.getCurrentMetrics();
            int currentInstances = cloudProvider.getCurrentInstanceCount();

            ScalingDecision decision = makeScalingDecision(metrics, currentInstances);

            if (decision.shouldScale()) {
                executeScaling(decision);
            }

        } catch (Exception e) {
            // Log error but don't break the monitoring loop
            System.err.println("Error during scaling evaluation: " + e.getMessage());
        }
    }

    private ScalingDecision makeScalingDecision(SystemMetrics metrics, int currentInstances) {
        boolean shouldScaleUp = shouldScaleUp(metrics, currentInstances);
        boolean shouldScaleDown = shouldScaleDown(metrics, currentInstances);

        if (shouldScaleUp && !shouldScaleDown) {
            int targetInstances = Math.min(currentInstances + 1, MAX_INSTANCES);
            return new ScalingDecision(ScalingDirection.UP, targetInstances,
                "High resource utilization detected");
        } else if (shouldScaleDown && !shouldScaleUp) {
            int targetInstances = Math.max(currentInstances - 1, MIN_INSTANCES);
            return new ScalingDecision(ScalingDirection.DOWN, targetInstances,
                "Low resource utilization detected");
        }

        return new ScalingDecision(ScalingDirection.NONE, currentInstances, "No scaling needed");
    }

    private boolean shouldScaleUp(SystemMetrics metrics, int currentInstances) {
        if (currentInstances >= MAX_INSTANCES) return false;
        if (Duration.between(lastScaleUp, Instant.now()).toMinutes() < SCALE_UP_COOLDOWN_MINUTES) {
            return false;
        }

        return metrics.getCpuUtilization() > CPU_SCALE_UP_THRESHOLD ||
               metrics.getMemoryUtilization() > MEMORY_SCALE_UP_THRESHOLD ||
               metrics.getRequestsPerSecond() > metrics.getRequestCapacity() * 0.8;
    }

    private boolean shouldScaleDown(SystemMetrics metrics, int currentInstances) {
        if (currentInstances <= MIN_INSTANCES) return false;
        if (Duration.between(lastScaleDown, Instant.now()).toMinutes() < SCALE_DOWN_COOLDOWN_MINUTES) {
            return false;
        }

        return metrics.getCpuUtilization() < CPU_SCALE_DOWN_THRESHOLD &&
               metrics.getMemoryUtilization() < 50.0 &&
               metrics.getRequestsPerSecond() < metrics.getRequestCapacity() * 0.3;
    }

    private void executeScaling(ScalingDecision decision) {
        try {
            switch (decision.getDirection()) {
                case UP:
                    cloudProvider.scaleUp(decision.getTargetInstances());
                    lastScaleUp = Instant.now();
                    System.out.println("Scaled up to " + decision.getTargetInstances() +
                                     " instances. Reason: " + decision.getReason());
                    break;
                case DOWN:
                    cloudProvider.scaleDown(decision.getTargetInstances());
                    lastScaleDown = Instant.now();
                    System.out.println("Scaled down to " + decision.getTargetInstances() +
                                     " instances. Reason: " + decision.getReason());
                    break;
            }
        } catch (Exception e) {
            System.err.println("Failed to execute scaling: " + e.getMessage());
        }
    }

    public void shutdown() {
        scheduler.shutdown();
    }

    // Supporting classes
    public enum ScalingDirection { UP, DOWN, NONE }

    public static class ScalingDecision {
        private final ScalingDirection direction;
        private final int targetInstances;
        private final String reason;

        public ScalingDecision(ScalingDirection direction, int targetInstances, String reason) {
            this.direction = direction;
            this.targetInstances = targetInstances;
            this.reason = reason;
        }

        public boolean shouldScale() {
            return direction != ScalingDirection.NONE;
        }

        // Getters
        public ScalingDirection getDirection() { return direction; }
        public int getTargetInstances() { return targetInstances; }
        public String getReason() { return reason; }
    }

    public static class SystemMetrics {
        private final double cpuUtilization;
        private final double memoryUtilization;
        private final long requestsPerSecond;
        private final long requestCapacity;

        public SystemMetrics(double cpuUtilization, double memoryUtilization,
                           long requestsPerSecond, long requestCapacity) {
            this.cpuUtilization = cpuUtilization;
            this.memoryUtilization = memoryUtilization;
            this.requestsPerSecond = requestsPerSecond;
            this.requestCapacity = requestCapacity;
        }

        // Getters
        public double getCpuUtilization() { return cpuUtilization; }
        public double getMemoryUtilization() { return memoryUtilization; }
        public long getRequestsPerSecond() { return requestsPerSecond; }
        public long getRequestCapacity() { return requestCapacity; }
    }
}

// Cloud provider interface (AWS, GCP, Azure implementations would follow)
public interface CloudProvider {
    int getCurrentInstanceCount();
    void scaleUp(int targetInstances);
    void scaleDown(int targetInstances);
}

// Metrics collector interface
public interface MetricsCollector {
    AutoScaler.SystemMetrics getCurrentMetrics();
}
```

**📊 Scaling Decision Matrix:**

| Metric            | Scale Up Trigger | Scale Down Trigger | Cooldown |
| ----------------- | ---------------- | ------------------ | -------- |
| **CPU Usage**     | > 70%            | < 30%              | 5/10 min |
| **Memory Usage**  | > 80%            | < 50%              | 5/10 min |
| **Request Rate**  | > 80% capacity   | < 30% capacity     | 5/10 min |
| **Response Time** | > 500ms P95      | < 100ms P95        | 5/10 min |

---

## Summary & Best Practices

### 🎯 Key Takeaways

✅ **Calculate Scale Requirements**: Always start with numbers - DAU, RPS, storage needs  
✅ **Design for Horizontal Scaling**: Stateless services, load balancing, auto-scaling  
✅ **Monitor SLAs**: Track availability, response time, and success rates  
✅ **Implement Circuit Breakers**: Fail fast to prevent cascade failures  
✅ **Use Connection Pooling**: Efficiently manage database connections

### 📈 Scalability Checklist

- [ ] Calculated peak load requirements
- [ ] Implemented connection pooling
- [ ] Added circuit breakers for external dependencies
- [ ] Set up load balancing with health checks
- [ ] Configured auto-scaling policies
- [ ] Established SLA monitoring
- [ ] Designed for stateless operation

### ⚠️ Common Scalability Pitfalls

- **Premature optimization**: Scaling before you need to
- **Single points of failure**: Not designing for redundancy
- **Stateful services**: Making horizontal scaling difficult
- **No monitoring**: Flying blind without metrics
- **Tight coupling**: Making it hard to scale individual components

**📈 Next Steps:**
Ready to design your data layer? Continue with [Database Design & Choices](./02-database-design-choices.md) to learn about database selection, partitioning, and consistency patterns.

---

_💡 Pro Tip: Start simple and scale incrementally. Measure everything, optimize bottlenecks, and always design for failure. The best architecture is one that can grow with your needs._
