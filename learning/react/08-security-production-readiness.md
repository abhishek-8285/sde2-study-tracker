# Security & Production Readiness 🛡️

Master production-ready React applications with comprehensive security measures, monitoring, accessibility, and deployment strategies.

## Table of Contents

- [Security Fundamentals](#security-fundamentals)
- [Environment & Configuration](#environment--configuration)
- [Error Monitoring & Logging](#error-monitoring--logging)
- [Accessibility (WCAG Compliance)](#accessibility-wcag-compliance)
- [Bundle Analysis & Optimization](#bundle-analysis--optimization)

---

## Security Fundamentals

### XSS (Cross-Site Scripting) Prevention

React provides built-in XSS protection, but you need to be aware of potential vulnerabilities.

```jsx
// ✅ SAFE: React automatically escapes content
function UserProfile({ user }) {
  return (
    <div>
      <h1>{user.name}</h1> {/* Safe - React escapes */}
      <p>{user.bio}</p> {/* Safe - React escapes */}
    </div>
  );
}

// ❌ DANGEROUS: dangerouslySetInnerHTML without sanitization
function UserBio({ bioHtml }) {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: bioHtml }} // Potential XSS!
    />
  );
}

// ✅ SAFE: Sanitize HTML content
import DOMPurify from "dompurify";

function SafeUserBio({ bioHtml }) {
  const sanitizedHtml = DOMPurify.sanitize(bioHtml, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "ul", "ol", "li"],
    ALLOWED_ATTR: [],
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}

// ✅ SAFE: URL validation for links
function SafeLink({ href, children, ...props }) {
  const isValidUrl = (url) => {
    try {
      const parsed = new URL(url);
      return ["http:", "https:", "mailto:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  if (!isValidUrl(href)) {
    console.warn(`Invalid URL provided: ${href}`);
    return <span>{children}</span>;
  }

  return (
    <a href={href} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} target={href.startsWith("http") ? "_blank" : undefined} {...props}>
      {children}
    </a>
  );
}

// Custom hook for safe HTML rendering
function useSafeHtml(htmlContent, options = {}) {
  return useMemo(() => {
    const defaultOptions = {
      ALLOWED_TAGS: ["p", "br", "strong", "em", "ul", "ol", "li", "a"],
      ALLOWED_ATTR: ["href", "title"],
      ADD_ATTR: ["target", "rel"],
      ...options,
    };

    return DOMPurify.sanitize(htmlContent, defaultOptions);
  }, [htmlContent, options]);
}

// Rich text editor with XSS protection
function SafeRichTextEditor({ value, onChange }) {
  const [content, setContent] = useState(value || "");

  const handleChange = (newContent) => {
    // Sanitize content before setting state
    const sanitized = DOMPurify.sanitize(newContent, {
      ALLOWED_TAGS: ["p", "br", "strong", "em", "ul", "ol", "li", "h1", "h2", "h3"],
      ALLOWED_ATTR: [],
    });

    setContent(sanitized);
    onChange?.(sanitized);
  };

  return (
    <div className="rich-text-editor">
      <div contentEditable onInput={(e) => handleChange(e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}
```

### CSRF (Cross-Site Request Forgery) Protection

```jsx
// CSRF token management
class CSRFService {
  private token: string | null = null;

  async getToken(): Promise<string> {
    if (this.token) return this.token;

    const response = await fetch('/api/csrf-token', {
      credentials: 'include'
    });

    const data = await response.json();
    this.token = data.token;

    return this.token;
  }

  clearToken(): void {
    this.token = null;
  }
}

const csrfService = new CSRFService();

// Enhanced fetch wrapper with CSRF protection
async function secureFetch(url: string, options: RequestInit = {}) {
  const csrfToken = await csrfService.getToken();

  const secureOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      ...options.headers,
    },
  };

  const response = await fetch(url, secureOptions);

  // Clear token if CSRF error
  if (response.status === 403) {
    csrfService.clearToken();
    throw new Error('CSRF token invalid');
  }

  return response;
}

// React hook for secure API calls
function useSecureApi() {
  const securePost = useCallback(async (url: string, data: any) => {
    try {
      const response = await secureFetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.message === 'CSRF token invalid') {
        // Retry once with new token
        const retryResponse = await secureFetch(url, {
          method: 'POST',
          body: JSON.stringify(data),
        });

        return await retryResponse.json();
      }

      throw error;
    }
  }, []);

  return { securePost };
}

// Secure form component
function SecureContactForm() {
  const { securePost } = useSecureApi();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      await securePost('/api/contact', data);
      toast.success('Message sent successfully');
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Your name" required />
      <input name="email" type="email" placeholder="Your email" required />
      <textarea name="message" placeholder="Your message" required />

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
```

### Content Security Policy (CSP)

```jsx
// CSP configuration for React apps
const cspDirectives = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'", // Required for React in development
    "https://cdn.jsdelivr.net",
    "https://unpkg.com",
  ],
  "style-src": [
    "'self'",
    "'unsafe-inline'", // Required for CSS-in-JS
    "https://fonts.googleapis.com",
  ],
  "font-src": ["'self'", "https://fonts.gstatic.com"],
  "img-src": ["'self'", "data:", "https://*.amazonaws.com", "https://*.cloudinary.com"],
  "connect-src": ["'self'", "https://api.example.com", "wss://websocket.example.com"],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
};

// Generate CSP header
function generateCSPHeader(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");
}

// CSP violation reporting
function setupCSPReporting() {
  if (typeof window === "undefined") return;

  document.addEventListener("securitypolicyviolation", (e) => {
    const violation = {
      blockedURI: e.blockedURI,
      columnNumber: e.columnNumber,
      documentURI: e.documentURI,
      effectiveDirective: e.effectiveDirective,
      lineNumber: e.lineNumber,
      originalPolicy: e.originalPolicy,
      referrer: e.referrer,
      sourceFile: e.sourceFile,
      violatedDirective: e.violatedDirective,
      timestamp: Date.now(),
    };

    // Send to monitoring service
    fetch("/api/csp-violation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(violation),
    }).catch(console.error);
  });
}

// Secure image component with CSP compliance
function SecureImage({ src, alt, fallback, ...props }) {
  const [imageSrc, setImageSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const isAllowedSource = (url) => {
    try {
      const parsed = new URL(url);
      const allowedDomains = [window.location.hostname, "amazonaws.com", "cloudinary.com", "unsplash.com"];

      return allowedDomains.some((domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`));
    } catch {
      return false;
    }
  };

  const handleError = () => {
    setHasError(true);
    if (fallback) {
      setImageSrc(fallback);
    }
  };

  if (!isAllowedSource(imageSrc)) {
    console.warn(`Image source not allowed by CSP: ${imageSrc}`);
    return <div className="image-placeholder">{alt}</div>;
  }

  return <img src={imageSrc} alt={alt} onError={handleError} {...props} />;
}
```

---

## Environment & Configuration

### Secure Environment Management

```typescript
// Environment variable validation
import { z } from "zod";

