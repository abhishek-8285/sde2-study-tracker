# SQL Fundamentals & Core Concepts 🎯

Master the foundational building blocks of SQL and relational database management with practical examples and industry best practices.

## Table of Contents

- [Database Basics & RDBMS Concepts](#database-basics--rdbms-concepts)
- [DDL, DML, DCL Commands](#ddl-dml-dcl-commands)
- [SELECT Queries & Filtering](#select-queries--filtering)
- [JOINs & Relationships](#joins--relationships)
- [Aggregate Functions & GROUP BY](#aggregate-functions--group-by)
- [Subqueries & CTEs](#subqueries--ctes)

---

## Database Basics & RDBMS Concepts

### Understanding Relational Databases

A relational database organizes data into tables (relations) with rows (records) and columns (attributes), following specific rules and constraints.

```sql
-- Database creation example
CREATE DATABASE ecommerce_db;
USE ecommerce_db;

-- Table creation with various data types
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    date_of_birth DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_category_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES categories(category_id)
);

CREATE TABLE products (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    category_id INT,
    sku VARCHAR(50) UNIQUE,
    weight DECIMAL(8, 2),
    dimensions VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    CHECK (price >= 0),
    CHECK (stock_quantity >= 0)
);

CREATE TABLE orders (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    total_amount DECIMAL(12, 2) NOT NULL,
    shipping_address TEXT,
    billing_address TEXT,
    payment_method VARCHAR(50),
    tracking_number VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    CHECK (total_amount >= 0)
);

CREATE TABLE order_items (
    order_item_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(5, 2) DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    CHECK (quantity > 0),
    CHECK (unit_price >= 0),
    CHECK (discount >= 0 AND discount <= 100)
);
```

### ACID Properties

```sql
-- Example: Demonstrating ACID properties with a bank transfer
START TRANSACTION;

-- Atomicity: All operations succeed or all fail
UPDATE accounts
SET balance = balance - 100
WHERE account_id = 1 AND balance >= 100;

-- Check if the debit was successful
IF ROW_COUNT() = 0 THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient funds';
END IF;

UPDATE accounts
SET balance = balance + 100
WHERE account_id = 2;

-- Consistency: Database remains in valid state
-- Isolation: Transaction is isolated from others
-- Durability: Changes are permanent once committed
COMMIT;
```

**📊 RDBMS Characteristics:**

✅ **Pros:**

- ACID compliance ensures data integrity
- Strong consistency and reliability
- Mature ecosystem with extensive tooling
- SQL standardization across vendors
- Complex relationships and joins

❌ **Cons:**

- Vertical scaling limitations
- Schema rigidity can slow development
- Complex setup for high availability
- Performance bottlenecks with massive scale

**🎯 When to Use RDBMS:**

- **Use**: Financial systems, CRM, inventory management, complex reporting
- **Avoid**: High-volume social media feeds, real-time analytics, document storage

---

## DDL, DML, DCL Commands

### Data Definition Language (DDL)

DDL commands define and modify database structure.

```sql
-- CREATE: Define new database objects
CREATE TABLE product_reviews (
    review_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    helpful_votes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (user_id, product_id)
);

-- ALTER: Modify existing structures
ALTER TABLE users
ADD COLUMN phone VARCHAR(20),
ADD COLUMN country VARCHAR(50) DEFAULT 'USA',
ADD INDEX idx_users_email (email),
ADD INDEX idx_users_name (last_name, first_name);

-- Add a new column with constraints
ALTER TABLE products
ADD COLUMN brand VARCHAR(100),
ADD COLUMN warranty_months INT DEFAULT 12 CHECK (warranty_months >= 0);

-- Modify existing column
ALTER TABLE products
MODIFY COLUMN description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- DROP: Remove database objects
DROP INDEX idx_old_index ON products;
ALTER TABLE users DROP COLUMN old_column;

-- Create indexes for performance
CREATE INDEX idx_orders_user_date ON orders(user_id, order_date);
CREATE INDEX idx_products_category_price ON products(category_id, price);
CREATE INDEX idx_order_items_product ON order_items(product_id);
```

### Data Manipulation Language (DML)

DML commands manipulate data within tables.

```sql
-- INSERT: Add new records
INSERT INTO categories (category_name, description) VALUES
('Electronics', 'Electronic devices and accessories'),
('Clothing', 'Apparel and fashion items'),
('Books', 'Physical and digital books'),
('Home & Garden', 'Home improvement and gardening supplies');

-- INSERT with subquery
INSERT INTO users (username, email, password_hash, first_name, last_name)
SELECT
    CONCAT('user_', ROW_NUMBER() OVER()) as username,
    CONCAT('user', ROW_NUMBER() OVER(), '@example.com') as email,
    SHA2(CONCAT('password', ROW_NUMBER() OVER()), 256) as password_hash,
    'John' as first_name,
    'Doe' as last_name
FROM information_schema.tables
LIMIT 100;

-- UPDATE: Modify existing records
UPDATE products
SET price = price * 0.9,
    updated_at = CURRENT_TIMESTAMP
WHERE category_id = (SELECT category_id FROM categories WHERE category_name = 'Electronics')
AND created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);

-- UPDATE with JOIN
UPDATE products p
JOIN categories c ON p.category_id = c.category_id
SET p.price = p.price * 1.1
WHERE c.category_name = 'Electronics' AND p.stock_quantity > 50;

-- DELETE: Remove records
DELETE FROM order_items
WHERE order_id IN (
    SELECT order_id FROM orders
    WHERE status = 'cancelled' AND order_date < DATE_SUB(NOW(), INTERVAL 1 YEAR)
);

-- Bulk operations for performance
INSERT INTO products (product_name, price, category_id, stock_quantity)
VALUES
    ('Laptop Pro 15"', 1299.99, 1, 25),
    ('Wireless Headphones', 199.99, 1, 150),
    ('Smartphone X', 899.99, 1, 75),
    ('Running Shoes', 89.99, 2, 200),
    ('Programming Book', 45.99, 3, 300);
```

### Data Control Language (DCL)

DCL commands control access to database objects.

```sql
-- Create users with specific privileges
CREATE USER 'app_read_only'@'%' IDENTIFIED BY 'secure_password';
CREATE USER 'app_full_access'@'localhost' IDENTIFIED BY 'another_secure_password';
CREATE USER 'analytics_user'@'analytics.company.com' IDENTIFIED BY 'analytics_password';

-- GRANT: Assign permissions
GRANT SELECT ON ecommerce_db.* TO 'app_read_only'@'%';
GRANT SELECT, INSERT, UPDATE ON ecommerce_db.orders TO 'app_full_access'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON ecommerce_db.order_items TO 'app_full_access'@'localhost';

-- Grant specific column access
GRANT SELECT (user_id, username, email, first_name, last_name, created_at)
ON ecommerce_db.users TO 'analytics_user'@'analytics.company.com';

-- REVOKE: Remove permissions
REVOKE INSERT ON ecommerce_db.products FROM 'app_read_only'@'%';

-- Create roles for better permission management
CREATE ROLE 'order_manager';
GRANT SELECT, INSERT, UPDATE ON ecommerce_db.orders TO 'order_manager';
GRANT SELECT, INSERT, UPDATE, DELETE ON ecommerce_db.order_items TO 'order_manager';
GRANT 'order_manager' TO 'app_full_access'@'localhost';
```

**📚 Real-World DDL/DML/DCL Examples:**

1. **E-commerce Platform**: Product catalog, order management, user accounts
2. **Social Media**: User profiles, posts, comments, likes, follows
3. **Banking System**: Account management, transactions, audit trails
4. **Healthcare**: Patient records, appointments, medical history
5. **Education**: Student enrollment, courses, grades, attendance
6. **Inventory Management**: Stock tracking, suppliers, purchase orders
7. **HR System**: Employee records, payroll, performance reviews

---

## SELECT Queries & Filtering

### Basic SELECT Operations

```sql
-- Simple SELECT with column selection
SELECT user_id, username, email, created_at
FROM users
WHERE is_active = TRUE;

-- SELECT with computed columns
SELECT
    product_name,
    price,
    stock_quantity,
    price * stock_quantity AS inventory_value,
    CASE
        WHEN stock_quantity = 0 THEN 'Out of Stock'
        WHEN stock_quantity < 10 THEN 'Low Stock'
        WHEN stock_quantity < 50 THEN 'Medium Stock'
        ELSE 'High Stock'
    END AS stock_status,
    CONCAT(product_name, ' - $', FORMAT(price, 2)) AS display_name
FROM products
WHERE is_available = TRUE;

-- Advanced filtering with multiple conditions
SELECT
    u.username,
    u.email,
    COUNT(o.order_id) AS total_orders,
    SUM(o.total_amount) AS total_spent,
    AVG(o.total_amount) AS avg_order_value,
    MAX(o.order_date) AS last_order_date
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
WHERE u.created_at >= '2023-01-01'
    AND u.is_active = TRUE
    AND (u.country = 'USA' OR u.country IS NULL)
GROUP BY u.user_id, u.username, u.email
HAVING COUNT(o.order_id) > 0
ORDER BY total_spent DESC, total_orders DESC
LIMIT 50;
```

### Advanced Filtering Techniques

```sql
-- Pattern matching with LIKE and REGEXP
SELECT product_name, price
FROM products
WHERE product_name LIKE '%laptop%'
    OR product_name LIKE '%computer%'
    OR product_name REGEXP '(phone|mobile|smartphone)';

-- Range queries and date filtering
SELECT
    order_id,
    user_id,
    order_date,
    total_amount,
    status
FROM orders
WHERE order_date BETWEEN '2024-01-01' AND '2024-12-31'
    AND total_amount BETWEEN 100 AND 1000
    AND status IN ('processing', 'shipped', 'delivered');

-- NULL handling and COALESCE
SELECT
    user_id,
    username,
    COALESCE(phone, 'No phone provided') AS phone_display,
    COALESCE(country, 'Unknown') AS country_display,
    CASE
        WHEN date_of_birth IS NULL THEN 'Age not provided'
        WHEN DATEDIFF(CURDATE(), date_of_birth) / 365 < 18 THEN 'Minor'
        WHEN DATEDIFF(CURDATE(), date_of_birth) / 365 < 65 THEN 'Adult'
        ELSE 'Senior'
    END AS age_group
FROM users
WHERE email IS NOT NULL
    AND email != '';

-- Complex filtering with EXISTS and NOT EXISTS
SELECT p.product_name, p.price, p.stock_quantity
FROM products p
WHERE EXISTS (
    SELECT 1 FROM order_items oi
    WHERE oi.product_id = p.product_id
    AND oi.order_id IN (
        SELECT order_id FROM orders
        WHERE order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    )
)
AND NOT EXISTS (
    SELECT 1 FROM product_reviews pr
    WHERE pr.product_id = p.product_id
    AND pr.rating <= 2
);
```

### Text Search and Full-Text Search

```sql
-- Basic text search
SELECT product_id, product_name, description, price
FROM products
WHERE LOWER(product_name) LIKE LOWER('%wireless%')
    OR LOWER(description) LIKE LOWER('%bluetooth%');

-- Full-text search (MySQL example)
ALTER TABLE products ADD FULLTEXT(product_name, description);

SELECT product_id, product_name, description, price,
       MATCH(product_name, description) AGAINST('wireless bluetooth headphones' IN NATURAL LANGUAGE MODE) AS relevance_score
FROM products
WHERE MATCH(product_name, description) AGAINST('wireless bluetooth headphones' IN NATURAL LANGUAGE MODE)
ORDER BY relevance_score DESC;

-- Boolean full-text search
SELECT product_id, product_name, price
FROM products
WHERE MATCH(product_name, description) AGAINST('+wireless +headphones -cheap' IN BOOLEAN MODE);
```

**⚠️ Common SELECT Pitfalls:**

```sql
-- ❌ BAD: SELECT * (performance and maintenance issues)
SELECT * FROM products;

-- ✅ GOOD: Specify needed columns
SELECT product_id, product_name, price, stock_quantity FROM products;

-- ❌ BAD: No index on WHERE clause
SELECT * FROM orders WHERE YEAR(order_date) = 2024;

-- ✅ GOOD: Index-friendly date filtering
SELECT order_id, user_id, total_amount
FROM orders
WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01';

-- ❌ BAD: Function on column in WHERE clause
SELECT * FROM users WHERE UPPER(username) = 'JOHN';

-- ✅ GOOD: Function on value, not column
SELECT user_id, username, email FROM users WHERE username = UPPER('john');
```

---

## JOINs & Relationships

### Understanding JOIN Types

```sql
-- INNER JOIN: Returns only matching records from both tables
SELECT
    u.username,
    u.email,
    o.order_id,
    o.order_date,
    o.total_amount,
    o.status
FROM users u
INNER JOIN orders o ON u.user_id = o.user_id
WHERE o.order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY o.order_date DESC;

-- LEFT JOIN: Returns all records from left table, matched records from right
SELECT
    u.user_id,
    u.username,
    u.email,
    COUNT(o.order_id) AS order_count,
    COALESCE(SUM(o.total_amount), 0) AS total_spent,
    MAX(o.order_date) AS last_order_date
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.user_id, u.username, u.email
ORDER BY total_spent DESC;

-- RIGHT JOIN: Returns all records from right table, matched records from left
SELECT
    c.category_name,
    COUNT(p.product_id) AS product_count,
    AVG(p.price) AS avg_price,
    MIN(p.price) AS min_price,
    MAX(p.price) AS max_price
FROM products p
RIGHT JOIN categories c ON p.category_id = c.category_id
GROUP BY c.category_id, c.category_name
ORDER BY product_count DESC;

-- FULL OUTER JOIN: Returns all records when there's a match in either table
-- (MySQL doesn't support FULL OUTER JOIN directly, use UNION)
SELECT
    u.user_id,
    u.username,
    o.order_id,
    o.total_amount
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
UNION
SELECT
    u.user_id,
    u.username,
    o.order_id,
    o.total_amount
FROM users u
RIGHT JOIN orders o ON u.user_id = o.user_id
WHERE u.user_id IS NULL;
```

### Complex JOIN Scenarios

```sql
-- Multiple JOINs for comprehensive data
SELECT
    u.username,
    u.email,
    o.order_id,
    o.order_date,
    o.status AS order_status,
    p.product_name,
    oi.quantity,
    oi.unit_price,
    (oi.quantity * oi.unit_price) AS line_total,
    c.category_name,
    pr.rating,
    pr.review_text
FROM users u
INNER JOIN orders o ON u.user_id = o.user_id
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
INNER JOIN categories c ON p.category_id = c.category_id
LEFT JOIN product_reviews pr ON (p.product_id = pr.product_id AND u.user_id = pr.user_id)
WHERE o.order_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
    AND o.status IN ('delivered', 'shipped')
ORDER BY o.order_date DESC, o.order_id, oi.order_item_id;

-- Self JOIN for hierarchical data
SELECT
    parent.category_name AS parent_category,
    child.category_name AS child_category,
    COUNT(p.product_id) AS product_count
FROM categories parent
INNER JOIN categories child ON parent.category_id = child.parent_category_id
LEFT JOIN products p ON child.category_id = p.category_id
GROUP BY parent.category_id, parent.category_name, child.category_id, child.category_name
ORDER BY parent.category_name, child.category_name;

-- Cross JOIN for generating combinations (use with caution)
SELECT
    u.username,
    c.category_name,
    COUNT(o.order_id) AS orders_in_category
FROM users u
CROSS JOIN categories c
LEFT JOIN orders o ON u.user_id = o.user_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.product_id AND p.category_id = c.category_id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.user_id, u.username, c.category_id, c.category_name
HAVING COUNT(o.order_id) > 0
ORDER BY u.username, c.category_name;
```

### JOIN Performance Optimization

```sql
-- Optimized JOIN with proper indexing
-- Index suggestions:
-- CREATE INDEX idx_orders_user_date ON orders(user_id, order_date);
-- CREATE INDEX idx_order_items_order_product ON order_items(order_id, product_id);
-- CREATE INDEX idx_products_category ON products(category_id);

SELECT
    u.username,
    COUNT(DISTINCT o.order_id) AS order_count,
    COUNT(DISTINCT p.product_id) AS unique_products,
    SUM(oi.quantity * oi.unit_price) AS total_spent
FROM users u
INNER JOIN orders o ON u.user_id = o.user_id
    AND o.order_date >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
WHERE u.is_active = TRUE
GROUP BY u.user_id, u.username
HAVING order_count >= 5
ORDER BY total_spent DESC
LIMIT 100;

-- Subquery vs JOIN comparison
-- Subquery approach (often slower)
SELECT product_name, price
FROM products
WHERE category_id IN (
    SELECT category_id
    FROM categories
    WHERE category_name LIKE '%Electronic%'
);

-- JOIN approach (usually faster)
SELECT p.product_name, p.price
FROM products p
INNER JOIN categories c ON p.category_id = c.category_id
WHERE c.category_name LIKE '%Electronic%';
```

**📊 JOIN Performance Guidelines:**

✅ **Best Practices:**

- Always use proper indexes on JOIN columns
- JOIN on primary/foreign key relationships when possible
- Filter data early in WHERE clauses
- Use INNER JOIN when you don't need unmatched rows
- Limit result sets with LIMIT when appropriate

❌ **Avoid:**

- JOINing on non-indexed columns
- Using functions in JOIN conditions
- Cartesian products (accidental CROSS JOINs)
- Too many JOINs in a single query (consider breaking up)

---

## Aggregate Functions & GROUP BY

### Essential Aggregate Functions

```sql
-- Basic aggregation functions
SELECT
    COUNT(*) AS total_orders,
    COUNT(DISTINCT user_id) AS unique_customers,
    SUM(total_amount) AS total_revenue,
    AVG(total_amount) AS average_order_value,
    MIN(total_amount) AS smallest_order,
    MAX(total_amount) AS largest_order,
    STDDEV(total_amount) AS order_amount_stddev
FROM orders
WHERE order_date >= '2024-01-01'
    AND status IN ('processing', 'shipped', 'delivered');

-- Aggregation with grouping
SELECT
    status,
    COUNT(*) AS order_count,
    SUM(total_amount) AS status_revenue,
    AVG(total_amount) AS avg_order_value,
    MIN(order_date) AS first_order,
    MAX(order_date) AS last_order
FROM orders
WHERE order_date >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
GROUP BY status
ORDER BY status_revenue DESC;

-- Multi-level grouping
SELECT
    c.category_name,
    YEAR(o.order_date) AS order_year,
    MONTH(o.order_date) AS order_month,
    COUNT(DISTINCT o.order_id) AS orders_count,
    COUNT(DISTINCT o.user_id) AS unique_customers,
    SUM(oi.quantity) AS total_items_sold,
    SUM(oi.quantity * oi.unit_price) AS category_revenue,
    AVG(oi.unit_price) AS avg_item_price
FROM categories c
INNER JOIN products p ON c.category_id = p.category_id
INNER JOIN order_items oi ON p.product_id = oi.product_id
INNER JOIN orders o ON oi.order_id = o.order_id
WHERE o.order_date >= '2024-01-01'
    AND o.status = 'delivered'
GROUP BY c.category_id, c.category_name, YEAR(o.order_date), MONTH(o.order_date)
HAVING category_revenue > 1000
ORDER BY order_year DESC, order_month DESC, category_revenue DESC;
```

### Advanced Aggregation Techniques

```sql
-- Conditional aggregation
SELECT
    u.user_id,
    u.username,
    COUNT(o.order_id) AS total_orders,
    SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) AS delivered_orders,
    SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,
    SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END) AS delivered_revenue,
    SUM(CASE WHEN YEAR(o.order_date) = 2024 THEN o.total_amount ELSE 0 END) AS revenue_2024,
    AVG(CASE WHEN o.status = 'delivered' THEN o.total_amount END) AS avg_delivered_order_value,
    COUNT(CASE WHEN o.order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) AS recent_orders
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
WHERE u.created_at >= '2023-01-01'
GROUP BY u.user_id, u.username
HAVING total_orders > 0
ORDER BY delivered_revenue DESC;

-- Aggregation with ROLLUP for subtotals
SELECT
    c.category_name,
    p.brand,
    COUNT(p.product_id) AS product_count,
    AVG(p.price) AS avg_price,
    SUM(p.stock_quantity) AS total_stock
FROM categories c
INNER JOIN products p ON c.category_id = p.category_id
WHERE p.is_available = TRUE
GROUP BY c.category_name, p.brand WITH ROLLUP
ORDER BY c.category_name, p.brand;

-- Percentage calculations
SELECT
    c.category_name,
    COUNT(p.product_id) AS product_count,
    ROUND(
        COUNT(p.product_id) * 100.0 / (
            SELECT COUNT(*) FROM products WHERE is_available = TRUE
        ), 2
    ) AS percentage_of_total_products,
    SUM(p.stock_quantity) AS total_stock_value,
    ROUND(
        SUM(p.stock_quantity) * 100.0 / (
            SELECT SUM(stock_quantity) FROM products WHERE is_available = TRUE
        ), 2
    ) AS percentage_of_total_stock
FROM categories c
INNER JOIN products p ON c.category_id = p.category_id
WHERE p.is_available = TRUE
GROUP BY c.category_id, c.category_name
ORDER BY product_count DESC;
```

### HAVING vs WHERE

```sql
-- WHERE: Filters rows before grouping
-- HAVING: Filters groups after aggregation

-- Correct usage example
SELECT
    c.category_name,
    COUNT(p.product_id) AS product_count,
    AVG(p.price) AS avg_price,
    SUM(CASE WHEN p.stock_quantity > 0 THEN 1 ELSE 0 END) AS in_stock_products
FROM categories c
INNER JOIN products p ON c.category_id = p.category_id
WHERE p.is_available = TRUE  -- Filter individual products before grouping
    AND p.price > 10  -- Filter individual products before grouping
GROUP BY c.category_id, c.category_name
HAVING COUNT(p.product_id) >= 5  -- Filter groups after aggregation
    AND AVG(p.price) > 50  -- Filter groups after aggregation
ORDER BY avg_price DESC;

-- Customer segmentation using aggregation
SELECT
    CASE
        WHEN total_spent >= 5000 THEN 'VIP'
        WHEN total_spent >= 1000 THEN 'Premium'
        WHEN total_spent >= 100 THEN 'Regular'
        ELSE 'New'
    END AS customer_segment,
    COUNT(*) AS customer_count,
    AVG(total_spent) AS avg_spent_per_segment,
    AVG(order_count) AS avg_orders_per_segment,
    MIN(total_spent) AS min_spent,
    MAX(total_spent) AS max_spent
FROM (
    SELECT
        u.user_id,
        u.username,
        COUNT(o.order_id) AS order_count,
        COALESCE(SUM(o.total_amount), 0) AS total_spent
    FROM users u
    LEFT JOIN orders o ON u.user_id = o.user_id
        AND o.status = 'delivered'
    WHERE u.created_at >= '2023-01-01'
    GROUP BY u.user_id, u.username
) customer_stats
GROUP BY customer_segment
ORDER BY avg_spent_per_segment DESC;
```

**📚 Real-World Aggregation Examples:**

1. **E-commerce Analytics**: Revenue by category, customer lifetime value
2. **Social Media**: Engagement metrics, user activity patterns
3. **Financial Services**: Transaction volumes, account balances
4. **Healthcare**: Patient statistics, treatment outcomes
5. **Education**: Grade distributions, enrollment statistics
6. **Manufacturing**: Production metrics, quality control
7. **SaaS Platforms**: User engagement, feature usage analytics

---

## Subqueries & CTEs

### Scalar Subqueries

```sql
-- Scalar subquery returning single value
SELECT
    product_id,
    product_name,
    price,
    (SELECT AVG(price) FROM products WHERE is_available = TRUE) AS avg_market_price,
    price - (SELECT AVG(price) FROM products WHERE is_available = TRUE) AS price_difference,
    CASE
        WHEN price > (SELECT AVG(price) FROM products WHERE is_available = TRUE) THEN 'Above Average'
        WHEN price < (SELECT AVG(price) FROM products WHERE is_available = TRUE) THEN 'Below Average'
        ELSE 'Average'
    END AS price_category
FROM products
WHERE is_available = TRUE
ORDER BY price_difference DESC;

-- Correlated scalar subquery
SELECT
    u.user_id,
    u.username,
    u.email,
    (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.user_id) AS total_orders,
    (SELECT MAX(order_date) FROM orders o WHERE o.user_id = u.user_id) AS last_order_date,
    (SELECT SUM(total_amount) FROM orders o WHERE o.user_id = u.user_id AND status = 'delivered') AS total_spent
FROM users u
WHERE u.created_at >= '2024-01-01'
    AND EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.user_id)
ORDER BY total_spent DESC NULLS LAST;
```

### Multi-row Subqueries

```sql
-- IN subquery
SELECT
    product_id,
    product_name,
    price,
    stock_quantity
FROM products
WHERE category_id IN (
    SELECT category_id
    FROM categories
    WHERE category_name IN ('Electronics', 'Books', 'Clothing')
)
AND price > (
    SELECT AVG(price)
    FROM products p2
    WHERE p2.category_id = products.category_id
);

-- EXISTS subquery (often more efficient than IN)
SELECT
    p.product_id,
    p.product_name,
    p.price,
    (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.product_id) AS times_ordered
FROM products p
WHERE EXISTS (
    SELECT 1
    FROM order_items oi
    INNER JOIN orders o ON oi.order_id = o.order_id
    WHERE oi.product_id = p.product_id
        AND o.order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND o.status = 'delivered'
)
ORDER BY times_ordered DESC;

-- NOT EXISTS for finding missing relationships
SELECT
    u.user_id,
    u.username,
    u.email,
    u.created_at
FROM users u
WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    AND NOT EXISTS (
        SELECT 1
        FROM orders o
        WHERE o.user_id = u.user_id
    )
ORDER BY u.created_at DESC;
```

### Common Table Expressions (CTEs)

```sql
-- Basic CTE for code readability
WITH customer_stats AS (
    SELECT
        u.user_id,
        u.username,
        u.email,
        COUNT(o.order_id) AS order_count,
        SUM(o.total_amount) AS total_spent,
        AVG(o.total_amount) AS avg_order_value,
        MAX(o.order_date) AS last_order_date
    FROM users u
    INNER JOIN orders o ON u.user_id = o.user_id
    WHERE o.status = 'delivered'
        AND o.order_date >= '2024-01-01'
    GROUP BY u.user_id, u.username, u.email
)
SELECT
    cs.*,
    CASE
        WHEN cs.total_spent >= 2000 THEN 'VIP'
        WHEN cs.total_spent >= 500 THEN 'Premium'
        ELSE 'Regular'
    END AS customer_tier,
    DATEDIFF(NOW(), cs.last_order_date) AS days_since_last_order
FROM customer_stats cs
WHERE cs.order_count >= 3
ORDER BY cs.total_spent DESC;

-- Multiple CTEs
WITH
monthly_sales AS (
    SELECT
        DATE_FORMAT(o.order_date, '%Y-%m') AS month_year,
        COUNT(DISTINCT o.order_id) AS orders_count,
        COUNT(DISTINCT o.user_id) AS unique_customers,
        SUM(o.total_amount) AS monthly_revenue
    FROM orders o
    WHERE o.status = 'delivered'
        AND o.order_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    GROUP BY DATE_FORMAT(o.order_date, '%Y-%m')
),
category_performance AS (
    SELECT
        c.category_name,
        DATE_FORMAT(o.order_date, '%Y-%m') AS month_year,
        SUM(oi.quantity * oi.unit_price) AS category_revenue,
        COUNT(DISTINCT oi.product_id) AS products_sold
    FROM categories c
    INNER JOIN products p ON c.category_id = p.category_id
    INNER JOIN order_items oi ON p.product_id = oi.product_id
    INNER JOIN orders o ON oi.order_id = o.order_id
    WHERE o.status = 'delivered'
        AND o.order_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    GROUP BY c.category_name, DATE_FORMAT(o.order_date, '%Y-%m')
)
SELECT
    ms.month_year,
    ms.orders_count,
    ms.unique_customers,
    ms.monthly_revenue,
    cp.category_name,
    cp.category_revenue,
    ROUND(cp.category_revenue * 100.0 / ms.monthly_revenue, 2) AS category_percentage
FROM monthly_sales ms
INNER JOIN category_performance cp ON ms.month_year = cp.month_year
ORDER BY ms.month_year DESC, cp.category_revenue DESC;

-- Recursive CTE for hierarchical data
WITH RECURSIVE category_hierarchy AS (
    -- Base case: top-level categories
    SELECT
        category_id,
        category_name,
        parent_category_id,
        0 AS level,
        CAST(category_name AS CHAR(1000)) AS path
    FROM categories
    WHERE parent_category_id IS NULL

    UNION ALL

    -- Recursive case: child categories
    SELECT
        c.category_id,
        c.category_name,
        c.parent_category_id,
        ch.level + 1,
        CONCAT(ch.path, ' > ', c.category_name)
    FROM categories c
    INNER JOIN category_hierarchy ch ON c.parent_category_id = ch.category_id
    WHERE ch.level < 5  -- Prevent infinite recursion
)
SELECT
    ch.level,
    ch.path,
    ch.category_name,
    COUNT(p.product_id) AS product_count,
    COALESCE(SUM(p.stock_quantity), 0) AS total_stock
FROM category_hierarchy ch
LEFT JOIN products p ON ch.category_id = p.category_id
GROUP BY ch.category_id, ch.level, ch.path, ch.category_name
ORDER BY ch.level, ch.path;
```

### Advanced Subquery Patterns

```sql
-- Window functions vs subqueries
-- Subquery approach (multiple table scans)
SELECT
    p.product_id,
    p.product_name,
    p.price,
    c.category_name,
    (SELECT AVG(price) FROM products p2 WHERE p2.category_id = p.category_id) AS category_avg_price,
    (SELECT COUNT(*) FROM products p3 WHERE p3.category_id = p.category_id AND p3.price <= p.price) AS price_rank
FROM products p
INNER JOIN categories c ON p.category_id = c.category_id
WHERE p.is_available = TRUE;

-- Window function approach (single table scan, more efficient)
SELECT
    p.product_id,
    p.product_name,
    p.price,
    c.category_name,
    AVG(p.price) OVER (PARTITION BY p.category_id) AS category_avg_price,
    RANK() OVER (PARTITION BY p.category_id ORDER BY p.price) AS price_rank
FROM products p
INNER JOIN categories c ON p.category_id = c.category_id
WHERE p.is_available = TRUE;

-- Complex analytical query with CTE
WITH
order_metrics AS (
    SELECT
        o.user_id,
        COUNT(*) AS order_count,
        SUM(o.total_amount) AS total_spent,
        AVG(o.total_amount) AS avg_order_value,
        MIN(o.order_date) AS first_order_date,
        MAX(o.order_date) AS last_order_date,
        DATEDIFF(MAX(o.order_date), MIN(o.order_date)) AS customer_lifespan_days
    FROM orders o
    WHERE o.status = 'delivered'
    GROUP BY o.user_id
),
customer_segments AS (
    SELECT
        om.*,
        u.username,
        u.email,
        u.created_at,
        CASE
            WHEN om.total_spent >= 5000 THEN 'VIP'
            WHEN om.total_spent >= 1000 THEN 'Premium'
            WHEN om.total_spent >= 100 THEN 'Regular'
            ELSE 'New'
        END AS segment,
        CASE
            WHEN DATEDIFF(NOW(), om.last_order_date) <= 30 THEN 'Active'
            WHEN DATEDIFF(NOW(), om.last_order_date) <= 90 THEN 'At Risk'
            ELSE 'Churned'
        END AS status
    FROM order_metrics om
    INNER JOIN users u ON om.user_id = u.user_id
)
SELECT
    segment,
    status,
    COUNT(*) AS customer_count,
    AVG(total_spent) AS avg_lifetime_value,
    AVG(order_count) AS avg_orders,
    AVG(avg_order_value) AS avg_order_size,
    AVG(customer_lifespan_days) AS avg_lifespan_days
FROM customer_segments
GROUP BY segment, status
ORDER BY
    CASE segment WHEN 'VIP' THEN 1 WHEN 'Premium' THEN 2 WHEN 'Regular' THEN 3 ELSE 4 END,
    CASE status WHEN 'Active' THEN 1 WHEN 'At Risk' THEN 2 ELSE 3 END;
```

**📊 Subqueries vs JOINs vs CTEs:**

| Approach       | Pros                                     | Cons                                   | Best For                         |
| -------------- | ---------------------------------------- | -------------------------------------- | -------------------------------- |
| **Subqueries** | Simple, readable for single values       | Can be slow, multiple table scans      | Scalar values, EXISTS checks     |
| **JOINs**      | Fast, single table scan                  | Complex syntax for multiple operations | Combining related data           |
| **CTEs**       | Readable, reusable, recursive capability | Not always optimized                   | Complex logic, hierarchical data |

**⚠️ Performance Tips:**

✅ **Best Practices:**

- Use EXISTS instead of IN for large datasets
- Prefer JOINs over correlated subqueries when possible
- Use CTEs for complex logic and readability
- Index columns used in subquery conditions

❌ **Avoid:**

- Correlated subqueries in SELECT clause for large datasets
- Multiple levels of nested subqueries
- Subqueries that return large result sets with IN

---

## Summary & Next Steps

### 🎯 Key Takeaways

✅ **Database Fundamentals**: Understanding RDBMS, ACID properties, and data types  
✅ **DDL/DML/DCL**: Creating, modifying, and controlling database objects  
✅ **SELECT Mastery**: Filtering, pattern matching, and text search  
✅ **JOIN Expertise**: Understanding relationships and performance optimization  
✅ **Aggregation Skills**: GROUP BY, HAVING, and statistical functions  
✅ **Subquery Proficiency**: Scalar, multi-row, and CTE patterns

### 📈 Implementation Strategy

1. **Practice Fundamentals**

   - Set up a local database environment
   - Create sample schemas with realistic data
   - Practice basic CRUD operations daily

2. **Master JOINs**

   - Understand when to use each JOIN type
   - Practice with complex multi-table scenarios
   - Focus on performance optimization

3. **Advanced Techniques**

   - Learn to write efficient subqueries
   - Master CTEs for complex analysis
   - Practice window functions (covered in next topic)

4. **Performance Awareness**
   - Always consider indexing strategies
   - Understand query execution plans
   - Practice optimization techniques

### ⚠️ Common SQL Pitfalls

- **N+1 Query Problem**: Using correlated subqueries instead of JOINs
- **Missing Indexes**: Not indexing WHERE/JOIN columns
- **SELECT \***: Retrieving unnecessary columns
- **String Comparisons**: Case sensitivity and collation issues
- **NULL Handling**: Forgetting about NULL values in comparisons

**📈 Next Steps:**
Ready to design robust database schemas? Continue with [Database Design & Normalization](./02-database-design-normalization.md) to learn entity-relationship modeling, normalization principles, and schema design patterns.

---

_💡 Pro Tip: SQL mastery comes through practice. Set up a local database with sample data and practice these concepts daily. Every query teaches you something new about data relationships and performance._
