# Database Design & Choices 🗄️

Master database selection, partitioning strategies, and consistency patterns with practical Java implementations for system design interviews.

## Table of Contents

- [Database Selection Framework](#database-selection-framework)
- [SQL vs NoSQL Trade-offs](#sql-vs-nosql-trade-offs)
- [Database Partitioning Strategies](#database-partitioning-strategies)
- [Consistency Patterns](#consistency-patterns)
- [Database Federation](#database-federation)
- [ACID vs BASE Trade-offs](#acid-vs-base-trade-offs)

---

## Database Selection Framework

### Database Decision Tree Implementation

```java
public class DatabaseSelector {

    public enum DatabaseType {
        RELATIONAL_SQL,
        DOCUMENT_NOSQL,
        KEY_VALUE_NOSQL,
        COLUMN_FAMILY,
        GRAPH_DATABASE,
        SEARCH_ENGINE,
        TIME_SERIES
    }

    public static class SystemRequirements {
        private final boolean needsACIDTransactions;
        private final boolean needsComplexQueries;
        private final boolean needsHighAvailability;
        private final boolean needsHorizontalScaling;
        private final boolean hasVariableSchema;
        private final boolean needsFullTextSearch;
        private final boolean hasGraphRelationships;
        private final boolean isTimeSeries;
        private final long expectedWritesPerSecond;
        private final long expectedReadsPerSecond;
        private final String consistencyRequirement; // "strong", "eventual", "session"

        public SystemRequirements(boolean needsACIDTransactions, boolean needsComplexQueries,
                                boolean needsHighAvailability, boolean needsHorizontalScaling,
                                boolean hasVariableSchema, boolean needsFullTextSearch,
                                boolean hasGraphRelationships, boolean isTimeSeries,
                                long expectedWritesPerSecond, long expectedReadsPerSecond,
                                String consistencyRequirement) {
            this.needsACIDTransactions = needsACIDTransactions;
            this.needsComplexQueries = needsComplexQueries;
            this.needsHighAvailability = needsHighAvailability;
            this.needsHorizontalScaling = needsHorizontalScaling;
            this.hasVariableSchema = hasVariableSchema;
            this.needsFullTextSearch = needsFullTextSearch;
            this.hasGraphRelationships = hasGraphRelationships;
            this.isTimeSeries = isTimeSeries;
            this.expectedWritesPerSecond = expectedWritesPerSecond;
            this.expectedReadsPerSecond = expectedReadsPerSecond;
            this.consistencyRequirement = consistencyRequirement;
        }

        // Getters
        public boolean needsACIDTransactions() { return needsACIDTransactions; }
        public boolean needsComplexQueries() { return needsComplexQueries; }
        public boolean needsHighAvailability() { return needsHighAvailability; }
        public boolean needsHorizontalScaling() { return needsHorizontalScaling; }
        public boolean hasVariableSchema() { return hasVariableSchema; }
        public boolean needsFullTextSearch() { return needsFullTextSearch; }
        public boolean hasGraphRelationships() { return hasGraphRelationships; }
        public boolean isTimeSeries() { return isTimeSeries; }
        public long expectedWritesPerSecond() { return expectedWritesPerSecond; }
        public long expectedReadsPerSecond() { return expectedReadsPerSecond; }
        public String consistencyRequirement() { return consistencyRequirement; }
    }

    public static DatabaseRecommendation selectDatabase(SystemRequirements requirements) {
        // Decision tree logic
        if (requirements.isTimeSeries()) {
            return new DatabaseRecommendation(DatabaseType.TIME_SERIES,
                "InfluxDB, TimescaleDB",
                "Optimized for time-series data with efficient compression and aggregation");
        }

        if (requirements.hasGraphRelationships()) {
            return new DatabaseRecommendation(DatabaseType.GRAPH_DATABASE,
                "Neo4j, Amazon Neptune",
                "Native graph processing for complex relationship queries");
        }

        if (requirements.needsFullTextSearch()) {
            return new DatabaseRecommendation(DatabaseType.SEARCH_ENGINE,
                "Elasticsearch, Solr",
                "Optimized for full-text search and analytics");
        }

        if (requirements.needsACIDTransactions() && requirements.needsComplexQueries()) {
            if (requirements.needsHorizontalScaling() && requirements.expectedWritesPerSecond() > 10000) {
                return new DatabaseRecommendation(DatabaseType.RELATIONAL_SQL,
                    "PostgreSQL with sharding, CockroachDB",
                    "Distributed SQL for ACID + horizontal scaling");
            } else {
                return new DatabaseRecommendation(DatabaseType.RELATIONAL_SQL,
                    "PostgreSQL, MySQL",
                    "Traditional RDBMS for ACID transactions and complex queries");
            }
        }

        if (requirements.hasVariableSchema() && requirements.needsHorizontalScaling()) {
            if (requirements.expectedWritesPerSecond() > 50000) {
                return new DatabaseRecommendation(DatabaseType.KEY_VALUE_NOSQL,
                    "Cassandra, DynamoDB",
                    "Extreme write scalability with eventual consistency");
            } else {
                return new DatabaseRecommendation(DatabaseType.DOCUMENT_NOSQL,
                    "MongoDB, CouchDB",
                    "Flexible schema with good query capabilities");
            }
        }

        if (requirements.expectedReadsPerSecond() > requirements.expectedWritesPerSecond() * 10) {
            return new DatabaseRecommendation(DatabaseType.COLUMN_FAMILY,
                "Cassandra, HBase",
                "Optimized for read-heavy workloads with column-oriented storage");
        }

        // Default recommendation
        return new DatabaseRecommendation(DatabaseType.RELATIONAL_SQL,
            "PostgreSQL",
            "Versatile choice for most applications");
    }

    public static class DatabaseRecommendation {
        private final DatabaseType type;
        private final String specificDatabases;
        private final String reasoning;

        public DatabaseRecommendation(DatabaseType type, String specificDatabases, String reasoning) {
            this.type = type;
            this.specificDatabases = specificDatabases;
            this.reasoning = reasoning;
        }

        @Override
        public String toString() {
            return String.format("Recommended: %s (%s) - %s", type, specificDatabases, reasoning);
        }

        // Getters
        public DatabaseType getType() { return type; }
        public String getSpecificDatabases() { return specificDatabases; }
        public String getReasoning() { return reasoning; }
    }

    // Example usage for different systems
    public static void main(String[] args) {
        // E-commerce system
        SystemRequirements ecommerce = new SystemRequirements(
            true,   // needs ACID
            true,   // complex queries
            true,   // high availability
            false,  // moderate scaling
            false,  // fixed schema
            true,   // search needed
            false,  // no graph relationships
            false,  // not time-series
            1000,   // writes/sec
            10000,  // reads/sec
            "strong" // consistency
        );

        // Social media system
        SystemRequirements socialMedia = new SystemRequirements(
            false,  // eventual consistency OK
            false,  // simple queries
            true,   // high availability
            true,   // massive scaling
            true,   // variable schema
            true,   // search needed
            true,   // has relationships
            false,  // not time-series
            100000, // writes/sec
            500000, // reads/sec
            "eventual" // consistency
        );

        // IoT monitoring system
        SystemRequirements iot = new SystemRequirements(
            false,  // eventual consistency OK
            false,  // simple aggregations
            true,   // high availability
            true,   // horizontal scaling
            false,  // fixed schema
            false,  // no text search
            false,  // no relationships
            true,   // time-series data
            1000000, // writes/sec
            100000,  // reads/sec
            "eventual" // consistency
        );

        System.out.println("E-commerce: " + selectDatabase(ecommerce));
        System.out.println("Social Media: " + selectDatabase(socialMedia));
        System.out.println("IoT: " + selectDatabase(iot));
    }
}
```

---

## SQL vs NoSQL Trade-offs

### Polyglot Persistence Implementation

```java
// Multi-database architecture for different data types
public class PolyglotPersistenceService {

    // Different repositories for different data types
    private final UserRepository userRepository;           // SQL - PostgreSQL
    private final SessionRepository sessionRepository;     // Key-Value - Redis
    private final ProductRepository productRepository;     // Document - MongoDB
    private final SearchRepository searchRepository;       // Search - Elasticsearch
    private final AnalyticsRepository analyticsRepository; // Time-series - InfluxDB

    public PolyglotPersistenceService() {
        this.userRepository = new UserRepository();
        this.sessionRepository = new SessionRepository();
        this.productRepository = new ProductRepository();
        this.searchRepository = new SearchRepository();
        this.analyticsRepository = new AnalyticsRepository();
    }

    // User management - SQL for ACID transactions
    public class UserRepository {
        private final DataSource dataSource;

        public UserRepository() {
            this.dataSource = createPostgreSQLDataSource();
        }

        @Transactional
        public User createUserWithProfile(User user, UserProfile profile) {
            try (Connection conn = dataSource.getConnection()) {
                conn.setAutoCommit(false);

                // Insert user
                String userSql = "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?) RETURNING id";
                PreparedStatement userStmt = conn.prepareStatement(userSql);
                userStmt.setString(1, user.getEmail());
                userStmt.setString(2, user.getPasswordHash());
                userStmt.setTimestamp(3, Timestamp.valueOf(LocalDateTime.now()));

                ResultSet rs = userStmt.executeQuery();
                rs.next();
                long userId = rs.getLong(1);

                // Insert profile
                String profileSql = "INSERT INTO user_profiles (user_id, first_name, last_name, phone) VALUES (?, ?, ?, ?)";
                PreparedStatement profileStmt = conn.prepareStatement(profileSql);
                profileStmt.setLong(1, userId);
                profileStmt.setString(2, profile.getFirstName());
                profileStmt.setString(3, profile.getLastName());
                profileStmt.setString(4, profile.getPhone());
                profileStmt.executeUpdate();

                conn.commit();
                return new User(userId, user.getEmail(), user.getPasswordHash());

            } catch (SQLException e) {
                throw new RuntimeException("Failed to create user", e);
            }
        }

        public Optional<User> findByEmail(String email) {
            String sql = "SELECT id, email, password_hash FROM users WHERE email = ?";
            try (Connection conn = dataSource.getConnection();
                 PreparedStatement stmt = conn.prepareStatement(sql)) {

                stmt.setString(1, email);
                ResultSet rs = stmt.executeQuery();

                if (rs.next()) {
                    return Optional.of(new User(
                        rs.getLong("id"),
                        rs.getString("email"),
                        rs.getString("password_hash")
                    ));
                }
                return Optional.empty();

            } catch (SQLException e) {
                throw new RuntimeException("Failed to find user", e);
            }
        }

        private DataSource createPostgreSQLDataSource() {
            HikariConfig config = new HikariConfig();
            config.setJdbcUrl("jdbc:postgresql://localhost:5432/ecommerce");
            config.setUsername("app_user");
            config.setPassword("app_password");
            config.setMaximumPoolSize(20);
            config.setConnectionTimeout(30000);
            return new HikariDataSource(config);
        }
    }

    // Session management - Redis for fast access
    public class SessionRepository {
        private final Jedis jedis;
        private final ObjectMapper objectMapper;

        public SessionRepository() {
            this.jedis = new Jedis("localhost", 6379);
            this.objectMapper = new ObjectMapper();
        }

        public void createSession(String sessionId, UserSession session, int ttlSeconds) {
            try {
                String sessionJson = objectMapper.writeValueAsString(session);
                jedis.setex("session:" + sessionId, ttlSeconds, sessionJson);
            } catch (Exception e) {
                throw new RuntimeException("Failed to create session", e);
            }
        }

        public Optional<UserSession> getSession(String sessionId) {
            try {
                String sessionJson = jedis.get("session:" + sessionId);
                if (sessionJson != null) {
                    return Optional.of(objectMapper.readValue(sessionJson, UserSession.class));
                }
                return Optional.empty();
            } catch (Exception e) {
                throw new RuntimeException("Failed to get session", e);
            }
        }

        public void extendSession(String sessionId, int ttlSeconds) {
            jedis.expire("session:" + sessionId, ttlSeconds);
        }

        public void deleteSession(String sessionId) {
            jedis.del("session:" + sessionId);
        }
    }

    // Product catalog - MongoDB for flexible schema
    public class ProductRepository {
        private final MongoCollection<Document> collection;

        public ProductRepository() {
            MongoClient mongoClient = MongoClients.create("mongodb://localhost:27017");
            MongoDatabase database = mongoClient.getDatabase("ecommerce");
            this.collection = database.getCollection("products");
        }

        public void saveProduct(Product product) {
            Document doc = new Document()
                .append("sku", product.getSku())
                .append("name", product.getName())
                .append("description", product.getDescription())
                .append("price", product.getPrice())
                .append("category", product.getCategory())
                .append("attributes", product.getAttributes()) // Flexible schema
                .append("inventory", new Document()
                    .append("quantity", product.getInventory().getQuantity())
                    .append("warehouse", product.getInventory().getWarehouse()))
                .append("createdAt", new Date())
                .append("updatedAt", new Date());

            collection.insertOne(doc);
        }

        public List<Product> findByCategory(String category, int limit) {
            List<Product> products = new ArrayList<>();

            collection.find(Filters.eq("category", category))
                     .limit(limit)
                     .forEach(doc -> products.add(documentToProduct(doc)));

            return products;
        }

        public List<Product> findWithComplexCriteria(ProductSearchCriteria criteria) {
            List<Bson> filters = new ArrayList<>();

            if (criteria.getCategory() != null) {
                filters.add(Filters.eq("category", criteria.getCategory()));
            }

            if (criteria.getMinPrice() != null || criteria.getMaxPrice() != null) {
                Bson priceFilter = Filters.and(
                    criteria.getMinPrice() != null ? Filters.gte("price", criteria.getMinPrice()) : new Document(),
                    criteria.getMaxPrice() != null ? Filters.lte("price", criteria.getMaxPrice()) : new Document()
                );
                filters.add(priceFilter);
            }

            if (criteria.getAttributes() != null) {
                for (Map.Entry<String, Object> attr : criteria.getAttributes().entrySet()) {
                    filters.add(Filters.eq("attributes." + attr.getKey(), attr.getValue()));
                }
            }

            Bson combinedFilter = filters.isEmpty() ? new Document() : Filters.and(filters);

            List<Product> results = new ArrayList<>();
            collection.find(combinedFilter)
                     .limit(criteria.getLimit())
                     .forEach(doc -> results.add(documentToProduct(doc)));

            return results;
        }

        private Product documentToProduct(Document doc) {
            // Convert MongoDB document to Product object
            return new Product(
                doc.getString("sku"),
                doc.getString("name"),
                doc.getString("description"),
                doc.getDouble("price"),
                doc.getString("category"),
                (Map<String, Object>) doc.get("attributes"),
                new ProductInventory(
                    ((Document) doc.get("inventory")).getInteger("quantity"),
                    ((Document) doc.get("inventory")).getString("warehouse")
                )
            );
        }
    }

    // Search functionality - Elasticsearch
    public class SearchRepository {
        private final ElasticsearchClient client;

        public SearchRepository() {
            this.client = createElasticsearchClient();
        }

        public void indexProduct(Product product) {
            try {
                Map<String, Object> document = Map.of(
                    "sku", product.getSku(),
                    "name", product.getName(),
                    "description", product.getDescription(),
                    "category", product.getCategory(),
                    "price", product.getPrice(),
                    "attributes", product.getAttributes()
                );

                IndexRequest request = IndexRequest.of(i -> i
                    .index("products")
                    .id(product.getSku())
                    .document(document)
                );

                client.index(request);
            } catch (Exception e) {
                throw new RuntimeException("Failed to index product", e);
            }
        }

        public List<Product> searchProducts(String query, int limit) {
            try {
                SearchRequest request = SearchRequest.of(s -> s
                    .index("products")
                    .query(q -> q
                        .multiMatch(m -> m
                            .fields("name^2", "description", "category")
                            .query(query)
                        )
                    )
                    .size(limit)
                );

                SearchResponse<Map> response = client.search(request, Map.class);

                return response.hits().hits().stream()
                    .map(hit -> mapToProduct(hit.source()))
                    .collect(Collectors.toList());

            } catch (Exception e) {
                throw new RuntimeException("Search failed", e);
            }
        }

        private Product mapToProduct(Map<String, Object> source) {
            // Convert Elasticsearch source to Product object
            return new Product(
                (String) source.get("sku"),
                (String) source.get("name"),
                (String) source.get("description"),
                ((Number) source.get("price")).doubleValue(),
                (String) source.get("category"),
                (Map<String, Object>) source.get("attributes"),
                null // Inventory not stored in search index
            );
        }

        private ElasticsearchClient createElasticsearchClient() {
            // Configure Elasticsearch client
            RestClient restClient = RestClient.builder(
                new HttpHost("localhost", 9200)
            ).build();

            ElasticsearchTransport transport = new RestClientTransport(
                restClient, new JacksonJsonpMapper()
            );

            return new ElasticsearchClient(transport);
        }
    }

    // Analytics - InfluxDB for time-series data
    public class AnalyticsRepository {
        private final InfluxDBClient client;

        public AnalyticsRepository() {
            this.client = InfluxDBClientFactory.create("http://localhost:8086",
                "analytics-token".toCharArray());
        }

        public void recordUserAction(String userId, String action, Map<String, Object> properties) {
            Point point = Point.measurement("user_actions")
                .addTag("user_id", userId)
                .addTag("action", action)
                .time(Instant.now(), WritePrecision.NS);

            for (Map.Entry<String, Object> prop : properties.entrySet()) {
                if (prop.getValue() instanceof String) {
                    point.addTag(prop.getKey(), (String) prop.getValue());
                } else if (prop.getValue() instanceof Number) {
                    point.addField(prop.getKey(), ((Number) prop.getValue()).doubleValue());
                }
            }

            WriteApiBlocking writeApi = client.getWriteApiBlocking();
            writeApi.writePoint("analytics", "main", point);
        }

        public List<UserActionSummary> getUserActionSummary(String userId, Instant start, Instant end) {
            String flux = String.format(
                "from(bucket: \"analytics\")\n" +
                "  |> range(start: %s, stop: %s)\n" +
                "  |> filter(fn: (r) => r._measurement == \"user_actions\")\n" +
                "  |> filter(fn: (r) => r.user_id == \"%s\")\n" +
                "  |> group(columns: [\"action\"])\n" +
                "  |> count()",
                start, end, userId
            );

            QueryApi queryApi = client.getQueryApi();
            List<FluxTable> tables = queryApi.query(flux);

            return tables.stream()
                .flatMap(table -> table.getRecords().stream())
                .map(record -> new UserActionSummary(
                    record.getValueByKey("action").toString(),
                    ((Number) record.getValue()).longValue()
                ))
                .collect(Collectors.toList());
        }
    }
}
```

---

## Database Partitioning Strategies

### Horizontal Partitioning (Sharding) Implementation

```java
public class DatabaseShardingManager {

    private final List<DataSource> shards;
    private final ShardingStrategy strategy;

    public enum ShardingStrategy {
        HASH_BASED,
        RANGE_BASED,
        DIRECTORY_BASED
    }

    public DatabaseShardingManager(List<DataSource> shards, ShardingStrategy strategy) {
        this.shards = shards;
        this.strategy = strategy;
    }

    // Hash-based sharding
    public class HashBasedSharding {

        public DataSource getShardForKey(String shardKey) {
            int hash = shardKey.hashCode();
            // Ensure positive hash and distribute across shards
            int shardIndex = Math.abs(hash) % shards.size();
            return shards.get(shardIndex);
        }

        public void insertUser(User user) {
            DataSource shard = getShardForKey(user.getEmail());

            String sql = "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)";
            try (Connection conn = shard.getConnection();
                 PreparedStatement stmt = conn.prepareStatement(sql)) {

                stmt.setString(1, user.getEmail());
                stmt.setString(2, user.getPasswordHash());
                stmt.setTimestamp(3, Timestamp.valueOf(LocalDateTime.now()));
                stmt.executeUpdate();

            } catch (SQLException e) {
                throw new RuntimeException("Failed to insert user", e);
            }
        }

        public Optional<User> findUserByEmail(String email) {
            DataSource shard = getShardForKey(email);

            String sql = "SELECT id, email, password_hash FROM users WHERE email = ?";
            try (Connection conn = shard.getConnection();
                 PreparedStatement stmt = conn.prepareStatement(sql)) {

                stmt.setString(1, email);
                ResultSet rs = stmt.executeQuery();

                if (rs.next()) {
                    return Optional.of(new User(
                        rs.getLong("id"),
                        rs.getString("email"),
                        rs.getString("password_hash")
                    ));
                }
                return Optional.empty();

            } catch (SQLException e) {
                throw new RuntimeException("Failed to find user", e);
            }
        }

        // Cross-shard query (expensive operation)
        public List<User> findAllActiveUsers() {
            List<User> allUsers = new ArrayList<>();

            // Query all shards in parallel
            List<CompletableFuture<List<User>>> futures = shards.stream()
                .map(shard -> CompletableFuture.supplyAsync(() -> queryActiveUsersFromShard(shard)))
                .collect(Collectors.toList());

            // Collect results from all shards
            futures.forEach(future -> {
                try {
                    allUsers.addAll(future.get());
                } catch (Exception e) {
                    throw new RuntimeException("Failed to query shard", e);
                }
            });

            return allUsers;
        }

        private List<User> queryActiveUsersFromShard(DataSource shard) {
            List<User> users = new ArrayList<>();
            String sql = "SELECT id, email, password_hash FROM users WHERE last_login > ?";

            try (Connection conn = shard.getConnection();
                 PreparedStatement stmt = conn.prepareStatement(sql)) {

                stmt.setTimestamp(1, Timestamp.valueOf(LocalDateTime.now().minusDays(30)));
                ResultSet rs = stmt.executeQuery();

                while (rs.next()) {
                    users.add(new User(
                        rs.getLong("id"),
                        rs.getString("email"),
                        rs.getString("password_hash")
                    ));
                }

            } catch (SQLException e) {
                throw new RuntimeException("Failed to query shard", e);
            }

            return users;
        }
    }

    // Range-based sharding (for time-series data)
    public class RangeBasedSharding {

        public DataSource getShardForDate(LocalDate date) {
            // Shard by year
            int year = date.getYear();
            int shardIndex = (year - 2020) % shards.size(); // Starting from 2020
            return shards.get(Math.max(0, shardIndex));
        }

        public void insertOrder(Order order) {
            DataSource shard = getShardForDate(order.getOrderDate());

            String sql = "INSERT INTO orders (id, customer_id, total_amount, order_date) VALUES (?, ?, ?, ?)";
            try (Connection conn = shard.getConnection();
                 PreparedStatement stmt = conn.prepareStatement(sql)) {

                stmt.setLong(1, order.getId());
                stmt.setLong(2, order.getCustomerId());
                stmt.setBigDecimal(3, order.getTotalAmount());
                stmt.setDate(4, Date.valueOf(order.getOrderDate()));
                stmt.executeUpdate();

            } catch (SQLException e) {
                throw new RuntimeException("Failed to insert order", e);
            }
        }

        public List<Order> findOrdersByDateRange(LocalDate startDate, LocalDate endDate) {
            Set<DataSource> relevantShards = new HashSet<>();

            // Determine which shards contain data for the date range
            LocalDate current = startDate;
            while (!current.isAfter(endDate)) {
                relevantShards.add(getShardForDate(current));
                current = current.plusMonths(1); // Check monthly
            }

            List<Order> allOrders = new ArrayList<>();

            // Query relevant shards in parallel
            List<CompletableFuture<List<Order>>> futures = relevantShards.stream()
                .map(shard -> CompletableFuture.supplyAsync(() ->
                    queryOrdersFromShard(shard, startDate, endDate)))
                .collect(Collectors.toList());

            futures.forEach(future -> {
                try {
                    allOrders.addAll(future.get());
                } catch (Exception e) {
                    throw new RuntimeException("Failed to query shard", e);
                }
            });

            // Sort results by date
            allOrders.sort(Comparator.comparing(Order::getOrderDate));
            return allOrders;
        }

        private List<Order> queryOrdersFromShard(DataSource shard, LocalDate startDate, LocalDate endDate) {
            List<Order> orders = new ArrayList<>();
            String sql = "SELECT id, customer_id, total_amount, order_date FROM orders " +
                        "WHERE order_date BETWEEN ? AND ?";

            try (Connection conn = shard.getConnection();
                 PreparedStatement stmt = conn.prepareStatement(sql)) {

                stmt.setDate(1, Date.valueOf(startDate));
                stmt.setDate(2, Date.valueOf(endDate));
                ResultSet rs = stmt.executeQuery();

                while (rs.next()) {
                    orders.add(new Order(
                        rs.getLong("id"),
                        rs.getLong("customer_id"),
                        rs.getBigDecimal("total_amount"),
                        rs.getDate("order_date").toLocalDate()
                    ));
                }

            } catch (SQLException e) {
                throw new RuntimeException("Failed to query shard", e);
            }

            return orders;
        }
    }

    // Directory-based sharding
    public class DirectoryBasedSharding {
        private final Map<String, Integer> shardDirectory = new ConcurrentHashMap<>();

        public void assignShardForUser(String userId, int shardIndex) {
            if (shardIndex < 0 || shardIndex >= shards.size()) {
                throw new IllegalArgumentException("Invalid shard index");
            }
            shardDirectory.put(userId, shardIndex);
        }

        public DataSource getShardForUser(String userId) {
            Integer shardIndex = shardDirectory.get(userId);
            if (shardIndex == null) {
                // Auto-assign using load balancing
                shardIndex = assignShardUsingLoadBalancing();
                shardDirectory.put(userId, shardIndex);
            }
            return shards.get(shardIndex);
        }

        private int assignShardUsingLoadBalancing() {
            // Simple round-robin assignment
            // In production, consider actual load metrics
            return ThreadLocalRandom.current().nextInt(shards.size());
        }

        public void migrateUserToShard(String userId, int newShardIndex) {
            DataSource oldShard = getShardForUser(userId);
            DataSource newShard = shards.get(newShardIndex);

            // Begin migration transaction
            try (Connection oldConn = oldShard.getConnection();
                 Connection newConn = newShard.getConnection()) {

                oldConn.setAutoCommit(false);
                newConn.setAutoCommit(false);

                // Copy user data to new shard
                String selectSql = "SELECT * FROM users WHERE id = ?";
                String insertSql = "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)";

                try (PreparedStatement selectStmt = oldConn.prepareStatement(selectSql);
                     PreparedStatement insertStmt = newConn.prepareStatement(insertSql)) {

                    selectStmt.setString(1, userId);
                    ResultSet rs = selectStmt.executeQuery();

                    if (rs.next()) {
                        insertStmt.setLong(1, rs.getLong("id"));
                        insertStmt.setString(2, rs.getString("email"));
                        insertStmt.setString(3, rs.getString("password_hash"));
                        insertStmt.setTimestamp(4, rs.getTimestamp("created_at"));
                        insertStmt.executeUpdate();
                    }
                }

                // Delete from old shard
                String deleteSql = "DELETE FROM users WHERE id = ?";
                try (PreparedStatement deleteStmt = oldConn.prepareStatement(deleteSql)) {
                    deleteStmt.setString(1, userId);
                    deleteStmt.executeUpdate();
                }

                // Update directory
                shardDirectory.put(userId, newShardIndex);

                // Commit both transactions
                newConn.commit();
                oldConn.commit();

            } catch (SQLException e) {
                throw new RuntimeException("Migration failed", e);
            }
        }
    }
}
```

---

## Consistency Patterns

### Eventual Consistency Implementation

```java
public class EventualConsistencyManager {

    private final List<DatabaseNode> nodes;
    private final ExecutorService replicationExecutor;
    private final EventBus eventBus;

    public EventualConsistencyManager(List<DatabaseNode> nodes) {
        this.nodes = nodes;
        this.replicationExecutor = Executors.newFixedThreadPool(nodes.size() * 2);
        this.eventBus = new EventBus();
    }

    // Write with eventual consistency
    public CompletableFuture<WriteResult> writeAsync(String key, Object value) {
        // Write to primary node first
        DatabaseNode primary = nodes.get(0);

        return CompletableFuture
            .supplyAsync(() -> primary.write(key, value))
            .thenCompose(primaryResult -> {
                if (primaryResult.isSuccess()) {
                    // Asynchronously replicate to other nodes
                    List<CompletableFuture<WriteResult>> replicationFutures =
                        replicateToSecondaryNodes(key, value);

                    // Don't wait for replication to complete
                    CompletableFuture.allOf(replicationFutures.toArray(new CompletableFuture[0]))
                        .thenRun(() -> eventBus.post(new ReplicationCompleteEvent(key, value)));

                    return CompletableFuture.completedFuture(primaryResult);
                } else {
                    return CompletableFuture.completedFuture(primaryResult);
                }
            });
    }

    private List<CompletableFuture<WriteResult>> replicateToSecondaryNodes(String key, Object value) {
        return nodes.stream()
            .skip(1) // Skip primary node
            .map(node -> CompletableFuture
                .supplyAsync(() -> node.write(key, value), replicationExecutor)
                .exceptionally(throwable -> {
                    // Log replication failure but don't fail the write
                    System.err.println("Replication failed for node " + node.getId() + ": " + throwable.getMessage());
                    return WriteResult.failure("Replication failed");
                }))
            .collect(Collectors.toList());
    }

    // Read with read preference
    public CompletableFuture<ReadResult> readAsync(String key, ReadPreference preference) {
        switch (preference) {
            case PRIMARY:
                return CompletableFuture.supplyAsync(() -> nodes.get(0).read(key));

            case SECONDARY:
                DatabaseNode secondary = selectSecondaryNode();
                return CompletableFuture.supplyAsync(() -> secondary.read(key));

            case NEAREST:
                DatabaseNode nearest = selectNearestNode();
                return CompletableFuture.supplyAsync(() -> nearest.read(key));

            case MAJORITY:
                return readFromMajority(key);

            default:
                return CompletableFuture.supplyAsync(() -> nodes.get(0).read(key));
        }
    }

    private CompletableFuture<ReadResult> readFromMajority(String key) {
        int majorityCount = (nodes.size() / 2) + 1;

        List<CompletableFuture<ReadResult>> readFutures = nodes.stream()
            .map(node -> CompletableFuture.supplyAsync(() -> node.read(key)))
            .collect(Collectors.toList());

        return CompletableFuture.allOf(readFutures.toArray(new CompletableFuture[0]))
            .thenApply(__ -> {
                Map<Object, Integer> valueCounts = new HashMap<>();
                int successfulReads = 0;

                for (CompletableFuture<ReadResult> future : readFutures) {
                    try {
                        ReadResult result = future.get();
                        if (result.isSuccess()) {
                            successfulReads++;
                            Object value = result.getValue();
                            valueCounts.merge(value, 1, Integer::sum);
                        }
                    } catch (Exception e) {
                        // Handle read failures
                    }
                }

                if (successfulReads >= majorityCount) {
                    // Return the value with majority consensus
                    Object majorityValue = valueCounts.entrySet().stream()
                        .max(Map.Entry.comparingByValue())
                        .map(Map.Entry::getKey)
                        .orElse(null);

                    return ReadResult.success(majorityValue);
                } else {
                    return ReadResult.failure("Failed to achieve majority read");
                }
            });
    }

    private DatabaseNode selectSecondaryNode() {
        return nodes.stream()
            .skip(1)
            .filter(DatabaseNode::isHealthy)
            .findFirst()
            .orElse(nodes.get(0)); // Fallback to primary
    }

    private DatabaseNode selectNearestNode() {
        return nodes.stream()
            .min(Comparator.comparingLong(DatabaseNode::getLatency))
            .orElse(nodes.get(0));
    }

    public enum ReadPreference {
        PRIMARY,
        SECONDARY,
        NEAREST,
        MAJORITY
    }

    // Vector clocks for conflict resolution
    public static class VectorClock {
        private final Map<String, Long> clocks = new ConcurrentHashMap<>();

        public VectorClock increment(String nodeId) {
            VectorClock newClock = new VectorClock();
            newClock.clocks.putAll(this.clocks);
            newClock.clocks.merge(nodeId, 1L, Long::sum);
            return newClock;
        }

        public ConflictResolution compare(VectorClock other) {
            boolean thisGreater = false;
            boolean otherGreater = false;

            Set<String> allNodes = new HashSet<>(this.clocks.keySet());
            allNodes.addAll(other.clocks.keySet());

            for (String node : allNodes) {
                long thisValue = this.clocks.getOrDefault(node, 0L);
                long otherValue = other.clocks.getOrDefault(node, 0L);

                if (thisValue > otherValue) {
                    thisGreater = true;
                } else if (otherValue > thisValue) {
                    otherGreater = true;
                }
            }

            if (thisGreater && !otherGreater) {
                return ConflictResolution.THIS_WINS;
            } else if (otherGreater && !thisGreater) {
                return ConflictResolution.OTHER_WINS;
            } else if (!thisGreater && !otherGreater) {
                return ConflictResolution.EQUAL;
            } else {
                return ConflictResolution.CONFLICT;
            }
        }

        public enum ConflictResolution {
            THIS_WINS, OTHER_WINS, EQUAL, CONFLICT
        }
    }

    // Supporting classes
    public static class WriteResult {
        private final boolean success;
        private final String errorMessage;

        private WriteResult(boolean success, String errorMessage) {
            this.success = success;
            this.errorMessage = errorMessage;
        }

        public static WriteResult success() {
            return new WriteResult(true, null);
        }

        public static WriteResult failure(String errorMessage) {
            return new WriteResult(false, errorMessage);
        }

        public boolean isSuccess() { return success; }
        public String getErrorMessage() { return errorMessage; }
    }

    public static class ReadResult {
        private final boolean success;
        private final Object value;
        private final String errorMessage;

        private ReadResult(boolean success, Object value, String errorMessage) {
            this.success = success;
            this.value = value;
            this.errorMessage = errorMessage;
        }

        public static ReadResult success(Object value) {
            return new ReadResult(true, value, null);
        }

        public static ReadResult failure(String errorMessage) {
            return new ReadResult(false, null, errorMessage);
        }

        public boolean isSuccess() { return success; }
        public Object getValue() { return value; }
        public String getErrorMessage() { return errorMessage; }
    }

    public static class ReplicationCompleteEvent {
        private final String key;
        private final Object value;

        public ReplicationCompleteEvent(String key, Object value) {
            this.key = key;
            this.value = value;
        }

        // Getters
        public String getKey() { return key; }
        public Object getValue() { return value; }
    }
}

// Database node interface
public interface DatabaseNode {
    String getId();
    WriteResult write(String key, Object value);
    ReadResult read(String key);
    boolean isHealthy();
    long getLatency();
}
```

**📊 Database Pattern Comparison:**

| Pattern                  | Consistency        | Availability | Partition Tolerance | Use Case          |
| ------------------------ | ------------------ | ------------ | ------------------- | ----------------- |
| **ACID Transactions**    | Strong             | Medium       | Low                 | Financial systems |
| **Eventual Consistency** | Eventual           | High         | High                | Social media      |
| **Read Replicas**        | Read lag           | High         | Medium              | Read-heavy apps   |
| **Multi-Master**         | Conflicts possible | Very High    | High                | Distributed teams |

---

## Summary & Best Practices

### 🎯 Key Takeaways

✅ **Match Database to Use Case**: Different data types need different databases  
✅ **Plan for Scale**: Choose partitioning strategy based on access patterns  
✅ **Understand Trade-offs**: ACID vs BASE, consistency vs availability  
✅ **Design for Failure**: Implement replication and failover strategies  
✅ **Monitor Performance**: Track query performance and resource usage

### 📈 Database Selection Checklist

- [ ] Analyzed data access patterns
- [ ] Evaluated consistency requirements
- [ ] Planned partitioning strategy
- [ ] Designed replication topology
- [ ] Implemented monitoring and alerting
- [ ] Tested failure scenarios
- [ ] Documented scaling plan

### ⚠️ Common Database Design Pitfalls

- **Wrong database choice**: Using SQL for everything
- **No partitioning strategy**: Single points of failure
- **Ignoring consistency models**: Unexpected data conflicts
- **Poor indexing**: Slow query performance
- **No backup strategy**: Data loss risks

**📈 Next Steps:**
Ready to optimize performance? Continue with [Caching Strategies](./03-caching-strategies.md) to learn about multi-level caching, cache invalidation, and performance optimization patterns.

---

_💡 Pro Tip: Start with a simple database choice and evolve. Use polyglot persistence for different data types, but don't over-engineer. The best database architecture is one that matches your access patterns and consistency requirements._
