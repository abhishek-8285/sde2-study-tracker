# Data Access & Persistence

## Table of Contents

1. [Spring Data JPA & Hibernate](#spring-data-jpa--hibernate)
2. [Entity Relationships](#entity-relationships)
3. [Custom Queries](#custom-queries)
4. [Performance Optimization](#performance-optimization)
5. [Transaction Management](#transaction-management)
6. [Database Migration Tools](#database-migration-tools)
7. [Caching Strategies](#caching-strategies)
8. [Best Practices](#best-practices)

---

## Spring Data JPA & Hibernate

### Repository Hierarchy

#### CrudRepository

Basic CRUD operations:

```java
public interface UserRepository extends CrudRepository<User, Long> {
    // Inherited methods:
    // save(S entity)
    // findById(ID id)
    // existsById(ID id)
    // findAll()
    // count()
    // deleteById(ID id)
    // delete(T entity)
}
```

#### JpaRepository

Extended functionality with batch operations:

```java
public interface UserRepository extends JpaRepository<User, Long> {
    // Additional methods from JpaRepository:
    // saveAll(Iterable<S> entities)
    // flush()
    // saveAndFlush(S entity)
    // deleteInBatch(Iterable<T> entities)
    // deleteAllInBatch()
    // getOne(ID id) - returns proxy
}
```

#### Custom Repository Example

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Query methods by naming convention
    List<User> findByUsername(String username);
    List<User> findByEmailContaining(String email);
    List<User> findByActiveTrue();
    List<User> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    // Sorting and pagination
    List<User> findByActiveOrderByCreatedAtDesc(boolean active);
    Page<User> findByActive(boolean active, Pageable pageable);

    // Count and existence checks
    long countByActive(boolean active);
    boolean existsByEmail(String email);

    // Delete operations
    void deleteByActive(boolean active);
    long deleteByCreatedAtBefore(LocalDateTime date);
}
```

### Entity Configuration

#### Basic Entity

```java
@Entity
@Table(name = "users",
       indexes = {
           @Index(name = "idx_user_email", columnList = "email"),
           @Index(name = "idx_user_username", columnList = "username")
       },
       uniqueConstraints = {
           @UniqueConstraint(name = "uk_user_email", columnNames = "email")
       })
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String password;

    @Column(name = "is_active")
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    private Long version;

    // Constructors, getters, setters
}
```

#### Lifecycle Callbacks

```java
@Entity
public class User {

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    @PostLoad
    protected void onLoad() {
        // Called after entity is loaded from database
    }

    @PreRemove
    protected void onDelete() {
        // Called before entity is deleted
    }
}
```

---

## Entity Relationships

### @OneToOne

```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Owning side
    @OneToOne(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JoinColumn(name = "profile_id")
    private UserProfile profile;
}

@Entity
public class UserProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Non-owning side
    @OneToOne(mappedBy = "profile")
    private User user;

    private String firstName;
    private String lastName;
    private String phoneNumber;
}
```

### @OneToMany and @ManyToOne

```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Order> orders = new ArrayList<>();

    // Helper methods
    public void addOrder(Order order) {
        orders.add(order);
        order.setUser(this);
    }

    public void removeOrder(Order order) {
        orders.remove(order);
        order.setUser(null);
    }
}

@Entity
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private BigDecimal amount;
    private LocalDateTime orderDate;
}
```

### @ManyToMany

```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToMany
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();

    // Helper methods
    public void addRole(Role role) {
        roles.add(role);
        role.getUsers().add(this);
    }

    public void removeRole(Role role) {
        roles.remove(role);
        role.getUsers().remove(this);
    }
}

@Entity
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String name;

    @ManyToMany(mappedBy = "roles")
    private Set<User> users = new HashSet<>();
}
```

### Lazy vs Eager Fetching

#### Lazy Loading (Default for collections)

```java
@Entity
public class User {

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY) // Default
    private List<Order> orders;

    @ManyToOne(fetch = FetchType.LAZY) // Better for performance
    @JoinColumn(name = "department_id")
    private Department department;
}
```

#### Eager Loading

```java
@Entity
public class User {

