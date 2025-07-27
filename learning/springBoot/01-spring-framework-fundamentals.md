# Spring Framework & Spring Boot Fundamentals

## Table of Contents

1. [Inversion of Control (IoC) and Dependency Injection (DI)](#ioc-and-di)
2. [Bean Lifecycle and Scopes](#bean-lifecycle-and-scopes)
3. [Injection Types](#injection-types)
4. [Core Annotations](#core-annotations)
5. [Configuration Approaches](#configuration-approaches)
6. [Aspect-Oriented Programming (AOP)](#aspect-oriented-programming)
7. [Spring Boot Internals](#spring-boot-internals)

---

## Inversion of Control (IoC) and Dependency Injection (DI)

### What is IoC?

Inversion of Control is a design principle where the control of object creation and dependency management is transferred from the application code to an external container (Spring IoC Container).

### What is Dependency Injection?

Dependency Injection is a technique where dependencies are provided to an object rather than the object creating them itself.

### Benefits

- **Loose Coupling**: Objects don't need to know how to create their dependencies
- **Testability**: Easy to mock dependencies for unit testing
- **Maintainability**: Changes in dependencies don't affect dependent classes
- **Flexibility**: Easy to swap implementations

### Example

```java
// Without DI (Tight Coupling)
public class OrderService {
    private EmailService emailService = new EmailService(); // Hard dependency

    public void processOrder(Order order) {
        // Process order
        emailService.sendConfirmation(order);
    }
}

// With DI (Loose Coupling)
@Service
public class OrderService {
    private final EmailService emailService;

    public OrderService(EmailService emailService) {
        this.emailService = emailService;
    }

    public void processOrder(Order order) {
        // Process order
        emailService.sendConfirmation(order);
    }
}
```

---

## Bean Lifecycle and Scopes

### Bean Lifecycle

1. **Instantiation**: Spring creates bean instance
2. **Dependency Injection**: Dependencies are injected
3. **Initialization**: `@PostConstruct` methods are called
4. **Ready for Use**: Bean is ready to serve requests
5. **Destruction**: `@PreDestroy` methods are called before container shutdown

### Bean Lifecycle Example

```java
@Component
public class DatabaseConnection {

    @PostConstruct
    public void init() {
        System.out.println("Establishing database connection...");
        // Initialize connection
    }

    @PreDestroy
    public void cleanup() {
        System.out.println("Closing database connection...");
        // Close connection
    }
}
```

### Bean Scopes

#### 1. Singleton (Default)

- One instance per Spring IoC container
- Shared across all requests

```java
@Component
@Scope("singleton") // Default scope
public class ConfigurationService {
    // Single instance for entire application
}
```

#### 2. Prototype

- New instance created every time bean is requested

```java
@Component
@Scope("prototype")
public class UserSession {
    // New instance for each request
}
```

#### 3. Request (Web Applications)

- One instance per HTTP request

```java
@Component
@Scope("request")
public class RequestProcessor {
    // New instance for each HTTP request
}
```

#### 4. Session (Web Applications)

- One instance per HTTP session

```java
@Component
@Scope("session")
public class UserPreferences {
    // One instance per user session
}
```

---

## Injection Types

### 1. Constructor Injection (Recommended)

```java
@Service
public class OrderService {
    private final PaymentService paymentService;
    private final InventoryService inventoryService;

    // Constructor injection - recommended
    public OrderService(PaymentService paymentService,
                       InventoryService inventoryService) {
        this.paymentService = paymentService;
        this.inventoryService = inventoryService;
    }
}
```

**Benefits:**

- Ensures immutable dependencies
- Guarantees required dependencies are provided
- Enables final fields
- Better for testing

### 2. Setter Injection

```java
@Service
public class OrderService {
    private PaymentService paymentService;
    private InventoryService inventoryService;

    @Autowired
    public void setPaymentService(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @Autowired
    public void setInventoryService(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }
}
```

**Use Cases:**

- Optional dependencies
- Circular dependencies (though should be avoided)

### 3. Field Injection (Not Recommended)

```java
@Service
public class OrderService {
    @Autowired
    private PaymentService paymentService;

    @Autowired
    private InventoryService inventoryService;
}
```

**Why Not Recommended:**

- Harder to test
- Violates immutability
- Hidden dependencies

---

## Core Annotations

### @Autowired

```java
@Service
public class OrderService {

    // Constructor injection
    public OrderService(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    // Method injection
    @Autowired
    public void setInventoryService(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }
}
```

### @Qualifier

Used when multiple beans of same type exist:

```java
@Service
public class NotificationService {

    public NotificationService(@Qualifier("emailNotifier") Notifier notifier) {
        this.notifier = notifier;
    }
}

@Component("emailNotifier")
public class EmailNotifier implements Notifier {
    // Implementation
}

@Component("smsNotifier")
public class SmsNotifier implements Notifier {
    // Implementation
}
```

### @Primary

Marks a bean as primary when multiple candidates exist:

```java
@Primary
@Component
public class EmailNotifier implements Notifier {
    // This will be injected by default
}

@Component
public class SmsNotifier implements Notifier {
    // Alternative implementation
}
```

### @Resource

JSR-250 annotation for injection by name:

```java
@Service
public class OrderService {

    @Resource(name = "emailNotifier")
    private Notifier notifier;
}
```

---

## Configuration Approaches

### 1. Java-based Configuration

#### @Configuration

```java
@Configuration
public class AppConfig {

    @Bean
    public DataSource dataSource() {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl("jdbc:mysql://localhost:3306/mydb");
        dataSource.setUsername("user");
        dataSource.setPassword("password");
        return dataSource;
    }

    @Bean
    public EmailService emailService() {
        return new EmailService("smtp.gmail.com", 587);
    }

    @Bean
    public OrderService orderService(PaymentService paymentService) {
        return new OrderService(paymentService);
    }
}
```

#### Benefits of Java Configuration:

- Type-safe
- IDE support
- Refactoring friendly
- Can use programming constructs

### 2. Annotation-based Configuration

#### @Component

Generic stereotype annotation:

```java
@Component
public class UtilityService {
    // Generic component
}
```

#### @Service

For business logic layer:

```java
@Service
public class OrderService {
    // Business logic
}
```

#### @Repository

For data access layer:

```java
@Repository
public class OrderRepository {
    // Data access logic
}
```

#### @Controller

For presentation layer:

```java
@Controller
public class OrderController {
    // Web layer
}
```

---

## Aspect-Oriented Programming (AOP)

### Understanding Cross-Cutting Concerns

Cross-cutting concerns are aspects of a program that affect multiple modules:

- **Logging**
- **Security**
- **Transaction Management**
- **Caching**
- **Error Handling**

### AOP Terminology

#### 1. Aspect

A module that encapsulates cross-cutting concerns:

```java
@Aspect
@Component
public class LoggingAspect {

    @Around("@annotation(Loggable)")
    public Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();

        Object result = joinPoint.proceed();

        long executionTime = System.currentTimeMillis() - start;
        System.out.println(joinPoint.getSignature() + " executed in " + executionTime + "ms");

        return result;
    }
}
```

#### 2. Join Point

A point in program execution where an aspect can be applied (method calls, field access, etc.)

#### 3. Advice Types

**@Before**: Executes before method execution

```java
@Before("execution(* com.example.service.*.*(..))")
public void beforeAdvice(JoinPoint joinPoint) {
    System.out.println("Before method: " + joinPoint.getSignature());
}
```

**@After**: Executes after method execution (regardless of outcome)

```java
@After("execution(* com.example.service.*.*(..))")
public void afterAdvice(JoinPoint joinPoint) {
    System.out.println("After method: " + joinPoint.getSignature());
}
```

**@Around**: Wraps around method execution

```java
@Around("execution(* com.example.service.*.*(..))")
public Object aroundAdvice(ProceedingJoinPoint joinPoint) throws Throwable {
    System.out.println("Before method execution");
    Object result = joinPoint.proceed();
    System.out.println("After method execution");
    return result;
}
```

**@AfterReturning**: Executes after successful method execution

```java
@AfterReturning(pointcut = "execution(* com.example.service.*.*(..))", returning = "result")
public void afterReturningAdvice(JoinPoint joinPoint, Object result) {
    System.out.println("Method returned: " + result);
}
```

**@AfterThrowing**: Executes when method throws exception

```java
@AfterThrowing(pointcut = "execution(* com.example.service.*.*(..))", throwing = "error")
public void afterThrowingAdvice(JoinPoint joinPoint, Throwable error) {
    System.out.println("Method threw exception: " + error);
}
```

#### 4. Pointcut

Expression that defines where advice should be applied:

```java
@Aspect
@Component
public class SecurityAspect {

    @Pointcut("execution(* com.example.service.*.*(..))")
    public void serviceLayer() {}

    @Pointcut("@annotation(com.example.annotation.Secured)")
    public void securedMethods() {}

    @Before("serviceLayer() && securedMethods()")
    public void checkSecurity(JoinPoint joinPoint) {
        // Security check logic
    }
}
```

### Creating Custom Annotations with AOP

#### 1. Create Custom Annotation

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Loggable {
    String value() default "";
}
```

#### 2. Create Aspect

```java
@Aspect
@Component
public class LoggingAspect {

    @Around("@annotation(loggable)")
    public Object logMethodExecution(ProceedingJoinPoint joinPoint, Loggable loggable) throws Throwable {
        String methodName = joinPoint.getSignature().getName();
        String customMessage = loggable.value();

        System.out.println("Starting method: " + methodName + " - " + customMessage);

        long startTime = System.currentTimeMillis();
        Object result = joinPoint.proceed();
        long endTime = System.currentTimeMillis();

        System.out.println("Completed method: " + methodName + " in " + (endTime - startTime) + "ms");

        return result;
    }
}
```

#### 3. Use the Annotation

```java
@Service
public class OrderService {

    @Loggable("Processing customer order")
    public Order processOrder(Order order) {
        // Business logic
        return order;
    }
}
```

---

## Spring Boot Internals

### Auto-Configuration

#### How Auto-Configuration Works

1. Spring Boot scans classpath for dependencies
2. Based on dependencies found, it automatically configures beans
3. Uses conditional annotations to apply configurations

#### @EnableAutoConfiguration

```java
@SpringBootApplication // Includes @EnableAutoConfiguration
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

#### @ConditionalOn... Annotations

```java
@Configuration
@ConditionalOnClass(DataSource.class)
@ConditionalOnProperty(name = "spring.datasource.url")
public class DataSourceAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public DataSource dataSource() {
        return new HikariDataSource();
    }
}
```

**Common Conditional Annotations:**

- `@ConditionalOnClass`: When specific class is on classpath
- `@ConditionalOnMissingBean`: When bean is not already defined
- `@ConditionalOnProperty`: When specific property is set
- `@ConditionalOnWebApplication`: When it's a web application

### Custom Starters

#### 1. Create Auto-Configuration Class

```java
@Configuration
@EnableConfigurationProperties(MyServiceProperties.class)
@ConditionalOnClass(MyService.class)
@ConditionalOnProperty(prefix = "myservice", name = "enabled", havingValue = "true", matchIfMissing = true)
public class MyServiceAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public MyService myService(MyServiceProperties properties) {
        return new MyService(properties.getApiKey(), properties.getBaseUrl());
    }
}
```

#### 2. Create Configuration Properties

```java
@ConfigurationProperties(prefix = "myservice")
public class MyServiceProperties {
    private String apiKey;
    private String baseUrl = "https://api.example.com";
    private boolean enabled = true;

    // Getters and setters
}
```

#### 3. Create spring.factories file

```
# src/main/resources/META-INF/spring.factories
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
com.example.autoconfigure.MyServiceAutoConfiguration
```

### Spring Boot Build Process

#### Fat JARs

Spring Boot creates executable JARs that include:

- Application classes
- Dependencies
- Embedded server (Tomcat, Jetty, Undertow)

#### Maven Plugin Configuration

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <configuration>
        <mainClass>com.example.Application</mainClass>
    </configuration>
</plugin>
```

### Profiles

#### application.properties

```properties
# Default profile
spring.application.name=myapp
logging.level.root=INFO

# Development profile (application-dev.properties)
spring.datasource.url=jdbc:h2:mem:devdb
spring.jpa.hibernate.ddl-auto=create-drop
logging.level.com.example=DEBUG

# Production profile (application-prod.properties)
spring.datasource.url=jdbc:mysql://prod-server:3306/proddb
spring.jpa.hibernate.ddl-auto=validate
logging.level.root=WARN
```

#### Using Profiles

```bash
# Command line
java -jar app.jar --spring.profiles.active=prod

# Environment variable
export SPRING_PROFILES_ACTIVE=dev

# In application.properties
spring.profiles.active=dev
```

#### Profile-specific Beans

```java
@Configuration
@Profile("dev")
public class DevConfig {

    @Bean
    public DataSource devDataSource() {
        return new H2DataSource();
    }
}

@Configuration
@Profile("prod")
public class ProdConfig {

    @Bean
    public DataSource prodDataSource() {
        return new MySQLDataSource();
    }
}
```

### Externalized Configuration

#### Configuration Precedence (Highest to Lowest)

1. Command line arguments
2. JNDI attributes
3. Java System properties
4. OS environment variables
5. Profile-specific properties
6. Application properties
7. @PropertySource annotations
8. Default properties

#### Example

```bash
# All these will override application.properties
java -jar app.jar --server.port=9090
export SERVER_PORT=8080
java -Dserver.port=7070 -jar app.jar
```

#### @ConfigurationProperties

```java
@ConfigurationProperties(prefix = "app")
@Component
public class AppProperties {
    private String name;
    private String version;
    private Security security = new Security();

    public static class Security {
        private boolean enabled = true;
        private String secret;

        // Getters and setters
    }

    // Getters and setters
}
```

#### Using in application.yml

```yaml
app:
  name: MyApplication
  version: 1.0.0
  security:
    enabled: true
    secret: mysecret
```

---

## Best Practices

1. **Use Constructor Injection** for required dependencies
2. **Prefer @Component and stereotypes** over @Bean for simple cases
3. **Use @Primary sparingly** - prefer @Qualifier for explicit injection
4. **Keep aspects simple** and focused on single concerns
5. **Use profiles** for environment-specific configurations
6. **Externalize configuration** using properties files
7. **Create custom starters** for reusable functionality across projects
8. **Document your aspects** as they can make debugging harder

---

## Common Pitfalls

1. **Circular Dependencies**: Use @Lazy or refactor design
2. **Singleton Bean with Prototype Dependency**: Use @Lookup or Provider
3. **Overusing Field Injection**: Prefer constructor injection
4. **Too Many Pointcuts**: Can impact performance
5. **Not Understanding Bean Scopes**: Can lead to unexpected behavior

This foundation is crucial for building robust Spring Boot applications at the SDE2 level.
