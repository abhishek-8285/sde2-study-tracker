# JWT & Token-Based Authentication for SDE2 Engineers 🔐

## 🎯 **Overview**

JWT (JSON Web Tokens) are the industry standard for stateless authentication in modern web applications. This guide covers complete JWT implementation with security best practices, refresh token patterns, and production-ready code.

## 📚 **JWT Fundamentals**

### **What is JWT?**

- **Stateless authentication** - No server-side session storage
- **Self-contained** - Contains all necessary information
- **Digitally signed** - Ensures integrity and authenticity
- **Base64 encoded** - URL-safe transmission

### **JWT Structure**

```
Header.Payload.Signature
```

**Example JWT:**

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

---

## 🔧 **Spring Boot JWT Implementation**

### **Complete JWT Service**

```java
@Service
public class JwtService {

    private static final String SECRET_KEY = getSecretKey();
    private static final long JWT_EXPIRATION = 86400000; // 24 hours
    private static final long REFRESH_EXPIRATION = 604800000; // 7 days

    private final RedisTemplate<String, Object> redisTemplate;
    private final UserDetailsService userDetailsService;

    public JwtService(RedisTemplate<String, Object> redisTemplate,
                     UserDetailsService userDetailsService) {
        this.redisTemplate = redisTemplate;
        this.userDetailsService = userDetailsService;
    }

    public String generateToken(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        return generateTokenForUser(userPrincipal);
    }

    public String generateTokenForUser(UserPrincipal user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + JWT_EXPIRATION);

        return Jwts.builder()
            .setSubject(user.getId().toString())
            .setIssuedAt(now)
            .setExpirationTime(expiryDate)
            .setIssuer("myapp")
            .setAudience("myapp-users")
            .claim("email", user.getEmail())
            .claim("roles", user.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList()))
            .claim("tokenType", "ACCESS")
            .signWith(SignatureAlgorithm.HS512, SECRET_KEY)
            .compact();
    }

    public String generateRefreshToken(UserPrincipal user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + REFRESH_EXPIRATION);

        String refreshToken = Jwts.builder()
            .setSubject(user.getId().toString())
            .setIssuedAt(now)
            .setExpirationTime(expiryDate)
            .setIssuer("myapp")
            .claim("tokenType", "REFRESH")
            .signWith(SignatureAlgorithm.HS512, SECRET_KEY)
            .compact();

        // Store refresh token in Redis with expiration
        String key = "refresh_token:" + user.getId();
        redisTemplate.opsForValue().set(key, refreshToken,
            Duration.ofMillis(REFRESH_EXPIRATION));

        return refreshToken;
    }

    public TokenPair generateTokenPair(Authentication authentication) {
        UserPrincipal user = (UserPrincipal) authentication.getPrincipal();

        String accessToken = generateTokenForUser(user);
        String refreshToken = generateRefreshToken(user);

        return TokenPair.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .tokenType("Bearer")
            .expiresIn(JWT_EXPIRATION / 1000) // seconds
            .build();
    }

    public String getUserIdFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return claims.getSubject();
    }

    public String getEmailFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return claims.get("email", String.class);
    }

    public List<String> getRolesFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return claims.get("roles", List.class);
    }

    public Date getExpirationDateFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return claims.getExpiration();
    }

    public Boolean isTokenExpired(String token) {
        try {
            Date expiration = getExpirationDateFromToken(token);
            return expiration.before(new Date());
        } catch (ExpiredJwtException e) {
            return true;
        }
    }

    public Boolean validateToken(String token) {
        try {
            // Parse and validate token
            Jwts.parser().setSigningKey(SECRET_KEY).parseClaimsJws(token);

            // Check if token is blacklisted
            if (isTokenBlacklisted(token)) {
                return false;
            }

            return !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }

    public Boolean validateToken(String token, UserDetails userDetails) {
        try {
            String userId = getUserIdFromToken(token);
            return userId.equals(userDetails.getUsername()) &&
                   validateToken(token);
        } catch (Exception e) {
            return false;
        }
    }

    public TokenPair refreshAccessToken(String refreshToken) {
        try {
            if (!validateRefreshToken(refreshToken)) {
                throw new InvalidTokenException("Invalid refresh token");
            }

            String userId = getUserIdFromToken(refreshToken);
            UserDetails userDetails = userDetailsService.loadUserByUsername(userId);
            UserPrincipal user = (UserPrincipal) userDetails;

            // Generate new access token
            String newAccessToken = generateTokenForUser(user);

            return TokenPair.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken) // Keep same refresh token
                .tokenType("Bearer")
                .expiresIn(JWT_EXPIRATION / 1000)
                .build();

        } catch (Exception e) {
            throw new InvalidTokenException("Failed to refresh token: " + e.getMessage());
        }
    }

    public void invalidateToken(String token) {
        try {
            // Add token to blacklist
            String jti = getJtiFromToken(token);
            Date expiration = getExpirationDateFromToken(token);
            long ttl = expiration.getTime() - System.currentTimeMillis();

            if (ttl > 0) {
                redisTemplate.opsForValue().set(
                    "blacklist:" + jti,
                    "revoked",
                    Duration.ofMillis(ttl)
                );
            }
        } catch (Exception e) {
            log.warn("Failed to blacklist token: {}", e.getMessage());
        }
    }

    public void invalidateRefreshToken(String userId) {
        String key = "refresh_token:" + userId;
        redisTemplate.delete(key);
    }

    private Boolean validateRefreshToken(String refreshToken) {
        try {
            Claims claims = getClaimsFromToken(refreshToken);
            String tokenType = claims.get("tokenType", String.class);

            if (!"REFRESH".equals(tokenType)) {
                return false;
            }

            String userId = claims.getSubject();
            String storedToken = (String) redisTemplate.opsForValue()
                .get("refresh_token:" + userId);

            return refreshToken.equals(storedToken) && !isTokenExpired(refreshToken);
        } catch (Exception e) {
            return false;
        }
    }

    private Claims getClaimsFromToken(String token) {
        return Jwts.parser()
            .setSigningKey(SECRET_KEY)
            .parseClaimsJws(token)
            .getBody();
    }

    private String getJtiFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return claims.getId();
    }

    private Boolean isTokenBlacklisted(String token) {
        try {
            String jti = getJtiFromToken(token);
            return redisTemplate.hasKey("blacklist:" + jti);
        } catch (Exception e) {
            return false;
        }
    }

    private static String getSecretKey() {
        String secret = System.getenv("JWT_SECRET");
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET must be set and at least 32 characters");
        }
        return secret;
    }
}

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenPair {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private Long expiresIn;
}
```