    @OneToOne(fetch = FetchType.EAGER) // Always loaded
    @JoinColumn(name = "profile_id")
    private UserProfile profile;
}
```

### Solving N+1 Problem

#### Problem Example

```java
// This will cause N+1 queries
List<User> users = userRepository.findAll(); // 1 query
for (User user : users) {
    System.out.println(user.getOrders().size()); // N queries
}
```

#### Solution 1: @EntityGraph

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    @EntityGraph(attributePaths = {"orders", "profile"})
    List<User> findAll();

    @EntityGraph(attributePaths = {"orders.items"})
    Optional<User> findById(Long id);

    @Query("SELECT u FROM User u")
    @EntityGraph(attributePaths = {"orders"})
    List<User> findAllWithOrders();
}
```

#### Solution 2: JPQL with JOIN FETCH

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.orders")
    List<User> findAllWithOrders();

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.orders o LEFT JOIN FETCH o.items WHERE u.id = :id")
    Optional<User> findByIdWithOrdersAndItems(@Param("id") Long id);
}
```

### Cascading Operations

#### Cascade Types

```java
@Entity
public class User {

    @OneToMany(mappedBy = "user",
               cascade = {CascadeType.PERSIST, CascadeType.MERGE, CascadeType.REMOVE},
               orphanRemoval = true)
    private List<Order> orders;

    @OneToOne(cascade = CascadeType.ALL) // All operations cascade
    @JoinColumn(name = "profile_id")
    private UserProfile profile;
}
```

#### Cascade Examples

```java
@Service
@Transactional
public class UserService {

    public User createUserWithProfile(User user, UserProfile profile) {
        user.setProfile(profile);
        return userRepository.save(user); // Profile will be saved automatically
    }

    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        userRepository.delete(user); // Orders and profile will be deleted automatically
    }
}
```

---

## Custom Queries

### @Query Annotation

#### JPQL Queries

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    @Query("SELECT u FROM User u WHERE u.email = :email")
    Optional<User> findByEmail(@Param("email") String email);

    @Query("SELECT u FROM User u WHERE u.username LIKE %:username% AND u.active = :active")
    List<User> findByUsernameContainingAndActive(@Param("username") String username,
                                                @Param("active") boolean active);

    @Query("SELECT u FROM User u JOIN u.orders o WHERE o.amount > :amount")
    List<User> findUsersWithOrdersAboveAmount(@Param("amount") BigDecimal amount);

    @Query("SELECT u.username, COUNT(o) FROM User u LEFT JOIN u.orders o GROUP BY u.id, u.username")
    List<Object[]> findUsernameWithOrderCount();
}
```

#### Native SQL Queries

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    @Query(value = "SELECT * FROM users WHERE email = ?1", nativeQuery = true)
    Optional<User> findByEmailNative(String email);

    @Query(value = """
        SELECT u.*, COUNT(o.id) as order_count
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.created_at >= :startDate
        GROUP BY u.id
        """, nativeQuery = true)
    List<Object[]> findUsersWithOrderCountSince(@Param("startDate") LocalDateTime startDate);
}
```

#### Modifying Queries

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    @Modifying
    @Query("UPDATE User u SET u.active = :active WHERE u.id = :id")
    int updateUserActiveStatus(@Param("id") Long id, @Param("active") boolean active);

    @Modifying
    @Query("DELETE FROM User u WHERE u.active = false AND u.createdAt < :date")
    int deleteInactiveUsersBefore(@Param("date") LocalDateTime date);

    @Modifying
    @Query(value = "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?1", nativeQuery = true)
    void updateLastLogin(Long userId);
}
```

### Projections

#### Interface-based Projections

```java
public interface UserSummary {
    String getUsername();
    String getEmail();
    Long getOrderCount();

    @Value("#{target.username + ' (' + target.email + ')'}")
    String getDisplayName();
}

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    @Query("SELECT u.username as username, u.email as email, COUNT(o) as orderCount " +
           "FROM User u LEFT JOIN u.orders o GROUP BY u.id")
    List<UserSummary> findUserSummaries();
}
```

#### Class-based Projections (DTOs)

