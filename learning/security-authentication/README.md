# Security & Authentication for SDE2 Engineers 🔐

## 🎯 **Overview**

Security is CRITICAL for SDE2 engineers. Modern applications require robust authentication, secure API design, and protection against common vulnerabilities. This guide covers practical security implementation for production systems.

## 📚 **Complete Security Learning Path**

### **🔐 Authentication Fundamentals**

1. [JWT & Token-Based Authentication](./01-jwt-authentication.md)
2. [OAuth 2.0 & OpenID Connect](./02-oauth-openid.md)
3. [Session Management & Security](./03-session-management.md)

### **🛡️ API Security**

4. [REST API Security Best Practices](./04-api-security.md)
5. [Rate Limiting & Throttling](./05-rate-limiting.md)
6. [CORS & Content Security Policy](./06-cors-csp.md)

### **🔍 Vulnerability Prevention**

7. [OWASP Top 10 & Mitigation](./07-owasp-top10.md)
8. [Input Validation & Sanitization](./08-input-validation.md)
9. [SQL Injection Prevention](./09-sql-injection-prevention.md)

### **🏢 Production Security**

10. [HTTPS & TLS Implementation](./10-https-tls.md)
11. [Secret Management](./11-secret-management.md)
12. [Security Testing & Auditing](./12-security-testing.md)

---

## 🚨 **Why Security is Critical for SDE2**

### **🏢 Industry Requirements**

- **90% of security breaches** involve application vulnerabilities
- **GDPR/CCPA compliance** is mandatory for most applications
- **Security-by-design** is expected in all SDE2 deliverables
- **DevSecOps** integration is standard practice

### **💼 SDE2 Security Responsibilities**

- **Secure Authentication**: Implementing robust login systems
- **API Protection**: Securing REST/GraphQL endpoints
- **Data Protection**: Encrypting sensitive information
- **Vulnerability Assessment**: Identifying and fixing security issues
- **Compliance**: Meeting regulatory requirements
- **Incident Response**: Handling security breaches

---

## 🚀 **Essential Security Skills - Quick Start**

### **1. JWT Authentication (Must Have)**

```java
// Spring Boot JWT implementation
@RestController
public class AuthController {

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @Autowired
    private UserDetailsService userDetailsService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            // Authenticate user
            Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    request.getUsername(),
                    request.getPassword()
                )
            );

            // Generate JWT token
            UserDetails userDetails = (UserDetails) auth.getPrincipal();
            String token = jwtTokenUtil.generateToken(userDetails);

            return ResponseEntity.ok(new JwtResponse(token));

        } catch (BadCredentialsException e) {
            throw new SecurityException("Invalid credentials");
        }
    }

    @GetMapping("/profile")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<UserProfile> getProfile(Authentication auth) {
        String username = auth.getName();
        UserProfile profile = userService.getUserProfile(username);
        return ResponseEntity.ok(profile);
    }
}

// JWT Token Utility
@Component
public class JwtTokenUtil {

    private String secret = "mySecretKey"; // Use environment variable
    private int jwtExpiration = 86400; // 24 hours

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", userDetails.getAuthorities());
        return createToken(claims, userDetails.getUsername());
    }

    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
            .setClaims(claims)
            .setSubject(subject)
            .setIssuedAt(new Date(System.currentTimeMillis()))
            .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration * 1000))
            .signWith(SignatureAlgorithm.HS512, secret)
            .compact();
    }

    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = getUsernameFromToken(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }
}
```

### **2. OAuth 2.0 Implementation**

```javascript
// Node.js OAuth 2.0 with Passport.js
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// Configure Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        } else {
          // Create new user
          user = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            avatar: profile.photos[0].value,
          });
          return done(null, user);
        }
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// OAuth routes
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/login" }), (req, res) => {
  // Generate JWT token for authenticated user
  const token = jwt.sign({ userId: req.user.id, email: req.user.email }, process.env.JWT_SECRET, { expiresIn: "24h" });

  res.redirect(`/dashboard?token=${token}`);
});
```

### **3. API Security with Rate Limiting**