### **JWT Authentication Filter**

```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final AuthenticationEntryPoint authenticationEntryPoint;

    public JwtAuthenticationFilter(JwtService jwtService,
                                  UserDetailsService userDetailsService,
                                  AuthenticationEntryPoint authenticationEntryPoint) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                  HttpServletResponse response,
                                  FilterChain filterChain) throws ServletException, IOException {

        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && jwtService.validateToken(jwt)) {
                String userId = jwtService.getUserIdFromToken(jwt);

                UserDetails userDetails = userDetailsService.loadUserByUsername(userId);

                if (jwtService.validateToken(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());

                    authentication.setDetails(new WebAuthenticationDetailsSource()
                        .buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        } catch (Exception e) {
            log.error("Cannot set user authentication: {}", e.getMessage());
            authenticationEntryPoint.commence(request, response,
                new BadCredentialsException("Invalid token"));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");

        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }

        return null;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String path = request.getRequestURI();
        return Arrays.asList("/api/auth/login", "/api/auth/register",
                           "/api/auth/refresh", "/health").contains(path);
    }
}
```

### **Authentication Controller**

```java
@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request,
                                             HttpServletRequest httpRequest) {
        try {
            // Rate limiting check
            if (!rateLimitService.allowLogin(getClientIP(httpRequest))) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(LoginResponse.error("Too many login attempts"));
            }

            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    request.getEmail(),
                    request.getPassword()
                )
            );

            TokenPair tokens = jwtService.generateTokenPair(authentication);
            UserPrincipal user = (UserPrincipal) authentication.getPrincipal();

            // Update last login
            userService.updateLastLogin(user.getId());

            // Log successful login
            auditService.logLogin(user.getId(), getClientIP(httpRequest), true);

            LoginResponse response = LoginResponse.builder()
                .accessToken(tokens.getAccessToken())
                .refreshToken(tokens.getRefreshToken())
                .tokenType(tokens.getTokenType())
                .expiresIn(tokens.getExpiresIn())
                .user(UserDTO.fromEntity(user))
                .build();

            return ResponseEntity.ok(response);

        } catch (BadCredentialsException e) {
            auditService.logLogin(request.getEmail(), getClientIP(httpRequest), false);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(LoginResponse.error("Invalid credentials"));
        } catch (AccountLockedException e) {
            return ResponseEntity.status(HttpStatus.LOCKED)
                .body(LoginResponse.error("Account is locked"));
        } catch (DisabledException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(LoginResponse.error("Account is disabled"));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        try {
            TokenPair tokens = jwtService.refreshAccessToken(request.getRefreshToken());

            TokenResponse response = TokenResponse.builder()
                .accessToken(tokens.getAccessToken())
                .tokenType(tokens.getTokenType())
                .expiresIn(tokens.getExpiresIn())
                .build();

            return ResponseEntity.ok(response);

        } catch (InvalidTokenException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(TokenResponse.error("Invalid refresh token"));
        }
    }

    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MessageResponse> logout(@RequestHeader("Authorization") String authHeader,
                                                Authentication authentication) {
        try {
            String token = authHeader.substring(7); // Remove "Bearer "

            // Invalidate access token
            jwtService.invalidateToken(token);

            // Invalidate refresh token
            UserPrincipal user = (UserPrincipal) authentication.getPrincipal();
            jwtService.invalidateRefreshToken(user.getId().toString());

            // Log logout
            auditService.logLogout(user.getId());

            return ResponseEntity.ok(MessageResponse.success("Logged out successfully"));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(MessageResponse.error("Logout failed"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        try {
            // Check if user already exists
            if (userService.existsByEmail(request.getEmail())) {
                return ResponseEntity.badRequest()
                    .body(RegisterResponse.error("Email already registered"));
            }

            // Create new user
            User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .enabled(true)
                .accountNonLocked(true)
                .createdAt(Instant.now())
                .build();

            User savedUser = userService.save(user);

            // Generate tokens
            UserPrincipal userPrincipal = UserPrincipal.create(savedUser);
            Authentication auth = new UsernamePasswordAuthenticationToken(
                userPrincipal, null, userPrincipal.getAuthorities());

            TokenPair tokens = jwtService.generateTokenPair(auth);

            // Send welcome email
            emailService.sendWelcomeEmail(savedUser);

            RegisterResponse response = RegisterResponse.builder()
                .accessToken(tokens.getAccessToken())
                .refreshToken(tokens.getRefreshToken())
                .tokenType(tokens.getTokenType())
                .expiresIn(tokens.getExpiresIn())
                .user(UserDTO.fromEntity(savedUser))
                .build();

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (Exception e) {
            log.error("Registration failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(RegisterResponse.error("Registration failed"));
        }
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserDTO> getCurrentUser(Authentication authentication) {
        UserPrincipal user = (UserPrincipal) authentication.getPrincipal();
        UserDTO userDTO = UserDTO.fromEntity(user);
        return ResponseEntity.ok(userDTO);
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }
}

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    private Boolean rememberMe = false;
}

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private Long expiresIn;
    private UserDTO user;
    private String error;

    public static LoginResponse error(String message) {
        return LoginResponse.builder().error(message).build();
    }
}
```

