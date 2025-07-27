# Advanced API Testing for SDE2+ Engineers 🧪

## 🎯 **Overview**

Comprehensive API testing is crucial for building reliable, maintainable applications. This guide covers everything from Test-Driven Development (TDD) to performance testing, contract testing, and automated testing strategies for production-ready APIs.

## 📚 **Testing Strategy Pyramid**

### **Testing Levels**

```
        🔺 E2E Tests (10%)
      🔺🔺 Integration Tests (20%)
    🔺🔺🔺 Unit Tests (70%)
```

**Unit Tests**: Fast, isolated, test individual functions  
**Integration Tests**: Test component interactions  
**End-to-End Tests**: Test complete user workflows

---

## 🔧 **Test-Driven Development (TDD)**

### **TDD Cycle: Red → Green → Refactor**

```java
// Step 1: RED - Write failing test first
@Test
@DisplayName("Should create user with valid data")
void shouldCreateUserWithValidData() {
    // Given
    CreateUserRequest request = CreateUserRequest.builder()
        .email("john@example.com")
        .firstName("John")
        .lastName("Doe")
        .password("SecurePass123!")
        .build();

    // When
    User result = userService.createUser(request);

    // Then
    assertThat(result).isNotNull();
    assertThat(result.getEmail()).isEqualTo("john@example.com");
    assertThat(result.getId()).isNotNull();
    assertThat(result.getCreatedAt()).isNotNull();
}

// Step 2: GREEN - Write minimal implementation
@Service
public class UserService {
    public User createUser(CreateUserRequest request) {
        // Minimal implementation to make test pass
        return User.builder()
            .id(UUID.randomUUID().toString())
            .email(request.getEmail())
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .createdAt(Instant.now())
            .build();
    }
}

// Step 3: REFACTOR - Improve implementation
@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    @Transactional
    public User createUser(CreateUserRequest request) {
        // Validate email uniqueness
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException("Email already exists");
        }

        // Create user entity
        User user = User.builder()
            .id(UUID.randomUUID().toString())
            .email(request.getEmail())
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .password(passwordEncoder.encode(request.getPassword()))
            .status(UserStatus.ACTIVE)
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();

        // Save to database
        User savedUser = userRepository.save(user);

        // Send welcome email asynchronously
        emailService.sendWelcomeEmailAsync(savedUser);

        return savedUser;
    }
}
```

