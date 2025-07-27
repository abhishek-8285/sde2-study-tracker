# 🏗️ Backend Development Learning Guide for SDE2+

## 🎯 **Overview**

This comprehensive guide provides a structured learning path for mastering backend development skills required for SDE2+ roles. Focus on Java/Spring Boot ecosystem with modern architectures, databases, APIs, and system design.

## 📊 **Learning Roadmap (16 Weeks)**

```
Foundation (Weeks 1-4)
├── Java 17+ & Spring Boot Fundamentals
├── Database Design & SQL Mastery
├── REST API Development
└── Testing & Code Quality

Intermediate (Weeks 5-8)
├── Spring Security & Authentication
├── Microservices Architecture
├── Message Queues & Event-Driven Design
└── Performance Optimization

Advanced (Weeks 9-12)
├── System Design Patterns
├── Distributed Systems
├── Advanced Database Concepts
└── API Design Excellence

Mastery (Weeks 13-16)
├── Production Deployment
├── Monitoring & Observability
├── Security & Compliance
└── Capstone Projects
```

---

## 🔥 **WEEK 1-2: Java & Spring Boot Foundation**

### **Learning Objectives**

- Master Java 17+ features and modern programming patterns
- Understand Spring Boot fundamentals and dependency injection
- Build robust REST APIs with proper error handling
- Implement comprehensive testing strategies

### **Daily Study Plan**

#### **Week 1: Java 17+ Mastery**

**Day 1: Modern Java Features**

- **Morning (2 hours)**: Java 17 features overview
  - Records and pattern matching
  - Text blocks and string improvements
  - Switch expressions and instanceof patterns
- **Afternoon (2 hours)**: Hands-on practice
  - Convert legacy code to use records
  - Implement pattern matching examples
  - Practice with sealed classes
- **Evening (1 hour)**: Code review and documentation

**Day 2: Collections & Streams**

- **Morning (2 hours)**: Advanced Collections
  - Concurrent collections deep dive
  - Custom comparators and sorting
  - Map operations and computeIfAbsent patterns
- **Afternoon (2 hours)**: Stream API mastery
  - Complex stream operations
  - Parallel streams and performance
  - Custom collectors implementation
- **Evening (1 hour)**: Performance benchmarking exercise

**Day 3: Functional Programming**

- **Morning (2 hours)**: Lambda expressions and method references
  - Function interfaces and composition
  - Optional usage patterns
  - Exception handling in functional code
- **Afternoon (2 hours)**: Advanced functional patterns
  - Immutable object design
  - Builder pattern with functional interfaces
  - Monadic patterns in Java
- **Evening (1 hour)**: Refactor existing code to functional style

**Day 4: Concurrency & Threading**

- **Morning (2 hours)**: Modern concurrency
  - CompletableFuture and async programming
  - Virtual threads (Project Loom preview)
  - Reactive programming basics
- **Afternoon (2 hours)**: Thread safety and synchronization
  - Lock-free data structures
  - Atomic operations and volatile
  - Producer-consumer patterns
- **Evening (1 hour)**: Build multi-threaded application

**Day 5: Memory Management & Performance**

- **Morning (2 hours)**: JVM internals
  - Garbage collection algorithms
  - Memory profiling with JProfiler/VisualVM
  - Heap dump analysis
- **Afternoon (2 hours)**: Performance optimization
  - Microbenchmarking with JMH
  - Memory leak detection
  - CPU profiling and optimization
- **Evening (1 hour)**: Performance tuning exercise

**Day 6: Testing & Quality**

- **Morning (2 hours)**: JUnit 5 advanced features
  - Parameterized tests and test factories
  - Extensions and custom annotations
  - Test lifecycle and dependency injection
- **Afternoon (2 hours)**: Mockito and test doubles
  - Argument captors and verification
  - Spy objects and partial mocking
  - Testing static methods and constructors
- **Evening (1 hour)**: Code coverage analysis with JaCoCo

**Day 7: Project Day**

- **All Day**: Build "Task Management System"
  - Domain model with Java records
  - Concurrent task execution
  - Comprehensive test suite
  - Performance benchmarks

#### **Week 2: Spring Boot Fundamentals**

**Day 1: Spring Core & Boot**

- **Morning (2 hours)**: Dependency injection deep dive
  - Component scanning and configuration
  - Profiles and conditional beans
  - Application context and bean lifecycle
- **Afternoon (2 hours)**: Spring Boot auto-configuration
  - Custom auto-configuration classes
  - Actuator endpoints and metrics
  - External configuration management
- **Evening (1 hour)**: Configuration properties and validation

**Day 2: Web Development**

- **Morning (2 hours)**: REST API development
  - Controller design patterns
  - Request/response handling
  - Content negotiation and serialization
- **Afternoon (2 hours)**: Exception handling and validation
  - Global exception handlers
  - Bean validation with custom validators
  - Error response standardization
- **Evening (1 hour)**: API documentation with OpenAPI

**Day 3: Data Access**

- **Morning (2 hours)**: Spring Data JPA basics
  - Repository patterns and custom queries
  - Entity relationships and lazy loading
  - Transaction management
- **Afternoon (2 hours)**: Advanced JPA features
  - Custom repository implementations
  - Specifications and Criteria API
  - Auditing and entity listeners
- **Evening (1 hour)**: Database migration with Flyway