```java
public class UserSummaryDto {
    private String username;
    private String email;
    private Long orderCount;

    public UserSummaryDto(String username, String email, Long orderCount) {
        this.username = username;
        this.email = email;
        this.orderCount = orderCount;
    }

    // Getters and setters
}

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    @Query("SELECT new com.example.dto.UserSummaryDto(u.username, u.email, COUNT(o)) " +
           "FROM User u LEFT JOIN u.orders o GROUP BY u.id")
    List<UserSummaryDto> findUserSummaryDtos();
}
```

### Specifications (Criteria API)

#### Specification Interface

```java
public class UserSpecifications {

    public static Specification<User> hasUsername(String username) {
        return (root, query, criteriaBuilder) ->
            username == null ? null : criteriaBuilder.equal(root.get("username"), username);
    }

    public static Specification<User> isActive(boolean active) {
        return (root, query, criteriaBuilder) ->
            criteriaBuilder.equal(root.get("active"), active);
    }

    public static Specification<User> emailContains(String email) {
        return (root, query, criteriaBuilder) ->
            email == null ? null : criteriaBuilder.like(
                criteriaBuilder.lower(root.get("email")),
                "%" + email.toLowerCase() + "%");
    }

    public static Specification<User> createdAfter(LocalDateTime date) {
        return (root, query, criteriaBuilder) ->
            date == null ? null : criteriaBuilder.greaterThan(root.get("createdAt"), date);
    }

    public static Specification<User> hasOrdersWithAmountGreaterThan(BigDecimal amount) {
        return (root, query, criteriaBuilder) -> {
            Join<User, Order> orderJoin = root.join("orders", JoinType.INNER);
            return criteriaBuilder.greaterThan(orderJoin.get("amount"), amount);
        };
    }
}
```

#### Using Specifications

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
}

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public List<User> findUsers(String username, Boolean active, String email, LocalDateTime createdAfter) {
        Specification<User> spec = Specification.where(null);

        if (username != null) {
            spec = spec.and(UserSpecifications.hasUsername(username));
        }
        if (active != null) {
            spec = spec.and(UserSpecifications.isActive(active));
        }
        if (email != null) {
            spec = spec.and(UserSpecifications.emailContains(email));
        }
        if (createdAfter != null) {
            spec = spec.and(UserSpecifications.createdAfter(createdAfter));
        }

        return userRepository.findAll(spec);
    }
}
```

---

## Performance Optimization

### Batch Operations

```java
@Service
@Transactional
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Value("${app.batch.size:100}")
    private int batchSize;

    public void createUsersInBatch(List<User> users) {
        for (int i = 0; i < users.size(); i += batchSize) {
            List<User> batch = users.subList(i, Math.min(i + batchSize, users.size()));
            userRepository.saveAll(batch);
            userRepository.flush(); // Force execution
            entityManager.clear(); // Clear persistence context
        }
    }
}
```

### Pagination and Sorting

```java
@Service
public class UserService {

    public Page<User> findUsers(int page, int size, String sortBy, String sortDir) {
        Sort.Direction direction = sortDir.equalsIgnoreCase("desc") ?
            Sort.Direction.DESC : Sort.Direction.ASC;

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return userRepository.findAll(pageable);
    }

    public Slice<User> findActiveUsersSlice(Pageable pageable) {
        return userRepository.findByActive(true, pageable);
    }
}
```

### Connection Pooling Configuration

```properties
# HikariCP Configuration
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.idle-timeout=300000
spring.datasource.hikari.max-lifetime=600000
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.validation-timeout=5000
```

---

## Transaction Management

### @Transactional Annotation

#### Basic Usage

```java
@Service
@Transactional(readOnly = true) // Default for all methods
public class UserService {

    @Transactional // Override default (readOnly = false)
    public User createUser(User user) {
        return userRepository.save(user);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void auditUserAction(Long userId, String action) {
        AuditLog log = new AuditLog(userId, action, LocalDateTime.now());
        auditLogRepository.save(log);
    }

    public List<User> findAllUsers() {
        return userRepository.findAll(); // Read-only transaction
    }
}
```

#### Propagation Levels

```java
@Service
public class OrderService {