```python
# Flask API with comprehensive security
from flask import Flask, request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
import jwt
import bcrypt
from functools import wraps

app = Flask(__name__)

# Rate limiting configuration
limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# CORS configuration
CORS(app, origins=['https://trusted-domain.com'])

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')

        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        try:
            # Remove 'Bearer ' prefix
            token = token.split(' ')[1]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid'}), 401

        return f(current_user_id, *args, **kwargs)

    return decorated

@app.route('/api/users', methods=['GET'])
@limiter.limit("10 per minute")
@token_required
def get_users(current_user_id):
    # Input validation
    page = request.args.get('page', 1, type=int)
    limit = min(request.args.get('limit', 10, type=int), 100)  # Max 100

    if page < 1 or limit < 1:
        return jsonify({'error': 'Invalid pagination parameters'}), 400

    # Secure database query (parameterized)
    users = db.session.query(User).offset((page-1) * limit).limit(limit).all()

    return jsonify({
        'users': [user.to_dict() for user in users],
        'pagination': {'page': page, 'limit': limit}
    })

@app.route('/api/users', methods=['POST'])
@limiter.limit("5 per minute")
@token_required
def create_user(current_user_id):
    try:
        data = request.get_json()

        # Input validation
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password required'}), 400

        # Email validation
        if not re.match(r'^[^@]+@[^@]+\.[^@]+$', data['email']):
            return jsonify({'error': 'Invalid email format'}), 400

        # Password strength validation
        if len(data['password']) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400

        # Hash password
        hashed_password = bcrypt.hashpw(
            data['password'].encode('utf-8'),
            bcrypt.gensalt()
        )

        # Create user (parameterized query prevents SQL injection)
        user = User(
            email=data['email'].lower().strip(),
            password=hashed_password,
            created_by=current_user_id
        )

        db.session.add(user)
        db.session.commit()

        return jsonify({'message': 'User created successfully'}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500
```

---

## 🛡️ **OWASP Top 10 - SDE2 Essentials**

### **1. Injection Attacks Prevention**

```java
// SQL Injection Prevention with Prepared Statements
@Repository
public class UserRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // SECURE: Using parameterized queries
    public User findByEmail(String email) {
        String sql = "SELECT * FROM users WHERE email = ?";
        return jdbcTemplate.queryForObject(sql, new Object[]{email}, userRowMapper);
    }

    // INSECURE: Don't do this!
    // String sql = "SELECT * FROM users WHERE email = '" + email + "'";

    // NoSQL Injection Prevention (MongoDB)
    public User findUserSecure(String userId) {
        // Validate input
        if (!ObjectId.isValid(userId)) {
            throw new IllegalArgumentException("Invalid user ID format");
        }

        Query query = new Query(Criteria.where("_id").is(new ObjectId(userId)));
        return mongoTemplate.findOne(query, User.class);
    }
}
```

### **2. Broken Authentication Prevention**

```javascript
// Secure password handling and authentication
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Secure password hashing
async function hashPassword(password) {
  const saltRounds = 12; // Strong salt rounds
  return await bcrypt.hash(password, saltRounds);
}

// Secure password verification
async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// Login endpoint with security measures
app.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check account lockout
    if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
      return res.status(423).json({ error: "Account temporarily locked" });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      // Increment failed attempts
      await user.incrementFailedAttempts();
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Reset failed attempts on successful login
    await user.resetFailedAttempts();

    // Generate secure JWT
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
        issuer: "your-app-name",
        audience: "your-app-users",
      }
    );

    // Set secure HTTP-only cookie
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000, // 1 hour
    });

    res.json({ message: "Login successful" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
```

### **3. Sensitive Data Exposure Prevention**

```python
# Data encryption and secure handling
from cryptography.fernet import Fernet
import os
import hashlib

class DataEncryption:
    def __init__(self):
        # Use environment variable for encryption key
        key = os.environ.get('ENCRYPTION_KEY')
        if not key:
            # Generate new key (store securely!)
            key = Fernet.generate_key()
            print(f"Generated new encryption key: {key.decode()}")
        else:
            key = key.encode()

        self.cipher_suite = Fernet(key)

    def encrypt_sensitive_data(self, data):
        """Encrypt sensitive data like PII"""
        if isinstance(data, str):
            data = data.encode()
        return self.cipher_suite.encrypt(data)

    def decrypt_sensitive_data(self, encrypted_data):
        """Decrypt sensitive data"""
        return self.cipher_suite.decrypt(encrypted_data).decode()

    def hash_password(self, password):
        """Hash password with salt"""
        salt = os.urandom(32)
        key = hashlib.pbkdf2_hmac('sha256',
                                  password.encode('utf-8'),
                                  salt,
                                  100000)  # 100k iterations
        return salt + key

    def verify_password(self, password, hashed):
        """Verify password against hash"""
        salt = hashed[:32]
        key = hashed[32:]
        new_key = hashlib.pbkdf2_hmac('sha256',
                                      password.encode('utf-8'),
                                      salt,
                                      100000)
        return key == new_key

# Example usage in Flask app
@app.route('/api/users/<int:user_id>/profile', methods=['GET'])
@token_required
def get_user_profile(current_user_id, user_id):
    # Authorization check
    if current_user_id != user_id and not current_user.is_admin():
        return jsonify({'error': 'Unauthorized'}), 403

    user = User.query.get_or_404(user_id)

    # Decrypt sensitive data only when needed
    decrypted_ssn = encryption.decrypt_sensitive_data(user.encrypted_ssn)

    # Return filtered data (don't expose everything)
    return jsonify({
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'ssn': f"***-**-{decrypted_ssn[-4:]}"  # Partially masked
    })
```