### **Advanced TDD Patterns**

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTDDTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private UserService userService;

    @Nested
    @DisplayName("User Creation Tests")
    class UserCreationTests {

        @Test
        @DisplayName("Should create user and send welcome email")
        void shouldCreateUserAndSendWelcomeEmail() {
            // Given
            CreateUserRequest request = createValidUserRequest();
            User expectedUser = createExpectedUser();

            when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
            when(passwordEncoder.encode(request.getPassword())).thenReturn("encoded-password");
            when(userRepository.save(any(User.class))).thenReturn(expectedUser);

            // When
            User result = userService.createUser(request);

            // Then
            assertThat(result).isEqualTo(expectedUser);

            // Verify interactions
            verify(userRepository).existsByEmail(request.getEmail());
            verify(passwordEncoder).encode(request.getPassword());
            verify(userRepository).save(any(User.class));
            verify(emailService).sendWelcomeEmailAsync(expectedUser);
        }

        @Test
        @DisplayName("Should throw exception when email already exists")
        void shouldThrowExceptionWhenEmailAlreadyExists() {
            // Given
            CreateUserRequest request = createValidUserRequest();
            when(userRepository.existsByEmail(request.getEmail())).thenReturn(true);

            // When & Then
            assertThatThrownBy(() -> userService.createUser(request))
                .isInstanceOf(DuplicateEmailException.class)
                .hasMessage("Email already exists");

            // Verify no save operation
            verify(userRepository, never()).save(any(User.class));
            verify(emailService, never()).sendWelcomeEmailAsync(any(User.class));
        }

        @ParameterizedTest
        @ValueSource(strings = {"", " ", "invalid-email", "@domain.com", "user@"})
        @DisplayName("Should throw exception for invalid emails")
        void shouldThrowExceptionForInvalidEmails(String invalidEmail) {
            // Given
            CreateUserRequest request = CreateUserRequest.builder()
                .email(invalidEmail)
                .firstName("John")
                .lastName("Doe")
                .password("SecurePass123!")
                .build();

            // When & Then
            assertThatThrownBy(() -> userService.createUser(request))
                .isInstanceOf(ValidationException.class);
        }

        @Test
        @DisplayName("Should handle database exceptions gracefully")
        void shouldHandleDatabaseExceptionsGracefully() {
            // Given
            CreateUserRequest request = createValidUserRequest();
            when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
            when(passwordEncoder.encode(request.getPassword())).thenReturn("encoded-password");
            when(userRepository.save(any(User.class)))
                .thenThrow(new DataAccessException("Database connection failed"));

            // When & Then
            assertThatThrownBy(() -> userService.createUser(request))
                .isInstanceOf(UserCreationException.class)
                .hasRootCauseInstanceOf(DataAccessException.class);
        }
    }

    // Test data builders
    private CreateUserRequest createValidUserRequest() {
        return CreateUserRequest.builder()
            .email("john@example.com")
            .firstName("John")
            .lastName("Doe")
            .password("SecurePass123!")
            .build();
    }

    private User createExpectedUser() {
        return User.builder()
            .id("user-123")
            .email("john@example.com")
            .firstName("John")
            .lastName("Doe")
            .password("encoded-password")
            .status(UserStatus.ACTIVE)
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
    }
}
```

---

## 🔧 **Integration Testing with TestContainers**

### **Complete Integration Test Setup**

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@TestMethodOrder(OrderAnnotation.class)
class UserControllerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test")
            .withExposedPorts(5432);

    @Container
    static RedisContainer redis = new RedisContainer("redis:7-alpine")
            .withExposedPorts(6379);

    @Container
    static MockServerContainer mockServer = new MockServerContainer("mockserver/mockserver:5.15.0")
            .withExposedPorts(1080);

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        // Database configuration
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);

        // Redis configuration
        registry.add("spring.redis.host", redis::getHost);
        registry.add("spring.redis.port", redis::getFirstMappedPort);

        // External service configuration
        registry.add("external.email.service.url",
            () -> "http://" + mockServer.getHost() + ":" + mockServer.getFirstMappedPort());
    }

    @BeforeEach
    void setUp() {
        // Clean up database before each test
        userRepository.deleteAll();

        // Set up mock external services
        setupEmailServiceMocks();
    }

    @Test
    @Order(1)
    @DisplayName("Should create user successfully")
    void shouldCreateUserSuccessfully() {
        // Given
        CreateUserRequest request = CreateUserRequest.builder()
            .email("integration@test.com")
            .firstName("Integration")
            .lastName("Test")
            .password("SecurePass123!")
            .build();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<CreateUserRequest> entity = new HttpEntity<>(request, headers);

        // When
        ResponseEntity<UserResponse> response = restTemplate.postForEntity(
            "/api/v1/users", entity, UserResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().getLocation()).isNotNull();

        UserResponse userResponse = response.getBody();
        assertThat(userResponse).isNotNull();
        assertThat(userResponse.getEmail()).isEqualTo("integration@test.com");
        assertThat(userResponse.getId()).isNotNull();

        // Verify in database
        Optional<User> savedUser = userRepository.findByEmail("integration@test.com");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getFirstName()).isEqualTo("Integration");

        // Verify external service call
        verifyEmailServiceWasCalled();
    }

    @Test
    @Order(2)
    @DisplayName("Should handle concurrent user creation")
    void shouldHandleConcurrentUserCreation() throws InterruptedException {
        // Given
        int numberOfThreads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch latch = new CountDownLatch(numberOfThreads);
        List<Future<ResponseEntity<UserResponse>>> futures = new ArrayList<>();

        // When - Create users concurrently
        for (int i = 0; i < numberOfThreads; i++) {
            final int index = i;
            Future<ResponseEntity<UserResponse>> future = executor.submit(() -> {
                try {
                    CreateUserRequest request = CreateUserRequest.builder()
                        .email("user" + index + "@test.com")
                        .firstName("User" + index)
                        .lastName("Test")
                        .password("SecurePass123!")
                        .build();

                    HttpEntity<CreateUserRequest> entity = new HttpEntity<>(request);
                    return restTemplate.postForEntity("/api/v1/users", entity, UserResponse.class);
                } finally {
                    latch.countDown();
                }
            });
            futures.add(future);
        }

        latch.await(30, TimeUnit.SECONDS);

        // Then - All users should be created successfully
        for (Future<ResponseEntity<UserResponse>> future : futures) {
            ResponseEntity<UserResponse> response = future.get();
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        }

        // Verify all users in database
        List<User> users = userRepository.findAll();
        assertThat(users).hasSize(numberOfThreads);

        executor.shutdown();
    }

    @Test
    @DisplayName("Should authenticate user and return JWT token")
    void shouldAuthenticateUserAndReturnJwtToken() {
        // Given - Create user first
        User user = createTestUser();
        userRepository.save(user);

        LoginRequest loginRequest = LoginRequest.builder()
            .email(user.getEmail())
            .password("original-password")
            .build();

        HttpEntity<LoginRequest> entity = new HttpEntity<>(loginRequest);

        // When
        ResponseEntity<LoginResponse> response = restTemplate.postForEntity(
            "/api/v1/auth/login", entity, LoginResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        LoginResponse loginResponse = response.getBody();
        assertThat(loginResponse).isNotNull();
        assertThat(loginResponse.getAccessToken()).isNotBlank();
        assertThat(loginResponse.getRefreshToken()).isNotBlank();
        assertThat(loginResponse.getExpiresIn()).isGreaterThan(0);

        // Verify token validity
        String userId = jwtTokenUtil.getUserIdFromToken(loginResponse.getAccessToken());
        assertThat(userId).isEqualTo(user.getId());
    }

    @Test
    @DisplayName("Should handle API rate limiting")
    void shouldHandleApiRateLimiting() {
        // Given - Make requests beyond rate limit
        String endpoint = "/api/v1/users";
        List<ResponseEntity<Object>> responses = new ArrayList<>();

        // When - Make multiple requests quickly
        for (int i = 0; i < 100; i++) {
            CreateUserRequest request = CreateUserRequest.builder()
                .email("ratelimit" + i + "@test.com")
                .firstName("Rate")
                .lastName("Limit")
                .password("SecurePass123!")
                .build();

            ResponseEntity<Object> response = restTemplate.postForEntity(
                endpoint, request, Object.class);

            responses.add(response);
        }

        // Then - Some requests should be rate limited
        long rateLimitedCount = responses.stream()
            .mapToInt(r -> r.getStatusCodeValue())
            .filter(status -> status == 429)
            .count();

        assertThat(rateLimitedCount).isGreaterThan(0);
    }

    private void setupEmailServiceMocks() {
        // Mock external email service
        MockServerClient mockClient = new MockServerClient(
            mockServer.getHost(),
            mockServer.getFirstMappedPort()
        );

        mockClient
            .when(request()
                .withMethod("POST")
                .withPath("/send-email")
            )
            .respond(response()
                .withStatusCode(200)
                .withBody("{\"status\": \"sent\"}")
            );
    }

    private void verifyEmailServiceWasCalled() {
        MockServerClient mockClient = new MockServerClient(
            mockServer.getHost(),
            mockServer.getFirstMappedPort()
        );

        mockClient.verify(
            request()
                .withMethod("POST")
                .withPath("/send-email"),
            VerificationTimes.exactly(1)
        );
    }

    private User createTestUser() {
        return User.builder()
            .id(UUID.randomUUID().toString())
            .email("test@example.com")
            .firstName("Test")
            .lastName("User")
            .password(passwordEncoder.encode("original-password"))
            .status(UserStatus.ACTIVE)
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
    }
}
```