    @Transactional(propagation = Propagation.REQUIRED) // Default
    public Order createOrder(Order order) {
        // Uses existing transaction or creates new one
        return orderRepository.save(order);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logOrderEvent(String event) {
        // Always creates new transaction
        eventLogRepository.save(new EventLog(event));
    }

    @Transactional(propagation = Propagation.SUPPORTS)
    public List<Order> findOrders() {
        // Uses existing transaction if available, otherwise non-transactional
        return orderRepository.findAll();
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void sendEmail(String to, String subject, String body) {
        // Always executes non-transactionally
        emailService.send(to, subject, body);
    }
}
```

#### Isolation Levels

```java
@Service
public class AccountService {

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void transferMoney(Long fromAccount, Long toAccount, BigDecimal amount) {
        Account from = accountRepository.findById(fromAccount).orElseThrow();
        Account to = accountRepository.findById(toAccount).orElseThrow();

        from.setBalance(from.getBalance().subtract(amount));
        to.setBalance(to.getBalance().add(amount));

        accountRepository.save(from);
        accountRepository.save(to);
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public void criticalOperation() {
        // Highest isolation level
    }
}
```

#### Rollback Configuration

```java
@Service
public class UserService {

    @Transactional(rollbackFor = {BusinessException.class, ValidationException.class})
    public User createUser(User user) throws BusinessException {
        validateUser(user);
        return userRepository.save(user);
    }

    @Transactional(noRollbackFor = {EmailException.class})
    public User createUserWithNotification(User user) {
        User saved = userRepository.save(user);
        try {
            emailService.sendWelcomeEmail(user.getEmail());
        } catch (EmailException e) {
            // Don't rollback transaction for email failures
            log.warn("Failed to send welcome email", e);
        }
        return saved;
    }
}
```

### Programmatic Transaction Management

```java
@Service
public class UserService {

    @Autowired
    private PlatformTransactionManager transactionManager;

    public void complexOperation() {
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);

        transactionTemplate.execute(status -> {
            try {
                // Business logic
                return null;
            } catch (Exception e) {
                status.setRollbackOnly();
                throw e;
            }
        });
    }
}
```

---

## Database Migration Tools

### Liquibase

#### Configuration

```properties
spring.liquibase.change-log=classpath:db/changelog/db.changelog-master.xml
spring.liquibase.contexts=development,test
spring.liquibase.drop-first=false
```

#### Master Changelog

```xml
<!-- db/changelog/db.changelog-master.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.8.xsd">

    <include file="db/changelog/001-create-users-table.xml"/>
    <include file="db/changelog/002-create-orders-table.xml"/>
    <include file="db/changelog/003-add-user-profile-table.xml"/>
</databaseChangeLog>
```

#### Individual Changeset

```xml
<!-- db/changelog/001-create-users-table.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.8.xsd">

    <changeSet id="001" author="developer">
        <createTable tableName="users">
            <column name="id" type="BIGINT" autoIncrement="true">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="username" type="VARCHAR(50)">
                <constraints nullable="false" unique="true"/>
            </column>
            <column name="email" type="VARCHAR(255)">
                <constraints nullable="false" unique="true"/>
            </column>
            <column name="password_hash" type="VARCHAR(255)">
                <constraints nullable="false"/>
            </column>
            <column name="is_active" type="BOOLEAN" defaultValueBoolean="true">
                <constraints nullable="false"/>
            </column>
            <column name="created_at" type="TIMESTAMP" defaultValueComputed="CURRENT_TIMESTAMP">
                <constraints nullable="false"/>
            </column>
            <column name="updated_at" type="TIMESTAMP"/>
            <column name="version" type="BIGINT" defaultValueNumeric="0"/>
        </createTable>

        <createIndex tableName="users" indexName="idx_users_email">
            <column name="email"/>
        </createIndex>

        <createIndex tableName="users" indexName="idx_users_username">
            <column name="username"/>
        </createIndex>
    </changeSet>
</databaseChangeLog>
```

### Flyway

#### Configuration

```properties
spring.flyway.locations=classpath:db/migration
spring.flyway.baseline-on-migrate=true
spring.flyway.validate-on-migrate=true
```

#### Migration Files

```sql
-- V1__Create_users_table.sql
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

```sql
-- V2__Create_orders_table.sql
CREATE TABLE orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_date ON orders(order_date);
```

---

## Caching Strategies

### Spring's Caching Abstraction

#### Enable Caching

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager();
        cacheManager.setCacheNames(Arrays.asList("users", "orders", "products"));
        return cacheManager;
    }
}
```

#### Cache Annotations

```java
@Service
public class UserService {

