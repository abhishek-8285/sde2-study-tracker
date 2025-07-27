# API Design & Testing for SDE2 Engineers 🌐

## 🎯 **Overview**

API design and comprehensive testing strategies are fundamental SDE2 skills. Modern applications require well-designed APIs, robust testing suites, and performance validation. This guide covers practical implementation of REST, GraphQL, and testing methodologies.

## 📚 **Complete Learning Path**

### **🌐 API Design Mastery**

1. [REST API Best Practices](./01-rest-api-design.md)
2. [GraphQL Schema Design](./02-graphql-design.md)
3. [gRPC & Protocol Buffers](./03-grpc-protobuf.md)
4. [API Documentation & OpenAPI](./04-api-documentation.md)

### **🧪 Testing Strategies**

5. [Test-Driven Development (TDD)](./05-tdd-methodology.md)
6. [Behavior-Driven Development (BDD)](./06-bdd-cucumber.md)
7. [Integration Testing](./07-integration-testing.md)
8. [Contract Testing](./08-contract-testing.md)

### **⚡ Performance & Quality**

9. [Performance Testing](./09-performance-testing.md)
10. [API Security Testing](./10-api-security-testing.md)
11. [End-to-End Testing](./11-e2e-testing.md)
12. [Testing in Production](./12-production-testing.md)

---

## 🎯 **Why API Design & Testing is Critical for SDE2**

### **🏢 Industry Requirements**

- **95% of modern applications** use API-first architecture
- **Microservices** require well-designed API contracts
- **Mobile/Frontend** development depends on quality APIs
- **Third-party integrations** demand robust API design

### **💼 SDE2 API Responsibilities**

- **API Architecture**: Designing scalable, maintainable APIs
- **Testing Strategy**: Implementing comprehensive test suites
- **Performance**: Ensuring APIs meet SLA requirements
- **Documentation**: Creating clear API documentation
- **Versioning**: Managing API evolution and backward compatibility

---

## 🚀 **Essential API Skills - Quick Start**

### **1. REST API Design (Must Have)**

```java
// Spring Boot REST API with best practices
@RestController
@RequestMapping("/api/v1/users")
@Validated
public class UserController {

    @Autowired
    private UserService userService;

    // GET /api/v1/users?page=0&size=20&sort=name,asc
    @GetMapping
    public ResponseEntity<PagedResponse<UserDTO>> getUsers(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "id") String sort,
            @RequestParam(required = false) String search) {

        PageRequest pageRequest = PageRequest.of(page, size,
            Sort.by(sort.split(",")));

        Page<User> userPage = userService.findUsers(search, pageRequest);

        PagedResponse<UserDTO> response = PagedResponse.<UserDTO>builder()
            .content(userPage.getContent().stream()
                .map(UserDTO::fromEntity)
                .collect(Collectors.toList()))
            .page(page)
            .size(size)
            .totalElements(userPage.getTotalElements())
            .totalPages(userPage.getTotalPages())
            .build();

        return ResponseEntity.ok(response);
    }

    // POST /api/v1/users
    @PostMapping
    public ResponseEntity<UserDTO> createUser(
            @Valid @RequestBody CreateUserRequest request) {

        User user = userService.createUser(request);
        UserDTO userDTO = UserDTO.fromEntity(user);

        URI location = ServletUriComponentsBuilder
            .fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(user.getId())
            .toUri();

        return ResponseEntity.created(location).body(userDTO);
    }

    // PUT /api/v1/users/{id}
    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> updateUser(
            @PathVariable @UUID String id,
            @Valid @RequestBody UpdateUserRequest request) {

        User user = userService.updateUser(id, request);
        return ResponseEntity.ok(UserDTO.fromEntity(user));
    }

    // DELETE /api/v1/users/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable @UUID String id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    // PATCH /api/v1/users/{id}
    @PatchMapping("/{id}")
    public ResponseEntity<UserDTO> patchUser(
            @PathVariable @UUID String id,
            @RequestBody JsonPatch patch) {

        User user = userService.patchUser(id, patch);
        return ResponseEntity.ok(UserDTO.fromEntity(user));
    }
}

// DTOs with validation
@Data
@Builder
public class CreateUserRequest {

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 50, message = "Name must be between 2 and 50 characters")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$",
             message = "Password must contain uppercase, lowercase, and digit")
    private String password;

    @Valid
    private AddressDTO address;

    @JsonProperty("terms_accepted")
    @AssertTrue(message = "Terms must be accepted")
    private boolean termsAccepted;
}

// Error handling
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(
            MethodArgumentNotValidException ex) {

        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
            errors.put(error.getField(), error.getDefaultMessage()));

        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Validation Failed")
            .message("Request validation failed")
            .path(getCurrentRequestPath())
            .details(errors)
            .build();

        return ResponseEntity.badRequest().body(errorResponse);
    }
}
```