### **Database Integration Testing**

```java
@DataJpaTest
@Testcontainers
class UserRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Test
    @DisplayName("Should find users by email domain")
    void shouldFindUsersByEmailDomain() {
        // Given
        User user1 = createUser("john@company.com", "John", "Doe");
        User user2 = createUser("jane@company.com", "Jane", "Smith");
        User user3 = createUser("bob@other.com", "Bob", "Wilson");

        entityManager.persistAndFlush(user1);
        entityManager.persistAndFlush(user2);
        entityManager.persistAndFlush(user3);

        // When
        List<User> companyUsers = userRepository.findByEmailDomain("company.com");

        // Then
        assertThat(companyUsers).hasSize(2);
        assertThat(companyUsers).extracting(User::getEmail)
            .containsExactlyInAnyOrder("john@company.com", "jane@company.com");
    }

    @Test
    @DisplayName("Should handle complex queries with pagination")
    void shouldHandleComplexQueriesWithPagination() {
        // Given - Create test data
        List<User> users = createTestUsers(50);
        users.forEach(user -> entityManager.persistAndFlush(user));

        UserSearchCriteria criteria = UserSearchCriteria.builder()
            .status(UserStatus.ACTIVE)
            .createdAfter(Instant.now().minus(1, ChronoUnit.DAYS))
            .build();

        Pageable pageable = PageRequest.of(0, 10, Sort.by("createdAt").descending());

        // When
        Page<User> result = userRepository.findByCriteria(criteria, pageable);

        // Then
        assertThat(result.getContent()).hasSize(10);
        assertThat(result.getTotalElements()).isEqualTo(50);
        assertThat(result.getTotalPages()).isEqualTo(5);

        // Verify sorting
        List<Instant> createdTimes = result.getContent().stream()
            .map(User::getCreatedAt)
            .collect(Collectors.toList());

        assertThat(createdTimes).isSortedAccordingTo(Comparator.reverseOrder());
    }

    @Test
    @DisplayName("Should handle database constraints properly")
    void shouldHandleDatabaseConstraintsProperly() {
        // Given
        User user1 = createUser("unique@test.com", "First", "User");
        entityManager.persistAndFlush(user1);

        User user2 = createUser("unique@test.com", "Second", "User");

        // When & Then
        assertThatThrownBy(() -> {
            entityManager.persistAndFlush(user2);
        }).isInstanceOf(PersistenceException.class);
    }

    private List<User> createTestUsers(int count) {
        return IntStream.range(0, count)
            .mapToObj(i -> createUser("user" + i + "@test.com", "User" + i, "Test"))
            .collect(Collectors.toList());
    }

    private User createUser(String email, String firstName, String lastName) {
        return User.builder()
            .id(UUID.randomUUID().toString())
            .email(email)
            .firstName(firstName)
            .lastName(lastName)
            .password("encoded-password")
            .status(UserStatus.ACTIVE)
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
    }
}
```

