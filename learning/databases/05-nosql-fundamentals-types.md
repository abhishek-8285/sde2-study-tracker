# NoSQL Fundamentals & Types 🌐

Master NoSQL database types, understand the CAP theorem, and learn when to choose each NoSQL solution for modern application architectures.

## Table of Contents

- [NoSQL Overview & CAP Theorem](#nosql-overview--cap-theorem)
- [Document Databases](#document-databases)
- [Key-Value Stores](#key-value-stores)
- [Column-Family Databases](#column-family-databases)
- [Graph Databases](#graph-databases)
- [Multi-Model Databases](#multi-model-databases)
- [NoSQL vs SQL Decision Framework](#nosql-vs-sql-decision-framework)

---

## NoSQL Overview & CAP Theorem

### Understanding CAP Theorem

The CAP theorem states that distributed systems can guarantee at most two of the following three properties:

```python
# CAP Theorem demonstration with examples

class CAPTheorem:
    """
    C - Consistency: All nodes see the same data simultaneously
    A - Availability: System remains operational
    P - Partition Tolerance: System continues despite network failures
    """

    def __init__(self):
        self.examples = {
            'CP': {
                'description': 'Consistency + Partition Tolerance',
                'databases': ['MongoDB', 'HBase', 'Redis'],
                'characteristics': [
                    'Strong consistency across nodes',
                    'Tolerates network partitions',
                    'May become unavailable during partitions',
                    'ACID compliance possible'
                ],
                'use_cases': [
                    'Financial systems',
                    'Inventory management',
                    'Configuration management',
                    'Critical business data'
                ]
            },
            'AP': {
                'description': 'Availability + Partition Tolerance',
                'databases': ['Cassandra', 'DynamoDB', 'Riak'],
                'characteristics': [
                    'Always available for reads/writes',
                    'Tolerates network partitions',
                    'Eventual consistency',
                    'High scalability'
                ],
                'use_cases': [
                    'Social media feeds',
                    'Content delivery',
                    'Shopping carts',
                    'Session storage'
                ]
            },
            'CA': {
                'description': 'Consistency + Availability',
                'databases': ['MySQL', 'PostgreSQL', 'SQL Server'],
                'characteristics': [
                    'Strong consistency',
                    'High availability in single data center',
                    'Cannot tolerate network partitions',
                    'Traditional RDBMS'
                ],
                'use_cases': [
                    'Traditional web applications',
                    'Data warehousing',
                    'Enterprise applications',
                    'Single data center deployments'
                ]
            }
        }

    def explain_trade_offs(self, system_type):
        """Explain the trade-offs for a given CAP system type"""
        if system_type in self.examples:
            return self.examples[system_type]
        return None

# Example: E-commerce platform CAP decisions
class EcommerceCAP:
    def __init__(self):
        self.components = {
            'user_sessions': {
                'cap_choice': 'AP',
                'database': 'Redis/DynamoDB',
                'reasoning': 'Users must be able to browse even during network issues'
            },
            'inventory': {
                'cap_choice': 'CP',
                'database': 'MongoDB/PostgreSQL',
                'reasoning': 'Consistent stock levels prevent overselling'
            },
            'product_catalog': {
                'cap_choice': 'AP',
                'database': 'Cassandra/DynamoDB',
                'reasoning': 'Product browsing should always be available'
            },
            'order_processing': {
                'cap_choice': 'CP',
                'database': 'PostgreSQL/MongoDB',
                'reasoning': 'Orders must be consistent and accurate'
            },
            'recommendations': {
                'cap_choice': 'AP',
                'database': 'Cassandra/Neo4j',
                'reasoning': 'Recommendations enhance experience but not critical'
            }
        }

# ACID vs BASE comparison
ACID_vs_BASE = {
    'ACID': {
        'A': 'Atomicity - All or nothing transactions',
        'C': 'Consistency - Data integrity constraints',
        'I': 'Isolation - Concurrent transactions don\'t interfere',
        'D': 'Durability - Committed data persists',
        'examples': ['PostgreSQL', 'MySQL', 'Oracle'],
        'best_for': 'Financial systems, critical business data'
    },
    'BASE': {
        'B': 'Basically Available - System available most of the time',
        'S': 'Soft state - Data may change over time',
        'E': 'Eventual consistency - System consistent over time',
        'examples': ['Cassandra', 'DynamoDB', 'MongoDB'],
        'best_for': 'High-scale web applications, social media'
    }
}
```

### NoSQL Categories Overview

```sql
-- Comparison table of NoSQL types
CREATE TABLE nosql_comparison (
    database_type VARCHAR(50),
    data_model VARCHAR(100),
    scalability VARCHAR(20),
    consistency VARCHAR(20),
    query_complexity VARCHAR(20),
    use_cases TEXT
);

INSERT INTO nosql_comparison VALUES
('Document', 'JSON-like documents', 'Horizontal', 'Tunable', 'Medium', 'Content management, catalogs, user profiles'),
('Key-Value', 'Key-value pairs', 'Horizontal', 'Eventual', 'Simple', 'Caching, session storage, real-time recommendations'),
('Column-Family', 'Column families', 'Horizontal', 'Tunable', 'Medium', 'Time-series, IoT, analytics, logging'),
('Graph', 'Nodes and edges', 'Vertical', 'Strong', 'Complex', 'Social networks, fraud detection, recommendations'),
('Multi-Model', 'Multiple models', 'Horizontal', 'Tunable', 'High', 'Complex applications, microservices');
```

**📊 NoSQL Type Selection Matrix:**

| Factor                 | Document | Key-Value | Column-Family | Graph   |
| ---------------------- | -------- | --------- | ------------- | ------- |
| **Query Complexity**   | Medium   | Simple    | Medium        | Complex |
| **Relationships**      | Limited  | None      | Limited       | Native  |
| **Scalability**        | High     | Very High | Very High     | Medium  |
| **Consistency**        | Tunable  | Eventual  | Tunable       | Strong  |
| **Schema Flexibility** | High     | Highest   | Medium        | Medium  |

---

## Document Databases

### MongoDB Examples

```javascript
// MongoDB document modeling and operations
// User profile with embedded documents
db.users.insertOne({
  _id: ObjectId("60d5ec49f8d2e12345678901"),
  email: "john.doe@example.com",
  profile: {
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: ISODate("1990-05-15"),
    address: {
      street: "123 Main St",
      city: "Boston",
      state: "MA",
      zipCode: "02101",
      country: "USA",
    },
    preferences: {
      notifications: true,
      newsletter: false,
      theme: "dark",
    },
  },
  accounts: [
    {
      type: "checking",
      number: "****1234",
      balance: 2500.0,
      currency: "USD",
    },
    {
      type: "savings",
      number: "****5678",
      balance: 15000.0,
      currency: "USD",
    },
  ],
  tags: ["premium", "long-term-customer"],
  createdAt: ISODate("2021-06-25T10:30:00Z"),
  updatedAt: ISODate("2024-01-15T14:22:00Z"),
});

// E-commerce product catalog with complex nested structure
db.products.insertOne({
  _id: ObjectId("60d5ec49f8d2e12345678902"),
  sku: "LAPTOP-001",
  name: "Gaming Laptop Pro 15",
  category: {
    primary: "Electronics",
    secondary: "Computers",
    tertiary: "Laptops",
  },
  description: "High-performance gaming laptop with RTX graphics",
  pricing: {
    base: 1299.99,
    currency: "USD",
    discounts: [
      {
        type: "student",
        percentage: 10,
        validUntil: ISODate("2024-12-31"),
      },
      {
        type: "bulk",
        threshold: 5,
        percentage: 15,
      },
    ],
  },
  specifications: {
    processor: "Intel Core i7-12700H",
    memory: "16GB DDR4",
    storage: [
      {
        type: "SSD",
        capacity: "512GB",
        interface: "NVMe",
      },
    ],
    graphics: "NVIDIA RTX 3070",
    display: {
      size: "15.6 inch",
      resolution: "1920x1080",
      refreshRate: "144Hz",
      type: "IPS",
    },
    dimensions: {
      width: 35.9,
      depth: 27.5,
      height: 2.3,
      weight: 2.4,
      unit: "cm",
    },
  },
  inventory: {
    quantity: 45,
    reserved: 3,
    available: 42,
    reorderLevel: 10,
    locations: [
      {
        warehouse: "US-EAST",
        quantity: 20,
      },
      {
        warehouse: "US-WEST",
        quantity: 25,
      },
    ],
  },
  reviews: {
    count: 127,
    average: 4.7,
    distribution: {
      5: 89,
      4: 28,
      3: 7,
      2: 2,
      1: 1,
    },
  },
  metadata: {
    featured: true,
    bestseller: true,
    tags: ["gaming", "high-performance", "portable"],
    seoKeywords: ["gaming laptop", "RTX 3070", "144Hz display"],
  },
  createdAt: ISODate("2023-03-15T09:00:00Z"),
  updatedAt: ISODate("2024-01-20T16:45:00Z"),
});

// Advanced MongoDB queries
// 1. Complex aggregation pipeline for sales analytics
db.orders.aggregate([
  // Stage 1: Match recent orders
  {
    $match: {
      orderDate: {
        $gte: ISODate("2024-01-01"),
        $lt: ISODate("2025-01-01"),
      },
      status: "completed",
    },
  },

  // Stage 2: Unwind order items for item-level analysis
  {
    $unwind: "$items",
  },

  // Stage 3: Lookup product details
  {
    $lookup: {
      from: "products",
      localField: "items.productId",
      foreignField: "_id",
      as: "productInfo",
    },
  },

  // Stage 4: Unwind product info
  {
    $unwind: "$productInfo",
  },

  // Stage 5: Group by product category and month
  {
    $group: {
      _id: {
        category: "$productInfo.category.primary",
        month: {
          $dateToString: {
            format: "%Y-%m",
            date: "$orderDate",
          },
        },
      },
      totalRevenue: {
        $sum: {
          $multiply: ["$items.quantity", "$items.price"],
        },
      },
      totalQuantity: {
        $sum: "$items.quantity",
      },
      averageOrderValue: {
        $avg: {
          $multiply: ["$items.quantity", "$items.price"],
        },
      },
      uniqueCustomers: {
        $addToSet: "$customerId",
      },
    },
  },

  // Stage 6: Add calculated fields
  {
    $addFields: {
      uniqueCustomerCount: {
        $size: "$uniqueCustomers",
      },
    },
  },

  // Stage 7: Sort by revenue descending
  {
    $sort: {
      totalRevenue: -1,
    },
  },

  // Stage 8: Project final structure
  {
    $project: {
      _id: 0,
      category: "$_id.category",
      month: "$_id.month",
      totalRevenue: 1,
      totalQuantity: 1,
      averageOrderValue: 1,
      uniqueCustomerCount: 1,
    },
  },
]);

// 2. Text search with scoring
db.products.aggregate([
  {
    $match: {
      $text: {
        $search: "gaming laptop high performance",
      },
    },
  },
  {
    $addFields: {
      score: {
        $meta: "textScore",
      },
    },
  },
  {
    $match: {
      score: {
        $gt: 1.0,
      },
    },
  },
  {
    $sort: {
      score: -1,
      "reviews.average": -1,
    },
  },
  {
    $project: {
      name: 1,
      "pricing.base": 1,
      "reviews.average": 1,
      "reviews.count": 1,
      score: 1,
    },
  },
]);

// 3. Geospatial queries for location-based features
db.stores.createIndex({
  location: "2dsphere",
});

db.stores
  .find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [-71.0589, 42.3601], // Boston coordinates
        },
        $maxDistance: 10000, // 10km radius
      },
    },
  })
  .limit(5);

// 4. Real-time inventory tracking with change streams
const changeStream = db.products.watch([
  {
    $match: {
      "fullDocument.inventory.available": {
        $lt: "$fullDocument.inventory.reorderLevel",
      },
    },
  },
]);

changeStream.on("change", (change) => {
  console.log("Low inventory alert:", change.fullDocument);
  // Trigger reorder process
});
```

### Document Database Patterns

```javascript
// Pattern 1: Embedded vs Referenced Documents
// Embedded (denormalized) - for tightly coupled data
db.blogPosts.insertOne({
  _id: ObjectId("60d5ec49f8d2e12345678903"),
  title: "Getting Started with NoSQL",
  content: "...",
  author: {
    id: ObjectId("60d5ec49f8d2e12345678901"),
    name: "John Doe",
    email: "john@example.com",
    bio: "Tech writer and developer",
  },
  comments: [
    {
      id: ObjectId("60d5ec49f8d2e12345678904"),
      author: {
        name: "Jane Smith",
        email: "jane@example.com",
      },
      content: "Great article!",
      createdAt: ISODate("2024-01-15T10:30:00Z"),
      likes: 5,
    },
  ],
  tags: ["nosql", "database", "tutorial"],
  publishedAt: ISODate("2024-01-14T09:00:00Z"),
});

// Referenced (normalized) - for loosely coupled data
db.users.insertOne({
  _id: ObjectId("60d5ec49f8d2e12345678901"),
  name: "John Doe",
  email: "john@example.com",
  bio: "Tech writer and developer",
});

db.posts.insertOne({
  _id: ObjectId("60d5ec49f8d2e12345678903"),
  title: "Getting Started with NoSQL",
  content: "...",
  authorId: ObjectId("60d5ec49f8d2e12345678901"), // Reference
  publishedAt: ISODate("2024-01-14T09:00:00Z"),
});

// Pattern 2: Polymorphic Schema
db.events.insertMany([
  {
    _id: ObjectId("60d5ec49f8d2e12345678905"),
    type: "user_registration",
    userId: ObjectId("60d5ec49f8d2e12345678901"),
    timestamp: ISODate("2024-01-15T10:00:00Z"),
    metadata: {
      source: "web",
      referrer: "google.com",
    },
  },
  {
    _id: ObjectId("60d5ec49f8d2e12345678906"),
    type: "purchase",
    userId: ObjectId("60d5ec49f8d2e12345678901"),
    timestamp: ISODate("2024-01-15T15:30:00Z"),
    metadata: {
      orderId: ObjectId("60d5ec49f8d2e12345678907"),
      amount: 299.99,
      currency: "USD",
      paymentMethod: "credit_card",
    },
  },
  {
    _id: ObjectId("60d5ec49f8d2e12345678908"),
    type: "page_view",
    userId: ObjectId("60d5ec49f8d2e12345678901"),
    timestamp: ISODate("2024-01-15T16:00:00Z"),
    metadata: {
      page: "/products/gaming-laptop",
      sessionId: "sess_abc123",
      duration: 45,
    },
  },
]);

// Pattern 3: Time-series with bucketing
db.userSessions.insertOne({
  _id: ObjectId("60d5ec49f8d2e12345678909"),
  userId: ObjectId("60d5ec49f8d2e12345678901"),
  date: ISODate("2024-01-15T00:00:00Z"),
  sessions: [
    {
      sessionId: "sess_abc123",
      startTime: ISODate("2024-01-15T09:00:00Z"),
      endTime: ISODate("2024-01-15T09:45:00Z"),
      pageViews: 12,
      actions: [
        {
          action: "view_product",
          productId: ObjectId("60d5ec49f8d2e12345678902"),
          timestamp: ISODate("2024-01-15T09:15:00Z"),
        },
        {
          action: "add_to_cart",
          productId: ObjectId("60d5ec49f8d2e12345678902"),
          timestamp: ISODate("2024-01-15T09:30:00Z"),
        },
      ],
    },
  ],
});
```

**📊 Document Database Best Practices:**

✅ **When to Use:**

- Complex, nested data structures
- Rapid development and schema evolution
- Content management systems
- User profiles and personalization
- Product catalogs with varying attributes

❌ **When to Avoid:**

- Heavy relational operations
- Complex transactions across documents
- Strong consistency requirements
- High-frequency updates to same fields

---

## Key-Value Stores

### Redis Examples

```python
# Redis advanced patterns and use cases
import redis
import json
import time
from datetime import datetime, timedelta

class RedisPatterns:
    def __init__(self):
        self.redis_client = redis.Redis(
            host='localhost',
            port=6379,
            decode_responses=True,
            health_check_interval=30
        )

    # Pattern 1: Session Management
    def session_management(self):
        """Advanced session handling with TTL and structured data"""
        session_id = "sess_user123_20240115"

        # Store session data
        session_data = {
            'user_id': 123,
            'email': 'user@example.com',
            'login_time': datetime.now().isoformat(),
            'permissions': ['read', 'write'],
            'preferences': {
                'theme': 'dark',
                'language': 'en'
            },
            'cart_items': [
                {'product_id': 1001, 'quantity': 2},
                {'product_id': 1002, 'quantity': 1}
            ]
        }

        # Store with 24-hour expiration
        self.redis_client.setex(
            f"session:{session_id}",
            timedelta(hours=24),
            json.dumps(session_data)
        )

        # Extend session on activity
        self.redis_client.expire(f"session:{session_id}", timedelta(hours=24))

        # Retrieve session
        session_json = self.redis_client.get(f"session:{session_id}")
        if session_json:
            return json.loads(session_json)
        return None

    # Pattern 2: Real-time Leaderboards
    def leaderboard_system(self):
        """Sorted sets for real-time leaderboards"""

        # Add players to leaderboard
        players_scores = {
            'player1': 2500,
            'player2': 1800,
            'player3': 3200,
            'player4': 2100,
            'player5': 2900
        }

        # Use sorted set for leaderboard
        for player, score in players_scores.items():
            self.redis_client.zadd('game:leaderboard', {player: score})

        # Get top 10 players
        top_players = self.redis_client.zrevrange(
            'game:leaderboard',
            0, 9,
            withscores=True
        )

        # Get player rank
        player_rank = self.redis_client.zrevrank('game:leaderboard', 'player1')

        # Get players around a specific player
        around_player = self.redis_client.zrevrange(
            'game:leaderboard',
            max(0, player_rank - 2),
            player_rank + 2,
            withscores=True
        )

        return {
            'top_10': top_players,
            'player1_rank': player_rank + 1,  # 1-indexed
            'around_player1': around_player
        }

    # Pattern 3: Rate Limiting
    def rate_limiting(self, user_id, limit=100, window=3600):
        """Sliding window rate limiting"""
        key = f"rate_limit:{user_id}"
        pipe = self.redis_client.pipeline()
        now = time.time()

        # Remove old entries outside the window
        pipe.zremrangebyscore(key, 0, now - window)

        # Count current requests
        pipe.zcard(key)

        # Add current request
        pipe.zadd(key, {str(now): now})

        # Set expiration
        pipe.expire(key, window)

        results = pipe.execute()
        current_requests = results[1]

        return current_requests < limit

    # Pattern 4: Distributed Locking
    def distributed_lock(self, resource_name, timeout=10):
        """Distributed lock implementation"""
        lock_key = f"lock:{resource_name}"
        identifier = f"{time.time()}:{os.getpid()}"

        # Acquire lock
        if self.redis_client.set(lock_key, identifier, nx=True, ex=timeout):
            return identifier
        return None

    def release_lock(self, resource_name, identifier):
        """Release distributed lock"""
        lock_key = f"lock:{resource_name}"

        # Lua script for atomic release
        lua_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """

        return self.redis_client.eval(lua_script, 1, lock_key, identifier)

    # Pattern 5: Pub/Sub for Real-time Features
    def real_time_notifications(self):
        """Publish/Subscribe pattern for real-time updates"""

        # Publisher
        def send_notification(user_id, message):
            channel = f"user:{user_id}:notifications"
            self.redis_client.publish(channel, json.dumps({
                'type': 'notification',
                'message': message,
                'timestamp': datetime.now().isoformat()
            }))

        # Subscriber
        def listen_for_notifications(user_id):
            pubsub = self.redis_client.pubsub()
            pubsub.subscribe(f"user:{user_id}:notifications")

            for message in pubsub.listen():
                if message['type'] == 'message':
                    data = json.loads(message['data'])
                    # Process notification
                    yield data

        return send_notification, listen_for_notifications

    # Pattern 6: Caching with Cache-Aside Pattern
    def cache_aside_pattern(self, key, fetch_function, ttl=3600):
        """Cache-aside pattern implementation"""

        # Try to get from cache first
        cached_value = self.redis_client.get(key)
        if cached_value:
            return json.loads(cached_value)

        # Cache miss - fetch from data source
        value = fetch_function()

        # Store in cache
        self.redis_client.setex(key, ttl, json.dumps(value))

        return value

    # Pattern 7: Shopping Cart Implementation
    def shopping_cart(self, user_id):
        """Redis-based shopping cart"""
        cart_key = f"cart:{user_id}"

        def add_item(product_id, quantity, price):
            item_data = {
                'quantity': quantity,
                'price': price,
                'added_at': datetime.now().isoformat()
            }
            self.redis_client.hset(cart_key, product_id, json.dumps(item_data))
            self.redis_client.expire(cart_key, timedelta(days=30))

        def remove_item(product_id):
            self.redis_client.hdel(cart_key, product_id)

        def get_cart():
            cart_items = self.redis_client.hgetall(cart_key)
            return {
                product_id: json.loads(item_data)
                for product_id, item_data in cart_items.items()
            }

        def get_cart_total():
            cart_items = get_cart()
            total = sum(
                float(item['quantity']) * float(item['price'])
                for item in cart_items.values()
            )
            return round(total, 2)

        return {
            'add_item': add_item,
            'remove_item': remove_item,
            'get_cart': get_cart,
            'get_total': get_cart_total
        }

# Usage examples
redis_patterns = RedisPatterns()

# Session management
session_data = redis_patterns.session_management()

# Leaderboard
leaderboard_data = redis_patterns.leaderboard_system()

# Rate limiting
if redis_patterns.rate_limiting('user123'):
    print("Request allowed")
else:
    print("Rate limit exceeded")

# Shopping cart
cart = redis_patterns.shopping_cart('user123')
cart['add_item']('product_001', 2, 29.99)
cart['add_item']('product_002', 1, 49.99)
total = cart['get_total']()
```

### DynamoDB Examples

```python
# AWS DynamoDB patterns and best practices
import boto3
from boto3.dynamodb.conditions import Key, Attr
from decimal import Decimal
import json

class DynamoDBPatterns:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

    def create_tables(self):
        """Create DynamoDB tables with proper design"""

        # Single table design for e-commerce
        table = self.dynamodb.create_table(
            TableName='EcommerceApp',
            KeySchema=[
                {
                    'AttributeName': 'PK',
                    'KeyType': 'HASH'  # Partition key
                },
                {
                    'AttributeName': 'SK',
                    'KeyType': 'RANGE'  # Sort key
                }
            ],
            AttributeDefinitions=[
                {
                    'AttributeName': 'PK',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'SK',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'GSI1PK',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'GSI1SK',
                    'AttributeType': 'S'
                }
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'GSI1',
                    'KeySchema': [
                        {
                            'AttributeName': 'GSI1PK',
                            'KeyType': 'HASH'
                        },
                        {
                            'AttributeName': 'GSI1SK',
                            'KeyType': 'RANGE'
                        }
                    ],
                    'Projection': {
                        'ProjectionType': 'ALL'
                    },
                    'BillingMode': 'PAY_PER_REQUEST'
                }
            ],
            BillingMode='PAY_PER_REQUEST'
        )

        # Wait for table to be created
        table.wait_until_exists()
        return table

    def single_table_design_patterns(self):
        """Demonstrate single table design patterns"""
        table = self.dynamodb.Table('EcommerceApp')

        # Pattern 1: User data
        user_item = {
            'PK': 'USER#12345',
            'SK': 'PROFILE',
            'EntityType': 'User',
            'Email': 'john.doe@example.com',
            'FirstName': 'John',
            'LastName': 'Doe',
            'CreatedAt': '2024-01-15T10:00:00Z',
            'GSI1PK': 'EMAIL#john.doe@example.com',
            'GSI1SK': 'USER#12345'
        }

        # Pattern 2: Order data
        order_item = {
            'PK': 'USER#12345',
            'SK': 'ORDER#2024-01-15#001',
            'EntityType': 'Order',
            'OrderId': 'ORD-001',
            'Total': Decimal('299.99'),
            'Status': 'completed',
            'OrderDate': '2024-01-15T15:30:00Z',
            'GSI1PK': 'ORDER#2024-01-15#001',
            'GSI1SK': '2024-01-15T15:30:00Z'
        }

        # Pattern 3: Product data
        product_item = {
            'PK': 'PRODUCT#LAPTOP-001',
            'SK': 'DETAILS',
            'EntityType': 'Product',
            'ProductName': 'Gaming Laptop Pro 15',
            'Price': Decimal('1299.99'),
            'Category': 'Electronics',
            'Stock': 45,
            'GSI1PK': 'CATEGORY#Electronics',
            'GSI1SK': 'PRODUCT#LAPTOP-001'
        }

        # Batch write items
        with table.batch_writer() as batch:
            batch.put_item(Item=user_item)
            batch.put_item(Item=order_item)
            batch.put_item(Item=product_item)

    def query_patterns(self):
        """Demonstrate efficient DynamoDB query patterns"""
        table = self.dynamodb.Table('EcommerceApp')

        # Query 1: Get user profile
        response = table.query(
            KeyConditionExpression=Key('PK').eq('USER#12345') &
                                 Key('SK').eq('PROFILE')
        )
        user_profile = response['Items'][0] if response['Items'] else None

        # Query 2: Get all orders for a user
        response = table.query(
            KeyConditionExpression=Key('PK').eq('USER#12345') &
                                 Key('SK').begins_with('ORDER#')
        )
        user_orders = response['Items']

        # Query 3: Get products by category using GSI
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1PK').eq('CATEGORY#Electronics')
        )
        electronics_products = response['Items']

        # Query 4: Time-based queries
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1PK').eq('ORDER#2024-01-15') &
                                 Key('GSI1SK').between('2024-01-15T00:00:00Z',
                                                      '2024-01-15T23:59:59Z')
        )
        daily_orders = response['Items']

        return {
            'user_profile': user_profile,
            'user_orders': user_orders,
            'electronics_products': electronics_products,
            'daily_orders': daily_orders
        }

    def advanced_patterns(self):
        """Advanced DynamoDB patterns"""
        table = self.dynamodb.Table('EcommerceApp')

        # Pattern 1: Conditional writes for optimistic locking
        def update_product_stock(product_id, quantity_change):
            try:
                response = table.update_item(
                    Key={
                        'PK': f'PRODUCT#{product_id}',
                        'SK': 'DETAILS'
                    },
                    UpdateExpression='ADD Stock :qty',
                    ConditionExpression=Attr('Stock').gte(-quantity_change),
                    ExpressionAttributeValues={
                        ':qty': quantity_change
                    },
                    ReturnValues='UPDATED_NEW'
                )
                return response['Attributes']['Stock']
            except Exception as e:
                print(f"Stock update failed: {e}")
                return None

        # Pattern 2: Atomic counters
        def increment_page_views(product_id):
            response = table.update_item(
                Key={
                    'PK': f'PRODUCT#{product_id}',
                    'SK': 'DETAILS'
                },
                UpdateExpression='ADD PageViews :incr',
                ExpressionAttributeValues={
                    ':incr': 1
                },
                ReturnValues='UPDATED_NEW'
            )
            return response['Attributes']['PageViews']

        # Pattern 3: Time-to-Live (TTL) for session management
        def create_session(user_id, session_data, ttl_hours=24):
            import time
            ttl_timestamp = int(time.time()) + (ttl_hours * 3600)

            table.put_item(
                Item={
                    'PK': f'SESSION#{user_id}',
                    'SK': f'SESSION#{session_data["session_id"]}',
                    'EntityType': 'Session',
                    'UserID': user_id,
                    'SessionData': session_data,
                    'TTL': ttl_timestamp  # DynamoDB will auto-delete
                }
            )

        return {
            'update_stock': update_product_stock,
            'increment_views': increment_page_views,
            'create_session': create_session
        }

# Time-series data pattern
class TimeSeriesPattern:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')

    def create_time_series_table(self):
        """Create table optimized for time-series data"""
        table = self.dynamodb.create_table(
            TableName='MetricsTimeSeries',
            KeySchema=[
                {
                    'AttributeName': 'MetricName',
                    'KeyType': 'HASH'
                },
                {
                    'AttributeName': 'Timestamp',
                    'KeyType': 'RANGE'
                }
            ],
            AttributeDefinitions=[
                {
                    'AttributeName': 'MetricName',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'Timestamp',
                    'AttributeType': 'S'
                }
            ],
            BillingMode='PAY_PER_REQUEST',
            StreamSpecification={
                'StreamEnabled': True,
                'StreamViewType': 'NEW_AND_OLD_IMAGES'
            }
        )

        table.wait_until_exists()
        return table

    def store_metrics(self, metric_name, value, timestamp, dimensions=None):
        """Store time-series metrics"""
        table = self.dynamodb.Table('MetricsTimeSeries')

        item = {
            'MetricName': metric_name,
            'Timestamp': timestamp,
            'Value': Decimal(str(value))
        }

        if dimensions:
            item['Dimensions'] = dimensions

        table.put_item(Item=item)

    def query_metrics(self, metric_name, start_time, end_time):
        """Query time-series data"""
        table = self.dynamodb.Table('MetricsTimeSeries')

        response = table.query(
            KeyConditionExpression=Key('MetricName').eq(metric_name) &
                                 Key('Timestamp').between(start_time, end_time)
        )

        return response['Items']
```

**📊 Key-Value Store Decision Matrix:**

| Use Case                | Redis           | DynamoDB     | Memcached         |
| ----------------------- | --------------- | ------------ | ----------------- |
| **Caching**             | ✅ Best         | ⚠️ Expensive | ✅ Simple         |
| **Session Storage**     | ✅ Perfect      | ✅ Scalable  | ⚠️ No persistence |
| **Real-time Analytics** | ✅ Excellent    | ⚠️ Limited   | ❌ No             |
| **Pub/Sub**             | ✅ Native       | ❌ No        | ❌ No             |
| **Persistence**         | ✅ Configurable | ✅ Durable   | ❌ In-memory only |
| **Complex Queries**     | ⚠️ Limited      | ⚠️ Limited   | ❌ No             |

---

## Summary & Key Takeaways

### 🎯 NoSQL Selection Guide

✅ **Document Databases (MongoDB)**: Complex, nested data with evolving schemas  
✅ **Key-Value Stores (Redis/DynamoDB)**: High-performance caching and simple operations  
✅ **Column-Family (Cassandra)**: Time-series data and write-heavy workloads  
✅ **Graph Databases (Neo4j)**: Relationship-heavy data and complex queries

### 📈 CAP Theorem in Practice

- **CP Systems**: Choose when consistency is critical (financial, inventory)
- **AP Systems**: Choose when availability is critical (social media, content)
- **CA Systems**: Traditional RDBMS for single data center deployments

### ⚠️ Common NoSQL Pitfalls

- **Wrong database choice**: Not matching database type to use case
- **Ignoring CAP trade-offs**: Not understanding consistency implications
- **Poor data modeling**: Not designing for query patterns
- **Over-engineering**: Using NoSQL when SQL would suffice
- **Inadequate monitoring**: Not tracking performance and consistency

**📈 Next Steps:**
Ready to dive deep into MongoDB? Continue with [MongoDB Deep Dive](./06-mongodb-deep-dive.md) to master document modeling, aggregation pipelines, and MongoDB-specific optimization techniques.

---

_💡 Pro Tip: NoSQL isn't a replacement for SQL databases—it's a complement. Choose the right tool for each specific use case, and don't be afraid to use multiple database types in the same application (polyglot persistence)._
