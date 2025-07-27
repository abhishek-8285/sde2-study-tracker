# REST API Best Practices for SDE2 Engineers 🌐

## 🎯 **Overview**

RESTful API design is a core SDE2 skill. This guide covers industry best practices, complete implementations, and production-ready patterns for building scalable, maintainable APIs that follow REST principles.

## 📚 **REST Fundamentals**

### **REST Principles**

1. **Client-Server Architecture** - Separation of concerns
2. **Stateless** - Each request contains all necessary information
3. **Cacheable** - Responses should be cacheable when appropriate
4. **Uniform Interface** - Consistent resource identification and manipulation
5. **Layered System** - Architecture composed of hierarchical layers
6. **Code on Demand** (optional) - Server can extend client functionality

### **HTTP Methods & Their Usage**

- **GET** - Retrieve resources (safe, idempotent)
- **POST** - Create resources or non-idempotent operations
- **PUT** - Update/replace entire resource (idempotent)
- **PATCH** - Partial update of resource
- **DELETE** - Remove resource (idempotent)
- **HEAD** - Get headers only (metadata)
- **OPTIONS** - Get allowed methods for resource

---

## 🏗️ **Complete REST API Implementation**

### **Resource Modeling & URL Design**

```java
// RESTful URL patterns
@RestController
@RequestMapping("/api/v1")
@Validated
public class RESTController {

    // Collections and Resources
    @GetMapping("/users")                    // GET /api/v1/users
    @GetMapping("/users/{id}")               // GET /api/v1/users/123
    @PostMapping("/users")                   // POST /api/v1/users
    @PutMapping("/users/{id}")               // PUT /api/v1/users/123
    @PatchMapping("/users/{id}")             // PATCH /api/v1/users/123
    @DeleteMapping("/users/{id}")            // DELETE /api/v1/users/123

    // Nested Resources
    @GetMapping("/users/{userId}/posts")     // GET /api/v1/users/123/posts
    @GetMapping("/users/{userId}/posts/{postId}")  // GET /api/v1/users/123/posts/456
    @PostMapping("/users/{userId}/posts")    // POST /api/v1/users/123/posts

    // Search and Filtering
    @GetMapping("/users/search")             // GET /api/v1/users/search?q=john
    @GetMapping("/posts")                    // GET /api/v1/posts?status=published&limit=10

    // Actions (when resource-based approach doesn't fit)
    @PostMapping("/users/{id}/activate")    // POST /api/v1/users/123/activate
    @PostMapping("/users/{id}/send-email")  // POST /api/v1/users/123/send-email
}
```

### **Complete CRUD Implementation**