const envSchema = z.object({
  // Public variables (prefixed with REACT_APP_)
  REACT_APP_API_URL: z.string().url(),
  REACT_APP_APP_NAME: z.string().min(1),
  REACT_APP_VERSION: z.string().min(1),
  REACT_APP_ENVIRONMENT: z.enum(["development", "staging", "production"]),

  // Build-time variables
  NODE_ENV: z.enum(["development", "production", "test"]),

  // Optional variables
  REACT_APP_ANALYTICS_ID: z.string().optional(),
  REACT_APP_SENTRY_DSN: z.string().optional(),
  REACT_APP_FEATURE_FLAGS: z.string().optional(),
});

type Environment = z.infer<typeof envSchema>;

class ConfigService {
  private config: Environment;

  constructor() {
    try {
      this.config = envSchema.parse(process.env);
    } catch (error) {
      console.error("Environment validation failed:", error);
      throw new Error("Invalid environment configuration");
    }
  }

  get apiUrl(): string {
    return this.config.REACT_APP_API_URL;
  }

  get appName(): string {
    return this.config.REACT_APP_APP_NAME;
  }

  get version(): string {
    return this.config.REACT_APP_VERSION;
  }

  get environment(): string {
    return this.config.REACT_APP_ENVIRONMENT;
  }

  get isDevelopment(): boolean {
    return this.config.NODE_ENV === "development";
  }