---

## 🔧 **Node.js JWT Implementation**

### **JWT Service**

```javascript
const jwt = require("jsonwebtoken");
const redis = require("redis");
const crypto = require("crypto");

class JwtService {
  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = "15m";
    this.refreshTokenExpiry = "7d";
    this.issuer = "myapp";
    this.audience = "myapp-users";

    this.redisClient = redis.createClient({
      url: process.env.REDIS_URL,
    });
    this.redisClient.connect();

    if (!this.accessTokenSecret || !this.refreshTokenSecret) {
      throw new Error("JWT secrets must be set in environment variables");
    }
  }

  generateTokenPair(user) {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles || ["user"],
      iss: this.issuer,
      aud: this.audience,
    };

    const accessToken = jwt.sign({ ...payload, type: "access" }, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      jwtid: crypto.randomUUID(),
    });

    const refreshToken = jwt.sign({ ...payload, type: "refresh" }, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      jwtid: crypto.randomUUID(),
    });

    // Store refresh token in Redis
    this.storeRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: this.getExpiresInSeconds(this.accessTokenExpiry),
    };
  }

  async verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret);

      if (decoded.type !== "access") {
        throw new Error("Invalid token type");
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(decoded.jti);
      if (isBlacklisted) {
        throw new Error("Token is blacklisted");
      }

      return decoded;
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  async verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret);

      if (decoded.type !== "refresh") {
        throw new Error("Invalid token type");
      }

      // Check if refresh token exists in Redis
      const storedToken = await this.redisClient.get(`refresh_token:${decoded.sub}`);
      if (storedToken !== token) {
        throw new Error("Refresh token not found or invalid");
      }

      return decoded;
    } catch (error) {
      throw new Error(`Refresh token verification failed: ${error.message}`);
    }
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = await this.verifyRefreshToken(refreshToken);

      // Generate new access token
      const newAccessToken = jwt.sign(
        {
          sub: decoded.sub,
          email: decoded.email,
          roles: decoded.roles,
          type: "access",
          iss: this.issuer,
          aud: this.audience,
        },
        this.accessTokenSecret,
        {
          expiresIn: this.accessTokenExpiry,
          jwtid: crypto.randomUUID(),
        }
      );

      return {
        accessToken: newAccessToken,
        tokenType: "Bearer",
        expiresIn: this.getExpiresInSeconds(this.accessTokenExpiry),
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  async invalidateToken(token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.jti) {
        // Add to blacklist with expiration
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.redisClient.setEx(`blacklist:${decoded.jti}`, ttl, "revoked");
        }
      }
    } catch (error) {
      console.warn("Failed to blacklist token:", error.message);
    }
  }

  async invalidateRefreshToken(userId) {
    try {
      await this.redisClient.del(`refresh_token:${userId}`);
    } catch (error) {
      console.warn("Failed to invalidate refresh token:", error.message);
    }
  }

  async storeRefreshToken(userId, token) {
    const expiry = this.getExpiresInSeconds(this.refreshTokenExpiry);
    await this.redisClient.setEx(`refresh_token:${userId}`, expiry, token);
  }

  async isTokenBlacklisted(jti) {
    try {
      const result = await this.redisClient.exists(`blacklist:${jti}`);
      return result === 1;
    } catch (error) {
      return false;
    }
  }

  getExpiresInSeconds(duration) {
    const units = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes

    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }

  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7);
  }
}

module.exports = JwtService;
```