```java
@RestController
@RequestMapping("/api/v1/users")
@Validated
@Slf4j
public class UserController {

    private final UserService userService;
    private final UserMapper userMapper;

    public UserController(UserService userService, UserMapper userMapper) {
        this.userService = userService;
        this.userMapper = userMapper;
    }

    // GET /api/v1/users - List users with pagination and filtering
    @GetMapping
    public ResponseEntity<PagedResponse<UserDTO>> getUsers(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "id") String sort,
            @RequestParam(defaultValue = "asc") @Pattern(regexp = "asc|desc") String direction,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @Pattern(regexp = "active|inactive|suspended") String status,
            @RequestParam(required = false) String role) {

        try {
            // Build sort specification
            Sort.Direction sortDirection = "desc".equalsIgnoreCase(direction)
                ? Sort.Direction.DESC : Sort.Direction.ASC;
            Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sort));

            // Build filter criteria
            UserSearchCriteria criteria = UserSearchCriteria.builder()
                .search(search)
                .status(status)
                .role(role)
                .build();

            Page<User> userPage = userService.findUsers(criteria, pageable);

            // Convert to DTOs
            List<UserDTO> userDTOs = userPage.getContent().stream()
                .map(userMapper::toDTO)
                .collect(Collectors.toList());

            PagedResponse<UserDTO> response = PagedResponse.<UserDTO>builder()
                .content(userDTOs)
                .page(page)
                .size(size)
                .totalElements(userPage.getTotalElements())
                .totalPages(userPage.getTotalPages())
                .first(userPage.isFirst())
                .last(userPage.isLast())
                .numberOfElements(userPage.getNumberOfElements())
                .build();

            return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(userPage.getTotalElements()))
                .body(response);

        } catch (Exception e) {
            log.error("Error retrieving users", e);
            throw new InternalServerException("Failed to retrieve users");
        }
    }

    // GET /api/v1/users/{id} - Get single user
    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUser(@PathVariable @UUID String id) {
        try {
            User user = userService.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + id));

            UserDTO userDTO = userMapper.toDTO(user);

            return ResponseEntity.ok()
                .eTag(String.valueOf(user.getVersion()))
                .lastModified(user.getUpdatedAt())
                .body(userDTO);

        } catch (UserNotFoundException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error retrieving user: {}", id, e);
            throw new InternalServerException("Failed to retrieve user");
        }
    }

    // POST /api/v1/users - Create new user
    @PostMapping
    public ResponseEntity<UserDTO> createUser(
            @Valid @RequestBody CreateUserRequest request,
            HttpServletRequest httpRequest) {

        try {
            // Check for duplicate email
            if (userService.existsByEmail(request.getEmail())) {
                throw new DuplicateResourceException("User with email already exists: " + request.getEmail());
            }

            // Map request to entity
            User user = userMapper.toEntity(request);
            user.setCreatedAt(Instant.now());
            user.setUpdatedAt(Instant.now());

            // Save user
            User savedUser = userService.save(user);

            // Convert to DTO
            UserDTO userDTO = userMapper.toDTO(savedUser);

            // Build location header
            URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(savedUser.getId())
                .toUri();

            // Send welcome email asynchronously
            userService.sendWelcomeEmailAsync(savedUser);

            return ResponseEntity.created(location)
                .body(userDTO);

        } catch (DuplicateResourceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error creating user", e);
            throw new InternalServerException("Failed to create user");
        }
    }

    // PUT /api/v1/users/{id} - Update entire user
    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> updateUser(
            @PathVariable @UUID String id,
            @Valid @RequestBody UpdateUserRequest request,
            @RequestHeader(value = "If-Match", required = false) String ifMatch) {

        try {
            User existingUser = userService.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + id));

            // Check ETag for optimistic locking
            if (ifMatch != null && !ifMatch.equals(String.valueOf(existingUser.getVersion()))) {
                throw new PreconditionFailedException("Resource has been modified by another request");
            }

            // Check for email conflicts (if email is being changed)
            if (!existingUser.getEmail().equals(request.getEmail()) &&
                userService.existsByEmail(request.getEmail())) {
                throw new DuplicateResourceException("Email already in use: " + request.getEmail());
            }

            // Map request to existing entity
            userMapper.updateEntityFromRequest(request, existingUser);
            existingUser.setUpdatedAt(Instant.now());

            User updatedUser = userService.save(existingUser);
            UserDTO userDTO = userMapper.toDTO(updatedUser);

            return ResponseEntity.ok()
                .eTag(String.valueOf(updatedUser.getVersion()))
                .body(userDTO);

        } catch (UserNotFoundException | DuplicateResourceException | PreconditionFailedException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error updating user: {}", id, e);
            throw new InternalServerException("Failed to update user");
        }
    }

    // PATCH /api/v1/users/{id} - Partial update
    @PatchMapping("/{id}")
    public ResponseEntity<UserDTO> patchUser(
            @PathVariable @UUID String id,
            @RequestBody JsonPatch patch,
            @RequestHeader(value = "If-Match", required = false) String ifMatch) {

        try {
            User existingUser = userService.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + id));

            // Check ETag
            if (ifMatch != null && !ifMatch.equals(String.valueOf(existingUser.getVersion()))) {
                throw new PreconditionFailedException("Resource has been modified");
            }

            // Convert entity to JSON, apply patch, validate, and convert back
            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode userNode = objectMapper.valueToTree(existingUser);
            JsonNode patchedNode = patch.apply(userNode);

            // Validate patched data
            User patchedUser = objectMapper.treeToValue(patchedNode, User.class);
            validateUser(patchedUser);

            // Check for email conflicts
            if (!existingUser.getEmail().equals(patchedUser.getEmail()) &&
                userService.existsByEmail(patchedUser.getEmail())) {
                throw new DuplicateResourceException("Email already in use");
            }

            patchedUser.setUpdatedAt(Instant.now());
            User updatedUser = userService.save(patchedUser);
            UserDTO userDTO = userMapper.toDTO(updatedUser);

            return ResponseEntity.ok()
                .eTag(String.valueOf(updatedUser.getVersion()))
                .body(userDTO);

        } catch (UserNotFoundException | DuplicateResourceException | PreconditionFailedException e) {
            throw e;
        } catch (JsonPatchException e) {
            throw new BadRequestException("Invalid patch operation: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error patching user: {}", id, e);
            throw new InternalServerException("Failed to patch user");
        }
    }

    // DELETE /api/v1/users/{id} - Delete user
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable @UUID String id) {
        try {
            if (!userService.existsById(id)) {
                throw new UserNotFoundException("User not found with id: " + id);
            }

            // Soft delete or hard delete based on business rules
            userService.deleteById(id);

            return ResponseEntity.noContent().build();

        } catch (UserNotFoundException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error deleting user: {}", id, e);
            throw new InternalServerException("Failed to delete user");
        }
    }

    // HEAD /api/v1/users/{id} - Check if user exists
    @RequestMapping(value = "/{id}", method = RequestMethod.HEAD)
    public ResponseEntity<Void> checkUserExists(@PathVariable @UUID String id) {
        if (userService.existsById(id)) {
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // OPTIONS /api/v1/users - Get allowed methods
    @RequestMapping(method = RequestMethod.OPTIONS)
    public ResponseEntity<Void> getOptions() {
        return ResponseEntity.ok()
            .allow(HttpMethod.GET, HttpMethod.POST, HttpMethod.HEAD, HttpMethod.OPTIONS)
            .build();
    }

    private void validateUser(User user) {
        // Custom validation logic
        if (user.getEmail() == null || !user.getEmail().contains("@")) {
            throw new BadRequestException("Invalid email address");
        }
        // Add more validation as needed
    }
}
```