---

## ⚡ **Performance Testing**

### **Load Testing with JUnit**

```java
@ExtendWith(MockitoExtension.class)
class UserServicePerformanceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    @DisplayName("Should handle high concurrent user creation")
    void shouldHandleHighConcurrentUserCreation() throws InterruptedException {
        // Given
        int numberOfThreads = 100;
        int requestsPerThread = 10;
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch latch = new CountDownLatch(numberOfThreads * requestsPerThread);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger errorCount = new AtomicInteger(0);
        List<Long> responseTimes = Collections.synchronizedList(new ArrayList<>());

        // Mock repository to simulate database operations
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            Thread.sleep(10); // Simulate database latency
            User user = invocation.getArgument(0);
            user.setId(UUID.randomUUID().toString());
            return user;
        });

        // When
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < numberOfThreads * requestsPerThread; i++) {
            final int requestId = i;
            executor.submit(() -> {
                try {
                    long requestStart = System.nanoTime();

                    CreateUserRequest request = CreateUserRequest.builder()
                        .email("perf" + requestId + "@test.com")
                        .firstName("Perf")
                        .lastName("Test")
                        .password("SecurePass123!")
                        .build();

                    userService.createUser(request);

                    long requestEnd = System.nanoTime();
                    responseTimes.add(TimeUnit.NANOSECONDS.toMillis(requestEnd - requestStart));
                    successCount.incrementAndGet();

                } catch (Exception e) {
                    errorCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }

        boolean completed = latch.await(60, TimeUnit.SECONDS);
        long totalTime = System.currentTimeMillis() - startTime;

        executor.shutdown();

        // Then - Analyze performance metrics
        assertThat(completed).isTrue();

        double successRate = (double) successCount.get() / (numberOfThreads * requestsPerThread) * 100;
        double throughput = (double) successCount.get() / totalTime * 1000; // requests per second

        LongSummaryStatistics stats = responseTimes.stream()
            .mapToLong(Long::longValue)
            .summaryStatistics();

        // Performance assertions
        assertThat(successRate).isGreaterThan(95.0); // 95% success rate
        assertThat(stats.getAverage()).isLessThan(100.0); // Average < 100ms
        assertThat(stats.getMax()).isLessThan(500.0); // Max < 500ms
        assertThat(throughput).isGreaterThan(50.0); // > 50 requests/second

        // Log performance metrics
        System.out.printf("Performance Results:%n");
        System.out.printf("Total Requests: %d%n", numberOfThreads * requestsPerThread);
        System.out.printf("Success Rate: %.2f%%%n", successRate);
        System.out.printf("Throughput: %.2f req/sec%n", throughput);
        System.out.printf("Response Time - Avg: %.2fms, Min: %dms, Max: %dms%n",
            stats.getAverage(), stats.getMin(), stats.getMax());
    }

    @Test
    @DisplayName("Should handle memory efficiently with large datasets")
    void shouldHandleMemoryEfficientlyWithLargeDatasets() {
        // Given
        int datasetSize = 100000;
        List<User> users = new ArrayList<>();

        // Monitor memory usage
        Runtime runtime = Runtime.getRuntime();
        long initialMemory = runtime.totalMemory() - runtime.freeMemory();

        // When - Create large dataset
        for (int i = 0; i < datasetSize; i++) {
            users.add(User.builder()
                .id(UUID.randomUUID().toString())
                .email("memory" + i + "@test.com")
                .firstName("Memory")
                .lastName("Test" + i)
                .build());
        }

        long afterCreationMemory = runtime.totalMemory() - runtime.freeMemory();

        // Process data (simulate real operations)
        users.stream()
            .filter(user -> user.getEmail().contains("@test.com"))
            .map(User::getFullName)
            .count();

        long afterProcessingMemory = runtime.totalMemory() - runtime.freeMemory();

        // Then - Memory usage should be reasonable
        long creationMemoryUsage = afterCreationMemory - initialMemory;
        long processingMemoryUsage = afterProcessingMemory - afterCreationMemory;

        // Assert memory usage is within acceptable limits
        assertThat(creationMemoryUsage).isLessThan(100 * 1024 * 1024); // < 100MB
        assertThat(processingMemoryUsage).isLessThan(50 * 1024 * 1024); // < 50MB

        System.out.printf("Memory Usage - Creation: %d MB, Processing: %d MB%n",
            creationMemoryUsage / (1024 * 1024),
            processingMemoryUsage / (1024 * 1024));
    }
}
```