  get isProduction(): boolean {
    return this.config.NODE_ENV === "production";
  }

  get analyticsId(): string | undefined {
    return this.config.REACT_APP_ANALYTICS_ID;
  }

  get sentryDsn(): string | undefined {
    return this.config.REACT_APP_SENTRY_DSN;
  }

  getFeatureFlags(): Record<string, boolean> {
    try {
      return this.config.REACT_APP_FEATURE_FLAGS ? JSON.parse(this.config.REACT_APP_FEATURE_FLAGS) : {};
    } catch {
      return {};
    }
  }
}

export const config = new ConfigService();

// Feature flag hook
function useFeatureFlag(flagName: string): boolean {
  const [flags] = useState(() => config.getFeatureFlags());
  return flags[flagName] || false;
}

// Environment-specific configuration
function useEnvironmentConfig() {
  return useMemo(
    () => ({
      apiUrl: config.apiUrl,
      environment: config.environment,
      isDevelopment: config.isDevelopment,
      isProduction: config.isProduction,
      version: config.version,
    }),
    []
  );
}

// Conditional rendering based on environment
function DevelopmentTools() {
  const { isDevelopment } = useEnvironmentConfig();

  if (!isDevelopment) return null;

  return (
    <div className="dev-tools">
      <button onClick={() => console.log("Redux State:", store.getState())}>Log Redux State</button>
      <button onClick={() => localStorage.clear()}>Clear Storage</button>
    </div>
  );
}
```

### Secrets Management

```typescript
// Secure storage for sensitive data
class SecureStorage {
  private prefix = "secure_";

  // Encrypt data before storing (in a real app, use proper encryption)
  private encrypt(data: string): string {
    // This is a simple example - use proper encryption in production
    return btoa(data);
  }

  private decrypt(data: string): string {
    try {
      return atob(data);
    } catch {
      throw new Error("Failed to decrypt data");
    }
  }

  setItem(key: string, value: string): void {
    try {
      const encrypted = this.encrypt(value);
      localStorage.setItem(this.prefix + key, encrypted);
    } catch (error) {
      console.error("Failed to store secure item:", error);
    }
  }

  getItem(key: string): string | null {
    try {
      const encrypted = localStorage.getItem(this.prefix + key);
      return encrypted ? this.decrypt(encrypted) : null;
    } catch (error) {
      console.error("Failed to retrieve secure item:", error);
      return null;
    }
  }

  removeItem(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(this.prefix))
      .forEach((key) => localStorage.removeItem(key));
  }
}

const secureStorage = new SecureStorage();

// Token management
class AuthTokenManager {
  private readonly ACCESS_TOKEN_KEY = "access_token";
  private readonly REFRESH_TOKEN_KEY = "refresh_token";

