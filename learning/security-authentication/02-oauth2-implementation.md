# OAuth 2.0 Complete Implementation Guide 🔐

## 🎯 **Overview**

OAuth 2.0 is the industry standard for authorization, enabling secure access to user resources without exposing credentials. This comprehensive guide covers all OAuth flows, provider integrations, security considerations, and production-ready implementations.

## 📚 **OAuth 2.0 Fundamentals**

### **OAuth 2.0 Roles**

- **Resource Owner** - The user who owns the data
- **Client** - The application requesting access
- **Authorization Server** - Issues access tokens (Google, GitHub, etc.)
- **Resource Server** - Hosts the protected resources (API)

### **OAuth 2.0 Flows**

| Flow                   | Use Case              | Security   | Client Type  |
| ---------------------- | --------------------- | ---------- | ------------ |
| **Authorization Code** | Web apps, mobile apps | ⭐⭐⭐⭐⭐ | Confidential |
| **PKCE**               | SPAs, mobile apps     | ⭐⭐⭐⭐⭐ | Public       |
| **Client Credentials** | Server-to-server      | ⭐⭐⭐⭐   | Confidential |
| **Implicit**           | SPAs (deprecated)     | ⭐⭐       | Public       |

---

## 🔧 **Authorization Code Flow Implementation**

### **Spring Boot OAuth Server**