### **API Load Testing with Gatling**

```scala
// Gatling load test script
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class UserApiLoadTest extends Simulation {

  val httpProtocol = http
    .baseUrl("http://localhost:8080")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")

  val createUserScenario = scenario("Create User Load Test")
    .exec(
      http("Create User")
        .post("/api/v1/users")
        .body(StringBody("""
          {
            "email": "loadtest${randomInt(1000000)}@test.com",
            "firstName": "Load",
            "lastName": "Test",
            "password": "SecurePass123!"
          }
        """)).asJson
        .check(status.is(201))
        .check(jsonPath("$.id").saveAs("userId"))
    )
    .pause(1, 3)
    .exec(
      http("Get User")
        .get("/api/v1/users/${userId}")
        .check(status.is(200))
    )

  val searchUsersScenario = scenario("Search Users Load Test")
    .exec(
      http("Search Users")
        .get("/api/v1/users")
        .queryParam("search", "test")
        .queryParam("page", "0")
        .queryParam("size", "20")
        .check(status.is(200))
        .check(jsonPath("$.content").exists)
    )

  setUp(
    createUserScenario.inject(
      atOnceUsers(50),
      rampUsers(100) during (30 seconds),
      constantUsersPerSec(20) during (60 seconds)
    ),
    searchUsersScenario.inject(
      rampUsers(50) during (20 seconds),
      constantUsersPerSec(10) during (120 seconds)
    )
  ).protocols(httpProtocol)
   .assertions(
     global.responseTime.max.lt(2000),
     global.responseTime.mean.lt(500),
     global.successfulRequests.percent.gt(95)
   )
}
```

---

## 🤝 **Contract Testing with Pact**

### **Consumer Contract Tests**