**Day 4: Testing Spring Applications**

- **Morning (2 hours)**: Spring Test framework
  - @SpringBootTest and test slices
  - MockMvc for web layer testing
  - TestContainers for integration tests
- **Afternoon (2 hours)**: Advanced testing scenarios
  - Testing with profiles and properties
  - Security testing
  - Testing async and scheduled tasks
- **Evening (1 hour)**: Test performance and optimization

**Day 5: Security Basics**

- **Morning (2 hours)**: Spring Security fundamentals
  - Authentication and authorization
  - Password encoding and user management
  - Method-level security
- **Afternoon (2 hours)**: Web security configuration
  - CSRF protection and CORS
  - Session management
  - Remember-me functionality
- **Evening (1 hour)**: Security testing and penetration

**Day 6: Production Features**

- **Morning (2 hours)**: Monitoring and observability
  - Micrometer metrics integration
  - Health checks and readiness probes
  - Distributed tracing setup
- **Afternoon (2 hours)**: Caching and performance
  - Spring Cache abstraction
  - Redis integration
  - Cache eviction strategies
- **Evening (1 hour)**: Performance testing with JMeter

**Day 7: Project Day**

- **All Day**: Build "E-commerce API"
  - User management with security
  - Product catalog with caching
  - Order processing with transactions
  - Comprehensive testing and monitoring

### **Hands-on Projects**

#### **Project 1: Task Management System (Week 1)**

```java
// Task domain model using Java 17 features
public record Task(
    String id,
    String title,
    String description,
    TaskStatus status,
    LocalDateTime createdAt,
    LocalDateTime dueDate,
    Optional<String> assigneeId
) {
    public Task {
        Objects.requireNonNull(id, "Task ID cannot be null");
        Objects.requireNonNull(title, "Task title cannot be null");
        Objects.requireNonNull(status, "Task status cannot be null");
        Objects.requireNonNull(createdAt, "Created date cannot be null");
    }

    public Task withStatus(TaskStatus newStatus) {
        return new Task(id, title, description, newStatus,
                       createdAt, dueDate, assigneeId);
    }

    public boolean isOverdue() {
        return dueDate != null && LocalDateTime.now().isAfter(dueDate)
               && status != TaskStatus.COMPLETED;
    }
}

// Concurrent task executor with virtual threads
@Service
public class TaskExecutorService {
    private final ExecutorService virtualThreadExecutor;

    public TaskExecutorService() {
        this.virtualThreadExecutor = Executors.newVirtualThreadPerTaskExecutor();
    }

    public CompletableFuture<TaskResult> executeTask(Task task) {
        return CompletableFuture.supplyAsync(() -> {
            // Simulate task execution
            return processTask(task);
        }, virtualThreadExecutor);
    }

    public Stream<CompletableFuture<TaskResult>> executeBatch(List<Task> tasks) {
        return tasks.stream()
            .map(this::executeTask);
    }
}
```

#### **Project 2: E-commerce API (Week 2)**

```java
// Product entity with JPA
@Entity
@Table(name = "products")
@EntityListeners(AuditingEntityListener.class)
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    @NotBlank(message = "Product name is required")
    private String name;

    @Column(precision = 10, scale = 2)
    @DecimalMin(value = "0.0", inclusive = false)
    private BigDecimal price;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // Constructors, getters, setters
}

// Product repository with custom queries
@Repository
public interface ProductRepository extends JpaRepository<Product, String>,
                                          ProductRepositoryCustom {

    @Query("SELECT p FROM Product p WHERE p.price BETWEEN :minPrice AND :maxPrice")
    Page<Product> findByPriceRange(@Param("minPrice") BigDecimal minPrice,
                                  @Param("maxPrice") BigDecimal maxPrice,
                                  Pageable pageable);

    @Modifying
    @Query("UPDATE Product p SET p.price = p.price * (1 + :percentage/100) " +
           "WHERE p.category = :category")
    int updatePricesByCategory(@Param("category") String category,
                              @Param("percentage") BigDecimal percentage);
}

// Product service with caching
@Service
@Transactional
public class ProductService {

    private final ProductRepository productRepository;
    private final CacheManager cacheManager;

    @Cacheable(value = "products", key = "#id")
    public Optional<Product> findById(String id) {
        return productRepository.findById(id);
    }

    @CacheEvict(value = "products", key = "#result.id")
    public Product save(Product product) {
        return productRepository.save(product);
    }

    @Cacheable(value = "product-search")
    public Page<Product> searchProducts(ProductSearchCriteria criteria,
                                       Pageable pageable) {
        return productRepository.findByCriteria(criteria, pageable);
    }
}
```

### **Assessment Criteria**

- [ ] **Java Mastery**: Uses Java 17+ features appropriately and efficiently
- [ ] **Spring Boot**: Builds robust applications with proper configuration
- [ ] **Testing**: Achieves 80%+ code coverage with meaningful tests
- [ ] **Code Quality**: Follows Java coding standards and best practices
- [ ] **Performance**: Demonstrates understanding of performance optimization
- [ ] **Documentation**: Creates clear, comprehensive technical documentation

### **Resources**

- **Primary**: `springBoot/01-spring-framework-fundamentals.md`
- **Secondary**: `springBoot/02-web-development-rest-apis.md`
- **Reference**: Official Spring Boot documentation, Java 17 language guide

