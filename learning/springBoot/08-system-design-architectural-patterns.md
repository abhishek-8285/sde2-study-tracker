# System Design & Architectural Patterns

## Table of Contents

1. [Software Design Patterns](#software-design-patterns)
2. [Architectural Patterns](#architectural-patterns)
3. [Scalability Concepts](#scalability-concepts)
4. [API Design](#api-design)
5. [Database Design](#database-design)
6. [Caching Strategies](#caching-strategies)
7. [Security Architecture](#security-architecture)
8. [System Design Examples](#system-design-examples)

---

## Software Design Patterns

### Creational Patterns in Spring Boot

#### Singleton Pattern

```java
// Spring naturally implements Singleton for beans
@Component
public class ConfigurationManager {
    private final Map<String, String> config = new HashMap<>();

    @PostConstruct
    public void loadConfiguration() {
        // Load configuration once
        config.put("api.timeout", "5000");
        config.put("max.connections", "100");
    }

    public String getProperty(String key) {
        return config.get(key);
    }
}

// Manual singleton implementation when needed
public class DatabaseConnectionPool {
    private static volatile DatabaseConnectionPool instance;
    private final List<Connection> connections;

    private DatabaseConnectionPool() {
        this.connections = new ArrayList<>();
        initializePool();
    }

    public static DatabaseConnectionPool getInstance() {
        if (instance == null) {
            synchronized (DatabaseConnectionPool.class) {
                if (instance == null) {
                    instance = new DatabaseConnectionPool();
                }
            }
        }
        return instance;
    }

    private void initializePool() {
        // Initialize connection pool
    }
}
```

#### Factory Pattern

```java
@Component
public class NotificationFactory {

    public Notification createNotification(NotificationType type, String message) {
        switch (type) {
            case EMAIL:
                return new EmailNotification(message);
            case SMS:
                return new SmsNotification(message);
            case PUSH:
                return new PushNotification(message);
            default:
                throw new IllegalArgumentException("Unknown notification type: " + type);
        }
    }
}

public interface Notification {
    void send(String recipient);
}

public class EmailNotification implements Notification {
    private final String message;

    public EmailNotification(String message) {
        this.message = message;
    }

    @Override
    public void send(String recipient) {
        // Send email logic
        System.out.println("Sending email to " + recipient + ": " + message);
    }
}

// Abstract Factory for different environments
@Configuration
public class ServiceFactory {

    @Bean
    @Profile("production")
    public PaymentService productionPaymentService() {
        return new StripePaymentService();
    }

    @Bean
    @Profile("development")
    public PaymentService developmentPaymentService() {
        return new MockPaymentService();
    }
}
```

#### Builder Pattern

```java
public class User {
    private final String username;
    private final String email;
    private final String firstName;
    private final String lastName;
    private final boolean active;
    private final Set<Role> roles;

    private User(Builder builder) {
        this.username = builder.username;
        this.email = builder.email;
        this.firstName = builder.firstName;
        this.lastName = builder.lastName;
        this.active = builder.active;
        this.roles = builder.roles;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String username;
        private String email;
        private String firstName;
        private String lastName;
        private boolean active = true;
        private Set<Role> roles = new HashSet<>();

        public Builder username(String username) {
            this.username = username;
            return this;
        }

        public Builder email(String email) {
            this.email = email;
            return this;
        }

        public Builder firstName(String firstName) {
            this.firstName = firstName;
            return this;
        }

        public Builder lastName(String lastName) {
            this.lastName = lastName;
            return this;
        }

        public Builder active(boolean active) {
            this.active = active;
            return this;
        }

        public Builder addRole(Role role) {
            this.roles.add(role);
            return this;
        }

        public User build() {
            if (username == null || email == null) {
                throw new IllegalStateException("Username and email are required");
            }
            return new User(this);
        }
    }
}

// Usage
User user = User.builder()
    .username("john_doe")
    .email("john@example.com")
    .firstName("John")
    .lastName("Doe")
    .addRole(Role.USER)
    .build();
```

### Structural Patterns

#### Adapter Pattern

```java
// Third-party payment service with different interface
public class LegacyPaymentService {
    public boolean makePayment(String accountNumber, double amount) {
        // Legacy payment logic
        return true;
    }
}

// Our standard payment interface
public interface PaymentService {
    PaymentResult processPayment(PaymentRequest request);
}

// Adapter to integrate legacy service
@Component
public class LegacyPaymentAdapter implements PaymentService {

    private final LegacyPaymentService legacyService;

    public LegacyPaymentAdapter(LegacyPaymentService legacyService) {
        this.legacyService = legacyService;
    }

    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        // Adapt the interface
        boolean success = legacyService.makePayment(
            request.getAccountNumber(),
            request.getAmount().doubleValue()
        );

        return PaymentResult.builder()
            .success(success)
            .transactionId(UUID.randomUUID().toString())
            .amount(request.getAmount())
            .build();
    }
}
```

#### Decorator Pattern

```java
public interface UserService {
    User createUser(CreateUserRequest request);
    User findById(Long id);
}

@Service
public class BasicUserService implements UserService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public User createUser(CreateUserRequest request) {
        User user = new User(request.getUsername(), request.getEmail());
        return userRepository.save(user);
    }

    @Override
    public User findById(Long id) {
        return userRepository.findById(id).orElse(null);
    }
}

// Decorator for caching
@Component
@Primary
public class CachedUserService implements UserService {

    private final UserService userService;
    private final CacheManager cacheManager;

    public CachedUserService(@Qualifier("basicUserService") UserService userService,
                            CacheManager cacheManager) {
        this.userService = userService;
        this.cacheManager = cacheManager;
    }

    @Override
    public User createUser(CreateUserRequest request) {
        User user = userService.createUser(request);
        // Cache the created user
        cacheManager.getCache("users").put(user.getId(), user);
        return user;
    }

    @Override
    public User findById(Long id) {
        Cache.ValueWrapper cachedUser = cacheManager.getCache("users").get(id);
        if (cachedUser != null) {
            return (User) cachedUser.get();
        }

        User user = userService.findById(id);
        if (user != null) {
            cacheManager.getCache("users").put(id, user);
        }
        return user;
    }
}

// Decorator for logging
@Component
public class LoggingUserService implements UserService {

    private final UserService userService;
    private static final Logger logger = LoggerFactory.getLogger(LoggingUserService.class);

    public LoggingUserService(@Qualifier("cachedUserService") UserService userService) {
        this.userService = userService;
    }

    @Override
    public User createUser(CreateUserRequest request) {
        logger.info("Creating user with email: {}", request.getEmail());
        try {
            User user = userService.createUser(request);
            logger.info("User created successfully with ID: {}", user.getId());
            return user;
        } catch (Exception e) {
            logger.error("Failed to create user with email: {}", request.getEmail(), e);
            throw e;
        }
    }

    @Override
    public User findById(Long id) {
        logger.debug("Finding user by ID: {}", id);
        User user = userService.findById(id);
        if (user != null) {
            logger.debug("User found: {}", user.getUsername());
        } else {
            logger.debug("User not found with ID: {}", id);
        }
        return user;
    }
}
```

### Behavioral Patterns

#### Strategy Pattern

```java
public interface PricingStrategy {
    BigDecimal calculatePrice(Order order);
}

@Component("regularPricing")
public class RegularPricingStrategy implements PricingStrategy {
    @Override
    public BigDecimal calculatePrice(Order order) {
        return order.getItems().stream()
            .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}

@Component("premiumPricing")
public class PremiumPricingStrategy implements PricingStrategy {
    @Override
    public BigDecimal calculatePrice(Order order) {
        BigDecimal basePrice = order.getItems().stream()
            .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 10% discount for premium customers
        return basePrice.multiply(BigDecimal.valueOf(0.9));
    }
}

@Service
public class OrderService {

    private final Map<String, PricingStrategy> pricingStrategies;

    public OrderService(Map<String, PricingStrategy> pricingStrategies) {
        this.pricingStrategies = pricingStrategies;
    }

    public Order calculateOrderPrice(Order order, CustomerType customerType) {
        PricingStrategy strategy = getPricingStrategy(customerType);
        BigDecimal price = strategy.calculatePrice(order);
        order.setTotalPrice(price);
        return order;
    }

    private PricingStrategy getPricingStrategy(CustomerType customerType) {
        switch (customerType) {
            case PREMIUM:
                return pricingStrategies.get("premiumPricing");
            case REGULAR:
            default:
                return pricingStrategies.get("regularPricing");
        }
    }
}
```

#### Observer Pattern (Event-Driven)

```java
// Domain event
public class UserCreatedEvent {
    private final Long userId;
    private final String email;
    private final LocalDateTime timestamp;

    public UserCreatedEvent(Long userId, String email) {
        this.userId = userId;
        this.email = email;
        this.timestamp = LocalDateTime.now();
    }

    // Getters
}

// Event publisher
@Service
public class UserService {

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public User createUser(CreateUserRequest request) {
        User user = new User(request.getUsername(), request.getEmail());
        User savedUser = userRepository.save(user);

        // Publish event
        eventPublisher.publishEvent(new UserCreatedEvent(savedUser.getId(), savedUser.getEmail()));

        return savedUser;
    }
}

// Event listeners
@Component
@Slf4j
public class UserEventHandlers {

    @Autowired
    private EmailService emailService;

    @Autowired
    private AnalyticsService analyticsService;

    @EventListener
    @Async
    public void handleUserCreated(UserCreatedEvent event) {
        log.info("User created event received for user ID: {}", event.getUserId());

        // Send welcome email
        emailService.sendWelcomeEmail(event.getEmail());

        // Track analytics
        analyticsService.trackUserRegistration(event.getUserId());
    }

    @EventListener
    @Async
    public void createUserProfile(UserCreatedEvent event) {
        // Create user profile in a separate service
        profileService.createDefaultProfile(event.getUserId());
    }
}
```

#### Command Pattern

```java
public interface Command {
    void execute();
    void undo();
}

public class CreateUserCommand implements Command {
    private final UserRepository userRepository;
    private final CreateUserRequest request;
    private User createdUser;

    public CreateUserCommand(UserRepository userRepository, CreateUserRequest request) {
        this.userRepository = userRepository;
        this.request = request;
    }

    @Override
    public void execute() {
        createdUser = new User(request.getUsername(), request.getEmail());
        userRepository.save(createdUser);
    }

    @Override
    public void undo() {
        if (createdUser != null) {
            userRepository.delete(createdUser);
        }
    }
}

@Service
public class CommandInvoker {
    private final Stack<Command> history = new Stack<>();

    public void executeCommand(Command command) {
        command.execute();
        history.push(command);
    }

    public void undoLastCommand() {
        if (!history.isEmpty()) {
            Command lastCommand = history.pop();
            lastCommand.undo();
        }
    }
}
```

---

## Architectural Patterns

### Layered Architecture

```java
// Presentation Layer
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderApplicationService orderApplicationService;

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@RequestBody CreateOrderRequest request) {
        OrderResponse response = orderApplicationService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}

// Application Layer (Use Cases/Business Logic)
@Service
@Transactional
public class OrderApplicationService {

    @Autowired
    private OrderDomainService orderDomainService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    public OrderResponse createOrder(CreateOrderRequest request) {
        // Validate user exists
        User user = userRepository.findById(request.getUserId())
            .orElseThrow(() -> new UserNotFoundException("User not found"));

        // Create order using domain service
        Order order = orderDomainService.createOrder(user, request.getItems());

        // Persist order
        Order savedOrder = orderRepository.save(order);

        // Return response
        return OrderResponse.from(savedOrder);
    }
}

// Domain Layer (Business Logic)
@Service
public class OrderDomainService {

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private PricingService pricingService;

    public Order createOrder(User user, List<OrderItem> items) {
        // Business rules validation
        validateOrderItems(items);

        // Check inventory
        if (!inventoryService.isAvailable(items)) {
            throw new InsufficientInventoryException("Items not available");
        }

        // Calculate pricing
        BigDecimal totalPrice = pricingService.calculateTotal(items, user.getCustomerType());

        // Create order
        Order order = new Order(user.getId(), items, totalPrice);

        // Apply business rules
        if (totalPrice.compareTo(BigDecimal.valueOf(1000)) > 0) {
            order.setExpressShipping(true);
        }

        return order;
    }

    private void validateOrderItems(List<OrderItem> items) {
        if (items == null || items.isEmpty()) {
            throw new InvalidOrderException("Order must contain at least one item");
        }

        for (OrderItem item : items) {
            if (item.getQuantity() <= 0) {
                throw new InvalidOrderException("Item quantity must be positive");
            }
        }
    }
}

// Infrastructure Layer (Data Access)
@Repository
public class JpaOrderRepository implements OrderRepository {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public Order save(Order order) {
        if (order.getId() == null) {
            entityManager.persist(order);
            return order;
        } else {
            return entityManager.merge(order);
        }
    }

    @Override
    public Optional<Order> findById(Long id) {
        Order order = entityManager.find(Order.class, id);
        return Optional.ofNullable(order);
    }
}
```

### Hexagonal Architecture (Ports and Adapters)

```java
// Domain Model
public class Order {
    private Long id;
    private Long userId;
    private List<OrderItem> items;
    private BigDecimal totalPrice;
    private OrderStatus status;

    // Business methods
    public void confirm() {
        if (status != OrderStatus.PENDING) {
            throw new IllegalStateException("Only pending orders can be confirmed");
        }
        this.status = OrderStatus.CONFIRMED;
    }

    public void cancel() {
        if (status == OrderStatus.SHIPPED || status == OrderStatus.DELIVERED) {
            throw new IllegalStateException("Cannot cancel shipped or delivered orders");
        }
        this.status = OrderStatus.CANCELLED;
    }
}

// Primary Port (Inbound)
public interface OrderService {
    Order createOrder(CreateOrderCommand command);
    Order confirmOrder(Long orderId);
    Order cancelOrder(Long orderId);
    Order findById(Long id);
}

// Secondary Port (Outbound)
public interface OrderRepository {
    Order save(Order order);
    Optional<Order> findById(Long id);
    List<Order> findByUserId(Long userId);
}

public interface PaymentGateway {
    PaymentResult processPayment(PaymentRequest request);
}

public interface InventoryService {
    boolean reserveItems(List<OrderItem> items);
    void releaseItems(List<OrderItem> items);
}

// Primary Adapter (Inbound) - REST Controller
@RestController
@RequestMapping("/api/orders")
public class OrderRestController {

    private final OrderService orderService;

    public OrderRestController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<OrderDto> createOrder(@RequestBody CreateOrderRequest request) {
        CreateOrderCommand command = CreateOrderCommand.builder()
            .userId(request.getUserId())
            .items(request.getItems())
            .build();

        Order order = orderService.createOrder(command);
        return ResponseEntity.ok(OrderDto.from(order));
    }
}

// Secondary Adapter (Outbound) - JPA Repository
@Repository
public class JpaOrderRepositoryAdapter implements OrderRepository {

    private final JpaOrderRepository jpaRepository;

    public JpaOrderRepositoryAdapter(JpaOrderRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Order save(Order order) {
        OrderEntity entity = OrderEntity.from(order);
        OrderEntity saved = jpaRepository.save(entity);
        return saved.toDomain();
    }

    @Override
    public Optional<Order> findById(Long id) {
        return jpaRepository.findById(id)
            .map(OrderEntity::toDomain);
    }
}

// Application Service (Core)
@Service
@Transactional
public class OrderApplicationService implements OrderService {

    private final OrderRepository orderRepository;
    private final PaymentGateway paymentGateway;
    private final InventoryService inventoryService;

    public OrderApplicationService(OrderRepository orderRepository,
                                 PaymentGateway paymentGateway,
                                 InventoryService inventoryService) {
        this.orderRepository = orderRepository;
        this.paymentGateway = paymentGateway;
        this.inventoryService = inventoryService;
    }

    @Override
    public Order createOrder(CreateOrderCommand command) {
        // Reserve inventory
        if (!inventoryService.reserveItems(command.getItems())) {
            throw new InsufficientInventoryException("Items not available");
        }

        try {
            // Create order
            Order order = new Order(command.getUserId(), command.getItems());

            // Process payment
            PaymentResult paymentResult = paymentGateway.processPayment(
                PaymentRequest.from(order));

            if (paymentResult.isSuccess()) {
                order.confirm();
            } else {
                inventoryService.releaseItems(command.getItems());
                throw new PaymentFailedException("Payment failed");
            }

            return orderRepository.save(order);

        } catch (Exception e) {
            inventoryService.releaseItems(command.getItems());
            throw e;
        }
    }
}
```

### CQRS (Command Query Responsibility Segregation)

```java
// Command Side
public interface OrderCommandHandler {
    void handle(CreateOrderCommand command);
    void handle(CancelOrderCommand command);
}

@Component
public class OrderCommandHandlerImpl implements OrderCommandHandler {

    private final OrderWriteRepository writeRepository;
    private final EventPublisher eventPublisher;

    @Override
    @Transactional
    public void handle(CreateOrderCommand command) {
        Order order = new Order(command.getUserId(), command.getItems());
        writeRepository.save(order);

        eventPublisher.publish(new OrderCreatedEvent(order.getId(), order.getUserId()));
    }

    @Override
    @Transactional
    public void handle(CancelOrderCommand command) {
        Order order = writeRepository.findById(command.getOrderId())
            .orElseThrow(() -> new OrderNotFoundException("Order not found"));

        order.cancel();
        writeRepository.save(order);

        eventPublisher.publish(new OrderCancelledEvent(order.getId()));
    }
}

// Query Side
public interface OrderQueryHandler {
    OrderView findById(Long id);
    List<OrderView> findByUserId(Long userId);
    OrderSummary getOrderSummary(Long userId);
}

@Component
public class OrderQueryHandlerImpl implements OrderQueryHandler {

    private final OrderReadRepository readRepository;

    @Override
    public OrderView findById(Long id) {
        return readRepository.findOrderViewById(id)
            .orElseThrow(() -> new OrderNotFoundException("Order not found"));
    }

    @Override
    public List<OrderView> findByUserId(Long userId) {
        return readRepository.findOrderViewsByUserId(userId);
    }

    @Override
    public OrderSummary getOrderSummary(Long userId) {
        return readRepository.getOrderSummaryByUserId(userId);
    }
}

// Read Model Projections
@EventListener
@Component
public class OrderProjectionHandler {

    private final OrderViewRepository orderViewRepository;

    @EventListener
    public void on(OrderCreatedEvent event) {
        OrderView view = new OrderView(
            event.getOrderId(),
            event.getUserId(),
            event.getItems(),
            OrderStatus.PENDING,
            event.getTimestamp()
        );
        orderViewRepository.save(view);
    }

    @EventListener
    public void on(OrderCancelledEvent event) {
        OrderView view = orderViewRepository.findById(event.getOrderId())
            .orElseThrow();
        view.setStatus(OrderStatus.CANCELLED);
        orderViewRepository.save(view);
    }
}
```

---

## Scalability Concepts

### Horizontal vs Vertical Scaling

#### Vertical Scaling (Scale Up)

```yaml
# application.yml - Optimized for single instance
server:
  tomcat:
    threads:
      max: 200
      min-spare: 10
    max-connections: 10000
    accept-count: 100

spring:
  datasource:
    hikari:
      maximum-pool-size: 50
      minimum-idle: 10
      connection-timeout: 30000
      idle-timeout: 600000

# JVM tuning for larger instance
JAVA_OPTS: "-Xmx8g -Xms4g -XX:+UseG1GC -XX:MaxGCPauseMillis=200"
```

#### Horizontal Scaling (Scale Out)

```java
@Configuration
@EnableScheduling
public class SchedulingConfig {

    // Distributed scheduling to avoid duplicate execution
    @Bean
    public TaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(5);
        scheduler.setThreadNamePrefix("scheduled-task-");
        scheduler.setAwaitTerminationSeconds(60);
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        return scheduler;
    }
}

@Component
public class DistributedScheduledTasks {

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    @Scheduled(fixedRate = 60000) // Every minute
    public void processScheduledTasks() {
        String lockKey = "scheduled:process-orders";
        String instanceId = InetAddress.getLocalHost().getHostName();

        // Distributed lock to ensure only one instance processes
        Boolean lockAcquired = redisTemplate.opsForValue()
            .setIfAbsent(lockKey, instanceId, Duration.ofMinutes(2));

        if (Boolean.TRUE.equals(lockAcquired)) {
            try {
                // Process scheduled tasks
                processOrders();
            } finally {
                // Release lock
                redisTemplate.delete(lockKey);
            }
        }
    }
}
```

### Load Balancing Strategies

```java
// Client-side load balancing with Ribbon
@Configuration
public class LoadBalancerConfig {

    @Bean
    @LoadBalanced
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    // Custom load balancing rule
    @Bean
    public IRule ribbonRule() {
        return new WeightedResponseTimeRule(); // or RoundRobinRule, RandomRule
    }
}

// Service discovery aware load balancing
@Service
public class UserServiceClient {

    @Autowired
    @LoadBalanced
    private RestTemplate restTemplate;

    public User getUserById(Long id) {
        // This will automatically load balance across available instances
        return restTemplate.getForObject("http://user-service/api/users/" + id, User.class);
    }
}
```

### Database Scaling Patterns

#### Read Replicas

```java
@Configuration
public class DatabaseConfig {

    @Bean
    @Primary
    public DataSource writeDataSource() {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl("jdbc:mysql://master-db:3306/myapp");
        dataSource.setUsername("app_user");
        dataSource.setPassword("password");
        return dataSource;
    }

    @Bean
    public DataSource readDataSource() {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl("jdbc:mysql://replica-db:3306/myapp");
        dataSource.setUsername("app_user");
        dataSource.setPassword("password");
        dataSource.setReadOnly(true);
        return dataSource;
    }
}

@Service
public class UserService {

    @Autowired
    @Qualifier("writeDataSource")
    private DataSource writeDataSource;

    @Autowired
    @Qualifier("readDataSource")
    private DataSource readDataSource;

    @Transactional // Uses write datasource
    public User createUser(CreateUserRequest request) {
        // Write operations go to master
        return userRepository.save(new User(request));
    }

    @Transactional(readOnly = true) // Uses read datasource
    public List<User> findAllUsers() {
        // Read operations can go to replica
        return userRepository.findAll();
    }
}
```

#### Database Sharding

```java
@Configuration
public class ShardingConfig {

    @Bean
    public DataSource shardedDataSource() {
        Map<Object, Object> dataSourceMap = new HashMap<>();

        // Shard 0: Users with ID 0-999
        dataSourceMap.put("shard0", createDataSource("shard0-db:3306"));

        // Shard 1: Users with ID 1000-1999
        dataSourceMap.put("shard1", createDataSource("shard1-db:3306"));

        ShardingDataSource shardingDataSource = new ShardingDataSource();
        shardingDataSource.setTargetDataSources(dataSourceMap);
        shardingDataSource.setDefaultTargetDataSource(dataSourceMap.get("shard0"));

        return shardingDataSource;
    }

    private DataSource createDataSource(String url) {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl("jdbc:mysql://" + url + "/myapp");
        dataSource.setUsername("app_user");
        dataSource.setPassword("password");
        return dataSource;
    }
}

@Component
public class ShardingStrategy {

    public String determineShardKey(Long userId) {
        // Simple modulo-based sharding
        return "shard" + (userId % 2);
    }

    public void setShardContext(Long userId) {
        String shardKey = determineShardKey(userId);
        ShardContextHolder.setShardKey(shardKey);
    }

    public void clearShardContext() {
        ShardContextHolder.clear();
    }
}
```

---

## API Design

### RESTful API Design Principles

```java
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    // GET /api/v1/users - List users with pagination
    @GetMapping
    public ResponseEntity<PagedResponse<UserSummary>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir,
            @RequestParam(required = false) String search) {

        Pageable pageable = createPageable(page, size, sortBy, sortDir);
        Page<UserSummary> users = userService.findUsers(search, pageable);

        PagedResponse<UserSummary> response = PagedResponse.<UserSummary>builder()
            .content(users.getContent())
            .page(users.getNumber())
            .size(users.getSize())
            .totalElements(users.getTotalElements())
            .totalPages(users.getTotalPages())
            .first(users.isFirst())
            .last(users.isLast())
            .build();

        return ResponseEntity.ok(response);
    }

    // GET /api/v1/users/{id} - Get specific user
    @GetMapping("/{id}")
    public ResponseEntity<UserDetail> getUser(@PathVariable Long id) {
        return userService.findById(id)
            .map(user -> ResponseEntity.ok(UserDetail.from(user)))
            .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/v1/users - Create new user
    @PostMapping
    public ResponseEntity<UserDetail> createUser(
            @Valid @RequestBody CreateUserRequest request,
            UriComponentsBuilder uriBuilder) {

        UserDetail user = userService.createUser(request);

        URI location = uriBuilder
            .path("/api/v1/users/{id}")
            .buildAndExpand(user.getId())
            .toUri();

        return ResponseEntity.created(location).body(user);
    }

    // PUT /api/v1/users/{id} - Update entire user
    @PutMapping("/{id}")
    public ResponseEntity<UserDetail> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request) {

        return userService.updateUser(id, request)
            .map(user -> ResponseEntity.ok(UserDetail.from(user)))
            .orElse(ResponseEntity.notFound().build());
    }

    // PATCH /api/v1/users/{id} - Partial update
    @PatchMapping("/{id}")
    public ResponseEntity<UserDetail> patchUser(
            @PathVariable Long id,
            @RequestBody Map<String, Object> updates) {

        return userService.patchUser(id, updates)
            .map(user -> ResponseEntity.ok(UserDetail.from(user)))
            .orElse(ResponseEntity.notFound().build());
    }

    // DELETE /api/v1/users/{id} - Delete user
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (userService.deleteUser(id)) {
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Nested resources: GET /api/v1/users/{id}/orders
    @GetMapping("/{id}/orders")
    public ResponseEntity<List<OrderSummary>> getUserOrders(@PathVariable Long id) {
        List<OrderSummary> orders = orderService.findOrdersByUserId(id);
        return ResponseEntity.ok(orders);
    }
}
```

### GraphQL API Design

```java
@Component
public class UserGraphQLResolver implements GraphQLQueryResolver, GraphQLMutationResolver {

    @Autowired
    private UserService userService;

    @Autowired
    private OrderService orderService;

    // Query: users(first: Int, after: String, search: String): UserConnection
    public UserConnection users(Integer first, String after, String search, DataFetchingEnvironment env) {
        // Check if orders field is requested to avoid N+1 problem
        DataFetchingFieldSelectionSet selectionSet = env.getSelectionSet();
        boolean includeOrders = selectionSet.contains("edges/node/orders");

        PageRequest pageRequest = PageRequest.of(0, first != null ? first : 20);
        Page<User> userPage = userService.findUsers(search, pageRequest, includeOrders);

        return UserConnection.builder()
            .edges(userPage.getContent().stream()
                .map(user -> UserEdge.builder()
                    .node(UserNode.from(user))
                    .cursor(encodeCursor(user.getId()))
                    .build())
                .collect(Collectors.toList()))
            .pageInfo(PageInfo.builder()
                .hasNextPage(userPage.hasNext())
                .hasPreviousPage(userPage.hasPrevious())
                .startCursor(encodeCursor(userPage.getContent().get(0).getId()))
                .endCursor(encodeCursor(userPage.getContent().get(userPage.getContent().size() - 1).getId()))
                .build())
            .build();
    }

    // Mutation: createUser(input: CreateUserInput!): CreateUserPayload
    public CreateUserPayload createUser(CreateUserInput input) {
        try {
            User user = userService.createUser(CreateUserRequest.from(input));
            return CreateUserPayload.builder()
                .user(UserNode.from(user))
                .build();
        } catch (ValidationException e) {
            return CreateUserPayload.builder()
                .errors(e.getErrors().stream()
                    .map(error -> UserError.builder()
                        .field(error.getField())
                        .message(error.getMessage())
                        .build())
                    .collect(Collectors.toList()))
                .build();
        }
    }

    // Field resolver for User.orders
    public List<OrderNode> orders(UserNode user, DataFetchingEnvironment env) {
        return orderService.findOrdersByUserId(user.getId()).stream()
            .map(OrderNode::from)
            .collect(Collectors.toList());
    }
}
```

### gRPC API Design

```protobuf
// user_service.proto
syntax = "proto3";

package com.example.user;

service UserService {
  rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
  rpc UpdateUser(UpdateUserRequest) returns (UpdateUserResponse);
  rpc DeleteUser(DeleteUserRequest) returns (DeleteUserResponse);

  // Server streaming
  rpc StreamUsers(StreamUsersRequest) returns (stream User);

  // Bidirectional streaming
  rpc BatchUpdateUsers(stream UpdateUserRequest) returns (stream UpdateUserResponse);
}

message User {
  int64 id = 1;
  string username = 2;
  string email = 3;
  bool active = 4;
  google.protobuf.Timestamp created_at = 5;
}

message CreateUserRequest {
  string username = 1;
  string email = 2;
  string password = 3;
}

message CreateUserResponse {
  User user = 1;
  repeated string errors = 2;
}
```

```java
@GrpcService
public class UserGrpcService extends UserServiceGrpc.UserServiceImplBase {

    @Autowired
    private UserService userService;

    @Override
    public void createUser(CreateUserRequest request, StreamObserver<CreateUserResponse> responseObserver) {
        try {
            User user = userService.createUser(mapToCreateUserRequest(request));

            CreateUserResponse response = CreateUserResponse.newBuilder()
                .setUser(mapToGrpcUser(user))
                .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (ValidationException e) {
            CreateUserResponse response = CreateUserResponse.newBuilder()
                .addAllErrors(e.getErrors())
                .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL
                .withDescription("Internal server error")
                .withCause(e)
                .asRuntimeException());
        }
    }

    @Override
    public void streamUsers(StreamUsersRequest request, StreamObserver<User> responseObserver) {
        try {
            userService.streamUsers(request.getBatchSize())
                .forEach(user -> {
                    responseObserver.onNext(mapToGrpcUser(user));
                });
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(e);
        }
    }
}
```

---

## Database Design

### SQL Database Design Principles

```sql
-- Users table with proper indexing
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,

    INDEX idx_users_email (email),
    INDEX idx_users_username (username),
    INDEX idx_users_active (is_active),
    INDEX idx_users_created_at (created_at)
);

-- Orders table with foreign key relationships
CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_orders_user_id (user_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_created_at (created_at),
    INDEX idx_orders_order_number (order_number)
);

-- Order items with composite key
CREATE TABLE order_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,

    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_items_order_id (order_id),
    INDEX idx_order_items_product_id (product_id)
);
```

### NoSQL Database Design

```java
// MongoDB document design
@Document(collection = "users")
public class UserDocument {
    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    @Indexed(unique = true)
    private String email;

    private String passwordHash;
    private String firstName;
    private String lastName;
    private boolean active;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // Embedded profile data
    private UserProfile profile;

    // Embedded addresses (one-to-few relationship)
    private List<Address> addresses;

    // Reference to orders (one-to-many relationship)
    @DBRef
    private List<Order> recentOrders; // Only keep recent orders embedded

    // Denormalized data for performance
    private int totalOrders;
    private BigDecimal totalSpent;
}

// Order document with denormalized user data
@Document(collection = "orders")
public class OrderDocument {
    @Id
    private String id;

    private String orderNumber;

    // Denormalized user data for queries
    private String userId;
    private String userEmail;
    private String userName;

    private OrderStatus status;
    private BigDecimal totalAmount;

    // Embedded order items
    private List<OrderItem> items;

    // Embedded shipping address
    private Address shippingAddress;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}

@Repository
public class UserDocumentRepository {

    @Autowired
    private MongoTemplate mongoTemplate;

    public List<UserDocument> findActiveUsersWithMinOrders(int minOrders) {
        Query query = new Query();
        query.addCriteria(Criteria.where("active").is(true)
            .and("totalOrders").gte(minOrders));
        query.with(Sort.by(Sort.Direction.DESC, "totalSpent"));

        return mongoTemplate.find(query, UserDocument.class);
    }

    public void updateUserOrderStats(String userId, int orderCount, BigDecimal totalSpent) {
        Query query = new Query(Criteria.where("id").is(userId));
        Update update = new Update()
            .set("totalOrders", orderCount)
            .set("totalSpent", totalSpent);

        mongoTemplate.updateFirst(query, update, UserDocument.class);
    }
}
```

### Database Migration Strategies

```java
// Data migration service
@Service
public class DatabaseMigrationService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UserRepository userRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void handleApplicationReady() {
        migrateLegacyData();
    }

    @Transactional
    public void migrateLegacyData() {
        // Check if migration is needed
        if (isMigrationCompleted("user_profile_migration_v1")) {
            return;
        }

        // Batch processing for large datasets
        int batchSize = 1000;
        int offset = 0;

        while (true) {
            List<Map<String, Object>> legacyUsers = jdbcTemplate.queryForList(
                "SELECT * FROM legacy_users LIMIT ? OFFSET ?", batchSize, offset);

            if (legacyUsers.isEmpty()) {
                break;
            }

            // Process batch
            legacyUsers.forEach(this::migrateLegacyUser);

            offset += batchSize;

            // Log progress
            log.info("Migrated {} users", offset);
        }

        // Mark migration as completed
        markMigrationCompleted("user_profile_migration_v1");
    }

    private void migrateLegacyUser(Map<String, Object> legacyData) {
        User user = User.builder()
            .username((String) legacyData.get("login_name"))
            .email((String) legacyData.get("email_address"))
            .firstName((String) legacyData.get("fname"))
            .lastName((String) legacyData.get("lname"))
            .active((Boolean) legacyData.get("is_enabled"))
            .build();

        userRepository.save(user);
    }

    private boolean isMigrationCompleted(String migrationId) {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM migration_history WHERE migration_id = ?",
            Integer.class, migrationId);
        return count != null && count > 0;
    }

    private void markMigrationCompleted(String migrationId) {
        jdbcTemplate.update(
            "INSERT INTO migration_history (migration_id, completed_at) VALUES (?, ?)",
            migrationId, LocalDateTime.now());
    }
}
```

---

## Caching Strategies

### Multi-Level Caching

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        // L1 Cache: Local in-memory cache
        CaffeineCacheManager caffeineCacheManager = new CaffeineCacheManager();
        caffeineCacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(5, TimeUnit.MINUTES));

        // L2 Cache: Redis distributed cache
        RedisCacheManager redisCacheManager = RedisCacheManager.builder(redisConnectionFactory())
            .cacheDefaults(redisCacheConfiguration())
            .build();

        // Composite cache manager
        CompositeCacheManager compositeCacheManager = new CompositeCacheManager();
        compositeCacheManager.setCacheManagers(caffeineCacheManager, redisCacheManager);
        compositeCacheManager.setFallbackToNoOpCache(false);

        return compositeCacheManager;
    }

    private RedisCacheConfiguration redisCacheConfiguration() {
        return RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(30))
            .serializeKeysWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer()));
    }
}

@Service
public class UserCacheService {

    @Cacheable(value = "users", key = "#id", condition = "#id != null")
    public User findById(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    @CachePut(value = "users", key = "#user.id")
    public User save(User user) {
        return userRepository.save(user);
    }

    @CacheEvict(value = "users", key = "#id")
    public void deleteById(Long id) {
        userRepository.deleteById(id);
    }

    @CacheEvict(value = "users", allEntries = true)
    public void clearUserCache() {
        // Method implementation doesn't matter for @CacheEvict
    }

    // Cache with TTL
    @Cacheable(value = "user-stats", key = "#userId")
    public UserStats getUserStats(Long userId) {
        return calculateUserStats(userId);
    }

    // Conditional caching
    @Cacheable(value = "expensive-calculation",
               key = "#params.hashCode()",
               condition = "#params.size() > 10",
               unless = "#result.isEmpty()")
    public List<String> expensiveCalculation(List<String> params) {
        // Expensive calculation
        return params.stream()
            .map(this::processExpensively)
            .collect(Collectors.toList());
    }
}
```

### Cache-Aside Pattern

```java
@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private RedisTemplate<String, Product> redisTemplate;

    private static final String PRODUCT_CACHE_KEY = "product:";
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    public Product findById(Long id) {
        String cacheKey = PRODUCT_CACHE_KEY + id;

        // Try cache first
        Product cachedProduct = redisTemplate.opsForValue().get(cacheKey);
        if (cachedProduct != null) {
            return cachedProduct;
        }

        // Cache miss - fetch from database
        Optional<Product> product = productRepository.findById(id);
        if (product.isPresent()) {
            // Store in cache for future requests
            redisTemplate.opsForValue().set(cacheKey, product.get(), CACHE_TTL);
            return product.get();
        }

        return null;
    }

    public Product save(Product product) {
        Product saved = productRepository.save(product);

        // Update cache
        String cacheKey = PRODUCT_CACHE_KEY + saved.getId();
        redisTemplate.opsForValue().set(cacheKey, saved, CACHE_TTL);

        return saved;
    }

    public void deleteById(Long id) {
        productRepository.deleteById(id);

        // Remove from cache
        String cacheKey = PRODUCT_CACHE_KEY + id;
        redisTemplate.delete(cacheKey);
    }
}
```

### Write-Through and Write-Behind Patterns

```java
@Service
public class OrderCacheService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private RedisTemplate<String, Order> redisTemplate;

    @Autowired
    private TaskExecutor taskExecutor;

    // Write-Through: Write to cache and database synchronously
    public Order saveWithWriteThrough(Order order) {
        // Save to database first
        Order saved = orderRepository.save(order);

        // Then update cache
        String cacheKey = "order:" + saved.getId();
        redisTemplate.opsForValue().set(cacheKey, saved, Duration.ofMinutes(30));

        return saved;
    }

    // Write-Behind: Write to cache immediately, database asynchronously
    public Order saveWithWriteBehind(Order order) {
        // Update cache immediately
        String cacheKey = "order:" + order.getId();
        redisTemplate.opsForValue().set(cacheKey, order, Duration.ofMinutes(30));

        // Schedule database write asynchronously
        taskExecutor.execute(() -> {
            try {
                orderRepository.save(order);
            } catch (Exception e) {
                // Handle database write failure
                log.error("Failed to write order to database: {}", order.getId(), e);
                // Optionally remove from cache or retry
            }
        });

        return order;
    }
}
```

This comprehensive guide covers essential system design and architectural patterns concepts for building scalable, maintainable Spring Boot applications at the SDE2 level.