### **Authentication Middleware**

```javascript
const JwtService = require("./JwtService");

class AuthMiddleware {
  constructor() {
    this.jwtService = new JwtService();
  }

  // Middleware to verify JWT token
  authenticate = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = this.jwtService.extractTokenFromHeader(authHeader);

      if (!token) {
        return res.status(401).json({
          error: "Access token is required",
        });
      }

      const decoded = await this.jwtService.verifyAccessToken(token);

      // Attach user info to request
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        roles: decoded.roles,
      };

      next();
    } catch (error) {
      return res.status(401).json({
        error: "Invalid or expired token",
        details: error.message,
      });
    }
  };

  // Middleware to check user roles
  authorize = (requiredRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: "Authentication required",
        });
      }

      const userRoles = req.user.roles || [];
      const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));

      if (!hasRequiredRole) {
        return res.status(403).json({
          error: "Insufficient permissions",
          required: requiredRoles,
          current: userRoles,
        });
      }

      next();
    };
  };

  // Optional authentication (doesn't fail if no token)
  optionalAuth = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = this.jwtService.extractTokenFromHeader(authHeader);

      if (token) {
        const decoded = await this.jwtService.verifyAccessToken(token);
        req.user = {
          id: decoded.sub,
          email: decoded.email,
          roles: decoded.roles,
        };
      }

      next();
    } catch (error) {
      // Continue without authentication
      next();
    }
  };
}

module.exports = AuthMiddleware;
```

### **Express.js Authentication Routes**

```javascript
const express = require("express");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const JwtService = require("../services/JwtService");
const UserService = require("../services/UserService");
const AuditService = require("../services/AuditService");

const router = express.Router();
const jwtService = new JwtService();
const userService = new UserService();
const auditService = new AuditService();

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: "Too many login attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: {
    error: "Too many registration attempts, please try again later",
  },
});

// Login endpoint
router.post("/login", loginLimiter, [body("email").isEmail().normalizeEmail(), body("password").notEmpty().isLength({ min: 1 })], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { email, password, rememberMe = false } = req.body;

    // Find user
    const user = await userService.findByEmail(email);
    if (!user) {
      await auditService.logFailedLogin(email, req.ip);
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({
        error: "Account is temporarily locked",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await userService.incrementFailedAttempts(user.id);
      await auditService.logFailedLogin(email, req.ip);
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    // Reset failed attempts on successful login
    await userService.resetFailedAttempts(user.id);

    // Generate tokens
    const tokens = jwtService.generateTokenPair(user);

    // Update last login
    await userService.updateLastLogin(user.id, req.ip);

    // Log successful login
    await auditService.logSuccessfulLogin(user.id, req.ip);

    // Set secure HTTP-only cookie for refresh token
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      accessToken: tokens.accessToken,
      tokenType: tokens.tokenType,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Register endpoint
router.post(
  "/register",
  registerLimiter,
  [
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body("firstName").trim().isLength({ min: 2, max: 50 }),
    body("lastName").trim().isLength({ min: 2, max: 50 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await userService.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: "Email already registered",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await userService.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        roles: ["user"],
        isActive: true,
      });

      // Generate tokens
      const tokens = jwtService.generateTokenPair(user);

      // Log registration
      await auditService.logRegistration(user.id, req.ip);

      res.status(201).json({
        accessToken: tokens.accessToken,
        tokenType: tokens.tokenType,
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        error: "Registration failed",
      });
    }
  }
);

// Refresh token endpoint
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: "Refresh token is required",
      });
    }

    const newTokens = await jwtService.refreshAccessToken(refreshToken);

    res.json(newTokens);
  } catch (error) {
    res.status(401).json({
      error: "Invalid refresh token",
      details: error.message,
    });
  }
});

// Logout endpoint
router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = jwtService.extractTokenFromHeader(authHeader);
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (accessToken) {
      await jwtService.invalidateToken(accessToken);
    }

    if (refreshToken) {
      const decoded = await jwtService.verifyRefreshToken(refreshToken);
      await jwtService.invalidateRefreshToken(decoded.sub);
    }

    // Clear refresh token cookie
    res.clearCookie("refreshToken");

    res.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      error: "Logout failed",
    });
  }
});

module.exports = router;
```