---

## 🗄️ **WEEK 3-4: Database Mastery**

### **Learning Objectives**

- Design efficient, normalized database schemas
- Master advanced SQL queries and optimization techniques
- Implement effective caching and data access patterns
- Understand NoSQL databases and polyglot persistence

### **Daily Study Plan**

#### **Week 3: SQL Mastery & Database Design**

**Day 1: Advanced SQL Queries**

- **Morning (2 hours)**: Complex joins and subqueries
  - Multiple table joins with performance analysis
  - Correlated vs non-correlated subqueries
  - EXISTS vs IN performance comparison
- **Afternoon (2 hours)**: Window functions and analytics
  - ROW_NUMBER, RANK, DENSE_RANK
  - LAG, LEAD for time-series analysis
  - Aggregate window functions
- **Evening (1 hour)**: Query optimization exercises

**Day 2: Database Design & Normalization**

- **Morning (2 hours)**: Normalization theory and practice
  - 1NF through 5NF with real examples
  - Denormalization strategies for performance
  - Entity-relationship modeling
- **Afternoon (2 hours)**: Advanced schema design
  - Inheritance mapping strategies
  - Polymorphic associations
  - Temporal data modeling
- **Evening (1 hour)**: Schema design for e-commerce system

**Day 3: Indexing & Performance**

- **Morning (2 hours)**: Index design and optimization
  - B-tree, hash, and bitmap indexes
  - Composite index strategies
  - Partial and functional indexes
- **Afternoon (2 hours)**: Query performance tuning
  - Execution plan analysis
  - Query hints and optimization
  - Statistics and cardinality estimation
- **Evening (1 hour)**: Performance benchmarking project

**Day 4: Transactions & Concurrency**

- **Morning (2 hours)**: ACID properties deep dive
  - Isolation levels and their implications
  - Deadlock detection and prevention
  - Optimistic vs pessimistic locking
- **Afternoon (2 hours)**: Advanced transaction patterns
  - Distributed transactions (2PC, Saga pattern)
  - Event sourcing and CQRS
  - Compensation patterns
- **Evening (1 hour)**: Implement transaction scenarios

**Day 5: Stored Procedures & Functions**

- **Morning (2 hours)**: PL/pgSQL programming
  - Control structures and error handling
  - Cursor operations and dynamic SQL
  - Custom data types and domains
- **Afternoon (2 hours)**: Advanced database features
  - Triggers and event-driven logic
  - Full-text search capabilities
  - JSON operations and indexing
- **Evening (1 hour)**: Build stored procedure library

**Day 6: Database Administration**

- **Morning (2 hours)**: Backup and recovery strategies
  - Point-in-time recovery
  - Logical vs physical backups
  - Disaster recovery planning
- **Afternoon (2 hours)**: Monitoring and maintenance
  - Performance monitoring tools
  - Vacuum and analyze operations
  - Connection pooling and resource management
- **Evening (1 hour)**: Set up monitoring dashboard

**Day 7: Project Day**

- **All Day**: Design and implement "Financial Trading System Database"
  - Complex schema with temporal data
  - High-performance query optimization
  - Comprehensive backup/recovery strategy

#### **Week 4: NoSQL & Polyglot Persistence**

**Day 1: MongoDB Fundamentals**

- **Morning (2 hours)**: Document model and operations
  - CRUD operations and query operators
  - Embedded vs referenced documents
  - Schema design patterns
- **Afternoon (2 hours)**: Advanced MongoDB features
  - Aggregation pipeline mastery
  - Index strategies for document databases
  - Geospatial queries and operations
- **Evening (1 hour)**: MongoDB performance tuning

**Day 2: Redis for Caching**

- **Morning (2 hours)**: Redis data structures and operations
  - Strings, hashes, lists, sets, sorted sets
  - Pub/Sub messaging patterns
  - Lua scripting for atomic operations
- **Afternoon (2 hours)**: Caching strategies implementation
  - Cache-aside, write-through, write-behind
  - Cache invalidation patterns
  - Distributed caching with Redis Cluster
- **Evening (1 hour)**: Implement caching layer

**Day 3: Graph Databases (Neo4j)**

- **Morning (2 hours)**: Graph theory and Cypher query language
  - Node and relationship modeling
  - Path queries and traversals
  - Graph algorithms (shortest path, centrality)
- **Afternoon (2 hours)**: Social network modeling
  - Friendship and follower relationships
  - Recommendation algorithms
  - Performance optimization for graph queries
- **Evening (1 hour)**: Build social graph application

**Day 4: Time-Series Databases**

- **Morning (2 hours)**: Time-series concepts and InfluxDB
  - Time-series data modeling
  - Continuous queries and retention policies
  - Downsampling and aggregation strategies
- **Afternoon (2 hours)**: Monitoring and IoT applications
  - Metrics collection and visualization
  - Alerting based on time-series data
  - Integration with Grafana
- **Evening (1 hour)**: IoT monitoring system project

**Day 5: Database Integration Patterns**

- **Morning (2 hours)**: Polyglot persistence architecture
  - Database per service patterns
  - Event-driven data synchronization
  - CQRS with multiple read models
- **Afternoon (2 hours)**: Data consistency patterns
  - Eventual consistency strategies
  - Conflict resolution mechanisms
  - Data validation across systems