```java
// OAuth2AuthorizationServerConfig.java
@Configuration
@EnableAuthorizationServer
public class OAuth2AuthorizationServerConfig {

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RedisConnectionFactory redisConnectionFactory;

    @Bean
    public JwtAccessTokenConverter jwtTokenConverter() {
        JwtAccessTokenConverter converter = new JwtAccessTokenConverter();

        // Use RSA key pair for production
        KeyPair keyPair = getKeyPair();
        converter.setKeyPair(keyPair);

        // Add custom claims
        converter.setAccessTokenConverter(new CustomJwtAccessTokenConverter());

        return converter;
    }

    @Bean
    public TokenStore tokenStore() {
        return new RedisTokenStore(redisConnectionFactory);
    }

    @Bean
    public DefaultTokenServices tokenServices() {
        DefaultTokenServices tokenServices = new DefaultTokenServices();
        tokenServices.setTokenStore(tokenStore());
        tokenServices.setSupportRefreshToken(true);
        tokenServices.setReuseRefreshToken(false);
        tokenServices.setAccessTokenValiditySeconds(3600); // 1 hour
        tokenServices.setRefreshTokenValiditySeconds(86400 * 7); // 7 days
        tokenServices.setTokenEnhancer(jwtTokenConverter());
        return tokenServices;
    }

    @Override
    public void configure(ClientDetailsServiceConfigurer clients) throws Exception {
        clients.inMemory()
            // Web application client
            .withClient("web-app")
            .secret(passwordEncoder.encode("web-secret"))
            .authorizedGrantTypes("authorization_code", "refresh_token")
            .scopes("read", "write")
            .redirectUris("http://localhost:3000/auth/callback")
            .accessTokenValiditySeconds(3600)
            .refreshTokenValiditySeconds(86400 * 7)

            // Mobile application client
            .and()
            .withClient("mobile-app")
            .secret(passwordEncoder.encode("mobile-secret"))
            .authorizedGrantTypes("authorization_code", "refresh_token")
            .scopes("read", "write", "offline_access")
            .redirectUris("com.example.app://oauth/callback")
            .accessTokenValiditySeconds(3600)
            .refreshTokenValiditySeconds(86400 * 30) // 30 days for mobile

            // Third-party API client
            .and()
            .withClient("api-client")
            .secret(passwordEncoder.encode("api-secret"))
            .authorizedGrantTypes("client_credentials")
            .scopes("api:read", "api:write")
            .accessTokenValiditySeconds(7200); // 2 hours
    }

    @Override
    public void configure(AuthorizationServerEndpointsConfigurer endpoints) throws Exception {
        endpoints
            .tokenStore(tokenStore())
            .tokenServices(tokenServices())
            .userDetailsService(userDetailsService)
            .accessTokenConverter(jwtTokenConverter())
            .pathMapping("/oauth/authorize", "/api/oauth/authorize")
            .pathMapping("/oauth/token", "/api/oauth/token")
            .pathMapping("/oauth/check_token", "/api/oauth/check_token")
            .pathMapping("/oauth/confirm_access", "/api/oauth/confirm_access")
            .pathMapping("/oauth/error", "/api/oauth/error");
    }

    @Override
    public void configure(AuthorizationServerSecurityConfigurer security) throws Exception {
        security
            .tokenKeyAccess("permitAll()")
            .checkTokenAccess("isAuthenticated()")
            .allowFormAuthenticationForClients()
            .passwordEncoder(passwordEncoder);
    }

    private KeyPair getKeyPair() {
        // Load RSA key pair from application properties or generate
        try {
            KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
            keyGen.initialize(2048);
            return keyGen.generateKeyPair();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate key pair", e);
        }
    }
}

// CustomJwtAccessTokenConverter.java
@Component
public class CustomJwtAccessTokenConverter implements AccessTokenConverter {

    @Override
    public Map<String, ?> convertAccessToken(OAuth2AccessToken token, OAuth2Authentication authentication) {
        Map<String, Object> response = new HashMap<>();

        // Add standard claims
        response.put("access_token", token.getValue());
        response.put("token_type", token.getTokenType());
        response.put("expires_in", token.getExpiresIn());

        if (token.getRefreshToken() != null) {
            response.put("refresh_token", token.getRefreshToken().getValue());
        }

        // Add custom claims
        if (authentication.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal user = (UserPrincipal) authentication.getPrincipal();
            response.put("user_id", user.getId());
            response.put("username", user.getUsername());
            response.put("email", user.getEmail());
            response.put("roles", user.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList()));
        }

        // Add client information
        response.put("client_id", authentication.getOAuth2Request().getClientId());
        response.put("scope", authentication.getOAuth2Request().getScope());

        return response;
    }

    @Override
    public OAuth2AccessToken extractAccessToken(String value, Map<String, ?> map) {
        DefaultOAuth2AccessToken token = new DefaultOAuth2AccessToken(value);

        if (map.containsKey("expires_in")) {
            token.setExpiration(new Date(System.currentTimeMillis() +
                ((Integer) map.get("expires_in")) * 1000L));
        }

        if (map.containsKey("refresh_token")) {
            token.setRefreshToken(new DefaultOAuth2RefreshToken((String) map.get("refresh_token")));
        }

        if (map.containsKey("token_type")) {
            token.setTokenType((String) map.get("token_type"));
        }

        if (map.containsKey("scope")) {
            Set<String> scope = new HashSet<>((Collection<String>) map.get("scope"));
            token.setScope(scope);
        }

        return token;
    }

    @Override
    public OAuth2Authentication extractAuthentication(Map<String, ?> map) {
        // Extract authentication from token claims
        String clientId = (String) map.get("client_id");
        Set<String> scope = new HashSet<>((Collection<String>) map.get("scope"));

        OAuth2Request request = new OAuth2Request(
            Collections.emptyMap(),
            clientId,
            Collections.emptyList(),
            true,
            scope,
            Collections.emptySet(),
            null,
            null,
            Collections.emptyMap()
        );

        // Create user authentication if user info is present
        Authentication userAuth = null;
        if (map.containsKey("user_id")) {
            String userId = (String) map.get("user_id");
            String username = (String) map.get("username");
            List<String> roles = (List<String>) map.get("roles");

            List<GrantedAuthority> authorities = roles.stream()
                .map(role -> new SimpleGrantedAuthority(role))
                .collect(Collectors.toList());

            userAuth = new UsernamePasswordAuthenticationToken(
                username, null, authorities);
        }

        return new OAuth2Authentication(request, userAuth);
    }
}

// OAuth2ResourceServerConfig.java
@Configuration
@EnableResourceServer
public class OAuth2ResourceServerConfig extends ResourceServerConfigurerAdapter {

    @Autowired
    private JwtAccessTokenConverter jwtTokenConverter;

    @Bean
    public TokenStore tokenStore() {
        return new JwtTokenStore(jwtTokenConverter);
    }

    @Override
    public void configure(ResourceServerSecurityConfigurer resources) throws Exception {
        resources
            .resourceId("api")
            .tokenStore(tokenStore())
            .stateless(true);
    }

    @Override
    public void configure(HttpSecurity http) throws Exception {
        http
            .requestMatchers()
                .antMatchers("/api/**")
            .and()
            .authorizeRequests()
                .antMatchers("/api/public/**").permitAll()
                .antMatchers(HttpMethod.GET, "/api/products/**").hasAuthority("SCOPE_read")
                .antMatchers(HttpMethod.POST, "/api/products/**").hasAuthority("SCOPE_write")
                .antMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            .and()
            .oauth2ResourceServer()
                .jwt();
    }
}
```

