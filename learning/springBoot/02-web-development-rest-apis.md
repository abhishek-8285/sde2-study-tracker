# Web Development & REST APIs

## Table of Contents

1. [Spring MVC Fundamentals](#spring-mvc-fundamentals)
2. [Advanced REST Concepts](#advanced-rest-concepts)
3. [Exception Handling](#exception-handling)
4. [Content Negotiation](#content-negotiation)
5. [API Versioning](#api-versioning)
6. [WebFlux and Reactive Programming](#webflux-and-reactive-programming)
7. [Best Practices](#best-practices)

---

## Spring MVC Fundamentals

### @RestController vs @Controller

#### @Controller

Returns view names and model data for server-side rendering:

```java
@Controller
public class UserController {

    @GetMapping("/users")
    public String listUsers(Model model) {
        model.addAttribute("users", userService.findAll());
        return "users/list"; // Returns view name
    }
}
```

#### @RestController

Combines @Controller and @ResponseBody for REST APIs:

```java
@RestController
@RequestMapping("/api/users")
public class UserRestController {

    @Autowired
    private UserService userService;

    @GetMapping
    public List<User> getAllUsers() {
        return userService.findAll(); // Automatically serialized to JSON
    }
}
```

### Request Mapping Annotations

#### @RequestMapping (Generic)

```java
@RequestMapping(value = "/users", method = RequestMethod.GET)
public List<User> getUsers() {
    return userService.findAll();
}

@RequestMapping(value = "/users", method = RequestMethod.POST,
                consumes = "application/json",
                produces = "application/json")
public User createUser(@RequestBody User user) {
    return userService.save(user);
}
```

#### Specific HTTP Method Annotations

```java
@GetMapping("/users")
public List<User> getUsers() {
    return userService.findAll();
}

@PostMapping("/users")
public ResponseEntity<User> createUser(@RequestBody User user) {
    User created = userService.save(user);
    return ResponseEntity.status(HttpStatus.CREATED).body(created);
}

@PutMapping("/users/{id}")
public User updateUser(@PathVariable Long id, @RequestBody User user) {
    return userService.update(id, user);
}

@DeleteMapping("/users/{id}")
public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
    userService.delete(id);
    return ResponseEntity.noContent().build();
}

@PatchMapping("/users/{id}")
public User partialUpdate(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
    return userService.partialUpdate(id, updates);
}
```

### Parameter Binding

#### @PathVariable

```java
@GetMapping("/users/{id}")
public User getUserById(@PathVariable Long id) {
    return userService.findById(id);
}

@GetMapping("/users/{id}/orders/{orderId}")
public Order getUserOrder(@PathVariable Long id,
                         @PathVariable Long orderId) {
    return orderService.findByUserIdAndOrderId(id, orderId);
}

// Optional path variable
@GetMapping("/users/{id}/profile/{type}")
public Profile getUserProfile(@PathVariable Long id,
                             @PathVariable(required = false) String type) {
    return profileService.findByUserAndType(id, type);
}
```

#### @RequestParam

```java
@GetMapping("/users")
public List<User> getUsers(@RequestParam(defaultValue = "0") int page,
                          @RequestParam(defaultValue = "10") int size,
                          @RequestParam(required = false) String name) {
    return userService.findUsers(page, size, name);
}

// Multiple values
@GetMapping("/users")
public List<User> getUsersByIds(@RequestParam List<Long> ids) {
    return userService.findByIds(ids);
}
```

#### @RequestBody

```java
@PostMapping("/users")
public ResponseEntity<User> createUser(@RequestBody @Valid User user) {
    User created = userService.save(user);
    return ResponseEntity.status(HttpStatus.CREATED).body(created);
}

// Partial update with Map
@PatchMapping("/users/{id}")
public User updateUser(@PathVariable Long id,
                      @RequestBody Map<String, Object> updates) {
    return userService.partialUpdate(id, updates);
}
```

#### @RequestHeader

```java
@GetMapping("/users/profile")
public UserProfile getUserProfile(@RequestHeader("Authorization") String token,
                                 @RequestHeader(value = "User-Agent", required = false) String userAgent) {
    return profileService.findByToken(token, userAgent);
}
```

### DTO Pattern and Model Mapping

#### DTO Classes

```java
// Request DTO
public class CreateUserRequest {
    @NotBlank
    private String username;

    @Email
    private String email;

    @Size(min = 8)
    private String password;

    // Getters and setters
}

// Response DTO
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private LocalDateTime createdAt;
    private boolean active;

    // Getters and setters
}
```

#### Using DTOs in Controllers

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping
    public ResponseEntity<UserResponse> createUser(@RequestBody @Valid CreateUserRequest request) {
        User user = convertToEntity(request);
        User created = userService.save(user);
        UserResponse response = convertToResponse(created);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    private User convertToEntity(CreateUserRequest request) {
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(request.getPassword());
        return user;
    }

    private UserResponse convertToResponse(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setCreatedAt(user.getCreatedAt());
        response.setActive(user.isActive());
        return response;
    }
}
```

#### Using MapStruct for Mapping

```java
@Mapper(componentModel = "spring")
public interface UserMapper {

    User toEntity(CreateUserRequest request);

    UserResponse toResponse(User user);

    List<UserResponse> toResponseList(List<User> users);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    User updateEntity(@MappingTarget User user, UpdateUserRequest request);
}
```

---

## Advanced REST Concepts

### RESTful API Design Principles

#### 1. Statelessness

Each request contains all information needed to process it:

```java
@GetMapping("/users/{id}/orders")
public List<Order> getUserOrders(@PathVariable Long id,
                                @RequestHeader("Authorization") String token) {
    // Validate token and process request
    return orderService.findByUserId(id);
}
```

#### 2. Uniform Interface

Consistent resource naming and HTTP methods:

```java
// Good RESTful design
@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping                    // GET /api/users
    @GetMapping("/{id}")          // GET /api/users/123
    @PostMapping                  // POST /api/users
    @PutMapping("/{id}")         // PUT /api/users/123
    @DeleteMapping("/{id}")      // DELETE /api/users/123
}
```

#### 3. Resource-Based URLs

```java
// Good: Resource-based
GET    /api/users/123/orders
POST   /api/users/123/orders
DELETE /api/users/123/orders/456

// Bad: Action-based
GET    /api/getUserOrders?userId=123
POST   /api/createOrder
DELETE /api/deleteOrder?orderId=456
```

### HTTP Methods and Status Codes

#### Idempotency

```java
@RestController
public class OrderController {

    // GET - Idempotent (safe)
    @GetMapping("/orders/{id}")
    public Order getOrder(@PathVariable Long id) {
        return orderService.findById(id);
    }

    // PUT - Idempotent (can be called multiple times)
    @PutMapping("/orders/{id}")
    public Order updateOrder(@PathVariable Long id, @RequestBody Order order) {
        return orderService.update(id, order);
    }

    // DELETE - Idempotent
    @DeleteMapping("/orders/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        orderService.delete(id);
        return ResponseEntity.noContent().build(); // 204
    }

    // POST - Not idempotent
    @PostMapping("/orders")
    public ResponseEntity<Order> createOrder(@RequestBody Order order) {
        Order created = orderService.save(order);
        return ResponseEntity.status(HttpStatus.CREATED).body(created); // 201
    }
}
```

#### Proper Status Codes

```java
@RestController
public class OrderController {

    @PostMapping("/orders")
    public ResponseEntity<Order> createOrder(@RequestBody Order order) {
        Order created = orderService.save(order);
        URI location = URI.create("/api/orders/" + created.getId());
        return ResponseEntity.created(location).body(created); // 201 Created
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<Order> getOrder(@PathVariable Long id) {
        Optional<Order> order = orderService.findById(id);
        return order.map(o -> ResponseEntity.ok(o))           // 200 OK
                   .orElse(ResponseEntity.notFound().build()); // 404 Not Found
    }

    @PutMapping("/orders/{id}")
    public ResponseEntity<Order> updateOrder(@PathVariable Long id, @RequestBody Order order) {
        if (!orderService.exists(id)) {
            return ResponseEntity.notFound().build(); // 404
        }
        Order updated = orderService.update(id, order);
        return ResponseEntity.ok(updated); // 200 OK
    }

    @DeleteMapping("/orders/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        if (!orderService.exists(id)) {
            return ResponseEntity.notFound().build(); // 404
        }
        orderService.delete(id);
        return ResponseEntity.noContent().build(); // 204 No Content
    }
}
```

---

## Exception Handling

### @ControllerAdvice

Global exception handling across all controllers:

```java
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex) {
        ErrorResponse error = ErrorResponse.builder()
            .status(HttpStatus.NOT_FOUND.value())
            .error("User Not Found")
            .message(ex.getMessage())
            .timestamp(LocalDateTime.now())
            .path(getCurrentPath())
            .build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidation(ValidationException ex) {
        ErrorResponse error = ErrorResponse.builder()
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Validation Failed")
            .message(ex.getMessage())
            .timestamp(LocalDateTime.now())
            .build();
        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        ValidationErrorResponse errorResponse = new ValidationErrorResponse();
        errorResponse.setStatus(HttpStatus.BAD_REQUEST.value());
        errorResponse.setError("Validation Failed");
        errorResponse.setTimestamp(LocalDateTime.now());

        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
            fieldErrors.put(error.getField(), error.getDefaultMessage())
        );
        errorResponse.setFieldErrors(fieldErrors);

        return ResponseEntity.badRequest().body(errorResponse);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex) {
        ErrorResponse error = ErrorResponse.builder()
            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
            .error("Internal Server Error")
            .message("An unexpected error occurred")
            .timestamp(LocalDateTime.now())
            .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
```

### Custom Exception Classes

```java
public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(Long id) {
        super("User not found with id: " + id);
    }
}

public class ValidationException extends RuntimeException {
    public ValidationException(String message) {
        super(message);
    }
}
```

### Error Response DTOs

```java
@Data
@Builder
public class ErrorResponse {
    private int status;
    private String error;
    private String message;
    private LocalDateTime timestamp;
    private String path;
}

@Data
public class ValidationErrorResponse {
    private int status;
    private String error;
    private LocalDateTime timestamp;
    private Map<String, String> fieldErrors;
}
```

### ResponseStatusException

For simple error handling without custom exceptions:

```java
@RestController
public class UserController {

    @GetMapping("/users/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "User not found with id: " + id));
    }
}
```

---

## Content Negotiation

### Handling Multiple Content Types

```java
@RestController
public class UserController {

    @GetMapping(value = "/users/{id}",
                produces = {MediaType.APPLICATION_JSON_VALUE, MediaType.APPLICATION_XML_VALUE})
    public User getUser(@PathVariable Long id) {
        return userService.findById(id);
    }

    @PostMapping(value = "/users",
                 consumes = {MediaType.APPLICATION_JSON_VALUE, MediaType.APPLICATION_XML_VALUE},
                 produces = {MediaType.APPLICATION_JSON_VALUE, MediaType.APPLICATION_XML_VALUE})
    public User createUser(@RequestBody User user) {
        return userService.save(user);
    }
}
```

### Configuration for XML Support

```xml
<dependency>
    <groupId>com.fasterxml.jackson.dataformat</groupId>
    <artifactId>jackson-dataformat-xml</artifactId>
</dependency>
```

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void configureContentNegotiation(ContentNegotiationConfigurer configurer) {
        configurer
            .favorParameter(true)
            .parameterName("mediaType")
            .favorPathExtension(false)
            .favorHeader(true)
            .defaultContentType(MediaType.APPLICATION_JSON)
            .mediaType("json", MediaType.APPLICATION_JSON)
            .mediaType("xml", MediaType.APPLICATION_XML);
    }
}
```

---

## API Versioning

### 1. URI Versioning

```java
@RestController
@RequestMapping("/api/v1/users")
public class UserControllerV1 {

    @GetMapping("/{id}")
    public UserV1 getUser(@PathVariable Long id) {
        return userService.findByIdV1(id);
    }
}

@RestController
@RequestMapping("/api/v2/users")
public class UserControllerV2 {

    @GetMapping("/{id}")
    public UserV2 getUser(@PathVariable Long id) {
        return userService.findByIdV2(id);
    }
}
```

### 2. Header Versioning

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping(value = "/{id}", headers = "API-Version=1")
    public UserV1 getUserV1(@PathVariable Long id) {
        return userService.findByIdV1(id);
    }

    @GetMapping(value = "/{id}", headers = "API-Version=2")
    public UserV2 getUserV2(@PathVariable Long id) {
        return userService.findByIdV2(id);
    }
}
```

### 3. Parameter Versioning

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping(value = "/{id}", params = "version=1")
    public UserV1 getUserV1(@PathVariable Long id) {
        return userService.findByIdV1(id);
    }

    @GetMapping(value = "/{id}", params = "version=2")
    public UserV2 getUserV2(@PathVariable Long id) {
        return userService.findByIdV2(id);
    }
}
```

### 4. Media Type Versioning

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping(value = "/{id}", produces = "application/vnd.company.app-v1+json")
    public UserV1 getUserV1(@PathVariable Long id) {
        return userService.findByIdV1(id);
    }

    @GetMapping(value = "/{id}", produces = "application/vnd.company.app-v2+json")
    public UserV2 getUserV2(@PathVariable Long id) {
        return userService.findByIdV2(id);
    }
}
```

---

## HATEOAS

### Hypermedia as the Engine of Application State

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-hateoas</artifactId>
</dependency>
```

```java
@RestController
public class UserController {

    @GetMapping("/users/{id}")
    public EntityModel<User> getUser(@PathVariable Long id) {
        User user = userService.findById(id);

        return EntityModel.of(user)
            .add(linkTo(methodOn(UserController.class).getUser(id)).withSelfRel())
            .add(linkTo(methodOn(UserController.class).getAllUsers()).withRel("users"))
            .add(linkTo(methodOn(OrderController.class).getUserOrders(id)).withRel("orders"));
    }

    @GetMapping("/users")
    public CollectionModel<EntityModel<User>> getAllUsers() {
        List<EntityModel<User>> users = userService.findAll().stream()
            .map(user -> EntityModel.of(user)
                .add(linkTo(methodOn(UserController.class).getUser(user.getId())).withSelfRel()))
            .collect(Collectors.toList());

        return CollectionModel.of(users)
            .add(linkTo(methodOn(UserController.class).getAllUsers()).withSelfRel());
    }
}
```

---

## WebFlux and Reactive Programming

### Introduction to Reactive Streams

#### Mono and Flux

```java
// Mono - 0 or 1 element
Mono<User> userMono = Mono.just(new User("john", "john@example.com"));
Mono<User> emptyMono = Mono.empty();
Mono<User> errorMono = Mono.error(new RuntimeException("Error"));

// Flux - 0 to N elements
Flux<User> userFlux = Flux.just(
    new User("john", "john@example.com"),
    new User("jane", "jane@example.com")
);
Flux<Integer> numberFlux = Flux.range(1, 10);
```

### Reactive Controller

```java
@RestController
@RequestMapping("/api/reactive/users")
public class ReactiveUserController {

    @Autowired
    private ReactiveUserService userService;

    @GetMapping
    public Flux<User> getAllUsers() {
        return userService.findAll();
    }

    @GetMapping("/{id}")
    public Mono<ResponseEntity<User>> getUser(@PathVariable String id) {
        return userService.findById(id)
            .map(user -> ResponseEntity.ok(user))
            .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Mono<User> createUser(@RequestBody User user) {
        return userService.save(user);
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<User> streamUsers() {
        return userService.findAll()
            .delayElements(Duration.ofSeconds(1));
    }
}
```

### Reactive Service

```java
@Service
public class ReactiveUserService {

    @Autowired
    private ReactiveUserRepository userRepository;

    public Flux<User> findAll() {
        return userRepository.findAll();
    }

    public Mono<User> findById(String id) {
        return userRepository.findById(id);
    }

    public Mono<User> save(User user) {
        return userRepository.save(user);
    }

    public Flux<User> findByActiveStatus(boolean active) {
        return userRepository.findByActive(active);
    }
}
```

### Reactive Repository

```java
@Repository
public interface ReactiveUserRepository extends ReactiveMongoRepository<User, String> {

    Flux<User> findByActive(boolean active);

    @Query("{ 'email': ?0 }")
    Mono<User> findByEmail(String email);

    Flux<User> findByCreatedAtAfter(LocalDateTime date);
}
```

### When to Use WebFlux vs Spring MVC

#### Use WebFlux When:

- High concurrency with limited threads
- Non-blocking I/O operations
- Streaming data
- Integration with reactive databases (MongoDB, R2DBC)
- Microservices with reactive communication

#### Use Spring MVC When:

- Blocking I/O operations
- Traditional relational databases with JPA
- Simpler programming model
- Team familiar with imperative programming

### Reactive Operations

```java
@Service
public class ReactiveUserService {

    public Flux<User> findActiveUsers() {
        return userRepository.findAll()
            .filter(user -> user.isActive())
            .take(10)
            .map(this::enrichUser);
    }

    public Mono<User> createUserWithValidation(User user) {
        return validateUser(user)
            .flatMap(userRepository::save)
            .doOnSuccess(savedUser -> sendWelcomeEmail(savedUser))
            .onErrorMap(ValidationException.class,
                       ex -> new UserCreationException("Failed to create user", ex));
    }

    private Mono<User> validateUser(User user) {
        if (user.getEmail() == null || user.getEmail().isEmpty()) {
            return Mono.error(new ValidationException("Email is required"));
        }
        return Mono.just(user);
    }

    private User enrichUser(User user) {
        // Enrich user data
        return user;
    }

    private void sendWelcomeEmail(User user) {
        // Send welcome email asynchronously
    }
}
```

---

## Best Practices

### 1. Controller Design

```java
@RestController
@RequestMapping("/api/users")
@Validated
public class UserController {

    private final UserService userService;

    // Constructor injection
    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<Page<UserResponse>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {

        Pageable pageable = PageRequest.of(page, size);
        Page<UserResponse> users = userService.findUsers(search, pageable);
        return ResponseEntity.ok(users);
    }
}
```

### 2. Input Validation

```java
public class CreateUserRequest {

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 20, message = "Username must be between 3 and 20 characters")
    private String username;

    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$",
             message = "Password must contain at least one lowercase, one uppercase, and one digit")
    private String password;
}
```

### 3. Consistent Error Responses

```java
@Data
@Builder
public class ApiResponse<T> {
    private boolean success;
    private T data;
    private String message;
    private List<String> errors;
    private LocalDateTime timestamp;

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
            .success(true)
            .data(data)
            .timestamp(LocalDateTime.now())
            .build();
    }

    public static <T> ApiResponse<T> error(String message, List<String> errors) {
        return ApiResponse.<T>builder()
            .success(false)
            .message(message)
            .errors(errors)
            .timestamp(LocalDateTime.now())
            .build();
    }
}
```

### 4. Pagination and Sorting

```java
@GetMapping
public ResponseEntity<Page<UserResponse>> getUsers(
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
        @RequestParam(required = false) String search) {

    Page<UserResponse> users = userService.findUsers(search, pageable);
    return ResponseEntity.ok(users);
}
```

### 5. Logging and Monitoring

```java
@RestController
@Slf4j
public class UserController {

    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable Long id) {
        log.info("Fetching user with id: {}", id);

        try {
            User user = userService.findById(id);
            log.debug("Found user: {}", user.getUsername());
            return ResponseEntity.ok(user);
        } catch (UserNotFoundException ex) {
            log.warn("User not found with id: {}", id);
            throw ex;
        }
    }
}
```

This comprehensive guide covers the essential web development and REST API concepts needed for Spring Boot SDE2 level development.