    @Cacheable(value = "users", key = "#id")
    public User findById(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    @Cacheable(value = "users", key = "#email")
    public User findByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
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
        // Method body doesn't matter for @CacheEvict
    }

    @Caching(
        cacheable = @Cacheable(value = "users", key = "#id"),
        put = @CachePut(value = "userProfiles", key = "#id")
    )
    public User findUserWithProfile(Long id) {
        return userRepository.findByIdWithProfile(id);
    }
}
```

### Redis Integration

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

```properties
spring.redis.host=localhost
spring.redis.port=6379
spring.redis.database=0
spring.redis.timeout=2000ms
spring.redis.jedis.pool.max-active=20
spring.redis.jedis.pool.max-idle=10
spring.redis.jedis.pool.min-idle=5
```

```java
@Configuration
@EnableCaching
public class RedisConfig {

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .serializeKeysWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer()));

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(config)
            .transactionAware()
            .build();
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }
}
```

### Custom Cache Implementation

```java
@Service
public class UserCacheService {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private static final String USER_CACHE_KEY = "user:";
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    public void cacheUser(User user) {
        String key = USER_CACHE_KEY + user.getId();
        redisTemplate.opsForValue().set(key, user, CACHE_TTL);
    }

    public User getCachedUser(Long userId) {
        String key = USER_CACHE_KEY + userId;
        return (User) redisTemplate.opsForValue().get(key);
    }

    public void evictUser(Long userId) {
        String key = USER_CACHE_KEY + userId;
        redisTemplate.delete(key);
    }

    public void cacheUserList(String cacheKey, List<User> users) {
        redisTemplate.opsForValue().set(cacheKey, users, CACHE_TTL);
    }
}
```

---

## Best Practices

### 1. Repository Design

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Use meaningful method names
    List<User> findByActiveOrderByCreatedAtDesc(boolean active);

    // Use @Query for complex queries
    @Query("SELECT u FROM User u WHERE u.email = :email AND u.active = true")
    Optional<User> findActiveUserByEmail(@Param("email") String email);

    // Use projections for specific data
    @Query("SELECT u.id as id, u.username as username FROM User u WHERE u.active = true")
    List<UserProjection> findActiveUserSummaries();
}
```

### 2. Entity Design

```java
@Entity
@Table(name = "users")
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"orders", "profile"}) // Avoid lazy loading in toString
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    // Use appropriate fetch types
    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    private List<Order> orders = new ArrayList<>();

    // Helper methods for bidirectional relationships
    public void addOrder(Order order) {
        orders.add(order);
        order.setUser(this);
    }
}
```

### 3. Service Layer Patterns

```java
@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public UserService(UserRepository userRepository, UserMapper userMapper) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
    }

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        // Validate
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException("Email already exists");
        }

        // Convert and save
        User user = userMapper.toEntity(request);
        User saved = userRepository.save(user);

        // Return response
        return userMapper.toResponse(saved);
    }

    public Page<UserResponse> findUsers(UserSearchCriteria criteria, Pageable pageable) {
        Page<User> users = userRepository.findAll(buildSpecification(criteria), pageable);
        return users.map(userMapper::toResponse);
    }
}
```

### 4. Error Handling

```java
@Service
public class UserService {

    public User findById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException("User not found with id: " + id));
    }

    @Transactional
    public User updateUser(Long id, UpdateUserRequest request) {
        User user = findById(id);

        // Check for concurrent modification
        if (!user.getVersion().equals(request.getVersion())) {
            throw new OptimisticLockException("User was modified by another process");
        }

        userMapper.updateEntity(user, request);
        return userRepository.save(user);
    }
}
```

This comprehensive guide covers all essential data access and persistence concepts for Spring Boot SDE2 development.