### **Node.js OAuth Implementation**

```javascript
// oauth-server.js
const express = require("express");
const OAuth2Server = require("oauth2-server");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const app = express();

// OAuth2 Server setup
const oauth = new OAuth2Server({
  model: {
    // Generate access token
    generateAccessToken: async (client, user, scope) => {
      const payload = {
        sub: user.id,
        aud: client.id,
        scope: scope.join(" "),
        iss: process.env.JWT_ISSUER,
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        iat: Math.floor(Date.now() / 1000),
        jti: uuidv4(),
      };

      return jwt.sign(payload, process.env.JWT_SECRET, { algorithm: "HS256" });
    },

    // Generate refresh token
    generateRefreshToken: async (client, user, scope) => {
      return jwt.sign(
        {
          sub: user.id,
          aud: client.id,
          type: "refresh",
          jti: uuidv4(),
        },
        process.env.JWT_REFRESH_SECRET,
        {
          algorithm: "HS256",
          expiresIn: "7d",
        }
      );
    },

    // Generate authorization code
    generateAuthorizationCode: async (client, user, scope) => {
      const code = uuidv4();

      // Store authorization code in Redis with expiration
      await redis.setex(
        `auth_code:${code}`,
        600,
        JSON.stringify({
          clientId: client.id,
          userId: user.id,
          scope: scope,
          expiresAt: Date.now() + 600000, // 10 minutes
        })
      );

      return code;
    },

    // Get access token
    getAccessToken: async (accessToken) => {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

        const client = await db.client.findById(decoded.aud);
        const user = await db.user.findById(decoded.sub);

        if (!client || !user) {
          return null;
        }

        return {
          accessToken,
          accessTokenExpiresAt: new Date(decoded.exp * 1000),
          scope: decoded.scope.split(" "),
          client: {
            id: client.id,
            grants: client.grants,
          },
          user: {
            id: user.id,
            username: user.username,
          },
        };
      } catch (error) {
        return null;
      }
    },

    // Get refresh token
    getRefreshToken: async (refreshToken) => {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const client = await db.client.findById(decoded.aud);
        const user = await db.user.findById(decoded.sub);

        if (!client || !user) {
          return null;
        }

        return {
          refreshToken,
          refreshTokenExpiresAt: new Date(decoded.exp * 1000),
          client: {
            id: client.id,
            grants: client.grants,
          },
          user: {
            id: user.id,
            username: user.username,
          },
        };
      } catch (error) {
        return null;
      }
    },

    // Get authorization code
    getAuthorizationCode: async (authorizationCode) => {
      const codeData = await redis.get(`auth_code:${authorizationCode}`);

      if (!codeData) {
        return null;
      }

      const parsed = JSON.parse(codeData);

      if (Date.now() > parsed.expiresAt) {
        await redis.del(`auth_code:${authorizationCode}`);
        return null;
      }

      const client = await db.client.findById(parsed.clientId);
      const user = await db.user.findById(parsed.userId);

      return {
        code: authorizationCode,
        expiresAt: new Date(parsed.expiresAt),
        redirectUri: client.redirectUris[0],
        scope: parsed.scope,
        client: {
          id: client.id,
          grants: client.grants,
        },
        user: {
          id: user.id,
          username: user.username,
        },
      };
    },

    // Revoke authorization code
    revokeAuthorizationCode: async (code) => {
      await redis.del(`auth_code:${code.code}`);
      return true;
    },

    // Revoke token
    revokeToken: async (token) => {
      // Add token to blacklist
      const decoded = jwt.decode(token.refreshToken);
      if (decoded) {
        await redis.setex(`blacklist:${decoded.jti}`, decoded.exp - Math.floor(Date.now() / 1000), "revoked");
      }
      return true;
    },

    // Get client
    getClient: async (clientId, clientSecret) => {
      const client = await db.client.findOne({
        where: { id: clientId },
      });

      if (!client) {
        return null;
      }

      // Verify client secret for confidential clients
      if (clientSecret && !(await bcrypt.compare(clientSecret, client.secret))) {
        return null;
      }

      return {
        id: client.id,
        redirectUris: client.redirectUris,
        grants: client.grants,
        scope: client.scope,
      };
    },

    // Get user
    getUser: async (username, password) => {
      const user = await db.user.findOne({
        where: { username },
      });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
      };
    },

    // Get user from client
    getUserFromClient: async (client) => {
      // For client credentials grant
      return {
        id: client.id,
        username: client.id,
      };
    },

    // Verify scope
    verifyScope: async (user, client, scope) => {
      const clientScopes = client.scope || [];
      return scope.every((s) => clientScopes.includes(s));
    },
  },

  accessTokenLifetime: 3600, // 1 hour
  refreshTokenLifetime: 604800, // 7 days
  authorizationCodeLifetime: 600, // 10 minutes
  allowBearerTokensInQueryString: false,
  allowEmptyState: false,
  allowExtendedTokenAttributes: true,
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// OAuth endpoints
app.get("/oauth/authorize", async (req, res) => {
  const request = new OAuth2Server.Request(req);
  const response = new OAuth2Server.Response(res);

  try {
    // Check if user is authenticated
    if (!req.session.user) {
      return res.redirect(`/login?returnUrl=${encodeURIComponent(req.originalUrl)}`);
    }

    // Get authorization code
    const code = await oauth.authorize(request, response, {
      authenticateHandler: {
        handle: () => req.session.user,
      },
    });

    // Redirect with authorization code
    const redirectUrl = new URL(code.redirectUri);
    redirectUrl.searchParams.set("code", code.authorizationCode);

    if (req.query.state) {
      redirectUrl.searchParams.set("state", req.query.state);
    }

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Authorization error:", error);
    res.status(400).json({ error: error.message });
  }
});

app.post("/oauth/token", async (req, res) => {
  const request = new OAuth2Server.Request(req);
  const response = new OAuth2Server.Response(res);

  try {
    const token = await oauth.token(request, response);
    res.json(token);
  } catch (error) {
    console.error("Token error:", error);
    res.status(400).json({ error: error.message });
  }
});

app.post("/oauth/revoke", async (req, res) => {
  const request = new OAuth2Server.Request(req);
  const response = new OAuth2Server.Response(res);

  try {
    await oauth.revoke(request, response);
    res.json({ message: "Token revoked successfully" });
  } catch (error) {
    console.error("Revoke error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Authentication middleware
const authenticate = async (req, res, next) => {
  const request = new OAuth2Server.Request(req);
  const response = new OAuth2Server.Response(res);

  try {
    const token = await oauth.authenticate(request, response);
    req.user = token.user;
    req.client = token.client;
    req.scope = token.scope;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

// Protected API endpoints
app.get("/api/profile", authenticate, (req, res) => {
  res.json({
    user: req.user,
    scope: req.scope,
  });
});

app.get("/api/protected", authenticate, (req, res) => {
  // Check scope
  if (!req.scope.includes("read")) {
    return res.status(403).json({ error: "Insufficient scope" });
  }

  res.json({ message: "This is a protected resource" });
});

app.listen(3001, () => {
  console.log("OAuth2 server running on port 3001");
});
```

