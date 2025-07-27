# Database Design & Normalization 🎨

Master the art and science of database design with entity-relationship modeling, normalization principles, and schema design patterns for scalable applications.

## Table of Contents

- [Entity-Relationship Modeling](#entity-relationship-modeling)
- [Normalization Forms (1NF to 5NF)](#normalization-forms-1nf-to-5nf)
- [Denormalization Strategies](#denormalization-strategies)
- [Constraints & Data Integrity](#constraints--data-integrity)
- [Schema Design Patterns](#schema-design-patterns)

---

## Entity-Relationship Modeling

### Understanding Entities and Relationships

ER modeling visualizes data structure and relationships before implementation, ensuring robust database design.

```sql
-- E-commerce Platform ER Implementation
CREATE TABLE customers (
    customer_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_customers_email (email),
    INDEX idx_customers_name (last_name, first_name),
    CHECK (CHAR_LENGTH(first_name) >= 1),
    CHECK (date_of_birth IS NULL OR date_of_birth <= CURDATE())
);

CREATE TABLE categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_category_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (parent_category_id) REFERENCES categories(category_id),
    INDEX idx_categories_parent (parent_category_id),
    INDEX idx_categories_active (is_active)
);

CREATE TABLE products (
    product_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sku VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    min_stock_level INT DEFAULT 5,
    weight DECIMAL(8,3),
    dimensions JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    INDEX idx_products_category (category_id),
    INDEX idx_products_active_price (is_active, price),
    INDEX idx_products_stock (stock_quantity),
    FULLTEXT idx_products_search (product_name, description),

    CHECK (price >= 0),
    CHECK (cost >= 0),
    CHECK (stock_quantity >= 0),
    CHECK (min_stock_level >= 0)
);

-- Many-to-Many: Product Categories (if products can belong to multiple categories)
CREATE TABLE product_categories (
    product_id BIGINT NOT NULL,
    category_id INT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (product_id, category_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE,

    INDEX idx_product_categories_category (category_id)
);
```

### Relationship Types and Cardinality

```sql
-- One-to-One: Customer Profile Extension
CREATE TABLE customer_profiles (
    customer_id BIGINT PRIMARY KEY,
    bio TEXT,
    profile_image_url VARCHAR(500),
    social_media JSON,
    preferences JSON,
    marketing_opt_in BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
);

-- One-to-Many: Customer Orders
CREATE TABLE orders (
    order_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_id BIGINT NOT NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    shipping_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) GENERATED ALWAYS AS (subtotal + tax_amount + shipping_cost) STORED,
    shipping_address JSON NOT NULL,
    billing_address JSON NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shipped_date TIMESTAMP NULL,
    delivered_date TIMESTAMP NULL,

    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    INDEX idx_orders_customer (customer_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_date (order_date),
    INDEX idx_orders_number (order_number)
);

-- Weak Entity: Order Items (depends on Order)
CREATE TABLE order_items (
    order_item_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    line_total DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price - discount_amount) STORED,

    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    INDEX idx_order_items_order (order_id),
    INDEX idx_order_items_product (product_id),

    CHECK (quantity > 0),
    CHECK (unit_price >= 0),
    CHECK (discount_amount >= 0)
);

-- Many-to-Many with Attributes: Product Reviews
CREATE TABLE product_reviews (
    review_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    rating INT NOT NULL,
    title VARCHAR(200),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    helpful_votes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,

    UNIQUE KEY unique_customer_product_review (customer_id, product_id),
    INDEX idx_reviews_product (product_id),
    INDEX idx_reviews_customer (customer_id),
    INDEX idx_reviews_rating (rating),

    CHECK (rating BETWEEN 1 AND 5)
);
```

**📊 ER Modeling Best Practices:**

✅ **Do:**

- Identify entities, attributes, and relationships clearly
- Use meaningful, consistent naming conventions
- Consider future requirements and extensibility
- Document business rules and constraints
- Validate with stakeholders before implementation

❌ **Don't:**

- Mix different abstraction levels in single entity
- Create overly complex many-to-many relationships
- Ignore data lifecycle and archival needs
- Design without understanding query patterns
- Skip foreign key relationships for "performance"

---

## Normalization Forms (1NF to 5NF)

### First Normal Form (1NF)

Eliminates repeating groups and ensures atomic values.

```sql
-- ❌ BAD: Violates 1NF (non-atomic values, repeating groups)
CREATE TABLE bad_customer_orders (
    customer_id INT PRIMARY KEY,
    customer_name VARCHAR(100),
    phone_numbers TEXT, -- "555-1234, 555-5678" - Not atomic!
    order_info TEXT,    -- "Order1:100.00,Order2:150.00" - Repeating groups!
    total_spent DECIMAL(10,2)
);

-- ✅ GOOD: 1NF Compliant (atomic values, no repeating groups)
CREATE TABLE customers_1nf (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_phones (
    phone_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    phone_type ENUM('mobile', 'home', 'work') NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (customer_id) REFERENCES customers_1nf(customer_id) ON DELETE CASCADE,
    INDEX idx_phones_customer (customer_id)
);

CREATE TABLE orders_1nf (
    order_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    order_amount DECIMAL(12,2) NOT NULL,
    order_date DATE NOT NULL,

    FOREIGN KEY (customer_id) REFERENCES customers_1nf(customer_id),
    INDEX idx_orders_customer (customer_id),
    INDEX idx_orders_date (order_date)
);
```

### Second Normal Form (2NF)

Eliminates partial dependencies on composite primary keys.

```sql
-- ❌ BAD: Violates 2NF (partial dependencies on composite key)
CREATE TABLE bad_order_products (
    order_id BIGINT,
    product_id BIGINT,
    customer_name VARCHAR(100), -- Depends only on order_id (via customer)
    product_name VARCHAR(200),  -- Depends only on product_id
    product_price DECIMAL(10,2), -- Depends only on product_id
    quantity INT,
    order_date DATE, -- Depends only on order_id

    PRIMARY KEY (order_id, product_id)
);

-- ✅ GOOD: 2NF Compliant (remove partial dependencies)
CREATE TABLE orders_2nf (
    order_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    order_date DATE NOT NULL,
    total_amount DECIMAL(12,2),

    FOREIGN KEY (customer_id) REFERENCES customers_1nf(customer_id)
);

CREATE TABLE products_2nf (
    product_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_name VARCHAR(200) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    description TEXT
);

CREATE TABLE order_items_2nf (
    order_id BIGINT,
    product_id BIGINT,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL, -- Price at time of order

    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES orders_2nf(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products_2nf(product_id)
);
```

### Third Normal Form (3NF)

Eliminates transitive dependencies.

```sql
-- ❌ BAD: Violates 3NF (transitive dependencies)
CREATE TABLE bad_employees (
    employee_id INT PRIMARY KEY,
    employee_name VARCHAR(100),
    department_id INT,
    department_name VARCHAR(100), -- Transitively dependent via department_id
    department_budget DECIMAL(12,2), -- Transitively dependent via department_id
    employee_salary DECIMAL(10,2)
);

-- ✅ GOOD: 3NF Compliant (eliminate transitive dependencies)
CREATE TABLE departments (
    department_id INT PRIMARY KEY AUTO_INCREMENT,
    department_name VARCHAR(100) UNIQUE NOT NULL,
    budget DECIMAL(12,2) NOT NULL,
    location VARCHAR(100),
    manager_id INT,

    INDEX idx_departments_name (department_name)
);

CREATE TABLE employees (
    employee_id INT PRIMARY KEY AUTO_INCREMENT,
    employee_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    department_id INT NOT NULL,
    salary DECIMAL(10,2) NOT NULL,
    hire_date DATE NOT NULL,

    FOREIGN KEY (department_id) REFERENCES departments(department_id),
    INDEX idx_employees_department (department_id),
    INDEX idx_employees_hire_date (hire_date)
);

-- Add manager reference after employees table exists
ALTER TABLE departments
ADD CONSTRAINT fk_department_manager
FOREIGN KEY (manager_id) REFERENCES employees(employee_id);
```

### Boyce-Codd Normal Form (BCNF)

Every determinant must be a candidate key.

```sql
-- Example: Course Scheduling
-- ❌ BAD: Violates BCNF
CREATE TABLE bad_course_schedule (
    student_id INT,
    course_id INT,
    instructor_id INT,
    semester VARCHAR(20),

    PRIMARY KEY (student_id, course_id),
    -- Violation: instructor_id → course_id (instructor determines course)
    -- But instructor_id is not a candidate key for this table
);

-- ✅ GOOD: BCNF Compliant
CREATE TABLE courses (
    course_id INT PRIMARY KEY AUTO_INCREMENT,
    course_code VARCHAR(20) UNIQUE NOT NULL,
    course_name VARCHAR(200) NOT NULL,
    credits INT NOT NULL,
    department VARCHAR(100) NOT NULL,

    CHECK (credits > 0)
);

CREATE TABLE instructors (
    instructor_id INT PRIMARY KEY AUTO_INCREMENT,
    instructor_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL
);

CREATE TABLE course_sections (
    section_id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    instructor_id INT NOT NULL,
    semester VARCHAR(20) NOT NULL,
    room VARCHAR(20),
    schedule_time VARCHAR(50),
    max_students INT DEFAULT 30,

    FOREIGN KEY (course_id) REFERENCES courses(course_id),
    FOREIGN KEY (instructor_id) REFERENCES instructors(instructor_id),

    UNIQUE KEY unique_instructor_semester_time (instructor_id, semester, schedule_time),
    INDEX idx_sections_course (course_id),
    INDEX idx_sections_semester (semester)
);

CREATE TABLE student_enrollments (
    student_id INT,
    section_id INT,
    enrollment_date DATE,
    grade VARCHAR(2),

    PRIMARY KEY (student_id, section_id),
    FOREIGN KEY (section_id) REFERENCES course_sections(section_id),
    INDEX idx_enrollments_section (section_id)
);
```

### Fourth Normal Form (4NF)

Eliminates multi-valued dependencies.

```sql
-- ❌ BAD: Violates 4NF (multi-valued dependencies)
CREATE TABLE bad_employee_skills_projects (
    employee_id INT,
    skill VARCHAR(100),
    project_id INT,

    PRIMARY KEY (employee_id, skill, project_id)
    -- Problem: Skills and Projects are independent multi-valued dependencies
);

-- ✅ GOOD: 4NF Compliant (separate multi-valued dependencies)
CREATE TABLE employee_skills (
    employee_id INT,
    skill_name VARCHAR(100),
    proficiency_level ENUM('beginner', 'intermediate', 'advanced', 'expert'),
    years_experience DECIMAL(3,1),

    PRIMARY KEY (employee_id, skill_name),
    INDEX idx_skills_employee (employee_id),
    INDEX idx_skills_proficiency (proficiency_level)
);

CREATE TABLE project_assignments (
    employee_id INT,
    project_id INT,
    role VARCHAR(100),
    start_date DATE,
    end_date DATE,
    allocation_percentage DECIMAL(5,2),

    PRIMARY KEY (employee_id, project_id),
    INDEX idx_assignments_employee (employee_id),
    INDEX idx_assignments_project (project_id),

    CHECK (allocation_percentage > 0 AND allocation_percentage <= 100)
);
```

### Fifth Normal Form (5NF)

Eliminates join dependencies.

```sql
-- Complex Business Rule: Supplier-Part-Project relationships
-- A supplier can supply a part for a project only if all three conditions exist:
-- 1. Supplier supplies that part
-- 2. Project uses that part
-- 3. Supplier is approved for that project

CREATE TABLE suppliers (
    supplier_id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_name VARCHAR(200) NOT NULL,
    contact_email VARCHAR(100),
    rating DECIMAL(3,2),

    CHECK (rating >= 1.0 AND rating <= 5.0)
);

CREATE TABLE parts (
    part_id INT PRIMARY KEY AUTO_INCREMENT,
    part_number VARCHAR(50) UNIQUE NOT NULL,
    part_name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    standard_price DECIMAL(10,2)
);

CREATE TABLE projects (
    project_id INT PRIMARY KEY AUTO_INCREMENT,
    project_name VARCHAR(200) NOT NULL,
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2)
);

-- ✅ GOOD: 5NF Compliant (decomposed into binary relationships)
CREATE TABLE supplier_parts (
    supplier_id INT,
    part_id INT,
    supplier_price DECIMAL(10,2),
    lead_time_days INT,

    PRIMARY KEY (supplier_id, part_id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
    FOREIGN KEY (part_id) REFERENCES parts(part_id)
);

CREATE TABLE project_parts (
    project_id INT,
    part_id INT,
    required_quantity INT,
    target_date DATE,

    PRIMARY KEY (project_id, part_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id),
    FOREIGN KEY (part_id) REFERENCES parts(part_id)
);

CREATE TABLE project_suppliers (
    project_id INT,
    supplier_id INT,
    approved_date DATE,
    contract_end_date DATE,

    PRIMARY KEY (project_id, supplier_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

-- Valid combinations view (derived from the three relationships)
CREATE VIEW valid_supply_relationships AS
SELECT DISTINCT
    sp.supplier_id,
    sp.part_id,
    ps.project_id,
    sp.supplier_price,
    sp.lead_time_days,
    pp.required_quantity
FROM supplier_parts sp
INNER JOIN project_parts pp ON sp.part_id = pp.part_id
INNER JOIN project_suppliers ps ON sp.supplier_id = ps.supplier_id
    AND pp.project_id = ps.project_id
WHERE ps.approved_date <= CURDATE()
    AND (ps.contract_end_date IS NULL OR ps.contract_end_date >= CURDATE());
```

**📊 Normalization Guidelines:**

| Normal Form | Purpose                               | Use When                              | Avoid When                      |
| ----------- | ------------------------------------- | ------------------------------------- | ------------------------------- |
| **1NF-3NF** | Eliminate basic redundancy            | OLTP systems, data integrity critical | Heavy read workloads, reporting |
| **BCNF**    | Eliminate all functional dependencies | Scientific data, strict rules         | Complex business logic          |
| **4NF-5NF** | Eliminate complex dependencies        | Regulatory compliance                 | Most business applications      |

---

## Denormalization Strategies

### Strategic Denormalization for Performance

```sql
-- Scenario: E-commerce Order Processing
-- Normalized approach (multiple JOINs required)
CREATE TABLE normalized_orders (
    order_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_id BIGINT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'processing', 'shipped', 'delivered'),

    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- Denormalized approach (faster queries, strategic redundancy)
CREATE TABLE denormalized_orders (
    order_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_id BIGINT NOT NULL,

    -- Denormalized customer data (snapshot at order time)
    customer_name VARCHAR(200) NOT NULL,
    customer_email VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20),

    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'processing', 'shipped', 'delivered'),

    -- Pre-calculated totals
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    shipping_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) GENERATED ALWAYS AS (subtotal + tax_amount + shipping_cost) STORED,
    item_count INT NOT NULL DEFAULT 0,

    -- Address snapshots (prevents changes affecting historical orders)
    shipping_address JSON NOT NULL,
    billing_address JSON NOT NULL,

    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    INDEX idx_denorm_orders_customer_date (customer_id, order_date),
    INDEX idx_denorm_orders_status_date (status, order_date),
    INDEX idx_denorm_orders_total (total_amount)
);

-- Maintain denormalized data with triggers
DELIMITER //

CREATE TRIGGER update_order_totals_after_item_change
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    UPDATE denormalized_orders
    SET subtotal = (
            SELECT COALESCE(SUM(quantity * unit_price - discount_amount), 0)
            FROM order_items
            WHERE order_id = NEW.order_id
        ),
        item_count = (
            SELECT COUNT(*)
            FROM order_items
            WHERE order_id = NEW.order_id
        )
    WHERE order_id = NEW.order_id;
END //

DELIMITER ;
```

### Read-Optimized Denormalization

```sql
-- Product catalog with denormalized category hierarchy
CREATE TABLE products_with_category_path (
    product_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sku VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(200) NOT NULL,

    -- Denormalized category information
    category_id INT NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    parent_category_id INT,
    parent_category_name VARCHAR(100),
    root_category_id INT,
    root_category_name VARCHAR(100),
    category_path VARCHAR(500), -- "Electronics > Computers > Laptops"

    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0,
    review_count INT DEFAULT 0,

    -- Calculated fields for performance
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    final_price DECIMAL(10,2) GENERATED ALWAYS AS (price * (100 - discount_percentage) / 100) STORED,
    in_stock BOOLEAN GENERATED ALWAYS AS (stock_quantity > 0) STORED,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_products_category_price (category_id, final_price),
    INDEX idx_products_rating (avg_rating DESC),
    INDEX idx_products_stock (in_stock, stock_quantity),
    INDEX idx_products_path (category_path),
    FULLTEXT idx_products_search (product_name, category_path)
);

-- Summary tables for analytics
CREATE TABLE daily_sales_summary (
    summary_date DATE PRIMARY KEY,
    total_orders INT NOT NULL DEFAULT 0,
    total_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_items_sold INT NOT NULL DEFAULT 0,
    unique_customers INT NOT NULL DEFAULT 0,
    avg_order_value DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- Top categories
    top_category_1 VARCHAR(100),
    top_category_1_revenue DECIMAL(12,2),
    top_category_2 VARCHAR(100),
    top_category_2_revenue DECIMAL(12,2),
    top_category_3 VARCHAR(100),
    top_category_3_revenue DECIMAL(12,2),

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_daily_summary_date (summary_date),
    INDEX idx_daily_summary_revenue (total_revenue)
);
```

### Materialized Views Pattern

```sql
-- Customer analytics materialized as table
CREATE TABLE customer_analytics (
    customer_id BIGINT PRIMARY KEY,

    -- Order statistics
    total_orders INT NOT NULL DEFAULT 0,
    total_spent DECIMAL(15,2) NOT NULL DEFAULT 0,
    avg_order_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    first_order_date DATE,
    last_order_date DATE,

    -- Behavioral data
    favorite_category VARCHAR(100),
    favorite_brand VARCHAR(100),
    preferred_payment_method VARCHAR(50),

    -- Calculated segments
    customer_lifetime_value DECIMAL(15,2),
    customer_segment ENUM('new', 'regular', 'vip', 'at_risk', 'churned'),
    days_since_last_order INT,

    -- Engagement metrics
    total_reviews INT DEFAULT 0,
    avg_review_rating DECIMAL(3,2),
    newsletter_subscriber BOOLEAN DEFAULT FALSE,

    last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_analytics_segment (customer_segment),
    INDEX idx_analytics_ltv (customer_lifetime_value),
    INDEX idx_analytics_last_order (last_order_date)
);

-- Batch job to refresh materialized view
DELIMITER //

CREATE PROCEDURE refresh_customer_analytics()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_customer_id BIGINT;

    DECLARE customer_cursor CURSOR FOR
        SELECT DISTINCT customer_id FROM orders
        WHERE order_date >= DATE_SUB(NOW(), INTERVAL 1 DAY);

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN customer_cursor;

    customer_loop: LOOP
        FETCH customer_cursor INTO v_customer_id;
        IF done THEN
            LEAVE customer_loop;
        END IF;

        INSERT INTO customer_analytics (
            customer_id,
            total_orders,
            total_spent,
            avg_order_value,
            first_order_date,
            last_order_date,
            customer_lifetime_value,
            days_since_last_order
        )
        SELECT
            o.customer_id,
            COUNT(*) as total_orders,
            SUM(o.total_amount) as total_spent,
            AVG(o.total_amount) as avg_order_value,
            MIN(o.order_date) as first_order_date,
            MAX(o.order_date) as last_order_date,
            SUM(o.total_amount) as customer_lifetime_value,
            DATEDIFF(NOW(), MAX(o.order_date)) as days_since_last_order
        FROM orders o
        WHERE o.customer_id = v_customer_id
            AND o.status = 'delivered'
        GROUP BY o.customer_id
        ON DUPLICATE KEY UPDATE
            total_orders = VALUES(total_orders),
            total_spent = VALUES(total_spent),
            avg_order_value = VALUES(avg_order_value),
            last_order_date = VALUES(last_order_date),
            customer_lifetime_value = VALUES(customer_lifetime_value),
            days_since_last_order = VALUES(days_since_last_order);

    END LOOP;

    CLOSE customer_cursor;

    -- Update customer segments based on calculated values
    UPDATE customer_analytics
    SET customer_segment = CASE
        WHEN days_since_last_order IS NULL THEN 'new'
        WHEN days_since_last_order <= 30 AND customer_lifetime_value >= 1000 THEN 'vip'
        WHEN days_since_last_order <= 90 THEN 'regular'
        WHEN days_since_last_order <= 365 THEN 'at_risk'
        ELSE 'churned'
    END;

END //

DELIMITER ;
```

**📊 Denormalization Decision Framework:**

| Factor                | Normalize         | Denormalize             |
| --------------------- | ----------------- | ----------------------- |
| **Query Patterns**    | Simple, few JOINs | Complex JOINs, frequent |
| **Update Frequency**  | High              | Low                     |
| **Data Consistency**  | Critical          | Eventual consistency OK |
| **Storage Cost**      | Constrained       | Abundant                |
| **Query Performance** | Acceptable        | Critical                |

---

## Constraints & Data Integrity

### Comprehensive Constraint Implementation

```sql
-- Financial system with extensive constraints
CREATE TABLE accounts (
    account_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    customer_id BIGINT NOT NULL,
    account_type ENUM('checking', 'savings', 'credit', 'investment') NOT NULL,
    balance DECIMAL(15,4) NOT NULL DEFAULT 0,
    credit_limit DECIMAL(15,4) DEFAULT 0,
    currency_code CHAR(3) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    opened_date DATE NOT NULL,
    closed_date DATE NULL,

    -- Foreign key constraints
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT,

    -- Check constraints for business rules
    CHECK (balance >= -credit_limit), -- Overdraft limit
    CHECK (credit_limit >= 0), -- Credit limit must be positive
    CHECK (currency_code REGEXP '^[A-Z]{3}$'), -- Valid currency format
    CHECK (opened_date <= CURDATE()), -- Cannot open future accounts
    CHECK (closed_date IS NULL OR closed_date >= opened_date), -- Logical date order
    CHECK (
        CASE account_type
            WHEN 'savings' THEN balance >= 0 -- Savings cannot go negative
            WHEN 'credit' THEN balance <= credit_limit -- Credit limit enforcement
            ELSE TRUE
        END
    ),

    -- Indexes for performance
    INDEX idx_accounts_customer (customer_id),
    INDEX idx_accounts_type_active (account_type, is_active),
    INDEX idx_accounts_number (account_number)
);

CREATE TABLE transactions (
    transaction_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_id BIGINT NOT NULL,
    transaction_type ENUM('deposit', 'withdrawal', 'transfer_out', 'transfer_in', 'fee', 'interest') NOT NULL,
    amount DECIMAL(15,4) NOT NULL,
    balance_after DECIMAL(15,4) NOT NULL,
    description VARCHAR(500),
    reference_transaction_id BIGINT NULL, -- For transfers
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    posted_date TIMESTAMP NULL,
    status ENUM('pending', 'posted', 'reversed') DEFAULT 'pending',

    FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE RESTRICT,
    FOREIGN KEY (reference_transaction_id) REFERENCES transactions(transaction_id),

    -- Business rule constraints
    CHECK (amount != 0), -- No zero transactions
    CHECK (transaction_date <= CURRENT_TIMESTAMP), -- No future transactions
    CHECK (posted_date IS NULL OR posted_date >= transaction_date), -- Logical posting order
    CHECK (
        CASE transaction_type
            WHEN 'transfer_out' THEN amount < 0 AND reference_transaction_id IS NOT NULL
            WHEN 'transfer_in' THEN amount > 0 AND reference_transaction_id IS NOT NULL
            WHEN 'deposit' THEN amount > 0
            WHEN 'withdrawal' THEN amount < 0
            WHEN 'fee' THEN amount < 0
            WHEN 'interest' THEN amount > 0
            ELSE TRUE
        END
    ),

    INDEX idx_transactions_account_date (account_id, transaction_date),
    INDEX idx_transactions_status (status),
    INDEX idx_transactions_reference (reference_transaction_id)
);
```

### Advanced Constraint Patterns

```sql
-- Temporal constraints and business rules
CREATE TABLE employee_positions (
    position_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    employee_id BIGINT NOT NULL,
    department_id INT NOT NULL,
    position_title VARCHAR(100) NOT NULL,
    salary DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    is_current BOOLEAN GENERATED ALWAYS AS (end_date IS NULL) STORED,

    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (department_id) REFERENCES departments(department_id),

    -- Temporal constraints
    CHECK (end_date IS NULL OR end_date > start_date),
    CHECK (start_date <= CURDATE()),
    CHECK (salary > 0),

    -- Business rule: Only one current position per employee
    UNIQUE KEY unique_current_position (employee_id, is_current) WHERE is_current = TRUE,

    -- No overlapping positions for same employee
    INDEX idx_positions_employee_dates (employee_id, start_date, end_date)
);

-- Inventory constraints with triggers
CREATE TABLE inventory_transactions (
    transaction_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    transaction_type ENUM('purchase', 'sale', 'adjustment', 'return') NOT NULL,
    quantity_change INT NOT NULL,
    unit_cost DECIMAL(10,2),
    reference_id BIGINT, -- Order ID, adjustment ID, etc.
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,

    FOREIGN KEY (product_id) REFERENCES products(product_id),
    INDEX idx_inventory_product_date (product_id, transaction_date),
    INDEX idx_inventory_reference (reference_id),

    CHECK (quantity_change != 0),
    CHECK (unit_cost IS NULL OR unit_cost >= 0)
);

-- Trigger to enforce inventory constraints
DELIMITER //

CREATE TRIGGER enforce_inventory_rules
BEFORE INSERT ON inventory_transactions
FOR EACH ROW
BEGIN
    DECLARE current_stock INT DEFAULT 0;
    DECLARE min_stock INT DEFAULT 0;
    DECLARE new_stock INT;

    -- Get current stock levels
    SELECT stock_quantity, min_stock_level
    INTO current_stock, min_stock
    FROM products
    WHERE product_id = NEW.product_id;

    -- Calculate new stock level
    SET new_stock = current_stock + NEW.quantity_change;

    -- Prevent negative stock (except for adjustments)
    IF new_stock < 0 AND NEW.transaction_type != 'adjustment' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient inventory for this transaction';
    END IF;

    -- Warning for low stock (could log to a warnings table)
    IF new_stock <= min_stock AND NEW.transaction_type = 'sale' THEN
        INSERT INTO inventory_alerts (product_id, alert_type, message, created_at)
        VALUES (NEW.product_id, 'low_stock',
                CONCAT('Product ', NEW.product_id, ' is below minimum stock level'),
                NOW());
    END IF;

END //

DELIMITER ;
```

### Data Quality Constraints

```sql
-- Customer data with comprehensive validation
CREATE TABLE customers_validated (
    customer_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE,
    gender ENUM('M', 'F', 'Other', 'PreferNotToSay'),

    -- Address fields with validation
    street_address VARCHAR(200),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country_code CHAR(2),

    -- Account status and metadata
    account_status ENUM('active', 'inactive', 'suspended', 'closed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,

    -- Comprehensive validation constraints
    CHECK (email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CHECK (phone IS NULL OR phone REGEXP '^[+]?[1-9]?[0-9]{7,15}$'),
    CHECK (CHAR_LENGTH(first_name) >= 1 AND CHAR_LENGTH(first_name) <= 50),
    CHECK (CHAR_LENGTH(last_name) >= 1 AND CHAR_LENGTH(last_name) <= 50),
    CHECK (date_of_birth IS NULL OR date_of_birth <= CURDATE()),
    CHECK (date_of_birth IS NULL OR date_of_birth >= DATE_SUB(CURDATE(), INTERVAL 120 YEAR)),
    CHECK (country_code IS NULL OR country_code REGEXP '^[A-Z]{2}$'),
    CHECK (postal_code IS NULL OR CHAR_LENGTH(postal_code) BETWEEN 3 AND 20),

    -- Conditional constraints
    CHECK (
        CASE
            WHEN country_code = 'US' THEN postal_code REGEXP '^[0-9]{5}(-[0-9]{4})?$'
            WHEN country_code = 'CA' THEN postal_code REGEXP '^[A-Z][0-9][A-Z] [0-9][A-Z][0-9]$'
            WHEN country_code = 'UK' THEN postal_code REGEXP '^[A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2}$'
            ELSE TRUE
        END
    ),

    INDEX idx_customers_email (email),
    INDEX idx_customers_name (last_name, first_name),
    INDEX idx_customers_location (country_code, state_province, city),
    INDEX idx_customers_status (account_status)
);
```

**📊 Constraint Best Practices:**

✅ **Implement:**

- Foreign key constraints for referential integrity
- Check constraints for business rules
- Unique constraints for data uniqueness
- NOT NULL for required fields
- Appropriate data types with ranges

❌ **Avoid:**

- Too many complex check constraints (performance impact)
- Constraints that change frequently
- Cross-table constraints (use triggers sparingly)
- Constraints that prevent valid edge cases

---

## Schema Design Patterns

### Event Sourcing Pattern

```sql
-- Event store for order aggregate
CREATE TABLE order_events (
    event_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    aggregate_id VARCHAR(100) NOT NULL, -- order-{order_id}
    event_type VARCHAR(100) NOT NULL,
    event_version BIGINT NOT NULL,
    event_data JSON NOT NULL,
    event_metadata JSON,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_aggregate_version (aggregate_id, event_version),
    INDEX idx_events_aggregate (aggregate_id),
    INDEX idx_events_type (event_type),
    INDEX idx_events_occurred (occurred_at)
);

-- Snapshot table for performance
CREATE TABLE order_snapshots (
    aggregate_id VARCHAR(100) PRIMARY KEY,
    snapshot_version BIGINT NOT NULL,
    snapshot_data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_snapshots_version (snapshot_version)
);

-- Example: Order lifecycle events
INSERT INTO order_events (aggregate_id, event_type, event_version, event_data) VALUES
('order-1001', 'OrderCreated', 1, JSON_OBJECT(
    'orderId', 1001,
    'customerId', 5001,
    'createdAt', NOW()
)),
('order-1001', 'ItemAdded', 2, JSON_OBJECT(
    'productId', 2001,
    'quantity', 2,
    'unitPrice', 29.99
)),
('order-1001', 'PaymentProcessed', 3, JSON_OBJECT(
    'paymentMethod', 'credit_card',
    'amount', 59.98,
    'transactionId', 'txn_abc123'
));
```

### Multi-Tenant Schema Patterns

```sql
-- Pattern 1: Shared schema with tenant isolation
CREATE TABLE tenant_customers (
    customer_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_tenant_email (tenant_id, email),
    INDEX idx_customers_tenant (tenant_id),
    INDEX idx_customers_tenant_name (tenant_id, last_name, first_name)
);

-- Row-level security helper view
CREATE VIEW current_tenant_customers AS
SELECT customer_id, email, first_name, last_name, created_at
FROM tenant_customers
WHERE tenant_id = @current_tenant_id;

-- Pattern 2: Tenant registry for separate databases
CREATE TABLE tenant_registry (
    tenant_id VARCHAR(50) PRIMARY KEY,
    tenant_name VARCHAR(200) NOT NULL,
    database_name VARCHAR(100) NOT NULL,
    connection_string VARCHAR(500) NOT NULL,
    schema_version VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_registry_active (is_active)
);
```

### Temporal Data Patterns

```sql
-- Slowly Changing Dimensions (SCD Type 2)
CREATE TABLE customer_history (
    surrogate_key BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_id BIGINT NOT NULL, -- Business key
    email VARCHAR(100) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    address JSON,

    -- Temporal columns
    effective_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMP NULL, -- NULL = current record
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    version_number INT NOT NULL DEFAULT 1,

    -- Audit columns
    created_by BIGINT NOT NULL,
    change_reason VARCHAR(200),

    INDEX idx_customer_history_business_key (customer_id),
    INDEX idx_customer_history_current (customer_id, is_current),
    INDEX idx_customer_history_temporal (effective_from, effective_to),

    -- Ensure only one current record per customer
    UNIQUE KEY unique_current_customer (customer_id) WHERE is_current = TRUE,

    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- Bitemporal data (valid time + transaction time)
CREATE TABLE product_prices_bitemporal (
    price_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,

    -- Valid time (when price was effective in reality)
    valid_from DATE NOT NULL,
    valid_to DATE NULL,

    -- Transaction time (when we recorded this information)
    recorded_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recorded_to TIMESTAMP NULL,

    price DECIMAL(10,2) NOT NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'USD',

    INDEX idx_prices_product_valid (product_id, valid_from, valid_to),
    INDEX idx_prices_product_recorded (product_id, recorded_from, recorded_to),
    INDEX idx_prices_current (product_id) WHERE valid_to IS NULL AND recorded_to IS NULL,

    CHECK (valid_to IS NULL OR valid_to > valid_from),
    CHECK (recorded_to IS NULL OR recorded_to > recorded_from),
    CHECK (price > 0)
);
```

### CQRS (Command Query Responsibility Segregation)

```sql
-- Command side (write model)
CREATE TABLE write_orders (
    order_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 1, -- For optimistic locking

    INDEX idx_write_orders_customer (customer_id),
    INDEX idx_write_orders_status (status)
);

-- Query side (read model) - optimized for reads
CREATE TABLE read_order_summaries (
    order_id BIGINT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    customer_email VARCHAR(100) NOT NULL,
    order_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    item_count INT NOT NULL,
    shipping_address JSON,

    -- Denormalized for fast queries
    customer_segment VARCHAR(50),
    order_priority INT,
    estimated_delivery_date DATE,

    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_read_orders_customer (customer_id),
    INDEX idx_read_orders_date_status (order_date, status),
    INDEX idx_read_orders_amount (total_amount),
    INDEX idx_read_orders_segment (customer_segment)
);

CREATE TABLE read_order_analytics (
    analytics_date DATE PRIMARY KEY,
    total_orders INT NOT NULL,
    total_revenue DECIMAL(15,2) NOT NULL,
    avg_order_value DECIMAL(10,2) NOT NULL,
    top_selling_product_id BIGINT,

    -- Segmented analytics
    vip_customer_orders INT,
    vip_customer_revenue DECIMAL(15,2),
    new_customer_orders INT,
    new_customer_revenue DECIMAL(15,2),

    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**📊 Schema Pattern Selection Guide:**

| Pattern              | Best For                             | Complexity | Scalability |
| -------------------- | ------------------------------------ | ---------- | ----------- |
| **Traditional CRUD** | Simple applications                  | Low        | Medium      |
| **Event Sourcing**   | Audit requirements, temporal queries | High       | High        |
| **Multi-Tenant**     | SaaS applications                    | Medium     | High        |
| **CQRS**             | Different read/write patterns        | Medium     | Very High   |
| **Temporal**         | Historical analysis                  | Medium     | Medium      |

---

## Summary & Best Practices

### 🎯 Key Takeaways

✅ **ER Modeling**: Foundation of good database design  
✅ **Normalization**: Apply 1NF-3NF for most cases, BCNF+ for special requirements  
✅ **Denormalization**: Strategic performance optimization with trade-offs  
✅ **Constraints**: Enforce business rules and data integrity  
✅ **Schema Patterns**: Choose patterns that fit your specific requirements

### 📈 Design Process

1. **Understand Requirements**

   - Business rules and constraints
   - Query patterns and performance needs
   - Scalability and growth projections

2. **Model Carefully**

   - Start with normalized design
   - Apply constraints and business rules
   - Document design decisions

3. **Optimize Strategically**
   - Identify performance bottlenecks
   - Apply targeted denormalization
   - Monitor and measure impact

### ⚠️ Common Pitfalls

- **Over-normalization**: Too many JOINs hurting performance
- **Under-normalization**: Data inconsistency and redundancy
- **Missing Constraints**: Allowing invalid data states
- **Ignoring Query Patterns**: Designing without understanding usage
- **No Evolution Strategy**: Rigid schemas that can't adapt

**📈 Next Steps:**
Ready to optimize your SQL queries? Continue with [Advanced SQL & Performance](./03-advanced-sql-performance.md) to learn window functions, query optimization, and performance tuning techniques.

---

_💡 Pro Tip: Good database design is an investment in long-term maintainability. Start normalized, understand your query patterns, then optimize strategically. The best performance optimization won't save a poorly designed schema._