---

## 🔒 **Security Best Practices**

### **Secret Management**

```bash
# Environment variables for JWT secrets
JWT_ACCESS_SECRET=your-super-secure-access-token-secret-at-least-32-chars
JWT_REFRESH_SECRET=your-different-refresh-token-secret-at-least-32-chars
REDIS_URL=redis://localhost:6379
```

### **Token Security Checklist**

- ✅ **Strong Secrets** - Use cryptographically secure random strings (32+ chars)
- ✅ **Short Expiry** - Access tokens expire in 15-30 minutes
- ✅ **Refresh Rotation** - Rotate refresh tokens on use
- ✅ **Secure Storage** - Store refresh tokens in HTTP-only cookies
- ✅ **Token Blacklisting** - Implement logout token invalidation
- ✅ **Rate Limiting** - Limit login attempts and token refresh
- ✅ **HTTPS Only** - Never transmit tokens over HTTP
- ✅ **Audit Logging** - Log all authentication events

### **Common JWT Vulnerabilities & Mitigations**

#### **1. Algorithm Confusion Attack**

```java
// BAD: Allows algorithm switching
Jwts.parser().setSigningKey(secret).parse(token);

// GOOD: Specify expected algorithm
Jwts.parser()
    .setSigningKey(secret)
    .requireAlgorithm(SignatureAlgorithm.HS256)
    .parseClaimsJws(token);
```

#### **2. Token Theft Protection**

```javascript
// Store sensitive tokens in HTTP-only cookies
res.cookie("refreshToken", token, {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

#### **3. Token Replay Protection**

```java
// Include unique identifier (jti) for blacklisting
.claim("jti", UUID.randomUUID().toString())
```

---

## 📊 **Monitoring & Metrics**

### **JWT Metrics Collection**

```java
@Component
public class JwtMetrics {

    private final MeterRegistry meterRegistry;

    public void recordTokenGeneration(String tokenType) {
        meterRegistry.counter("jwt.tokens.generated", "type", tokenType).increment();
    }

    public void recordTokenValidation(String result) {
        meterRegistry.counter("jwt.tokens.validated", "result", result).increment();
    }

    public void recordAuthenticationFailure(String reason) {
        meterRegistry.counter("jwt.auth.failures", "reason", reason).increment();
    }
}
```

---

## 🎯 **Testing JWT Implementation**

### **Unit Tests**

```java
@ExtendWith(MockitoExtension.class)
class JwtServiceTest {

    @InjectMocks
    private JwtService jwtService;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Test
    void shouldGenerateValidToken() {
        // Given
        UserPrincipal user = createTestUser();

        // When
        String token = jwtService.generateTokenForUser(user);

        // Then
        assertThat(token).isNotBlank();
        assertThat(jwtService.validateToken(token)).isTrue();
        assertThat(jwtService.getUserIdFromToken(token)).isEqualTo(user.getId().toString());
    }

    @Test
    void shouldRejectExpiredToken() {
        // Test with expired token
    }

    @Test
    void shouldRejectInvalidSignature() {
        // Test with tampered token
    }
}
```

---

## 🎯 **Next Steps**

1. **Implement JWT service** with proper error handling
2. **Set up Redis** for token blacklisting and refresh token storage
3. **Add comprehensive testing** for all authentication flows
4. **Configure monitoring** for security metrics
5. **Move to [OAuth 2.0](./02-oauth-openid.md)** for third-party authentication

_JWT authentication is the foundation of modern web security. Master these patterns to build secure, scalable authentication systems!_
