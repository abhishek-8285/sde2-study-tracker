# Microservices & Distributed Systems

## Table of Contents

1. [Microservice Architecture Principles](#microservice-architecture-principles)
2. [Spring Cloud Overview](#spring-cloud-overview)
3. [Service Discovery](#service-discovery)
4. [API Gateway](#api-gateway)
5. [Configuration Management](#configuration-management)
6. [Resilience and Fault Tolerance](#resilience-and-fault-tolerance)
7. [Asynchronous Communication & Messaging](#asynchronous-communication--messaging)
8. [Distributed Tracing](#distributed-tracing)
9. [Best Practices](#best-practices)

---

## Microservice Architecture Principles

### Single Responsibility Principle

Each microservice should have one business responsibility:

```java
// Good: Single responsibility
@RestController
@RequestMapping("/api/users")
public class UserService {
    // Only handles user-related operations

    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userRepository.findById(id);
    }

    @PostMapping
    public User createUser(@RequestBody User user) {
        return userRepository.save(user);
    }
}

// Good: Separate service for orders
@RestController
@RequestMapping("/api/orders")
public class OrderService {
    // Only handles order-related operations

    @GetMapping("/user/{userId}")
    public List<Order> getUserOrders(@PathVariable Long userId) {
        return orderRepository.findByUserId(userId);
    }
}
```

### Bounded Context

Define clear boundaries between services:

```java
// User Context
@Entity
public class User {
    private Long id;
    private String username;
    private String email;
    // User-specific attributes only
}

// Order Context
@Entity
public class Order {
    private Long id;
    private Long customerId; // Reference to user, not embedded
    private BigDecimal amount;
    private LocalDateTime orderDate;
}

// Inventory Context
@Entity
public class Product {
    private Long id;
    private String name;
    private Integer quantity;
    private BigDecimal price;
}
```

### Database Per Service

Each service manages its own data:

```yaml
# user-service/application.yml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/user_db
    username: user_service
    password: password

# order-service/application.yml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/order_db
    username: order_service
    password: password
```

---

## Spring Cloud Overview

### Dependencies

```xml
<!-- Spring Cloud BOM -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-dependencies</artifactId>
            <version>2022.0.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <!-- Service Discovery -->
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
    </dependency>

    <!-- API Gateway -->
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-gateway</artifactId>
    </dependency>

    <!-- Configuration Server -->
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-config-client</artifactId>
    </dependency>

    <!-- Circuit Breaker -->
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-circuitbreaker-resilience4j</artifactId>
    </dependency>
</dependencies>
```

---

## Service Discovery

### Eureka Server Setup

```java
@SpringBootApplication
@EnableEurekaServer
public class EurekaServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(EurekaServerApplication.class, args);
    }
}
```

```yaml
# eureka-server/application.yml
server:
  port: 8761

eureka:
  instance:
    hostname: localhost
  client:
    register-with-eureka: false
    fetch-registry: false
    service-url:
      defaultZone: http://${eureka.instance.hostname}:${server.port}/eureka/
  server:
    enable-self-preservation: false
    eviction-interval-timer-in-ms: 4000
```

### Eureka Client Configuration

```java
@SpringBootApplication
@EnableEurekaClient
public class UserServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(UserServiceApplication.class, args);
    }
}
```

```yaml
# user-service/application.yml
spring:
  application:
    name: user-service

server:
  port: 8081

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
  instance:
    prefer-ip-address: true
    lease-renewal-interval-in-seconds: 10
    lease-expiration-duration-in-seconds: 30
```

### Service Communication with OpenFeign

```java
@FeignClient(name = "user-service")
public interface UserServiceClient {

    @GetMapping("/api/users/{id}")
    User getUserById(@PathVariable("id") Long id);

    @GetMapping("/api/users")
    List<User> getAllUsers();

    @PostMapping("/api/users")
    User createUser(@RequestBody User user);
}
```

```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private UserServiceClient userServiceClient;

    @Autowired
    private OrderService orderService;

    @PostMapping
    public OrderResponse createOrder(@RequestBody CreateOrderRequest request) {
        // Get user details from user service
        User user = userServiceClient.getUserById(request.getUserId());

        if (user == null) {
            throw new UserNotFoundException("User not found");
        }

        Order order = orderService.createOrder(request);
        return buildOrderResponse(order, user);
    }
}
```

### Load Balancing with Ribbon

```java
@Configuration
public class RibbonConfig {

    @Bean
    @LoadBalanced
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}

@Service
public class UserService {

    @Autowired
    @LoadBalanced
    private RestTemplate restTemplate;

    public User getUserById(Long id) {
        return restTemplate.getForObject(
            "http://user-service/api/users/" + id,
            User.class
        );
    }
}
```

---

## API Gateway

### Spring Cloud Gateway Configuration

```java
@SpringBootApplication
public class GatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
```

```yaml
# api-gateway/application.yml
spring:
  application:
    name: api-gateway
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/api/users/**
          filters:
            - StripPrefix=0

        - id: order-service
          uri: lb://order-service
          predicates:
            - Path=/api/orders/**
          filters:
            - StripPrefix=0

        - id: product-service
          uri: lb://product-service
          predicates:
            - Path=/api/products/**
          filters:
            - StripPrefix=0
            - AddRequestHeader=X-Request-Source, gateway

server:
  port: 8080

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
```

### Custom Gateway Filters

```java
@Component
public class AuthenticationFilter implements GatewayFilter {

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        if (!isSecured(request)) {
            return chain.filter(exchange);
        }

        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return unauthorized(exchange);
        }

        String token = authHeader.substring(7);

        if (!jwtTokenProvider.validateToken(token)) {
            return unauthorized(exchange);
        }

        return chain.filter(exchange);
    }

    private boolean isSecured(ServerHttpRequest request) {
        return !request.getPath().value().contains("/api/auth/");
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        return response.setComplete();
    }
}
```

### Gateway Filter Factory

```java
@Component
public class RateLimitGatewayFilterFactory
    extends AbstractGatewayFilterFactory<RateLimitGatewayFilterFactory.Config> {

    public RateLimitGatewayFilterFactory() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            String clientId = getClientId(exchange.getRequest());

            if (isRateLimited(clientId, config)) {
                ServerHttpResponse response = exchange.getResponse();
                response.setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
                return response.setComplete();
            }

            return chain.filter(exchange);
        };
    }

    private String getClientId(ServerHttpRequest request) {
        return request.getRemoteAddress().getAddress().getHostAddress();
    }

    private boolean isRateLimited(String clientId, Config config) {
        // Implementation of rate limiting logic
        return false;
    }

    public static class Config {
        private int requestsPerMinute = 100;

        // Getters and setters
    }
}
```

---

## Configuration Management

### Spring Cloud Config Server

```java
@SpringBootApplication
@EnableConfigServer
public class ConfigServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
    }
}
```

```yaml
# config-server/application.yml
server:
  port: 8888

spring:
  application:
    name: config-server
  cloud:
    config:
      server:
        git:
          uri: https://github.com/your-repo/microservices-config
          clone-on-start: true
          default-label: main
```

### Config Client Setup

```yaml
# user-service/application.yml
spring:
  application:
    name: user-service
  config:
    import: "configserver:http://localhost:8888"
  cloud:
    config:
      profile: dev
      label: main
      fail-fast: true
      retry:
        initial-interval: 1000
        max-attempts: 6
        max-interval: 2000
```

### Configuration Repository Structure

```
microservices-config/
├── user-service.yml
├── user-service-dev.yml
├── user-service-prod.yml
├── order-service.yml
├── order-service-dev.yml
├── order-service-prod.yml
└── application.yml
```

### Dynamic Configuration Refresh

```java
@RestController
@RefreshScope
public class ConfigController {

    @Value("${app.message:Default Message}")
    private String message;

    @Value("${app.feature.enabled:false}")
    private boolean featureEnabled;

    @GetMapping("/config")
    public Map<String, Object> getConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("message", message);
        config.put("featureEnabled", featureEnabled);
        return config;
    }
}
```

---

## Resilience and Fault Tolerance

### Circuit Breaker with Resilience4j

```java
@Component
public class UserServiceClient {

    @Autowired
    private RestTemplate restTemplate;

    @CircuitBreaker(name = "user-service", fallbackMethod = "getUserFallback")
    @Retry(name = "user-service")
    @TimeLimiter(name = "user-service")
    public CompletableFuture<User> getUserById(Long id) {
        return CompletableFuture.supplyAsync(() ->
            restTemplate.getForObject("/api/users/" + id, User.class));
    }

    public CompletableFuture<User> getUserFallback(Long id, Exception ex) {
        User fallbackUser = new User();
        fallbackUser.setId(id);
        fallbackUser.setUsername("Unknown");
        return CompletableFuture.completedFuture(fallbackUser);
    }
}
```

### Resilience4j Configuration

```yaml
resilience4j:
  circuitbreaker:
    instances:
      user-service:
        sliding-window-size: 10
        minimum-number-of-calls: 5
        permitted-number-of-calls-in-half-open-state: 3
        wait-duration-in-open-state: 5s
        failure-rate-threshold: 50

  retry:
    instances:
      user-service:
        max-attempts: 3
        wait-duration: 1s
        exponential-backoff-multiplier: 2

  timelimiter:
    instances:
      user-service:
        timeout-duration: 3s

  bulkhead:
    instances:
      user-service:
        max-concurrent-calls: 10
        max-wait-duration: 1s
```

### Rate Limiter

```java
@Service
public class OrderService {

    @RateLimiter(name = "order-processing")
    public Order processOrder(Order order) {
        // Expensive order processing logic
        return orderRepository.save(order);
    }
}
```

```yaml
resilience4j:
  ratelimiter:
    instances:
      order-processing:
        limit-for-period: 100
        limit-refresh-period: 1s
        timeout-duration: 0s
```

### Health Indicators

```java
@Component
public class UserServiceHealthIndicator implements HealthIndicator {

    @Autowired
    private UserServiceClient userServiceClient;

    @Override
    public Health health() {
        try {
            userServiceClient.healthCheck();
            return Health.up()
                .withDetail("user-service", "Available")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("user-service", "Unavailable")
                .withException(e)
                .build();
        }
    }
}
```

---

## Asynchronous Communication & Messaging

### RabbitMQ Configuration

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>
```

```java
@Configuration
@EnableRabbit
public class RabbitConfig {

    public static final String ORDER_QUEUE = "order.queue";
    public static final String ORDER_EXCHANGE = "order.exchange";
    public static final String ORDER_ROUTING_KEY = "order.created";

    @Bean
    public Queue orderQueue() {
        return QueueBuilder.durable(ORDER_QUEUE).build();
    }

    @Bean
    public TopicExchange orderExchange() {
        return new TopicExchange(ORDER_EXCHANGE);
    }

    @Bean
    public Binding orderBinding() {
        return BindingBuilder
            .bind(orderQueue())
            .to(orderExchange())
            .with(ORDER_ROUTING_KEY);
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(new Jackson2JsonMessageConverter());
        return template;
    }
}
```

### Event Publishing

```java
@Service
public class OrderService {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private OrderRepository orderRepository;

    @Transactional
    public Order createOrder(CreateOrderRequest request) {
        Order order = new Order();
        order.setUserId(request.getUserId());
        order.setAmount(request.getAmount());
        order.setStatus(OrderStatus.CREATED);

        Order saved = orderRepository.save(order);

        // Publish event
        OrderCreatedEvent event = new OrderCreatedEvent(
            saved.getId(),
            saved.getUserId(),
            saved.getAmount()
        );

        rabbitTemplate.convertAndSend(
            RabbitConfig.ORDER_EXCHANGE,
            RabbitConfig.ORDER_ROUTING_KEY,
            event
        );

        return saved;
    }
}
```

### Event Listening

```java
@Component
public class OrderEventListener {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private InventoryService inventoryService;

    @RabbitListener(queues = RabbitConfig.ORDER_QUEUE)
    public void handleOrderCreated(OrderCreatedEvent event) {
        try {
            // Update inventory
            inventoryService.reserveItems(event.getOrderId());

            // Send notification
            notificationService.sendOrderConfirmation(event.getUserId(), event.getOrderId());

        } catch (Exception e) {
            // Handle error - could publish to dead letter queue
            handleOrderProcessingError(event, e);
        }
    }

    private void handleOrderProcessingError(OrderCreatedEvent event, Exception error) {
        // Log error and potentially retry or send to DLQ
    }
}
```

### Apache Kafka Integration

```xml
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>
```

```java
@Configuration
@EnableKafka
public class KafkaConfig {

    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> configProps = new HashMap<>();
        configProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        configProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        configProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        return new DefaultKafkaProducerFactory<>(configProps);
    }

    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }

    @Bean
    public ConsumerFactory<String, Object> consumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "order-service");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        return new DefaultKafkaConsumerFactory<>(props);
    }
}
```

### Kafka Producer

```java
@Service
public class EventPublisher {

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    public void publishOrderEvent(OrderCreatedEvent event) {
        kafkaTemplate.send("order-events", event.getOrderId().toString(), event);
    }

    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        publishOrderEvent(event);
    }
}
```

### Kafka Consumer

```java
@Component
public class OrderEventConsumer {

    @KafkaListener(topics = "order-events", groupId = "notification-service")
    public void handleOrderEvent(OrderCreatedEvent event) {
        // Process order event
        processOrderNotification(event);
    }

    @KafkaListener(topics = "user-events", groupId = "analytics-service")
    public void handleUserEvent(UserEvent event) {
        // Process user event for analytics
        processUserAnalytics(event);
    }
}
```

---

## Distributed Tracing

### Sleuth and Zipkin Setup

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-sleuth</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-sleuth-zipkin</artifactId>
</dependency>
```

```yaml
spring:
  sleuth:
    sampler:
      probability: 1.0 # Sample all requests (use 0.1 for 10% in production)
  zipkin:
    base-url: http://localhost:9411
```

### Custom Spans

```java
@Service
public class OrderService {

    @NewSpan("order-validation")
    public boolean validateOrder(@SpanTag("orderId") Long orderId, Order order) {
        // Validation logic
        return true;
    }

    @Autowired
    private Tracer tracer;

    public Order processOrder(Order order) {
        Span span = tracer.nextSpan().name("order-processing").start();
        try (Tracer.SpanInScope ws = tracer.withSpanInScope(span)) {
            span.tag("order.id", order.getId().toString());
            span.tag("order.amount", order.getAmount().toString());

            // Process order
            return orderRepository.save(order);
        } finally {
            span.end();
        }
    }
}
```

---

## Best Practices

### 1. Service Design

```java
// Good: Domain-driven service boundaries
@RestController
@RequestMapping("/api/orders")
public class OrderService {

    // Handle only order-related operations
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@RequestBody CreateOrderRequest request) {
        // Don't call user service directly here
        // Use event-driven approach or separate the concerns
        Order order = orderBusinessService.createOrder(request);
        return ResponseEntity.ok(mapToResponse(order));
    }
}
```

### 2. Error Handling in Distributed Systems

```java
@Component
public class OrderSagaOrchestrator {

    public void processOrder(CreateOrderRequest request) {
        String sagaId = UUID.randomUUID().toString();

        try {
            // Step 1: Validate user
            validateUser(request.getUserId(), sagaId);

            // Step 2: Reserve inventory
            reserveInventory(request.getItems(), sagaId);

            // Step 3: Process payment
            processPayment(request.getPayment(), sagaId);

            // Step 4: Create order
            createOrder(request, sagaId);

        } catch (Exception e) {
            // Compensate all completed steps
            compensateTransaction(sagaId);
            throw new OrderProcessingException("Order processing failed", e);
        }
    }

    private void compensateTransaction(String sagaId) {
        // Implement compensation logic
        releaseInventory(sagaId);
        refundPayment(sagaId);
    }
}
```

### 3. Data Consistency Patterns

```java
@Service
@Transactional
public class OrderEventHandler {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OutboxEventRepository outboxEventRepository;

    public void createOrder(CreateOrderRequest request) {
        // Create order in same transaction
        Order order = new Order(request);
        orderRepository.save(order);

        // Create outbox event in same transaction
        OutboxEvent event = new OutboxEvent(
            "OrderCreated",
            new OrderCreatedEvent(order),
            EventStatus.PENDING
        );
        outboxEventRepository.save(event);

        // Separate process will publish events from outbox
    }
}
```

### 4. Service Communication Patterns

```java
// Synchronous communication for immediate consistency
@Service
public class OrderValidationService {

    @Autowired
    private UserServiceClient userServiceClient;

    @CircuitBreaker(name = "user-validation", fallbackMethod = "validateUserFallback")
    public boolean validateUser(Long userId) {
        User user = userServiceClient.getUserById(userId);
        return user != null && user.isActive();
    }

    public boolean validateUserFallback(Long userId, Exception ex) {
        // Allow order creation but flag for manual review
        return true;
    }
}

// Asynchronous communication for eventual consistency
@EventListener
public class OrderEventHandler {

    @Async
    public void handleOrderCreated(OrderCreatedEvent event) {
        // Update user statistics asynchronously
        updateUserOrderStats(event.getUserId());

        // Send notifications asynchronously
        sendOrderConfirmationEmail(event);
    }
}
```

### 5. Monitoring and Observability

```java
@RestController
public class HealthController {

    @Autowired
    private List<HealthIndicator> healthIndicators;

    @GetMapping("/health/detailed")
    public ResponseEntity<Map<String, Object>> detailedHealth() {
        Map<String, Object> healthStatus = new HashMap<>();

        for (HealthIndicator indicator : healthIndicators) {
            Health health = indicator.health();
            healthStatus.put(indicator.getClass().getSimpleName(), health.getStatus());
        }

        return ResponseEntity.ok(healthStatus);
    }
}
```

### 6. Security in Microservices

```java
@Configuration
public class JwtSecurityConfig {

    @Bean
    public JwtDecoder jwtDecoder() {
        // Configure JWT decoder for service-to-service communication
        return NimbusJwtDecoder.withJwkSetUri("http://auth-service/oauth2/jwks").build();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.decoder(jwtDecoder()))
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated()
            );

        return http.build();
    }
}
```

This comprehensive guide covers all essential microservices and distributed systems concepts for Spring Boot SDE2 development.