---

## 🔐 **PKCE (Proof Key for Code Exchange)**

### **PKCE Implementation for SPAs**

```javascript
// pkce-client.js
class PKCEClient {
  constructor(config) {
    this.clientId = config.clientId;
    this.redirectUri = config.redirectUri;
    this.authorizationEndpoint = config.authorizationEndpoint;
    this.tokenEndpoint = config.tokenEndpoint;
    this.scope = config.scope || "openid profile email";
  }

  // Generate code verifier and challenge
  generateCodeChallenge() {
    // Generate code verifier (43-128 characters)
    const codeVerifier = this.generateRandomString(128);

    // Generate code challenge using SHA256
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);

    return crypto.subtle.digest("SHA-256", data).then((digest) => {
      const codeChallenge = this.base64URLEncode(digest);

      return {
        codeVerifier,
        codeChallenge,
        codeChallengeMethod: "S256",
      };
    });
  }

  generateRandomString(length) {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    let result = "";

    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charset.length];
    }

    return result;
  }

  base64URLEncode(buffer) {
    const bytes = new Uint8Array(buffer);
    const binary = String.fromCharCode(...bytes);
    const base64 = btoa(binary);

    // Convert to base64url format
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  // Start authorization flow
  async authorize() {
    const { codeVerifier, codeChallenge, codeChallengeMethod } = await this.generateCodeChallenge();

    // Store code verifier for later use
    sessionStorage.setItem("pkce_code_verifier", codeVerifier);

    // Generate state parameter for CSRF protection
    const state = this.generateRandomString(32);
    sessionStorage.setItem("oauth_state", state);

    // Build authorization URL
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scope,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
    });

    const authUrl = `${this.authorizationEndpoint}?${params.toString()}`;

    // Redirect to authorization server
    window.location.href = authUrl;
  }

  // Handle authorization callback
  async handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    const error = urlParams.get("error");

    // Check for errors
    if (error) {
      throw new Error(`Authorization error: ${error}`);
    }

    // Verify state parameter
    const storedState = sessionStorage.getItem("oauth_state");
    if (state !== storedState) {
      throw new Error("Invalid state parameter");
    }

    // Get stored code verifier
    const codeVerifier = sessionStorage.getItem("pkce_code_verifier");
    if (!codeVerifier) {
      throw new Error("Code verifier not found");
    }

    // Exchange code for token
    return await this.exchangeCodeForToken(code, codeVerifier);
  }

  // Exchange authorization code for tokens
  async exchangeCodeForToken(code, codeVerifier) {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.clientId,
      code: code,
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(this.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
    }

    const tokenData = await response.json();

    // Store tokens securely
    this.storeTokens(tokenData);

    // Clean up session storage
    sessionStorage.removeItem("pkce_code_verifier");
    sessionStorage.removeItem("oauth_state");

    return tokenData;
  }

  // Store tokens securely
  storeTokens(tokenData) {
    // Store in httpOnly cookies for security (requires server-side implementation)
    // For demo purposes, using localStorage (not recommended for production)
    localStorage.setItem("access_token", tokenData.access_token);

    if (tokenData.refresh_token) {
      localStorage.setItem("refresh_token", tokenData.refresh_token);
    }

    if (tokenData.expires_in) {
      const expiresAt = Date.now() + tokenData.expires_in * 1000;
      localStorage.setItem("token_expires_at", expiresAt.toString());
    }
  }

  // Get stored access token
  getAccessToken() {
    const token = localStorage.getItem("access_token");
    const expiresAt = localStorage.getItem("token_expires_at");

    if (!token) {
      return null;
    }

    // Check if token is expired
    if (expiresAt && Date.now() > parseInt(expiresAt)) {
      this.clearTokens();
      return null;
    }

    return token;
  }

  // Refresh access token
  async refreshToken() {
    const refreshToken = localStorage.getItem("refresh_token");

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.clientId,
      refresh_token: refreshToken,
    });

    const response = await fetch(this.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      this.clearTokens();
      throw new Error("Token refresh failed");
    }

    const tokenData = await response.json();
    this.storeTokens(tokenData);

    return tokenData;
  }

  // Make authenticated API calls
  async apiCall(url, options = {}) {
    let accessToken = this.getAccessToken();

    // Try to refresh token if expired
    if (!accessToken) {
      try {
        await this.refreshToken();
        accessToken = this.getAccessToken();
      } catch (error) {
        // Redirect to login if refresh fails
        this.authorize();
        return;
      }
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle token expiration
    if (response.status === 401) {
      try {
        await this.refreshToken();
        accessToken = this.getAccessToken();

        // Retry request with new token
        return await fetch(url, {
          ...options,
          headers: {
            ...headers,
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (error) {
        this.authorize();
        return;
      }
    }

    return response;
  }

  // Logout and clear tokens
  logout() {
    this.clearTokens();

    // Optional: Call logout endpoint
    // window.location.href = `${this.logoutEndpoint}?client_id=${this.clientId}&returnTo=${window.location.origin}`;
  }

  clearTokens() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("token_expires_at");
  }
}

// Usage example
const oauthClient = new PKCEClient({
  clientId: "your-spa-client-id",
  redirectUri: "http://localhost:3000/callback",
  authorizationEndpoint: "https://auth.example.com/oauth/authorize",
  tokenEndpoint: "https://auth.example.com/oauth/token",
  scope: "openid profile email read write",
});

// React hook for OAuth
import { useState, useEffect, useContext, createContext } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if we're returning from OAuth callback
    if (window.location.pathname === "/callback") {
      handleOAuthCallback();
    } else {
      // Check for existing valid token
      checkAuthStatus();
    }
  }, []);

  const handleOAuthCallback = async () => {
    try {
      const tokenData = await oauthClient.handleCallback();

      // Fetch user profile
      const userProfile = await fetchUserProfile();
      setUser(userProfile);
      setIsAuthenticated(true);

      // Redirect to intended page
      const returnUrl = sessionStorage.getItem("returnUrl") || "/dashboard";
      sessionStorage.removeItem("returnUrl");
      window.history.replaceState({}, "", returnUrl);
    } catch (error) {
      console.error("OAuth callback error:", error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const accessToken = oauthClient.getAccessToken();

      if (accessToken) {
        const userProfile = await fetchUserProfile();
        setUser(userProfile);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    const response = await oauthClient.apiCall("/api/profile");

    if (!response.ok) {
      throw new Error("Failed to fetch user profile");
    }

    return await response.json();
  };

  const login = async (returnUrl) => {
    if (returnUrl) {
      sessionStorage.setItem("returnUrl", returnUrl);
    }

    await oauthClient.authorize();
  };

  const logout = () => {
    oauthClient.logout();
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = "/";
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    apiCall: oauthClient.apiCall.bind(oauthClient),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// Protected Route component
export const ProtectedRoute = ({ children, requiredScope }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  if (requiredScope && !user.scope.includes(requiredScope)) {
    return <div>Access denied: Insufficient permissions</div>;
  }

  return children;
};
```