  setTokens(accessToken: string, refreshToken?: string): void {
    secureStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      secureStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  getAccessToken(): string | null {
    return secureStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return secureStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  clearTokens(): void {
    secureStorage.removeItem(this.ACCESS_TOKEN_KEY);
    secureStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}

export const tokenManager = new AuthTokenManager();

// Secure API client with token refresh
class SecureApiClient {
  private refreshPromise: Promise<string> | null = null;

  async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    let accessToken = tokenManager.getAccessToken();

    // Check if token needs refresh
    if (!accessToken || tokenManager.isTokenExpired(accessToken)) {
      accessToken = await this.refreshAccessToken();
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Handle 401 responses
    if (response.status === 401) {
      try {
        accessToken = await this.refreshAccessToken();

        // Retry request with new token
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (error) {
        // Refresh failed - redirect to login
        window.location.href = "/login";
        throw error;
      }
    }

    return response;
  }

  private async refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const refreshToken = tokenManager.getRefreshToken();

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      tokenManager.clearTokens();
      throw new Error("Token refresh failed");
    }

    const { accessToken, refreshToken: newRefreshToken } = await response.json();

    tokenManager.setTokens(accessToken, newRefreshToken);

    return accessToken;
  }
}

export const secureApi = new SecureApiClient();
```

---

## Error Monitoring & Logging

### Comprehensive Error Handling

```typescript
// Error boundary with detailed logging
interface ErrorInfo {
  errorBoundary?: string;
  componentStack: string;
  errorStack?: string;
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
}

class ErrorReportingService {
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async reportError(error: Error, errorInfo: ErrorInfo): Promise<void> {
    const report = {
      message: error.message,
      stack: error.stack,
      ...errorInfo,
      sessionId: this.sessionId,
      buildVersion: config.version,
      environment: config.environment,
    };

    try {
      // Send to multiple error reporting services
      await Promise.allSettled([this.sendToSentry(report), this.sendToCustomEndpoint(report), this.logToConsole(report)]);
    } catch (reportingError) {
      console.error("Failed to report error:", reportingError);
    }
  }

  private async sendToSentry(report: any): Promise<void> {
    if (!config.sentryDsn) return;

    // Initialize Sentry if not already done
    if (typeof window !== "undefined" && !window.__SENTRY_INITIALIZED) {
      const Sentry = await import("@sentry/react");

      Sentry.init({
        dsn: config.sentryDsn,
        environment: config.environment,
        release: config.version,
        integrations: [new Sentry.BrowserTracing()],
        tracesSampleRate: config.isProduction ? 0.1 : 1.0,
      });

      window.__SENTRY_INITIALIZED = true;
    }

    const Sentry = await import("@sentry/react");
    Sentry.captureException(new Error(report.message), {
      contexts: {
        errorInfo: report,
      },
    });
  }

  private async sendToCustomEndpoint(report: any): Promise<void> {
    try {
      await fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
    } catch (error) {
      console.warn("Failed to send error to custom endpoint:", error);
    }
  }

  private logToConsole(report: any): void {
    if (config.isDevelopment) {
      console.group("🚨 Error Report");
      console.error("Message:", report.message);
      console.error("Stack:", report.stack);
      console.table(report);
      console.groupEnd();
    }
  }

  reportPerformanceIssue(metric: string, value: number, threshold: number): void {
    if (value > threshold) {
      console.warn(`Performance issue: ${metric} (${value}ms) exceeded threshold (${threshold}ms)`);

      // Report to analytics
      this.sendToCustomEndpoint({
        type: "performance",
        metric,
        value,
        threshold,
        timestamp: Date.now(),
        url: window.location.href,
      });
    }
  }
}

const errorReporter = new ErrorReportingService();

// Enhanced Error Boundary
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  eventId: string | null;
}

class ErrorBoundary extends Component<PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: PropsWithChildren<{}>) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const eventId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.setState({
      errorInfo,
      eventId,
    });

    // Report error
    errorReporter.reportError(error, {
      componentStack: errorInfo.componentStack,
      errorStack: error.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      // Add user context if available
      userId: this.getUserId(),
    });
  }

  private getUserId(): string | undefined {
    // Get user ID from your auth system
    try {
      const token = tokenManager.getAccessToken();
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.sub;
      }
    } catch {
      // Ignore errors when extracting user ID
    }
    return undefined;
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    });
  };

  private handleReportFeedback = (feedback: string): void => {
    if (this.state.eventId) {
      errorReporter.sendToCustomEndpoint({
        type: "user_feedback",
        eventId: this.state.eventId,
        feedback,
        timestamp: Date.now(),
      });
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} eventId={this.state.eventId} onRetry={this.handleRetry} onReportFeedback={this.handleReportFeedback} />;
    }

    return this.props.children;
  }
}

// Error fallback component
interface ErrorFallbackProps {
  error: Error | null;
  eventId: string | null;
  onRetry: () => void;
  onReportFeedback: (feedback: string) => void;
}

function ErrorFallback({ error, eventId, onRetry, onReportFeedback }: ErrorFallbackProps) {
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.trim()) {
      onReportFeedback(feedback);
      setFeedbackSent(true);
    }
  };

  return (
    <div className="error-fallback">
      <div className="error-content">
        <h2>Oops! Something went wrong</h2>
        <p>We're sorry for the inconvenience. The error has been reported to our team.</p>

        {config.isDevelopment && error && (
          <details className="error-details">
            <summary>Error Details (Development Only)</summary>
            <pre>{error.message}</pre>
            <pre>{error.stack}</pre>
          </details>
        )}

        <div className="error-actions">
          <button onClick={onRetry} className="btn btn-primary">
            Try Again
          </button>

          <button onClick={() => window.location.reload()} className="btn btn-secondary">
            Reload Page
          </button>
        </div>

        {eventId && !feedbackSent && (
          <form onSubmit={handleSubmitFeedback} className="feedback-form">
            <h3>Help us improve</h3>
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What were you doing when this error occurred? (optional)" rows={3} />
            <button type="submit" className="btn btn-ghost">
              Send Feedback
            </button>
          </form>
        )}

        {feedbackSent && <p className="feedback-success">Thank you for your feedback! Error ID: {eventId}</p>}
      </div>
    </div>
  );
}

