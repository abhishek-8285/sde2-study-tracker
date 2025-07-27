# API Design & Load Balancing ⚖️

Master RESTful API design, GraphQL implementation, rate limiting, and advanced load balancing strategies with practical Java implementations for system design interviews.

## Table of Contents

- [RESTful API Design Principles](#restful-api-design-principles)
- [GraphQL vs REST Trade-offs](#graphql-vs-rest-trade-offs)
- [API Versioning Strategies](#api-versioning-strategies)
- [Rate Limiting & Throttling](#rate-limiting--throttling)
- [Load Balancing Algorithms](#load-balancing-algorithms)
- [API Gateway Patterns](#api-gateway-patterns)

---

## RESTful API Design Principles

### Comprehensive REST API Implementation

```java
@RestController
@RequestMapping("/api/v1")
@Validated
public class RESTfulController {

    private final UserService userService;
    private final CacheManager cacheManager;
    private final RateLimiter rateLimiter;

    public RESTfulController(UserService userService, CacheManager cacheManager, RateLimiter rateLimiter) {
        this.userService = userService;
        this.cacheManager = cacheManager;
        this.rateLimiter = rateLimiter;
    }

    // GET /api/v1/users - List users with pagination, filtering, sorting
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<PagedResult<UserDto>>> getUsers(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortOrder,
            @RequestParam(required = false) List<String> status,
            HttpServletRequest request) {

        // Rate limiting
        String clientId = extractClientId(request);
        if (!rateLimiter.tryAcquire(clientId)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header("Retry-After", "60")
                    .body(ApiResponse.error("Rate limit exceeded", "RATE_LIMIT_EXCEEDED"));
        }

        // Build cache key
        String cacheKey = buildCacheKey("users", page, size, search, sortBy, sortOrder, status);

        // Try cache first
        PagedResult<UserDto> cachedResult = cacheManager.get(cacheKey, PagedResult.class);
        if (cachedResult != null) {
            return ResponseEntity.ok()
                    .header("X-Cache", "HIT")
                    .body(ApiResponse.success(cachedResult));
        }

        // Build query parameters
        UserSearchCriteria criteria = UserSearchCriteria.builder()
                .search(search)
                .status(status)
                .page(page)
                .size(size)
                .sortBy(sortBy)
                .sortOrder(SortOrder.valueOf(sortOrder.toUpperCase()))
                .build();

        PagedResult<UserDto> result = userService.findUsers(criteria);

        // Cache the result
        cacheManager.put(cacheKey, result, Duration.ofMinutes(5));

        return ResponseEntity.ok()
                .header("X-Cache", "MISS")
                .header("X-Total-Count", String.valueOf(result.getTotalElements()))
                .body(ApiResponse.success(result));
    }

    // GET /api/v1/users/{id} - Get specific user
    @GetMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserDto>> getUser(
            @PathVariable @NotNull Long id,
            HttpServletRequest request) {

        String clientId = extractClientId(request);
        if (!rateLimiter.tryAcquire(clientId)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.error("Rate limit exceeded", "RATE_LIMIT_EXCEEDED"));
        }

        Optional<UserDto> user = userService.findById(id);

        if (user.isPresent()) {
            return ResponseEntity.ok()
                    .header("Cache-Control", "private, max-age=300")
                    .header("ETag", generateETag(user.get()))
                    .body(ApiResponse.success(user.get()));
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("User not found", "USER_NOT_FOUND"));
        }
    }

    // POST /api/v1/users - Create new user
    @PostMapping("/users")
    public ResponseEntity<ApiResponse<UserDto>> createUser(
            @Valid @RequestBody CreateUserRequest request,
            HttpServletRequest httpRequest) {

        String clientId = extractClientId(httpRequest);
        if (!rateLimiter.tryAcquire(clientId, 2)) { // Creating costs 2 tokens
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.error("Rate limit exceeded", "RATE_LIMIT_EXCEEDED"));
        }

        try {
            UserDto createdUser = userService.createUser(request);

            // Invalidate cache
            cacheManager.evictPattern("users:*");

            return ResponseEntity.status(HttpStatus.CREATED)
                    .header("Location", "/api/v1/users/" + createdUser.getId())
                    .body(ApiResponse.success(createdUser));

        } catch (ValidationException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage(), "VALIDATION_ERROR"));
        } catch (DuplicateEmailException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.error("Email already exists", "DUPLICATE_EMAIL"));
        }
    }

    // PUT /api/v1/users/{id} - Update user (full replacement)
    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserDto>> updateUser(
            @PathVariable @NotNull Long id,
            @Valid @RequestBody UpdateUserRequest request,
            @RequestHeader(value = "If-Match", required = false) String ifMatch,
            HttpServletRequest httpRequest) {

        String clientId = extractClientId(httpRequest);
        if (!rateLimiter.tryAcquire(clientId, 2)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.error("Rate limit exceeded", "RATE_LIMIT_EXCEEDED"));
        }

        // Check if user exists
        Optional<UserDto> existingUser = userService.findById(id);
        if (!existingUser.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("User not found", "USER_NOT_FOUND"));
        }

        // ETag validation for optimistic locking
        if (ifMatch != null) {
            String currentETag = generateETag(existingUser.get());
            if (!ifMatch.equals(currentETag)) {
                return ResponseEntity.status(HttpStatus.PRECONDITION_FAILED)
                        .body(ApiResponse.error("Resource has been modified", "PRECONDITION_FAILED"));
            }
        }

        try {
            UserDto updatedUser = userService.updateUser(id, request);

            // Invalidate cache
            cacheManager.evict("user:" + id);
            cacheManager.evictPattern("users:*");

            return ResponseEntity.ok()
                    .header("ETag", generateETag(updatedUser))
                    .body(ApiResponse.success(updatedUser));

        } catch (ValidationException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage(), "VALIDATION_ERROR"));
        }
    }

    // PATCH /api/v1/users/{id} - Partial update
    @PatchMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserDto>> patchUser(
            @PathVariable @NotNull Long id,
            @RequestBody Map<String, Object> updates,
            @RequestHeader(value = "If-Match", required = false) String ifMatch,
            HttpServletRequest httpRequest) {

        String clientId = extractClientId(httpRequest);
        if (!rateLimiter.tryAcquire(clientId, 2)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.error("Rate limit exceeded", "RATE_LIMIT_EXCEEDED"));
        }

        Optional<UserDto> existingUser = userService.findById(id);
        if (!existingUser.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("User not found", "USER_NOT_FOUND"));
        }

        // ETag validation
        if (ifMatch != null) {
            String currentETag = generateETag(existingUser.get());
            if (!ifMatch.equals(currentETag)) {
                return ResponseEntity.status(HttpStatus.PRECONDITION_FAILED)
                        .body(ApiResponse.error("Resource has been modified", "PRECONDITION_FAILED"));
            }
        }

        try {
            UserDto updatedUser = userService.patchUser(id, updates);

            // Invalidate cache
            cacheManager.evict("user:" + id);
            cacheManager.evictPattern("users:*");

            return ResponseEntity.ok()
                    .header("ETag", generateETag(updatedUser))
                    .body(ApiResponse.success(updatedUser));

        } catch (ValidationException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage(), "VALIDATION_ERROR"));
        }
    }

    // DELETE /api/v1/users/{id} - Delete user
    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable @NotNull Long id,
            HttpServletRequest httpRequest) {

        String clientId = extractClientId(httpRequest);
        if (!rateLimiter.tryAcquire(clientId, 3)) { // Deletion costs 3 tokens
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.error("Rate limit exceeded", "RATE_LIMIT_EXCEEDED"));
        }

        boolean deleted = userService.deleteUser(id);

        if (deleted) {
            // Invalidate cache
            cacheManager.evict("user:" + id);
            cacheManager.evictPattern("users:*");

            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("User not found", "USER_NOT_FOUND"));
        }
    }

    // Batch operations - POST /api/v1/users/batch
    @PostMapping("/users/batch")
    public ResponseEntity<ApiResponse<BatchResult<UserDto>>> batchCreateUsers(
            @Valid @RequestBody BatchCreateUsersRequest request,
            HttpServletRequest httpRequest) {

        String clientId = extractClientId(httpRequest);
        int tokenCost = request.getUsers().size() * 2; // 2 tokens per user
        if (!rateLimiter.tryAcquire(clientId, tokenCost)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.error("Rate limit exceeded", "RATE_LIMIT_EXCEEDED"));
        }

        BatchResult<UserDto> result = userService.batchCreateUsers(request.getUsers());

        // Invalidate cache
        cacheManager.evictPattern("users:*");

        HttpStatus status = result.hasErrors() ? HttpStatus.MULTI_STATUS : HttpStatus.CREATED;
        return ResponseEntity.status(status)
                .body(ApiResponse.success(result));
    }

    // Health check endpoint
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<HealthStatus>> healthCheck() {
        HealthStatus status = HealthStatus.builder()
                .status("UP")
                .timestamp(Instant.now())
                .checks(Map.of(
                    "database", userService.isDatabaseHealthy() ? "UP" : "DOWN",
                    "cache", cacheManager.isHealthy() ? "UP" : "DOWN",
                    "rateLimiter", rateLimiter.isHealthy() ? "UP" : "DOWN"
                ))
                .build();

        HttpStatus httpStatus = status.getChecks().values().stream()
                .allMatch("UP"::equals) ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

        return ResponseEntity.status(httpStatus)
                .header("Cache-Control", "no-cache")
                .body(ApiResponse.success(status));
    }

    // Utility methods
    private String extractClientId(HttpServletRequest request) {
        String apiKey = request.getHeader("X-API-Key");
        if (apiKey != null) return apiKey;

        return request.getRemoteAddr(); // Fallback to IP address
    }

    private String buildCacheKey(String prefix, Object... params) {
        return prefix + ":" + Arrays.stream(params)
                .map(Object::toString)
                .collect(Collectors.joining(":"));
    }

    private String generateETag(UserDto user) {
        return "\"" + Integer.toHexString(user.hashCode()) + "\"";
    }
}

// Standard API Response wrapper
public class ApiResponse<T> {
    private final boolean success;
    private final T data;
    private final String message;
    private final String errorCode;
    private final Instant timestamp;

    private ApiResponse(boolean success, T data, String message, String errorCode) {
        this.success = success;
        this.data = data;
        this.message = message;
        this.errorCode = errorCode;
        this.timestamp = Instant.now();
    }

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, null, null);
    }

    public static <T> ApiResponse<T> error(String message, String errorCode) {
        return new ApiResponse<>(false, null, message, errorCode);
    }

    // Getters
    public boolean isSuccess() { return success; }
    public T getData() { return data; }
    public String getMessage() { return message; }
    public String getErrorCode() { return errorCode; }
    public Instant getTimestamp() { return timestamp; }
}

// Pagination support
public class PagedResult<T> {
    private final List<T> content;
    private final long totalElements;
    private final int totalPages;
    private final int pageNumber;
    private final int pageSize;
    private final boolean hasNext;
    private final boolean hasPrevious;

    public PagedResult(List<T> content, long totalElements, int pageNumber, int pageSize) {
        this.content = content;
        this.totalElements = totalElements;
        this.pageNumber = pageNumber;
        this.pageSize = pageSize;
        this.totalPages = (int) Math.ceil((double) totalElements / pageSize);
        this.hasNext = pageNumber < totalPages - 1;
        this.hasPrevious = pageNumber > 0;
    }

    // Getters
    public List<T> getContent() { return content; }
    public long getTotalElements() { return totalElements; }
    public int getTotalPages() { return totalPages; }
    public int getPageNumber() { return pageNumber; }
    public int getPageSize() { return pageSize; }
    public boolean isHasNext() { return hasNext; }
    public boolean isHasPrevious() { return hasPrevious; }
}

// Request/Response DTOs
@Data
@Builder
public class UserDto {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;
}

@Data
@Valid
public class CreateUserRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "First name is required")
    @Size(min = 1, max = 50, message = "First name must be between 1 and 50 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 1, max = 50, message = "Last name must be between 1 and 50 characters")
    private String lastName;

    @Pattern(regexp = "ACTIVE|INACTIVE", message = "Status must be ACTIVE or INACTIVE")
    private String status = "ACTIVE";
}

@Data
public class BatchCreateUsersRequest {
    @Valid
    @Size(min = 1, max = 100, message = "Batch size must be between 1 and 100")
    private List<CreateUserRequest> users;
}

public class BatchResult<T> {
    private final List<T> successful;
    private final List<BatchError> errors;

    public BatchResult(List<T> successful, List<BatchError> errors) {
        this.successful = successful;
        this.errors = errors;
    }

    public boolean hasErrors() {
        return !errors.isEmpty();
    }

    // Getters
    public List<T> getSuccessful() { return successful; }
    public List<BatchError> getErrors() { return errors; }

    public static class BatchError {
        private final int index;
        private final String message;
        private final String errorCode;

        public BatchError(int index, String message, String errorCode) {
            this.index = index;
            this.message = message;
            this.errorCode = errorCode;
        }

        // Getters
        public int getIndex() { return index; }
        public String getMessage() { return message; }
        public String getErrorCode() { return errorCode; }
    }
}
```

---

## GraphQL vs REST Trade-offs

### GraphQL Implementation with DataLoader

```java
@Component
public class GraphQLResolver implements GraphQLQueryResolver, GraphQLMutationResolver {

    private final UserService userService;
    private final PostService postService;
    private final DataLoaderRegistry dataLoaderRegistry;

    public GraphQLResolver(UserService userService, PostService postService,
                          DataLoaderRegistry dataLoaderRegistry) {
        this.userService = userService;
        this.postService = postService;
        this.dataLoaderRegistry = dataLoaderRegistry;
    }

    // Query resolvers
    public List<User> users(int first, String after, UserFilter filter, UserSort sort) {
        return userService.findUsers(first, after, filter, sort);
    }

    public User user(Long id, DataFetchingEnvironment environment) {
        DataLoader<Long, User> userLoader = environment.getDataLoader("userLoader");
        return userLoader.load(id);
    }

    public List<Post> posts(int first, String after, PostFilter filter) {
        return postService.findPosts(first, after, filter);
    }

    // Field resolvers for User
    @GraphQLField
    public CompletableFuture<List<Post>> posts(User user, int first, String after,
                                              DataFetchingEnvironment environment) {
        DataLoader<Long, List<Post>> postsLoader = environment.getDataLoader("postsByUserLoader");
        return postsLoader.load(user.getId());
    }

    @GraphQLField
    public CompletableFuture<List<User>> followers(User user, DataFetchingEnvironment environment) {
        DataLoader<Long, List<User>> followersLoader = environment.getDataLoader("followersLoader");
        return followersLoader.load(user.getId());
    }

    @GraphQLField
    public CompletableFuture<List<User>> following(User user, DataFetchingEnvironment environment) {
        DataLoader<Long, List<User>> followingLoader = environment.getDataLoader("followingLoader");
        return followingLoader.load(user.getId());
    }

    // Mutation resolvers
    public CreateUserPayload createUser(CreateUserInput input) {
        try {
            User user = userService.createUser(input);
            return CreateUserPayload.success(user);
        } catch (ValidationException e) {
            return CreateUserPayload.error(e.getErrors());
        }
    }

    public UpdateUserPayload updateUser(Long id, UpdateUserInput input) {
        try {
            User user = userService.updateUser(id, input);
            return UpdateUserPayload.success(user);
        } catch (UserNotFoundException e) {
            return UpdateUserPayload.error("User not found");
        } catch (ValidationException e) {
            return UpdateUserPayload.error(e.getErrors());
        }
    }

    public DeleteUserPayload deleteUser(Long id) {
        boolean deleted = userService.deleteUser(id);
        return deleted ? DeleteUserPayload.success() : DeleteUserPayload.error("User not found");
    }
}

// DataLoader implementation for N+1 query prevention
@Configuration
public class DataLoaderConfiguration {

    @Bean
    public DataLoaderRegistry dataLoaderRegistry(UserService userService, PostService postService) {
        DataLoaderRegistry registry = new DataLoaderRegistry();

        // User DataLoader
        DataLoader<Long, User> userLoader = DataLoader.newDataLoader(keys ->
            CompletableFuture.supplyAsync(() -> userService.findByIds(keys))
        );
        registry.register("userLoader", userLoader);

        // Posts by User DataLoader
        DataLoader<Long, List<Post>> postsByUserLoader = DataLoader.newDataLoader(userIds ->
            CompletableFuture.supplyAsync(() -> {
                Map<Long, List<Post>> postsByUser = postService.findPostsByUserIds(userIds);
                return userIds.stream()
                             .map(userId -> postsByUser.getOrDefault(userId, Collections.emptyList()))
                             .collect(Collectors.toList());
            })
        );
        registry.register("postsByUserLoader", postsByUserLoader);

        // Followers DataLoader
        DataLoader<Long, List<User>> followersLoader = DataLoader.newDataLoader(userIds ->
            CompletableFuture.supplyAsync(() -> {
                Map<Long, List<User>> followersByUser = userService.findFollowersByUserIds(userIds);
                return userIds.stream()
                             .map(userId -> followersByUser.getOrDefault(userId, Collections.emptyList()))
                             .collect(Collectors.toList());
            })
        );
        registry.register("followersLoader", followersLoader);

        return registry;
    }
}

// Query complexity analysis to prevent expensive queries
@Component
public class QueryComplexityAnalyzer {

    private static final int MAX_QUERY_COMPLEXITY = 1000;
    private static final int MAX_QUERY_DEPTH = 10;

    public void analyzeQuery(String query, Map<String, Object> variables) throws QueryComplexityException {
        QueryComplexityResult result = calculateComplexity(query, variables);

        if (result.getComplexity() > MAX_QUERY_COMPLEXITY) {
            throw new QueryComplexityException(
                "Query complexity " + result.getComplexity() + " exceeds maximum " + MAX_QUERY_COMPLEXITY);
        }

        if (result.getDepth() > MAX_QUERY_DEPTH) {
            throw new QueryComplexityException(
                "Query depth " + result.getDepth() + " exceeds maximum " + MAX_QUERY_DEPTH);
        }
    }

    private QueryComplexityResult calculateComplexity(String query, Map<String, Object> variables) {
        // Parse GraphQL query and calculate complexity
        // This is a simplified implementation

        int depth = countQueryDepth(query);
        int complexity = estimateComplexity(query, variables);

        return new QueryComplexityResult(complexity, depth);
    }

    private int countQueryDepth(String query) {
        // Count nesting levels in the query
        int maxDepth = 0;
        int currentDepth = 0;

        for (char c : query.toCharArray()) {
            if (c == '{') {
                currentDepth++;
                maxDepth = Math.max(maxDepth, currentDepth);
            } else if (c == '}') {
                currentDepth--;
            }
        }

        return maxDepth;
    }

    private int estimateComplexity(String query, Map<String, Object> variables) {
        // Estimate query complexity based on field selections and arguments
        int complexity = 0;

        // Count field selections
        complexity += countOccurrences(query, "\\w+\\s*\\{") * 10; // Field with sub-selections
        complexity += countOccurrences(query, "\\w+(?!\\s*\\{)") * 1; // Simple fields

        // Penalty for pagination arguments
        if (query.contains("first:") || query.contains("last:")) {
            complexity += extractPaginationSize(query, variables);
        }

        return complexity;
    }

    private int countOccurrences(String text, String pattern) {
        return (int) Pattern.compile(pattern).matcher(text).results().count();
    }

    private int extractPaginationSize(String query, Map<String, Object> variables) {
        // Extract pagination size from query or variables
        // Simplified implementation
        return 50; // Default penalty
    }

    public static class QueryComplexityResult {
        private final int complexity;
        private final int depth;

        public QueryComplexityResult(int complexity, int depth) {
            this.complexity = complexity;
            this.depth = depth;
        }

        // Getters
        public int getComplexity() { return complexity; }
        public int getDepth() { return depth; }
    }

    public static class QueryComplexityException extends RuntimeException {
        public QueryComplexityException(String message) {
            super(message);
        }
    }
}

// GraphQL instrumentation for monitoring
@Component
public class GraphQLInstrumentation extends SimpleInstrumentation {

    private final MeterRegistry meterRegistry;

    public GraphQLInstrumentation(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @Override
    public InstrumentationContext<ExecutionResult> beginExecution(
            InstrumentationExecutionParameters parameters) {

        Timer.Sample sample = Timer.start(meterRegistry);

        return new SimpleInstrumentationContext<ExecutionResult>() {
            @Override
            public void onCompleted(ExecutionResult result, Throwable t) {
                sample.stop(Timer.builder("graphql.execution.time")
                                .tag("operation", getOperationType(parameters))
                                .tag("success", String.valueOf(t == null))
                                .register(meterRegistry));

                // Count errors
                if (result.getErrors() != null && !result.getErrors().isEmpty()) {
                    Counter.builder("graphql.errors")
                           .tag("operation", getOperationType(parameters))
                           .register(meterRegistry)
                           .increment(result.getErrors().size());
                }
            }
        };
    }

    @Override
    public InstrumentationContext<Object> beginFieldFetch(
            InstrumentationFieldFetchParameters parameters) {

        Timer.Sample sample = Timer.start(meterRegistry);
        String fieldName = parameters.getField().getName();

        return new SimpleInstrumentationContext<Object>() {
            @Override
            public void onCompleted(Object result, Throwable t) {
                sample.stop(Timer.builder("graphql.field.fetch.time")
                                .tag("field", fieldName)
                                .tag("success", String.valueOf(t == null))
                                .register(meterRegistry));
            }
        };
    }

    private String getOperationType(InstrumentationExecutionParameters parameters) {
        return parameters.getQuery().contains("mutation") ? "mutation" : "query";
    }
}
```

---

## Rate Limiting & Throttling

### Advanced Rate Limiting Strategies

```java
public class AdvancedRateLimiter {

    // Token bucket with Redis backend for distributed systems
    public static class DistributedTokenBucket {
        private final RedisTemplate<String, String> redisTemplate;
        private final String keyPrefix;
        private final long capacity;
        private final long refillRate;
        private final Duration refillPeriod;

        public DistributedTokenBucket(RedisTemplate<String, String> redisTemplate,
                                    String keyPrefix, long capacity, long refillRate,
                                    Duration refillPeriod) {
            this.redisTemplate = redisTemplate;
            this.keyPrefix = keyPrefix;
            this.capacity = capacity;
            this.refillRate = refillRate;
            this.refillPeriod = refillPeriod;
        }

        public boolean tryAcquire(String key, long tokens) {
            String bucketKey = keyPrefix + ":" + key;

            // Lua script for atomic token bucket operations
            String luaScript =
                "local bucket_key = KEYS[1]\n" +
                "local capacity = tonumber(ARGV[1])\n" +
                "local refill_rate = tonumber(ARGV[2])\n" +
                "local refill_period = tonumber(ARGV[3])\n" +
                "local requested_tokens = tonumber(ARGV[4])\n" +
                "local current_time = tonumber(ARGV[5])\n" +
                "\n" +
                "local bucket = redis.call('HMGET', bucket_key, 'tokens', 'last_refill')\n" +
                "local tokens = tonumber(bucket[1]) or capacity\n" +
                "local last_refill = tonumber(bucket[2]) or current_time\n" +
                "\n" +
                "-- Calculate refill\n" +
                "local time_elapsed = current_time - last_refill\n" +
                "local refill_periods = math.floor(time_elapsed / refill_period)\n" +
                "if refill_periods > 0 then\n" +
                "    tokens = math.min(capacity, tokens + (refill_periods * refill_rate))\n" +
                "    last_refill = last_refill + (refill_periods * refill_period)\n" +
                "end\n" +
                "\n" +
                "-- Check if enough tokens\n" +
                "if tokens >= requested_tokens then\n" +
                "    tokens = tokens - requested_tokens\n" +
                "    redis.call('HMSET', bucket_key, 'tokens', tokens, 'last_refill', last_refill)\n" +
                "    redis.call('EXPIRE', bucket_key, 3600)\n" +
                "    return {1, tokens}\n" +
                "else\n" +
                "    redis.call('HMSET', bucket_key, 'tokens', tokens, 'last_refill', last_refill)\n" +
                "    redis.call('EXPIRE', bucket_key, 3600)\n" +
                "    return {0, tokens}\n" +
                "end";

            DefaultRedisScript<List> script = new DefaultRedisScript<>();
            script.setScriptText(luaScript);
            script.setResultType(List.class);

            List<Long> result = redisTemplate.execute(script,
                Collections.singletonList(bucketKey),
                String.valueOf(capacity),
                String.valueOf(refillRate),
                String.valueOf(refillPeriod.toMillis()),
                String.valueOf(tokens),
                String.valueOf(System.currentTimeMillis())
            );

            return result.get(0) == 1L;
        }

        public long getAvailableTokens(String key) {
            String bucketKey = keyPrefix + ":" + key;
            String tokens = redisTemplate.opsForHash().get(bucketKey, "tokens").toString();
            return tokens != null ? Long.parseLong(tokens) : capacity;
        }
    }

    // Sliding window rate limiter
    public static class SlidingWindowRateLimiter {
        private final RedisTemplate<String, String> redisTemplate;
        private final String keyPrefix;
        private final long windowSizeMs;
        private final long maxRequests;

        public SlidingWindowRateLimiter(RedisTemplate<String, String> redisTemplate,
                                      String keyPrefix, Duration windowSize, long maxRequests) {
            this.redisTemplate = redisTemplate;
            this.keyPrefix = keyPrefix;
            this.windowSizeMs = windowSize.toMillis();
            this.maxRequests = maxRequests;
        }

        public boolean tryAcquire(String key) {
            String windowKey = keyPrefix + ":" + key;
            long currentTime = System.currentTimeMillis();
            long windowStart = currentTime - windowSizeMs;

            String luaScript =
                "local window_key = KEYS[1]\n" +
                "local window_start = tonumber(ARGV[1])\n" +
                "local current_time = tonumber(ARGV[2])\n" +
                "local max_requests = tonumber(ARGV[3])\n" +
                "\n" +
                "-- Remove old entries\n" +
                "redis.call('ZREMRANGEBYSCORE', window_key, 0, window_start)\n" +
                "\n" +
                "-- Count current requests in window\n" +
                "local current_requests = redis.call('ZCARD', window_key)\n" +
                "\n" +
                "if current_requests < max_requests then\n" +
                "    -- Add current request\n" +
                "    redis.call('ZADD', window_key, current_time, current_time)\n" +
                "    redis.call('EXPIRE', window_key, math.ceil(" + (windowSizeMs / 1000) + "))\n" +
                "    return {1, current_requests + 1}\n" +
                "else\n" +
                "    return {0, current_requests}\n" +
                "end";

            DefaultRedisScript<List> script = new DefaultRedisScript<>();
            script.setScriptText(luaScript);
            script.setResultType(List.class);

            List<Long> result = redisTemplate.execute(script,
                Collections.singletonList(windowKey),
                String.valueOf(windowStart),
                String.valueOf(currentTime),
                String.valueOf(maxRequests)
            );

            return result.get(0) == 1L;
        }

        public long getCurrentRequestCount(String key) {
            String windowKey = keyPrefix + ":" + key;
            long currentTime = System.currentTimeMillis();
            long windowStart = currentTime - windowSizeMs;

            // Clean old entries and count
            redisTemplate.opsForZSet().removeRangeByScore(windowKey, 0, windowStart);
            return redisTemplate.opsForZSet().zCard(windowKey);
        }
    }

    // Adaptive rate limiter based on system load
    public static class AdaptiveRateLimiter {
        private final DistributedTokenBucket baseLimiter;
        private final SystemLoadMonitor loadMonitor;
        private final long baseRate;
        private final AtomicLong currentRate;

        public AdaptiveRateLimiter(DistributedTokenBucket baseLimiter,
                                 SystemLoadMonitor loadMonitor, long baseRate) {
            this.baseLimiter = baseLimiter;
            this.loadMonitor = loadMonitor;
            this.baseRate = baseRate;
            this.currentRate = new AtomicLong(baseRate);

            startAdaptation();
        }

        public boolean tryAcquire(String key, long tokens) {
            return baseLimiter.tryAcquire(key, tokens);
        }

        private void startAdaptation() {
            ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
            scheduler.scheduleAtFixedRate(this::adaptRate, 0, 10, TimeUnit.SECONDS);
        }

        private void adaptRate() {
            double cpuUsage = loadMonitor.getCpuUsage();
            double memoryUsage = loadMonitor.getMemoryUsage();

            double loadFactor = Math.max(cpuUsage, memoryUsage) / 100.0;
            long newRate;

            if (loadFactor > 0.8) {
                // High load - reduce rate by 20%
                newRate = (long) (baseRate * 0.8);
            } else if (loadFactor < 0.5) {
                // Low load - increase rate by 20%
                newRate = (long) (baseRate * 1.2);
            } else {
                // Normal load - use base rate
                newRate = baseRate;
            }

            currentRate.set(newRate);
        }

        public long getCurrentRate() {
            return currentRate.get();
        }
    }

    // Hierarchical rate limiting (per user, per IP, global)
    public static class HierarchicalRateLimiter {
        private final Map<String, RateLimiter> limiters;

        public HierarchicalRateLimiter() {
            this.limiters = new ConcurrentHashMap<>();
        }

        public void addLimiter(String name, RateLimiter limiter) {
            limiters.put(name, limiter);
        }

        public RateLimitResult tryAcquire(String userId, String ipAddress, long tokens) {
            // Check in order: global -> IP -> user
            List<RateLimitCheck> checks = Arrays.asList(
                new RateLimitCheck("global", "global", limiters.get("global")),
                new RateLimitCheck("ip", ipAddress, limiters.get("ip")),
                new RateLimitCheck("user", userId, limiters.get("user"))
            );

            for (RateLimitCheck check : checks) {
                if (check.limiter != null && !check.limiter.tryAcquire(check.key, tokens)) {
                    return RateLimitResult.denied(check.level, getRemainingTokens(check));
                }
            }

            return RateLimitResult.allowed();
        }

        private long getRemainingTokens(RateLimitCheck check) {
            if (check.limiter instanceof DistributedTokenBucket) {
                return ((DistributedTokenBucket) check.limiter).getAvailableTokens(check.key);
            }
            return 0;
        }

        private static class RateLimitCheck {
            final String level;
            final String key;
            final RateLimiter limiter;

            RateLimitCheck(String level, String key, RateLimiter limiter) {
                this.level = level;
                this.key = key;
                this.limiter = limiter;
            }
        }
    }

    public static class RateLimitResult {
        private final boolean allowed;
        private final String deniedLevel;
        private final long remainingTokens;
        private final Instant retryAfter;

        private RateLimitResult(boolean allowed, String deniedLevel, long remainingTokens) {
            this.allowed = allowed;
            this.deniedLevel = deniedLevel;
            this.remainingTokens = remainingTokens;
            this.retryAfter = allowed ? null : Instant.now().plusSeconds(60);
        }

        public static RateLimitResult allowed() {
            return new RateLimitResult(true, null, 0);
        }

        public static RateLimitResult denied(String level, long remainingTokens) {
            return new RateLimitResult(false, level, remainingTokens);
        }

        // Getters
        public boolean isAllowed() { return allowed; }
        public String getDeniedLevel() { return deniedLevel; }
        public long getRemainingTokens() { return remainingTokens; }
        public Instant getRetryAfter() { return retryAfter; }
    }

    public interface RateLimiter {
        boolean tryAcquire(String key, long tokens);
        default boolean tryAcquire(String key) { return tryAcquire(key, 1); }
    }

    public interface SystemLoadMonitor {
        double getCpuUsage();
        double getMemoryUsage();
    }
}
```

---

## Load Balancing Algorithms

### Advanced Load Balancer Implementation

```java
public class LoadBalancerManager {

    // Weighted round-robin load balancer
    public static class WeightedRoundRobinBalancer {
        private final List<WeightedServer> servers;
        private final AtomicInteger currentIndex;
        private final AtomicInteger currentWeight;

        public WeightedRoundRobinBalancer(List<WeightedServer> servers) {
            this.servers = new ArrayList<>(servers);
            this.currentIndex = new AtomicInteger(-1);
            this.currentWeight = new AtomicInteger(0);
        }

        public Server selectServer() {
            if (servers.isEmpty()) {
                return null;
            }

            int maxWeight = servers.stream()
                    .mapToInt(WeightedServer::getWeight)
                    .max()
                    .orElse(0);

            int gcd = calculateGCD(servers.stream()
                    .mapToInt(WeightedServer::getWeight)
                    .toArray());

            while (true) {
                int index = currentIndex.updateAndGet(i -> (i + 1) % servers.size());

                if (index == 0) {
                    currentWeight.updateAndGet(w -> {
                        w = w - gcd;
                        return w <= 0 ? maxWeight : w;
                    });
                }

                WeightedServer server = servers.get(index);
                if (server.getWeight() >= currentWeight.get() && server.isHealthy()) {
                    return server;
                }
            }
        }

        private int calculateGCD(int[] weights) {
            int result = weights[0];
            for (int i = 1; i < weights.length; i++) {
                result = gcd(result, weights[i]);
            }
            return result;
        }

        private int gcd(int a, int b) {
            return b == 0 ? a : gcd(b, a % b);
        }
    }

    // Least connections load balancer
    public static class LeastConnectionsBalancer {
        private final List<Server> servers;
        private final Map<Server, AtomicInteger> activeConnections;

        public LeastConnectionsBalancer(List<Server> servers) {
            this.servers = new ArrayList<>(servers);
            this.activeConnections = servers.stream()
                    .collect(Collectors.toConcurrentMap(
                        Function.identity(),
                        s -> new AtomicInteger(0)
                    ));
        }

        public Server selectServer() {
            return servers.stream()
                    .filter(Server::isHealthy)
                    .min(Comparator.comparingInt(s -> activeConnections.get(s).get()))
                    .orElse(null);
        }

        public void onConnectionStart(Server server) {
            activeConnections.get(server).incrementAndGet();
        }

        public void onConnectionEnd(Server server) {
            activeConnections.get(server).decrementAndGet();
        }

        public Map<Server, Integer> getConnectionCounts() {
            return activeConnections.entrySet().stream()
                    .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> e.getValue().get()
                    ));
        }
    }

    // Consistent hashing load balancer
    public static class ConsistentHashingBalancer {
        private final TreeMap<Long, Server> hashRing;
        private final int virtualNodes;
        private final MessageDigest md5;

        public ConsistentHashingBalancer(List<Server> servers, int virtualNodes) {
            this.hashRing = new TreeMap<>();
            this.virtualNodes = virtualNodes;

            try {
                this.md5 = MessageDigest.getInstance("MD5");
            } catch (NoSuchAlgorithmException e) {
                throw new RuntimeException("MD5 algorithm not available", e);
            }

            // Add servers to the hash ring
            servers.forEach(this::addServer);
        }

        public void addServer(Server server) {
            for (int i = 0; i < virtualNodes; i++) {
                String virtualKey = server.getId() + ":" + i;
                long hash = computeHash(virtualKey);
                hashRing.put(hash, server);
            }
        }

        public void removeServer(Server server) {
            for (int i = 0; i < virtualNodes; i++) {
                String virtualKey = server.getId() + ":" + i;
                long hash = computeHash(virtualKey);
                hashRing.remove(hash);
            }
        }

        public Server selectServer(String key) {
            if (hashRing.isEmpty()) {
                return null;
            }

            long hash = computeHash(key);

            // Find the first server clockwise from the hash
            Map.Entry<Long, Server> entry = hashRing.ceilingEntry(hash);
            if (entry == null) {
                entry = hashRing.firstEntry(); // Wrap around
            }

            Server server = entry.getValue();

            // If server is not healthy, try next servers
            if (!server.isHealthy()) {
                return findNextHealthyServer(hash);
            }

            return server;
        }

        private Server findNextHealthyServer(long hash) {
            Map.Entry<Long, Server> entry = hashRing.ceilingEntry(hash);

            // Try all servers starting from the hash position
            for (int attempts = 0; attempts < hashRing.size(); attempts++) {
                if (entry == null) {
                    entry = hashRing.firstEntry(); // Wrap around
                }

                if (entry.getValue().isHealthy()) {
                    return entry.getValue();
                }

                entry = hashRing.higherEntry(entry.getKey());
            }

            return null; // No healthy servers
        }

        private long computeHash(String key) {
            md5.reset();
            md5.update(key.getBytes());
            byte[] digest = md5.digest();

            long hash = 0;
            for (int i = 0; i < 4; i++) {
                hash <<= 8;
                hash |= digest[i] & 0xFF;
            }

            return hash;
        }

        public Map<Server, Integer> getDistribution() {
            Map<Server, Integer> distribution = new HashMap<>();

            // Sample 1000 keys to see distribution
            for (int i = 0; i < 1000; i++) {
                Server server = selectServer("key" + i);
                if (server != null) {
                    distribution.merge(server, 1, Integer::sum);
                }
            }

            return distribution;
        }
    }

    // Adaptive load balancer that switches algorithms based on conditions
    public static class AdaptiveLoadBalancer {
        private final Map<String, LoadBalancingStrategy> strategies;
        private volatile String currentStrategy;
        private final LoadMetrics metrics;

        public AdaptiveLoadBalancer(Map<String, LoadBalancingStrategy> strategies,
                                  String defaultStrategy, LoadMetrics metrics) {
            this.strategies = strategies;
            this.currentStrategy = defaultStrategy;
            this.metrics = metrics;

            startAdaptation();
        }

        public Server selectServer(String sessionId) {
            LoadBalancingStrategy strategy = strategies.get(currentStrategy);
            return strategy.selectServer(sessionId);
        }

        private void startAdaptation() {
            ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
            scheduler.scheduleAtFixedRate(this::adaptStrategy, 0, 30, TimeUnit.SECONDS);
        }

        private void adaptStrategy() {
            double averageResponseTime = metrics.getAverageResponseTime();
            double errorRate = metrics.getErrorRate();
            int activeConnections = metrics.getTotalActiveConnections();

            String newStrategy = currentStrategy;

            if (errorRate > 5.0) {
                // High error rate - use least connections to balance load better
                newStrategy = "leastConnections";
            } else if (averageResponseTime > 1000) {
                // High response time - use consistent hashing for better cache locality
                newStrategy = "consistentHashing";
            } else if (activeConnections < 100) {
                // Low load - use simple round robin
                newStrategy = "roundRobin";
            } else {
                // Normal load - use weighted round robin
                newStrategy = "weightedRoundRobin";
            }

            if (!newStrategy.equals(currentStrategy)) {
                System.out.println("Switching load balancing strategy from " +
                                 currentStrategy + " to " + newStrategy);
                currentStrategy = newStrategy;
            }
        }

        public String getCurrentStrategy() {
            return currentStrategy;
        }
    }

    // Health check implementation
    public static class HealthChecker {
        private final ExecutorService executorService;
        private final Duration checkInterval;
        private final Duration timeout;

        public HealthChecker(int threadPoolSize, Duration checkInterval, Duration timeout) {
            this.executorService = Executors.newFixedThreadPool(threadPoolSize);
            this.checkInterval = checkInterval;
            this.timeout = timeout;
        }

        public void startHealthChecks(List<Server> servers) {
            ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

            scheduler.scheduleAtFixedRate(() -> {
                List<CompletableFuture<Void>> healthChecks = servers.stream()
                        .map(this::checkServerHealth)
                        .collect(Collectors.toList());

                CompletableFuture.allOf(healthChecks.toArray(new CompletableFuture[0]))
                        .whenComplete((result, throwable) -> {
                            if (throwable != null) {
                                System.err.println("Health check batch failed: " + throwable.getMessage());
                            }
                        });

            }, 0, checkInterval.toMillis(), TimeUnit.MILLISECONDS);
        }

        private CompletableFuture<Void> checkServerHealth(Server server) {
            return CompletableFuture.runAsync(() -> {
                try {
                    boolean isHealthy = performHealthCheck(server);
                    server.setHealthy(isHealthy);
                    server.setLastHealthCheck(Instant.now());

                    if (!isHealthy) {
                        System.out.println("Server " + server.getId() + " failed health check");
                    }

                } catch (Exception e) {
                    server.setHealthy(false);
                    server.setLastHealthCheck(Instant.now());
                    System.err.println("Health check failed for server " + server.getId() +
                                     ": " + e.getMessage());
                }
            }, executorService);
        }

        private boolean performHealthCheck(Server server) {
            try {
                HttpClient client = HttpClient.newBuilder()
                        .connectTimeout(timeout)
                        .build();

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(server.getUrl() + "/health"))
                        .timeout(timeout)
                        .build();

                HttpResponse<String> response = client.send(request,
                        HttpResponse.BodyHandlers.ofString());

                return response.statusCode() == 200;

            } catch (Exception e) {
                return false;
            }
        }

        public void shutdown() {
            executorService.shutdown();
        }
    }

    // Supporting interfaces and classes
    public interface LoadBalancingStrategy {
        Server selectServer(String sessionId);
    }

    public interface LoadMetrics {
        double getAverageResponseTime();
        double getErrorRate();
        int getTotalActiveConnections();
    }

    public static class WeightedServer extends Server {
        private final int weight;

        public WeightedServer(String id, String url, int weight) {
            super(id, url);
            this.weight = weight;
        }

        public int getWeight() { return weight; }
    }

    public static class Server {
        private final String id;
        private final String url;
        private volatile boolean healthy = true;
        private volatile Instant lastHealthCheck;

        public Server(String id, String url) {
            this.id = id;
            this.url = url;
            this.lastHealthCheck = Instant.now();
        }

        // Getters and setters
        public String getId() { return id; }
        public String getUrl() { return url; }
        public boolean isHealthy() { return healthy; }
        public void setHealthy(boolean healthy) { this.healthy = healthy; }
        public Instant getLastHealthCheck() { return lastHealthCheck; }
        public void setLastHealthCheck(Instant lastHealthCheck) { this.lastHealthCheck = lastHealthCheck; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Server)) return false;
            Server server = (Server) o;
            return Objects.equals(id, server.id);
        }

        @Override
        public int hashCode() {
            return Objects.hash(id);
        }
    }
}
```

**📊 Load Balancing Algorithm Comparison:**

| Algorithm              | Session Affinity | Load Distribution | Complexity | Use Case                 |
| ---------------------- | ---------------- | ----------------- | ---------- | ------------------------ |
| **Round Robin**        | No               | Even              | Low        | Stateless apps           |
| **Weighted RR**        | No               | Proportional      | Medium     | Mixed server capacity    |
| **Least Connections**  | No               | Load-based        | Medium     | Long-running connections |
| **Consistent Hashing** | Yes              | Consistent        | High       | Caching, stateful apps   |

---

## Summary & Best Practices

### 🎯 Key Takeaways

✅ **Design RESTful APIs**: Follow HTTP semantics, use proper status codes, implement pagination  
✅ **Choose Right Protocol**: REST for CRUD, GraphQL for complex queries, gRPC for high performance  
✅ **Implement Rate Limiting**: Protect against abuse, use hierarchical limits, adapt to system load  
✅ **Smart Load Balancing**: Choose algorithm based on use case, implement health checks, monitor distribution  
✅ **Version APIs Carefully**: Use semantic versioning, support multiple versions, plan deprecation

### 📈 API Design Checklist

- [ ] Defined clear API contracts with proper documentation
- [ ] Implemented comprehensive error handling
- [ ] Added authentication and authorization
- [ ] Set up rate limiting and throttling
- [ ] Implemented caching strategies
- [ ] Added monitoring and logging
- [ ] Planned for API versioning
- [ ] Tested failure scenarios

### ⚠️ Common API Design Pitfalls

- **Ignoring HTTP semantics**: Wrong status codes, improper method usage
- **No rate limiting**: Vulnerable to abuse and DDoS
- **Poor error handling**: Cryptic error messages, information leakage
- **Breaking changes**: Not versioning APIs properly
- **No monitoring**: Can't detect performance issues

**📈 Next Steps:**
Ready for high-level system design? Continue with [High-Level Architecture Patterns](./06-architecture-patterns.md) to learn about microservices, event-driven architectures, and distributed system patterns.

---

_💡 Pro Tip: Design your APIs for the worst-case scenario. Implement proper rate limiting, comprehensive error handling, and monitoring from day one. Always version your APIs and maintain backward compatibility. Choose the right load balancing algorithm based on your specific use case and traffic patterns._