### **DTOs and Request/Response Models**

```java
// Response DTO
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private String id;
    private String email;
    private String firstName;
    private String lastName;
    private String status;
    private List<String> roles;
    private Instant createdAt;
    private Instant updatedAt;
    private Integer version;

    // Helper method for mapping
    public static UserDTO fromEntity(User user) {
        return UserDTO.builder()
            .id(user.getId())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .status(user.getStatus().name())
            .roles(user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toList()))
            .createdAt(user.getCreatedAt())
            .updatedAt(user.getUpdatedAt())
            .version(user.getVersion())
            .build();
    }
}

// Create request DTO
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50, message = "First name must be between 2 and 50 characters")
    @Pattern(regexp = "^[a-zA-Z\\s]+$", message = "First name can only contain letters and spaces")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 50, message = "Last name must be between 2 and 50 characters")
    @Pattern(regexp = "^[a-zA-Z\\s]+$", message = "Last name can only contain letters and spaces")
    private String lastName;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]",
             message = "Password must contain uppercase, lowercase, digit, and special character")
    private String password;

    @Valid
    private AddressDTO address;

    @NotEmpty(message = "At least one role is required")
    private List<@NotBlank String> roles;

    @JsonProperty("terms_accepted")
    @AssertTrue(message = "Terms and conditions must be accepted")
    private boolean termsAccepted;
}

// Update request DTO
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50)
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 50)
    private String lastName;

    @Pattern(regexp = "ACTIVE|INACTIVE|SUSPENDED", message = "Invalid status")
    private String status;

    private List<String> roles;

    @Valid
    private AddressDTO address;
}

// Paginated response wrapper
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagedResponse<T> {
    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean first;
    private boolean last;
    private int numberOfElements;
    private Sort sort;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Sort {
        private boolean sorted;
        private String direction;
        private String property;
    }
}
```

---

## 🔍 **Advanced REST Patterns**

### **Search and Filtering**

```java
@GetMapping("/users/search")
public ResponseEntity<PagedResponse<UserDTO>> searchUsers(
        @RequestParam String q,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String role,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdAfter,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdBefore,
        Pageable pageable) {

    UserSearchCriteria criteria = UserSearchCriteria.builder()
        .query(q)
        .status(status)
        .role(role)
        .createdAfter(createdAfter)
        .createdBefore(createdBefore)
        .build();

    Page<User> users = userService.search(criteria, pageable);
    // ... convert and return
}

// Using Specifications for complex queries
@Service
public class UserSpecifications {

    public static Specification<User> hasEmail(String email) {
        return (root, query, criteriaBuilder) ->
            email == null ? null : criteriaBuilder.equal(root.get("email"), email);
    }

    public static Specification<User> hasStatus(UserStatus status) {
        return (root, query, criteriaBuilder) ->
            status == null ? null : criteriaBuilder.equal(root.get("status"), status);
    }

    public static Specification<User> createdBetween(LocalDate start, LocalDate end) {
        return (root, query, criteriaBuilder) -> {
            if (start == null && end == null) return null;

            if (start != null && end != null) {
                return criteriaBuilder.between(root.get("createdAt"),
                    start.atStartOfDay(), end.atTime(23, 59, 59));
            } else if (start != null) {
                return criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"),
                    start.atStartOfDay());
            } else {
                return criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"),
                    end.atTime(23, 59, 59));
            }
        };
    }

    public static Specification<User> searchByKeyword(String keyword) {
        return (root, query, criteriaBuilder) -> {
            if (keyword == null || keyword.trim().isEmpty()) return null;

            String pattern = "%" + keyword.toLowerCase() + "%";
            return criteriaBuilder.or(
                criteriaBuilder.like(criteriaBuilder.lower(root.get("firstName")), pattern),
                criteriaBuilder.like(criteriaBuilder.lower(root.get("lastName")), pattern),
                criteriaBuilder.like(criteriaBuilder.lower(root.get("email")), pattern)
            );
        };
    }
}
```