- **Evening (1 hour)**: Design multi-database system

**Day 6: Migration & Evolution**

- **Morning (2 hours)**: Database migration strategies
  - Zero-downtime migration techniques
  - Data migration patterns and tools
  - Schema evolution best practices
- **Afternoon (2 hours)**: Legacy system integration
  - Change data capture (CDC)
  - Data lake and warehouse patterns
  - ETL pipeline design
- **Evening (1 hour)**: Plan database migration project

**Day 7: Capstone Project**

- **All Day**: "Multi-Database E-commerce Platform"
  - PostgreSQL for transactional data
  - MongoDB for product catalog
  - Redis for session and cache
  - Neo4j for recommendations

### **Hands-on Projects**

#### **Project 1: Financial Trading System Database (Week 3)**

```sql
-- Advanced schema design with temporal data
CREATE TABLE trades (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    trade_type trade_type_enum NOT NULL,
    quantity DECIMAL(15,6) NOT NULL,
    price DECIMAL(15,6) NOT NULL,
    execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settlement_date DATE,
    trader_id UUID NOT NULL,
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    -- Partitioning key
    trade_date DATE GENERATED ALWAYS AS (execution_time::DATE) STORED
) PARTITION BY RANGE (trade_date);

-- Performance-optimized indexes
CREATE INDEX CONCURRENTLY idx_trades_symbol_time
ON trades (symbol, execution_time DESC)
WHERE execution_time >= CURRENT_DATE - INTERVAL '30 days';

-- Complex analytical queries
WITH daily_volume AS (
    SELECT
        symbol,
        DATE(execution_time) as trade_date,
        SUM(quantity * price) as volume,
        COUNT(*) as trade_count,
        AVG(price) as avg_price,
        FIRST_VALUE(price) OVER (
            PARTITION BY symbol, DATE(execution_time)
            ORDER BY execution_time
        ) as open_price,
        LAST_VALUE(price) OVER (
            PARTITION BY symbol, DATE(execution_time)
            ORDER BY execution_time
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) as close_price
    FROM trades
    WHERE execution_time >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY symbol, DATE(execution_time)
),
volatility_calc AS (
    SELECT
        symbol,
        trade_date,
        volume,
        avg_price,
        open_price,
        close_price,
        STDDEV(avg_price) OVER (
            PARTITION BY symbol
            ORDER BY trade_date
            ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
        ) as price_volatility_20d
    FROM daily_volume
)
SELECT * FROM volatility_calc
ORDER BY symbol, trade_date DESC;
```

#### **Project 2: Multi-Database E-commerce Platform (Week 4)**

```java
// Polyglot persistence service
@Service
@Transactional
public class ProductService {

    private final ProductRepository sqlRepository;
    private final ProductCatalogRepository mongoRepository;
    private final ProductCacheRepository redisRepository;
    private final ProductRecommendationService neo4jService;

    public Product createProduct(CreateProductRequest request) {
        // 1. Save to SQL for transactions
        Product product = sqlRepository.save(
            Product.builder()
                .name(request.getName())
                .price(request.getPrice())
                .categoryId(request.getCategoryId())
                .build()
        );

        // 2. Async: Save to MongoDB for catalog search
        CompletableFuture.runAsync(() -> {
            ProductDocument doc = ProductDocument.builder()
                .id(product.getId())
                .name(product.getName())
                .description(request.getDescription())
                .searchKeywords(extractKeywords(request))
                .build();
            mongoRepository.save(doc);
        });

        // 3. Cache in Redis for fast access
        redisRepository.cache(product.getId(), product);

        // 4. Update recommendation graph
        neo4jService.addProductRelationships(product);

        return product;
    }

    public Page<Product> searchProducts(ProductSearchCriteria criteria) {
        // Use MongoDB for full-text search
        List<String> productIds = mongoRepository
            .searchByText(criteria.getQuery())
            .stream()
            .map(ProductDocument::getId)
            .collect(Collectors.toList());

        // Get full product data from SQL
        return sqlRepository.findByIdIn(productIds, criteria.getPageable());
    }

    public Optional<Product> findById(String id) {
        // Try Redis cache first
        return redisRepository.findById(id)
            .or(() -> {
                // Fallback to SQL and cache result
                Optional<Product> product = sqlRepository.findById(id);
                product.ifPresent(p -> redisRepository.cache(id, p));
                return product;
            });
    }
}

// MongoDB repository for search
@Repository
public interface ProductCatalogRepository extends MongoRepository<ProductDocument, String> {

    @Query("{ $text: { $search: ?0 } }")
    List<ProductDocument> searchByText(String searchText);

    @Aggregation(pipeline = {
        "{ $match: { category: ?0 } }",
        "{ $group: { _id: '$brand', count: { $sum: 1 } } }",
        "{ $sort: { count: -1 } }"
    })
    List<BrandCount> getBrandsByCategory(String category);
}

// Redis caching layer
@Component
public class ProductCacheRepository {

    private final RedisTemplate<String, Product> redisTemplate;
    private final String CACHE_PREFIX = "product:";
    private final Duration TTL = Duration.ofHours(1);

    public void cache(String productId, Product product) {
        String key = CACHE_PREFIX + productId;
        redisTemplate.opsForValue().set(key, product, TTL);
    }

    public Optional<Product> findById(String productId) {
        String key = CACHE_PREFIX + productId;
        Product product = redisTemplate.opsForValue().get(key);
        return Optional.ofNullable(product);
    }

    public void invalidate(String productId) {
        redisTemplate.delete(CACHE_PREFIX + productId);
    }
}
```

