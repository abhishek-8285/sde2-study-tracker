# Database Architecture & Scaling 🏗️

Master database architecture patterns and scaling strategies for high-availability, high-performance systems at enterprise scale.

## Table of Contents

- [Replication Strategies](#replication-strategies)
- [Horizontal vs Vertical Scaling](#horizontal-vs-vertical-scaling)
- [Sharding Strategies](#sharding-strategies)
- [Connection Pooling](#connection-pooling)
- [Backup & Recovery](#backup--recovery)
- [High Availability Patterns](#high-availability-patterns)

---

## Replication Strategies

### Master-Slave Replication

Basic replication setup for read scaling and data redundancy.

```sql
-- Master database configuration (MySQL example)
-- /etc/mysql/mysql.conf.d/mysqld.cnf

[mysqld]
# Enable binary logging
log-bin = mysql-bin
server-id = 1
binlog-format = ROW
sync-binlog = 1
innodb-flush-log-at-trx-commit = 1

# Databases to replicate
binlog-do-db = ecommerce_db
binlog-do-db = analytics_db

# Create replication user
CREATE USER 'repl_user'@'%' IDENTIFIED BY 'strong_password';
GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'%';
FLUSH PRIVILEGES;

-- Get master status for slave setup
SHOW MASTER STATUS;
-- Note the File and Position values

-- Slave configuration
[mysqld]
server-id = 2
relay-log = relay-bin
read-only = 1
super-read-only = 1

-- Setup slave replication
CHANGE MASTER TO
    MASTER_HOST = '192.168.1.100',
    MASTER_USER = 'repl_user',
    MASTER_PASSWORD = 'strong_password',
    MASTER_LOG_FILE = 'mysql-bin.000001',
    MASTER_LOG_POS = 154;

START SLAVE;
SHOW SLAVE STATUS\G

-- Application connection routing
-- Use master for writes, slaves for reads
```

```python
# Application-level read/write splitting
import mysql.connector
from mysql.connector import pooling

class DatabaseRouter:
    def __init__(self):
        # Master connection pool (writes)
        self.master_pool = pooling.MySQLConnectionPool(
            pool_name="master_pool",
            pool_size=20,
            pool_reset_session=True,
            host='db-master.example.com',
            database='ecommerce_db',
            user='app_user',
            password='app_password'
        )

        # Slave connection pools (reads)
        self.slave_pools = [
            pooling.MySQLConnectionPool(
                pool_name=f"slave_pool_{i}",
                pool_size=15,
                pool_reset_session=True,
                host=f'db-slave-{i}.example.com',
                database='ecommerce_db',
                user='app_readonly',
                password='readonly_password'
            ) for i in range(1, 4)  # 3 read replicas
        ]

        self.current_slave = 0

    def get_write_connection(self):
        """Get connection for write operations"""
        return self.master_pool.get_connection()

    def get_read_connection(self):
        """Get connection for read operations with load balancing"""
        pool = self.slave_pools[self.current_slave]
        self.current_slave = (self.current_slave + 1) % len(self.slave_pools)
        return pool.get_connection()

    def execute_write(self, query, params=None):
        """Execute write operation on master"""
        conn = self.get_write_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(query, params)
            conn.commit()
            return cursor.fetchall()
        finally:
            conn.close()

    def execute_read(self, query, params=None):
        """Execute read operation on slave"""
        conn = self.get_read_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return cursor.fetchall()
        finally:
            conn.close()

# Usage example
db_router = DatabaseRouter()

# Write operations go to master
db_router.execute_write(
    "INSERT INTO orders (customer_id, total_amount) VALUES (%s, %s)",
    (customer_id, total_amount)
)

# Read operations go to slaves
orders = db_router.execute_read(
    "SELECT * FROM orders WHERE customer_id = %s ORDER BY order_date DESC",
    (customer_id,)
)
```

### Master-Master Replication

```sql
-- Master 1 configuration
[mysqld]
server-id = 1
log-bin = mysql-bin
auto-increment-increment = 2
auto-increment-offset = 1
binlog-format = ROW

-- Master 2 configuration
[mysqld]
server-id = 2
log-bin = mysql-bin
auto-increment-increment = 2
auto-increment-offset = 2
binlog-format = ROW

-- Setup bidirectional replication
-- On Master 1:
CHANGE MASTER TO
    MASTER_HOST = 'master2.example.com',
    MASTER_USER = 'repl_user',
    MASTER_PASSWORD = 'strong_password',
    MASTER_LOG_FILE = 'mysql-bin.000001',
    MASTER_LOG_POS = 154;

-- On Master 2:
CHANGE MASTER TO
    MASTER_HOST = 'master1.example.com',
    MASTER_USER = 'repl_user',
    MASTER_PASSWORD = 'strong_password',
    MASTER_LOG_FILE = 'mysql-bin.000001',
    MASTER_LOG_POS = 107;

-- Conflict resolution stored procedure
DELIMITER //

CREATE PROCEDURE ResolveConflict(
    IN table_name VARCHAR(64),
    IN primary_key_value VARCHAR(255),
    IN resolution_strategy ENUM('latest_wins', 'master1_wins', 'manual')
)
BEGIN
    DECLARE conflict_query TEXT;

    CASE resolution_strategy
        WHEN 'latest_wins' THEN
            -- Use the row with the latest updated_at timestamp
            SET conflict_query = CONCAT(
                'DELETE FROM ', table_name,
                ' WHERE id = ', primary_key_value,
                ' AND updated_at < (SELECT MAX(updated_at) FROM ', table_name,
                ' WHERE id = ', primary_key_value, ')'
            );

        WHEN 'master1_wins' THEN
            -- Always prefer Master 1's version
            SET conflict_query = CONCAT(
                'DELETE FROM ', table_name,
                ' WHERE id = ', primary_key_value,
                ' AND server_id != 1'
            );

        ELSE
            -- Log for manual resolution
            INSERT INTO replication_conflicts (
                table_name,
                primary_key_value,
                detected_at,
                status
            ) VALUES (
                table_name,
                primary_key_value,
                NOW(),
                'manual_review_required'
            );
    END CASE;

    IF resolution_strategy != 'manual' THEN
        SET @sql = conflict_query;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;

END //

DELIMITER ;
```

**📊 Replication Patterns Comparison:**

| Pattern               | Pros                 | Cons                           | Use Cases            |
| --------------------- | -------------------- | ------------------------------ | -------------------- |
| **Master-Slave**      | Simple, read scaling | Single point of failure        | Read-heavy workloads |
| **Master-Master**     | High availability    | Conflict resolution complexity | Multi-region setups  |
| **Chain Replication** | Reduced master load  | Increased latency              | Deep hierarchies     |

---

## Horizontal vs Vertical Scaling

### Vertical Scaling (Scale Up)

```yaml
# Infrastructure scaling examples
# Docker Compose with resource limits
version: '3.8'
services:
  database:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: ecommerce_db
    # Vertical scaling: increase resources
    deploy:
      resources:
        limits:
          cpus: '4.0'      # Scale from 2 to 4 CPUs
          memory: 16G      # Scale from 8G to 16G
        reservations:
          cpus: '2.0'
          memory: 8G
    volumes:
      - db_data:/var/lib/mysql
      - ./mysql.cnf:/etc/mysql/conf.d/custom.cnf
    # SSD storage for better I/O
    tmpfs:
      - /tmp:size=1G

# MySQL configuration for high-performance server
# /etc/mysql/conf.d/performance.cnf
[mysqld]
# Memory allocation (adjust based on available RAM)
innodb_buffer_pool_size = 12G    # 75% of available RAM
innodb_log_file_size = 1G
innodb_log_buffer_size = 64M
innodb_flush_log_at_trx_commit = 2

# Connection handling
max_connections = 500
thread_cache_size = 50
table_open_cache = 4000

# Query cache (if enabled)
query_cache_type = 1
query_cache_size = 256M
query_cache_limit = 2M

# Temporary tables
tmp_table_size = 256M
max_heap_table_size = 256M

# I/O optimization
innodb_io_capacity = 2000
innodb_io_capacity_max = 4000
innodb_read_io_threads = 8
innodb_write_io_threads = 8
```

```sql
-- Database optimization for vertical scaling
-- Optimize queries for single-server performance

-- Example: Optimized reporting query for large server
CREATE OR REPLACE VIEW monthly_sales_summary AS
SELECT
    DATE_FORMAT(order_date, '%Y-%m') AS month,
    COUNT(*) AS order_count,
    SUM(total_amount) AS total_revenue,
    AVG(total_amount) AS avg_order_value,
    COUNT(DISTINCT customer_id) AS unique_customers,

    -- Calculate growth rates within the view
    LAG(SUM(total_amount), 1) OVER (ORDER BY DATE_FORMAT(order_date, '%Y-%m')) AS prev_month_revenue,
    ROUND(
        (SUM(total_amount) - LAG(SUM(total_amount), 1) OVER (ORDER BY DATE_FORMAT(order_date, '%Y-%m')))
        * 100.0 / NULLIF(LAG(SUM(total_amount), 1) OVER (ORDER BY DATE_FORMAT(order_date, '%Y-%m')), 0),
        2
    ) AS revenue_growth_percent

FROM orders
WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
    AND status = 'completed'
GROUP BY DATE_FORMAT(order_date, '%Y-%m')
ORDER BY month;

-- Materialized view simulation for complex calculations
CREATE TABLE customer_analytics_materialized AS
SELECT
    customer_id,
    COUNT(*) AS total_orders,
    SUM(total_amount) AS lifetime_value,
    AVG(total_amount) AS avg_order_value,
    MAX(order_date) AS last_order_date,
    MIN(order_date) AS first_order_date,
    DATEDIFF(MAX(order_date), MIN(order_date)) AS customer_lifespan_days,

    -- RFM Analysis
    CASE
        WHEN DATEDIFF(CURDATE(), MAX(order_date)) <= 30 THEN 5
        WHEN DATEDIFF(CURDATE(), MAX(order_date)) <= 90 THEN 4
        WHEN DATEDIFF(CURDATE(), MAX(order_date)) <= 180 THEN 3
        WHEN DATEDIFF(CURDATE(), MAX(order_date)) <= 365 THEN 2
        ELSE 1
    END AS recency_score,

    NTILE(5) OVER (ORDER BY COUNT(*)) AS frequency_score,
    NTILE(5) OVER (ORDER BY SUM(total_amount)) AS monetary_score,

    NOW() AS calculated_at

FROM orders
WHERE status = 'completed'
GROUP BY customer_id;

-- Index for fast lookups
CREATE INDEX idx_customer_analytics_rfm ON customer_analytics_materialized
(recency_score, frequency_score, monetary_score);
```

### Horizontal Scaling (Scale Out)

```python
# Database sharding implementation
import hashlib
import mysql.connector
from mysql.connector import pooling

class ShardedDatabase:
    def __init__(self, shard_configs):
        self.shards = {}
        self.shard_count = len(shard_configs)

        # Initialize connection pools for each shard
        for shard_id, config in shard_configs.items():
            self.shards[shard_id] = pooling.MySQLConnectionPool(
                pool_name=f"shard_{shard_id}",
                pool_size=20,
                **config
            )

    def get_shard_id(self, shard_key):
        """Determine shard based on key using consistent hashing"""
        hash_value = int(hashlib.md5(str(shard_key).encode()).hexdigest(), 16)
        return hash_value % self.shard_count

    def get_connection(self, shard_key):
        """Get connection to appropriate shard"""
        shard_id = self.get_shard_id(shard_key)
        return self.shards[shard_id].get_connection()

    def execute_on_shard(self, shard_key, query, params=None):
        """Execute query on specific shard"""
        conn = self.get_connection(shard_key)
        try:
            cursor = conn.cursor()
            cursor.execute(query, params)
            conn.commit()
            return cursor.fetchall()
        finally:
            conn.close()

    def execute_on_all_shards(self, query, params=None):
        """Execute query on all shards (for aggregation)"""
        results = []
        for shard_id in self.shards:
            conn = self.shards[shard_id].get_connection()
            try:
                cursor = conn.cursor()
                cursor.execute(query, params)
                results.extend(cursor.fetchall())
            finally:
                conn.close()
        return results

# Configuration for 4 shards
shard_configs = {
    0: {
        'host': 'shard-0.db.example.com',
        'database': 'ecommerce_shard_0',
        'user': 'app_user',
        'password': 'app_password'
    },
    1: {
        'host': 'shard-1.db.example.com',
        'database': 'ecommerce_shard_1',
        'user': 'app_user',
        'password': 'app_password'
    },
    2: {
        'host': 'shard-2.db.example.com',
        'database': 'ecommerce_shard_2',
        'user': 'app_user',
        'password': 'app_password'
    },
    3: {
        'host': 'shard-3.db.example.com',
        'database': 'ecommerce_shard_3',
        'user': 'app_user',
        'password': 'app_password'
    }
}

# Initialize sharded database
sharded_db = ShardedDatabase(shard_configs)

# Usage examples
# Insert order (sharded by customer_id)
customer_id = 12345
sharded_db.execute_on_shard(
    customer_id,
    "INSERT INTO orders (customer_id, total_amount, order_date) VALUES (%s, %s, %s)",
    (customer_id, 299.99, '2024-01-15')
)

# Get customer orders (single shard)
orders = sharded_db.execute_on_shard(
    customer_id,
    "SELECT * FROM orders WHERE customer_id = %s ORDER BY order_date DESC",
    (customer_id,)
)

# Aggregate across all shards
total_revenue = sharded_db.execute_on_all_shards(
    "SELECT SUM(total_amount) as shard_total FROM orders WHERE order_date >= %s",
    ('2024-01-01',)
)

# Sum results from all shards
overall_total = sum(row[0] for row in total_revenue if row[0])
```

**📊 Scaling Strategy Decision Matrix:**

| Factor                 | Vertical Scaling   | Horizontal Scaling |
| ---------------------- | ------------------ | ------------------ |
| **Complexity**         | Low                | High               |
| **Cost (Short-term)**  | High               | Medium             |
| **Cost (Long-term)**   | Very High          | Lower              |
| **Scalability Limit**  | Hardware dependent | Nearly unlimited   |
| **Consistency**        | Strong             | Eventual           |
| **Development Effort** | Minimal            | Significant        |

---

## Sharding Strategies

### Range-Based Sharding

```sql
-- Customer sharding by geographic region
-- Shard 1: North America
CREATE TABLE customers_na (
    customer_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    country VARCHAR(2) CHECK (country IN ('US', 'CA', 'MX')),
    region VARCHAR(2) DEFAULT 'NA',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_customers_country (country),
    INDEX idx_customers_email (email)
);

-- Shard 2: Europe
CREATE TABLE customers_eu (
    customer_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    country VARCHAR(2) CHECK (country IN ('GB', 'DE', 'FR', 'IT', 'ES', 'NL')),
    region VARCHAR(2) DEFAULT 'EU',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_customers_country (country),
    INDEX idx_customers_email (email)
);

-- Date-based sharding for time-series data
-- Orders sharded by year
CREATE TABLE orders_2024 (
    order_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_id BIGINT NOT NULL,
    order_date DATE NOT NULL CHECK (YEAR(order_date) = 2024),
    total_amount DECIMAL(12,2) NOT NULL,
    status ENUM('pending', 'completed', 'cancelled'),

    INDEX idx_orders_customer_date (customer_id, order_date),
    INDEX idx_orders_date (order_date)
) PARTITION BY RANGE (MONTH(order_date)) (
    PARTITION p01 VALUES LESS THAN (2),
    PARTITION p02 VALUES LESS THAN (3),
    PARTITION p03 VALUES LESS THAN (4),
    PARTITION p04 VALUES LESS THAN (5),
    PARTITION p05 VALUES LESS THAN (6),
    PARTITION p06 VALUES LESS THAN (7),
    PARTITION p07 VALUES LESS THAN (8),
    PARTITION p08 VALUES LESS THAN (9),
    PARTITION p09 VALUES LESS THAN (10),
    PARTITION p10 VALUES LESS THAN (11),
    PARTITION p11 VALUES LESS THAN (12),
    PARTITION p12 VALUES LESS THAN (13)
);
```

### Hash-Based Sharding

```python
# Consistent hashing for dynamic shard management
import hashlib
import bisect

class ConsistentHashRing:
    def __init__(self, nodes=None, replicas=150):
        self.replicas = replicas
        self.ring = {}
        self.sorted_keys = []

        if nodes:
            for node in nodes:
                self.add_node(node)

    def add_node(self, node):
        """Add a node to the hash ring"""
        for i in range(self.replicas):
            key = self.hash(f"{node}:{i}")
            self.ring[key] = node
            bisect.insort(self.sorted_keys, key)

    def remove_node(self, node):
        """Remove a node from the hash ring"""
        for i in range(self.replicas):
            key = self.hash(f"{node}:{i}")
            if key in self.ring:
                del self.ring[key]
                self.sorted_keys.remove(key)

    def get_node(self, key):
        """Get the node responsible for a key"""
        if not self.ring:
            return None

        hash_key = self.hash(key)
        idx = bisect.bisect_right(self.sorted_keys, hash_key)

        if idx == len(self.sorted_keys):
            idx = 0

        return self.ring[self.sorted_keys[idx]]

    def hash(self, key):
        """Hash function"""
        return int(hashlib.md5(str(key).encode()).hexdigest(), 16)

class ShardManager:
    def __init__(self):
        # Initialize with 4 database shards
        self.nodes = [
            'shard-0.db.example.com',
            'shard-1.db.example.com',
            'shard-2.db.example.com',
            'shard-3.db.example.com'
        ]
        self.hash_ring = ConsistentHashRing(self.nodes)
        self.connections = {}

        # Initialize connections
        for node in self.nodes:
            self.connections[node] = self._create_connection(node)

    def _create_connection(self, node):
        """Create database connection for node"""
        # Connection configuration based on node
        config = {
            'host': node,
            'database': f'ecommerce_{node.split("-")[1].split(".")[0]}',
            'user': 'app_user',
            'password': 'app_password',
            'pool_size': 20
        }
        return mysql.connector.pooling.MySQLConnectionPool(**config)

    def get_shard_for_key(self, key):
        """Get the shard responsible for a key"""
        return self.hash_ring.get_node(key)

    def add_shard(self, node):
        """Add a new shard (for scaling out)"""
        self.nodes.append(node)
        self.hash_ring.add_node(node)
        self.connections[node] = self._create_connection(node)

        # Trigger data migration for affected keys
        self._migrate_data()

    def _migrate_data(self):
        """Migrate data when shards are added/removed"""
        # Implementation would involve:
        # 1. Identify keys that need to be moved
        # 2. Copy data to new locations
        # 3. Update application routing
        # 4. Remove old data
        pass

# Usage example
shard_manager = ShardManager()

# Route operations based on customer_id
customer_id = 12345
target_shard = shard_manager.get_shard_for_key(customer_id)
print(f"Customer {customer_id} routes to {target_shard}")

# Scale out by adding new shard
shard_manager.add_shard('shard-4.db.example.com')
```

### Directory-Based Sharding

```sql
-- Shard directory/lookup table
CREATE TABLE shard_directory (
    shard_key VARCHAR(100) PRIMARY KEY,
    shard_id INT NOT NULL,
    shard_host VARCHAR(200) NOT NULL,
    shard_database VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_shard_directory_id (shard_id),
    INDEX idx_shard_directory_host (shard_host)
);

-- Customer to shard mapping
CREATE TABLE customer_shard_mapping (
    customer_id BIGINT PRIMARY KEY,
    shard_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (shard_id) REFERENCES shard_directory(shard_id),
    INDEX idx_customer_shard_id (shard_id)
);

-- Populate shard directory
INSERT INTO shard_directory (shard_key, shard_id, shard_host, shard_database) VALUES
('shard_0', 0, 'shard-0.db.example.com', 'ecommerce_0'),
('shard_1', 1, 'shard-1.db.example.com', 'ecommerce_1'),
('shard_2', 2, 'shard-2.db.example.com', 'ecommerce_2'),
('shard_3', 3, 'shard-3.db.example.com', 'ecommerce_3');

-- Stored procedure for shard assignment
DELIMITER //

CREATE PROCEDURE AssignCustomerToShard(
    IN p_customer_id BIGINT,
    OUT p_shard_id INT,
    OUT p_shard_host VARCHAR(200)
)
BEGIN
    DECLARE v_shard_count INT;
    DECLARE v_target_shard INT;

    -- Get number of available shards
    SELECT COUNT(*) INTO v_shard_count FROM shard_directory;

    -- Use modulo for even distribution
    SET v_target_shard = p_customer_id % v_shard_count;

    -- Get shard details
    SELECT shard_id, shard_host
    INTO p_shard_id, p_shard_host
    FROM shard_directory
    WHERE shard_id = v_target_shard;

    -- Record the assignment
    INSERT INTO customer_shard_mapping (customer_id, shard_id)
    VALUES (p_customer_id, p_shard_id)
    ON DUPLICATE KEY UPDATE
        shard_id = p_shard_id,
        assigned_at = CURRENT_TIMESTAMP;

END //

DELIMITER ;

-- Cross-shard query coordination
DELIMITER //

CREATE PROCEDURE GetCrossShardAnalytics(
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_shard_host VARCHAR(200);
    DECLARE v_shard_database VARCHAR(100);
    DECLARE v_sql TEXT;

    DECLARE shard_cursor CURSOR FOR
        SELECT shard_host, shard_database
        FROM shard_directory
        ORDER BY shard_id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Create temporary table for aggregated results
    DROP TEMPORARY TABLE IF EXISTS temp_shard_results;
    CREATE TEMPORARY TABLE temp_shard_results (
        shard_name VARCHAR(100),
        order_count BIGINT,
        total_revenue DECIMAL(15,2),
        avg_order_value DECIMAL(10,2)
    );

    OPEN shard_cursor;

    shard_loop: LOOP
        FETCH shard_cursor INTO v_shard_host, v_shard_database;
        IF done THEN
            LEAVE shard_loop;
        END IF;

        -- This would typically be executed via application logic
        -- connecting to each shard separately
        -- Shown here for demonstration

        SET v_sql = CONCAT(
            'INSERT INTO temp_shard_results ',
            'SELECT ''', v_shard_database, ''' as shard_name, ',
            'COUNT(*) as order_count, ',
            'SUM(total_amount) as total_revenue, ',
            'AVG(total_amount) as avg_order_value ',
            'FROM ', v_shard_database, '.orders ',
            'WHERE order_date BETWEEN ''', p_start_date, ''' AND ''', p_end_date, ''''
        );

        -- Note: This would be executed against remote shard
        -- SET @sql = v_sql;
        -- PREPARE stmt FROM @sql;
        -- EXECUTE stmt;
        -- DEALLOCATE PREPARE stmt;

    END LOOP;

    CLOSE shard_cursor;

    -- Return aggregated results
    SELECT
        'TOTAL' as shard_name,
        SUM(order_count) as total_orders,
        SUM(total_revenue) as total_revenue,
        AVG(avg_order_value) as overall_avg_order_value
    FROM temp_shard_results

    UNION ALL

    SELECT * FROM temp_shard_results
    ORDER BY shard_name;

END //

DELIMITER ;
```

**📊 Sharding Strategy Comparison:**

| Strategy            | Pros                        | Cons                                   | Best For                     |
| ------------------- | --------------------------- | -------------------------------------- | ---------------------------- |
| **Range-based**     | Simple queries, range scans | Hotspots, uneven distribution          | Time-series, geographic data |
| **Hash-based**      | Even distribution           | No range queries, resharding difficult | High-volume OLTP             |
| **Directory-based** | Flexible, easy migration    | Additional lookup overhead             | Complex business rules       |

---

## Connection Pooling

### Application-Level Connection Pooling

```python
# Advanced connection pool implementation
import time
import threading
import mysql.connector
from mysql.connector import pooling
from contextlib import contextmanager
import logging

class AdvancedConnectionPool:
    def __init__(self, config, pool_size=20, max_overflow=30,
                 pool_timeout=30, pool_recycle=3600):
        self.config = config
        self.pool_size = pool_size
        self.max_overflow = max_overflow
        self.pool_timeout = pool_timeout
        self.pool_recycle = pool_recycle

        # Core pool
        self.core_pool = pooling.MySQLConnectionPool(
            pool_name=f"core_pool_{id(self)}",
            pool_size=pool_size,
            pool_reset_session=True,
            **config
        )

        # Overflow connections tracking
        self.overflow_connections = []
        self.overflow_lock = threading.Lock()

        # Metrics
        self.metrics = {
            'total_connections': 0,
            'active_connections': 0,
            'pool_hits': 0,
            'pool_misses': 0,
            'overflow_used': 0,
            'timeouts': 0
        }
        self.metrics_lock = threading.Lock()

        # Connection health monitoring
        self.last_health_check = time.time()
        self.health_check_interval = 300  # 5 minutes

    @contextmanager
    def get_connection(self):
        """Context manager for getting database connections"""
        connection = None
        is_overflow = False
        start_time = time.time()

        try:
            # Try to get from core pool first
            try:
                connection = self.core_pool.get_connection()
                with self.metrics_lock:
                    self.metrics['pool_hits'] += 1
                    self.metrics['active_connections'] += 1

            except mysql.connector.PoolError:
                # Core pool exhausted, try overflow
                with self.overflow_lock:
                    if len(self.overflow_connections) < self.max_overflow:
                        connection = mysql.connector.connect(**self.config)
                        self.overflow_connections.append(connection)
                        is_overflow = True

                        with self.metrics_lock:
                            self.metrics['pool_misses'] += 1
                            self.metrics['overflow_used'] += 1
                            self.metrics['active_connections'] += 1
                    else:
                        # Wait for connection with timeout
                        deadline = time.time() + self.pool_timeout
                        while time.time() < deadline:
                            try:
                                connection = self.core_pool.get_connection()
                                with self.metrics_lock:
                                    self.metrics['pool_hits'] += 1
                                    self.metrics['active_connections'] += 1
                                break
                            except mysql.connector.PoolError:
                                time.sleep(0.1)

                        if not connection:
                            with self.metrics_lock:
                                self.metrics['timeouts'] += 1
                            raise TimeoutError("Connection pool timeout")

            # Check connection health
            if self._should_health_check():
                self._health_check(connection)

            yield connection

        except Exception as e:
            logging.error(f"Connection error: {e}")
            if connection:
                try:
                    connection.rollback()
                except:
                    pass
            raise

        finally:
            if connection:
                try:
                    if is_overflow:
                        # Return overflow connection
                        with self.overflow_lock:
                            if connection in self.overflow_connections:
                                self.overflow_connections.remove(connection)
                            connection.close()
                    else:
                        # Return to core pool
                        connection.close()  # Returns to pool

                    with self.metrics_lock:
                        self.metrics['active_connections'] -= 1

                except Exception as e:
                    logging.error(f"Error returning connection: {e}")

    def _should_health_check(self):
        """Determine if health check is needed"""
        return (time.time() - self.last_health_check) > self.health_check_interval

    def _health_check(self, connection):
        """Perform connection health check"""
        try:
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            self.last_health_check = time.time()
        except Exception as e:
            logging.warning(f"Connection health check failed: {e}")
            raise

    def get_metrics(self):
        """Get pool metrics"""
        with self.metrics_lock:
            return dict(self.metrics)

    def close_all(self):
        """Close all connections"""
        with self.overflow_lock:
            for conn in self.overflow_connections:
                try:
                    conn.close()
                except:
                    pass
            self.overflow_connections.clear()

# Database service with connection pooling
class DatabaseService:
    def __init__(self):
        # Multiple pools for different purposes
        self.write_pool = AdvancedConnectionPool({
            'host': 'db-master.example.com',
            'database': 'ecommerce_db',
            'user': 'app_user',
            'password': 'app_password',
            'autocommit': False
        }, pool_size=15)

        self.read_pool = AdvancedConnectionPool({
            'host': 'db-slave.example.com',
            'database': 'ecommerce_db',
            'user': 'app_readonly',
            'password': 'readonly_password',
            'autocommit': True
        }, pool_size=25)

        self.analytics_pool = AdvancedConnectionPool({
            'host': 'db-analytics.example.com',
            'database': 'analytics_db',
            'user': 'analytics_user',
            'password': 'analytics_password',
            'autocommit': True
        }, pool_size=10)

    def execute_write(self, query, params=None):
        """Execute write operation with transaction support"""
        with self.write_pool.get_connection() as conn:
            try:
                cursor = conn.cursor()
                cursor.execute(query, params)
                conn.commit()
                return cursor.fetchall()
            except Exception as e:
                conn.rollback()
                raise

    def execute_read(self, query, params=None):
        """Execute read operation"""
        with self.read_pool.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return cursor.fetchall()

    def execute_analytics(self, query, params=None):
        """Execute analytics operation"""
        with self.analytics_pool.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return cursor.fetchall()

    def get_pool_status(self):
        """Get status of all pools"""
        return {
            'write_pool': self.write_pool.get_metrics(),
            'read_pool': self.read_pool.get_metrics(),
            'analytics_pool': self.analytics_pool.get_metrics()
        }

# Usage example
db_service = DatabaseService()

# Write operation
db_service.execute_write(
    "INSERT INTO orders (customer_id, total_amount) VALUES (%s, %s)",
    (12345, 299.99)
)

# Read operation
orders = db_service.execute_read(
    "SELECT * FROM orders WHERE customer_id = %s",
    (12345,)
)

# Analytics operation
monthly_stats = db_service.execute_analytics(
    "SELECT DATE_FORMAT(order_date, '%Y-%m') as month, COUNT(*), SUM(total_amount) FROM orders GROUP BY month",
    ()
)

# Monitor pool health
pool_status = db_service.get_pool_status()
print(f"Pool metrics: {pool_status}")
```

### Database-Level Connection Pooling

```sql
-- MySQL connection pooling configuration
-- /etc/mysql/mysql.conf.d/mysqld.cnf

[mysqld]
# Connection limits
max_connections = 1000
max_user_connections = 950
max_connect_errors = 100000

# Connection timeouts
connect_timeout = 10
interactive_timeout = 28800
wait_timeout = 28800

# Thread handling
thread_cache_size = 100
thread_stack = 256K

# Connection validation
validate_password = OFF

# ProxySQL configuration for connection pooling
# /etc/proxysql.cnf
datadir="/var/lib/proxysql"

admin_variables=
{
    admin_credentials="admin:admin_password"
    mysql_ifaces="0.0.0.0:6032"
}

mysql_variables=
{
    threads=4
    max_connections=2048
    default_query_delay=0
    default_query_timeout=36000000
    have_compress=true
    poll_timeout=2000
    interfaces="0.0.0.0:6033"
    default_schema="information_schema"
    stacksize=1048576
    server_version="5.7.25-ProxySQL"
    connect_timeout_server=3000
    monitor_username="monitor"
    monitor_password="monitor_password"
    monitor_history=600000
    monitor_connect_interval=60000
    monitor_ping_interval=10000
    ping_interval_server_msec=120000
    ping_timeout_server=500
    commands_stats=true
    sessions_sort=true
    connect_retries_on_failure=10
}

-- ProxySQL configuration via SQL
-- Configure backend servers
INSERT INTO mysql_servers(hostgroup_id, hostname, port, weight) VALUES
(0, 'db-master.example.com', 3306, 1000),
(1, 'db-slave-1.example.com', 3306, 800),
(1, 'db-slave-2.example.com', 3306, 800),
(1, 'db-slave-3.example.com', 3306, 600);

-- Configure users
INSERT INTO mysql_users(username, password, default_hostgroup) VALUES
('app_user', 'app_password', 0),
('app_readonly', 'readonly_password', 1);

-- Query routing rules
INSERT INTO mysql_query_rules(rule_id, active, match_pattern, destination_hostgroup, apply) VALUES
(1, 1, '^SELECT.*', 1, 1),
(2, 1, '^INSERT|UPDATE|DELETE.*', 0, 1);

-- Connection pooling configuration
INSERT INTO mysql_connection_pool_servers(hostgroup_id, hostname, port, weight, max_connections) VALUES
(0, 'db-master.example.com', 3306, 1000, 200),
(1, 'db-slave-1.example.com', 3306, 800, 300),
(1, 'db-slave-2.example.com', 3306, 800, 300),
(1, 'db-slave-3.example.com', 3306, 600, 200);

LOAD MYSQL SERVERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
LOAD MYSQL USERS TO RUNTIME;
SAVE MYSQL USERS TO DISK;
LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

**📊 Connection Pooling Best Practices:**

✅ **Configuration Guidelines:**

- Pool size = 2 × CPU cores for OLTP workloads
- Monitor pool utilization and adjust based on actual usage
- Set appropriate timeouts to prevent resource leaks
- Use separate pools for different workload types
- Implement connection health checks

❌ **Common Mistakes:**

- Pool size too large (resource waste, connection limits)
- Pool size too small (connection starvation)
- Not handling connection failures gracefully
- Mixing long-running and short transactions in same pool
- Ignoring connection leak monitoring

---

## Summary & Next Steps

### 🎯 Key Takeaways

✅ **Replication**: Master-slave for read scaling, master-master for HA  
✅ **Scaling Strategies**: Vertical for simplicity, horizontal for unlimited growth  
✅ **Sharding**: Choose strategy based on query patterns and data distribution  
✅ **Connection Pooling**: Essential for performance and resource management  
✅ **High Availability**: Design for failure, implement redundancy

### 📈 Implementation Roadmap

1. **Start Simple**

   - Begin with master-slave replication
   - Implement connection pooling
   - Monitor performance and identify bottlenecks

2. **Scale Strategically**

   - Use vertical scaling for immediate needs
   - Plan horizontal scaling for long-term growth
   - Implement sharding when single database limits are reached

3. **Ensure Reliability**
   - Design for failure scenarios
   - Implement comprehensive backup strategies
   - Test disaster recovery procedures

### ⚠️ Common Architecture Pitfalls

- **Premature sharding**: Adding complexity before it's needed
- **Ignoring consistency**: Not planning for eventual consistency
- **Poor shard key choice**: Leading to hotspots and uneven distribution
- **No monitoring**: Missing early warning signs of scaling issues
- **Inadequate testing**: Not validating failure scenarios

**📈 Next Steps:**
Ready to explore NoSQL alternatives? Continue with [NoSQL Fundamentals & Types](./05-nosql-fundamentals-types.md) to learn about document, key-value, and graph databases, and when to use each type.

---

_💡 Pro Tip: Architecture decisions are hard to change later. Start with simple, proven patterns and evolve based on actual requirements. Monitor everything, plan for failure, and always have a rollback strategy._
