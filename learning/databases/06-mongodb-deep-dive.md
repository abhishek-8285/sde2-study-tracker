# MongoDB Deep Dive 🍃

Master MongoDB's advanced features, from sophisticated document modeling to high-performance aggregation pipelines and production-ready deployments.

## Table of Contents

- [Advanced Document Modeling](#advanced-document-modeling)
- [Aggregation Framework Mastery](#aggregation-framework-mastery)
- [MongoDB Indexing Strategies](#mongodb-indexing-strategies)
- [Performance Optimization](#performance-optimization)
- [Replica Sets & High Availability](#replica-sets--high-availability)
- [Sharding & Scale-Out Architecture](#sharding--scale-out-architecture)

---

## Advanced Document Modeling

### Schema Design Patterns

```javascript
// Pattern 1: Polymorphic Schema for Content Management
db.content.insertMany([
  // Article document
  {
    _id: ObjectId("60d5ec49f8d2e12345678901"),
    type: "article",
    title: "MongoDB Best Practices",
    author: {
      id: ObjectId("60d5ec49f8d2e12345678902"),
      name: "John Doe",
      email: "john@example.com",
    },
    content: "...",
    publishedAt: ISODate("2024-01-15T10:00:00Z"),
    tags: ["mongodb", "database", "nosql"],
    metadata: {
      wordCount: 1500,
      readingTime: 7,
      seoKeywords: ["mongodb tutorial", "nosql best practices"],
    },
    comments: {
      count: 12,
      latest: [
        {
          author: "Jane Smith",
          text: "Great article!",
          createdAt: ISODate("2024-01-15T15:30:00Z"),
        },
      ],
    },
  },

  // Video document
  {
    _id: ObjectId("60d5ec49f8d2e12345678903"),
    type: "video",
    title: "MongoDB Aggregation Pipeline Tutorial",
    author: {
      id: ObjectId("60d5ec49f8d2e12345678902"),
      name: "John Doe",
      email: "john@example.com",
    },
    videoUrl: "https://cdn.example.com/videos/mongodb-tutorial.mp4",
    duration: 1800, // seconds
    thumbnail: "https://cdn.example.com/thumbnails/mongodb-tutorial.jpg",
    publishedAt: ISODate("2024-01-10T14:00:00Z"),
    tags: ["mongodb", "aggregation", "tutorial"],
    metadata: {
      resolution: "1080p",
      format: "mp4",
      fileSize: 524288000, // bytes
    },
    chapters: [
      {
        title: "Introduction",
        startTime: 0,
        endTime: 120,
      },
      {
        title: "Basic Aggregation",
        startTime: 120,
        endTime: 600,
      },
      {
        title: "Advanced Operators",
        startTime: 600,
        endTime: 1800,
      },
    ],
    views: {
      count: 1250,
      uniqueViewers: 890,
    },
  },
]);

// Pattern 2: Subset Pattern for Large Documents
// Store frequently accessed data separately from complete document
db.users.insertOne({
  _id: ObjectId("60d5ec49f8d2e12345678904"),
  email: "user@example.com",
  profile: {
    firstName: "Alice",
    lastName: "Johnson",
    avatar: "https://cdn.example.com/avatars/alice.jpg",
    bio: "Software developer passionate about databases",
  },
  settings: {
    notifications: true,
    theme: "dark",
    language: "en",
  },
  // Subset of recent activity for quick access
  recentActivity: [
    {
      type: "login",
      timestamp: ISODate("2024-01-15T09:00:00Z"),
      ip: "192.168.1.100",
    },
    {
      type: "purchase",
      timestamp: ISODate("2024-01-14T15:30:00Z"),
      amount: 99.99,
    },
  ],
  stats: {
    loginCount: 157,
    lastLogin: ISODate("2024-01-15T09:00:00Z"),
    accountCreated: ISODate("2023-06-01T10:00:00Z"),
  },
});

// Complete activity log stored separately
db.userActivityLog.insertMany([
  {
    _id: ObjectId("60d5ec49f8d2e12345678905"),
    userId: ObjectId("60d5ec49f8d2e12345678904"),
    type: "login",
    timestamp: ISODate("2024-01-15T09:00:00Z"),
    details: {
      ip: "192.168.1.100",
      userAgent: "Mozilla/5.0...",
      location: {
        city: "Boston",
        country: "USA",
      },
    },
  },
  // ... thousands more activity records
]);

// Pattern 3: Computed Pattern for Expensive Operations
db.orderSummaries.insertOne({
  _id: ObjectId("60d5ec49f8d2e12345678906"),
  customerId: ObjectId("60d5ec49f8d2e12345678904"),
  month: "2024-01",

  // Pre-computed aggregates
  summary: {
    orderCount: 8,
    totalSpent: 850.75,
    averageOrderValue: 106.34,
    favoriteCategory: "Electronics",
    uniqueProducts: 15,
  },

  // Top items for quick recommendations
  topPurchases: [
    {
      productId: ObjectId("60d5ec49f8d2e12345678907"),
      name: "Wireless Headphones",
      quantity: 2,
      totalSpent: 299.98,
    },
    {
      productId: ObjectId("60d5ec49f8d2e12345678908"),
      name: "Bluetooth Speaker",
      quantity: 1,
      totalSpent: 129.99,
    },
  ],

  lastUpdated: ISODate("2024-02-01T00:00:00Z"),
});

// Pattern 4: Tree Structure with Materialized Paths
db.categories.insertMany([
  {
    _id: ObjectId("60d5ec49f8d2e12345678909"),
    name: "Electronics",
    path: "Electronics",
    level: 0,
    parentId: null,
  },
  {
    _id: ObjectId("60d5ec49f8d2e12345678910"),
    name: "Computers",
    path: "Electronics,Computers",
    level: 1,
    parentId: ObjectId("60d5ec49f8d2e12345678909"),
  },
  {
    _id: ObjectId("60d5ec49f8d2e12345678911"),
    name: "Laptops",
    path: "Electronics,Computers,Laptops",
    level: 2,
    parentId: ObjectId("60d5ec49f8d2e12345678910"),
  },
  {
    _id: ObjectId("60d5ec49f8d2e12345678912"),
    name: "Gaming Laptops",
    path: "Electronics,Computers,Laptops,Gaming Laptops",
    level: 3,
    parentId: ObjectId("60d5ec49f8d2e12345678911"),
  },
]);

// Query all descendants of "Computers"
db.categories.find({
  path: /^Electronics,Computers/,
});

// Pattern 5: Time-Series with Bucketing
db.metrics.insertOne({
  _id: ObjectId("60d5ec49f8d2e12345678913"),
  sensorId: "temp_sensor_001",
  date: ISODate("2024-01-15T00:00:00Z"),
  hour: 14, // 2 PM bucket

  // Array of measurements for the hour
  measurements: [
    {
      minute: 0,
      temperature: 22.5,
      humidity: 45.2,
      timestamp: ISODate("2024-01-15T14:00:00Z"),
    },
    {
      minute: 1,
      temperature: 22.7,
      humidity: 45.1,
      timestamp: ISODate("2024-01-15T14:01:00Z"),
    },
    // ... up to 60 measurements per hour
  ],

  // Pre-computed hourly aggregates
  aggregates: {
    avgTemperature: 22.6,
    minTemperature: 21.8,
    maxTemperature: 23.4,
    avgHumidity: 45.0,
    measurementCount: 60,
  },
});
```

### Schema Validation

```javascript
// Advanced schema validation rules
db.createCollection("products", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "price", "category", "inventory"],
      properties: {
        name: {
          bsonType: "string",
          minLength: 1,
          maxLength: 200,
          description: "Product name is required and must be 1-200 characters",
        },
        price: {
          bsonType: "number",
          minimum: 0,
          description: "Price must be a positive number",
        },
        category: {
          bsonType: "object",
          required: ["primary", "secondary"],
          properties: {
            primary: {
              bsonType: "string",
              enum: ["Electronics", "Clothing", "Books", "Home", "Sports"],
            },
            secondary: {
              bsonType: "string",
              minLength: 1,
            },
          },
        },
        inventory: {
          bsonType: "object",
          required: ["quantity", "warehouse"],
          properties: {
            quantity: {
              bsonType: "int",
              minimum: 0,
            },
            warehouse: {
              bsonType: "string",
              enum: ["US-EAST", "US-WEST", "EU-CENTRAL", "ASIA-PACIFIC"],
            },
            reorderLevel: {
              bsonType: "int",
              minimum: 0,
            },
          },
        },
        tags: {
          bsonType: "array",
          items: {
            bsonType: "string",
          },
          uniqueItems: true,
        },
        reviews: {
          bsonType: "object",
          properties: {
            count: {
              bsonType: "int",
              minimum: 0,
            },
            average: {
              bsonType: "number",
              minimum: 1,
              maximum: 5,
            },
          },
        },
      },
    },
  },
  validationLevel: "strict",
  validationAction: "error",
});

// Test validation
db.products.insertOne({
  name: "Gaming Laptop",
  price: 1299.99,
  category: {
    primary: "Electronics",
    secondary: "Computers",
  },
  inventory: {
    quantity: 25,
    warehouse: "US-EAST",
    reorderLevel: 5,
  },
  tags: ["gaming", "laptop", "high-performance"],
  reviews: {
    count: 47,
    average: 4.6,
  },
});

// Update validation rules
db.runCommand({
  collMod: "products",
  validator: {
    $jsonSchema: {
      // Updated schema with new requirements
      bsonType: "object",
      required: ["name", "price", "category", "inventory", "sku"],
      properties: {
        sku: {
          bsonType: "string",
          pattern: "^[A-Z]{2,4}-[0-9]{3,6}$",
          description: "SKU must match pattern: XX-123 or XXXX-123456",
        },
        // ... other properties remain the same
      },
    },
  },
});
```

**📊 Document Modeling Decision Matrix:**

| Pattern        | Use When                        | Benefits             | Trade-offs              |
| -------------- | ------------------------------- | -------------------- | ----------------------- |
| **Embedded**   | 1:1 or 1:few relationships      | Single query access  | Document size limits    |
| **Referenced** | 1:many or many:many             | Normalized data      | Multiple queries needed |
| **Subset**     | Large documents, partial access | Improved performance | Data duplication        |
| **Computed**   | Expensive aggregations          | Fast read access     | Eventual consistency    |
| **Bucketing**  | Time-series data                | Efficient storage    | Complex queries         |

---

## Aggregation Framework Mastery

### Complex Aggregation Pipelines

```javascript
// Advanced e-commerce analytics pipeline
db.orders.aggregate([
  // Stage 1: Match orders from last 12 months
  {
    $match: {
      orderDate: {
        $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
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
      pipeline: [
        {
          $project: {
            name: 1,
            category: 1,
            basePrice: 1,
            brand: 1,
          },
        },
      ],
    },
  },

  // Stage 4: Unwind product info
  {
    $unwind: "$productInfo",
  },

  // Stage 5: Add calculated fields
  {
    $addFields: {
      lineRevenue: {
        $multiply: ["$items.quantity", "$items.price"],
      },
      discountAmount: {
        $multiply: [
          "$items.quantity",
          {
            $subtract: ["$productInfo.basePrice", "$items.price"],
          },
        ],
      },
      month: {
        $dateToString: {
          format: "%Y-%m",
          date: "$orderDate",
        },
      },
      quarter: {
        $concat: [
          {
            $toString: {
              $year: "$orderDate",
            },
          },
          "-Q",
          {
            $toString: {
              $ceil: {
                $divide: [
                  {
                    $month: "$orderDate",
                  },
                  3,
                ],
              },
            },
          },
        ],
      },
    },
  },

  // Stage 6: Group by multiple dimensions
  {
    $group: {
      _id: {
        month: "$month",
        category: "$productInfo.category.primary",
        brand: "$productInfo.brand",
      },
      totalRevenue: {
        $sum: "$lineRevenue",
      },
      totalDiscount: {
        $sum: "$discountAmount",
      },
      totalQuantity: {
        $sum: "$items.quantity",
      },
      uniqueProducts: {
        $addToSet: "$items.productId",
      },
      uniqueCustomers: {
        $addToSet: "$customerId",
      },
      orders: {
        $addToSet: "$_id",
      },
      avgOrderValue: {
        $avg: "$totalAmount",
      },
    },
  },

  // Stage 7: Add calculated metrics
  {
    $addFields: {
      uniqueProductCount: {
        $size: "$uniqueProducts",
      },
      uniqueCustomerCount: {
        $size: "$uniqueCustomers",
      },
      orderCount: {
        $size: "$orders",
      },
      averageItemsPerOrder: {
        $divide: [
          "$totalQuantity",
          {
            $size: "$orders",
          },
        ],
      },
      discountPercentage: {
        $multiply: [
          {
            $divide: [
              "$totalDiscount",
              {
                $add: ["$totalRevenue", "$totalDiscount"],
              },
            ],
          },
          100,
        ],
      },
    },
  },

  // Stage 8: Lookup category hierarchy
  {
    $lookup: {
      from: "categories",
      localField: "_id.category",
      foreignField: "name",
      as: "categoryInfo",
    },
  },

  // Stage 9: Add growth calculations
  {
    $setWindowFields: {
      partitionBy: {
        category: "$_id.category",
        brand: "$_id.brand",
      },
      sortBy: {
        month: 1,
      },
      output: {
        previousMonthRevenue: {
          $shift: {
            output: "$totalRevenue",
            by: -1,
          },
        },
        revenueGrowth: {
          $shift: {
            output: {
              $multiply: [
                {
                  $divide: [
                    {
                      $subtract: ["$totalRevenue", "$previousMonthRevenue"],
                    },
                    "$previousMonthRevenue",
                  ],
                },
                100,
              ],
            },
            by: 1,
          },
        },
        movingAvgRevenue: {
          $avg: "$totalRevenue",
          window: {
            documents: [-2, 0], // 3-month moving average
          },
        },
      },
    },
  },

  // Stage 10: Final projection and sorting
  {
    $project: {
      _id: 0,
      month: "$_id.month",
      category: "$_id.category",
      brand: "$_id.brand",
      metrics: {
        revenue: "$totalRevenue",
        discountAmount: "$totalDiscount",
        discountPercentage: {
          $round: ["$discountPercentage", 2],
        },
        quantity: "$totalQuantity",
        uniqueProducts: "$uniqueProductCount",
        uniqueCustomers: "$uniqueCustomerCount",
        orders: "$orderCount",
        avgOrderValue: {
          $round: ["$avgOrderValue", 2],
        },
        avgItemsPerOrder: {
          $round: ["$averageItemsPerOrder", 2],
        },
      },
      trends: {
        previousMonthRevenue: "$previousMonthRevenue",
        revenueGrowth: {
          $round: ["$revenueGrowth", 2],
        },
        movingAvgRevenue: {
          $round: ["$movingAvgRevenue", 2],
        },
      },
    },
  },

  {
    $sort: {
      month: 1,
      "metrics.revenue": -1,
    },
  },
]);

// Customer Lifetime Value (CLV) calculation
db.orders.aggregate([
  {
    $match: {
      status: "completed",
    },
  },
  {
    $group: {
      _id: "$customerId",
      firstOrderDate: {
        $min: "$orderDate",
      },
      lastOrderDate: {
        $max: "$orderDate",
      },
      totalOrders: {
        $sum: 1,
      },
      totalRevenue: {
        $sum: "$totalAmount",
      },
      averageOrderValue: {
        $avg: "$totalAmount",
      },
      orderDates: {
        $push: "$orderDate",
      },
    },
  },
  {
    $addFields: {
      customerLifespanDays: {
        $divide: [
          {
            $subtract: ["$lastOrderDate", "$firstOrderDate"],
          },
          1000 * 60 * 60 * 24, // Convert to days
        ],
      },
      // Calculate average days between orders
      avgDaysBetweenOrders: {
        $cond: {
          if: {
            $gt: ["$totalOrders", 1],
          },
          then: {
            $divide: [
              {
                $divide: [
                  {
                    $subtract: ["$lastOrderDate", "$firstOrderDate"],
                  },
                  1000 * 60 * 60 * 24,
                ],
              },
              {
                $subtract: ["$totalOrders", 1],
              },
            ],
          },
          else: null,
        },
      },
    },
  },
  {
    $addFields: {
      // Predicted orders per year
      ordersPerYear: {
        $cond: {
          if: {
            $and: [
              {
                $ne: ["$avgDaysBetweenOrders", null],
              },
              {
                $gt: ["$avgDaysBetweenOrders", 0],
              },
            ],
          },
          then: {
            $divide: [365, "$avgDaysBetweenOrders"],
          },
          else: 0,
        },
      },
      // Customer segment based on recency, frequency, monetary
      customerSegment: {
        $switch: {
          branches: [
            {
              case: {
                $and: [
                  {
                    $gte: ["$totalRevenue", 1000],
                  },
                  {
                    $gte: ["$totalOrders", 5],
                  },
                  {
                    $lte: [
                      {
                        $divide: [
                          {
                            $subtract: [new Date(), "$lastOrderDate"],
                          },
                          1000 * 60 * 60 * 24,
                        ],
                      },
                      30,
                    ],
                  },
                ],
              },
              then: "Champion",
            },
            {
              case: {
                $and: [
                  {
                    $gte: ["$totalRevenue", 500],
                  },
                  {
                    $gte: ["$totalOrders", 3],
                  },
                ],
              },
              then: "Loyal",
            },
            {
              case: {
                $lte: [
                  {
                    $divide: [
                      {
                        $subtract: [new Date(), "$lastOrderDate"],
                      },
                      1000 * 60 * 60 * 24,
                    ],
                  },
                  30,
                ],
              },
              then: "Potential Loyalist",
            },
          ],
          default: "At Risk",
        },
      },
    },
  },
  {
    $addFields: {
      // Predicted CLV calculation
      predictedCLV: {
        $multiply: [
          "$averageOrderValue",
          "$ordersPerYear",
          2, // Assumed customer lifespan of 2 years
        ],
      },
    },
  },
  {
    $lookup: {
      from: "customers",
      localField: "_id",
      foreignField: "_id",
      as: "customerInfo",
    },
  },
  {
    $unwind: "$customerInfo",
  },
  {
    $project: {
      customerId: "$_id",
      customerName: {
        $concat: ["$customerInfo.firstName", " ", "$customerInfo.lastName"],
      },
      email: "$customerInfo.email",
      metrics: {
        totalOrders: 1,
        totalRevenue: {
          $round: ["$totalRevenue", 2],
        },
        averageOrderValue: {
          $round: ["$averageOrderValue", 2],
        },
        customerLifespanDays: {
          $round: ["$customerLifespanDays", 0],
        },
        avgDaysBetweenOrders: {
          $round: ["$avgDaysBetweenOrders", 1],
        },
        ordersPerYear: {
          $round: ["$ordersPerYear", 2],
        },
        predictedCLV: {
          $round: ["$predictedCLV", 2],
        },
      },
      segment: "$customerSegment",
      dates: {
        firstOrder: "$firstOrderDate",
        lastOrder: "$lastOrderDate",
      },
    },
  },
  {
    $sort: {
      "metrics.predictedCLV": -1,
    },
  },
]);
```

### Real-time Analytics with Change Streams

```javascript
// Real-time inventory monitoring
const inventoryChangeStream = db.products.watch(
  [
    {
      $match: {
        operationType: "update",
        "updateDescription.updatedFields.inventory.quantity": {
          $exists: true,
        },
      },
    },
  ],
  {
    fullDocument: "updateLookup",
  }
);

inventoryChangeStream.on("change", (change) => {
  const product = change.fullDocument;
  const quantity = product.inventory.quantity;
  const reorderLevel = product.inventory.reorderLevel || 10;

  if (quantity <= reorderLevel) {
    // Send low inventory alert
    db.alerts.insertOne({
      type: "low_inventory",
      productId: product._id,
      productName: product.name,
      currentQuantity: quantity,
      reorderLevel: reorderLevel,
      createdAt: new Date(),
      status: "active",
    });

    console.log(`LOW INVENTORY ALERT: ${product.name} - Only ${quantity} left!`);
  }

  if (quantity === 0) {
    // Send out of stock alert
    db.alerts.insertOne({
      type: "out_of_stock",
      productId: product._id,
      productName: product.name,
      createdAt: new Date(),
      status: "critical",
    });

    console.log(`OUT OF STOCK: ${product.name}`);
  }
});

// Real-time user activity tracking
const userActivityStream = db.userSessions.watch([
  {
    $match: {
      operationType: { $in: ["insert", "update"] },
    },
  },
]);

userActivityStream.on("change", (change) => {
  if (change.operationType === "insert") {
    // New session started
    const session = change.fullDocument;

    // Update user's last seen
    db.users.updateOne(
      { _id: session.userId },
      {
        $set: {
          lastSeen: new Date(),
          isOnline: true,
        },
        $inc: { sessionCount: 1 },
      }
    );

    // Real-time analytics
    db.realTimeStats.updateOne(
      { date: new Date().toISOString().split("T")[0] },
      {
        $inc: {
          activeUsers: 1,
          totalSessions: 1,
        },
      },
      { upsert: true }
    );
  }
});
```

**📊 Aggregation Performance Tips:**

✅ **Optimization Strategies:**

- Place `$match` stages as early as possible
- Use indexes for initial `$match` and `$sort` stages
- Limit document size early with `$project`
- Use `$limit` after `$sort` when possible
- Consider `allowDiskUse: true` for large datasets

❌ **Performance Killers:**

- Missing indexes on match/sort fields
- Large `$lookup` operations without indexes
- Deep nesting in `$group` operations
- Complex expressions in early pipeline stages

---

## MongoDB Indexing Strategies

### Comprehensive Index Types

```javascript
// 1. Compound Indexes for Complex Queries
// Create optimal compound index for e-commerce queries
db.products.createIndex({
  "category.primary": 1,
  "pricing.base": 1,
  "inventory.quantity": 1,
  "reviews.average": -1,
});

// Query that benefits from this index
db.products
  .find({
    "category.primary": "Electronics",
    "pricing.base": { $gte: 100, $lte: 500 },
    "inventory.quantity": { $gt: 0 },
  })
  .sort({ "reviews.average": -1 });

// 2. Partial Indexes for Subset Queries
// Index only active products
db.products.createIndex(
  {
    "category.primary": 1,
    "pricing.base": 1,
  },
  {
    partialFilterExpression: {
      status: "active",
      "inventory.quantity": { $gt: 0 },
    },
  }
);

// Index only recent orders
db.orders.createIndex(
  {
    customerId: 1,
    orderDate: -1,
  },
  {
    partialFilterExpression: {
      orderDate: {
        $gte: new Date("2024-01-01"),
      },
    },
  }
);

// 3. Text Indexes for Search
// Create comprehensive text index
db.products.createIndex(
  {
    name: "text",
    description: "text",
    "category.primary": "text",
    brand: "text",
  },
  {
    weights: {
      name: 10,
      brand: 5,
      "category.primary": 3,
      description: 1,
    },
    name: "product_search_index",
  }
);

// Advanced text search with scoring
db.products.find({ $text: { $search: "gaming laptop" } }, { score: { $meta: "textScore" } }).sort({ score: { $meta: "textScore" } });

// 4. Geospatial Indexes
// 2dsphere index for location-based queries
db.stores.createIndex({ location: "2dsphere" });

// Store location data
db.stores.insertOne({
  name: "Downtown Store",
  address: "123 Main St, Boston, MA",
  location: {
    type: "Point",
    coordinates: [-71.0589, 42.3601], // [longitude, latitude]
  },
  hours: {
    monday: "9:00-21:00",
    tuesday: "9:00-21:00",
  },
});

// Find stores within 5km radius
db.stores.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-71.0589, 42.3601],
      },
      $maxDistance: 5000, // 5km in meters
    },
  },
});

// 5. Wildcard Indexes for Dynamic Schemas
// Index all fields in a subdocument
db.userProfiles.createIndex({ "customFields.$**": 1 });

// Query any field in customFields
db.userProfiles.find({ "customFields.hobby": "photography" });
db.userProfiles.find({ "customFields.skillLevel": "expert" });

// 6. Hashed Indexes for Sharding
// Create hashed index for even distribution
db.users.createIndex({ email: "hashed" });

// 7. TTL Indexes for Automatic Cleanup
// Automatically delete sessions after 24 hours
db.userSessions.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 86400 } // 24 hours
);

// Automatically delete logs after 30 days
db.activityLogs.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 2592000 } // 30 days
);

// Index Management Queries
// List all indexes
db.products.getIndexes();

// Get index usage statistics
db.products.aggregate([{ $indexStats: {} }]);

// Check query execution plan
db.products
  .find({
    "category.primary": "Electronics",
    "pricing.base": { $gte: 100 },
  })
  .explain("executionStats");

// Drop unused index
db.products.dropIndex("old_index_name");

// Background index creation for production
db.products.createIndex({ complexField: 1 }, { background: true });
```

### Index Performance Analysis

```javascript
// Comprehensive index analysis script
function analyzeIndexPerformance(collectionName) {
  const collection = db.getCollection(collectionName);

  print(`\n=== Index Analysis for ${collectionName} ===\n`);

  // 1. List all indexes with sizes
  const indexes = collection.getIndexes();
  print("Current Indexes:");
  indexes.forEach((index) => {
    print(`- ${index.name}: ${JSON.stringify(index.key)}`);
    if (index.partialFilterExpression) {
      print(`  Partial Filter: ${JSON.stringify(index.partialFilterExpression)}`);
    }
  });

  // 2. Get index usage statistics
  print("\nIndex Usage Statistics:");
  const indexStats = collection.aggregate([{ $indexStats: {} }]).toArray();
  indexStats.forEach((stat) => {
    print(`- ${stat.name}:`);
    print(`  Operations: ${stat.accesses.ops}`);
    print(`  Since: ${stat.accesses.since}`);
  });

  // 3. Collection statistics
  const stats = db.runCommand({ collStats: collectionName });
  print(`\nCollection Statistics:`);
  print(`- Documents: ${stats.count}`);
  print(`- Average Document Size: ${Math.round(stats.avgObjSize)} bytes`);
  print(`- Total Index Size: ${Math.round(stats.totalIndexSize / 1024 / 1024)} MB`);
  print(`- Storage Size: ${Math.round(stats.storageSize / 1024 / 1024)} MB`);

  // 4. Suggest optimizations
  print(`\nOptimization Suggestions:`);

  const unusedIndexes = indexStats.filter((stat) => stat.accesses.ops === 0);
  if (unusedIndexes.length > 0) {
    print(`- Consider dropping unused indexes: ${unusedIndexes.map((i) => i.name).join(", ")}`);
  }

  if (stats.totalIndexSize > stats.dataSize) {
    print(`- Index size (${Math.round(stats.totalIndexSize / 1024 / 1024)}MB) exceeds data size - review index necessity`);
  }

  return {
    indexes: indexes,
    usage: indexStats,
    stats: stats,
  };
}

// Usage
analyzeIndexPerformance("products");
analyzeIndexPerformance("orders");

// Query optimization helper
function optimizeQuery(collection, queryPlan) {
  const explained = collection.find(queryPlan.query).explain("executionStats");

  print(`\n=== Query Optimization Analysis ===`);
  print(`Query: ${JSON.stringify(queryPlan.query)}`);
  print(`Documents Examined: ${explained.executionStats.totalDocsExamined}`);
  print(`Documents Returned: ${explained.executionStats.totalDocsReturned}`);
  print(`Execution Time: ${explained.executionStats.executionTimeMillis}ms`);

  const efficiency = explained.executionStats.totalDocsReturned / explained.executionStats.totalDocsExamined;
  print(`Efficiency: ${(efficiency * 100).toFixed(2)}%`);

  if (efficiency < 0.1) {
    print(`⚠️  Low efficiency - consider adding an index`);
  }

  if (explained.executionStats.totalDocsExamined > 1000) {
    print(`⚠️  High document examination count - optimize with indexes`);
  }

  return explained;
}

// Example usage
optimizeQuery(db.products, {
  query: {
    "category.primary": "Electronics",
    "pricing.base": { $gte: 100, $lte: 500 },
  },
});
```

**📊 Index Strategy Guidelines:**

| Query Pattern       | Recommended Index         | Example                               |
| ------------------- | ------------------------- | ------------------------------------- |
| **Equality + Sort** | Compound (equality first) | `{status: 1, createdAt: -1}`          |
| **Range + Sort**    | Compound (range + sort)   | `{price: 1, rating: -1}`              |
| **Text Search**     | Text index with weights   | `{name: "text", description: "text"}` |
| **Geospatial**      | 2dsphere for modern apps  | `{location: "2dsphere"}`              |
| **Array Elements**  | Multikey index            | `{tags: 1}`                           |

---

## Performance Optimization

### Query Optimization Techniques

```javascript
// Performance optimization patterns

// 1. Efficient Pagination with Range Queries
// ❌ BAD: Using skip() for pagination (slow for large offsets)
db.products.find().skip(10000).limit(20);

// ✅ GOOD: Range-based pagination
// First page
db.products.find().sort({ _id: 1 }).limit(20);

// Subsequent pages (using last _id from previous page)
db.products
  .find({
    _id: { $gt: ObjectId("60d5ec49f8d2e12345678901") },
  })
  .sort({ _id: 1 })
  .limit(20);

// For custom sort orders with pagination
// First page
const firstPage = db.products
  .find()
  .sort({
    createdAt: -1,
    _id: -1,
  })
  .limit(20);

// Next page (using last values from previous page)
db.products
  .find({
    $or: [
      { createdAt: { $lt: lastCreatedAt } },
      {
        createdAt: lastCreatedAt,
        _id: { $lt: lastId },
      },
    ],
  })
  .sort({ createdAt: -1, _id: -1 })
  .limit(20);

// 2. Aggregation Optimization
// ❌ BAD: Filtering after expensive operations
db.orders.aggregate([
  {
    $lookup: {
      from: "customers",
      localField: "customerId",
      foreignField: "_id",
      as: "customer",
    },
  },
  {
    $unwind: "$customer",
  },
  {
    $match: {
      "customer.segment": "premium",
      orderDate: { $gte: new Date("2024-01-01") },
    },
  },
]);

// ✅ GOOD: Filter early, minimize data flow
db.orders.aggregate([
  {
    $match: {
      orderDate: { $gte: new Date("2024-01-01") },
    },
  },
  {
    $lookup: {
      from: "customers",
      localField: "customerId",
      foreignField: "_id",
      as: "customer",
      pipeline: [
        {
          $match: { segment: "premium" },
        },
        {
          $project: {
            name: 1,
            segment: 1,
            email: 1,
          },
        },
      ],
    },
  },
  {
    $match: {
      customer: { $ne: [] },
    },
  },
]);

// 3. Bulk Operations for Better Performance
// ❌ BAD: Individual updates
for (let i = 0; i < 1000; i++) {
  db.products.updateOne({ _id: productIds[i] }, { $inc: { viewCount: 1 } });
}

// ✅ GOOD: Bulk operations
const bulkOps = productIds.map((id) => ({
  updateOne: {
    filter: { _id: id },
    update: { $inc: { viewCount: 1 } },
  },
}));

db.products.bulkWrite(bulkOps, { ordered: false });

// 4. Connection and Query Optimization
// Connection optimization
const client = new MongoClient(uri, {
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  // Enable retryable writes
  retryWrites: true,
  // Use read preference for scaling
  readPreference: "secondaryPreferred",
  // Connection compression
  compressors: ["zstd", "zlib"],
});

// 5. Memory-Efficient Queries
// ❌ BAD: Loading all data into memory
const allProducts = db.products.find().toArray();

// ✅ GOOD: Using cursors for large datasets
const cursor = db.products
  .find({
    category: "Electronics",
  })
  .batchSize(100);

cursor.forEach((product) => {
  // Process one document at a time
  processProduct(product);
});

// 6. Query Plan Caching
// Force query plan refresh when needed
db.products.getPlanCache().clear();

// Check cached plans
db.products.getPlanCache().listQueryShapes();
```

### MongoDB Performance Monitoring

```javascript
// Performance monitoring and alerting
class MongoDBMonitor {
  constructor(db) {
    this.db = db;
    this.metrics = {
      slowQueries: [],
      indexUsage: new Map(),
      connectionStats: {},
      replicationLag: 0,
    };
  }

  // Monitor slow queries
  enableSlowQueryLogging() {
    // Set slow query threshold to 100ms
    this.db.adminCommand({
      setParameter: 1,
      slowOpThresholdMs: 100,
    });

    // Monitor oplog for slow operations
    const oplogCursor = this.db.getSiblingDB("local").oplog.rs.find().tailable();

    oplogCursor.addOption(DBQuery.Option.awaitData);

    while (oplogCursor.hasNext()) {
      const op = oplogCursor.next();
      if (op.ts && op.wall && op.wall - op.ts > 100) {
        this.metrics.slowQueries.push({
          operation: op.op,
          namespace: op.ns,
          duration: op.wall - op.ts,
          timestamp: op.ts,
        });
      }
    }
  }

  // Monitor index effectiveness
  analyzeIndexUsage() {
    const collections = this.db.listCollectionNames();

    collections.forEach((collName) => {
      const coll = this.db.getCollection(collName);
      const indexStats = coll.aggregate([{ $indexStats: {} }]);

      indexStats.forEach((stat) => {
        this.metrics.indexUsage.set(`${collName}.${stat.name}`, {
          operations: stat.accesses.ops,
          since: stat.accesses.since,
          efficiency: stat.accesses.ops / ((new Date() - stat.accesses.since) / 86400000), // ops per day
        });
      });
    });
  }

  // Monitor connection pool
  getConnectionStats() {
    const serverStatus = this.db.adminCommand("serverStatus");

    this.metrics.connectionStats = {
      current: serverStatus.connections.current,
      available: serverStatus.connections.available,
      totalCreated: serverStatus.connections.totalCreated,
      active: serverStatus.connections.active,
      threaded: serverStatus.connections.threaded,
      exhaustIsMaster: serverStatus.connections.exhaustIsMaster,
    };

    return this.metrics.connectionStats;
  }

  // Monitor replication lag
  getReplicationLag() {
    const replSetStatus = this.db.adminCommand("replSetGetStatus");

    if (replSetStatus.ok === 1) {
      const primary = replSetStatus.members.find((m) => m.state === 1);
      const secondaries = replSetStatus.members.filter((m) => m.state === 2);

      if (primary && secondaries.length > 0) {
        const maxLag = Math.max(...secondaries.map((s) => (primary.optime.ts.getTime() - s.optime.ts.getTime()) / 1000));

        this.metrics.replicationLag = maxLag;
        return maxLag;
      }
    }

    return 0;
  }

  // Performance alerts
  checkAlerts() {
    const alerts = [];

    // Check slow queries
    if (this.metrics.slowQueries.length > 10) {
      alerts.push({
        type: "slow_queries",
        severity: "warning",
        message: `${this.metrics.slowQueries.length} slow queries detected`,
      });
    }

    // Check connection pool
    const connStats = this.getConnectionStats();
    if (connStats.current / (connStats.current + connStats.available) > 0.8) {
      alerts.push({
        type: "connection_pool",
        severity: "critical",
        message: "Connection pool utilization above 80%",
      });
    }

    // Check replication lag
    const lag = this.getReplicationLag();
    if (lag > 5) {
      alerts.push({
        type: "replication_lag",
        severity: "warning",
        message: `Replication lag is ${lag} seconds`,
      });
    }

    // Check unused indexes
    this.metrics.indexUsage.forEach((stats, indexName) => {
      if (stats.operations === 0 && stats.since > 86400000) {
        // No ops for 1 day
        alerts.push({
          type: "unused_index",
          severity: "info",
          message: `Index ${indexName} appears unused`,
        });
      }
    });

    return alerts;
  }

  // Generate performance report
  generateReport() {
    return {
      timestamp: new Date(),
      slowQueries: this.metrics.slowQueries.slice(-10), // Last 10
      connectionStats: this.metrics.connectionStats,
      replicationLag: this.metrics.replicationLag,
      indexEfficiency: Object.fromEntries(this.metrics.indexUsage),
      alerts: this.checkAlerts(),
    };
  }
}

// Usage
const monitor = new MongoDBMonitor(db);
const report = monitor.generateReport();
print(JSON.stringify(report, null, 2));
```

**📊 Performance Optimization Checklist:**

✅ **Query Optimization:**

- Use indexes for all query conditions
- Place `$match` stages early in aggregation pipelines
- Use projection to limit returned fields
- Implement efficient pagination patterns
- Use bulk operations for multiple writes

✅ **Index Optimization:**

- Create compound indexes for multi-field queries
- Use partial indexes for subset queries
- Monitor and remove unused indexes
- Consider index intersection vs compound indexes

✅ **Connection Optimization:**

- Configure appropriate connection pool sizes
- Use read preferences for read scaling
- Enable connection compression
- Monitor connection pool utilization

---

## Summary & Key Takeaways

### 🎯 MongoDB Mastery Points

✅ **Document Modeling**: Choose embedded vs referenced based on query patterns  
✅ **Aggregation Framework**: Master pipelines for complex analytics and transformations  
✅ **Indexing Strategy**: Create indexes that match your query patterns exactly  
✅ **Performance Optimization**: Monitor, measure, and optimize systematically  
✅ **Production Readiness**: Implement proper monitoring, alerting, and maintenance

### 📈 MongoDB Best Practices

1. **Design for Queries**

   - Model data based on how you'll query it
   - Embed for 1:1 and 1:few relationships
   - Reference for 1:many and many:many relationships

2. **Index Strategically**

   - Create indexes for all query patterns
   - Use compound indexes efficiently
   - Monitor index usage and remove unused ones

3. **Optimize Performance**
   - Use aggregation pipelines efficiently
   - Implement proper pagination
   - Leverage bulk operations
   - Monitor continuously

### ⚠️ Common MongoDB Pitfalls

- **Poor schema design**: Not considering query patterns upfront
- **Missing indexes**: Causing collection scans on large datasets
- **Inefficient aggregations**: Not filtering early in pipelines
- **Connection leaks**: Not properly managing connection pools
- **Ignoring monitoring**: Not tracking performance metrics

**📈 Next Steps:**
Ready to explore high-performance caching? Continue with [Redis & Caching Strategies](./07-redis-caching-strategies.md) to learn advanced caching patterns, Redis data structures, and performance optimization techniques.

---

_💡 Pro Tip: MongoDB performance is all about understanding your data access patterns. Design your schema and indexes to match how your application queries the data, not how you think the data should be organized._