### **Assessment Criteria**

- [ ] **Schema Design**: Creates efficient, normalized database schemas
- [ ] **Query Optimization**: Writes performant SQL with proper indexing
- [ ] **NoSQL Proficiency**: Uses appropriate NoSQL databases for specific use cases
- [ ] **Caching Strategy**: Implements effective caching patterns
- [ ] **Data Consistency**: Handles consistency in distributed data systems
- [ ] **Performance**: Demonstrates database performance optimization skills

### **Resources**

- **Primary**: `databases/` directory (8 comprehensive guides)
- **Secondary**: PostgreSQL, MongoDB, Redis official documentation
- **Tools**: pgAdmin, MongoDB Compass, RedisInsight

---

## 🌐 **WEEK 5-8: API & Microservices Mastery**

### **Learning Objectives**

- Design and implement scalable REST and GraphQL APIs
- Build microservices architecture with proper patterns
- Implement event-driven communication and messaging
- Master API security, monitoring, and documentation

### **Week 5: Advanced API Design**

#### **Day 1-2: REST API Excellence**

```java
// Advanced REST controller with comprehensive features
@RestController
@RequestMapping("/api/v1/products")
@Validated
@Slf4j
public class ProductController {

    private final ProductService productService;
    private final ProductMapper productMapper;

    @GetMapping
    @Operation(summary = "Get products with filtering and pagination")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Products retrieved successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request parameters")
    })
    public ResponseEntity<PagedResponse<ProductResponse>> getProducts(
            @Valid ProductSearchRequest request,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable,
            HttpServletRequest httpRequest) {

        log.info("Fetching products with criteria: {}, page: {}", request, pageable);

        Page<Product> products = productService.findProducts(request, pageable);

        PagedResponse<ProductResponse> response = PagedResponse.<ProductResponse>builder()
            .content(productMapper.toResponseList(products.getContent()))
            .page(PageInfo.from(products))
            .metadata(createMetadata(httpRequest, products))
            .build();

        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES))
            .eTag(calculateETag(response))
            .body(response);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN') or hasRole('PRODUCT_MANAGER')")
    public ProductResponse createProduct(@Valid @RequestBody CreateProductRequest request,
                                       Authentication authentication) {

        AuditContext.setUser(authentication.getName());

        Product product = productService.createProduct(
            productMapper.toEntity(request),
            getCurrentUser(authentication)
        );

        // Publish domain event
        eventPublisher.publishEvent(new ProductCreatedEvent(product));

        URI location = ServletUriComponentsBuilder
            .fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(product.getId())
            .toUri();

        return ResponseEntity.created(location)
            .body(productMapper.toResponse(product));
    }
}

// Advanced error handling
@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidationErrors(MethodArgumentNotValidException ex) {

        Map<String, String> fieldErrors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .collect(Collectors.toMap(
                FieldError::getField,
                FieldError::getDefaultMessage,
                (existing, replacement) -> existing
            ));

        return ErrorResponse.builder()
            .error("VALIDATION_FAILED")
            .message("Request validation failed")
            .details(fieldErrors)
            .timestamp(Instant.now())
            .path(getCurrentPath())
            .build();
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex) {

        HttpStatus status = determineHttpStatus(ex.getErrorCode());

        ErrorResponse response = ErrorResponse.builder()
            .error(ex.getErrorCode())
            .message(ex.getMessage())
            .timestamp(Instant.now())
            .path(getCurrentPath())
            .build();

        log.warn("Business exception: {}", ex.getMessage(), ex);

        return ResponseEntity.status(status).body(response);
    }
}
```

#### **Day 3-4: GraphQL Implementation**

```java
// GraphQL resolver with advanced features
@Component
@Slf4j
public class ProductResolver implements GraphQLQueryResolver, GraphQLMutationResolver {

    private final ProductService productService;
    private final DataLoader<String, Product> productLoader;

    // Query resolver with field-level caching
    @Cacheable(value = "graphql-products", key = "#filter.toString() + #pagination.toString()")
    public Connection<Product> products(ProductFilter filter,
                                       ConnectionPagination pagination,
                                       DataFetchingEnvironment env) {

        // Use DataLoader for efficient batching
        SelectionSet selectionSet = env.getSelectionSet();
        Set<String> requestedFields = selectionSet.getFields().keySet();

        ProductSearchOptions options = ProductSearchOptions.builder()
            .filter(filter)
            .includeFields(requestedFields)
            .build();

        Page<Product> products = productService.findProducts(options,
            PageRequest.of(pagination.getOffset(), pagination.getLimit()));

        return ConnectionUtils.createConnection(products, pagination);
    }

    // Mutation with optimistic locking
    @PreAuthorize("hasAuthority('PRODUCT:WRITE')")
    public Product updateProduct(String id, ProductInput input, Long version) {

        return productService.updateProduct(id, input, version);
    }

    // Subscription for real-time updates
    public Publisher<Product> productUpdated(String productId) {
        return productUpdatePublisher
            .filter(update -> update.getProductId().equals(productId))
            .map(ProductUpdateEvent::getProduct);
    }
}

// DataLoader configuration for N+1 problem prevention
@Configuration
public class GraphQLDataLoaderConfig {

    @Bean
    public DataLoader<String, Product> productDataLoader(ProductService productService) {
        return DataLoader.newMappedDataLoader((Set<String> ids) -> {
            Map<String, Product> products = productService.findByIds(ids)
                .stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

            return CompletableFuture.completedFuture(products);
        });
    }

    @Bean
    public DataLoaderRegistry dataLoaderRegistry(
            DataLoader<String, Product> productLoader,
            DataLoader<String, Category> categoryLoader) {

        DataLoaderRegistry registry = new DataLoaderRegistry();
        registry.register("product", productLoader);
        registry.register("category", categoryLoader);
        return registry;
    }
}
```

