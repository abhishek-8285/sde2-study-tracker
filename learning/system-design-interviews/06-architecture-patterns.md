# High-Level Architecture Patterns 🏗️

Master microservices architecture, event-driven systems, and distributed patterns with practical Java implementations for system design interviews.

## Table of Contents

- [Microservices Architecture](#microservices-architecture)
- [Event-Driven Architecture](#event-driven-architecture)
- [CQRS & Event Sourcing](#cqrs--event-sourcing)
- [Service Mesh & Communication](#service-mesh--communication)
- [Distributed System Patterns](#distributed-system-patterns)
- [Observability & Monitoring](#observability--monitoring)

---

## Microservices Architecture

### Service Discovery and Registration

```java
@Component
public class ServiceDiscoveryManager {

    private final Map<String, List<ServiceInstance>> serviceRegistry;
    private final ScheduledExecutorService healthCheckExecutor;
    private final EventPublisher eventPublisher;

    public ServiceDiscoveryManager(EventPublisher eventPublisher) {
        this.serviceRegistry = new ConcurrentHashMap<>();
        this.healthCheckExecutor = Executors.newScheduledThreadPool(5);
        this.eventPublisher = eventPublisher;

        startHealthChecking();
    }

    public void registerService(ServiceInstance instance) {
        String serviceName = instance.getServiceName();

        serviceRegistry.computeIfAbsent(serviceName, k -> new CopyOnWriteArrayList<>())
                      .add(instance);

        eventPublisher.publish(new ServiceRegisteredEvent(instance));

        // Start health checking for this instance
        scheduleHealthCheck(instance);

        System.out.println("Service registered: " + serviceName + " at " + instance.getAddress());
    }

    public void deregisterService(String serviceName, String instanceId) {
        List<ServiceInstance> instances = serviceRegistry.get(serviceName);
        if (instances != null) {
            instances.removeIf(instance -> instance.getInstanceId().equals(instanceId));

            if (instances.isEmpty()) {
                serviceRegistry.remove(serviceName);
            }

            eventPublisher.publish(new ServiceDeregisteredEvent(serviceName, instanceId));
        }
    }

    public List<ServiceInstance> discoverService(String serviceName) {
        return serviceRegistry.getOrDefault(serviceName, Collections.emptyList())
                             .stream()
                             .filter(ServiceInstance::isHealthy)
                             .collect(Collectors.toList());
    }

    public Optional<ServiceInstance> getServiceInstance(String serviceName, LoadBalancingStrategy strategy) {
        List<ServiceInstance> instances = discoverService(serviceName);

        if (instances.isEmpty()) {
            return Optional.empty();
        }

        return Optional.of(strategy.selectInstance(instances));
    }

    private void scheduleHealthCheck(ServiceInstance instance) {
        healthCheckExecutor.scheduleAtFixedRate(() -> {
            performHealthCheck(instance);
        }, 0, 30, TimeUnit.SECONDS);
    }

    private void performHealthCheck(ServiceInstance instance) {
        try {
            boolean isHealthy = checkInstanceHealth(instance);

            if (instance.isHealthy() != isHealthy) {
                instance.setHealthy(isHealthy);

                if (isHealthy) {
                    eventPublisher.publish(new ServiceHealthyEvent(instance));
                } else {
                    eventPublisher.publish(new ServiceUnhealthyEvent(instance));
                }
            }

        } catch (Exception e) {
            instance.setHealthy(false);
            System.err.println("Health check failed for " + instance.getInstanceId() + ": " + e.getMessage());
        }
    }

    private boolean checkInstanceHealth(ServiceInstance instance) {
        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(5))
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(instance.getHealthCheckUrl()))
                    .timeout(Duration.ofSeconds(3))
                    .build();

            HttpResponse<String> response = client.send(request,
                    HttpResponse.BodyHandlers.ofString());

            return response.statusCode() == 200;

        } catch (Exception e) {
            return false;
        }
    }

    private void startHealthChecking() {
        healthCheckExecutor.scheduleAtFixedRate(() -> {
            // Periodic cleanup of unhealthy instances
            serviceRegistry.forEach((serviceName, instances) -> {
                instances.removeIf(instance ->
                    !instance.isHealthy() &&
                    Duration.between(instance.getLastHealthCheck(), Instant.now()).toMinutes() > 5
                );
            });
        }, 0, 1, TimeUnit.MINUTES);
    }

    public Map<String, List<ServiceInstance>> getServiceRegistry() {
        return Collections.unmodifiableMap(serviceRegistry);
    }
}

// Service Instance representation
public class ServiceInstance {
    private final String serviceName;
    private final String instanceId;
    private final String address;
    private final int port;
    private final Map<String, String> metadata;
    private volatile boolean healthy;
    private volatile Instant lastHealthCheck;

    public ServiceInstance(String serviceName, String instanceId, String address, int port) {
        this.serviceName = serviceName;
        this.instanceId = instanceId;
        this.address = address;
        this.port = port;
        this.metadata = new ConcurrentHashMap<>();
        this.healthy = true;
        this.lastHealthCheck = Instant.now();
    }

    public String getHealthCheckUrl() {
        return "http://" + address + ":" + port + "/health";
    }

    public String getServiceUrl() {
        return "http://" + address + ":" + port;
    }

    // Getters and setters
    public String getServiceName() { return serviceName; }
    public String getInstanceId() { return instanceId; }
    public String getAddress() { return address; }
    public int getPort() { return port; }
    public Map<String, String> getMetadata() { return metadata; }
    public boolean isHealthy() { return healthy; }
    public void setHealthy(boolean healthy) { this.healthy = healthy; }
    public Instant getLastHealthCheck() { return lastHealthCheck; }
    public void setLastHealthCheck(Instant lastHealthCheck) { this.lastHealthCheck = lastHealthCheck; }
}

// Circuit breaker for inter-service communication
public class ServiceCircuitBreaker {

    private final Map<String, CircuitBreakerState> circuitBreakers;
    private final CircuitBreakerConfig config;

    public ServiceCircuitBreaker(CircuitBreakerConfig config) {
        this.circuitBreakers = new ConcurrentHashMap<>();
        this.config = config;
    }

    public <T> T execute(String serviceName, Supplier<T> operation, Supplier<T> fallback) {
        CircuitBreakerState breaker = circuitBreakers.computeIfAbsent(serviceName,
                k -> new CircuitBreakerState(config));

        if (breaker.getState() == CircuitState.OPEN) {
            if (breaker.shouldAttemptReset()) {
                breaker.setState(CircuitState.HALF_OPEN);
            } else {
                return fallback.get();
            }
        }

        try {
            long startTime = System.nanoTime();
            T result = operation.get();
            long duration = System.nanoTime() - startTime;

            breaker.recordSuccess(duration);
            return result;

        } catch (Exception e) {
            breaker.recordFailure();

            if (breaker.getState() == CircuitState.OPEN) {
                return fallback.get();
            } else {
                throw new RuntimeException("Service call failed", e);
            }
        }
    }

    public CircuitBreakerMetrics getMetrics(String serviceName) {
        CircuitBreakerState breaker = circuitBreakers.get(serviceName);
        return breaker != null ? breaker.getMetrics() : null;
    }

    private static class CircuitBreakerState {
        private final CircuitBreakerConfig config;
        private volatile CircuitState state;
        private final AtomicInteger failureCount;
        private final AtomicLong lastFailureTime;
        private final AtomicLong totalRequests;
        private final AtomicLong successfulRequests;
        private final AtomicLong totalResponseTime;

        public CircuitBreakerState(CircuitBreakerConfig config) {
            this.config = config;
            this.state = CircuitState.CLOSED;
            this.failureCount = new AtomicInteger(0);
            this.lastFailureTime = new AtomicLong(0);
            this.totalRequests = new AtomicLong(0);
            this.successfulRequests = new AtomicLong(0);
            this.totalResponseTime = new AtomicLong(0);
        }

        public void recordSuccess(long responseTimeNanos) {
            totalRequests.incrementAndGet();
            successfulRequests.incrementAndGet();
            totalResponseTime.addAndGet(responseTimeNanos);

            failureCount.set(0);

            if (state == CircuitState.HALF_OPEN) {
                state = CircuitState.CLOSED;
            }
        }

        public void recordFailure() {
            totalRequests.incrementAndGet();
            int failures = failureCount.incrementAndGet();
            lastFailureTime.set(System.currentTimeMillis());

            if (failures >= config.getFailureThreshold()) {
                state = CircuitState.OPEN;
            }
        }

        public boolean shouldAttemptReset() {
            return System.currentTimeMillis() - lastFailureTime.get() > config.getTimeout().toMillis();
        }

        public CircuitBreakerMetrics getMetrics() {
            long total = totalRequests.get();
            long successful = successfulRequests.get();

            double successRate = total > 0 ? (successful * 100.0) / total : 100.0;
            double avgResponseTime = successful > 0 ?
                    (totalResponseTime.get() / 1_000_000.0) / successful : 0.0;

            return new CircuitBreakerMetrics(state, successRate, avgResponseTime,
                    failureCount.get(), total);
        }

        // Getters and setters
        public CircuitState getState() { return state; }
        public void setState(CircuitState state) { this.state = state; }
    }

    public enum CircuitState {
        CLOSED, OPEN, HALF_OPEN
    }

    public static class CircuitBreakerConfig {
        private final int failureThreshold;
        private final Duration timeout;

        public CircuitBreakerConfig(int failureThreshold, Duration timeout) {
            this.failureThreshold = failureThreshold;
            this.timeout = timeout;
        }

        // Getters
        public int getFailureThreshold() { return failureThreshold; }
        public Duration getTimeout() { return timeout; }
    }

    public static class CircuitBreakerMetrics {
        private final CircuitState state;
        private final double successRate;
        private final double avgResponseTime;
        private final int failureCount;
        private final long totalRequests;

        public CircuitBreakerMetrics(CircuitState state, double successRate,
                                   double avgResponseTime, int failureCount, long totalRequests) {
            this.state = state;
            this.successRate = successRate;
            this.avgResponseTime = avgResponseTime;
            this.failureCount = failureCount;
            this.totalRequests = totalRequests;
        }

        // Getters
        public CircuitState getState() { return state; }
        public double getSuccessRate() { return successRate; }
        public double getAvgResponseTime() { return avgResponseTime; }
        public int getFailureCount() { return failureCount; }
        public long getTotalRequests() { return totalRequests; }
    }
}

// Load balancing strategies
public interface LoadBalancingStrategy {
    ServiceInstance selectInstance(List<ServiceInstance> instances);
}

public class RoundRobinStrategy implements LoadBalancingStrategy {
    private final AtomicInteger counter = new AtomicInteger(0);

    @Override
    public ServiceInstance selectInstance(List<ServiceInstance> instances) {
        if (instances.isEmpty()) {
            throw new IllegalArgumentException("No instances available");
        }

        int index = Math.abs(counter.getAndIncrement() % instances.size());
        return instances.get(index);
    }
}

public class RandomStrategy implements LoadBalancingStrategy {
    private final Random random = new Random();

    @Override
    public ServiceInstance selectInstance(List<ServiceInstance> instances) {
        if (instances.isEmpty()) {
            throw new IllegalArgumentException("No instances available");
        }

        return instances.get(random.nextInt(instances.size()));
    }
}
```

---

## Event-Driven Architecture

### Event Store and Event Bus Implementation

```java
public class EventStoreManager {

    private final EventStore eventStore;
    private final EventBus eventBus;
    private final EventProjectionManager projectionManager;
    private final SnapshotStore snapshotStore;

    public EventStoreManager(EventStore eventStore, EventBus eventBus,
                           EventProjectionManager projectionManager, SnapshotStore snapshotStore) {
        this.eventStore = eventStore;
        this.eventBus = eventBus;
        this.projectionManager = projectionManager;
        this.snapshotStore = snapshotStore;
    }

    // Append events to the event store
    public CompletableFuture<Long> appendEvents(String streamId, List<DomainEvent> events,
                                              long expectedVersion) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                // Optimistic concurrency check
                long currentVersion = eventStore.getCurrentVersion(streamId);
                if (currentVersion != expectedVersion) {
                    throw new ConcurrencyException(
                        "Expected version " + expectedVersion + " but current version is " + currentVersion);
                }

                // Append events
                long newVersion = eventStore.appendEvents(streamId, events, currentVersion);

                // Publish events to event bus
                events.forEach(event -> eventBus.publish(new EventEnvelope(streamId, event, newVersion)));

                return newVersion;

            } catch (Exception e) {
                throw new RuntimeException("Failed to append events", e);
            }
        });
    }

    // Load aggregate from event stream
    public <T extends AggregateRoot> CompletableFuture<T> loadAggregate(String streamId,
                                                                       Class<T> aggregateType) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                T aggregate = aggregateType.getDeclaredConstructor().newInstance();

                // Try to load from snapshot first
                Optional<Snapshot> snapshot = snapshotStore.getSnapshot(streamId);
                long fromVersion = 0;

                if (snapshot.isPresent()) {
                    aggregate.loadFromSnapshot(snapshot.get());
                    fromVersion = snapshot.get().getVersion();
                }

                // Load events since snapshot
                List<DomainEvent> events = eventStore.getEvents(streamId, fromVersion);
                aggregate.loadFromHistory(events);

                return aggregate;

            } catch (Exception e) {
                throw new RuntimeException("Failed to load aggregate", e);
            }
        });
    }

    // Save aggregate and create snapshot if needed
    public <T extends AggregateRoot> CompletableFuture<Void> saveAggregate(T aggregate) {
        return CompletableFuture.runAsync(() -> {
            List<DomainEvent> uncommittedEvents = aggregate.getUncommittedEvents();

            if (!uncommittedEvents.isEmpty()) {
                long newVersion = appendEvents(aggregate.getId(), uncommittedEvents,
                                             aggregate.getVersion()).join();

                aggregate.markEventsAsCommitted();

                // Create snapshot if threshold reached
                if (shouldCreateSnapshot(aggregate.getId(), newVersion)) {
                    createSnapshot(aggregate);
                }
            }
        });
    }

    private boolean shouldCreateSnapshot(String streamId, long version) {
        // Create snapshot every 100 events
        return version % 100 == 0;
    }

    private <T extends AggregateRoot> void createSnapshot(T aggregate) {
        try {
            Snapshot snapshot = aggregate.createSnapshot();
            snapshotStore.saveSnapshot(aggregate.getId(), snapshot);
        } catch (Exception e) {
            System.err.println("Failed to create snapshot for " + aggregate.getId() + ": " + e.getMessage());
        }
    }
}

// Domain Event base class
public abstract class DomainEvent {
    private final String eventId;
    private final Instant timestamp;
    private final String eventType;

    protected DomainEvent() {
        this.eventId = UUID.randomUUID().toString();
        this.timestamp = Instant.now();
        this.eventType = this.getClass().getSimpleName();
    }

    // Getters
    public String getEventId() { return eventId; }
    public Instant getTimestamp() { return timestamp; }
    public String getEventType() { return eventType; }

    public abstract Object getPayload();
}

// Aggregate Root base class
public abstract class AggregateRoot {
    private final String id;
    private long version;
    private final List<DomainEvent> uncommittedEvents;

    protected AggregateRoot(String id) {
        this.id = id;
        this.version = -1;
        this.uncommittedEvents = new ArrayList<>();
    }

    protected void applyEvent(DomainEvent event) {
        apply(event);
        uncommittedEvents.add(event);
    }

    public void loadFromHistory(List<DomainEvent> events) {
        for (DomainEvent event : events) {
            apply(event);
            version++;
        }
    }

    public void loadFromSnapshot(Snapshot snapshot) {
        restoreFromSnapshot(snapshot);
        version = snapshot.getVersion();
    }

    public List<DomainEvent> getUncommittedEvents() {
        return new ArrayList<>(uncommittedEvents);
    }

    public void markEventsAsCommitted() {
        uncommittedEvents.clear();
    }

    protected abstract void apply(DomainEvent event);
    protected abstract void restoreFromSnapshot(Snapshot snapshot);
    public abstract Snapshot createSnapshot();

    // Getters
    public String getId() { return id; }
    public long getVersion() { return version; }
}

// Event projection for read models
public class EventProjectionManager {

    private final Map<String, EventProjection> projections;
    private final ExecutorService projectionExecutor;
    private final CheckpointManager checkpointManager;

    public EventProjectionManager(CheckpointManager checkpointManager) {
        this.projections = new ConcurrentHashMap<>();
        this.projectionExecutor = Executors.newFixedThreadPool(5);
        this.checkpointManager = checkpointManager;
    }

    public void registerProjection(String name, EventProjection projection) {
        projections.put(name, projection);
    }

    public void processEvent(EventEnvelope eventEnvelope) {
        projections.forEach((name, projection) -> {
            projectionExecutor.submit(() -> {
                try {
                    if (projection.canHandle(eventEnvelope.getEvent())) {
                        projection.handle(eventEnvelope);

                        // Update checkpoint
                        checkpointManager.updateCheckpoint(name, eventEnvelope.getVersion());
                    }
                } catch (Exception e) {
                    System.err.println("Projection " + name + " failed to process event: " + e.getMessage());
                }
            });
        });
    }

    public void rebuildProjection(String projectionName, long fromVersion) {
        EventProjection projection = projections.get(projectionName);
        if (projection != null) {
            CompletableFuture.runAsync(() -> {
                try {
                    projection.reset();

                    // TODO: Read events from event store starting from fromVersion
                    // and replay them through the projection

                    checkpointManager.updateCheckpoint(projectionName, fromVersion);

                } catch (Exception e) {
                    System.err.println("Failed to rebuild projection " + projectionName + ": " + e.getMessage());
                }
            }, projectionExecutor);
        }
    }

    public void shutdown() {
        projectionExecutor.shutdown();
    }
}

// Event projection interface
public interface EventProjection {
    boolean canHandle(DomainEvent event);
    void handle(EventEnvelope eventEnvelope);
    void reset();
}

// Example: User projection for read model
public class UserProjection implements EventProjection {

    private final UserReadModelRepository readModelRepository;

    public UserProjection(UserReadModelRepository readModelRepository) {
        this.readModelRepository = readModelRepository;
    }

    @Override
    public boolean canHandle(DomainEvent event) {
        return event instanceof UserCreatedEvent ||
               event instanceof UserUpdatedEvent ||
               event instanceof UserDeletedEvent;
    }

    @Override
    public void handle(EventEnvelope eventEnvelope) {
        DomainEvent event = eventEnvelope.getEvent();

        if (event instanceof UserCreatedEvent) {
            handleUserCreated((UserCreatedEvent) event);
        } else if (event instanceof UserUpdatedEvent) {
            handleUserUpdated((UserUpdatedEvent) event);
        } else if (event instanceof UserDeletedEvent) {
            handleUserDeleted((UserDeletedEvent) event);
        }
    }

    private void handleUserCreated(UserCreatedEvent event) {
        UserReadModel readModel = new UserReadModel(
            event.getUserId(),
            event.getEmail(),
            event.getFirstName(),
            event.getLastName(),
            event.getTimestamp()
        );

        readModelRepository.save(readModel);
    }

    private void handleUserUpdated(UserUpdatedEvent event) {
        Optional<UserReadModel> existing = readModelRepository.findById(event.getUserId());
        if (existing.isPresent()) {
            UserReadModel readModel = existing.get();
            readModel.update(event.getFirstName(), event.getLastName(), event.getTimestamp());
            readModelRepository.save(readModel);
        }
    }

    private void handleUserDeleted(UserDeletedEvent event) {
        readModelRepository.deleteById(event.getUserId());
    }

    @Override
    public void reset() {
        readModelRepository.deleteAll();
    }
}

// Saga implementation for long-running processes
public abstract class Saga {

    private final String sagaId;
    private SagaState state;
    private final Map<String, Object> sagaData;
    private final List<SagaStep> steps;
    private int currentStepIndex;

    protected Saga(String sagaId) {
        this.sagaId = sagaId;
        this.state = SagaState.STARTED;
        this.sagaData = new ConcurrentHashMap<>();
        this.steps = new ArrayList<>();
        this.currentStepIndex = 0;

        defineSteps();
    }

    protected abstract void defineSteps();

    protected void addStep(SagaStep step) {
        steps.add(step);
    }

    public void processEvent(DomainEvent event) {
        if (state == SagaState.COMPLETED || state == SagaState.COMPENSATING) {
            return;
        }

        if (canHandleEvent(event)) {
            handleEvent(event);

            if (currentStepIndex < steps.size()) {
                executeNextStep();
            } else {
                complete();
            }
        }
    }

    private void executeNextStep() {
        if (currentStepIndex < steps.size()) {
            SagaStep step = steps.get(currentStepIndex);

            try {
                step.execute(sagaData);
                currentStepIndex++;
            } catch (Exception e) {
                compensate();
            }
        }
    }

    private void complete() {
        state = SagaState.COMPLETED;
        onCompleted();
    }

    private void compensate() {
        state = SagaState.COMPENSATING;

        // Execute compensation in reverse order
        for (int i = currentStepIndex - 1; i >= 0; i--) {
            try {
                steps.get(i).compensate(sagaData);
            } catch (Exception e) {
                System.err.println("Compensation failed for step " + i + ": " + e.getMessage());
            }
        }

        state = SagaState.COMPENSATED;
        onCompensated();
    }

    protected abstract boolean canHandleEvent(DomainEvent event);
    protected abstract void handleEvent(DomainEvent event);
    protected abstract void onCompleted();
    protected abstract void onCompensated();

    protected void setData(String key, Object value) {
        sagaData.put(key, value);
    }

    protected <T> T getData(String key, Class<T> type) {
        return type.cast(sagaData.get(key));
    }

    // Getters
    public String getSagaId() { return sagaId; }
    public SagaState getState() { return state; }

    public enum SagaState {
        STARTED, COMPLETED, COMPENSATING, COMPENSATED
    }
}

// Saga step interface
public interface SagaStep {
    void execute(Map<String, Object> sagaData) throws Exception;
    void compensate(Map<String, Object> sagaData) throws Exception;
}

// Supporting classes
public class EventEnvelope {
    private final String streamId;
    private final DomainEvent event;
    private final long version;
    private final Instant timestamp;

    public EventEnvelope(String streamId, DomainEvent event, long version) {
        this.streamId = streamId;
        this.event = event;
        this.version = version;
        this.timestamp = Instant.now();
    }

    // Getters
    public String getStreamId() { return streamId; }
    public DomainEvent getEvent() { return event; }
    public long getVersion() { return version; }
    public Instant getTimestamp() { return timestamp; }
}

public class Snapshot {
    private final String aggregateId;
    private final long version;
    private final Object data;
    private final Instant timestamp;

    public Snapshot(String aggregateId, long version, Object data) {
        this.aggregateId = aggregateId;
        this.version = version;
        this.data = data;
        this.timestamp = Instant.now();
    }

    // Getters
    public String getAggregateId() { return aggregateId; }
    public long getVersion() { return version; }
    public Object getData() { return data; }
    public Instant getTimestamp() { return timestamp; }
}

public class ConcurrencyException extends RuntimeException {
    public ConcurrencyException(String message) {
        super(message);
    }
}

// Interfaces for storage
public interface EventStore {
    long appendEvents(String streamId, List<DomainEvent> events, long expectedVersion);
    List<DomainEvent> getEvents(String streamId);
    List<DomainEvent> getEvents(String streamId, long fromVersion);
    long getCurrentVersion(String streamId);
}

public interface SnapshotStore {
    void saveSnapshot(String aggregateId, Snapshot snapshot);
    Optional<Snapshot> getSnapshot(String aggregateId);
}

public interface CheckpointManager {
    void updateCheckpoint(String projectionName, long version);
    long getCheckpoint(String projectionName);
}
```

---

## CQRS & Event Sourcing

### Command Query Responsibility Segregation Implementation

```java
public class CQRSFramework {

    private final CommandBus commandBus;
    private final QueryBus queryBus;
    private final EventStoreManager eventStoreManager;
    private final ReadModelManager readModelManager;

    public CQRSFramework(CommandBus commandBus, QueryBus queryBus,
                        EventStoreManager eventStoreManager, ReadModelManager readModelManager) {
        this.commandBus = commandBus;
        this.queryBus = queryBus;
        this.eventStoreManager = eventStoreManager;
        this.readModelManager = readModelManager;
    }

    // Command side
    public <T> CompletableFuture<T> executeCommand(Command<T> command) {
        return commandBus.send(command);
    }

    // Query side
    public <T> CompletableFuture<T> executeQuery(Query<T> query) {
        return queryBus.send(query);
    }
}

// Command Bus implementation
public class CommandBus {

    private final Map<Class<?>, CommandHandler<?>> handlers;
    private final ExecutorService executorService;
    private final List<CommandInterceptor> interceptors;

    public CommandBus() {
        this.handlers = new ConcurrentHashMap<>();
        this.executorService = Executors.newFixedThreadPool(10);
        this.interceptors = new ArrayList<>();
    }

    public <T> void registerHandler(Class<? extends Command<T>> commandType,
                                   CommandHandler<T> handler) {
        handlers.put(commandType, handler);
    }

    public void addInterceptor(CommandInterceptor interceptor) {
        interceptors.add(interceptor);
    }

    @SuppressWarnings("unchecked")
    public <T> CompletableFuture<T> send(Command<T> command) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                // Apply interceptors
                for (CommandInterceptor interceptor : interceptors) {
                    interceptor.intercept(command);
                }

                CommandHandler<T> handler = (CommandHandler<T>) handlers.get(command.getClass());
                if (handler == null) {
                    throw new IllegalArgumentException("No handler found for command: " + command.getClass());
                }

                return handler.handle(command);

            } catch (Exception e) {
                throw new RuntimeException("Command execution failed", e);
            }
        }, executorService);
    }
}

// Query Bus implementation
public class QueryBus {

    private final Map<Class<?>, QueryHandler<?>> handlers;
    private final ExecutorService executorService;
    private final CacheManager cacheManager;

    public QueryBus(CacheManager cacheManager) {
        this.handlers = new ConcurrentHashMap<>();
        this.executorService = Executors.newFixedThreadPool(20);
        this.cacheManager = cacheManager;
    }

    public <T> void registerHandler(Class<? extends Query<T>> queryType,
                                   QueryHandler<T> handler) {
        handlers.put(queryType, handler);
    }

    @SuppressWarnings("unchecked")
    public <T> CompletableFuture<T> send(Query<T> query) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                // Check cache first
                String cacheKey = generateCacheKey(query);
                T cachedResult = cacheManager.get(cacheKey, query.getResultType());
                if (cachedResult != null) {
                    return cachedResult;
                }

                QueryHandler<T> handler = (QueryHandler<T>) handlers.get(query.getClass());
                if (handler == null) {
                    throw new IllegalArgumentException("No handler found for query: " + query.getClass());
                }

                T result = handler.handle(query);

                // Cache the result
                if (query.isCacheable()) {
                    cacheManager.put(cacheKey, result, query.getCacheDuration());
                }

                return result;

            } catch (Exception e) {
                throw new RuntimeException("Query execution failed", e);
            }
        }, executorService);
    }

    private String generateCacheKey(Query<?> query) {
        return query.getClass().getSimpleName() + ":" + query.hashCode();
    }
}

// Command and Query interfaces
public interface Command<T> {
    String getCommandId();
    Instant getTimestamp();
}

public interface Query<T> {
    String getQueryId();
    Class<T> getResultType();
    boolean isCacheable();
    Duration getCacheDuration();
}

public interface CommandHandler<T> {
    T handle(Command<T> command) throws Exception;
}

public interface QueryHandler<T> {
    T handle(Query<T> query) throws Exception;
}

// Command interceptor for cross-cutting concerns
public interface CommandInterceptor {
    void intercept(Command<?> command);
}

// Validation interceptor
public class ValidationInterceptor implements CommandInterceptor {

    private final Validator validator;

    public ValidationInterceptor(Validator validator) {
        this.validator = validator;
    }

    @Override
    public void intercept(Command<?> command) {
        Set<ConstraintViolation<Object>> violations = validator.validate(command);

        if (!violations.isEmpty()) {
            List<String> errors = violations.stream()
                    .map(ConstraintViolation::getMessage)
                    .collect(Collectors.toList());

            throw new ValidationException("Command validation failed: " + String.join(", ", errors));
        }
    }
}

// Logging interceptor
public class LoggingInterceptor implements CommandInterceptor {

    @Override
    public void intercept(Command<?> command) {
        System.out.println("Executing command: " + command.getClass().getSimpleName() +
                          " with ID: " + command.getCommandId());
    }
}

// Example: User domain implementation
public class CreateUserCommand implements Command<String> {

    private final String commandId;
    private final Instant timestamp;
    private final String email;
    private final String firstName;
    private final String lastName;

    public CreateUserCommand(String email, String firstName, String lastName) {
        this.commandId = UUID.randomUUID().toString();
        this.timestamp = Instant.now();
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
    }

    @Override
    public String getCommandId() { return commandId; }

    @Override
    public Instant getTimestamp() { return timestamp; }

    // Getters
    public String getEmail() { return email; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
}

public class CreateUserCommandHandler implements CommandHandler<String> {

    private final EventStoreManager eventStoreManager;
    private final UserRepository userRepository;

    public CreateUserCommandHandler(EventStoreManager eventStoreManager, UserRepository userRepository) {
        this.eventStoreManager = eventStoreManager;
        this.userRepository = userRepository;
    }

    @Override
    public String handle(Command<String> command) throws Exception {
        CreateUserCommand createCommand = (CreateUserCommand) command;

        // Check if user already exists
        if (userRepository.existsByEmail(createCommand.getEmail())) {
            throw new DuplicateUserException("User with email " + createCommand.getEmail() + " already exists");
        }

        // Create aggregate
        String userId = UUID.randomUUID().toString();
        UserAggregate user = new UserAggregate(userId);

        user.createUser(createCommand.getEmail(), createCommand.getFirstName(), createCommand.getLastName());

        // Save aggregate
        eventStoreManager.saveAggregate(user).join();

        return userId;
    }
}

public class GetUserQuery implements Query<UserDto> {

    private final String queryId;
    private final String userId;

    public GetUserQuery(String userId) {
        this.queryId = UUID.randomUUID().toString();
        this.userId = userId;
    }

    @Override
    public String getQueryId() { return queryId; }

    @Override
    public Class<UserDto> getResultType() { return UserDto.class; }

    @Override
    public boolean isCacheable() { return true; }

    @Override
    public Duration getCacheDuration() { return Duration.ofMinutes(5); }

    public String getUserId() { return userId; }
}

public class GetUserQueryHandler implements QueryHandler<UserDto> {

    private final UserReadModelRepository readModelRepository;

    public GetUserQueryHandler(UserReadModelRepository readModelRepository) {
        this.readModelRepository = readModelRepository;
    }

    @Override
    public UserDto handle(Query<UserDto> query) throws Exception {
        GetUserQuery getUserQuery = (GetUserQuery) query;

        Optional<UserReadModel> readModel = readModelRepository.findById(getUserQuery.getUserId());

        if (readModel.isPresent()) {
            UserReadModel user = readModel.get();
            return new UserDto(user.getId(), user.getEmail(), user.getFirstName(),
                             user.getLastName(), user.getCreatedAt());
        } else {
            throw new UserNotFoundException("User not found: " + getUserQuery.getUserId());
        }
    }
}

// User Aggregate
public class UserAggregate extends AggregateRoot {

    private String email;
    private String firstName;
    private String lastName;
    private Instant createdAt;
    private boolean deleted;

    public UserAggregate(String id) {
        super(id);
    }

    public void createUser(String email, String firstName, String lastName) {
        if (this.email != null) {
            throw new IllegalStateException("User already created");
        }

        applyEvent(new UserCreatedEvent(getId(), email, firstName, lastName));
    }

    public void updateUser(String firstName, String lastName) {
        if (deleted) {
            throw new IllegalStateException("Cannot update deleted user");
        }

        applyEvent(new UserUpdatedEvent(getId(), firstName, lastName));
    }

    public void deleteUser() {
        if (deleted) {
            throw new IllegalStateException("User already deleted");
        }

        applyEvent(new UserDeletedEvent(getId()));
    }

    @Override
    protected void apply(DomainEvent event) {
        if (event instanceof UserCreatedEvent) {
            apply((UserCreatedEvent) event);
        } else if (event instanceof UserUpdatedEvent) {
            apply((UserUpdatedEvent) event);
        } else if (event instanceof UserDeletedEvent) {
            apply((UserDeletedEvent) event);
        }
    }

    private void apply(UserCreatedEvent event) {
        this.email = event.getEmail();
        this.firstName = event.getFirstName();
        this.lastName = event.getLastName();
        this.createdAt = event.getTimestamp();
    }

    private void apply(UserUpdatedEvent event) {
        this.firstName = event.getFirstName();
        this.lastName = event.getLastName();
    }

    private void apply(UserDeletedEvent event) {
        this.deleted = true;
    }

    @Override
    protected void restoreFromSnapshot(Snapshot snapshot) {
        UserSnapshot userSnapshot = (UserSnapshot) snapshot.getData();
        this.email = userSnapshot.getEmail();
        this.firstName = userSnapshot.getFirstName();
        this.lastName = userSnapshot.getLastName();
        this.createdAt = userSnapshot.getCreatedAt();
        this.deleted = userSnapshot.isDeleted();
    }

    @Override
    public Snapshot createSnapshot() {
        UserSnapshot userSnapshot = new UserSnapshot(email, firstName, lastName, createdAt, deleted);
        return new Snapshot(getId(), getVersion(), userSnapshot);
    }

    // Getters
    public String getEmail() { return email; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public Instant getCreatedAt() { return createdAt; }
    public boolean isDeleted() { return deleted; }
}

// Domain Events
public class UserCreatedEvent extends DomainEvent {
    private final String userId;
    private final String email;
    private final String firstName;
    private final String lastName;

    public UserCreatedEvent(String userId, String email, String firstName, String lastName) {
        super();
        this.userId = userId;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
    }

    @Override
    public Object getPayload() {
        return Map.of(
            "userId", userId,
            "email", email,
            "firstName", firstName,
            "lastName", lastName
        );
    }

    // Getters
    public String getUserId() { return userId; }
    public String getEmail() { return email; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
}

public class UserUpdatedEvent extends DomainEvent {
    private final String userId;
    private final String firstName;
    private final String lastName;

    public UserUpdatedEvent(String userId, String firstName, String lastName) {
        super();
        this.userId = userId;
        this.firstName = firstName;
        this.lastName = lastName;
    }

    @Override
    public Object getPayload() {
        return Map.of(
            "userId", userId,
            "firstName", firstName,
            "lastName", lastName
        );
    }

    // Getters
    public String getUserId() { return userId; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
}

public class UserDeletedEvent extends DomainEvent {
    private final String userId;

    public UserDeletedEvent(String userId) {
        super();
        this.userId = userId;
    }

    @Override
    public Object getPayload() {
        return Map.of("userId", userId);
    }

    public String getUserId() { return userId; }
}

// Snapshot data
public class UserSnapshot {
    private final String email;
    private final String firstName;
    private final String lastName;
    private final Instant createdAt;
    private final boolean deleted;

    public UserSnapshot(String email, String firstName, String lastName,
                       Instant createdAt, boolean deleted) {
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.createdAt = createdAt;
        this.deleted = deleted;
    }

    // Getters
    public String getEmail() { return email; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public Instant getCreatedAt() { return createdAt; }
    public boolean isDeleted() { return deleted; }
}

// Exceptions
public class DuplicateUserException extends RuntimeException {
    public DuplicateUserException(String message) {
        super(message);
    }
}

public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(String message) {
        super(message);
    }
}

public class ValidationException extends RuntimeException {
    public ValidationException(String message) {
        super(message);
    }
}
```

---

## Observability & Monitoring

### Distributed Tracing and Metrics

```java
public class ObservabilityManager {

    private final TracingManager tracingManager;
    private final MetricsManager metricsManager;
    private final LoggingManager loggingManager;

    public ObservabilityManager(TracingManager tracingManager, MetricsManager metricsManager,
                              LoggingManager loggingManager) {
        this.tracingManager = tracingManager;
        this.metricsManager = metricsManager;
        this.loggingManager = loggingManager;
    }

    // Distributed tracing implementation
    public static class TracingManager {

        private final ThreadLocal<TraceContext> currentTrace = new ThreadLocal<>();
        private final TraceExporter traceExporter;

        public TracingManager(TraceExporter traceExporter) {
            this.traceExporter = traceExporter;
        }

        public TraceContext startTrace(String operationName) {
            String traceId = generateTraceId();
            String spanId = generateSpanId();

            TraceContext context = new TraceContext(traceId, spanId, operationName, Instant.now());
            currentTrace.set(context);

            return context;
        }

        public TraceContext startChildSpan(String operationName) {
            TraceContext parentContext = currentTrace.get();
            if (parentContext == null) {
                return startTrace(operationName);
            }

            String spanId = generateSpanId();
            TraceContext childContext = new TraceContext(
                parentContext.getTraceId(), spanId, operationName, Instant.now());
            childContext.setParentSpanId(parentContext.getSpanId());

            currentTrace.set(childContext);
            return childContext;
        }

        public void endSpan() {
            TraceContext context = currentTrace.get();
            if (context != null) {
                context.setEndTime(Instant.now());

                // Export trace
                traceExporter.export(context);

                // Restore parent context if exists
                if (context.getParentSpanId() != null) {
                    // In a real implementation, you'd maintain a stack of contexts
                    currentTrace.remove();
                } else {
                    currentTrace.remove();
                }
            }
        }

        public void addTag(String key, String value) {
            TraceContext context = currentTrace.get();
            if (context != null) {
                context.addTag(key, value);
            }
        }

        public void addLog(String message) {
            TraceContext context = currentTrace.get();
            if (context != null) {
                context.addLog(Instant.now(), message);
            }
        }

        public void addError(Exception error) {
            TraceContext context = currentTrace.get();
            if (context != null) {
                context.setError(true);
                context.addTag("error.message", error.getMessage());
                context.addTag("error.class", error.getClass().getSimpleName());
            }
        }

        public TraceContext getCurrentTrace() {
            return currentTrace.get();
        }

        private String generateTraceId() {
            return UUID.randomUUID().toString().replace("-", "");
        }

        private String generateSpanId() {
            return UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        }
    }

    // Metrics collection and aggregation
    public static class MetricsManager {

        private final Map<String, Counter> counters = new ConcurrentHashMap<>();
        private final Map<String, Gauge> gauges = new ConcurrentHashMap<>();
        private final Map<String, Histogram> histograms = new ConcurrentHashMap<>();
        private final ScheduledExecutorService metricsExporter;
        private final MetricsStore metricsStore;

        public MetricsManager(MetricsStore metricsStore) {
            this.metricsStore = metricsStore;
            this.metricsExporter = Executors.newScheduledThreadPool(1);

            // Export metrics every 60 seconds
            metricsExporter.scheduleAtFixedRate(this::exportMetrics, 0, 60, TimeUnit.SECONDS);
        }

        public void incrementCounter(String name, String... tags) {
            String key = buildMetricKey(name, tags);
            counters.computeIfAbsent(key, k -> new Counter(name, tags)).increment();
        }

        public void setGauge(String name, double value, String... tags) {
            String key = buildMetricKey(name, tags);
            gauges.computeIfAbsent(key, k -> new Gauge(name, tags)).setValue(value);
        }

        public void recordHistogram(String name, double value, String... tags) {
            String key = buildMetricKey(name, tags);
            histograms.computeIfAbsent(key, k -> new Histogram(name, tags)).record(value);
        }

        public void recordTimer(String name, Duration duration, String... tags) {
            recordHistogram(name + ".duration", duration.toMillis(), tags);
        }

        public Timer startTimer(String name, String... tags) {
            return new Timer(this, name, tags);
        }

        private String buildMetricKey(String name, String... tags) {
            if (tags.length == 0) {
                return name;
            }

            return name + ":" + String.join(":", tags);
        }

        private void exportMetrics() {
            try {
                MetricsSnapshot snapshot = new MetricsSnapshot(
                    new HashMap<>(counters),
                    new HashMap<>(gauges),
                    new HashMap<>(histograms),
                    Instant.now()
                );

                metricsStore.store(snapshot);

            } catch (Exception e) {
                System.err.println("Failed to export metrics: " + e.getMessage());
            }
        }

        public MetricsSnapshot getCurrentSnapshot() {
            return new MetricsSnapshot(
                new HashMap<>(counters),
                new HashMap<>(gauges),
                new HashMap<>(histograms),
                Instant.now()
            );
        }
    }

    // Structured logging implementation
    public static class LoggingManager {

        private final LogAppender logAppender;
        private final String serviceName;
        private final String serviceVersion;

        public LoggingManager(LogAppender logAppender, String serviceName, String serviceVersion) {
            this.logAppender = logAppender;
            this.serviceName = serviceName;
            this.serviceVersion = serviceVersion;
        }

        public void info(String message, Map<String, Object> context) {
            log(LogLevel.INFO, message, context, null);
        }

        public void warn(String message, Map<String, Object> context) {
            log(LogLevel.WARN, message, context, null);
        }

        public void error(String message, Map<String, Object> context, Exception error) {
            log(LogLevel.ERROR, message, context, error);
        }

        private void log(LogLevel level, String message, Map<String, Object> context, Exception error) {
            LogEntry logEntry = LogEntry.builder()
                    .timestamp(Instant.now())
                    .level(level)
                    .message(message)
                    .serviceName(serviceName)
                    .serviceVersion(serviceVersion)
                    .context(context != null ? context : Collections.emptyMap())
                    .error(error)
                    .build();

            // Add trace context if available
            TraceContext traceContext = getCurrentTraceContext();
            if (traceContext != null) {
                logEntry.setTraceId(traceContext.getTraceId());
                logEntry.setSpanId(traceContext.getSpanId());
            }

            logAppender.append(logEntry);
        }

        private TraceContext getCurrentTraceContext() {
            // In a real implementation, this would integrate with the tracing manager
            return null;
        }
    }

    // Health check aggregator
    public static class HealthCheckManager {

        private final Map<String, HealthCheck> healthChecks = new ConcurrentHashMap<>();
        private final ScheduledExecutorService healthCheckExecutor;
        private final Map<String, HealthStatus> lastResults = new ConcurrentHashMap<>();

        public HealthCheckManager() {
            this.healthCheckExecutor = Executors.newScheduledThreadPool(5);

            // Run health checks every 30 seconds
            healthCheckExecutor.scheduleAtFixedRate(this::runHealthChecks, 0, 30, TimeUnit.SECONDS);
        }

        public void registerHealthCheck(String name, HealthCheck healthCheck) {
            healthChecks.put(name, healthCheck);
        }

        public void unregisterHealthCheck(String name) {
            healthChecks.remove(name);
            lastResults.remove(name);
        }

        public OverallHealthStatus getOverallHealth() {
            Map<String, HealthStatus> currentResults = new HashMap<>(lastResults);

            boolean allHealthy = currentResults.values().stream()
                    .allMatch(status -> status.getStatus() == HealthStatus.Status.UP);

            OverallHealthStatus.Status overallStatus = allHealthy ?
                    OverallHealthStatus.Status.UP : OverallHealthStatus.Status.DOWN;

            return new OverallHealthStatus(overallStatus, currentResults, Instant.now());
        }

        private void runHealthChecks() {
            healthChecks.forEach((name, healthCheck) -> {
                CompletableFuture.runAsync(() -> {
                    try {
                        HealthStatus status = healthCheck.check();
                        lastResults.put(name, status);
                    } catch (Exception e) {
                        HealthStatus errorStatus = new HealthStatus(
                            HealthStatus.Status.DOWN,
                            "Health check failed: " + e.getMessage(),
                            Collections.emptyMap(),
                            Instant.now()
                        );
                        lastResults.put(name, errorStatus);
                    }
                }, healthCheckExecutor);
            });
        }
    }

    // Supporting classes
    public static class TraceContext {
        private final String traceId;
        private final String spanId;
        private final String operationName;
        private final Instant startTime;
        private final Map<String, String> tags;
        private final List<LogEntry> logs;

        private String parentSpanId;
        private Instant endTime;
        private boolean error;

        public TraceContext(String traceId, String spanId, String operationName, Instant startTime) {
            this.traceId = traceId;
            this.spanId = spanId;
            this.operationName = operationName;
            this.startTime = startTime;
            this.tags = new ConcurrentHashMap<>();
            this.logs = new CopyOnWriteArrayList<>();
        }

        public void addTag(String key, String value) {
            tags.put(key, value);
        }

        public void addLog(Instant timestamp, String message) {
            LogEntry logEntry = LogEntry.builder()
                    .timestamp(timestamp)
                    .level(LogLevel.INFO)
                    .message(message)
                    .traceId(traceId)
                    .spanId(spanId)
                    .build();
            logs.add(logEntry);
        }

        // Getters and setters
        public String getTraceId() { return traceId; }
        public String getSpanId() { return spanId; }
        public String getOperationName() { return operationName; }
        public Instant getStartTime() { return startTime; }
        public Map<String, String> getTags() { return tags; }
        public List<LogEntry> getLogs() { return logs; }
        public String getParentSpanId() { return parentSpanId; }
        public void setParentSpanId(String parentSpanId) { this.parentSpanId = parentSpanId; }
        public Instant getEndTime() { return endTime; }
        public void setEndTime(Instant endTime) { this.endTime = endTime; }
        public boolean isError() { return error; }
        public void setError(boolean error) { this.error = error; }
    }

    public static class Timer implements AutoCloseable {
        private final MetricsManager metricsManager;
        private final String name;
        private final String[] tags;
        private final Instant startTime;

        public Timer(MetricsManager metricsManager, String name, String... tags) {
            this.metricsManager = metricsManager;
            this.name = name;
            this.tags = tags;
            this.startTime = Instant.now();
        }

        @Override
        public void close() {
            Duration duration = Duration.between(startTime, Instant.now());
            metricsManager.recordTimer(name, duration, tags);
        }
    }

    // Metric classes
    public static class Counter {
        private final String name;
        private final String[] tags;
        private final AtomicLong value = new AtomicLong(0);

        public Counter(String name, String... tags) {
            this.name = name;
            this.tags = tags;
        }

        public void increment() {
            value.incrementAndGet();
        }

        public void increment(long delta) {
            value.addAndGet(delta);
        }

        public long getValue() {
            return value.get();
        }

        // Getters
        public String getName() { return name; }
        public String[] getTags() { return tags; }
    }

    public static class Gauge {
        private final String name;
        private final String[] tags;
        private volatile double value;

        public Gauge(String name, String... tags) {
            this.name = name;
            this.tags = tags;
        }

        public void setValue(double value) {
            this.value = value;
        }

        public double getValue() {
            return value;
        }

        // Getters
        public String getName() { return name; }
        public String[] getTags() { return tags; }
    }

    public static class Histogram {
        private final String name;
        private final String[] tags;
        private final List<Double> values = new CopyOnWriteArrayList<>();

        public Histogram(String name, String... tags) {
            this.name = name;
            this.tags = tags;
        }

        public void record(double value) {
            values.add(value);

            // Keep only last 1000 values
            if (values.size() > 1000) {
                values.subList(0, values.size() - 1000).clear();
            }
        }

        public double getPercentile(double percentile) {
            if (values.isEmpty()) return 0.0;

            List<Double> sorted = new ArrayList<>(values);
            sorted.sort(Double::compareTo);

            int index = (int) Math.ceil(percentile / 100.0 * sorted.size()) - 1;
            return sorted.get(Math.max(0, Math.min(index, sorted.size() - 1)));
        }

        public double getAverage() {
            return values.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        }

        // Getters
        public String getName() { return name; }
        public String[] getTags() { return tags; }
        public List<Double> getValues() { return new ArrayList<>(values); }
    }

    // Interfaces
    public interface TraceExporter {
        void export(TraceContext context);
    }

    public interface MetricsStore {
        void store(MetricsSnapshot snapshot);
    }

    public interface LogAppender {
        void append(LogEntry logEntry);
    }

    public interface HealthCheck {
        HealthStatus check();
    }

    // Data classes
    public static class MetricsSnapshot {
        private final Map<String, Counter> counters;
        private final Map<String, Gauge> gauges;
        private final Map<String, Histogram> histograms;
        private final Instant timestamp;

        public MetricsSnapshot(Map<String, Counter> counters, Map<String, Gauge> gauges,
                             Map<String, Histogram> histograms, Instant timestamp) {
            this.counters = counters;
            this.gauges = gauges;
            this.histograms = histograms;
            this.timestamp = timestamp;
        }

        // Getters
        public Map<String, Counter> getCounters() { return counters; }
        public Map<String, Gauge> getGauges() { return gauges; }
        public Map<String, Histogram> getHistograms() { return histograms; }
        public Instant getTimestamp() { return timestamp; }
    }

    public static class LogEntry {
        private Instant timestamp;
        private LogLevel level;
        private String message;
        private String serviceName;
        private String serviceVersion;
        private Map<String, Object> context;
        private Exception error;
        private String traceId;
        private String spanId;

        private LogEntry() {}

        public static LogEntryBuilder builder() {
            return new LogEntryBuilder();
        }

        // Getters and setters
        public Instant getTimestamp() { return timestamp; }
        public LogLevel getLevel() { return level; }
        public String getMessage() { return message; }
        public String getServiceName() { return serviceName; }
        public String getServiceVersion() { return serviceVersion; }
        public Map<String, Object> getContext() { return context; }
        public Exception getError() { return error; }
        public String getTraceId() { return traceId; }
        public void setTraceId(String traceId) { this.traceId = traceId; }
        public String getSpanId() { return spanId; }
        public void setSpanId(String spanId) { this.spanId = spanId; }

        public static class LogEntryBuilder {
            private final LogEntry logEntry = new LogEntry();

            public LogEntryBuilder timestamp(Instant timestamp) {
                logEntry.timestamp = timestamp;
                return this;
            }

            public LogEntryBuilder level(LogLevel level) {
                logEntry.level = level;
                return this;
            }

            public LogEntryBuilder message(String message) {
                logEntry.message = message;
                return this;
            }

            public LogEntryBuilder serviceName(String serviceName) {
                logEntry.serviceName = serviceName;
                return this;
            }

            public LogEntryBuilder serviceVersion(String serviceVersion) {
                logEntry.serviceVersion = serviceVersion;
                return this;
            }

            public LogEntryBuilder context(Map<String, Object> context) {
                logEntry.context = context;
                return this;
            }

            public LogEntryBuilder error(Exception error) {
                logEntry.error = error;
                return this;
            }

            public LogEntryBuilder traceId(String traceId) {
                logEntry.traceId = traceId;
                return this;
            }

            public LogEntryBuilder spanId(String spanId) {
                logEntry.spanId = spanId;
                return this;
            }

            public LogEntry build() {
                return logEntry;
            }
        }
    }

    public enum LogLevel {
        DEBUG, INFO, WARN, ERROR
    }

    public static class HealthStatus {
        private final Status status;
        private final String message;
        private final Map<String, Object> details;
        private final Instant timestamp;

        public HealthStatus(Status status, String message, Map<String, Object> details, Instant timestamp) {
            this.status = status;
            this.message = message;
            this.details = details;
            this.timestamp = timestamp;
        }

        public enum Status {
            UP, DOWN
        }

        // Getters
        public Status getStatus() { return status; }
        public String getMessage() { return message; }
        public Map<String, Object> getDetails() { return details; }
        public Instant getTimestamp() { return timestamp; }
    }

    public static class OverallHealthStatus {
        private final Status status;
        private final Map<String, HealthStatus> componentStatuses;
        private final Instant timestamp;

        public OverallHealthStatus(Status status, Map<String, HealthStatus> componentStatuses, Instant timestamp) {
            this.status = status;
            this.componentStatuses = componentStatuses;
            this.timestamp = timestamp;
        }

        public enum Status {
            UP, DOWN
        }

        // Getters
        public Status getStatus() { return status; }
        public Map<String, HealthStatus> getComponentStatuses() { return componentStatuses; }
        public Instant getTimestamp() { return timestamp; }
    }
}
```

**📊 Architecture Pattern Comparison:**

| Pattern           | Scalability | Complexity | Consistency  | Use Case                     |
| ----------------- | ----------- | ---------- | ------------ | ---------------------------- |
| **Monolith**      | Limited     | Low        | Strong       | Simple applications          |
| **Microservices** | High        | High       | Eventual     | Complex, distributed systems |
| **Event-Driven**  | Very High   | Medium     | Eventual     | Real-time, reactive systems  |
| **CQRS**          | High        | High       | Configurable | Complex read/write patterns  |

---

## Summary & Best Practices

### 🎯 Key Takeaways

✅ **Design for Distribution**: Use service discovery, circuit breakers, and distributed tracing  
✅ **Embrace Event-Driven**: Decouple services with events, implement sagas for long transactions  
✅ **Separate Read/Write**: Use CQRS for complex domains, event sourcing for audit trails  
✅ **Monitor Everything**: Implement distributed tracing, metrics, and structured logging  
✅ **Plan for Failure**: Circuit breakers, health checks, graceful degradation

### 📈 Architecture Design Checklist

- [ ] Defined service boundaries and responsibilities
- [ ] Implemented service discovery and load balancing
- [ ] Added circuit breakers and retry mechanisms
- [ ] Set up distributed tracing and monitoring
- [ ] Designed event-driven communication
- [ ] Implemented health checks and observability
- [ ] Planned for data consistency and transaction management
- [ ] Added security and authentication

### ⚠️ Common Architecture Pitfalls

- **Distributed monolith**: Tight coupling between microservices
- **Data inconsistency**: Not handling eventual consistency properly
- **Cascading failures**: No circuit breakers or bulkheads
- **Poor observability**: Can't debug distributed systems
- **Over-engineering**: Using complex patterns when simple solutions work

**📈 Final Thoughts:**
You've now mastered the complete system design interview preparation! From scalability fundamentals to advanced architecture patterns, you have comprehensive knowledge of distributed systems design with practical Java implementations.

---

_💡 Pro Tip: Start simple and evolve your architecture. Focus on business requirements first, then add complexity as needed. Always design for failure and monitor everything. The best architecture is one that solves real problems efficiently and can grow with your business needs._
