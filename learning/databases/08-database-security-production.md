# Database Security & Production Readiness 🔒

Master database security, production deployment strategies, and operational excellence for enterprise-grade database systems.

## Table of Contents

- [Authentication & Authorization](#authentication--authorization)
- [Data Encryption & Protection](#data-encryption--protection)
- [Backup & Recovery Strategies](#backup--recovery-strategies)
- [Monitoring & Alerting](#monitoring--alerting)
- [Production Deployment Patterns](#production-deployment-patterns)
- [Disaster Recovery & Business Continuity](#disaster-recovery--business-continuity)

---

## Authentication & Authorization

### Multi-Layered Security Architecture

```sql
-- Comprehensive MySQL security setup
-- 1. Create application-specific users with limited privileges

-- Database administration user
CREATE USER 'db_admin'@'%' IDENTIFIED BY 'complex_admin_password_2024!'
REQUIRE SSL;

GRANT ALL PRIVILEGES ON *.* TO 'db_admin'@'%' WITH GRANT OPTION;

-- Application read-write user
CREATE USER 'app_user'@'%' IDENTIFIED BY 'complex_app_password_2024!'
REQUIRE SSL;

-- Grant specific privileges only
GRANT SELECT, INSERT, UPDATE, DELETE ON ecommerce_db.* TO 'app_user'@'%';
GRANT SELECT ON mysql.proc TO 'app_user'@'%'; -- For stored procedures

-- Read-only analytics user
CREATE USER 'analytics_user'@'%' IDENTIFIED BY 'complex_analytics_password_2024!'
REQUIRE SSL;

GRANT SELECT ON ecommerce_db.* TO 'analytics_user'@'%';

-- Backup user
CREATE USER 'backup_user'@'localhost' IDENTIFIED BY 'complex_backup_password_2024!';
GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER ON *.* TO 'backup_user'@'localhost';

-- 2. Row-Level Security implementation
-- Create customer data access policy
CREATE TABLE customer_data_access (
    user_id INT,
    customer_id BIGINT,
    access_type ENUM('read', 'write', 'admin'),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INT,
    expires_at TIMESTAMP NULL,

    PRIMARY KEY (user_id, customer_id, access_type),
    INDEX idx_access_customer (customer_id),
    INDEX idx_access_expires (expires_at)
);

-- Secure view with row-level filtering
CREATE VIEW secure_customer_orders AS
SELECT o.*
FROM orders o
INNER JOIN customer_data_access cda
    ON o.customer_id = cda.customer_id
WHERE cda.user_id = CONNECTION_ID() -- Use connection-specific user ID
    AND cda.access_type IN ('read', 'write', 'admin')
    AND (cda.expires_at IS NULL OR cda.expires_at > NOW());

-- 3. Database firewall rules (MySQL Enterprise or similar)
-- Application can only connect from specific IPs
CREATE USER 'app_user'@'10.0.1.%' IDENTIFIED BY 'password';
CREATE USER 'app_user'@'10.0.2.%' IDENTIFIED BY 'password';

-- Admin access only from VPN network
CREATE USER 'db_admin'@'172.16.0.%' IDENTIFIED BY 'password';

-- 4. Audit logging setup
-- Enable general log for security auditing
SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = '/var/log/mysql/general.log';

-- Enable slow query log for performance monitoring
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
SET GLOBAL long_query_time = 2;
SET GLOBAL log_queries_not_using_indexes = 'ON';

-- Create audit table for sensitive operations
CREATE TABLE security_audit_log (
    audit_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_account VARCHAR(100) NOT NULL,
    connection_id BIGINT,
    operation_type ENUM('LOGIN', 'LOGOUT', 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'),
    table_name VARCHAR(100),
    query_text TEXT,
    client_ip VARCHAR(45),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,

    INDEX idx_audit_user (user_account),
    INDEX idx_audit_timestamp (timestamp),
    INDEX idx_audit_operation (operation_type),
    INDEX idx_audit_ip (client_ip)
);
```

### Advanced Authentication Patterns

```python
import hashlib
import secrets
import jwt
import bcrypt
from datetime import datetime, timedelta
from cryptography.fernet import Fernet

class DatabaseSecurityManager:
    def __init__(self):
        self.jwt_secret = secrets.token_urlsafe(32)
        self.encryption_key = Fernet.generate_key()
        self.cipher = Fernet(self.encryption_key)

    def hash_password(self, password):
        """Secure password hashing with bcrypt"""
        salt = bcrypt.gensalt(rounds=12)  # Adaptive cost factor
        return bcrypt.hashpw(password.encode('utf-8'), salt)

    def verify_password(self, password, hashed):
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed)

    def generate_api_key(self, user_id, permissions, expires_in_days=30):
        """Generate secure API key with embedded permissions"""
        payload = {
            'user_id': user_id,
            'permissions': permissions,
            'issued_at': datetime.utcnow().isoformat(),
            'expires_at': (datetime.utcnow() + timedelta(days=expires_in_days)).isoformat(),
            'key_id': secrets.token_urlsafe(16)
        }

        token = jwt.encode(payload, self.jwt_secret, algorithm='HS256')
        return token

    def validate_api_key(self, token):
        """Validate and decode API key"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'])

            # Check expiration
            expires_at = datetime.fromisoformat(payload['expires_at'])
            if datetime.utcnow() > expires_at:
                return None, "API key expired"

            return payload, None

        except jwt.InvalidTokenError as e:
            return None, f"Invalid API key: {str(e)}"

    def encrypt_sensitive_data(self, data):
        """Encrypt sensitive data for storage"""
        if isinstance(data, str):
            data = data.encode('utf-8')
        return self.cipher.encrypt(data)

    def decrypt_sensitive_data(self, encrypted_data):
        """Decrypt sensitive data"""
        decrypted = self.cipher.decrypt(encrypted_data)
        return decrypted.decode('utf-8')

    def create_secure_session(self, user_id, ip_address, user_agent):
        """Create secure session with fingerprinting"""

        # Create session fingerprint
        fingerprint_data = f"{ip_address}:{user_agent}:{self.jwt_secret}"
        fingerprint = hashlib.sha256(fingerprint_data.encode()).hexdigest()

        session_data = {
            'user_id': user_id,
            'ip_address': ip_address,
            'fingerprint': fingerprint,
            'created_at': datetime.utcnow().isoformat(),
            'expires_at': (datetime.utcnow() + timedelta(hours=24)).isoformat()
        }

        session_token = jwt.encode(session_data, self.jwt_secret, algorithm='HS256')

        return {
            'session_token': session_token,
            'fingerprint': fingerprint,
            'expires_at': session_data['expires_at']
        }

    def validate_session(self, session_token, current_ip, current_user_agent):
        """Validate session with security checks"""
        try:
            payload = jwt.decode(session_token, self.jwt_secret, algorithms=['HS256'])

            # Check expiration
            expires_at = datetime.fromisoformat(payload['expires_at'])
            if datetime.utcnow() > expires_at:
                return None, "Session expired"

            # Verify fingerprint
            expected_fingerprint_data = f"{current_ip}:{current_user_agent}:{self.jwt_secret}"
            expected_fingerprint = hashlib.sha256(expected_fingerprint_data.encode()).hexdigest()

            if payload['fingerprint'] != expected_fingerprint:
                return None, "Session fingerprint mismatch - possible hijacking"

            # Check IP address (optional - might be too strict for mobile users)
            if payload['ip_address'] != current_ip:
                # Log suspicious activity but don't fail immediately
                print(f"IP address changed for user {payload['user_id']}: {payload['ip_address']} -> {current_ip}")

            return payload, None

        except jwt.InvalidTokenError as e:
            return None, f"Invalid session: {str(e)}"

# Application-level security middleware
class SecureConnectionManager:
    def __init__(self, db_config):
        self.db_config = db_config
        self.security_manager = DatabaseSecurityManager()
        self.failed_attempts = {}  # Track failed login attempts

    def create_secure_connection(self, api_key, client_ip):
        """Create database connection with security validation"""

        # Rate limiting for failed attempts
        if self._is_rate_limited(client_ip):
            raise SecurityError("Too many failed attempts. Please try again later.")

        # Validate API key
        payload, error = self.security_manager.validate_api_key(api_key)
        if error:
            self._record_failed_attempt(client_ip)
            raise SecurityError(error)

        # Create database connection with user-specific credentials
        user_id = payload['user_id']
        permissions = payload['permissions']

        # Use different database users based on permissions
        if 'admin' in permissions:
            db_user = 'app_admin'
            db_password = self._get_encrypted_password('app_admin')
        elif 'write' in permissions:
            db_user = 'app_user'
            db_password = self._get_encrypted_password('app_user')
        else:
            db_user = 'app_readonly'
            db_password = self._get_encrypted_password('app_readonly')

        connection_config = {
            **self.db_config,
            'user': db_user,
            'password': db_password,
            'ssl_verify_cert': True,
            'ssl_verify_identity': True
        }

        return connection_config, payload

    def _is_rate_limited(self, client_ip):
        """Check if IP is rate limited"""
        if client_ip not in self.failed_attempts:
            return False

        attempts = self.failed_attempts[client_ip]

        # Reset counter if last attempt was more than 1 hour ago
        if (datetime.utcnow() - attempts['last_attempt']).total_seconds() > 3600:
            del self.failed_attempts[client_ip]
            return False

        return attempts['count'] >= 5

    def _record_failed_attempt(self, client_ip):
        """Record failed authentication attempt"""
        if client_ip not in self.failed_attempts:
            self.failed_attempts[client_ip] = {'count': 0, 'last_attempt': datetime.utcnow()}

        self.failed_attempts[client_ip]['count'] += 1
        self.failed_attempts[client_ip]['last_attempt'] = datetime.utcnow()

    def _get_encrypted_password(self, username):
        """Retrieve encrypted password from secure storage"""
        # In production, this would fetch from secure key management system
        encrypted_passwords = {
            'app_admin': b'gAAAAABh...',  # Encrypted password
            'app_user': b'gAAAAABh...',
            'app_readonly': b'gAAAAABh...'
        }

        encrypted_password = encrypted_passwords.get(username)
        if encrypted_password:
            return self.security_manager.decrypt_sensitive_data(encrypted_password)

        raise SecurityError(f"No password found for user: {username}")

class SecurityError(Exception):
    pass
```

### MongoDB Security Configuration

```javascript
// MongoDB security setup
// 1. Enable authentication
use admin
db.createUser({
    user: "admin",
    pwd: "complex_admin_password_2024!",
    roles: [
        { role: "userAdminAnyDatabase", db: "admin" },
        { role: "readWriteAnyDatabase", db: "admin" },
        { role: "dbAdminAnyDatabase", db: "admin" }
    ]
})

// 2. Create application users with specific roles
use ecommerce_db

// Read-write application user
db.createUser({
    user: "app_user",
    pwd: "complex_app_password_2024!",
    roles: [
        { role: "readWrite", db: "ecommerce_db" }
    ]
})

// Read-only analytics user
db.createUser({
    user: "analytics_user",
    pwd: "complex_analytics_password_2024!",
    roles: [
        { role: "read", db: "ecommerce_db" }
    ]
})

// 3. Custom roles for fine-grained permissions
db.createRole({
    role: "customerDataReader",
    privileges: [
        {
            resource: { db: "ecommerce_db", collection: "customers" },
            actions: ["find", "listIndexes", "listCollections"]
        },
        {
            resource: { db: "ecommerce_db", collection: "orders" },
            actions: ["find", "listIndexes"]
        }
    ],
    roles: []
})

// 4. Field-level security with views
db.createView(
    "secure_customer_view",
    "customers",
    [
        {
            $project: {
                email: 1,
                firstName: 1,
                lastName: 1,
                createdAt: 1,
                // Exclude sensitive fields
                ssn: 0,
                creditCardInfo: 0,
                internalNotes: 0
            }
        }
    ]
)

// 5. Audit configuration
db.adminCommand({
    setParameter: 1,
    auditAuthorizationSuccess: true
})

// Enable auditing for specific operations
db.adminCommand({
    setParameter: 1,
    auditFilter: {
        atype: "authenticate",
        "param.user": { $ne: "system" }
    }
})
```

**📊 Authentication & Authorization Best Practices:**

✅ **Multi-Factor Authentication:**

- Implement MFA for admin accounts
- Use API keys with embedded permissions
- Session fingerprinting for web applications
- IP whitelisting for sensitive operations

✅ **Principle of Least Privilege:**

- Create role-specific database users
- Limit network access by IP/subnet
- Use read-only connections when possible
- Regular permission audits and cleanup

---

## Data Encryption & Protection

### Encryption at Rest and in Transit

```yaml
# Docker Compose with encryption
version: "3.8"
services:
  database:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ecommerce_db
    command: >
      --ssl-ca=/etc/mysql/ssl/ca.pem
      --ssl-cert=/etc/mysql/ssl/server-cert.pem
      --ssl-key=/etc/mysql/ssl/server-key.pem
      --require-secure-transport=ON
      --default-authentication-plugin=mysql_native_password
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
      --innodb-file-per-table=1
      --innodb-encrypt-tables=ON
      --innodb-encryption-threads=4
    volumes:
      - db_data:/var/lib/mysql
      - ./ssl:/etc/mysql/ssl:ro
      - ./mysql.cnf:/etc/mysql/conf.d/custom.cnf
    ports:
      - "3306:3306"
    networks:
      - secure_network

  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --tls-port 6380
      --tls-cert-file /etc/redis/ssl/redis.crt
      --tls-key-file /etc/redis/ssl/redis.key
      --tls-ca-cert-file /etc/redis/ssl/ca.crt
      --tls-auth-clients yes
    volumes:
      - redis_data:/data
      - ./redis-ssl:/etc/redis/ssl:ro
    networks:
      - secure_network

  mongodb:
    image: mongo:7.0
    command: >
      mongod
      --auth
      --tlsMode requireTLS
      --tlsCertificateKeyFile /etc/mongodb/ssl/mongodb.pem
      --tlsCAFile /etc/mongodb/ssl/ca.pem
      --keyFile /etc/mongodb/security/mongodb-keyfile
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    volumes:
      - mongo_data:/data/db
      - ./mongodb-ssl:/etc/mongodb/ssl:ro
      - ./mongodb-keyfile:/etc/mongodb/security/mongodb-keyfile:ro
    networks:
      - secure_network

volumes:
  db_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /encrypted/mysql-data
  redis_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /encrypted/redis-data
  mongo_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /encrypted/mongo-data

networks:
  secure_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Application-Level Encryption

```python
import base64
import json
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization
import os

class DataEncryptionService:
    def __init__(self, master_key=None):
        if master_key:
            self.master_key = master_key.encode()
        else:
            self.master_key = os.environ.get('MASTER_ENCRYPTION_KEY', '').encode()

        if not self.master_key:
            raise ValueError("Master encryption key not provided")

        # Derive encryption key from master key
        salt = b'stable_salt_for_key_derivation'  # In production, use random salt per record
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.master_key))
        self.cipher = Fernet(key)

        # RSA key pair for asymmetric encryption
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        self.public_key = self.private_key.public_key()

    def encrypt_field(self, data, field_type='string'):
        """Encrypt individual database field"""
        if data is None:
            return None

        if field_type == 'json':
            data = json.dumps(data)
        elif field_type != 'string':
            data = str(data)

        encrypted_data = self.cipher.encrypt(data.encode())
        return base64.urlsafe_b64encode(encrypted_data).decode()

    def decrypt_field(self, encrypted_data, field_type='string'):
        """Decrypt individual database field"""
        if encrypted_data is None:
            return None

        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = self.cipher.decrypt(encrypted_bytes).decode()

            if field_type == 'json':
                return json.loads(decrypted_data)
            elif field_type == 'int':
                return int(decrypted_data)
            elif field_type == 'float':
                return float(decrypted_data)
            else:
                return decrypted_data

        except Exception as e:
            raise ValueError(f"Failed to decrypt field: {str(e)}")

    def encrypt_large_data(self, data):
        """Encrypt large data using hybrid encryption"""
        # Generate symmetric key for this data
        data_key = Fernet.generate_key()
        data_cipher = Fernet(data_key)

        # Encrypt data with symmetric key
        if isinstance(data, str):
            data = data.encode()
        encrypted_data = data_cipher.encrypt(data)

        # Encrypt symmetric key with RSA public key
        encrypted_key = self.public_key.encrypt(
            data_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )

        return {
            'encrypted_data': base64.urlsafe_b64encode(encrypted_data).decode(),
            'encrypted_key': base64.urlsafe_b64encode(encrypted_key).decode()
        }

    def decrypt_large_data(self, encrypted_package):
        """Decrypt large data using hybrid encryption"""
        # Decrypt symmetric key with RSA private key
        encrypted_key = base64.urlsafe_b64decode(encrypted_package['encrypted_key'])
        data_key = self.private_key.decrypt(
            encrypted_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )

        # Decrypt data with symmetric key
        data_cipher = Fernet(data_key)
        encrypted_data = base64.urlsafe_b64decode(encrypted_package['encrypted_data'])
        decrypted_data = data_cipher.decrypt(encrypted_data)

        return decrypted_data

# Database model with automatic encryption
class EncryptedUserModel:
    def __init__(self, encryption_service):
        self.encryption = encryption_service

    def create_user(self, user_data):
        """Create user with encrypted sensitive fields"""

        # Fields that should be encrypted
        encrypted_fields = {
            'ssn': self.encryption.encrypt_field(user_data.get('ssn')),
            'credit_card': self.encryption.encrypt_field(user_data.get('credit_card')),
            'address': self.encryption.encrypt_field(user_data.get('address'), 'json'),
            'phone': self.encryption.encrypt_field(user_data.get('phone'))
        }

        # Regular fields (not encrypted)
        user_record = {
            'id': user_data.get('id'),
            'email': user_data.get('email'),  # Hash instead of encrypt for searchability
            'first_name': user_data.get('first_name'),
            'last_name': user_data.get('last_name'),
            'created_at': user_data.get('created_at'),
            **encrypted_fields
        }

        return user_record

    def get_user(self, user_record):
        """Retrieve user with decrypted sensitive fields"""

        # Decrypt sensitive fields
        decrypted_user = {
            'id': user_record['id'],
            'email': user_record['email'],
            'first_name': user_record['first_name'],
            'last_name': user_record['last_name'],
            'created_at': user_record['created_at'],
            'ssn': self.encryption.decrypt_field(user_record.get('ssn')),
            'credit_card': self.encryption.decrypt_field(user_record.get('credit_card')),
            'address': self.encryption.decrypt_field(user_record.get('address'), 'json'),
            'phone': self.encryption.decrypt_field(user_record.get('phone'))
        }

        return decrypted_user

# Usage example
encryption_service = DataEncryptionService()
user_model = EncryptedUserModel(encryption_service)

# Create user with encryption
user_data = {
    'id': 12345,
    'email': 'user@example.com',
    'first_name': 'John',
    'last_name': 'Doe',
    'ssn': '123-45-6789',
    'credit_card': '4111-1111-1111-1111',
    'address': {
        'street': '123 Main St',
        'city': 'Boston',
        'state': 'MA',
        'zip': '02101'
    },
    'phone': '+1-555-123-4567'
}

encrypted_user = user_model.create_user(user_data)
# Store encrypted_user in database

# Retrieve and decrypt
decrypted_user = user_model.get_user(encrypted_user)
```

### Transparent Data Encryption (TDE)

```sql
-- MySQL TDE setup
-- 1. Install keyring plugin
INSTALL PLUGIN keyring_file SONAME 'keyring_file.so';

-- 2. Set keyring file location in my.cnf
-- [mysqld]
-- early-plugin-load=keyring_file.so
-- keyring_file_data=/var/lib/mysql-keyring/keyring

-- 3. Enable encryption for new tables
CREATE TABLE encrypted_customer_data (
    customer_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) NOT NULL,
    encrypted_ssn VARBINARY(255),
    encrypted_credit_card VARBINARY(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENCRYPTION='Y';

-- 4. Encrypt existing table
ALTER TABLE sensitive_data ENCRYPTION='Y';

-- 5. Check encryption status
SELECT
    TABLE_SCHEMA,
    TABLE_NAME,
    CREATE_OPTIONS
FROM information_schema.TABLES
WHERE CREATE_OPTIONS LIKE '%ENCRYPTION%';

-- PostgreSQL TDE with encryption at rest
-- Enable transparent data encryption
-- In postgresql.conf:
-- wal_level = replica
-- archive_mode = on
-- archive_command = 'pgbackrest --stanza=main archive-push %p'

-- Create encrypted tablespace
CREATE TABLESPACE encrypted_space
LOCATION '/encrypted/postgres/data'
WITH (encryption_key_id = 'production_key_001');

-- Create table in encrypted tablespace
CREATE TABLE encrypted_customer_data (
    customer_id BIGSERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    encrypted_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) TABLESPACE encrypted_space;
```

**📊 Encryption Strategy Matrix:**

| Data Type                   | Encryption Method  | Key Management        | Performance Impact |
| --------------------------- | ------------------ | --------------------- | ------------------ |
| **PII (SSN, Credit Cards)** | AES-256            | HSM/Key Vault         | Low                |
| **Large Documents**         | Hybrid (RSA + AES) | Key Vault             | Medium             |
| **Database Files**          | TDE                | Database Native       | Low                |
| **Backups**                 | AES-256            | External KMS          | Low                |
| **Network Traffic**         | TLS 1.3            | Certificate Authority | Minimal            |

---

## Backup & Recovery Strategies

### Comprehensive Backup Strategy

```bash
#!/bin/bash
# Comprehensive MySQL backup script with encryption and validation

# Configuration
DB_HOST="localhost"
DB_USER="backup_user"
DB_PASSWORD_FILE="/etc/mysql/backup_password"
BACKUP_DIR="/backup/mysql"
ENCRYPTION_KEY_FILE="/etc/mysql/backup_encryption_key"
S3_BUCKET="company-db-backups"
RETENTION_DAYS=30
RETENTION_WEEKS=12
RETENTION_MONTHS=12

# Create timestamped backup directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"
mkdir -p "${BACKUP_PATH}"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "${BACKUP_PATH}/backup.log"
}

# Function to perform full backup
perform_full_backup() {
    local db_name=$1
    local backup_file="${BACKUP_PATH}/${db_name}_full_${TIMESTAMP}.sql"

    log_message "Starting full backup for database: ${db_name}"

    # Create backup with mysqldump
    mysqldump \
        --host="${DB_HOST}" \
        --user="${DB_USER}" \
        --password="$(cat ${DB_PASSWORD_FILE})" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --flush-logs \
        --master-data=2 \
        --quick \
        --lock-tables=false \
        "${db_name}" > "${backup_file}"

    if [ $? -eq 0 ]; then
        log_message "Full backup completed successfully: ${backup_file}"

        # Compress backup
        gzip "${backup_file}"
        backup_file="${backup_file}.gz"

        # Encrypt backup
        encrypt_backup "${backup_file}"

        # Validate backup
        validate_backup "${backup_file}.enc"

        return 0
    else
        log_message "ERROR: Full backup failed for database: ${db_name}"
        return 1
    fi
}

# Function to perform incremental backup using binary logs
perform_incremental_backup() {
    local last_backup_lsn_file="${BACKUP_DIR}/last_backup_position"
    local current_position_file="${BACKUP_PATH}/current_position"

    log_message "Starting incremental backup"

    # Get current binary log position
    mysql --host="${DB_HOST}" --user="${DB_USER}" --password="$(cat ${DB_PASSWORD_FILE})" \
        -e "SHOW MASTER STATUS" > "${current_position_file}"

    if [ -f "${last_backup_lsn_file}" ]; then
        local last_log_file=$(cat "${last_backup_lsn_file}" | grep -v "File" | awk '{print $1}')
        local last_position=$(cat "${last_backup_lsn_file}" | grep -v "File" | awk '{print $2}')

        # Copy binary logs since last backup
        mysqlbinlog \
            --host="${DB_HOST}" \
            --user="${DB_USER}" \
            --password="$(cat ${DB_PASSWORD_FILE})" \
            --start-position="${last_position}" \
            "${last_log_file}" > "${BACKUP_PATH}/incremental_${TIMESTAMP}.sql"

        if [ $? -eq 0 ]; then
            log_message "Incremental backup completed successfully"

            # Update last backup position
            cp "${current_position_file}" "${last_backup_lsn_file}"

            # Encrypt incremental backup
            gzip "${BACKUP_PATH}/incremental_${TIMESTAMP}.sql"
            encrypt_backup "${BACKUP_PATH}/incremental_${TIMESTAMP}.sql.gz"

            return 0
        else
            log_message "ERROR: Incremental backup failed"
            return 1
        fi
    else
        log_message "No previous backup found, performing full backup instead"
        return 1
    fi
}

# Function to encrypt backup
encrypt_backup() {
    local backup_file=$1
    local encrypted_file="${backup_file}.enc"

    log_message "Encrypting backup: ${backup_file}"

    # Encrypt using AES-256
    openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
        -in "${backup_file}" \
        -out "${encrypted_file}" \
        -pass file:"${ENCRYPTION_KEY_FILE}"

    if [ $? -eq 0 ]; then
        log_message "Backup encrypted successfully: ${encrypted_file}"
        # Remove unencrypted file
        rm "${backup_file}"
        return 0
    else
        log_message "ERROR: Backup encryption failed"
        return 1
    fi
}

# Function to validate backup
validate_backup() {
    local backup_file=$1
    local validation_db="backup_validation_$(date +%s)"

    log_message "Validating backup: ${backup_file}"

    # Decrypt backup for validation
    local decrypted_file="${backup_file%.enc}.validation"
    openssl enc -aes-256-cbc -d -pbkdf2 -iter 100000 \
        -in "${backup_file}" \
        -out "${decrypted_file}" \
        -pass file:"${ENCRYPTION_KEY_FILE}"

    if [ $? -ne 0 ]; then
        log_message "ERROR: Failed to decrypt backup for validation"
        return 1
    fi

    # Decompress if needed
    if [[ "${decrypted_file}" == *.gz ]]; then
        gunzip "${decrypted_file}"
        decrypted_file="${decrypted_file%.gz}"
    fi

    # Create validation database
    mysql --host="${DB_HOST}" --user="${DB_USER}" --password="$(cat ${DB_PASSWORD_FILE})" \
        -e "CREATE DATABASE ${validation_db}"

    # Restore backup to validation database
    mysql --host="${DB_HOST}" --user="${DB_USER}" --password="$(cat ${DB_PASSWORD_FILE})" \
        "${validation_db}" < "${decrypted_file}"

    if [ $? -eq 0 ]; then
        # Check table count and data integrity
        local table_count=$(mysql --host="${DB_HOST}" --user="${DB_USER}" --password="$(cat ${DB_PASSWORD_FILE})" \
            -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${validation_db}'" -s -N)

        if [ "${table_count}" -gt 0 ]; then
            log_message "Backup validation successful: ${table_count} tables restored"

            # Calculate checksums for data integrity
            mysql --host="${DB_HOST}" --user="${DB_USER}" --password="$(cat ${DB_PASSWORD_FILE})" \
                -e "CHECKSUM TABLE ${validation_db}.*" > "${BACKUP_PATH}/validation_checksums.txt"

            # Cleanup validation database
            mysql --host="${DB_HOST}" --user="${DB_USER}" --password="$(cat ${DB_PASSWORD_FILE})" \
                -e "DROP DATABASE ${validation_db}"

            # Remove decrypted validation file
            rm "${decrypted_file}"

            return 0
        else
            log_message "ERROR: Backup validation failed - no tables found"
            return 1
        fi
    else
        log_message "ERROR: Backup validation failed - restore error"
        return 1
    fi
}

# Function to upload to cloud storage
upload_to_cloud() {
    local backup_file=$1

    log_message "Uploading backup to cloud storage: ${backup_file}"

    # Upload to S3 with server-side encryption
    aws s3 cp "${backup_file}" \
        "s3://${S3_BUCKET}/mysql/$(basename ${backup_file})" \
        --server-side-encryption AES256 \
        --storage-class STANDARD_IA

    if [ $? -eq 0 ]; then
        log_message "Cloud upload completed successfully"
        return 0
    else
        log_message "ERROR: Cloud upload failed"
        return 1
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    log_message "Starting backup cleanup"

    # Local cleanup - keep daily backups for 30 days
    find "${BACKUP_DIR}" -type d -name "20*" -mtime +${RETENTION_DAYS} -exec rm -rf {} \;

    # Cloud cleanup using lifecycle policies (configured separately)
    log_message "Local backup cleanup completed"
}

# Main backup execution
main() {
    log_message "Starting backup process"

    # Determine backup type based on day of week
    local day_of_week=$(date +%w)

    if [ "${day_of_week}" -eq 0 ]; then
        # Sunday - Full backup
        log_message "Performing weekly full backup"
        perform_full_backup "ecommerce_db"

        if [ $? -eq 0 ]; then
            # Upload full backup to cloud
            for file in "${BACKUP_PATH}"/*.enc; do
                upload_to_cloud "${file}"
            done
        fi
    else
        # Weekday - Incremental backup
        log_message "Performing daily incremental backup"
        perform_incremental_backup

        if [ $? -ne 0 ]; then
            # Fall back to full backup if incremental fails
            log_message "Incremental backup failed, performing full backup"
            perform_full_backup "ecommerce_db"
        fi
    fi

    # Cleanup old backups
    cleanup_old_backups

    log_message "Backup process completed"

    # Send notification
    echo "Backup completed at $(date)" | mail -s "Database Backup Status" admin@company.com
}

# Execute main function
main "$@"
```

### MongoDB Backup Strategy

```javascript
// MongoDB backup and restore strategy
// 1. Replica set backup script

const { MongoClient } = require("mongodb");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class MongoBackupManager {
  constructor(config) {
    this.config = config;
    this.backupDir = config.backupDir || "/backup/mongodb";
    this.encryptionKey = config.encryptionKey;
  }

  async performBackup(type = "full") {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(this.backupDir, timestamp);

    try {
      // Create backup directory
      fs.mkdirSync(backupPath, { recursive: true });

      if (type === "full") {
        await this.fullBackup(backupPath, timestamp);
      } else {
        await this.incrementalBackup(backupPath, timestamp);
      }

      // Encrypt backup
      await this.encryptBackup(backupPath);

      // Validate backup
      await this.validateBackup(backupPath);

      // Upload to cloud storage
      await this.uploadToCloud(backupPath);

      console.log(`Backup completed successfully: ${backupPath}`);
    } catch (error) {
      console.error(`Backup failed: ${error.message}`);
      throw error;
    }
  }

  async fullBackup(backupPath, timestamp) {
    return new Promise((resolve, reject) => {
      // Use mongodump for full backup
      const mongodump = spawn("mongodump", [
        "--host",
        this.config.host,
        "--port",
        this.config.port,
        "--username",
        this.config.username,
        "--password",
        this.config.password,
        "--authenticationDatabase",
        "admin",
        "--ssl",
        "--sslAllowInvalidCertificates",
        "--out",
        backupPath,
        "--oplog", // Include oplog for point-in-time recovery
      ]);

      mongodump.on("close", (code) => {
        if (code === 0) {
          console.log(`Full backup completed: ${backupPath}`);
          resolve();
        } else {
          reject(new Error(`mongodump exited with code ${code}`));
        }
      });

      mongodump.on("error", (error) => {
        reject(error);
      });
    });
  }

  async incrementalBackup(backupPath, timestamp) {
    // MongoDB incremental backup using oplog
    const client = new MongoClient(this.config.connectionString);

    try {
      await client.connect();
      const db = client.db("local");
      const oplog = db.collection("oplog.rs");

      // Get last backup timestamp
      const lastBackupFile = path.join(this.backupDir, "last_backup_timestamp");
      let lastTimestamp;

      if (fs.existsSync(lastBackupFile)) {
        lastTimestamp = JSON.parse(fs.readFileSync(lastBackupFile, "utf8")).timestamp;
      } else {
        // If no previous backup, get current timestamp
        const status = await db.admin().replSetGetStatus();
        lastTimestamp = status.members.find((m) => m.self).optime.ts;
      }

      // Export oplog entries since last backup
      const oplogEntries = await oplog
        .find({
          ts: { $gt: lastTimestamp },
        })
        .toArray();

      // Save oplog entries
      const oplogFile = path.join(backupPath, "oplog_incremental.json");
      fs.writeFileSync(oplogFile, JSON.stringify(oplogEntries, null, 2));

      // Update last backup timestamp
      const currentTimestamp = oplogEntries.length > 0 ? oplogEntries[oplogEntries.length - 1].ts : lastTimestamp;

      fs.writeFileSync(
        lastBackupFile,
        JSON.stringify({
          timestamp: currentTimestamp,
          backup_path: backupPath,
        })
      );

      console.log(`Incremental backup completed: ${oplogEntries.length} operations`);
    } finally {
      await client.close();
    }
  }

  async encryptBackup(backupPath) {
    const files = fs.readdirSync(backupPath);

    for (const file of files) {
      const filePath = path.join(backupPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile() && !file.endsWith(".enc")) {
        const cipher = crypto.createCipher("aes-256-cbc", this.encryptionKey);
        const input = fs.createReadStream(filePath);
        const output = fs.createWriteStream(`${filePath}.enc`);

        await new Promise((resolve, reject) => {
          input.pipe(cipher).pipe(output);
          output.on("close", resolve);
          output.on("error", reject);
        });

        // Remove unencrypted file
        fs.unlinkSync(filePath);
      }
    }
  }

  async validateBackup(backupPath) {
    // Basic validation - check if required files exist
    const requiredFiles = ["admin", "ecommerce_db"];

    for (const dir of requiredFiles) {
      const dirPath = path.join(backupPath, dir);
      if (!fs.existsSync(dirPath)) {
        throw new Error(`Required backup directory missing: ${dir}`);
      }
    }

    console.log("Backup validation successful");
  }

  async uploadToCloud(backupPath) {
    // Upload to AWS S3 or similar
    const AWS = require("aws-sdk");
    const s3 = new AWS.S3();

    const files = this.getAllFiles(backupPath);

    for (const file of files) {
      const key = path.relative(this.backupDir, file);
      const body = fs.createReadStream(file);

      await s3
        .upload({
          Bucket: this.config.s3Bucket,
          Key: `mongodb/${key}`,
          Body: body,
          ServerSideEncryption: "AES256",
        })
        .promise();
    }

    console.log("Cloud upload completed");
  }

  getAllFiles(dir) {
    let files = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files = files.concat(this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }
}

// Usage
const backupManager = new MongoBackupManager({
  host: "mongodb-primary.example.com",
  port: 27017,
  username: "backup_user",
  password: process.env.MONGODB_BACKUP_PASSWORD,
  connectionString: process.env.MONGODB_CONNECTION_STRING,
  backupDir: "/backup/mongodb",
  encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
  s3Bucket: "company-mongodb-backups",
});

// Schedule backups
const schedule = require("node-schedule");

// Full backup every Sunday at 2 AM
schedule.scheduleJob("0 2 * * 0", async () => {
  await backupManager.performBackup("full");
});

// Incremental backup every day at 2 AM (except Sunday)
schedule.scheduleJob("0 2 * * 1-6", async () => {
  await backupManager.performBackup("incremental");
});
```

**📊 Backup Strategy Matrix:**

| Backup Type         | Frequency  | Retention | Storage Location | RTO        | RPO        |
| ------------------- | ---------- | --------- | ---------------- | ---------- | ---------- |
| **Full**            | Weekly     | 3 months  | Local + Cloud    | 4 hours    | 24 hours   |
| **Incremental**     | Daily      | 30 days   | Local + Cloud    | 2 hours    | 2 hours    |
| **Transaction Log** | 15 minutes | 7 days    | Local            | 30 minutes | 15 minutes |
| **Snapshot**        | 4x daily   | 72 hours  | SAN/Cloud        | 15 minutes | 6 hours    |

---

## Summary & Key Takeaways

### 🎯 Database Security Mastery

✅ **Authentication & Authorization**: Multi-layered security with role-based access  
✅ **Data Encryption**: At-rest, in-transit, and application-level encryption  
✅ **Backup & Recovery**: Comprehensive strategies with validation and testing  
✅ **Monitoring & Alerting**: Proactive security and performance monitoring  
✅ **Production Readiness**: Deployment patterns for enterprise environments

### 📈 Security Best Practices

1. **Defense in Depth**

   - Network security (firewalls, VPNs)
   - Database-level authentication
   - Application-level authorization
   - Encryption at multiple layers

2. **Principle of Least Privilege**

   - Role-based database access
   - Connection-specific users
   - Time-limited API keys
   - Regular permission audits

3. **Continuous Monitoring**
   - Real-time security alerts
   - Performance metrics tracking
   - Backup validation testing
   - Regular security assessments

### ⚠️ Common Security Pitfalls

- **Weak authentication**: Default passwords, no MFA
- **Excessive privileges**: Admin access for applications
- **Unencrypted data**: PII stored in plain text
- **Untested backups**: Backup files that can't be restored
- **Missing monitoring**: No alerts for security events

**🎓 Congratulations!**
You've completed the comprehensive Database SDE2 Mastery Guide! You now have enterprise-level knowledge of:

- SQL fundamentals and advanced techniques
- Database design and normalization
- Advanced SQL and performance optimization
- Database architecture and scaling strategies
- NoSQL fundamentals and MongoDB deep dive
- Redis caching strategies
- Database security and production readiness

**📈 Next Steps:**

- Practice implementing these patterns in real projects
- Set up monitoring and alerting for your databases
- Experiment with different database technologies
- Contribute to open-source database projects
- Stay updated with latest database security practices

---

_💡 Pro Tip: Database security is not a one-time setup—it's an ongoing process. Regularly review and update your security practices, monitor for new threats, and always test your backup and recovery procedures. The best security strategy is one that's actively maintained and continuously improved._