### **Week 6: Microservices Architecture**

#### **Day 1-2: Service Decomposition & Communication**

```java
// Product service with domain boundaries
@Service
@Transactional
public class ProductCatalogService {

    private final ProductRepository productRepository;
    private final InventoryServiceClient inventoryClient;
    private final EventPublisher eventPublisher;
    private final CircuitBreaker circuitBreaker;

    @Retryable(value = {TransientException.class}, maxAttempts = 3)
    public Product createProduct(CreateProductCommand command) {

        // Validate business rules
        validateProductRules(command);

        // Create product entity
        Product product = Product.builder()
            .name(command.getName())
            .description(command.getDescription())
            .price(command.getPrice())
            .status(ProductStatus.PENDING)
            .build();

        product = productRepository.save(product);

        // Async inventory initialization
        CompletableFuture.runAsync(() -> {
            try {
                circuitBreaker.execute(() -> {
                    inventoryClient.initializeInventory(
                        product.getId(),
                        command.getInitialStock()
                    );
                    return null;
                });
            } catch (Exception e) {
                log.error("Failed to initialize inventory for product {}",
                         product.getId(), e);
                // Publish compensation event
                eventPublisher.publish(new InventoryInitializationFailedEvent(product.getId()));
            }
        });

        // Publish domain event
        eventPublisher.publish(new ProductCreatedEvent(product));

        return product;
    }

    @EventListener
    @Async
    public void handleInventoryInitialized(InventoryInitializedEvent event) {
        productRepository.findById(event.getProductId())
            .ifPresent(product -> {
                product.setStatus(ProductStatus.ACTIVE);
                productRepository.save(product);

                eventPublisher.publish(new ProductActivatedEvent(product));
            });
    }
}

// Feign client for inter-service communication
@FeignClient(name = "inventory-service",
             configuration = FeignConfig.class,
             fallback = InventoryServiceFallback.class)
public interface InventoryServiceClient {

    @PostMapping("/api/v1/inventory/{productId}/initialize")
    InventoryResponse initializeInventory(@PathVariable String productId,
                                        @RequestParam Integer initialStock);

    @GetMapping("/api/v1/inventory/{productId}/availability")
    AvailabilityResponse checkAvailability(@PathVariable String productId);
}

// Circuit breaker configuration
@Configuration
public class ResilienceConfig {

    @Bean
    public CircuitBreaker inventoryCircuitBreaker() {
        return CircuitBreaker.ofDefaults("inventory-service")
            .toBuilder()
            .failureRateThreshold(50)
            .waitDurationInOpenState(Duration.ofSeconds(30))
            .slidingWindowSize(10)
            .minimumNumberOfCalls(5)
            .build();
    }

    @Bean
    public RetryTemplate retryTemplate() {
        return RetryTemplate.builder()
            .maxAttempts(3)
            .exponentialBackoff(1000, 2, 10000)
            .retryOn(ResourceAccessException.class)
            .build();
    }
}
```

#### **Day 3-4: Event-Driven Architecture**