### **Bulk Operations**

```java
@PostMapping("/users/bulk")
public ResponseEntity<BulkOperationResult> bulkCreateUsers(
        @Valid @RequestBody List<CreateUserRequest> requests) {

    BulkOperationResult result = userService.bulkCreate(requests);

    if (result.hasErrors()) {
        return ResponseEntity.status(HttpStatus.MULTI_STATUS).body(result);
    } else {
        return ResponseEntity.ok(result);
    }
}

@PatchMapping("/users/bulk")
public ResponseEntity<BulkOperationResult> bulkUpdateUsers(
        @Valid @RequestBody BulkUpdateRequest request) {

    BulkOperationResult result = userService.bulkUpdate(request);
    return ResponseEntity.status(HttpStatus.MULTI_STATUS).body(result);
}

@Data
public class BulkOperationResult {
    private int totalRequests;
    private int successCount;
    private int errorCount;
    private List<OperationResult> results;

    public boolean hasErrors() {
        return errorCount > 0;
    }
}

@Data
@Builder
public class OperationResult {
    private int index;
    private String id;
    private boolean success;
    private String error;
    private Object data;
}
```

### **Content Negotiation**

```java
@GetMapping(value = "/users/{id}",
           produces = {MediaType.APPLICATION_JSON_VALUE,
                      MediaType.APPLICATION_XML_VALUE})
public ResponseEntity<UserDTO> getUser(@PathVariable String id,
                                      @RequestHeader("Accept") String acceptHeader) {

    User user = userService.findById(id)
        .orElseThrow(() -> new UserNotFoundException("User not found"));

    UserDTO userDTO = userMapper.toDTO(user);

    // Set appropriate content type based on Accept header
    return ResponseEntity.ok()
        .contentType(acceptHeader.contains("xml") ?
            MediaType.APPLICATION_XML : MediaType.APPLICATION_JSON)
        .body(userDTO);
}

// Support different response formats
@GetMapping(value = "/users", params = "format=csv")
public ResponseEntity<String> getUsersAsCsv() {
    List<User> users = userService.findAll();
    String csv = userService.convertToCsv(users);

    return ResponseEntity.ok()
        .header("Content-Disposition", "attachment; filename=users.csv")
        .contentType(MediaType.parseMediaType("text/csv"))
        .body(csv);
}
```

---

## 📝 **Error Handling & Status Codes**

### **Comprehensive Error Handling**

```java
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(
            MethodArgumentNotValidException ex) {

        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
            fieldErrors.put(error.getField(), error.getDefaultMessage()));

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Validation Failed")
            .message("Request validation failed")
            .path(getCurrentRequestPath())
            .validationErrors(fieldErrors)
            .build();

        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex) {
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.NOT_FOUND.value())
            .error("Not Found")
            .message(ex.getMessage())
            .path(getCurrentRequestPath())
            .build();

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateResource(DuplicateResourceException ex) {
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.CONFLICT.value())
            .error("Conflict")
            .message(ex.getMessage())
            .path(getCurrentRequestPath())
            .build();

        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(PreconditionFailedException.class)
    public ResponseEntity<ErrorResponse> handlePreconditionFailed(PreconditionFailedException ex) {
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.PRECONDITION_FAILED.value())
            .error("Precondition Failed")
            .message(ex.getMessage())
            .path(getCurrentRequestPath())
            .build();

        return ResponseEntity.status(HttpStatus.PRECONDITION_FAILED).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        log.error("Unhandled exception", ex);

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
            .error("Internal Server Error")
            .message("An unexpected error occurred")
            .path(getCurrentRequestPath())
            .build();

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}

@Data
@Builder
public class ErrorResponse {
    private Instant timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
    private Map<String, String> validationErrors;
    private String traceId;
}
```