// Performance monitoring
function usePerformanceMonitoring() {
  useEffect(() => {
    // Monitor Core Web Vitals
    import("web-vitals").then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS((metric) => {
        errorReporter.reportPerformanceIssue("CLS", metric.value, 0.1);
      });

      getFID((metric) => {
        errorReporter.reportPerformanceIssue("FID", metric.value, 100);
      });

      getFCP((metric) => {
        errorReporter.reportPerformanceIssue("FCP", metric.value, 2000);
      });

      getLCP((metric) => {
        errorReporter.reportPerformanceIssue("LCP", metric.value, 2500);
      });

      getTTFB((metric) => {
        errorReporter.reportPerformanceIssue("TTFB", metric.value, 600);
      });
    });

    // Monitor long tasks
    if ("PerformanceObserver" in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          errorReporter.reportPerformanceIssue("Long Task", entry.duration, 50);
        });
      });

      observer.observe({ entryTypes: ["longtask"] });

      return () => observer.disconnect();
    }
  }, []);
}
```

---

## Accessibility (WCAG Compliance)

### Comprehensive Accessibility Implementation

```jsx
// Accessible form components
interface AccessibleInputProps {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  error?: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
}

function AccessibleInput({
  id,
  label,
  type = 'text',
  required = false,
  error,
  description,
  value,
  onChange,
}: AccessibleInputProps) {
  const describedBy = [
    description ? `${id}-description` : '',
    error ? `${id}-error` : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="form-field">
      <label htmlFor={id} className={required ? 'required' : ''}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>

      {description && (
        <div id={`${id}-description`} className="field-description">
          {description}
        </div>
      )}

      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-invalid={!!error}
        aria-describedby={describedBy || undefined}
        className={error ? 'error' : ''}
      />

      {error && (
        <div
          id={`${id}-error`}
          className="error-message"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
    </div>
  );
}

// Accessible modal with focus management
interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

function AccessibleModal({ isOpen, onClose, title, children }: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus modal
      modalRef.current?.focus();

      // Trap focus within modal
      const trapFocus = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          const modal = modalRef.current;
          if (!modal) return;

          const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );

          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', trapFocus);

      return () => {
        document.removeEventListener('keydown', trapFocus);
        // Restore focus to previous element
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="modal-close"
          >
            ×
          </button>
        </header>

        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

// Accessible data table
interface AccessibleTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    header: string;
    sortable?: boolean;
  }>;
  caption: string;
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
}

function AccessibleTable<T extends Record<string, any>>({
  data,
  columns,
  caption,
  onSort,
}: AccessibleTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: keyof T) => {
    if (!columns.find(col => col.key === column)?.sortable) return;

    const newDirection =
      sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';

    setSortColumn(column);
    setSortDirection(newDirection);
    onSort?.(column, newDirection);
  };

  const handleKeyDown = (e: React.KeyboardEvent, column: keyof T) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSort(column);
    }
  };

  return (
    <table role="table" aria-label={caption}>
      <caption className="sr-only">{caption}</caption>

      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={String(column.key)}
              scope="col"
              className={column.sortable ? 'sortable' : ''}
              tabIndex={column.sortable ? 0 : undefined}
              role={column.sortable ? 'button' : undefined}
              aria-sort={
                sortColumn === column.key
                  ? sortDirection === 'asc' ? 'ascending' : 'descending'
                  : column.sortable ? 'none' : undefined
              }
              onClick={() => column.sortable && handleSort(column.key)}
              onKeyDown={(e) => column.sortable && handleKeyDown(e, column.key)}
            >
              {column.header}
              {column.sortable && (
                <span aria-hidden="true" className="sort-indicator">
                  {sortColumn === column.key ? (
                    sortDirection === 'asc' ? ' ↑' : ' ↓'
                  ) : ' ⇅'}
                </span>
              )}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {data.map((row, index) => (
          <tr key={index}>
            {columns.map((column) => (
              <td key={String(column.key)}>
                {String(row[column.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Skip navigation component
function SkipNavigation() {
  return (
    <a
      href="#main-content"
      className="skip-nav"
      onFocus={(e) => e.target.style.transform = 'translateY(0)'}
      onBlur={(e) => e.target.style.transform = 'translateY(-100%)'}
    >
      Skip to main content
    </a>
  );
}

// Accessible notification system
interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onDismiss?: () => void;
}

function AccessibleNotification({ message, type, onDismiss }: NotificationProps) {
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Announce to screen readers
    if (notificationRef.current) {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = `${type}: ${message}`;

      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }
  }, [message, type]);

  return (
    <div
      ref={notificationRef}
      className={`notification notification-${type}`}
      role="alert"
      aria-live="assertive"
    >
      <span className="notification-message">{message}</span>

      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label={`Dismiss ${type} notification`}
          className="notification-dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}

// Accessibility testing hook
function useAccessibilityTesting() {
  useEffect(() => {
    if (config.isDevelopment) {
      // Load axe-core for accessibility testing
      import('@axe-core/react').then((axe) => {
        import('react-dom').then((ReactDOM) => {
          axe.default(React, ReactDOM, 1000);
        });
      });
    }
  }, []);
}
```

---

## Bundle Analysis & Optimization

### Advanced Bundle Optimization

```typescript
// Webpack Bundle Analyzer configuration
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

// webpack.config.js additions for analysis
module.exports = {
  // ... existing config
  plugins: [
    // Bundle analysis
    process.env.ANALYZE === "true" &&
      new BundleAnalyzerPlugin({
        analyzerMode: "static",
        openAnalyzer: false,
        reportFilename: "bundle-report.html",
      }),
  ].filter(Boolean),

  // Optimization
  optimization: {
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          priority: -10,
          chunks: "all",
        },
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: "react",
          priority: 20,
          chunks: "all",
        },
        common: {
          name: "common",
          minChunks: 2,
          priority: -5,
          chunks: "all",
        },
      },
    },
  },
};

// Dynamic imports with loading states
function useLazyComponent<T>(importFn: () => Promise<{ default: ComponentType<T> }>, fallback: ReactNode = <div>Loading...</div>) {
  const LazyComponent = useMemo(() => lazy(importFn), [importFn]);

  return function WrappedLazyComponent(props: T) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Route-based code splitting
const HomePage = useLazyComponent(() => import("./pages/HomePage"), <PageSkeleton />);

const DashboardPage = useLazyComponent(() => import("./pages/DashboardPage"), <DashboardSkeleton />);

// Feature-based code splitting
const AdminPanel = useLazyComponent(() => import("./features/admin/AdminPanel"), <div>Loading admin panel...</div>);

// Component-level optimization
const HeavyChart = useLazyComponent(() => import("./components/HeavyChart"), <ChartSkeleton />);

// Bundle size monitoring
class BundleSizeMonitor {
  private performanceObserver: PerformanceObserver | null = null;

  init(): void {
    if (typeof window === "undefined" || !("PerformanceObserver" in window)) {
      return;
    }

    this.performanceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === "navigation") {
          const navEntry = entry as PerformanceNavigationTiming;
          this.reportLoadTime(navEntry);
        }
      });
    });

    this.performanceObserver.observe({
      entryTypes: ["navigation"],
    });

    // Monitor resource loading
    this.monitorResourceSizes();
  }

  private reportLoadTime(entry: PerformanceNavigationTiming): void {
    const metrics = {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
    };

    console.log("Bundle Performance Metrics:", metrics);

    // Report to analytics
    if (config.analyticsId) {
      // Send to your analytics service
    }
  }

  private monitorResourceSizes(): void {
    window.addEventListener("load", () => {
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

      const jsResources = resources.filter((resource) => resource.name.endsWith(".js") && resource.transferSize > 0);

      const totalJSSize = jsResources.reduce((total, resource) => total + resource.transferSize, 0);

      console.log(`Total JS Bundle Size: ${(totalJSSize / 1024).toFixed(2)} KB`);

      if (totalJSSize > 500 * 1024) {
        // 500KB threshold
        console.warn("Bundle size exceeds recommended threshold");
      }
    });
  }

  destroy(): void {
    this.performanceObserver?.disconnect();
  }
}

const bundleMonitor = new BundleSizeMonitor();

// Performance budget enforcement
function useBundleBudget() {
  useEffect(() => {
    if (config.isDevelopment) {
      bundleMonitor.init();

      return () => bundleMonitor.destroy();
    }
  }, []);
}

// Tree shaking optimization guide
/*
// ✅ Good: Named imports for tree shaking
import { debounce, throttle } from 'lodash-es';

// ❌ Bad: Default import includes entire library
import _ from 'lodash';

// ✅ Good: Specific import paths
import debounce from 'lodash-es/debounce';
import throttle from 'lodash-es/throttle';

// ✅ Good: Modern libraries with ESM
import { format } from 'date-fns';

// ❌ Bad: CommonJS libraries
import moment from 'moment';
*/

// Image optimization
function OptimizedImage({ src, alt, width, height, loading = "lazy", ...props }: { src: string; alt: string; width?: number; height?: number; loading?: "lazy" | "eager"; [key: string]: any }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Generate responsive image URLs
  const generateSrcSet = (baseSrc: string) => {
    const sizes = [320, 640, 960, 1280, 1920];
    return sizes.map((size) => `${baseSrc}?w=${size} ${size}w`).join(", ");
  };

  return (
    <div className="optimized-image-container">
      {!isLoaded && !error && (
        <div className="image-placeholder" style={{ width, height }}>
          Loading...
        </div>
      )}

      <img src={src} srcSet={generateSrcSet(src)} sizes="(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw" alt={alt} width={width} height={height} loading={loading} onLoad={() => setIsLoaded(true)} onError={() => setError(true)} style={{ display: isLoaded ? "block" : "none" }} {...props} />

      {error && (
        <div className="image-error" style={{ width, height }}>
          Failed to load image
        </div>
      )}
    </div>
  );
}
```

---

## Summary & Deployment Strategy

### 🎯 Production Checklist

✅ **Security Implementation**

- XSS prevention with DOMPurify
- CSRF protection with tokens
- CSP headers configured
- Secure token management

✅ **Environment Configuration**

- Environment variables validated
- Secrets properly managed
- Feature flags implemented
- Configuration service setup

✅ **Error Monitoring**

- Comprehensive error boundaries
- Error reporting to external services
- Performance monitoring
- User feedback collection

✅ **Accessibility Compliance**

- WCAG 2.1 AA standards met
- Screen reader support
- Keyboard navigation
- Focus management

✅ **Bundle Optimization**

- Code splitting implemented
- Tree shaking optimized
- Performance budgets set
- Image optimization

### 📈 Deployment Strategy

```typescript
// CI/CD Pipeline configuration (GitHub Actions example)
/*
name: Deploy React App

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test -- --coverage --watchAll=false
      
      - name: Run accessibility tests
        run: npm run test:a11y
      
      - name: Build application
        run: npm run build
      
      - name: Analyze bundle
        run: npm run analyze
      
      - name: Run security audit
        run: npm audit --audit-level high

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: echo "Deploy to production"
*/

// Health check endpoint
function useHealthCheck() {
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch("/api/health");
        if (!response.ok) {
          console.warn("Health check failed");
        }
      } catch (error) {
        console.error("Health check error:", error);
      }
    };

    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);
}
```

### 🔧 Monitoring & Maintenance

1. **Performance Monitoring**: Track Core Web Vitals, bundle size, and load times
2. **Error Tracking**: Monitor error rates and user feedback
3. **Security Scanning**: Regular dependency audits and vulnerability assessments
4. **Accessibility Testing**: Automated and manual accessibility testing
5. **Bundle Analysis**: Regular bundle size monitoring and optimization

**🎉 Congratulations!** You now have a comprehensive, production-ready React development guide covering all aspects from core concepts to security and deployment. This guide provides enterprise-level patterns and practices used by top tech companies.

---

_💡 Final Pro Tip: Security and accessibility are not afterthoughts—build them into your development process from day one. Your users and your team will thank you._