---

## 🌐 **Provider Integrations**

### **Google OAuth Integration**

```javascript
// google-oauth.js
class GoogleOAuthClient {
  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI;
    this.scope = "openid profile email";
  }

  // Get authorization URL
  getAuthorizationUrl() {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scope,
      access_type: "offline", // Get refresh token
      prompt: "consent", // Force consent screen to get refresh token
      state: this.generateState(),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // Exchange code for tokens
  async exchangeCodeForTokens(code) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code: code,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to exchange code for tokens");
    }

    return await response.json();
  }

  // Get user profile
  async getUserProfile(accessToken) {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user profile");
    }

    return await response.json();
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh access token");
    }

    return await response.json();
  }

  generateState() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

// Express.js routes
app.get("/auth/google", (req, res) => {
  const googleClient = new GoogleOAuthClient();
  const authUrl = googleClient.getAuthorizationUrl();
  res.redirect(authUrl);
});

app.get("/auth/google/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).json({ error: "Authorization failed" });
  }

  try {
    const googleClient = new GoogleOAuthClient();

    // Exchange code for tokens
    const tokens = await googleClient.exchangeCodeForTokens(code);

    // Get user profile
    const profile = await googleClient.getUserProfile(tokens.access_token);

    // Find or create user in database
    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      user = await User.create({
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
        avatar: profile.picture,
        provider: "google",
      });
    }

    // Generate JWT token for your application
    const appToken = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Store refresh token securely
    await UserToken.upsert({
      userId: user.id,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    });

    // Redirect with token (or set httpOnly cookie)
    res.redirect(`/dashboard?token=${appToken}`);
  } catch (error) {
    console.error("Google OAuth error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});
```