```java
@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "user-service")
class UserServiceConsumerContractTest {

    @Pact(consumer = "frontend-app")
    public RequestResponsePact createUserPact(PactDslWithProvider builder) {
        return builder
            .given("user service is available")
            .uponReceiving("a request to create a user")
            .path("/api/v1/users")
            .method("POST")
            .body(new PactDslJsonBody()
                .stringType("email", "john@example.com")
                .stringType("firstName", "John")
                .stringType("lastName", "Doe")
                .stringType("password", "SecurePass123!")
            )
            .willRespondWith()
            .status(201)
            .headers(Map.of("Content-Type", "application/json"))
            .body(new PactDslJsonBody()
                .stringType("id", "user-123")
                .stringType("email", "john@example.com")
                .stringType("firstName", "John")
                .stringType("lastName", "Doe")
                .stringType("status", "ACTIVE")
                .datetime("createdAt", "yyyy-MM-dd'T'HH:mm:ss.SSSX")
            )
            .toPact();
    }

    @Test
    @PactTestFor(pactMethod = "createUserPact")
    void testCreateUser(MockServer mockServer) {
        // Given
        String baseUrl = mockServer.getUrl();
        RestTemplate restTemplate = new RestTemplate();

        CreateUserRequest request = CreateUserRequest.builder()
            .email("john@example.com")
            .firstName("John")
            .lastName("Doe")
            .password("SecurePass123!")
            .build();

        // When
        ResponseEntity<UserResponse> response = restTemplate.postForEntity(
            baseUrl + "/api/v1/users", request, UserResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getEmail()).isEqualTo("john@example.com");
        assertThat(response.getBody().getId()).isNotNull();
    }
}
```

### **Provider Contract Verification**

```java
@Provider("user-service")
@PactFolder("pacts")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserServiceProviderContractTest {

    @LocalServerPort
    private int port;

    @Autowired
    private UserRepository userRepository;

    @TestTarget
    public final Target target = new HttpTarget("localhost", port);

    @State("user service is available")
    public void userServiceIsAvailable() {
        // Set up any required test data
        userRepository.deleteAll();
    }

    @State("user with id user-123 exists")
    public void userExists() {
        User user = User.builder()
            .id("user-123")
            .email("existing@example.com")
            .firstName("Existing")
            .lastName("User")
            .password("encoded-password")
            .status(UserStatus.ACTIVE)
            .createdAt(Instant.now())
            .build();

        userRepository.save(user);
    }
}
```

---

## 🔍 **API Documentation Testing**

### **OpenAPI Contract Validation**

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OpenApiContractTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @LocalServerPort
    private int port;

    @Test
    @DisplayName("Should validate API responses against OpenAPI specification")
    void shouldValidateApiResponsesAgainstOpenApiSpec() throws Exception {
        // Given
        String openApiSpec = getOpenApiSpecification();
        OpenApiValidator validator = OpenApiValidator.createFor(openApiSpec).build();

        CreateUserRequest request = CreateUserRequest.builder()
            .email("openapi@test.com")
            .firstName("OpenAPI")
            .lastName("Test")
            .password("SecurePass123!")
            .build();

        // When
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/api/v1/users", request, String.class);

        // Then
        ValidationReport report = validator.validateResponse(
            "/api/v1/users",
            "POST",
            new ValidationReport.Builder()
                .withStatusCode(response.getStatusCodeValue())
                .withBody(response.getBody())
                .withHeaders(response.getHeaders().toSingleValueMap())
                .build()
        );

        assertThat(report.hasErrors()).isFalse();
    }

    private String getOpenApiSpecification() throws IOException {
        // Load OpenAPI spec from classpath or generate from annotations
        return Files.readString(
            Paths.get("src/main/resources/api-docs/openapi.yaml")
        );
    }
}
```

---

## 🔄 **Automated Testing Pipeline**

### **GitHub Actions CI/CD**

```yaml
# .github/workflows/api-tests.yml
name: API Testing Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: "17"
          distribution: "temurin"

      - name: Cache Maven dependencies
        uses: actions/cache@v3
        with:
          path: ~/.m2
          key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}

      - name: Run unit tests
        run: mvn test -Dtest="**/*Test" -DfailIfNoTests=false

      - name: Generate test report
        uses: dorny/test-reporter@v1
        if: success() || failure()
        with:
          name: Unit Test Results
          path: target/surefire-reports/*.xml
          reporter: java-junit

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: "17"
          distribution: "temurin"

      - name: Run integration tests
        run: mvn verify -Dtest="**/*IntegrationTest" -DfailIfNoTests=false
        env:
          SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/testdb
          SPRING_REDIS_HOST: redis

  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: "17"
          distribution: "temurin"

      - name: Run Pact consumer tests
        run: mvn test -Dtest="**/*ContractTest"

      - name: Publish Pact contracts
        run: mvn pact:publish
        env:
          PACT_BROKER_URL: ${{ secrets.PACT_BROKER_URL }}
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}

  performance-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: "17"
          distribution: "temurin"

      - name: Build application
        run: mvn package -DskipTests

      - name: Start application
        run: |
          java -jar target/app.jar &
          sleep 30

      - name: Run Gatling performance tests
        run: mvn gatling:test

      - name: Upload performance results
        uses: actions/upload-artifact@v3
        with:
          name: gatling-results
          path: target/gatling/
