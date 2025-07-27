# Message Queues & Event Streaming 📨

Master asynchronous messaging, event-driven architectures, and stream processing with practical Java implementations for system design interviews.

## Table of Contents

- [Message Queue Patterns](#message-queue-patterns)
- [Event-Driven Architecture](#event-driven-architecture)
- [Stream Processing](#stream-processing)
- [Message Ordering & Delivery Guarantees](#message-ordering--delivery-guarantees)
- [Backpressure & Flow Control](#backpressure--flow-control)
- [Event Sourcing Implementation](#event-sourcing-implementation)

---

## Message Queue Patterns

### Producer-Consumer with Dead Letter Queue

```java
public class MessageQueueManager {

    private final BlockingQueue<Message> mainQueue;
    private final BlockingQueue<Message> deadLetterQueue;
    private final ExecutorService consumerPool;
    private final RetryPolicy retryPolicy;
    private final MessageProcessor processor;
    private final AtomicBoolean isRunning;

    public MessageQueueManager(int queueCapacity, int consumerThreads,
                             MessageProcessor processor, RetryPolicy retryPolicy) {
        this.mainQueue = new LinkedBlockingQueue<>(queueCapacity);
        this.deadLetterQueue = new LinkedBlockingQueue<>();
        this.consumerPool = Executors.newFixedThreadPool(consumerThreads);
        this.processor = processor;
        this.retryPolicy = retryPolicy;
        this.isRunning = new AtomicBoolean(false);
    }

    public void start() {
        if (isRunning.compareAndSet(false, true)) {
            // Start consumer threads
            for (int i = 0; i < ((ThreadPoolExecutor) consumerPool).getCorePoolSize(); i++) {
                consumerPool.submit(new MessageConsumer());
            }

            // Start DLQ processor
            consumerPool.submit(new DeadLetterQueueProcessor());
        }
    }

    public boolean publishMessage(Message message) {
        try {
            return mainQueue.offer(message, 5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    public CompletableFuture<Boolean> publishMessageAsync(Message message) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return mainQueue.offer(message, 10, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return false;
            }
        });
    }

    private class MessageConsumer implements Runnable {
        @Override
        public void run() {
            while (isRunning.get() || !mainQueue.isEmpty()) {
                try {
                    Message message = mainQueue.poll(1, TimeUnit.SECONDS);
                    if (message != null) {
                        processMessageWithRetry(message);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                } catch (Exception e) {
                    System.err.println("Consumer error: " + e.getMessage());
                }
            }
        }

        private void processMessageWithRetry(Message message) {
            int attempts = 0;
            Exception lastException = null;

            while (attempts < retryPolicy.getMaxRetries()) {
                try {
                    processor.process(message);
                    return; // Success
                } catch (Exception e) {
                    lastException = e;
                    attempts++;

                    if (attempts < retryPolicy.getMaxRetries()) {
                        try {
                            long backoffMs = retryPolicy.calculateBackoff(attempts);
                            Thread.sleep(backoffMs);
                        } catch (InterruptedException ie) {
                            Thread.currentThread().interrupt();
                            break;
                        }
                    }
                }
            }

            // All retries exhausted, send to DLQ
            message.setFailureReason(lastException.getMessage());
            message.setRetryCount(attempts);
            deadLetterQueue.offer(message);
        }
    }

    private class DeadLetterQueueProcessor implements Runnable {
        @Override
        public void run() {
            while (isRunning.get() || !deadLetterQueue.isEmpty()) {
                try {
                    Message deadMessage = deadLetterQueue.poll(5, TimeUnit.SECONDS);
                    if (deadMessage != null) {
                        handleDeadLetterMessage(deadMessage);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }

        private void handleDeadLetterMessage(Message message) {
            // Log to monitoring system
            System.err.println("Message sent to DLQ: " + message.getId() +
                             " Reason: " + message.getFailureReason());

            // Store in persistent storage for manual review
            persistDeadLetterMessage(message);

            // Send alert if too many messages in DLQ
            if (deadLetterQueue.size() > 100) {
                sendDLQAlert();
            }
        }
    }

    // Priority queue implementation
    public static class PriorityMessageQueue {
        private final PriorityBlockingQueue<PriorityMessage> queue;

        public PriorityMessageQueue() {
            this.queue = new PriorityBlockingQueue<>(1000,
                Comparator.comparing(PriorityMessage::getPriority).reversed()
                          .thenComparing(PriorityMessage::getTimestamp));
        }

        public void publish(Message message, Priority priority) {
            PriorityMessage priorityMessage = new PriorityMessage(message, priority);
            queue.offer(priorityMessage);
        }

        public PriorityMessage consume() throws InterruptedException {
            return queue.take();
        }

        public enum Priority {
            CRITICAL(1), HIGH(2), MEDIUM(3), LOW(4);

            private final int value;
            Priority(int value) { this.value = value; }
            public int getValue() { return value; }
        }

        public static class PriorityMessage {
            private final Message message;
            private final Priority priority;
            private final Instant timestamp;

            public PriorityMessage(Message message, Priority priority) {
                this.message = message;
                this.priority = priority;
                this.timestamp = Instant.now();
            }

            // Getters
            public Message getMessage() { return message; }
            public Priority getPriority() { return priority; }
            public Instant getTimestamp() { return timestamp; }
        }
    }

    public void shutdown() {
        isRunning.set(false);
        consumerPool.shutdown();
        try {
            if (!consumerPool.awaitTermination(30, TimeUnit.SECONDS)) {
                consumerPool.shutdownNow();
            }
        } catch (InterruptedException e) {
            consumerPool.shutdownNow();
        }
    }

    // Supporting classes
    public static class Message {
        private final String id;
        private final String payload;
        private final Instant timestamp;
        private String failureReason;
        private int retryCount;

        public Message(String id, String payload) {
            this.id = id;
            this.payload = payload;
            this.timestamp = Instant.now();
            this.retryCount = 0;
        }

        // Getters and setters
        public String getId() { return id; }
        public String getPayload() { return payload; }
        public Instant getTimestamp() { return timestamp; }
        public String getFailureReason() { return failureReason; }
        public void setFailureReason(String failureReason) { this.failureReason = failureReason; }
        public int getRetryCount() { return retryCount; }
        public void setRetryCount(int retryCount) { this.retryCount = retryCount; }
    }

    public static class RetryPolicy {
        private final int maxRetries;
        private final long initialBackoffMs;
        private final double backoffMultiplier;
        private final long maxBackoffMs;

        public RetryPolicy(int maxRetries, long initialBackoffMs,
                         double backoffMultiplier, long maxBackoffMs) {
            this.maxRetries = maxRetries;
            this.initialBackoffMs = initialBackoffMs;
            this.backoffMultiplier = backoffMultiplier;
            this.maxBackoffMs = maxBackoffMs;
        }

        public long calculateBackoff(int attempt) {
            long backoff = (long) (initialBackoffMs * Math.pow(backoffMultiplier, attempt - 1));
            return Math.min(backoff, maxBackoffMs);
        }

        // Getters
        public int getMaxRetries() { return maxRetries; }
    }

    public interface MessageProcessor {
        void process(Message message) throws Exception;
    }

    private void persistDeadLetterMessage(Message message) {
        // Implementation for storing DLQ messages
    }

    private void sendDLQAlert() {
        // Implementation for alerting on high DLQ volume
    }
}
```

---

## Event-Driven Architecture

### Event Bus with Topic Subscriptions

```java
public class EventBusManager {

    private final Map<String, Set<EventHandler>> topicSubscriptions;
    private final ExecutorService eventProcessorPool;
    private final BlockingQueue<EventEnvelope> eventQueue;
    private final EventStore eventStore;
    private final boolean persistEvents;

    public EventBusManager(int threadPoolSize, boolean persistEvents, EventStore eventStore) {
        this.topicSubscriptions = new ConcurrentHashMap<>();
        this.eventProcessorPool = Executors.newFixedThreadPool(threadPoolSize);
        this.eventQueue = new LinkedBlockingQueue<>();
        this.eventStore = eventStore;
        this.persistEvents = persistEvents;

        // Start event processing
        startEventProcessor();
    }

    public void subscribe(String topic, EventHandler handler) {
        topicSubscriptions.computeIfAbsent(topic, k -> ConcurrentHashMap.newKeySet())
                         .add(handler);
    }

    public void unsubscribe(String topic, EventHandler handler) {
        Set<EventHandler> handlers = topicSubscriptions.get(topic);
        if (handlers != null) {
            handlers.remove(handler);
            if (handlers.isEmpty()) {
                topicSubscriptions.remove(topic);
            }
        }
    }

    public CompletableFuture<Void> publishEvent(Event event) {
        EventEnvelope envelope = new EventEnvelope(event, Instant.now());

        return CompletableFuture.runAsync(() -> {
            try {
                // Persist event if enabled
                if (persistEvents) {
                    eventStore.store(envelope);
                }

                // Add to processing queue
                eventQueue.offer(envelope);

            } catch (Exception e) {
                throw new RuntimeException("Failed to publish event", e);
            }
        });
    }

    private void startEventProcessor() {
        for (int i = 0; i < ((ThreadPoolExecutor) eventProcessorPool).getCorePoolSize(); i++) {
            eventProcessorPool.submit(() -> {
                while (!Thread.currentThread().isInterrupted()) {
                    try {
                        EventEnvelope envelope = eventQueue.take();
                        processEvent(envelope);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    } catch (Exception e) {
                        System.err.println("Event processing error: " + e.getMessage());
                    }
                }
            });
        }
    }

    private void processEvent(EventEnvelope envelope) {
        Event event = envelope.getEvent();
        String topic = event.getEventType();

        Set<EventHandler> handlers = topicSubscriptions.get(topic);
        if (handlers != null && !handlers.isEmpty()) {

            List<CompletableFuture<Void>> handlerFutures = handlers.stream()
                .map(handler -> CompletableFuture.runAsync(() -> {
                    try {
                        handler.handle(event);
                    } catch (Exception e) {
                        handleEventProcessingError(event, handler, e);
                    }
                }, eventProcessorPool))
                .collect(Collectors.toList());

            // Wait for all handlers to complete (with timeout)
            CompletableFuture<Void> allHandlers = CompletableFuture.allOf(
                handlerFutures.toArray(new CompletableFuture[0]));

            try {
                allHandlers.get(30, TimeUnit.SECONDS);
            } catch (Exception e) {
                System.err.println("Event processing timeout for: " + event.getEventId());
            }
        }
    }

    private void handleEventProcessingError(Event event, EventHandler handler, Exception error) {
        System.err.println("Handler " + handler.getClass().getSimpleName() +
                          " failed to process event " + event.getEventId() + ": " + error.getMessage());

        // Could implement retry logic, DLQ, or circuit breaker here
    }

    // Saga pattern implementation for distributed transactions
    public class SagaOrchestrator {
        private final Map<String, SagaInstance> activeSagas;

        public SagaOrchestrator() {
            this.activeSagas = new ConcurrentHashMap<>();
        }

        public void startSaga(String sagaId, List<SagaStep> steps) {
            SagaInstance saga = new SagaInstance(sagaId, steps);
            activeSagas.put(sagaId, saga);

            // Start first step
            executeNextStep(saga);
        }

        @EventHandler
        public void handleStepCompleted(StepCompletedEvent event) {
            SagaInstance saga = activeSagas.get(event.getSagaId());
            if (saga != null) {
                saga.markStepCompleted(event.getStepId());

                if (saga.hasMoreSteps()) {
                    executeNextStep(saga);
                } else {
                    // Saga completed successfully
                    activeSagas.remove(saga.getSagaId());
                    publishEvent(new SagaCompletedEvent(saga.getSagaId()));
                }
            }
        }

        @EventHandler
        public void handleStepFailed(StepFailedEvent event) {
            SagaInstance saga = activeSagas.get(event.getSagaId());
            if (saga != null) {
                // Start compensation (rollback)
                compensateSaga(saga);
            }
        }

        private void executeNextStep(SagaInstance saga) {
            SagaStep nextStep = saga.getNextStep();
            if (nextStep != null) {
                CompletableFuture.runAsync(() -> {
                    try {
                        nextStep.execute();
                        publishEvent(new StepCompletedEvent(saga.getSagaId(), nextStep.getStepId()));
                    } catch (Exception e) {
                        publishEvent(new StepFailedEvent(saga.getSagaId(), nextStep.getStepId(), e.getMessage()));
                    }
                });
            }
        }

        private void compensateSaga(SagaInstance saga) {
            List<SagaStep> completedSteps = saga.getCompletedSteps();

            // Execute compensation actions in reverse order
            for (int i = completedSteps.size() - 1; i >= 0; i--) {
                SagaStep step = completedSteps.get(i);
                CompletableFuture.runAsync(() -> {
                    try {
                        step.compensate();
                    } catch (Exception e) {
                        System.err.println("Compensation failed for step: " + step.getStepId());
                    }
                });
            }

            activeSagas.remove(saga.getSagaId());
            publishEvent(new SagaCompensatedEvent(saga.getSagaId()));
        }
    }

    // Event sourcing support
    public class EventSourcedEntity {
        private final String entityId;
        private final List<Event> uncommittedEvents;
        private int version;

        public EventSourcedEntity(String entityId) {
            this.entityId = entityId;
            this.uncommittedEvents = new ArrayList<>();
            this.version = 0;
        }

        protected void applyEvent(Event event) {
            // Apply the event to update entity state
            handleEvent(event);

            // Track uncommitted event
            uncommittedEvents.add(event);
            version++;
        }

        public List<Event> getUncommittedEvents() {
            return new ArrayList<>(uncommittedEvents);
        }

        public void markEventsAsCommitted() {
            uncommittedEvents.clear();
        }

        public void loadFromHistory(List<Event> events) {
            for (Event event : events) {
                handleEvent(event);
                version++;
            }
        }

        protected abstract void handleEvent(Event event);

        // Getters
        public String getEntityId() { return entityId; }
        public int getVersion() { return version; }
    }

    // Supporting classes
    public static class EventEnvelope {
        private final Event event;
        private final Instant timestamp;

        public EventEnvelope(Event event, Instant timestamp) {
            this.event = event;
            this.timestamp = timestamp;
        }

        // Getters
        public Event getEvent() { return event; }
        public Instant getTimestamp() { return timestamp; }
    }

    public interface Event {
        String getEventId();
        String getEventType();
        Instant getTimestamp();
        Object getPayload();
    }

    public interface EventHandler {
        void handle(Event event) throws Exception;
    }

    public interface EventStore {
        void store(EventEnvelope envelope);
        List<Event> getEvents(String entityId);
        List<Event> getEvents(String entityId, int fromVersion);
    }

    // Saga-related classes
    public static class SagaInstance {
        private final String sagaId;
        private final List<SagaStep> steps;
        private final List<SagaStep> completedSteps;
        private int currentStepIndex;

        public SagaInstance(String sagaId, List<SagaStep> steps) {
            this.sagaId = sagaId;
            this.steps = steps;
            this.completedSteps = new ArrayList<>();
            this.currentStepIndex = 0;
        }

        public SagaStep getNextStep() {
            return currentStepIndex < steps.size() ? steps.get(currentStepIndex) : null;
        }

        public void markStepCompleted(String stepId) {
            if (currentStepIndex < steps.size() &&
                steps.get(currentStepIndex).getStepId().equals(stepId)) {
                completedSteps.add(steps.get(currentStepIndex));
                currentStepIndex++;
            }
        }

        public boolean hasMoreSteps() {
            return currentStepIndex < steps.size();
        }

        // Getters
        public String getSagaId() { return sagaId; }
        public List<SagaStep> getCompletedSteps() { return completedSteps; }
    }

    public interface SagaStep {
        String getStepId();
        void execute() throws Exception;
        void compensate() throws Exception;
    }

    // Event types for Saga
    public static class StepCompletedEvent implements Event {
        private final String sagaId;
        private final String stepId;
        private final Instant timestamp;

        public StepCompletedEvent(String sagaId, String stepId) {
            this.sagaId = sagaId;
            this.stepId = stepId;
            this.timestamp = Instant.now();
        }

        @Override
        public String getEventId() { return UUID.randomUUID().toString(); }
        @Override
        public String getEventType() { return "StepCompleted"; }
        @Override
        public Instant getTimestamp() { return timestamp; }
        @Override
        public Object getPayload() { return Map.of("sagaId", sagaId, "stepId", stepId); }

        // Getters
        public String getSagaId() { return sagaId; }
        public String getStepId() { return stepId; }
    }

    public static class StepFailedEvent implements Event {
        private final String sagaId;
        private final String stepId;
        private final String errorMessage;
        private final Instant timestamp;

        public StepFailedEvent(String sagaId, String stepId, String errorMessage) {
            this.sagaId = sagaId;
            this.stepId = stepId;
            this.errorMessage = errorMessage;
            this.timestamp = Instant.now();
        }

        @Override
        public String getEventId() { return UUID.randomUUID().toString(); }
        @Override
        public String getEventType() { return "StepFailed"; }
        @Override
        public Instant getTimestamp() { return timestamp; }
        @Override
        public Object getPayload() { return Map.of("sagaId", sagaId, "stepId", stepId, "error", errorMessage); }

        // Getters
        public String getSagaId() { return sagaId; }
        public String getStepId() { return stepId; }
        public String getErrorMessage() { return errorMessage; }
    }
}
```

---

## Stream Processing

### Real-time Stream Processing Engine

```java
public class StreamProcessor<T> {

    private final ExecutorService processingPool;
    private final AtomicBoolean isRunning;
    private final StreamMetrics metrics;

    public StreamProcessor(int parallelism) {
        this.processingPool = Executors.newFixedThreadPool(parallelism);
        this.isRunning = new AtomicBoolean(false);
        this.metrics = new StreamMetrics();
    }

    public <R> StreamPipeline<T, R> createPipeline() {
        return new StreamPipeline<>(this, metrics);
    }

    public void start() {
        isRunning.set(true);
    }

    public void shutdown() {
        isRunning.set(false);
        processingPool.shutdown();
    }

    ExecutorService getProcessingPool() {
        return processingPool;
    }

    boolean isRunning() {
        return isRunning.get();
    }

    // Stream processing pipeline
    public static class StreamPipeline<T, R> {
        private final StreamProcessor<?> processor;
        private final StreamMetrics metrics;
        private final List<StreamOperation<?, ?>> operations;

        public StreamPipeline(StreamProcessor<?> processor, StreamMetrics metrics) {
            this.processor = processor;
            this.metrics = metrics;
            this.operations = new ArrayList<>();
        }

        public <U> StreamPipeline<T, U> map(Function<R, U> mapper) {
            operations.add(new MapOperation<>(mapper));
            return (StreamPipeline<T, U>) this;
        }

        public StreamPipeline<T, R> filter(Predicate<R> predicate) {
            operations.add(new FilterOperation<>(predicate));
            return this;
        }

        public <K> StreamPipeline<T, Map<K, List<R>>> groupBy(Function<R, K> keyExtractor, Duration windowSize) {
            operations.add(new GroupByOperation<>(keyExtractor, windowSize));
            return (StreamPipeline<T, Map<K, List<R>>>) this;
        }

        public StreamPipeline<T, R> window(Duration windowSize) {
            operations.add(new WindowOperation<>(windowSize));
            return this;
        }

        public StreamPipeline<T, R> aggregate(BinaryOperator<R> aggregator, Duration windowSize) {
            operations.add(new AggregateOperation<>(aggregator, windowSize));
            return this;
        }

        public void forEach(Consumer<R> action) {
            operations.add(new ForEachOperation<>(action));
        }

        public CompletableFuture<Void> process(Stream<T> inputStream) {
            return CompletableFuture.runAsync(() -> {
                try {
                    inputStream.forEach(this::processRecord);
                } catch (Exception e) {
                    metrics.incrementErrorCount();
                    throw new RuntimeException("Stream processing failed", e);
                }
            }, processor.getProcessingPool());
        }

        @SuppressWarnings("unchecked")
        private void processRecord(T record) {
            Object current = record;
            long startTime = System.nanoTime();

            try {
                for (StreamOperation<?, ?> operation : operations) {
                    current = ((StreamOperation<Object, Object>) operation).apply(current);
                    if (current == null) {
                        break; // Filtered out
                    }
                }

                metrics.recordProcessingTime(System.nanoTime() - startTime);
                metrics.incrementProcessedCount();

            } catch (Exception e) {
                metrics.incrementErrorCount();
                System.err.println("Failed to process record: " + e.getMessage());
            }
        }
    }

    // Stream operations
    public interface StreamOperation<T, R> {
        R apply(T input);
    }

    public static class MapOperation<T, R> implements StreamOperation<T, R> {
        private final Function<T, R> mapper;

        public MapOperation(Function<T, R> mapper) {
            this.mapper = mapper;
        }

        @Override
        public R apply(T input) {
            return mapper.apply(input);
        }
    }

    public static class FilterOperation<T> implements StreamOperation<T, T> {
        private final Predicate<T> predicate;

        public FilterOperation(Predicate<T> predicate) {
            this.predicate = predicate;
        }

        @Override
        public T apply(T input) {
            return predicate.test(input) ? input : null;
        }
    }

    public static class GroupByOperation<T, K> implements StreamOperation<T, Map<K, List<T>>> {
        private final Function<T, K> keyExtractor;
        private final Map<K, List<T>> window;
        private final Duration windowSize;
        private Instant windowStart;

        public GroupByOperation(Function<T, K> keyExtractor, Duration windowSize) {
            this.keyExtractor = keyExtractor;
            this.windowSize = windowSize;
            this.window = new ConcurrentHashMap<>();
            this.windowStart = Instant.now();
        }

        @Override
        public Map<K, List<T>> apply(T input) {
            Instant now = Instant.now();

            // Check if window should be flushed
            if (Duration.between(windowStart, now).compareTo(windowSize) >= 0) {
                Map<K, List<T>> result = new HashMap<>(window);
                window.clear();
                windowStart = now;
                return result;
            }

            // Add to current window
            K key = keyExtractor.apply(input);
            window.computeIfAbsent(key, k -> new ArrayList<>()).add(input);

            return null; // Don't emit until window is complete
        }
    }

    public static class WindowOperation<T> implements StreamOperation<T, T> {
        private final Duration windowSize;
        private final List<T> window;
        private Instant windowStart;

        public WindowOperation(Duration windowSize) {
            this.windowSize = windowSize;
            this.window = new ArrayList<>();
            this.windowStart = Instant.now();
        }

        @Override
        public T apply(T input) {
            Instant now = Instant.now();

            // Check if window should be flushed
            if (Duration.between(windowStart, now).compareTo(windowSize) >= 0) {
                // Process window contents
                processWindow(window);
                window.clear();
                windowStart = now;
            }

            window.add(input);
            return input;
        }

        private void processWindow(List<T> windowContents) {
            // Window processing logic
            System.out.println("Processing window with " + windowContents.size() + " elements");
        }
    }

    public static class AggregateOperation<T> implements StreamOperation<T, T> {
        private final BinaryOperator<T> aggregator;
        private final Duration windowSize;
        private T accumulator;
        private Instant windowStart;

        public AggregateOperation(BinaryOperator<T> aggregator, Duration windowSize) {
            this.aggregator = aggregator;
            this.windowSize = windowSize;
            this.windowStart = Instant.now();
        }

        @Override
        public T apply(T input) {
            Instant now = Instant.now();

            // Check if window should be flushed
            if (Duration.between(windowStart, now).compareTo(windowSize) >= 0) {
                T result = accumulator;
                accumulator = null;
                windowStart = now;
                return result;
            }

            // Aggregate
            accumulator = accumulator == null ? input : aggregator.apply(accumulator, input);
            return null; // Don't emit until window is complete
        }
    }

    public static class ForEachOperation<T> implements StreamOperation<T, T> {
        private final Consumer<T> action;

        public ForEachOperation(Consumer<T> action) {
            this.action = action;
        }

        @Override
        public T apply(T input) {
            action.accept(input);
            return input;
        }
    }

    // Exactly-once processing with checkpointing
    public static class CheckpointManager {
        private final Map<String, Checkpoint> checkpoints;
        private final ScheduledExecutorService checkpointScheduler;
        private final Duration checkpointInterval;

        public CheckpointManager(Duration checkpointInterval) {
            this.checkpoints = new ConcurrentHashMap<>();
            this.checkpointScheduler = Executors.newScheduledThreadPool(1);
            this.checkpointInterval = checkpointInterval;

            startCheckpointing();
        }

        public void saveCheckpoint(String streamId, long offset, Object state) {
            Checkpoint checkpoint = new Checkpoint(offset, state, Instant.now());
            checkpoints.put(streamId, checkpoint);
        }

        public Optional<Checkpoint> getCheckpoint(String streamId) {
            return Optional.ofNullable(checkpoints.get(streamId));
        }

        private void startCheckpointing() {
            checkpointScheduler.scheduleAtFixedRate(() -> {
                // Persist checkpoints to durable storage
                persistCheckpoints();
            }, checkpointInterval.toMillis(), checkpointInterval.toMillis(), TimeUnit.MILLISECONDS);
        }

        private void persistCheckpoints() {
            checkpoints.forEach((streamId, checkpoint) -> {
                // Write to persistent storage (database, file system, etc.)
                System.out.println("Persisting checkpoint for stream " + streamId +
                                 " at offset " + checkpoint.getOffset());
            });
        }

        public void shutdown() {
            checkpointScheduler.shutdown();
        }

        public static class Checkpoint {
            private final long offset;
            private final Object state;
            private final Instant timestamp;

            public Checkpoint(long offset, Object state, Instant timestamp) {
                this.offset = offset;
                this.state = state;
                this.timestamp = timestamp;
            }

            // Getters
            public long getOffset() { return offset; }
            public Object getState() { return state; }
            public Instant getTimestamp() { return timestamp; }
        }
    }

    // Stream metrics collection
    public static class StreamMetrics {
        private final AtomicLong processedCount = new AtomicLong(0);
        private final AtomicLong errorCount = new AtomicLong(0);
        private final AtomicLong totalProcessingTime = new AtomicLong(0);

        public void incrementProcessedCount() {
            processedCount.incrementAndGet();
        }

        public void incrementErrorCount() {
            errorCount.incrementAndGet();
        }

        public void recordProcessingTime(long nanos) {
            totalProcessingTime.addAndGet(nanos);
        }

        public StreamStatistics getStatistics() {
            long processed = processedCount.get();
            long errors = errorCount.get();
            long totalTime = totalProcessingTime.get();

            double avgProcessingTime = processed > 0 ? (totalTime / 1_000_000.0) / processed : 0;
            double errorRate = (processed + errors) > 0 ? (errors * 100.0) / (processed + errors) : 0;

            return new StreamStatistics(processed, errors, avgProcessingTime, errorRate);
        }

        public static class StreamStatistics {
            private final long processedCount;
            private final long errorCount;
            private final double avgProcessingTimeMs;
            private final double errorRate;

            public StreamStatistics(long processedCount, long errorCount,
                                  double avgProcessingTimeMs, double errorRate) {
                this.processedCount = processedCount;
                this.errorCount = errorCount;
                this.avgProcessingTimeMs = avgProcessingTimeMs;
                this.errorRate = errorRate;
            }

            @Override
            public String toString() {
                return String.format(
                    "Processed: %d, Errors: %d, Avg Time: %.2fms, Error Rate: %.2f%%",
                    processedCount, errorCount, avgProcessingTimeMs, errorRate
                );
            }

            // Getters
            public long getProcessedCount() { return processedCount; }
            public long getErrorCount() { return errorCount; }
            public double getAvgProcessingTimeMs() { return avgProcessingTimeMs; }
            public double getErrorRate() { return errorRate; }
        }
    }
}
```

---

## Backpressure & Flow Control

### Reactive Streams Implementation

```java
public class BackpressureHandler {

    // Drop strategy - drop oldest messages when buffer is full
    public static class DropOldestBuffer<T> {
        private final LinkedList<T> buffer;
        private final int maxSize;
        private final AtomicLong droppedCount;

        public DropOldestBuffer(int maxSize) {
            this.buffer = new LinkedList<>();
            this.maxSize = maxSize;
            this.droppedCount = new AtomicLong(0);
        }

        public synchronized boolean offer(T item) {
            if (buffer.size() >= maxSize) {
                buffer.removeFirst(); // Drop oldest
                droppedCount.incrementAndGet();
            }
            return buffer.offer(item);
        }

        public synchronized T poll() {
            return buffer.poll();
        }

        public synchronized int size() {
            return buffer.size();
        }

        public long getDroppedCount() {
            return droppedCount.get();
        }
    }

    // Sampling strategy - process only every nth message
    public static class SamplingProcessor<T> {
        private final int sampleRate;
        private final AtomicLong messageCount;
        private final Consumer<T> processor;

        public SamplingProcessor(int sampleRate, Consumer<T> processor) {
            this.sampleRate = sampleRate;
            this.messageCount = new AtomicLong(0);
            this.processor = processor;
        }

        public void process(T message) {
            long count = messageCount.incrementAndGet();
            if (count % sampleRate == 0) {
                processor.accept(message);
            }
        }

        public double getCurrentSampleRate() {
            long total = messageCount.get();
            long processed = total / sampleRate;
            return total > 0 ? (processed * 100.0) / total : 0;
        }
    }

    // Adaptive batching based on system load
    public static class AdaptiveBatcher<T> {
        private final List<T> currentBatch;
        private final int minBatchSize;
        private final int maxBatchSize;
        private final Duration maxWaitTime;
        private final Consumer<List<T>> batchProcessor;
        private final SystemLoadMonitor loadMonitor;

        private volatile Instant lastBatchTime;
        private volatile int currentBatchSize;

        public AdaptiveBatcher(int minBatchSize, int maxBatchSize, Duration maxWaitTime,
                             Consumer<List<T>> batchProcessor, SystemLoadMonitor loadMonitor) {
            this.currentBatch = new ArrayList<>();
            this.minBatchSize = minBatchSize;
            this.maxBatchSize = maxBatchSize;
            this.maxWaitTime = maxWaitTime;
            this.batchProcessor = batchProcessor;
            this.loadMonitor = loadMonitor;
            this.lastBatchTime = Instant.now();
            this.currentBatchSize = minBatchSize;

            startBatchTimer();
        }

        public synchronized void add(T item) {
            currentBatch.add(item);

            // Adapt batch size based on system load
            adaptBatchSize();

            if (currentBatch.size() >= currentBatchSize) {
                processBatch();
            }
        }

        private void adaptBatchSize() {
            double cpuLoad = loadMonitor.getCpuUsage();
            double memoryLoad = loadMonitor.getMemoryUsage();

            if (cpuLoad > 80 || memoryLoad > 85) {
                // High load - reduce batch size for lower latency
                currentBatchSize = Math.max(minBatchSize, currentBatchSize - 1);
            } else if (cpuLoad < 50 && memoryLoad < 60) {
                // Low load - increase batch size for better throughput
                currentBatchSize = Math.min(maxBatchSize, currentBatchSize + 1);
            }
        }

        private void processBatch() {
            if (!currentBatch.isEmpty()) {
                List<T> batchToProcess = new ArrayList<>(currentBatch);
                currentBatch.clear();
                lastBatchTime = Instant.now();

                CompletableFuture.runAsync(() -> batchProcessor.accept(batchToProcess));
            }
        }

        private void startBatchTimer() {
            ScheduledExecutorService timer = Executors.newScheduledThreadPool(1);
            timer.scheduleAtFixedRate(() -> {
                synchronized (this) {
                    if (!currentBatch.isEmpty() &&
                        Duration.between(lastBatchTime, Instant.now()).compareTo(maxWaitTime) >= 0) {
                        processBatch();
                    }
                }
            }, maxWaitTime.toMillis(), maxWaitTime.toMillis() / 2, TimeUnit.MILLISECONDS);
        }
    }

    // Rate limiter using token bucket algorithm
    public static class TokenBucketRateLimiter {
        private final long capacity;
        private final long refillRate; // tokens per second
        private final AtomicLong tokens;
        private final AtomicLong lastRefillTime;

        public TokenBucketRateLimiter(long capacity, long refillRate) {
            this.capacity = capacity;
            this.refillRate = refillRate;
            this.tokens = new AtomicLong(capacity);
            this.lastRefillTime = new AtomicLong(System.nanoTime());
        }

        public boolean tryAcquire() {
            return tryAcquire(1);
        }

        public boolean tryAcquire(long requestedTokens) {
            refillTokens();

            long currentTokens = tokens.get();
            if (currentTokens >= requestedTokens) {
                if (tokens.compareAndSet(currentTokens, currentTokens - requestedTokens)) {
                    return true;
                }
            }
            return false;
        }

        public void acquire() throws InterruptedException {
            acquire(1);
        }

        public void acquire(long requestedTokens) throws InterruptedException {
            while (!tryAcquire(requestedTokens)) {
                Thread.sleep(10); // Wait and retry
            }
        }

        private void refillTokens() {
            long now = System.nanoTime();
            long lastRefill = lastRefillTime.get();

            if (now > lastRefill) {
                long elapsedNanos = now - lastRefill;
                long tokensToAdd = (elapsedNanos * refillRate) / 1_000_000_000L;

                if (tokensToAdd > 0) {
                    long currentTokens = tokens.get();
                    long newTokens = Math.min(capacity, currentTokens + tokensToAdd);

                    if (tokens.compareAndSet(currentTokens, newTokens)) {
                        lastRefillTime.set(now);
                    }
                }
            }
        }

        public long getAvailableTokens() {
            refillTokens();
            return tokens.get();
        }
    }

    // Circuit breaker for downstream services
    public static class CircuitBreaker {
        private final int failureThreshold;
        private final Duration timeout;
        private final Duration retryTimeout;

        private final AtomicInteger failureCount;
        private final AtomicLong lastFailureTime;
        private final AtomicReference<State> state;

        public enum State {
            CLOSED, OPEN, HALF_OPEN
        }

        public CircuitBreaker(int failureThreshold, Duration timeout, Duration retryTimeout) {
            this.failureThreshold = failureThreshold;
            this.timeout = timeout;
            this.retryTimeout = retryTimeout;
            this.failureCount = new AtomicInteger(0);
            this.lastFailureTime = new AtomicLong(0);
            this.state = new AtomicReference<>(State.CLOSED);
        }

        public <T> T execute(Supplier<T> operation) throws Exception {
            if (state.get() == State.OPEN) {
                if (System.currentTimeMillis() - lastFailureTime.get() > retryTimeout.toMillis()) {
                    state.set(State.HALF_OPEN);
                } else {
                    throw new CircuitBreakerOpenException("Circuit breaker is OPEN");
                }
            }

            try {
                T result = executeWithTimeout(operation);
                onSuccess();
                return result;
            } catch (Exception e) {
                onFailure();
                throw e;
            }
        }

        private <T> T executeWithTimeout(Supplier<T> operation) throws Exception {
            CompletableFuture<T> future = CompletableFuture.supplyAsync(operation);
            try {
                return future.get(timeout.toMillis(), TimeUnit.MILLISECONDS);
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
            int failures = failureCount.incrementAndGet();
            lastFailureTime.set(System.currentTimeMillis());

            if (failures >= failureThreshold) {
                state.set(State.OPEN);
            }
        }

        public State getState() {
            return state.get();
        }

        public static class CircuitBreakerOpenException extends RuntimeException {
            public CircuitBreakerOpenException(String message) {
                super(message);
            }
        }
    }

    // System load monitor
    public interface SystemLoadMonitor {
        double getCpuUsage();
        double getMemoryUsage();
        double getDiskUsage();
        double getNetworkUsage();
    }

    public static class DefaultSystemLoadMonitor implements SystemLoadMonitor {
        private final MemoryMXBean memoryBean;
        private final OperatingSystemMXBean osBean;

        public DefaultSystemLoadMonitor() {
            this.memoryBean = ManagementFactory.getMemoryMXBean();
            this.osBean = ManagementFactory.getOperatingSystemMXBean();
        }

        @Override
        public double getCpuUsage() {
            return osBean.getProcessCpuLoad() * 100;
        }

        @Override
        public double getMemoryUsage() {
            MemoryUsage heapUsage = memoryBean.getHeapMemoryUsage();
            return (heapUsage.getUsed() * 100.0) / heapUsage.getMax();
        }

        @Override
        public double getDiskUsage() {
            File root = new File("/");
            long total = root.getTotalSpace();
            long free = root.getFreeSpace();
            return ((total - free) * 100.0) / total;
        }

        @Override
        public double getNetworkUsage() {
            // Placeholder - would need network monitoring implementation
            return 0.0;
        }
    }
}
```

**📊 Messaging Pattern Comparison:**

| Pattern               | Ordering       | Delivery      | Scalability | Complexity |
| --------------------- | -------------- | ------------- | ----------- | ---------- |
| **Queue**             | FIFO per queue | At-least-once | High        | Low        |
| **Pub/Sub**           | No guarantee   | At-least-once | Very High   | Medium     |
| **Event Sourcing**    | Strict         | Exactly-once  | Medium      | High       |
| **Stream Processing** | Configurable   | At-least-once | Very High   | High       |

---

## Summary & Best Practices

### 🎯 Key Takeaways

✅ **Choose Right Messaging Pattern**: Queue for work distribution, pub/sub for notifications, events for state changes  
✅ **Handle Backpressure**: Use buffering, sampling, rate limiting, circuit breakers  
✅ **Ensure Message Durability**: Persist critical messages, implement retry with exponential backoff  
✅ **Design for Failure**: Dead letter queues, circuit breakers, graceful degradation  
✅ **Monitor System Health**: Track queue depths, processing rates, error rates

### 📈 Messaging Architecture Checklist

- [ ] Selected appropriate messaging pattern
- [ ] Implemented retry logic with exponential backoff
- [ ] Set up dead letter queues
- [ ] Added circuit breakers for downstream dependencies
- [ ] Implemented backpressure handling
- [ ] Set up monitoring and alerting
- [ ] Planned for message ordering requirements
- [ ] Tested failure scenarios

### ⚠️ Common Messaging Pitfalls

- **Message loss**: Not persisting critical messages
- **Duplicate processing**: Not implementing idempotency
- **Message ordering**: Assuming FIFO without guarantees
- **Backpressure**: Not handling slow consumers
- **Poison messages**: No dead letter queue implementation

**📈 Next Steps:**
Ready to design APIs? Continue with [API Design & Load Balancing](./05-api-design-load-balancing.md) to learn about RESTful APIs, GraphQL, rate limiting, and load balancing strategies.

---

_💡 Pro Tip: Design your messaging system for failure from day one. Use idempotent operations, implement proper retry logic, and always have a way to handle poison messages. Monitor queue depths and processing rates to detect issues early._
