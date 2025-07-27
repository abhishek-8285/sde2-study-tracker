# Apache Kafka & Event Streaming

A comprehensive guide to Apache Kafka covering architecture, producer/consumer patterns, stream processing, and event-driven system design for SDE2-level distributed systems.

## 📋 Table of Contents

1. [Kafka Architecture](#kafka-architecture)
2. [Producer Patterns](#producer-patterns)
3. [Consumer Patterns](#consumer-patterns)
4. [Topic Design & Partitioning](#topic-design--partitioning)
5. [Stream Processing](#stream-processing)
6. [Schema Management](#schema-management)
7. [Monitoring & Operations](#monitoring--operations)
8. [Production Deployment](#production-deployment)
9. [Real-World Examples](#real-world-examples)

## Kafka Architecture

### Core Concepts and Components

```bash
# Basic Kafka operations
kafka-topics --create --topic user-events --partitions 3 --replication-factor 3 --bootstrap-server localhost:9092

kafka-topics --list --bootstrap-server localhost:9092
kafka-topics --describe --topic user-events --bootstrap-server localhost:9092

# Consumer group management
kafka-consumer-groups --list --bootstrap-server localhost:9092
kafka-consumer-groups --describe --group payment-processors --bootstrap-server localhost:9092
```

### Cluster Configuration

```properties
# server.properties - Production Kafka Configuration
broker.id=1
listeners=PLAINTEXT://0.0.0.0:9092,SSL://0.0.0.0:9093
advertised.listeners=PLAINTEXT://kafka-1.internal:9092,SSL://kafka-1.example.com:9093
listener.security.protocol.map=PLAINTEXT:PLAINTEXT,SSL:SSL

# Replication and durability
default.replication.factor=3
min.insync.replicas=2
unclean.leader.election.enable=false
auto.leader.rebalance.enable=true

# Log configuration
log.dirs=/var/kafka-logs
num.partitions=3
log.retention.hours=168
log.retention.bytes=1073741824
log.segment.bytes=1073741824
log.cleanup.policy=delete

# Performance tuning
num.network.threads=8
num.io.threads=16
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600

# Compression
compression.type=snappy
```

## Producer Patterns

### High-Performance Producer

```java
// Java Producer Configuration
public class KafkaProducerConfig {

    public Producer<String, Object> createProducer() {
        Properties props = new Properties();

        // Connection settings
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG,
                 "kafka-1:9092,kafka-2:9092,kafka-3:9092");

        // Serialization
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
                 StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
                 JsonSerializer.class.getName());

        // Performance tuning
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 32768);
        props.put(ProducerConfig.LINGER_MS_CONFIG, 5);
        props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 67108864);
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "snappy");

        // Reliability settings
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
        props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 1);
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        // Timeout settings
        props.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 30000);
        props.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 120000);

        return new KafkaProducer<>(props);
    }
}

// Event publishing service
@Service
public class EventPublisher {

    private final Producer<String, Object> producer;
    private final ObjectMapper objectMapper;

    public EventPublisher(Producer<String, Object> producer) {
        this.producer = producer;
        this.objectMapper = new ObjectMapper();
    }

    public CompletableFuture<RecordMetadata> publishEvent(String topic,
                                                         String key,
                                                         Object event) {
        ProducerRecord<String, Object> record = new ProducerRecord<>(topic, key, event);

        // Add headers for tracing
        record.headers().add("event-time",
                           String.valueOf(System.currentTimeMillis()).getBytes());
        record.headers().add("event-source", "user-service".getBytes());

        CompletableFuture<RecordMetadata> future = new CompletableFuture<>();

        producer.send(record, (metadata, exception) -> {
            if (exception != null) {
                future.completeExceptionally(exception);
            } else {
                future.complete(metadata);
            }
        });

        return future;
    }

    @EventListener
    public void handleUserCreated(UserCreatedEvent event) {
        publishEvent("user-events", event.getUserId(), event)
            .whenComplete((metadata, throwable) -> {
                if (throwable != null) {
                    log.error("Failed to publish user created event", throwable);
                    // Implement dead letter queue or retry logic
                } else {
                    log.info("Published user created event to partition: {}",
                           metadata.partition());
                }
            });
    }
}
```

### Transactional Producer

```java
// Transactional producer for exactly-once semantics
@Service
public class TransactionalEventPublisher {

    private final Producer<String, Object> producer;
    private final String transactionId;

    public TransactionalEventPublisher() {
        Properties props = new Properties();
        // ... other configurations

        props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "payment-processor-1");
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        this.producer = new KafkaProducer<>(props);
        this.producer.initTransactions();
    }

    @Transactional
    public void processPaymentWithEvents(PaymentRequest request) {
        try {
            producer.beginTransaction();

            // Database transaction
            Payment payment = paymentService.processPayment(request);

            // Publish events as part of transaction
            publishEvent("payment-events", payment.getId(),
                        new PaymentProcessedEvent(payment));
            publishEvent("notification-events", payment.getUserId(),
                        new PaymentNotificationEvent(payment));

            producer.commitTransaction();

        } catch (Exception e) {
            producer.abortTransaction();
            throw new PaymentProcessingException("Failed to process payment", e);
        }
    }
}
```

## Consumer Patterns

### High-Throughput Consumer

```java
// Consumer configuration for high throughput
public class KafkaConsumerConfig {

    public Consumer<String, Object> createConsumer(String groupId) {
        Properties props = new Properties();

        // Connection settings
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG,
                 "kafka-1:9092,kafka-2:9092,kafka-3:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);

        // Serialization
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
                 StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
                 JsonDeserializer.class.getName());

        // Performance tuning
        props.put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, 50000);
        props.put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, 500);
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 1000);
        props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 300000);

        // Offset management
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);

        return new KafkaConsumer<>(props);
    }
}

// Event consumer service
@Component
public class EventConsumer {

    private final Consumer<String, Object> consumer;
    private final EventProcessor eventProcessor;
    private volatile boolean running = true;

    @EventListener(ApplicationStartedEvent.class)
    public void startConsumer() {
        consumer.subscribe(Arrays.asList("user-events", "order-events"));

        CompletableFuture.runAsync(() -> {
            while (running) {
                try {
                    ConsumerRecords<String, Object> records = consumer.poll(Duration.ofMillis(1000));

                    if (!records.isEmpty()) {
                        processRecords(records);
                        consumer.commitSync();
                    }

                } catch (Exception e) {
                    log.error("Error consuming events", e);
                    // Implement error handling strategy
                }
            }
        });
    }

    private void processRecords(ConsumerRecords<String, Object> records) {
        Map<TopicPartition, List<ConsumerRecord<String, Object>>> partitionedRecords =
            records.records().stream()
                .collect(Collectors.groupingBy(record ->
                    new TopicPartition(record.topic(), record.partition())));

        // Process records in parallel by partition
        partitionedRecords.entrySet().parallelStream()
            .forEach(entry -> {
                try {
                    processPartitionRecords(entry.getValue());
                } catch (Exception e) {
                    log.error("Error processing partition: {}", entry.getKey(), e);
                    // Handle partition-specific errors
                }
            });
    }

    private void processPartitionRecords(List<ConsumerRecord<String, Object>> records) {
        for (ConsumerRecord<String, Object> record : records) {
            try {
                eventProcessor.process(record.topic(), record.key(), record.value());
            } catch (Exception e) {
                log.error("Error processing record: {}", record, e);
                // Send to dead letter queue
                deadLetterProducer.send(createDeadLetterRecord(record, e));
            }
        }
    }
}
```

### Consumer Group Management

```java
// Advanced consumer group coordination
@Service
public class ConsumerGroupManager {

    private final AdminClient adminClient;

    public void rebalanceConsumerGroup(String groupId) {
        try {
            // Get current group description
            DescribeConsumerGroupsResult result = adminClient
                .describeConsumerGroups(Collections.singleton(groupId));

            ConsumerGroupDescription groupDescription = result.all().get().get(groupId);

            if (groupDescription.state() == ConsumerGroupState.STABLE) {
                // Force rebalance by removing and re-adding members
                Collection<MemberDescription> members = groupDescription.members();

                for (MemberDescription member : members) {
                    removeMemberFromGroup(groupId, member.consumerId());
                }
            }

        } catch (Exception e) {
            log.error("Failed to rebalance consumer group: {}", groupId, e);
        }
    }

    public void resetConsumerGroupOffset(String groupId,
                                       String topic,
                                       long timestamp) {
        try {
            Map<TopicPartition, OffsetSpec> partitionOffsets = new HashMap<>();

            // Get topic partitions
            DescribeTopicsResult topicsResult = adminClient
                .describeTopics(Collections.singleton(topic));
            TopicDescription topicDescription = topicsResult.all().get().get(topic);

            for (TopicPartitionInfo partitionInfo : topicDescription.partitions()) {
                TopicPartition partition = new TopicPartition(topic, partitionInfo.partition());
                partitionOffsets.put(partition, OffsetSpec.forTimestamp(timestamp));
            }

            // Reset offsets
            AlterConsumerGroupOffsetsResult offsetResult = adminClient
                .alterConsumerGroupOffsets(groupId, partitionOffsets);

            offsetResult.all().get();
            log.info("Reset offsets for group: {} topic: {}", groupId, topic);

        } catch (Exception e) {
            log.error("Failed to reset offsets", e);
        }
    }
}
```

## Topic Design & Partitioning

### Partitioning Strategies

```java
// Custom partitioner for user events
public class UserEventPartitioner implements Partitioner {

    @Override
    public int partition(String topic, Object key, byte[] keyBytes,
                        Object value, byte[] valueBytes, Cluster cluster) {

        if (key == null) {
            // Round-robin for null keys
            return ThreadLocalRandom.current().nextInt(cluster.partitionCountForTopic(topic));
        }

        String keyString = key.toString();

        // Hash user ID for consistent partitioning
        if (keyString.startsWith("user:")) {
            String userId = keyString.substring(5);
            return Math.abs(userId.hashCode()) % cluster.partitionCountForTopic(topic);
        }

        // Geographic partitioning for orders
        if (keyString.startsWith("order:")) {
            OrderEvent event = (OrderEvent) value;
            return getPartitionByRegion(event.getRegion(), cluster.partitionCountForTopic(topic));
        }

        // Default hash partitioning
        return Math.abs(keyString.hashCode()) % cluster.partitionCountForTopic(topic);
    }

    private int getPartitionByRegion(String region, int numPartitions) {
        switch (region.toLowerCase()) {
            case "us-east": return 0 % numPartitions;
            case "us-west": return 1 % numPartitions;
            case "eu": return 2 % numPartitions;
            case "asia": return 3 % numPartitions;
            default: return Math.abs(region.hashCode()) % numPartitions;
        }
    }
}

// Topic creation with custom configuration
@Component
public class TopicManager {

    private final AdminClient adminClient;

    public void createUserEventsTopic() {
        NewTopic topic = new NewTopic("user-events", 12, (short) 3);

        Map<String, String> configs = new HashMap<>();
        configs.put(TopicConfig.CLEANUP_POLICY_CONFIG, TopicConfig.CLEANUP_POLICY_DELETE);
        configs.put(TopicConfig.RETENTION_MS_CONFIG, String.valueOf(TimeUnit.DAYS.toMillis(7)));
        configs.put(TopicConfig.SEGMENT_MS_CONFIG, String.valueOf(TimeUnit.HOURS.toMillis(1)));
        configs.put(TopicConfig.COMPRESSION_TYPE_CONFIG, "snappy");
        configs.put(TopicConfig.MIN_IN_SYNC_REPLICAS_CONFIG, "2");

        topic.configs(configs);

        CreateTopicsResult result = adminClient.createTopics(Collections.singleton(topic));

        try {
            result.all().get();
            log.info("Created topic: user-events");
        } catch (Exception e) {
            log.error("Failed to create topic", e);
        }
    }

    public void createCompactedTopic(String topicName) {
        NewTopic topic = new NewTopic(topicName, 6, (short) 3);

        Map<String, String> configs = new HashMap<>();
        configs.put(TopicConfig.CLEANUP_POLICY_CONFIG, TopicConfig.CLEANUP_POLICY_COMPACT);
        configs.put(TopicConfig.MIN_CLEANABLE_DIRTY_RATIO_CONFIG, "0.1");
        configs.put(TopicConfig.SEGMENT_MS_CONFIG, String.valueOf(TimeUnit.HOURS.toMillis(1)));
        configs.put(TopicConfig.DELETE_RETENTION_MS_CONFIG, String.valueOf(TimeUnit.HOURS.toMillis(24)));

        topic.configs(configs);

        adminClient.createTopics(Collections.singleton(topic));
    }
}
```

## Stream Processing

### Kafka Streams Application

```java
// Kafka Streams topology for order processing
@Component
public class OrderProcessingStreams {

    private KafkaStreams streams;

    @PostConstruct
    public void startStreams() {
        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "order-processing");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka-1:9092");
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().getClass());
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, JsonSerde.class);
        props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.EXACTLY_ONCE_V2);

        StreamsBuilder builder = new StreamsBuilder();
        buildTopology(builder);

        streams = new KafkaStreams(builder.build(), props);
        streams.start();

        Runtime.getRuntime().addShutdownHook(new Thread(streams::close));
    }

    private void buildTopology(StreamsBuilder builder) {
        // Order events stream
        KStream<String, OrderEvent> orders = builder.stream("order-events");

        // User profiles table
        KTable<String, UserProfile> users = builder.table("user-profiles");

        // Product catalog table
        KTable<String, Product> products = builder.table("product-catalog");

        // Enrich orders with user and product information
        KStream<String, EnrichedOrder> enrichedOrders = orders
            .selectKey((key, order) -> order.getUserId())
            .join(users, (order, user) -> new EnrichedOrder(order, user))
            .selectKey((key, enrichedOrder) -> enrichedOrder.getOrder().getProductId())
            .join(products, (enrichedOrder, product) -> {
                enrichedOrder.setProduct(product);
                return enrichedOrder;
            });

        // Calculate order totals and apply discounts
        KStream<String, ProcessedOrder> processedOrders = enrichedOrders
            .mapValues(this::calculateOrderTotal)
            .mapValues(this::applyDiscounts)
            .mapValues(this::validateInventory);

        // Branch processed orders
        Map<String, KStream<String, ProcessedOrder>> branches = processedOrders
            .split(Named.as("order-"))
            .branch((key, order) -> order.getStatus() == OrderStatus.APPROVED,
                   Branched.as("approved"))
            .branch((key, order) -> order.getStatus() == OrderStatus.REJECTED,
                   Branched.as("rejected"))
            .defaultBranch(Branched.as("pending"));

        // Send approved orders to fulfillment
        branches.get("order-approved")
            .to("fulfillment-orders");

        // Send rejected orders to review
        branches.get("order-rejected")
            .to("order-review");

        // Aggregate order metrics
        buildOrderMetrics(builder, processedOrders);
    }

    private void buildOrderMetrics(StreamsBuilder builder,
                                  KStream<String, ProcessedOrder> orders) {
        // Order count by status
        KTable<Windowed<String>, Long> orderCountByStatus = orders
            .groupBy((key, order) -> order.getStatus().toString())
            .windowedBy(TimeWindows.of(Duration.ofMinutes(5)))
            .count(Named.as("order-count-by-status"));

        // Revenue by time window
        KTable<Windowed<String>, Double> revenueByWindow = orders
            .filter((key, order) -> order.getStatus() == OrderStatus.APPROVED)
            .groupBy((key, order) -> "revenue")
            .windowedBy(TimeWindows.of(Duration.ofMinutes(5)))
            .aggregate(
                () -> 0.0,
                (key, order, aggregate) -> aggregate + order.getTotal(),
                Named.as("revenue-by-window")
            );

        // Send metrics to monitoring topic
        orderCountByStatus.toStream()
            .map((windowedKey, count) -> KeyValue.pair(
                windowedKey.key(),
                new OrderMetric("count", windowedKey.key(), count.doubleValue())))
            .to("order-metrics");

        revenueByWindow.toStream()
            .map((windowedKey, revenue) -> KeyValue.pair(
                "revenue",
                new OrderMetric("revenue", "total", revenue)))
            .to("order-metrics");
    }
}

// Stream processing with error handling
@Component
public class StreamErrorHandler {

    public void configureErrorHandling(StreamsBuilder builder) {
        builder.stream("input-topic")
            .map((key, value) -> {
                try {
                    return KeyValue.pair(key, processValue(value));
                } catch (ProcessingException e) {
                    // Send to dead letter queue
                    sendToDeadLetterQueue(key, value, e);
                    return null;
                }
            })
            .filter((key, value) -> value != null)
            .to("output-topic");
    }

    private void sendToDeadLetterQueue(String key, Object value, Exception error) {
        DeadLetterRecord dlr = new DeadLetterRecord(key, value, error.getMessage());
        // Send to DLQ topic
        producer.send(new ProducerRecord<>("dead-letter-queue", key, dlr));
    }
}
```

## Schema Management

### Avro Schema Registry

```json
// User event schema
{
  "type": "record",
  "name": "UserEvent",
  "namespace": "com.company.events",
  "fields": [
    {
      "name": "eventId",
      "type": "string"
    },
    {
      "name": "userId",
      "type": "string"
    },
    {
      "name": "eventType",
      "type": {
        "type": "enum",
        "name": "UserEventType",
        "symbols": ["CREATED", "UPDATED", "DELETED", "LOGIN", "LOGOUT"]
      }
    },
    {
      "name": "timestamp",
      "type": "long",
      "logicalType": "timestamp-millis"
    },
    {
      "name": "payload",
      "type": ["null", "string"],
      "default": null
    },
    {
      "name": "metadata",
      "type": {
        "type": "map",
        "values": "string"
      },
      "default": {}
    }
  ]
}
```

```java
// Schema registry client configuration
@Configuration
public class SchemaRegistryConfig {

    @Bean
    public CachedSchemaRegistryClient schemaRegistryClient() {
        List<String> urls = Arrays.asList("http://schema-registry-1:8081");

        Map<String, Object> configs = new HashMap<>();
        configs.put("basic.auth.credentials.source", "USER_INFO");
        configs.put("basic.auth.user.info", "username:password");
        configs.put("schema.registry.url", String.join(",", urls));

        return new CachedSchemaRegistryClient(urls, 1000, configs);
    }

    @Bean
    public KafkaAvroSerializer avroSerializer() {
        return new KafkaAvroSerializer(schemaRegistryClient());
    }

    @Bean
    public KafkaAvroDeserializer avroDeserializer() {
        return new KafkaAvroDeserializer(schemaRegistryClient());
    }
}

// Avro producer
@Service
public class AvroEventProducer {

    private final Producer<String, GenericRecord> producer;
    private final Schema userEventSchema;

    public AvroEventProducer(CachedSchemaRegistryClient schemaRegistry) {
        this.producer = createAvroProducer();
        this.userEventSchema = loadSchema("user-event-value", schemaRegistry);
    }

    public void publishUserEvent(String userId, UserEventType eventType, String payload) {
        GenericRecord record = new GenericData.Record(userEventSchema);
        record.put("eventId", UUID.randomUUID().toString());
        record.put("userId", userId);
        record.put("eventType", eventType);
        record.put("timestamp", System.currentTimeMillis());
        record.put("payload", payload);

        Map<String, String> metadata = new HashMap<>();
        metadata.put("source", "user-service");
        metadata.put("version", "1.0");
        record.put("metadata", metadata);

        ProducerRecord<String, GenericRecord> producerRecord =
            new ProducerRecord<>("user-events", userId, record);

        producer.send(producerRecord, (metadata, exception) -> {
            if (exception != null) {
                log.error("Failed to send user event", exception);
            } else {
                log.info("Sent user event to partition {}", metadata.partition());
            }
        });
    }
}
```

## Real-World Examples

### Example 1: E-commerce Event-Driven Architecture

```java
// E-commerce order processing pipeline
@Service
public class EcommerceEventProcessor {

    // Order placement event
    @EventListener
    public void handleOrderPlaced(OrderPlacedEvent event) {
        // Publish to multiple topics for different consumers

        // Inventory service
        publishEvent("inventory-events", event.getOrderId(),
                    new InventoryReservationEvent(event.getItems()));

        // Payment service
        publishEvent("payment-events", event.getOrderId(),
                    new PaymentProcessingEvent(event.getPaymentInfo()));

        // Notification service
        publishEvent("notification-events", event.getUserId(),
                    new OrderConfirmationEvent(event.getOrderId()));

        // Analytics
        publishEvent("analytics-events", "order-metrics",
                    new OrderAnalyticsEvent(event));
    }

    // Saga pattern for distributed transactions
    @KafkaListener(topics = "payment-events")
    public void handlePaymentProcessed(PaymentProcessedEvent event) {
        if (event.isSuccessful()) {
            // Continue saga
            publishEvent("fulfillment-events", event.getOrderId(),
                        new FulfillmentStartEvent(event.getOrderId()));
        } else {
            // Compensate - release inventory
            publishEvent("inventory-events", event.getOrderId(),
                        new InventoryReleaseEvent(event.getOrderId()));

            // Notify customer
            publishEvent("notification-events", event.getUserId(),
                        new PaymentFailedEvent(event.getOrderId()));
        }
    }
}

// Customer behavior analytics
@Component
public class CustomerBehaviorAnalytics {

    @KafkaStreamsTopology
    public Topology buildCustomerJourneyTopology() {
        StreamsBuilder builder = new StreamsBuilder();

        // Page views stream
        KStream<String, PageViewEvent> pageViews = builder.stream("page-views");

        // Purchase events stream
        KStream<String, PurchaseEvent> purchases = builder.stream("purchases");

        // Session windowing for customer journey
        KTable<Windowed<String>, CustomerSession> customerSessions = pageViews
            .groupBy((key, event) -> event.getUserId())
            .windowedBy(SessionWindows.with(Duration.ofMinutes(30)))
            .aggregate(
                CustomerSession::new,
                (key, event, session) -> session.addPageView(event),
                (key, session1, session2) -> session1.merge(session2)
            );

        // Join with purchases to calculate conversion
        KStream<String, CustomerConversion> conversions = purchases
            .join(customerSessions,
                  (purchase, session) -> new CustomerConversion(purchase, session),
                  JoinWindows.of(Duration.ofHours(1)));

        conversions.to("customer-conversions");

        return builder.build();
    }
}
```

### Example 2: Financial Trading System

```java
// Real-time trading event processing
@Service
public class TradingEventProcessor {

    private final KafkaStreams tradingStreams;

    public void buildTradingTopology() {
        StreamsBuilder builder = new StreamsBuilder();

        // Market data stream
        KStream<String, MarketDataEvent> marketData = builder.stream("market-data");

        // Order stream
        KStream<String, OrderEvent> orders = builder.stream("order-events");

        // Risk management
        KStream<String, RiskAssessment> riskAssessments = orders
            .mapValues(this::calculateRisk)
            .filter((key, risk) -> risk.getRiskLevel() != RiskLevel.PROHIBITED);

        // Order matching engine
        KStream<String, TradeExecution> executions = riskAssessments
            .join(marketData,
                  this::matchOrder,
                  JoinWindows.of(Duration.ofMillis(100)))
            .filter((key, execution) -> execution != null);

        // Settlement processing
        executions
            .mapValues(this::createSettlementInstruction)
            .to("settlement-instructions");

        // Trade reporting
        executions
            .mapValues(this::createTradeReport)
            .to("trade-reports");

        // Real-time P&L calculation
        KTable<String, PortfolioPosition> positions = executions
            .groupBy((key, execution) -> execution.getPortfolioId())
            .aggregate(
                PortfolioPosition::new,
                (key, execution, position) -> position.updateWithTrade(execution)
            );

        positions.toStream().to("portfolio-positions");
    }

    private RiskAssessment calculateRisk(OrderEvent order) {
        // Complex risk calculation logic
        double riskScore = order.getAmount() * getRiskMultiplier(order.getSymbol());
        RiskLevel level = determineRiskLevel(riskScore);

        return new RiskAssessment(order.getOrderId(), riskScore, level);
    }
}
```

### Example 3: IoT Data Processing

```java
// IoT sensor data processing pipeline
@Component
public class IoTDataProcessor {

    public void buildIoTTopology(StreamsBuilder builder) {
        // Raw sensor data
        KStream<String, SensorReading> sensorData = builder.stream("sensor-data");

        // Data validation and cleaning
        KStream<String, ValidatedReading> validatedData = sensorData
            .filter(this::isValidReading)
            .mapValues(this::cleanAndNormalize);

        // Anomaly detection using windowed operations
        KTable<Windowed<String>, SensorStats> sensorStats = validatedData
            .groupBy((key, reading) -> reading.getSensorId())
            .windowedBy(TimeWindows.of(Duration.ofMinutes(5)))
            .aggregate(
                SensorStats::new,
                (key, reading, stats) -> stats.addReading(reading)
            );

        // Detect anomalies
        KStream<String, AnomalyAlert> anomalies = validatedData
            .join(sensorStats,
                  (reading, stats) -> detectAnomaly(reading, stats),
                  JoinWindows.of(Duration.ofMinutes(1)))
            .filter((key, alert) -> alert != null);

        // Send alerts
        anomalies.to("anomaly-alerts");

        // Aggregate data for dashboard
        KTable<String, DeviceMetrics> deviceMetrics = validatedData
            .groupBy((key, reading) -> reading.getDeviceId())
            .aggregate(
                DeviceMetrics::new,
                (key, reading, metrics) -> metrics.updateMetrics(reading)
            );

        deviceMetrics.toStream().to("device-metrics");

        // Time-series data for long-term storage
        validatedData
            .mapValues(this::convertToTimeSeriesFormat)
            .to("timeseries-data");
    }

    private AnomalyAlert detectAnomaly(ValidatedReading reading, SensorStats stats) {
        double threshold = stats.getMean() + (3 * stats.getStdDeviation());

        if (Math.abs(reading.getValue()) > threshold) {
            return new AnomalyAlert(
                reading.getSensorId(),
                reading.getValue(),
                threshold,
                System.currentTimeMillis()
            );
        }

        return null;
    }
}
```

This comprehensive Kafka guide provides the essential knowledge for implementing event-driven architectures, stream processing, and real-time data pipelines at an SDE2 level.