### **HTTP Status Code Guidelines**

```java
// Success responses
200 OK          // Successful GET, PUT, PATCH
201 Created     // Successful POST that creates a resource
202 Accepted    // Accepted for processing (async operations)
204 No Content  // Successful DELETE, or PUT with no response body

// Client error responses
400 Bad Request          // Invalid request syntax or validation errors
401 Unauthorized         // Authentication required
403 Forbidden           // Access denied (authenticated but not authorized)
404 Not Found           // Resource doesn't exist
405 Method Not Allowed  // HTTP method not supported for this resource
409 Conflict            // Resource conflict (e.g., duplicate email)
412 Precondition Failed // ETag mismatch
422 Unprocessable Entity // Valid syntax but semantic errors
429 Too Many Requests   // Rate limiting

// Server error responses
500 Internal Server Error  // Unexpected server error
502 Bad Gateway           // Invalid response from upstream
503 Service Unavailable   // Temporary overload or maintenance
504 Gateway Timeout       // Upstream timeout
```

---

## 🔄 **API Versioning Strategies**

### **URL Versioning (Recommended)**

```java
@RestController
@RequestMapping("/api/v1/users")
public class UserControllerV1 {
    // Version 1 implementation
}

@RestController
@RequestMapping("/api/v2/users")
public class UserControllerV2 {
    // Version 2 implementation with breaking changes
}

// Version-specific DTOs
@Data
public class UserDTOV1 {
    private String id;
    private String name;  // Single name field
    private String email;
}

@Data
public class UserDTOV2 {
    private String id;
    private String firstName;  // Split name into first/last
    private String lastName;
    private String email;
    private String status;     // New field
}
```

### **Header Versioning**

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping
    public ResponseEntity<?> getUsers(
            @RequestHeader(value = "API-Version", defaultValue = "1") String version) {

        switch (version) {
            case "1":
                return getUsersV1();
            case "2":
                return getUsersV2();
            default:
                throw new UnsupportedApiVersionException("Unsupported API version: " + version);
        }
    }

    private ResponseEntity<List<UserDTOV1>> getUsersV1() {
        // Version 1 logic
    }

    private ResponseEntity<PagedResponse<UserDTOV2>> getUsersV2() {
        // Version 2 logic
    }
}
```

### **Deprecation Handling**

```java
@GetMapping("/legacy-endpoint")
@Deprecated
public ResponseEntity<UserDTO> legacyEndpoint() {
    return ResponseEntity.ok()
        .header("Deprecation", "true")
        .header("Sunset", "2024-12-31T23:59:59Z")
        .header("Link", "</api/v2/users>; rel=\"successor-version\"")
        .body(userService.getLegacyData());
}
```

---

## 📊 **Performance Optimizations**

### **Caching Strategies**

```java
@RestController
public class UserController {

    @GetMapping("/users/{id}")
    @Cacheable(value = "users", key = "#id")
    public ResponseEntity<UserDTO> getUser(@PathVariable String id) {
        User user = userService.findById(id)
            .orElseThrow(() -> new UserNotFoundException("User not found"));

        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES))
            .eTag(String.valueOf(user.getVersion()))
            .body(userMapper.toDTO(user));
    }

    @PutMapping("/users/{id}")
    @CacheEvict(value = "users", key = "#id")
    public ResponseEntity<UserDTO> updateUser(@PathVariable String id,
                                            @RequestBody UpdateUserRequest request) {
        // Update logic
    }
}
```

### **Conditional Requests**

```java
@GetMapping("/users/{id}")
public ResponseEntity<UserDTO> getUser(@PathVariable String id,
                                      @RequestHeader(value = "If-None-Match", required = false) String ifNoneMatch,
                                      @RequestHeader(value = "If-Modified-Since", required = false) String ifModifiedSince) {

    User user = userService.findById(id)
        .orElseThrow(() -> new UserNotFoundException("User not found"));

    String currentETag = String.valueOf(user.getVersion());

    // Check ETag
    if (ifNoneMatch != null && ifNoneMatch.equals(currentETag)) {
        return ResponseEntity.status(HttpStatus.NOT_MODIFIED).build();
    }

    // Check Last-Modified
    if (ifModifiedSince != null) {
        Instant ifModifiedSinceInstant = Instant.parse(ifModifiedSince);
        if (!user.getUpdatedAt().isAfter(ifModifiedSinceInstant)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).build();
        }
    }

    return ResponseEntity.ok()
        .eTag(currentETag)
        .lastModified(user.getUpdatedAt())
        .body(userMapper.toDTO(user));
}
```

### **Compression and Optimization**

```java
@Configuration
public class CompressionConfig {