---

## 🔒 **Security Best Practices for SDE2**

### **🎯 Authentication Best Practices**

- ✅ **Use strong hashing**: bcrypt, scrypt, or Argon2
- ✅ **Implement MFA**: Two-factor authentication
- ✅ **Session management**: Secure tokens with expiration
- ✅ **Account lockout**: Prevent brute force attacks
- ✅ **Password policies**: Enforce strong passwords

### **🛡️ API Security Checklist**

- ✅ **HTTPS only**: Encrypt all communications
- ✅ **Input validation**: Sanitize all inputs
- ✅ **Rate limiting**: Prevent abuse and DoS
- ✅ **CORS policy**: Control cross-origin requests
- ✅ **API versioning**: Maintain backward compatibility

### **🔐 Data Protection**

- ✅ **Encrypt at rest**: Database encryption
- ✅ **Encrypt in transit**: TLS 1.3
- ✅ **Minimal exposure**: Principle of least privilege
- ✅ **Data masking**: Hide sensitive information
- ✅ **Backup security**: Encrypted backups

### **🔍 Monitoring & Logging**

- ✅ **Security logs**: Track authentication events
- ✅ **Anomaly detection**: Unusual access patterns
- ✅ **Incident response**: Security breach procedures
- ✅ **Regular audits**: Penetration testing
- ✅ **Compliance**: GDPR, HIPAA, SOC 2

---

## 🎯 **SDE2 Security Interview Topics**

### **🔥 Common Security Questions**

1. **"How do you prevent SQL injection?"**
2. **"Explain JWT vs Session-based authentication"**
3. **"How do you implement rate limiting?"**
4. **"What are the OWASP Top 10 vulnerabilities?"**
5. **"How do you secure API endpoints?"**
6. **"Explain OAuth 2.0 flow"**

### **🏗️ System Design with Security**

- **Design a secure user authentication system**
- **Implement API rate limiting at scale**
- **Design a secure file upload system**
- **Create a compliance-ready data system**

### **💼 Security Scenarios**

- **"How would you handle a data breach?"**
- **"Design security for a multi-tenant application"**
- **"Implement secure payment processing"**
- **"Handle GDPR compliance requirements"**

---

## 📊 **Security Skills by Priority**

### **🔴 Critical (Must Master)**

1. **JWT/Token Authentication** - Essential for APIs
2. **Input Validation** - Prevent injection attacks
3. **HTTPS/TLS** - Secure communications
4. **Password Security** - Hashing and policies
5. **SQL Injection Prevention** - Database security

### **🟡 Important (Should Know)**

6. **OAuth 2.0** - Third-party authentication
7. **Rate Limiting** - API protection
8. **CORS/CSP** - Browser security
9. **Secret Management** - Secure configuration
10. **Security Testing** - Vulnerability assessment

### **🟢 Nice to Have (Advanced)**

11. **Penetration Testing** - Security assessment
12. **Cryptography** - Advanced encryption
13. **Compliance** - GDPR, HIPAA requirements
14. **Security Architecture** - Secure system design

---

## 🚀 **Getting Started with Security**

### **Day 1: Security Fundamentals**

- Set up HTTPS in development
- Implement basic JWT authentication
- Add input validation to APIs

### **Day 2-3: Authentication System**

- Build complete login/logout flow
- Add password hashing and validation
- Implement rate limiting

### **Day 4-7: Advanced Security**

- Add OAuth 2.0 integration
- Implement security middleware
- Set up security monitoring and logging

---

## 🎖️ **Success Metrics**

After mastering security, you should be able to:

✅ **Implement secure authentication** systems  
✅ **Prevent common vulnerabilities** (OWASP Top 10)  
✅ **Design secure APIs** with proper protection  
✅ **Handle sensitive data** securely  
✅ **Pass security-focused interviews** at SDE2 level  
✅ **Lead security initiatives** in development teams

---

_Security is not optional - it's a fundamental responsibility of every SDE2 engineer. Master these skills to build truly production-ready applications!_