### **2. GraphQL Schema Design**

```javascript
// GraphQL schema with Node.js and Apollo Server
const { gql, ApolloServer } = require("apollo-server-express");
const { buildSubgraphSchema } = require("@apollo/subgraph");

// Type definitions
const typeDefs = gql`
  type User @key(fields: "id") {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]!
    profile: UserProfile
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Post @key(fields: "id") {
    id: ID!
    title: String!
    content: String!
    author: User!
    tags: [String!]!
    publishedAt: DateTime
    status: PostStatus!
  }

  type UserProfile {
    bio: String
    avatar: String
    website: String
    socialLinks: SocialLinks
  }

  type SocialLinks {
    twitter: String
    linkedin: String
    github: String
  }

  enum PostStatus {
    DRAFT
    PUBLISHED
    ARCHIVED
  }

  scalar DateTime

  input CreateUserInput {
    name: String!
    email: String!
    password: String!
    profile: UserProfileInput
  }

  input UserProfileInput {
    bio: String
    website: String
    socialLinks: SocialLinksInput
  }

  input SocialLinksInput {
    twitter: String
    linkedin: String
    github: String
  }

  input UpdatePostInput {
    title: String
    content: String
    tags: [String!]
    status: PostStatus
  }

  type Query {
    # User queries
    user(id: ID!): User
    users(first: Int, after: String, filter: UserFilter): UserConnection!
    me: User

    # Post queries
    post(id: ID!): Post
    posts(first: Int, after: String, filter: PostFilter): PostConnection!
  }

  type Mutation {
    # User mutations
    createUser(input: CreateUserInput!): UserPayload!
    updateUser(id: ID!, input: UpdateUserInput!): UserPayload!
    deleteUser(id: ID!): DeletePayload!

    # Post mutations
    createPost(input: CreatePostInput!): PostPayload!
    updatePost(id: ID!, input: UpdatePostInput!): PostPayload!
    publishPost(id: ID!): PostPayload!
    deletePost(id: ID!): DeletePayload!
  }

  type Subscription {
    postPublished: Post!
    userStatusChanged(userId: ID!): User!
  }

  # Pagination types
  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type UserEdge {
    node: User!
    cursor: String!
  }

  type PostConnection {
    edges: [PostEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type PostEdge {
    node: Post!
    cursor: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  # Response types
  type UserPayload {
    user: User
    errors: [Error!]
  }

  type PostPayload {
    post: Post
    errors: [Error!]
  }

  type DeletePayload {
    deletedId: ID
    errors: [Error!]
  }

  type Error {
    field: String
    message: String!
    code: String
  }
`;

// Resolvers with proper error handling
const resolvers = {
  Query: {
    user: async (parent, { id }, context) => {
      try {
        await context.auth.requireAuthentication();
        return await context.dataSources.userAPI.findById(id);
      } catch (error) {
        throw new UserInputError("User not found", { id });
      }
    },

    users: async (parent, { first = 10, after, filter }, context) => {
      await context.auth.requireRole("ADMIN");

      const result = await context.dataSources.userAPI.findMany({
        first: Math.min(first, 100), // Limit max results
        after,
        filter,
      });

      return {
        edges: result.users.map((user) => ({
          node: user,
          cursor: Buffer.from(user.id).toString("base64"),
        })),
        pageInfo: {
          hasNextPage: result.hasNextPage,
          hasPreviousPage: result.hasPreviousPage,
          startCursor: result.users.length > 0 ? Buffer.from(result.users[0].id).toString("base64") : null,
          endCursor: result.users.length > 0 ? Buffer.from(result.users[result.users.length - 1].id).toString("base64") : null,
        },
        totalCount: result.totalCount,
      };
    },
  },

  Mutation: {
    createUser: async (parent, { input }, context) => {
      try {
        // Validation
        const errors = validateCreateUserInput(input);
        if (errors.length > 0) {
          return { user: null, errors };
        }

        const user = await context.dataSources.userAPI.create(input);

        // Publish subscription
        context.pubsub.publish("USER_CREATED", { userCreated: user });

        return { user, errors: [] };
      } catch (error) {
        return {
          user: null,
          errors: [{ message: error.message, code: "CREATION_FAILED" }],
        };
      }
    },
  },

  Subscription: {
    postPublished: {
      subscribe: (parent, args, context) => {
        return context.pubsub.asyncIterator(["POST_PUBLISHED"]);
      },
    },
  },

  // Field resolvers with DataLoader for N+1 prevention
  User: {
    posts: async (user, args, context) => {
      return await context.dataSources.postAPI.findByUserId(user.id);
    },

    profile: async (user, args, context) => {
      return await context.loaders.userProfile.load(user.id);
    },
  },
};
```

### **3. Test-Driven Development (TDD)**

```java
// TDD example with JUnit 5 and Mockito
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    // RED: Write failing test first
    @Test
    @DisplayName("Should create user with valid input")
    void shouldCreateUserWithValidInput() {
        // Given
        CreateUserRequest request = CreateUserRequest.builder()
            .name("John Doe")
            .email("john@example.com")
            .password("SecurePass123")
            .build();

        User savedUser = User.builder()
            .id("user-123")
            .name("John Doe")
            .email("john@example.com")
            .password("encoded-password")
            .createdAt(Instant.now())
            .build();

        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(passwordEncoder.encode("SecurePass123")).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        // When
        User result = userService.createUser(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("John Doe");
        assertThat(result.getEmail()).isEqualTo("john@example.com");
        assertThat(result.getId()).isEqualTo("user-123");

        verify(userRepository).existsByEmail("john@example.com");
        verify(passwordEncoder).encode("SecurePass123");
        verify(userRepository).save(any(User.class));
        verify(emailService).sendWelcomeEmail(savedUser);
    }

    @Test
    @DisplayName("Should throw exception when email already exists")
    void shouldThrowExceptionWhenEmailAlreadyExists() {
        // Given
        CreateUserRequest request = CreateUserRequest.builder()
            .name("John Doe")
            .email("existing@example.com")
            .password("SecurePass123")
            .build();

        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> userService.createUser(request))
            .isInstanceOf(UserAlreadyExistsException.class)
            .hasMessage("User with email 'existing@example.com' already exists");

        verify(userRepository).existsByEmail("existing@example.com");
        verifyNoMoreInteractions(userRepository, passwordEncoder, emailService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "a", "ab"})
    @DisplayName("Should throw exception for invalid names")
    void shouldThrowExceptionForInvalidNames(String invalidName) {
        // Given
        CreateUserRequest request = CreateUserRequest.builder()
            .name(invalidName)
            .email("john@example.com")
            .password("SecurePass123")
            .build();

        // When & Then
        assertThatThrownBy(() -> userService.createUser(request))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("Name must be between 2 and 50 characters");
    }

    @Test
    @DisplayName("Should handle repository exceptions gracefully")
    void shouldHandleRepositoryExceptionsGracefully() {
        // Given
        CreateUserRequest request = CreateUserRequest.builder()
            .name("John Doe")
            .email("john@example.com")
            .password("SecurePass123")
            .build();

        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(passwordEncoder.encode("SecurePass123")).thenReturn("encoded-password");
        when(userRepository.save(any(User.class)))
            .thenThrow(new DataAccessException("Database connection failed"));

        // When & Then
        assertThatThrownBy(() -> userService.createUser(request))
            .isInstanceOf(UserCreationException.class)
            .hasMessageContaining("Failed to create user")
            .hasCauseInstanceOf(DataAccessException.class);
    }
}
```

### **4. Integration Testing with TestContainers**

```java
// Integration tests with real database
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@Transactional
class UserControllerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @Container
    static RedisContainer redis = new RedisContainer("redis:7-alpine");

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.redis.host", redis::getHost);
        registry.add("spring.redis.port", redis::getFirstMappedPort);
    }

    @Test
    @DisplayName("Should create user and return 201 with location header")
    void shouldCreateUserSuccessfully() {
        // Given
        CreateUserRequest request = CreateUserRequest.builder()
            .name("Integration Test User")
            .email("integration@test.com")
            .password("SecurePass123")
            .termsAccepted(true)
            .build();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<CreateUserRequest> entity = new HttpEntity<>(request, headers);

        // When
        ResponseEntity<UserDTO> response = restTemplate.postForEntity(
            "/api/v1/users", entity, UserDTO.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().getLocation()).isNotNull();

        UserDTO userDTO = response.getBody();
        assertThat(userDTO).isNotNull();
        assertThat(userDTO.getName()).isEqualTo("Integration Test User");
        assertThat(userDTO.getEmail()).isEqualTo("integration@test.com");
        assertThat(userDTO.getId()).isNotNull();

        // Verify in database
        Optional<User> savedUser = userRepository.findByEmail("integration@test.com");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getName()).isEqualTo("Integration Test User");
    }

    @Test
    @DisplayName("Should return 400 for duplicate email")
    void shouldReturnBadRequestForDuplicateEmail() {
        // Given - create existing user
        User existingUser = User.builder()
            .name("Existing User")
            .email("existing@test.com")
            .password("encoded-password")
            .build();
        userRepository.save(existingUser);

        CreateUserRequest request = CreateUserRequest.builder()
            .name("New User")
            .email("existing@test.com")
            .password("SecurePass123")
            .termsAccepted(true)
            .build();

        HttpEntity<CreateUserRequest> entity = new HttpEntity<>(request);

        // When
        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
            "/api/v1/users", entity, ErrorResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        ErrorResponse errorResponse = response.getBody();
        assertThat(errorResponse).isNotNull();
        assertThat(errorResponse.getMessage()).contains("already exists");
    }

    @Test
    @DisplayName("Should get user with authentication")
    void shouldGetUserWithAuthentication() {
        // Given - create and save user
        User user = User.builder()
            .name("Test User")
            .email("test@example.com")
            .password("encoded-password")
            .build();
        User savedUser = userRepository.save(user);

        // Generate JWT token
        String token = jwtTokenUtil.generateToken(savedUser.getEmail());

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        // When
        ResponseEntity<UserDTO> response = restTemplate.exchange(
            "/api/v1/users/" + savedUser.getId(),
            HttpMethod.GET,
            entity,
            UserDTO.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        UserDTO userDTO = response.getBody();
        assertThat(userDTO).isNotNull();
        assertThat(userDTO.getName()).isEqualTo("Test User");
        assertThat(userDTO.getEmail()).isEqualTo("test@example.com");
    }
}
```

---

## 🧪 **Testing Pyramid for SDE2**

### **🔺 Testing Strategy Levels**

#### **1. Unit Tests (70% of tests)**

- **Fast execution** (< 100ms per test)
- **Isolated components** with mocked dependencies
- **High code coverage** (>80%)
- **Clear test naming** and documentation

#### **2. Integration Tests (20% of tests)**

- **Component interactions** with real dependencies
- **Database operations** with test containers
- **API contract validation**
- **External service integration**

#### **3. End-to-End Tests (10% of tests)**

- **Full user workflows** from UI to database
- **Cross-service communication**
- **Production-like environment**
- **Critical user journeys only**

### **📊 Testing Best Practices**

```java
// Testing best practices example
@TestMethodOrder(OrderAnnotation.class)
class UserServiceTestSuite {

    // Use descriptive test names
    @Test
    @DisplayName("Given valid user data, when creating user, then should save to database and send welcome email")
    void givenValidUserData_whenCreatingUser_thenShouldSaveAndSendEmail() {
        // Arrange (Given)
        CreateUserRequest request = createValidUserRequest();
        setupMocksForSuccessfulCreation();

        // Act (When)
        User result = userService.createUser(request);

        // Assert (Then)
        verifyUserCreationSuccess(result);
        verifyWelcomeEmailSent();
    }

    // Group related tests in nested classes
    @Nested
    @DisplayName("User Creation Tests")
    class UserCreationTests {

        @Test
        void shouldCreateUserWithValidData() { /* test implementation */ }

        @Test
        void shouldThrowExceptionForInvalidEmail() { /* test implementation */ }

        @Test
        void shouldThrowExceptionForWeakPassword() { /* test implementation */ }
    }

    // Use test data builders for complex objects
    private CreateUserRequest createValidUserRequest() {
        return CreateUserRequestTestDataBuilder.aUser()
            .withName("John Doe")
            .withEmail("john@example.com")
            .withStrongPassword()
            .withAcceptedTerms()
            .build();
    }
}
```

---

## 🎯 **SDE2 API & Testing Interview Topics**

### **🔥 Common Interview Questions**

#### **API Design**

1. **"Design a RESTful API for a social media platform"**
2. **"When would you choose GraphQL over REST?"**
3. **"How do you handle API versioning?"**
4. **"Explain pagination strategies for large datasets"**
5. **"How do you design APIs for mobile applications?"**

#### **Testing**

1. **"Explain the testing pyramid and your testing strategy"**
2. **"How do you test external API integrations?"**
3. **"What's the difference between unit and integration tests?"**
4. **"How do you implement TDD in practice?"**
5. **"How do you test asynchronous operations?"**

### **🏗️ System Design with APIs**

- **Design a URL shortener API (bit.ly)**
- **Create a real-time chat API**
- **Design a file upload/download API**
- **Build a notification system API**
- **Design a payment processing API**

---

## 📊 **Success Metrics**

After mastering API design and testing, you should be able to:

✅ **Design scalable REST and GraphQL APIs**  
✅ **Implement comprehensive testing strategies**  
✅ **Write maintainable test suites** with high coverage  
✅ **Handle API security and performance** requirements  
✅ **Debug and troubleshoot** API and testing issues  
✅ **Lead API design discussions** in technical reviews  
✅ **Pass API-focused interviews** at SDE2 level

---

## 🚀 **Quick Start Guide**

### **Week 1: API Fundamentals**

- Build a complete REST API with CRUD operations
- Add proper validation, error handling, and pagination
- Write comprehensive API documentation

### **Week 2: Testing Mastery**

- Implement TDD for new features
- Add integration tests with TestContainers
- Set up performance testing with load testing tools

### **Week 3: Advanced Topics**

- Build a GraphQL API with subscriptions
- Implement contract testing between services
- Add end-to-end testing for critical workflows

---

_Well-designed APIs and comprehensive testing are the foundation of maintainable software. Master these skills to build production-ready systems that scale!_