```java
// Event sourcing implementation
@Entity
@Table(name = "events")
public class EventStore {

    @Id
    private String id;

    @Column(name = "aggregate_id")
    private String aggregateId;

    @Column(name = "aggregate_type")
    private String aggregateType;

    @Column(name = "event_type")
    private String eventType;

    @Column(name = "event_data", columnDefinition = "jsonb")
    private String eventData;

    @Column(name = "sequence_number")
    private Long sequenceNumber;

    private Instant timestamp;

    // Constructors, getters, setters
}

// Event store repository
@Repository
public class EventStoreRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public void saveEvent(DomainEvent event, String aggregateId) {
        String sql = """
            INSERT INTO events (id, aggregate_id, aggregate_type, event_type,
                               event_data, sequence_number, timestamp)
            VALUES (?, ?, ?, ?, ?::jsonb,
                   (SELECT COALESCE(MAX(sequence_number), 0) + 1
                    FROM events WHERE aggregate_id = ?), ?)
            """;

        try {
            String eventData = objectMapper.writeValueAsString(event);

            jdbcTemplate.update(sql,
                UUID.randomUUID().toString(),
                aggregateId,
                event.getAggregateType(),
                event.getClass().getSimpleName(),
                eventData,
                aggregateId,
                Instant.now()
            );
        } catch (JsonProcessingException e) {
            throw new EventSerializationException("Failed to serialize event", e);
        }
    }

    public List<DomainEvent> getEvents(String aggregateId) {
        String sql = """
            SELECT event_type, event_data
            FROM events
            WHERE aggregate_id = ?
            ORDER BY sequence_number
            """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            String eventType = rs.getString("event_type");
            String eventData = rs.getString("event_data");

            return deserializeEvent(eventType, eventData);
        }, aggregateId);
    }
}

// CQRS command and query handlers
@Component
public class OrderCommandHandler {

    private final EventStoreRepository eventStore;
    private final OrderProjectionUpdater projectionUpdater;

    @CommandHandler
    public void handle(CreateOrderCommand command) {

        // Business logic validation
        validateOrderCommand(command);

        // Create domain events
        OrderCreatedEvent event = OrderCreatedEvent.builder()
            .orderId(command.getOrderId())
            .customerId(command.getCustomerId())
            .items(command.getItems())
            .totalAmount(calculateTotal(command.getItems()))
            .timestamp(Instant.now())
            .build();

        // Store event
        eventStore.saveEvent(event, command.getOrderId());

        // Update read model asynchronously
        projectionUpdater.updateOrderProjection(event);

        // Publish for other bounded contexts
        eventPublisher.publish(event);
    }
}

@Component
public class OrderQueryHandler {

    private final OrderProjectionRepository projectionRepository;

    @QueryHandler
    public OrderView handle(GetOrderQuery query) {
        return projectionRepository.findById(query.getOrderId())
            .orElseThrow(() -> new OrderNotFoundException(query.getOrderId()));
    }

    @QueryHandler
    public Page<OrderSummaryView> handle(GetOrdersQuery query) {
        return projectionRepository.findOrderSummaries(
            query.getCustomerId(),
            query.getFilter(),
            query.getPageable()
        );
    }
}
```

### **Week 7: Message Queues & Async Processing**

#### **Day 1-2: Kafka Integration**

```java
// Kafka producer configuration
@Configuration
@EnableKafka
public class KafkaProducerConfig {

    @Bean
    public ProducerFactory<String, DomainEvent> producerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, kafkaProperties.getBootstrapServers());
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, 3);
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        return new DefaultKafkaProducerFactory<>(props);
    }

    @Bean
    public KafkaTemplate<String, DomainEvent> kafkaTemplate() {
        KafkaTemplate<String, DomainEvent> template = new KafkaTemplate<>(producerFactory());
        template.setDefaultTopic("domain-events");
        return template;
    }
}

// Event publisher with Kafka
@Component
@Slf4j
public class KafkaEventPublisher implements EventPublisher {

    private final KafkaTemplate<String, DomainEvent> kafkaTemplate;

    @Override
    @Async
    public void publish(DomainEvent event) {
        String topic = determineTopicForEvent(event);
        String key = event.getAggregateId();

        kafkaTemplate.send(topic, key, event)
            .addCallback(
                result -> log.info("Event published successfully: {}", event),
                failure -> log.error("Failed to publish event: {}", event, failure)
            );
    }

    private String determineTopicForEvent(DomainEvent event) {
        return switch (event) {
            case OrderEvent orderEvent -> "order-events";
            case ProductEvent productEvent -> "product-events";
            case UserEvent userEvent -> "user-events";
            default -> "domain-events";
        };
    }
}

// Kafka consumer with dead letter queue
@Component
@Slf4j
public class OrderEventConsumer {

    private final OrderProjectionService projectionService;
    private final DeadLetterQueueService dlqService;

    @KafkaListener(topics = "order-events",
                   groupId = "order-projection-service",
                   containerFactory = "kafkaListenerContainerFactory")
    public void handleOrderEvent(
            @Payload OrderEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_PARTITION_ID) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            Acknowledgment acknowledgment) {

        try {
            log.info("Processing order event: {} from {}:{}", event, partition, offset);

            projectionService.updateProjection(event);

            acknowledgment.acknowledge();

        } catch (Exception e) {
            log.error("Failed to process order event: {}", event, e);

            // Send to DLQ after max retries
            dlqService.sendToDeadLetterQueue(event, topic, e.getMessage());
            acknowledgment.acknowledge();
        }
    }

    @DltHandler
    public void handleDltOrderEvent(OrderEvent event, Exception exception) {
        log.error("Order event moved to DLT: {}", event, exception);

        // Implement manual intervention logic
        alertingService.sendAlert(
            "Event processing failed permanently",
            event,
            exception
        );
    }
}
```

### **Week 8: API Security & Monitoring**

#### **Day 1-2: Advanced Security**