### **GitHub OAuth Integration**

```javascript
// github-oauth.js
class GitHubOAuthClient {
  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID;
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET;
    this.redirectUri = process.env.GITHUB_REDIRECT_URI;
  }

  getAuthorizationUrl() {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: "user:email",
      state: this.generateState(),
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code) {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to exchange code for tokens");
    }

    return await response.json();
  }

  async getUserProfile(accessToken) {
    const [userResponse, emailsResponse] = await Promise.all([
      fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${accessToken}`,
          "User-Agent": "Your-App-Name",
        },
      }),
      fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `token ${accessToken}`,
          "User-Agent": "Your-App-Name",
        },
      }),
    ]);

    const user = await userResponse.json();
    const emails = await emailsResponse.json();

    // Get primary email
    const primaryEmail = emails.find((email) => email.primary)?.email || user.email;

    return {
      id: user.id,
      username: user.login,
      name: user.name,
      email: primaryEmail,
      avatar: user.avatar_url,
      profile: user.html_url,
    };
  }

  generateState() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

// Multi-provider OAuth manager
class OAuthManager {
  constructor() {
    this.providers = {
      google: new GoogleOAuthClient(),
      github: new GitHubOAuthClient(),
      // Add more providers as needed
    };
  }

  getProvider(providerName) {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Unknown OAuth provider: ${providerName}`);
    }
    return provider;
  }

  async handleCallback(providerName, code) {
    const provider = this.getProvider(providerName);

    // Exchange code for tokens
    const tokens = await provider.exchangeCodeForTokens(code);

    // Get user profile
    const profile = await provider.getUserProfile(tokens.access_token);

    // Find or create user
    let user = await User.findOne({
      where: {
        [Op.or]: [{ [`${providerName}Id`]: profile.id }, { email: profile.email }],
      },
    });

    if (!user) {
      user = await User.create({
        [`${providerName}Id`]: profile.id,
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar,
        provider: providerName,
        emailVerified: true, // OAuth providers typically verify emails
      });
    } else {
      // Update provider ID if user exists with same email
      user[`${providerName}Id`] = profile.id;
      await user.save();
    }

    // Store/update OAuth tokens
    await UserOAuthToken.upsert({
      userId: user.id,
      provider: providerName,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
    });

    return user;
  }
}

// Express.js routes with multi-provider support
const oauthManager = new OAuthManager();

app.get("/auth/:provider", (req, res) => {
  const { provider } = req.params;

  try {
    const oauthProvider = oauthManager.getProvider(provider);
    const authUrl = oauthProvider.getAuthorizationUrl();
    res.redirect(authUrl);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/auth/:provider/callback", async (req, res) => {
  const { provider } = req.params;
  const { code, error } = req.query;

  if (error) {
    return res.status(400).json({ error: "Authorization failed" });
  }

  try {
    const user = await oauthManager.handleCallback(provider, code);

    // Generate your application's JWT token
    const appToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        provider: provider,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Set secure httpOnly cookie
    res.cookie("auth_token", appToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000, // 1 hour
    });

    res.redirect("/dashboard");
  } catch (error) {
    console.error(`${provider} OAuth error:`, error);
    res.status(500).json({ error: "Authentication failed" });
  }
});
```

---

## 🔒 **Security Best Practices**

### **Security Configuration**

```java
// SecurityConfig.java
@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12); // Strong hash rounds
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("https://*.yourdomain.com"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors().configurationSource(corsConfigurationSource())
            .and()
            .csrf().disable() // Disabled for API, use for web forms
            .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            .and()
            .headers()
                .frameOptions().deny()
                .contentTypeOptions().and()
                .httpStrictTransportSecurity(hstsConfig -> hstsConfig
                    .maxAgeInSeconds(31536000)
                    .includeSubdomains(true))
            .and()
            .oauth2ResourceServer()
                .jwt()
                .jwtDecoder(jwtDecoder())
                .jwtAuthenticationConverter(jwtAuthenticationConverter());

        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        // Use RSA key for JWT verification
        RSAKey rsaKey = getRSAKey();
        return NimbusJwtDecoder.withPublicKey(rsaKey.toRSAPublicKey()).build();
    }

    @Bean
    public Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            // Extract authorities from JWT claims
            Collection<String> authorities = jwt.getClaimAsStringList("authorities");
            return authorities.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
        });
        return converter;
    }
}

// Rate limiting for OAuth endpoints
@Component
public class OAuthRateLimitingFilter implements Filter {

    private final RedisTemplate<String, String> redisTemplate;
    private final RateLimiter rateLimiter;

    public OAuthRateLimitingFilter(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.rateLimiter = RateLimiter.create(10.0); // 10 requests per second
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response,
                        FilterChain chain) throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String clientIp = getClientIp(httpRequest);
        String key = "oauth_rate_limit:" + clientIp;

        // Check rate limit
        if (!rateLimiter.tryAcquire()) {
            httpResponse.setStatus(429);
            httpResponse.getWriter().write("{\"error\": \"Rate limit exceeded\"}");
            return;
        }

        // Additional per-IP rate limiting
        String count = redisTemplate.opsForValue().get(key);
        if (count != null && Integer.parseInt(count) > 100) { // 100 requests per hour
            httpResponse.setStatus(429);
            httpResponse.getWriter().write("{\"error\": \"Too many requests from this IP\"}");
            return;
        }

        // Increment counter
        redisTemplate.opsForValue().increment(key);
        redisTemplate.expire(key, Duration.ofHours(1));

        chain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
```

### **Token Security**

```javascript
// token-security.js
class TokenSecurity {
  // Generate secure random token
  static generateSecureToken(length = 32) {
    const crypto = require("crypto");
    return crypto.randomBytes(length).toString("hex");
  }

  // Hash token for storage
  static hashToken(token) {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  // Validate token format
  static validateTokenFormat(token) {
    // Check if token is valid base64url format
    const base64urlRegex = /^[A-Za-z0-9_-]+$/;
    return base64urlRegex.test(token) && token.length >= 32;
  }

  // Check if token is blacklisted
  static async isTokenBlacklisted(jti) {
    const redis = require("./redis-client");
    return await redis.exists(`blacklist:${jti}`);
  }

  // Blacklist token
  static async blacklistToken(jti, expiresIn) {
    const redis = require("./redis-client");
    await redis.setex(`blacklist:${jti}`, expiresIn, "revoked");
  }

  // Token rotation
  static async rotateRefreshToken(oldRefreshToken) {
    // Generate new refresh token
    const newRefreshToken = this.generateSecureToken();

    // Store token family for detection of token theft
    const tokenFamily = this.generateSecureToken(16);

    // Invalidate old token
    await this.blacklistToken(this.extractJTI(oldRefreshToken), 86400 * 7);

    return {
      refreshToken: newRefreshToken,
      tokenFamily: tokenFamily,
    };
  }

  // Detect token reuse (security breach)
  static async detectTokenReuse(refreshToken) {
    const decoded = jwt.decode(refreshToken);
    const tokenFamily = decoded.family;

    // Check if any token in this family has been used after being rotated
    const redis = require("./redis-client");
    const isReused = await redis.exists(`token_reuse:${tokenFamily}`);

    if (isReused) {
      // Token theft detected - revoke all tokens for this user
      await this.revokeAllUserTokens(decoded.sub);
      throw new Error("Token reuse detected - security breach");
    }

    // Mark this token as potentially reused
    await redis.setex(`token_reuse:${tokenFamily}`, 86400, "used");

    return false;
  }

  // Revoke all tokens for a user
  static async revokeAllUserTokens(userId) {
    const redis = require("./redis-client");

    // Get all active sessions for user
    const sessions = await redis.smembers(`user_sessions:${userId}`);

    // Blacklist all tokens
    for (const sessionId of sessions) {
      const tokenData = await redis.get(`session:${sessionId}`);
      if (tokenData) {
        const { jti } = JSON.parse(tokenData);
        await this.blacklistToken(jti, 86400 * 7);
      }
    }

    // Clear user sessions
    await redis.del(`user_sessions:${userId}`);
  }

  extractJTI(token) {
    const decoded = jwt.decode(token);
    return decoded.jti;
  }
}

// JWT security middleware
const jwtSecurityMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    // Verify token format
    if (!TokenSecurity.validateTokenFormat(token)) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    // Verify JWT signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is blacklisted
    if (await TokenSecurity.isTokenBlacklisted(decoded.jti)) {
      return res.status(401).json({ error: "Token has been revoked" });
    }

    // Check token age (force re-authentication for old tokens)
    const tokenAge = Date.now() / 1000 - decoded.iat;
    if (tokenAge > 86400 * 7) {
      // 7 days
      return res.status(401).json({ error: "Token too old, please re-authenticate" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }

    return res.status(500).json({ error: "Token validation failed" });
  }
};

module.exports = {
  TokenSecurity,
  jwtSecurityMiddleware,
};
```

---

## 🎯 **Best Practices Summary**

### **✅ OAuth 2.0 Security Checklist**

#### **Authorization Server**

- ✅ **Use HTTPS everywhere** - Never send tokens over HTTP
- ✅ **Validate redirect URIs** - Exact match, no wildcards
- ✅ **Short-lived access tokens** - 1 hour or less
- ✅ **Refresh token rotation** - Issue new refresh token on each use
- ✅ **Rate limiting** - Prevent brute force attacks
- ✅ **Audit logging** - Log all authentication events

#### **Client Application**

- ✅ **Use PKCE for public clients** - Prevent code interception
- ✅ **Secure token storage** - HttpOnly cookies or secure storage
- ✅ **State parameter** - Prevent CSRF attacks
- ✅ **Token validation** - Verify issuer, audience, expiration
- ✅ **Scope validation** - Request minimal required scopes
- ✅ **Error handling** - Don't expose sensitive information

#### **Production Deployment**

- ✅ **Key rotation** - Regular JWT signing key rotation
- ✅ **Monitoring** - Track failed attempts and anomalies
- ✅ **Backup authentication** - Alternative auth methods
- ✅ **Session management** - Track and manage user sessions
- ✅ **Compliance** - GDPR, SOC2, ISO27001 requirements

---

## 🚀 **Next Steps**

1. **Choose appropriate OAuth flow** based on client type
2. **Implement proper token security** with rotation and blacklisting
3. **Set up comprehensive logging** for security monitoring
4. **Test all security scenarios** including token theft detection
5. **Deploy with proper key management** and monitoring
6. **Regular security audits** and penetration testing

_OAuth 2.0 provides robust authorization framework when implemented securely. Master these patterns to build trustworthy authentication systems!_