```

### **Test Automation Framework**

```java
@TestConfiguration
public class TestAutomationConfig {

    @Bean
    @Primary
    public TestDataBuilder testDataBuilder() {
        return new TestDataBuilder();
    }

    @Bean
    public ApiTestClient apiTestClient(@Value("${test.api.base-url}") String baseUrl) {
        return new ApiTestClient(baseUrl);
    }

    @Bean
    public DatabaseTestUtils databaseTestUtils(JdbcTemplate jdbcTemplate) {
        return new DatabaseTestUtils(jdbcTemplate);
    }
}

public class ApiTestClient {
    private final RestTemplate restTemplate;
    private final String baseUrl;

    public ApiTestClient(String baseUrl) {
        this.baseUrl = baseUrl;
        this.restTemplate = new RestTemplate();
    }

    public <T> ResponseEntity<T> post(String endpoint, Object request, Class<T> responseType) {
        return restTemplate.postForEntity(baseUrl + endpoint, request, responseType);
    }

    public <T> ResponseEntity<T> get(String endpoint, Class<T> responseType, Object... uriVariables) {
        return restTemplate.getForEntity(baseUrl + endpoint, responseType, uriVariables);
    }

    public <T> ResponseEntity<T> put(String endpoint, Object request, Class<T> responseType) {
        restTemplate.put(baseUrl + endpoint, request);
        return ResponseEntity.ok().build();
    }

    public ResponseEntity<Void> delete(String endpoint, Object... uriVariables) {
        restTemplate.delete(baseUrl + endpoint, uriVariables);
        return ResponseEntity.noContent().build();
    }
}

public class TestDataBuilder {

    public CreateUserRequest.CreateUserRequestBuilder validUserRequest() {
        return CreateUserRequest.builder()
            .email("test" + System.currentTimeMillis() + "@example.com")
            .firstName("Test")
            .lastName("User")
            .password("SecurePass123!");
    }

    public User.UserBuilder validUser() {
        return User.builder()
            .id(UUID.randomUUID().toString())
            .email("test" + System.currentTimeMillis() + "@example.com")
            .firstName("Test")
            .lastName("User")
            .password("encoded-password")
            .status(UserStatus.ACTIVE)
            .createdAt(Instant.now())
            .updatedAt(Instant.now());
    }

    public List<User> createUserList(int count) {
        return IntStream.range(0, count)
            .mapToObj(i -> validUser()
                .email("user" + i + "@test.com")
                .firstName("User" + i)
                .build())
            .collect(Collectors.toList());
    }
}
```

---

## 🎯 **Best Practices Summary**

### **✅ API Testing Checklist**

#### **Test Structure**

- ✅ **Follow AAA pattern** - Arrange, Act, Assert
- ✅ **Descriptive test names** - Describe what should happen
- ✅ **Test data builders** - Reusable test data creation
- ✅ **Proper setup/teardown** - Clean test environment
- ✅ **Isolated tests** - Tests don't depend on each other

#### **Coverage Strategy**

- ✅ **Unit tests (70%)** - Fast, focused, isolated
- ✅ **Integration tests (20%)** - Test component interactions
- ✅ **E2E tests (10%)** - Critical user journeys
- ✅ **Contract tests** - API compatibility
- ✅ **Performance tests** - Load and stress testing

#### **Quality Assurance**

- ✅ **Automated pipeline** - Run tests on every commit
- ✅ **Test metrics** - Coverage, performance, reliability
- ✅ **Fail fast** - Quick feedback on failures
- ✅ **Environment parity** - Test in production-like environments
- ✅ **Documentation** - Keep tests as living documentation

---

## 🚀 **Next Steps**

1. **Implement TDD workflow** for new features
2. **Set up TestContainers** for integration testing
3. **Create performance benchmarks** with baseline metrics
4. **Establish contract testing** between services
5. **Automate testing pipeline** with CI/CD integration

_Comprehensive API testing ensures reliable, maintainable, and performant applications. Master these practices to build confidence in your code!_
