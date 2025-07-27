# Advanced SQL & Performance ⚡

Master advanced SQL techniques and performance optimization strategies for high-performance database applications at enterprise scale.

## Table of Contents

- [Window Functions & Analytics](#window-functions--analytics)
- [Stored Procedures & Functions](#stored-procedures--functions)
- [Query Optimization Techniques](#query-optimization-techniques)
- [Index Strategies & Performance](#index-strategies--performance)
- [Execution Plan Analysis](#execution-plan-analysis)

---

## Window Functions & Analytics

### Understanding Window Functions

Window functions perform calculations across related table rows without collapsing them into a single output row.

```sql
-- Basic window function syntax and examples
-- Sales analysis with window functions
CREATE TABLE sales_data (
    sale_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    salesperson_id INT NOT NULL,
    customer_id BIGINT NOT NULL,
    product_category VARCHAR(100) NOT NULL,
    sale_amount DECIMAL(12,2) NOT NULL,
    sale_date DATE NOT NULL,
    region VARCHAR(50) NOT NULL,

    INDEX idx_sales_person_date (salesperson_id, sale_date),
    INDEX idx_sales_region_date (region, sale_date),
    INDEX idx_sales_category_date (product_category, sale_date)
);

-- ROW_NUMBER, RANK, DENSE_RANK
SELECT
    salesperson_id,
    customer_id,
    sale_amount,
    sale_date,

    -- Assign unique row numbers within each salesperson
    ROW_NUMBER() OVER (PARTITION BY salesperson_id ORDER BY sale_amount DESC) AS sale_rank_unique,

    -- Rank with gaps for ties
    RANK() OVER (PARTITION BY salesperson_id ORDER BY sale_amount DESC) AS sale_rank_gaps,

    -- Dense rank without gaps
    DENSE_RANK() OVER (PARTITION BY salesperson_id ORDER BY sale_amount DESC) AS sale_rank_dense,

    -- Percentage rank
    PERCENT_RANK() OVER (PARTITION BY salesperson_id ORDER BY sale_amount) AS sale_percentile,

    -- Cumulative distribution
    CUME_DIST() OVER (PARTITION BY salesperson_id ORDER BY sale_amount) AS cumulative_distribution

FROM sales_data
WHERE sale_date >= '2024-01-01'
ORDER BY salesperson_id, sale_amount DESC;

-- NTILE for creating buckets/quartiles
SELECT
    salesperson_id,
    sale_amount,
    NTILE(4) OVER (PARTITION BY salesperson_id ORDER BY sale_amount) AS quartile,
    NTILE(10) OVER (PARTITION BY salesperson_id ORDER BY sale_amount) AS decile,

    CASE NTILE(4) OVER (PARTITION BY salesperson_id ORDER BY sale_amount)
        WHEN 1 THEN 'Bottom 25%'
        WHEN 2 THEN 'Second 25%'
        WHEN 3 THEN 'Third 25%'
        WHEN 4 THEN 'Top 25%'
    END AS performance_tier

FROM sales_data
ORDER BY salesperson_id, sale_amount DESC;
```

### Aggregate Window Functions

```sql
-- Running totals and moving averages
SELECT
    sale_date,
    salesperson_id,
    sale_amount,

    -- Running total for each salesperson
    SUM(sale_amount) OVER (
        PARTITION BY salesperson_id
        ORDER BY sale_date
        ROWS UNBOUNDED PRECEDING
    ) AS running_total,

    -- Moving average (last 7 days)
    AVG(sale_amount) OVER (
        PARTITION BY salesperson_id
        ORDER BY sale_date
        ROWS 6 PRECEDING
    ) AS moving_avg_7_days,

    -- Running count
    COUNT(*) OVER (
        PARTITION BY salesperson_id
        ORDER BY sale_date
        ROWS UNBOUNDED PRECEDING
    ) AS sales_count_to_date,

    -- Cumulative percentage of total
    ROUND(
        SUM(sale_amount) OVER (
            PARTITION BY salesperson_id
            ORDER BY sale_date
            ROWS UNBOUNDED PRECEDING
        ) * 100.0 /
        SUM(sale_amount) OVER (PARTITION BY salesperson_id),
        2
    ) AS cumulative_percentage

FROM sales_data
WHERE sale_date >= '2024-01-01'
ORDER BY salesperson_id, sale_date;

-- Year-over-year comparisons
SELECT
    product_category,
    YEAR(sale_date) AS sale_year,
    MONTH(sale_date) AS sale_month,
    SUM(sale_amount) AS monthly_sales,

    -- Previous year same month
    LAG(SUM(sale_amount), 12) OVER (
        PARTITION BY product_category, MONTH(sale_date)
        ORDER BY YEAR(sale_date)
    ) AS prev_year_same_month,

    -- Year-over-year growth
    ROUND(
        (SUM(sale_amount) - LAG(SUM(sale_amount), 12) OVER (
            PARTITION BY product_category, MONTH(sale_date)
            ORDER BY YEAR(sale_date)
        )) * 100.0 / NULLIF(LAG(SUM(sale_amount), 12) OVER (
            PARTITION BY product_category, MONTH(sale_date)
            ORDER BY YEAR(sale_date)
        ), 0),
        2
    ) AS yoy_growth_percent

FROM sales_data
GROUP BY product_category, YEAR(sale_date), MONTH(sale_date)
ORDER BY product_category, sale_year, sale_month;
```

### Advanced Window Function Patterns

```sql
-- LAG and LEAD for time-series analysis
SELECT
    customer_id,
    sale_date,
    sale_amount,

    -- Previous sale amount and date
    LAG(sale_amount, 1) OVER (PARTITION BY customer_id ORDER BY sale_date) AS prev_sale_amount,
    LAG(sale_date, 1) OVER (PARTITION BY customer_id ORDER BY sale_date) AS prev_sale_date,

    -- Next sale amount and date
    LEAD(sale_amount, 1) OVER (PARTITION BY customer_id ORDER BY sale_date) AS next_sale_amount,
    LEAD(sale_date, 1) OVER (PARTITION BY customer_id ORDER BY sale_date) AS next_sale_date,

    -- Days between purchases
    DATEDIFF(
        sale_date,
        LAG(sale_date, 1) OVER (PARTITION BY customer_id ORDER BY sale_date)
    ) AS days_since_last_purchase,

    -- Sale amount change from previous
    sale_amount - LAG(sale_amount, 1) OVER (
        PARTITION BY customer_id ORDER BY sale_date
    ) AS amount_change,

    -- Percentage change
    ROUND(
        (sale_amount - LAG(sale_amount, 1) OVER (
            PARTITION BY customer_id ORDER BY sale_date
        )) * 100.0 / NULLIF(LAG(sale_amount, 1) OVER (
            PARTITION BY customer_id ORDER BY sale_date
        ), 0),
        2
    ) AS percent_change

FROM sales_data
WHERE customer_id IN (SELECT customer_id FROM sales_data GROUP BY customer_id HAVING COUNT(*) >= 3)
ORDER BY customer_id, sale_date;

-- FIRST_VALUE and LAST_VALUE
SELECT
    salesperson_id,
    sale_date,
    sale_amount,

    -- First sale of the year for each salesperson
    FIRST_VALUE(sale_amount) OVER (
        PARTITION BY salesperson_id, YEAR(sale_date)
        ORDER BY sale_date
        ROWS UNBOUNDED PRECEDING
    ) AS first_sale_of_year,

    -- Last sale (most recent) using proper frame
    LAST_VALUE(sale_amount) OVER (
        PARTITION BY salesperson_id, YEAR(sale_date)
        ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_sale_of_year,

    -- Highest sale in the year
    MAX(sale_amount) OVER (
        PARTITION BY salesperson_id, YEAR(sale_date)
    ) AS max_sale_of_year,

    -- Performance vs best sale
    ROUND(sale_amount * 100.0 / MAX(sale_amount) OVER (
        PARTITION BY salesperson_id, YEAR(sale_date)
    ), 2) AS percent_of_best_sale

FROM sales_data
WHERE YEAR(sale_date) = 2024
ORDER BY salesperson_id, sale_date;
```

### Complex Analytics with CTEs and Window Functions

```sql
-- Customer lifetime value analysis
WITH customer_metrics AS (
    SELECT
        customer_id,
        COUNT(*) AS total_purchases,
        SUM(sale_amount) AS total_spent,
        AVG(sale_amount) AS avg_purchase_amount,
        MIN(sale_date) AS first_purchase_date,
        MAX(sale_date) AS last_purchase_date,
        DATEDIFF(MAX(sale_date), MIN(sale_date)) AS customer_lifespan_days
    FROM sales_data
    GROUP BY customer_id
),
customer_segments AS (
    SELECT
        *,
        NTILE(5) OVER (ORDER BY total_spent) AS spending_quintile,
        NTILE(5) OVER (ORDER BY total_purchases) AS frequency_quintile,
        CASE
            WHEN DATEDIFF(CURDATE(), last_purchase_date) <= 30 THEN 'Active'
            WHEN DATEDIFF(CURDATE(), last_purchase_date) <= 90 THEN 'At Risk'
            ELSE 'Churned'
        END AS recency_status
    FROM customer_metrics
),
rfm_analysis AS (
    SELECT
        customer_id,
        total_spent,
        total_purchases,
        last_purchase_date,

        -- RFM Scores (1-5, where 5 is best)
        CASE
            WHEN DATEDIFF(CURDATE(), last_purchase_date) <= 30 THEN 5
            WHEN DATEDIFF(CURDATE(), last_purchase_date) <= 60 THEN 4
            WHEN DATEDIFF(CURDATE(), last_purchase_date) <= 90 THEN 3
            WHEN DATEDIFF(CURDATE(), last_purchase_date) <= 180 THEN 2
            ELSE 1
        END AS recency_score,

        frequency_quintile AS frequency_score,
        spending_quintile AS monetary_score,

        -- Combined RFM segment
        CONCAT(
            CASE
                WHEN DATEDIFF(CURDATE(), last_purchase_date) <= 30 THEN '5'
                WHEN DATEDIFF(CURDATE(), last_purchase_date) <= 60 THEN '4'
                WHEN DATEDIFF(CURDATE(), last_purchase_date) <= 90 THEN '3'
                WHEN DATEDIFF(CURDATE(), last_purchase_date) <= 180 THEN '2'
                ELSE '1'
            END,
            frequency_quintile,
            spending_quintile
        ) AS rfm_segment

    FROM customer_segments
)
SELECT
    rfm_segment,
    COUNT(*) AS customer_count,
    AVG(total_spent) AS avg_customer_value,
    AVG(total_purchases) AS avg_purchase_frequency,

    CASE
        WHEN rfm_segment LIKE '5[45][45]%' THEN 'Champions'
        WHEN rfm_segment LIKE '4[45][45]%' THEN 'Loyal Customers'
        WHEN rfm_segment LIKE '[45][12][45]%' THEN 'Potential Loyalists'
        WHEN rfm_segment LIKE '5[12][12]%' THEN 'New Customers'
        WHEN rfm_segment LIKE '[34][34][34]%' THEN 'Regular Customers'
        WHEN rfm_segment LIKE '[12][45][45]%' THEN 'Cannot Lose Them'
        WHEN rfm_segment LIKE '[12][12][45]%' THEN 'At Risk'
        ELSE 'Others'
    END AS customer_segment_name

FROM rfm_analysis
GROUP BY rfm_segment
ORDER BY customer_count DESC;
```

**📊 Window Function Performance Tips:**

✅ **Best Practices:**

- Use appropriate PARTITION BY to limit calculation scope
- Choose correct frame specification (ROWS vs RANGE)
- Index partition and order columns
- Avoid unnecessary window functions in subqueries

❌ **Performance Pitfalls:**

- Large partitions without proper indexing
- Complex expressions in ORDER BY clause
- Multiple identical window specifications (use window aliases)
- Window functions on unindexed columns

---

## Stored Procedures & Functions

### Advanced Stored Procedures

```sql
-- Complex business logic in stored procedures
DELIMITER //

-- Order processing with business rules and error handling
CREATE PROCEDURE ProcessOrder(
    IN p_customer_id BIGINT,
    IN p_order_items JSON,
    IN p_shipping_address JSON,
    IN p_payment_method VARCHAR(50),
    OUT p_order_id BIGINT,
    OUT p_result_message VARCHAR(500)
)
BEGIN
    DECLARE v_total_amount DECIMAL(12,2) DEFAULT 0;
    DECLARE v_customer_credit_limit DECIMAL(12,2) DEFAULT 0;
    DECLARE v_customer_current_balance DECIMAL(12,2) DEFAULT 0;
    DECLARE v_item_count INT DEFAULT 0;
    DECLARE v_current_item INT DEFAULT 0;
    DECLARE v_product_id BIGINT;
    DECLARE v_quantity INT;
    DECLARE v_unit_price DECIMAL(10,2);
    DECLARE v_available_stock INT;
    DECLARE v_line_total DECIMAL(10,2);

    DECLARE insufficient_stock CONDITION FOR SQLSTATE '45000';
    DECLARE credit_limit_exceeded CONDITION FOR SQLSTATE '45001';
    DECLARE invalid_customer CONDITION FOR SQLSTATE '45002';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1
            p_result_message = MESSAGE_TEXT;
        SET p_order_id = NULL;
    END;

    -- Start transaction
    START TRANSACTION;

    -- Validate customer
    SELECT credit_limit, current_balance
    INTO v_customer_credit_limit, v_customer_current_balance
    FROM customers
    WHERE customer_id = p_customer_id AND is_active = TRUE;

    IF v_customer_credit_limit IS NULL THEN
        SIGNAL invalid_customer SET MESSAGE_TEXT = 'Customer not found or inactive';
    END IF;

    -- Parse and validate order items
    SET v_item_count = JSON_LENGTH(p_order_items);
    SET v_current_item = 0;

    -- Create order
    INSERT INTO orders (customer_id, status, shipping_address, payment_method)
    VALUES (p_customer_id, 'pending', p_shipping_address, p_payment_method);

    SET p_order_id = LAST_INSERT_ID();

    -- Process each item
    WHILE v_current_item < v_item_count DO
        SET v_product_id = JSON_UNQUOTE(JSON_EXTRACT(p_order_items, CONCAT('$[', v_current_item, '].product_id')));
        SET v_quantity = JSON_UNQUOTE(JSON_EXTRACT(p_order_items, CONCAT('$[', v_current_item, '].quantity')));

        -- Get product details and check stock
        SELECT price, stock_quantity
        INTO v_unit_price, v_available_stock
        FROM products
        WHERE product_id = v_product_id AND is_active = TRUE
        FOR UPDATE;

        IF v_available_stock < v_quantity THEN
            SIGNAL insufficient_stock
            SET MESSAGE_TEXT = CONCAT('Insufficient stock for product ', v_product_id);
        END IF;

        SET v_line_total = v_quantity * v_unit_price;
        SET v_total_amount = v_total_amount + v_line_total;

        -- Add order item
        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
        VALUES (p_order_id, v_product_id, v_quantity, v_unit_price);

        -- Update stock
        UPDATE products
        SET stock_quantity = stock_quantity - v_quantity
        WHERE product_id = v_product_id;

        SET v_current_item = v_current_item + 1;
    END WHILE;

    -- Check credit limit
    IF v_customer_current_balance + v_total_amount > v_customer_credit_limit THEN
        SIGNAL credit_limit_exceeded
        SET MESSAGE_TEXT = 'Order exceeds customer credit limit';
    END IF;

    -- Update order total
    UPDATE orders
    SET total_amount = v_total_amount,
        status = 'confirmed'
    WHERE order_id = p_order_id;

    -- Update customer balance
    UPDATE customers
    SET current_balance = current_balance + v_total_amount
    WHERE customer_id = p_customer_id;

    COMMIT;

    SET p_result_message = CONCAT('Order ', p_order_id, ' processed successfully. Total: $', v_total_amount);

END //

-- Dynamic reporting procedure
CREATE PROCEDURE GenerateSalesReport(
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_group_by VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'category', 'salesperson'
    IN p_region VARCHAR(50),
    OUT p_total_sales DECIMAL(15,2)
)
BEGIN
    DECLARE sql_query TEXT;
    DECLARE where_clause TEXT DEFAULT '';
    DECLARE group_clause TEXT DEFAULT '';
    DECLARE select_clause TEXT DEFAULT '';

    -- Build WHERE clause
    SET where_clause = CONCAT('WHERE sale_date BETWEEN ''', p_start_date, ''' AND ''', p_end_date, '''');

    IF p_region IS NOT NULL AND p_region != '' THEN
        SET where_clause = CONCAT(where_clause, ' AND region = ''', p_region, '''');
    END IF;

    -- Build SELECT and GROUP BY clauses based on grouping parameter
    CASE p_group_by
        WHEN 'daily' THEN
            SET select_clause = 'DATE(sale_date) AS period';
            SET group_clause = 'GROUP BY DATE(sale_date)';
        WHEN 'weekly' THEN
            SET select_clause = 'YEARWEEK(sale_date) AS period';
            SET group_clause = 'GROUP BY YEARWEEK(sale_date)';
        WHEN 'monthly' THEN
            SET select_clause = 'DATE_FORMAT(sale_date, ''%Y-%m'') AS period';
            SET group_clause = 'GROUP BY YEAR(sale_date), MONTH(sale_date)';
        WHEN 'category' THEN
            SET select_clause = 'product_category AS period';
            SET group_clause = 'GROUP BY product_category';
        WHEN 'salesperson' THEN
            SET select_clause = 'salesperson_id AS period';
            SET group_clause = 'GROUP BY salesperson_id';
        ELSE
            SET select_clause = '''Total'' AS period';
            SET group_clause = '';
    END CASE;

    -- Build complete query
    SET sql_query = CONCAT(
        'SELECT ', select_clause, ', ',
        'COUNT(*) AS sale_count, ',
        'SUM(sale_amount) AS total_sales, ',
        'AVG(sale_amount) AS avg_sale_amount, ',
        'MIN(sale_amount) AS min_sale_amount, ',
        'MAX(sale_amount) AS max_sale_amount ',
        'FROM sales_data ',
        where_clause, ' ',
        group_clause, ' ',
        'ORDER BY total_sales DESC'
    );

    -- Create temporary table for results
    DROP TEMPORARY TABLE IF EXISTS temp_sales_report;

    SET @sql = CONCAT('CREATE TEMPORARY TABLE temp_sales_report AS ', sql_query);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    -- Get total sales for output parameter
    SELECT SUM(total_sales) INTO p_total_sales FROM temp_sales_report;

    -- Return results
    SELECT * FROM temp_sales_report;

END //

DELIMITER ;

-- Usage examples
CALL ProcessOrder(
    1001,
    '[{"product_id": 2001, "quantity": 2}, {"product_id": 2002, "quantity": 1}]',
    '{"street": "123 Main St", "city": "Boston", "zip": "02101"}',
    'credit_card',
    @order_id,
    @result_msg
);

SELECT @order_id, @result_msg;

CALL GenerateSalesReport('2024-01-01', '2024-12-31', 'monthly', 'North', @total);
SELECT @total AS total_sales_for_period;
```

### User-Defined Functions

```sql
-- Scalar functions for business calculations
DELIMITER //

CREATE FUNCTION CalculateDiscountAmount(
    base_price DECIMAL(10,2),
    discount_percentage DECIMAL(5,2),
    customer_tier ENUM('bronze', 'silver', 'gold', 'platinum')
)
RETURNS DECIMAL(10,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE final_discount DECIMAL(5,2);
    DECLARE tier_bonus DECIMAL(5,2) DEFAULT 0;

    -- Tier-based discount bonus
    CASE customer_tier
        WHEN 'bronze' THEN SET tier_bonus = 0;
        WHEN 'silver' THEN SET tier_bonus = 2;
        WHEN 'gold' THEN SET tier_bonus = 5;
        WHEN 'platinum' THEN SET tier_bonus = 10;
    END CASE;

    SET final_discount = LEAST(discount_percentage + tier_bonus, 50); -- Max 50% discount

    RETURN ROUND(base_price * final_discount / 100, 2);
END //

CREATE FUNCTION GetCustomerLifetimeValue(customer_id_param BIGINT)
RETURNS DECIMAL(15,2)
READS SQL DATA
BEGIN
    DECLARE ltv DECIMAL(15,2) DEFAULT 0;
    DECLARE avg_order_value DECIMAL(10,2);
    DECLARE purchase_frequency DECIMAL(8,4);
    DECLARE customer_lifespan_months INT;
    DECLARE total_orders INT;
    DECLARE first_order DATE;
    DECLARE last_order DATE;

    -- Get customer statistics
    SELECT
        COUNT(*) AS orders,
        AVG(total_amount) AS avg_amount,
        MIN(order_date) AS first_date,
        MAX(order_date) AS last_date
    INTO total_orders, avg_order_value, first_order, last_order
    FROM orders
    WHERE customer_id = customer_id_param
        AND status IN ('delivered', 'completed');

    IF total_orders > 0 THEN
        -- Calculate metrics
        SET customer_lifespan_months = GREATEST(
            TIMESTAMPDIFF(MONTH, first_order, COALESCE(last_order, CURDATE())),
            1
        );

        SET purchase_frequency = total_orders / customer_lifespan_months;

        -- LTV = Average Order Value × Purchase Frequency × Customer Lifespan
        SET ltv = avg_order_value * purchase_frequency * customer_lifespan_months;
    END IF;

    RETURN COALESCE(ltv, 0);
END //

-- Table function using temporary table
CREATE PROCEDURE GetTopCustomersByCategory(
    IN category_name VARCHAR(100),
    IN top_n INT DEFAULT 10
)
BEGIN
    DROP TEMPORARY TABLE IF EXISTS temp_customer_rankings;

    CREATE TEMPORARY TABLE temp_customer_rankings AS
    SELECT
        c.customer_id,
        CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
        c.email,
        COUNT(o.order_id) AS total_orders,
        SUM(oi.quantity * oi.unit_price) AS total_spent,
        AVG(oi.unit_price) AS avg_item_price,
        MAX(o.order_date) AS last_order_date,
        GetCustomerLifetimeValue(c.customer_id) AS estimated_ltv,
        RANK() OVER (ORDER BY SUM(oi.quantity * oi.unit_price) DESC) AS spending_rank
    FROM customers c
    INNER JOIN orders o ON c.customer_id = o.customer_id
    INNER JOIN order_items oi ON o.order_id = oi.order_id
    INNER JOIN products p ON oi.product_id = p.product_id
    INNER JOIN categories cat ON p.category_id = cat.category_id
    WHERE cat.category_name = category_name
        AND o.status = 'delivered'
    GROUP BY c.customer_id, c.first_name, c.last_name, c.email
    ORDER BY total_spent DESC
    LIMIT top_n;

    SELECT * FROM temp_customer_rankings;
END //

DELIMITER ;

-- Usage examples
SELECT
    product_name,
    price,
    CalculateDiscountAmount(price, 15, 'gold') AS discount_amount,
    price - CalculateDiscountAmount(price, 15, 'gold') AS final_price
FROM products
WHERE category_id = 1;

SELECT
    customer_id,
    GetCustomerLifetimeValue(customer_id) AS lifetime_value
FROM customers
WHERE customer_id BETWEEN 1000 AND 1010;

CALL GetTopCustomersByCategory('Electronics', 5);
```

**📊 Stored Procedure Best Practices:**

✅ **When to Use:**

- Complex business logic
- Multi-step transactions
- Data validation and processing
- Batch operations
- Security (controlled data access)

❌ **When to Avoid:**

- Simple CRUD operations
- Logic that changes frequently
- Portability requirements
- Heavy computational tasks

---

## Query Optimization Techniques

### Query Rewriting for Performance

```sql
-- Optimization Example 1: Inefficient vs Efficient EXISTS
-- ❌ SLOW: Using IN with subquery
SELECT DISTINCT c.customer_id, c.first_name, c.last_name
FROM customers c
WHERE c.customer_id IN (
    SELECT o.customer_id
    FROM orders o
    WHERE o.order_date >= '2024-01-01'
);

-- ✅ FAST: Using EXISTS
SELECT c.customer_id, c.first_name, c.last_name
FROM customers c
WHERE EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.customer_id = c.customer_id
        AND o.order_date >= '2024-01-01'
);

-- ✅ FASTEST: Using JOIN (if no duplicates needed)
SELECT DISTINCT c.customer_id, c.first_name, c.last_name
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id
WHERE o.order_date >= '2024-01-01';

-- Optimization Example 2: Avoid functions on columns in WHERE
-- ❌ SLOW: Function on column prevents index usage
SELECT order_id, customer_id, total_amount
FROM orders
WHERE YEAR(order_date) = 2024 AND MONTH(order_date) = 6;

-- ✅ FAST: Range condition allows index usage
SELECT order_id, customer_id, total_amount
FROM orders
WHERE order_date >= '2024-06-01' AND order_date < '2024-07-01';

-- Optimization Example 3: Optimize OR conditions
-- ❌ SLOW: OR conditions can't use indexes efficiently
SELECT product_id, product_name, price
FROM products
WHERE product_name LIKE '%laptop%' OR description LIKE '%laptop%';

-- ✅ FAST: Use UNION for better index usage
SELECT product_id, product_name, price
FROM products
WHERE product_name LIKE '%laptop%'
UNION
SELECT product_id, product_name, price
FROM products
WHERE description LIKE '%laptop%' AND product_name NOT LIKE '%laptop%';

-- ✅ BETTER: Use full-text search if available
SELECT product_id, product_name, price
FROM products
WHERE MATCH(product_name, description) AGAINST('laptop' IN NATURAL LANGUAGE MODE);
```

### Complex Query Optimization

```sql
-- Before optimization: Inefficient customer analysis
-- ❌ SLOW: Multiple subqueries and inefficient grouping
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.customer_id) AS order_count,
    (SELECT SUM(total_amount) FROM orders o WHERE o.customer_id = c.customer_id) AS total_spent,
    (SELECT MAX(order_date) FROM orders o WHERE o.customer_id = c.customer_id) AS last_order,
    (SELECT AVG(total_amount) FROM orders o WHERE o.customer_id = c.customer_id) AS avg_order_value
FROM customers c
WHERE c.is_active = TRUE
ORDER BY total_spent DESC;

-- ✅ OPTIMIZED: Single JOIN with aggregation
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    COUNT(o.order_id) AS order_count,
    COALESCE(SUM(o.total_amount), 0) AS total_spent,
    MAX(o.order_date) AS last_order,
    COALESCE(AVG(o.total_amount), 0) AS avg_order_value
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
WHERE c.is_active = TRUE
GROUP BY c.customer_id, c.first_name, c.last_name
ORDER BY total_spent DESC;

-- Advanced optimization: Materialized view pattern
-- For frequently accessed customer metrics
CREATE TABLE customer_metrics_cache (
    customer_id BIGINT PRIMARY KEY,
    order_count INT NOT NULL DEFAULT 0,
    total_spent DECIMAL(15,2) NOT NULL DEFAULT 0,
    avg_order_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    last_order_date DATE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    INDEX idx_metrics_total_spent (total_spent),
    INDEX idx_metrics_last_order (last_order_date)
);

-- Incremental update procedure
DELIMITER //

CREATE PROCEDURE UpdateCustomerMetrics(IN customer_id_param BIGINT)
BEGIN
    INSERT INTO customer_metrics_cache (
        customer_id, order_count, total_spent, avg_order_value, last_order_date
    )
    SELECT
        customer_id_param,
        COUNT(order_id),
        COALESCE(SUM(total_amount), 0),
        COALESCE(AVG(total_amount), 0),
        MAX(order_date)
    FROM orders
    WHERE customer_id = customer_id_param
    ON DUPLICATE KEY UPDATE
        order_count = VALUES(order_count),
        total_spent = VALUES(total_spent),
        avg_order_value = VALUES(avg_order_value),
        last_order_date = VALUES(last_order_date);
END //

DELIMITER ;
```

### Pagination Optimization

```sql
-- ❌ SLOW: OFFSET/LIMIT for large datasets
SELECT product_id, product_name, price
FROM products
ORDER BY product_id
LIMIT 50000, 20; -- Very slow for large offsets

-- ✅ FAST: Cursor-based pagination
-- First page
SELECT product_id, product_name, price
FROM products
WHERE is_active = TRUE
ORDER BY product_id
LIMIT 20;

-- Subsequent pages (using last seen ID)
SELECT product_id, product_name, price
FROM products
WHERE product_id > 12345 -- Last ID from previous page
    AND is_active = TRUE
ORDER BY product_id
LIMIT 20;

-- Complex pagination with sorting
-- For sorting by non-unique columns
SELECT
    product_id,
    product_name,
    price,
    created_at
FROM products
WHERE (created_at, product_id) > ('2024-01-15 10:30:00', 12345)
    AND is_active = TRUE
ORDER BY created_at, product_id
LIMIT 20;

-- Pagination helper function
DELIMITER //

CREATE PROCEDURE GetProductsPaginated(
    IN last_product_id BIGINT,
    IN last_created_at TIMESTAMP,
    IN page_size INT DEFAULT 20,
    IN category_filter INT DEFAULT NULL
)
BEGIN
    DECLARE where_clause TEXT DEFAULT 'WHERE is_active = TRUE';
    DECLARE sql_query TEXT;

    -- Add cursor condition
    IF last_product_id IS NOT NULL THEN
        SET where_clause = CONCAT(
            where_clause,
            ' AND (created_at, product_id) > (''',
            last_created_at,
            ''', ',
            last_product_id,
            ')'
        );
    END IF;

    -- Add category filter
    IF category_filter IS NOT NULL THEN
        SET where_clause = CONCAT(where_clause, ' AND category_id = ', category_filter);
    END IF;

    SET sql_query = CONCAT(
        'SELECT product_id, product_name, price, created_at, category_id ',
        'FROM products ',
        where_clause, ' ',
        'ORDER BY created_at, product_id ',
        'LIMIT ', page_size
    );

    SET @sql = sql_query;
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END //

DELIMITER ;

-- Usage
CALL GetProductsPaginated(NULL, NULL, 20, 1); -- First page
CALL GetProductsPaginated(1250, '2024-01-15 14:30:00', 20, 1); -- Next page
```

**📊 Query Optimization Checklist:**

✅ **Optimization Techniques:**

- Use appropriate indexes
- Avoid functions on columns in WHERE clauses
- Use EXISTS instead of IN for subqueries
- Implement cursor-based pagination
- Cache frequently calculated values
- Use appropriate JOIN types

❌ **Performance Killers:**

- SELECT \* in production queries
- Unindexed WHERE conditions
- Cartesian products (missing JOIN conditions)
- Functions in WHERE clauses
- Large OFFSET values in pagination

---

## Index Strategies & Performance

### Comprehensive Indexing Strategy

```sql
-- Primary table with strategic indexes
CREATE TABLE orders_optimized (
    order_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_id BIGINT NOT NULL,
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(12,2) NOT NULL,
    shipping_method VARCHAR(50),
    estimated_delivery DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign key index (automatically created in many databases)
    INDEX idx_orders_customer (customer_id),

    -- Composite indexes for common query patterns
    INDEX idx_orders_customer_date (customer_id, order_date),
    INDEX idx_orders_status_date (status, order_date),
    INDEX idx_orders_date_status (order_date, status),
    INDEX idx_orders_amount_date (total_amount, order_date),

    -- Covering index for order summary queries
    INDEX idx_orders_summary_covering (customer_id, order_date, status, total_amount),

    -- Partial index for active orders only (MySQL 8.0+)
    INDEX idx_orders_active_date (order_date) WHERE status NOT IN ('delivered', 'cancelled'),

    -- Functional index for year-based queries (MySQL 8.0+)
    INDEX idx_orders_year ((YEAR(order_date))),

    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- Multi-column index for complex queries
CREATE TABLE sales_analytics_optimized (
    sale_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    salesperson_id INT NOT NULL,
    region VARCHAR(50) NOT NULL,
    sale_date DATE NOT NULL,
    sale_amount DECIMAL(12,2) NOT NULL,
    commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.05,

    -- Indexes for different query patterns

    -- Sales by customer analysis
    INDEX idx_sales_customer_date_amount (customer_id, sale_date, sale_amount),

    -- Salesperson performance
    INDEX idx_sales_person_date_amount (salesperson_id, sale_date, sale_amount),

    -- Regional analysis
    INDEX idx_sales_region_date_amount (region, sale_date, sale_amount),

    -- Product performance
    INDEX idx_sales_product_date_amount (product_id, sale_date, sale_amount),

    -- Time-series analysis
    INDEX idx_sales_date_region_person (sale_date, region, salesperson_id),

    -- Covering index for summary reports
    INDEX idx_sales_summary_covering (sale_date, region, salesperson_id, sale_amount, commission_rate),

    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
```

### Index Optimization Patterns

```sql
-- Query-specific index optimization
-- Query 1: Find top customers by total spending in date range
-- Optimized index for this specific pattern
CREATE INDEX idx_orders_customer_spending ON orders_optimized (
    customer_id,
    order_date,
    total_amount DESC
) WHERE status = 'delivered';

-- The query that benefits from this index
SELECT
    customer_id,
    SUM(total_amount) AS total_spent,
    COUNT(*) AS order_count
FROM orders_optimized
WHERE order_date >= '2024-01-01'
    AND order_date < '2025-01-01'
    AND status = 'delivered'
GROUP BY customer_id
ORDER BY total_spent DESC
LIMIT 10;

-- Query 2: Monthly sales trends by region
-- Composite index optimized for temporal + regional analysis
CREATE INDEX idx_sales_monthly_regional ON sales_analytics_optimized (
    YEAR(sale_date),
    MONTH(sale_date),
    region,
    sale_amount
);

-- Index usage monitoring queries
-- Find unused indexes (MySQL)
SELECT
    s.TABLE_SCHEMA,
    s.TABLE_NAME,
    s.INDEX_NAME,
    s.CARDINALITY,
    IFNULL(t.rows_examined, 0) AS rows_examined
FROM information_schema.STATISTICS s
LEFT JOIN (
    SELECT
        object_schema,
        object_name,
        index_name,
        count_read AS rows_examined
    FROM performance_schema.table_io_waits_summary_by_index_usage
) t ON s.TABLE_SCHEMA = t.object_schema
    AND s.TABLE_NAME = t.object_name
    AND s.INDEX_NAME = t.index_name
WHERE s.TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
    AND s.INDEX_NAME != 'PRIMARY'
ORDER BY rows_examined ASC;

-- Index effectiveness analysis
SELECT
    TABLE_SCHEMA,
    TABLE_NAME,
    INDEX_NAME,
    CARDINALITY,
    CARDINALITY / (
        SELECT TABLE_ROWS
        FROM information_schema.TABLES t
        WHERE t.TABLE_SCHEMA = s.TABLE_SCHEMA
            AND t.TABLE_NAME = s.TABLE_NAME
    ) * 100 AS selectivity_percent
FROM information_schema.STATISTICS s
WHERE TABLE_SCHEMA = 'your_database'
    AND INDEX_NAME != 'PRIMARY'
ORDER BY selectivity_percent DESC;
```

### Advanced Index Techniques

```sql
-- Partial indexes for specific conditions
CREATE TABLE user_sessions_optimized (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent_hash CHAR(32),

    -- Regular indexes
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_activity (last_activity),

    -- Partial index for active sessions only
    INDEX idx_sessions_active_user (user_id, last_activity) WHERE is_active = TRUE,

    -- Partial index for recent activity
    INDEX idx_sessions_recent (user_id, created_at)
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY),

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Expression-based indexes
CREATE TABLE products_search_optimized (
    product_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id INT NOT NULL,
    brand VARCHAR(100),

    -- Regular indexes
    INDEX idx_products_price (price),
    INDEX idx_products_category (category_id),

    -- Expression indexes (MySQL 8.0+)
    INDEX idx_products_name_lower ((LOWER(product_name))),
    INDEX idx_products_brand_lower ((LOWER(brand))),
    INDEX idx_products_price_range ((
        CASE
            WHEN price < 10 THEN 'budget'
            WHEN price < 100 THEN 'mid-range'
            WHEN price < 1000 THEN 'premium'
            ELSE 'luxury'
        END
    )),

    -- JSON indexes for structured data
    INDEX idx_products_features ((CAST(features->>'$.weight' AS DECIMAL(8,3)))),
    INDEX idx_products_category_features ((category_id, CAST(features->>'$.warranty_months' AS UNSIGNED))),

    -- Full-text indexes
    FULLTEXT INDEX idx_products_fulltext (product_name, description),

    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Usage examples that benefit from expression indexes
-- This query uses the LOWER() index
SELECT product_id, product_name, price
FROM products_search_optimized
WHERE LOWER(product_name) LIKE LOWER('%Gaming Laptop%');

-- This query uses the price range index
SELECT category_id, COUNT(*) AS product_count
FROM products_search_optimized
WHERE (
    CASE
        WHEN price < 10 THEN 'budget'
        WHEN price < 100 THEN 'mid-range'
        WHEN price < 1000 THEN 'premium'
        ELSE 'luxury'
    END
) = 'premium'
GROUP BY category_id;
```

### Index Maintenance and Monitoring

```sql
-- Index maintenance procedures
DELIMITER //

CREATE PROCEDURE AnalyzeIndexUsage()
BEGIN
    -- Create temporary table for analysis
    DROP TEMPORARY TABLE IF EXISTS temp_index_analysis;

    CREATE TEMPORARY TABLE temp_index_analysis (
        table_name VARCHAR(100),
        index_name VARCHAR(100),
        cardinality BIGINT,
        rows_examined BIGINT,
        efficiency_score DECIMAL(10,4),
        recommendation VARCHAR(200)
    );

    -- Analyze each index
    INSERT INTO temp_index_analysis
    SELECT
        s.TABLE_NAME,
        s.INDEX_NAME,
        s.CARDINALITY,
        COALESCE(u.count_read, 0) AS rows_examined,
        CASE
            WHEN COALESCE(u.count_read, 0) = 0 THEN 0
            ELSE s.CARDINALITY / GREATEST(COALESCE(u.count_read, 1), 1)
        END AS efficiency_score,
        CASE
            WHEN COALESCE(u.count_read, 0) = 0 THEN 'Consider dropping - unused'
            WHEN s.CARDINALITY < 100 THEN 'Low cardinality - review necessity'
            WHEN s.CARDINALITY / GREATEST(COALESCE(u.count_read, 1), 1) < 0.1 THEN 'Low efficiency - optimize'
            ELSE 'Good performance'
        END AS recommendation
    FROM information_schema.STATISTICS s
    LEFT JOIN performance_schema.table_io_waits_summary_by_index_usage u
        ON s.TABLE_SCHEMA = u.object_schema
        AND s.TABLE_NAME = u.object_name
        AND s.INDEX_NAME = u.index_name
    WHERE s.TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
        AND s.INDEX_NAME != 'PRIMARY';

    -- Return analysis results
    SELECT * FROM temp_index_analysis
    ORDER BY efficiency_score DESC, rows_examined DESC;

END //

-- Automated index optimization suggestions
CREATE PROCEDURE SuggestIndexOptimizations()
BEGIN
    SELECT
        'Missing Index' AS issue_type,
        CONCAT('Consider adding index on ', table_name, '(', column_name, ')') AS suggestion,
        'High' AS priority
    FROM (
        SELECT DISTINCT
            t.TABLE_NAME as table_name,
            c.COLUMN_NAME as column_name
        FROM information_schema.TABLES t
        INNER JOIN information_schema.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
        WHERE t.TABLE_SCHEMA = DATABASE()
            AND c.COLUMN_NAME IN ('created_at', 'updated_at', 'status', 'user_id', 'customer_id')
            AND NOT EXISTS (
                SELECT 1 FROM information_schema.STATISTICS s
                WHERE s.TABLE_NAME = t.TABLE_NAME
                    AND s.COLUMN_NAME = c.COLUMN_NAME
                    AND s.TABLE_SCHEMA = DATABASE()
            )
    ) missing_indexes

    UNION ALL

    SELECT
        'Duplicate Index' AS issue_type,
        CONCAT('Consider dropping duplicate index: ', INDEX_NAME, ' on ', TABLE_NAME) AS suggestion,
        'Medium' AS priority
    FROM (
        SELECT
            s1.TABLE_NAME,
            s1.INDEX_NAME,
            GROUP_CONCAT(s1.COLUMN_NAME ORDER BY s1.SEQ_IN_INDEX) AS columns1,
            s2.INDEX_NAME AS duplicate_index,
            GROUP_CONCAT(s2.COLUMN_NAME ORDER BY s2.SEQ_IN_INDEX) AS columns2
        FROM information_schema.STATISTICS s1
        INNER JOIN information_schema.STATISTICS s2
            ON s1.TABLE_SCHEMA = s2.TABLE_SCHEMA
            AND s1.TABLE_NAME = s2.TABLE_NAME
            AND s1.INDEX_NAME < s2.INDEX_NAME
        WHERE s1.TABLE_SCHEMA = DATABASE()
        GROUP BY s1.TABLE_NAME, s1.INDEX_NAME, s2.INDEX_NAME
        HAVING columns1 = columns2
    ) duplicates;

END //

DELIMITER ;

-- Usage
CALL AnalyzeIndexUsage();
CALL SuggestIndexOptimizations();
```

**📊 Index Strategy Guidelines:**

| Query Pattern        | Index Strategy                    | Example                                            |
| -------------------- | --------------------------------- | -------------------------------------------------- |
| **Equality WHERE**   | Single column index               | `WHERE customer_id = 123`                          |
| **Range queries**    | Composite index (equality first)  | `WHERE customer_id = 123 AND date >= '2024-01-01'` |
| **ORDER BY**         | Include ORDER BY columns in index | `WHERE status = 'active' ORDER BY created_at`      |
| **GROUP BY**         | Cover WHERE + GROUP BY columns    | `WHERE region = 'US' GROUP BY product_id`          |
| **Covering queries** | Include SELECT columns in index   | All columns in SELECT, WHERE, ORDER BY             |

---

## Summary & Best Practices

### 🎯 Key Takeaways

✅ **Window Functions**: Powerful analytics without complex subqueries  
✅ **Stored Procedures**: Encapsulate complex business logic  
✅ **Query Optimization**: Rewrite queries for better performance  
✅ **Strategic Indexing**: Index design drives query performance  
✅ **Execution Plans**: Understand and analyze query execution

### 📈 Performance Optimization Process

1. **Identify Bottlenecks**

   - Monitor slow query logs
   - Analyze execution plans
   - Measure actual performance

2. **Optimize Systematically**

   - Start with the most impactful queries
   - Apply indexing strategies
   - Rewrite inefficient queries

3. **Monitor and Iterate**
   - Track performance improvements
   - Monitor index usage
   - Adjust based on changing patterns

### ⚠️ Common Performance Pitfalls

- **Over-indexing**: Too many indexes slow down writes
- **Under-indexing**: Missing critical indexes for frequent queries
- **Function abuse**: Using functions on columns in WHERE clauses
- **Ignoring execution plans**: Not understanding how queries execute
- **Poor JOIN order**: Database optimizer sometimes needs hints

**📈 Next Steps:**
Ready to scale your databases? Continue with [Database Architecture & Scaling](./04-database-architecture-scaling.md) to learn about replication, sharding, and high-availability patterns.

---

_💡 Pro Tip: Performance optimization is an iterative process. Start with measuring, identify the biggest bottlenecks, apply targeted optimizations, and measure again. The 80/20 rule applies - focus on the 20% of queries that consume 80% of your resources._