    @Bean
    public FilterRegistrationBean<GzipFilter> gzipFilter() {
        FilterRegistrationBean<GzipFilter> registrationBean = new FilterRegistrationBean<>();
        registrationBean.setFilter(new GzipFilter());
        registrationBean.addUrlPatterns("/api/*");
        return registrationBean;
    }
}

// Response streaming for large datasets
@GetMapping(value = "/users/export", produces = MediaType.APPLICATION_JSON_VALUE)
public ResponseEntity<StreamingResponseBody> exportUsers() {

    StreamingResponseBody stream = outputStream -> {
        try (JsonGenerator generator = new JsonFactory().createGenerator(outputStream)) {
            generator.writeStartArray();

            userService.streamAllUsers(user -> {
                try {
                    generator.writeObject(userMapper.toDTO(user));
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            });

            generator.writeEndArray();
        }
    };

    return ResponseEntity.ok()
        .header("Content-Disposition", "attachment; filename=users.json")
        .body(stream);
}
```

---

## 🎯 **Testing REST APIs**

### **Integration Tests**

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestMethodOrder(OrderAnnotation.class)
class UserControllerIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Test
    @Order(1)
    void shouldCreateUser() {
        CreateUserRequest request = CreateUserRequest.builder()
            .email("test@example.com")
            .firstName("John")
            .lastName("Doe")
            .password("SecurePass123!")
            .roles(Arrays.asList("user"))
            .termsAccepted(true)
            .build();

        ResponseEntity<UserDTO> response = restTemplate.postForEntity(
            "/api/v1/users", request, UserDTO.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().getLocation()).isNotNull();

        UserDTO user = response.getBody();
        assertThat(user).isNotNull();
        assertThat(user.getEmail()).isEqualTo("test@example.com");
        assertThat(user.getId()).isNotNull();
    }

    @Test
    void shouldReturnValidationErrors() {
        CreateUserRequest request = CreateUserRequest.builder()
            .email("invalid-email")
            .firstName("")
            .build();

        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
            "/api/v1/users", request, ErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        ErrorResponse error = response.getBody();
        assertThat(error.getValidationErrors()).isNotEmpty();
        assertThat(error.getValidationErrors()).containsKey("email");
        assertThat(error.getValidationErrors()).containsKey("firstName");
    }
}
```

---

## 🎯 **Best Practices Summary**

### **✅ REST API Checklist**

#### **Design Principles**

- ✅ **Resource-based URLs** - Use nouns, not verbs
- ✅ **HTTP methods correctly** - GET (safe), POST (create), PUT (replace), PATCH (update), DELETE
- ✅ **Consistent naming** - Use lowercase, hyphen-separated paths
- ✅ **Hierarchical resources** - `/users/{id}/posts/{postId}`
- ✅ **Stateless design** - Each request independent

#### **Request/Response**

- ✅ **Proper status codes** - 200, 201, 400, 404, 500, etc.
- ✅ **Comprehensive validation** - Input validation with clear error messages
- ✅ **Consistent error format** - Standardized error response structure
- ✅ **Content negotiation** - Support JSON, XML as needed
- ✅ **Pagination** - For collections, include total count

#### **Performance**

- ✅ **Caching headers** - ETag, Last-Modified, Cache-Control
- ✅ **Conditional requests** - If-None-Match, If-Modified-Since
- ✅ **Compression** - Gzip for responses
- ✅ **Streaming** - For large datasets
- ✅ **Database optimization** - Efficient queries, proper indexing

#### **Security**

- ✅ **Authentication** - JWT, OAuth 2.0
- ✅ **Authorization** - Role-based access control
- ✅ **Input sanitization** - Prevent injection attacks
- ✅ **Rate limiting** - Prevent abuse
- ✅ **HTTPS only** - Encrypt all communications

---

## 🚀 **Next Steps**

1. **Implement complete CRUD** operations for a resource
2. **Add comprehensive validation** and error handling
3. **Set up pagination and filtering** for collections
4. **Implement caching strategy** for performance
5. **Move to [GraphQL Schema Design](./02-graphql-design.md)** for advanced APIs

_REST APIs are the backbone of modern web applications. Master these patterns to build scalable, maintainable APIs that follow industry standards!_