```java
// OAuth 2.0 resource server configuration
@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/products/**").hasAuthority("SCOPE_product:read")
                .requestMatchers(HttpMethod.POST, "/api/v1/products/**").hasAuthority("SCOPE_product:write")
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .decoder(jwtDecoder())
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            );

        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder
            .withJwkSetUri(jwkSetUri)
            .build();

        // Custom validation
        decoder.setJwtValidator(jwtValidator());

        return decoder;
    }

    @Bean
    public Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Collection<String> scopes = jwt.getClaimAsStringList("scope");
            Collection<String> roles = jwt.getClaimAsStringList("roles");

            Set<GrantedAuthority> authorities = new HashSet<>();

            // Add scope authorities
            scopes.stream()
                .map(scope -> "SCOPE_" + scope)
                .map(SimpleGrantedAuthority::new)
                .forEach(authorities::add);

            // Add role authorities
            roles.stream()
                .map(role -> "ROLE_" + role)
                .map(SimpleGrantedAuthority::new)
                .forEach(authorities::add);

            return authorities;
        });

        return converter;
    }
}

// Rate limiting with Redis
@Component
@Slf4j
public class RateLimitingFilter implements Filter {

    private final RedisTemplate<String, String> redisTemplate;
    private final RateLimitProperties rateLimitProperties;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response,
                        FilterChain chain) throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String clientId = extractClientId(httpRequest);
        String endpoint = httpRequest.getRequestURI();

        RateLimitConfig config = rateLimitProperties.getConfigForEndpoint(endpoint);

        if (isRateLimited(clientId, endpoint, config)) {
            httpResponse.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            httpResponse.setHeader("Retry-After", String.valueOf(config.getWindowSize()));
            httpResponse.getWriter().write("{\"error\": \"Rate limit exceeded\"}");
            return;
        }

        chain.doFilter(request, response);
    }

    private boolean isRateLimited(String clientId, String endpoint, RateLimitConfig config) {
        String key = String.format("rate_limit:%s:%s", clientId, endpoint);

        String currentCountStr = redisTemplate.opsForValue().get(key);
        int currentCount = currentCountStr != null ? Integer.parseInt(currentCountStr) : 0;

        if (currentCount >= config.getMaxRequests()) {
            return true;
        }

        // Increment counter
        redisTemplate.opsForValue().increment(key);
        redisTemplate.expire(key, Duration.ofSeconds(config.getWindowSize()));

        return false;
    }
}
```

#### **Day 3-4: Monitoring & Observability**

```java
// Custom metrics with Micrometer
@Component
public class ApiMetrics {

    private final Counter apiRequestCounter;
    private final Timer apiRequestTimer;
    private final Gauge activeConnectionsGauge;
    private final MeterRegistry meterRegistry;

    public ApiMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;

        this.apiRequestCounter = Counter.builder("api.requests.total")
            .description("Total number of API requests")
            .tag("application", "product-service")
            .register(meterRegistry);

        this.apiRequestTimer = Timer.builder("api.requests.duration")
            .description("API request duration")
            .register(meterRegistry);

        this.activeConnectionsGauge = Gauge.builder("api.connections.active")
            .description("Active connections")
            .register(meterRegistry, this, ApiMetrics::getActiveConnections);
    }

    public void recordApiRequest(String endpoint, String method, int statusCode, Duration duration) {
        apiRequestCounter.increment(
            Tags.of(
                Tag.of("endpoint", endpoint),
                Tag.of("method", method),
                Tag.of("status", String.valueOf(statusCode))
            )
        );

        apiRequestTimer.record(duration);
    }

    public void recordBusinessMetric(String operation, String result, Object value) {
        meterRegistry.counter("business.operations.total",
            Tags.of(
                Tag.of("operation", operation),
                Tag.of("result", result)
            )
        ).increment();

        if (value instanceof Number) {
            meterRegistry.gauge("business.operations.value",
                Tags.of(Tag.of("operation", operation)),
                ((Number) value).doubleValue()
            );
        }
    }

    private double getActiveConnections() {
        // Implementation to get active connections
        return 0.0;
    }
}

// Distributed tracing with Spring Cloud Sleuth
@Component
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final Tracer tracer;

    @NewSpan("product-validation")
    public void validateProduct(@SpanTag("productId") String productId, Product product) {

        Span span = tracer.nextSpan().name("validate-business-rules").start();

        try (Tracer.SpanInScope ws = tracer.withSpanInScope(span)) {
            span.tag("product.category", product.getCategory());
            span.tag("product.price", String.valueOf(product.getPrice()));

            // Business validation logic
            performValidation(product);

            span.event("validation-completed");

        } catch (ValidationException e) {
            span.tag("error", e.getMessage());
            span.event("validation-failed");
            throw e;
        } finally {
            span.end();
        }
    }

    @Async
    @NewSpan("async-product-enrichment")
    public CompletableFuture<Product> enrichProductData(Product product) {

        return CompletableFuture.supplyAsync(() -> {
            // Add custom span attributes
            Span currentSpan = tracer.currentSpan();
            if (currentSpan != null) {
                currentSpan.tag("enrichment.type", "external-data");
                currentSpan.event("enrichment-started");
            }

            // Enrichment logic
            Product enrichedProduct = performEnrichment(product);

            if (currentSpan != null) {
                currentSpan.event("enrichment-completed");
            }

            return enrichedProduct;
        });
    }
}
```

### **Assessment Criteria**

- [ ] **API Design**: Creates well-designed, documented APIs following REST principles
- [ ] **Microservices**: Implements proper service boundaries and communication patterns
- [ ] **Event-Driven**: Builds resilient event-driven architectures
- [ ] **Security**: Implements comprehensive API security measures
- [ ] **Monitoring**: Sets up effective observability and alerting
- [ ] **Performance**: Optimizes API performance and handles scale

### **Resources**

- **Primary**: `api-design-testing/` directory (4 comprehensive guides)
- **Secondary**: `springBoot/05-microservices-distributed-systems.md`
- **Tools**: Postman, Swagger UI, Prometheus, Grafana, Jaeger

---

This learning guide provides a structured, hands-on approach to mastering backend development skills for SDE2+ roles. Each week builds upon previous knowledge with practical projects that can be added to your portfolio.
