# Component Design & Architecture 🏗️

Master component design patterns, styling strategies, and routing to build scalable, maintainable React applications.

## Table of Contents

- [Component Patterns](#component-patterns)
- [Styling Strategies](#styling-strategies)
- [React Router Advanced](#react-router-advanced)
- [Design Systems](#design-systems)
- [Enterprise Architecture](#enterprise-architecture)

---

## Component Patterns

Understanding component patterns is crucial for building reusable, maintainable components that scale with your application.

### 1. Higher-Order Components (HOCs)

HOCs are functions that take a component and return a new component with additional functionality.

```jsx
// withAuth HOC - Authentication wrapper
function withAuth(WrappedComponent) {
  return function AuthenticatedComponent(props) {
    const { user, loading } = useAuth();

    if (loading) {
      return <div className="loading">Checking authentication...</div>;
    }

    if (!user) {
      return <LoginPrompt />;
    }

    return <WrappedComponent {...props} user={user} />;
  };
}

// withLoading HOC - Loading state wrapper
function withLoading(WrappedComponent) {
  return function LoadingComponent({ isLoading, loadingText = "Loading...", ...props }) {
    if (isLoading) {
      return <div className="loading-spinner">{loadingText}</div>;
    }

    return <WrappedComponent {...props} />;
  };
}

// withErrorBoundary HOC - Error handling wrapper
function withErrorBoundary(WrappedComponent, ErrorFallback = DefaultErrorFallback) {
  return class extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
      console.error("Component error:", error, errorInfo);
      // Log to error reporting service
    }

    render() {
      if (this.state.hasError) {
        return <ErrorFallback error={this.state.error} />;
      }

      return <WrappedComponent {...this.props} />;
    }
  };
}

// Usage - Combining multiple HOCs
const UserDashboard = withAuth(withLoading(withErrorBoundary(DashboardContent)));

function App() {
  const { data: dashboardData, isLoading, error } = useDashboardData();

  return <UserDashboard isLoading={isLoading} dashboardData={dashboardData} error={error} />;
}

// Advanced HOC with configuration
function withAPIData(apiEndpoint, options = {}) {
  return function (WrappedComponent) {
    return function APIDataComponent(props) {
      const { data, loading, error, refetch } = useQuery({
        queryKey: [apiEndpoint, options],
        queryFn: () => fetchData(apiEndpoint, options),
        ...options,
      });

      return <WrappedComponent {...props} data={data} loading={loading} error={error} refetch={refetch} />;
    };
  };
}

// Usage
const ProductList = withAPIData("/api/products", {
  staleTime: 5 * 60 * 1000,
})(ProductListComponent);

const UserProfile = withAPIData("/api/user/profile")(UserProfileComponent);
```

### 2. Render Props Pattern

Render props allow components to share logic through a function prop.

```jsx
// DataFetcher with render props
function DataFetcher({ url, children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url);
        if (!response.ok) throw new Error("Fetch failed");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return children({ data, loading, error });
}

// MouseTracker with render props
function MouseTracker({ children }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event) => {
      setPosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return children(position);
}

// IntersectionObserver with render props
function InView({ threshold = 0.1, children }) {
  const [ref, setRef] = useState(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold });

    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return children({ ref: setRef, inView });
}

// Usage examples
function App() {
  return (
    <div>
      {/* Data fetching with render props */}
      <DataFetcher url="/api/users">
        {({ data, loading, error }) => {
          if (loading) return <div>Loading users...</div>;
          if (error) return <div>Error: {error}</div>;
          return (
            <ul>
              {data?.map((user) => (
                <li key={user.id}>{user.name}</li>
              ))}
            </ul>
          );
        }}
      </DataFetcher>

      {/* Mouse tracking */}
      <MouseTracker>
        {({ x, y }) => (
          <div>
            Mouse position: {x}, {y}
          </div>
        )}
      </MouseTracker>

      {/* Intersection observer for lazy loading */}
      <InView threshold={0.5}>{({ ref, inView }) => <div ref={ref}>{inView ? <img src="/large-image.jpg" alt="Lazy loaded" /> : <div className="placeholder">Image will load when visible</div>}</div>}</InView>
    </div>
  );
}
```

### 3. Compound Components Pattern

Compound components work together to form a complete UI component.

```jsx
// Accordion compound component
const AccordionContext = createContext();

function Accordion({ children, allowMultiple = false }) {
  const [openItems, setOpenItems] = useState(new Set());

  const toggleItem = (key) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        if (!allowMultiple) {
          newSet.clear();
        }
        newSet.add(key);
      }
      return newSet;
    });
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem }}>
      <div className="accordion">{children}</div>
    </AccordionContext.Provider>
  );
}

function AccordionItem({ children, itemKey }) {
  const { openItems, toggleItem } = useContext(AccordionContext);
  const isOpen = openItems.has(itemKey);

  return <div className={`accordion-item ${isOpen ? "open" : ""}`}>{React.Children.map(children, (child) => React.cloneElement(child, { itemKey, isOpen }))}</div>;
}

function AccordionHeader({ children, itemKey }) {
  const { toggleItem } = useContext(AccordionContext);

  return (
    <button className="accordion-header" onClick={() => toggleItem(itemKey)}>
      {children}
    </button>
  );
}

function AccordionPanel({ children, isOpen }) {
  return <div className={`accordion-panel ${isOpen ? "open" : "closed"}`}>{children}</div>;
}

// Export as compound component
Accordion.Item = AccordionItem;
Accordion.Header = AccordionHeader;
Accordion.Panel = AccordionPanel;

// Usage
function FAQSection() {
  return (
    <Accordion allowMultiple={true}>
      <Accordion.Item itemKey="shipping">
        <Accordion.Header>
          <h3>Shipping Information</h3>
        </Accordion.Header>
        <Accordion.Panel>
          <p>We offer free shipping on orders over $50...</p>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item itemKey="returns">
        <Accordion.Header>
          <h3>Return Policy</h3>
        </Accordion.Header>
        <Accordion.Panel>
          <p>Items can be returned within 30 days...</p>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item itemKey="warranty">
        <Accordion.Header>
          <h3>Warranty</h3>
        </Accordion.Header>
        <Accordion.Panel>
          <p>All products come with a 1-year warranty...</p>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

// Modal compound component
const ModalContext = createContext();

function Modal({ children, isOpen, onClose }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <ModalContext.Provider value={{ onClose }}>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    </ModalContext.Provider>
  );
}

function ModalHeader({ children }) {
  const { onClose } = useContext(ModalContext);

  return (
    <div className="modal-header">
      {children}
      <button className="modal-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
}

function ModalBody({ children }) {
  return <div className="modal-body">{children}</div>;
}

function ModalFooter({ children }) {
  return <div className="modal-footer">{children}</div>;
}

Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

// Usage
function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsModalOpen(true)}>Open Modal</button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <Modal.Header>
          <h2>Confirm Action</h2>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this item?</p>
        </Modal.Body>
        <Modal.Footer>
          <button onClick={() => setIsModalOpen(false)}>Cancel</button>
          <button className="danger">Delete</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
```

### 4. Controlled vs Uncontrolled Components

Understanding when to use controlled vs uncontrolled components is crucial for form management.

```jsx
// Controlled Components - React controls the state
function ControlledForm() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});

  const validateField = (name, value) => {
    switch (name) {
      case "username":
        return value.length < 3 ? "Username must be at least 3 characters" : "";
      case "email":
        return !/\S+@\S+\.\S+/.test(value) ? "Email is invalid" : "";
      case "password":
        return value.length < 8 ? "Password must be at least 8 characters" : "";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Real-time validation
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length === 0) {
      console.log("Form submitted:", formData);
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input type="text" name="username" placeholder="Username" value={formData.username} onChange={handleChange} />
        {errors.username && <span className="error">{errors.username}</span>}
      </div>

      <div>
        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <div>
        <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} />
        {errors.password && <span className="error">{errors.password}</span>}
      </div>

      <button type="submit">Register</button>
    </form>
  );
}

// Uncontrolled Components - DOM controls the state
function UncontrolledForm() {
  const formRef = useRef();
  const usernameRef = useRef();
  const emailRef = useRef();
  const passwordRef = useRef();

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = {
      username: usernameRef.current.value,
      email: emailRef.current.value,
      password: passwordRef.current.value,
    };

    console.log("Form submitted:", formData);

    // Reset form
    formRef.current.reset();
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <input ref={usernameRef} type="text" name="username" placeholder="Username" defaultValue="" />

      <input ref={emailRef} type="email" name="email" placeholder="Email" defaultValue="" />

      <input ref={passwordRef} type="password" name="password" placeholder="Password" defaultValue="" />

      <button type="submit">Register</button>
    </form>
  );
}

// Hybrid approach - Controlled component with uncontrolled file input
function ProfileForm() {
  const [profile, setProfile] = useState({ name: "", bio: "" });
  const fileInputRef = useRef();

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", profile.name);
    formData.append("bio", profile.bio);

    // File input is uncontrolled
    const file = fileInputRef.current.files[0];
    if (file) {
      formData.append("avatar", file);
    }

    // Submit to API
    submitProfile(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" value={profile.name} onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))} placeholder="Name" />

      <textarea value={profile.bio} onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))} placeholder="Bio" />

      <input ref={fileInputRef} type="file" accept="image/*" name="avatar" />

      <button type="submit">Update Profile</button>
    </form>
  );
}
```

**📊 Controlled vs Uncontrolled Trade-offs:**

| Aspect            | Controlled                     | Uncontrolled              |
| ----------------- | ------------------------------ | ------------------------- |
| **Performance**   | Can be slower with many inputs | Faster, no re-renders     |
| **Validation**    | Real-time validation           | Validation on submit only |
| **Complex Logic** | Easier to implement            | Limited capabilities      |
| **Testing**       | Easier to test                 | Harder to test            |
| **Accessibility** | Better control over state      | Standard browser behavior |

---

## Styling Strategies

Modern React applications have several styling approaches, each with specific use cases and trade-offs.

### 1. CSS-in-JS with Styled-Components

CSS-in-JS allows you to write CSS directly in your JavaScript with benefits like dynamic styling and automatic vendor prefixing.

```jsx
import styled, { createGlobalStyle, ThemeProvider } from "styled-components";

// Global styles
const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: ${(props) => props.theme.fonts.primary};
    background-color: ${(props) => props.theme.colors.background};
    color: ${(props) => props.theme.colors.text};
  }
`;

// Theme object
const theme = {
  colors: {
    primary: "#007bff",
    secondary: "#6c757d",
    success: "#28a745",
    danger: "#dc3545",
    warning: "#ffc107",
    info: "#17a2b8",
    light: "#f8f9fa",
    dark: "#343a40",
    background: "#ffffff",
    text: "#212529",
  },
  fonts: {
    primary: "'Helvetica Neue', Arial, sans-serif",
    monospace: "'Courier New', monospace",
  },
  breakpoints: {
    mobile: "480px",
    tablet: "768px",
    desktop: "1024px",
    wide: "1200px",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "3rem",
  },
};

// Basic styled components
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${(props) => props.theme.spacing.md};

  @media (max-width: ${(props) => props.theme.breakpoints.tablet}) {
    padding: ${(props) => props.theme.spacing.sm};
  }
`;

const Button = styled.button`
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;

  ${(props) => {
    switch (props.variant) {
      case "primary":
        return `
          background-color: ${props.theme.colors.primary};
          color: white;
          &:hover {
            background-color: #0056b3;
          }
        `;
      case "secondary":
        return `
          background-color: ${props.theme.colors.secondary};
          color: white;
          &:hover {
            background-color: #545b62;
          }
        `;
      case "outline":
        return `
          background-color: transparent;
          color: ${props.theme.colors.primary};
          border: 2px solid ${props.theme.colors.primary};
          &:hover {
            background-color: ${props.theme.colors.primary};
            color: white;
          }
        `;
      default:
        return `
          background-color: ${props.theme.colors.light};
          color: ${props.theme.colors.dark};
          &:hover {
            background-color: #e2e6ea;
          }
        `;
    }
  }}

  ${(props) =>
    props.size === "large" &&
    `
    padding: ${props.theme.spacing.md} ${props.theme.spacing.lg};
    font-size: 1.25rem;
  `}
  
  ${(props) =>
    props.disabled &&
    `
    opacity: 0.6;
    cursor: not-allowed;
    &:hover {
      background-color: ${props.theme.colors.light};
    }
  `}
`;

// Complex styled component with animations
const Card = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: ${(props) => props.theme.spacing.lg};
  margin-bottom: ${(props) => props.theme.spacing.md};
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  ${(props) =>
    props.highlighted &&
    `
    border-left: 4px solid ${props.theme.colors.primary};
  `}
`;

const FlexContainer = styled.div`
  display: flex;
  flex-direction: ${(props) => props.direction || "row"};
  justify-content: ${(props) => props.justify || "flex-start"};
  align-items: ${(props) => props.align || "stretch"};
  gap: ${(props) => props.gap || props.theme.spacing.md};
  flex-wrap: ${(props) => (props.wrap ? "wrap" : "nowrap")};

  @media (max-width: ${(props) => props.theme.breakpoints.tablet}) {
    flex-direction: column;
  }
`;

// Form components
const FormGroup = styled.div`
  margin-bottom: ${(props) => props.theme.spacing.md};
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${(props) => props.theme.spacing.xs};
  font-weight: 600;
  color: ${(props) => props.theme.colors.dark};
`;

const Input = styled.input`
  width: 100%;
  padding: ${(props) => props.theme.spacing.sm};
  border: 2px solid #e1e5e9;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.colors.primary};
  }

  &:invalid {
    border-color: ${(props) => props.theme.colors.danger};
  }

  ${(props) =>
    props.error &&
    `
    border-color: ${props.theme.colors.danger};
  `}
`;

const ErrorMessage = styled.span`
  color: ${(props) => props.theme.colors.danger};
  font-size: 0.875rem;
  margin-top: ${(props) => props.theme.spacing.xs};
  display: block;
`;

// Usage in components
function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <Container>
        <Header />
        <MainContent />
      </Container>
    </ThemeProvider>
  );
}

function ContactForm() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState({});

  return (
    <Card>
      <h2>Contact Us</h2>
      <form>
        <FormGroup>
          <Label htmlFor="name">Name</Label>
          <Input id="name" type="text" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} error={!!errors.name} />
          {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} error={!!errors.email} />
          {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
        </FormGroup>

        <FlexContainer justify="flex-end" gap="1rem">
          <Button variant="outline">Cancel</Button>
          <Button variant="primary">Send Message</Button>
        </FlexContainer>
      </form>
    </Card>
  );
}
```

### 2. Tailwind CSS - Utility-First Approach

Tailwind CSS provides low-level utility classes to build custom designs without writing CSS.

```jsx
// Tailwind component examples
function TailwindButton({ variant = "primary", size = "md", children, ...props }) {
  const baseClasses = "font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500",
    success: "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white focus:ring-blue-500",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`;

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

function ProductCard({ product }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="relative">
        <img src={product.image} alt={product.name} className="w-full h-48 object-cover" />
        {product.discount && <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-sm font-semibold">-{product.discount}%</div>}
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-gray-900">${product.price}</span>
            {product.originalPrice && <span className="text-lg text-gray-500 line-through">${product.originalPrice}</span>}
          </div>

          <div className="flex items-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className={`w-4 h-4 ${i < product.rating ? "text-yellow-400" : "text-gray-300"}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="text-sm text-gray-600 ml-1">({product.reviews})</span>
          </div>
        </div>

        <div className="mt-4 flex space-x-2">
          <TailwindButton variant="primary" size="sm" className="flex-1">
            Add to Cart
          </TailwindButton>
          <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Responsive navigation with Tailwind
function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img className="h-8 w-8" src="/logo.svg" alt="Logo" />
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a href="/" className="text-gray-900 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Home
                </a>
                <a href="/products" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Products
                </a>
                <a href="/about" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  About
                </a>
                <a href="/contact" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Contact
                </a>
              </div>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              <button className="p-1 rounded-full text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5M15 17V7a1 1 0 011-1h4" />
                </svg>
              </button>
            </div>
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                {isOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <a href="/" className="text-gray-900 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">
              Home
            </a>
            <a href="/products" className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">
              Products
            </a>
            <a href="/about" className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">
              About
            </a>
            <a href="/contact" className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">
              Contact
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

// Custom Tailwind components with @apply directive
// In your CSS file:
/*
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .btn {
    @apply font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2;
  }
  
  .btn-primary {
    @apply bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500;
  }
  
  .btn-secondary {
    @apply bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-md p-6;
  }
  
  .input {
    @apply w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
  }
}
*/
```

**📊 Styling Strategy Comparison:**

| Approach         | Pros                                               | Cons                                        | Best For                                 |
| ---------------- | -------------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| **CSS-in-JS**    | Dynamic styling, component-scoped, theme support   | Runtime overhead, learning curve            | Complex applications, design systems     |
| **Tailwind CSS** | Fast development, consistent spacing, small bundle | HTML gets verbose, learning utility classes | Rapid prototyping, utility-based designs |
| **CSS Modules**  | Scoped styles, familiar CSS syntax                 | Build setup required, no dynamic styling    | Traditional CSS approach with scoping    |
| **Vanilla CSS**  | No dependencies, familiar, fast                    | Global scope issues, maintenance challenges | Simple projects, legacy codebases        |

---

## React Router Advanced

React Router enables client-side routing for single-page applications with sophisticated features for navigation and data loading.

### Advanced Routing Patterns

```jsx
import { createBrowserRouter, RouterProvider, Route, createRoutesFromElements, Outlet, Navigate, useNavigate, useLocation, useParams, useSearchParams, useLoaderData, Form, redirect, defer } from "react-router-dom";

// Route configuration with data loading
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<RootLayout />} errorElement={<ErrorPage />}>
      <Route index element={<HomePage />} />

      {/* Protected routes */}
      <Route element={<AuthGuard />}>
        <Route path="dashboard" element={<Dashboard />} loader={dashboardLoader} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Products with nested routes */}
      <Route path="products" element={<ProductsLayout />}>
        <Route index element={<ProductsList />} loader={productsLoader} />
        <Route path=":productId" element={<ProductDetail />} loader={productLoader} action={productAction} />
        <Route path="create" element={<CreateProduct />} />
        <Route path=":productId/edit" element={<EditProduct />} loader={productLoader} action={editProductAction} />
      </Route>

      {/* Admin routes with role-based access */}
      <Route element={<AdminGuard />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>
      </Route>

      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Route>
  )
);

// Root layout component
function RootLayout() {
  return (
    <div className="app">
      <Navigation />
      <main>
        <Outlet /> {/* Child routes render here */}
      </main>
      <Footer />
    </div>
  );
}

// Authentication guard
function AuthGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    // Redirect to login with return path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

// Role-based guard
function AdminGuard() {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

// Data loaders
async function dashboardLoader() {
  const [analytics, recentActivity] = await Promise.all([fetch("/api/analytics").then((res) => res.json()), fetch("/api/recent-activity").then((res) => res.json())]);

  return { analytics, recentActivity };
}

async function productsLoader({ request }) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const category = url.searchParams.get("category") || "";
  const page = url.searchParams.get("page") || "1";

  const products = await fetch(`/api/products?search=${search}&category=${category}&page=${page}`).then((res) => res.json());

  return { products, search, category, page };
}

async function productLoader({ params }) {
  const product = await fetch(`/api/products/${params.productId}`).then((res) => {
    if (!res.ok) throw new Response("Product not found", { status: 404 });
    return res.json();
  });

  // Defer related products for faster initial load
  const relatedProducts = fetch(`/api/products/${params.productId}/related`).then((res) => res.json());

  return defer({
    product,
    relatedProducts,
  });
}

// Action handlers
async function productAction({ request, params }) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  switch (intent) {
    case "add-to-cart":
      await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: params.productId,
          quantity: formData.get("quantity"),
        }),
      });
      return { success: true, message: "Added to cart!" };

    case "add-review":
      await fetch(`/api/products/${params.productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: formData.get("rating"),
          comment: formData.get("comment"),
        }),
      });
      return redirect(`/products/${params.productId}`);

    default:
      throw new Response("Invalid action", { status: 400 });
  }
}

// Component using router features
function ProductsList() {
  const { products, search, category, page } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleSearch = (newSearch) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (newSearch) {
        params.set("search", newSearch);
      } else {
        params.delete("search");
      }
      params.delete("page"); // Reset to first page
      return params;
    });
  };

  const handleCategoryFilter = (newCategory) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (newCategory) {
        params.set("category", newCategory);
      } else {
        params.delete("category");
      }
      params.delete("page");
      return params;
    });
  };

  const handlePageChange = (newPage) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", newPage.toString());
      return params;
    });
  };

  return (
    <div className="products-list">
      <div className="filters">
        <input type="text" placeholder="Search products..." value={search} onChange={(e) => handleSearch(e.target.value)} />

        <select value={category} onChange={(e) => handleCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
          <option value="books">Books</option>
        </select>
      </div>

      <div className="products-grid">
        {products.items.map((product) => (
          <ProductCard key={product.id} product={product} onClick={() => navigate(`/products/${product.id}`)} />
        ))}
      </div>

      <Pagination currentPage={parseInt(page)} totalPages={products.totalPages} onPageChange={handlePageChange} />
    </div>
  );
}

function ProductDetail() {
  const { product, relatedProducts } = useLoaderData();
  const navigate = useNavigate();

  return (
    <div className="product-detail">
      <button onClick={() => navigate(-1)}>← Back</button>

      <div className="product-info">
        <img src={product.image} alt={product.name} />
        <div>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <p className="price">${product.price}</p>

          <Form method="post" className="add-to-cart-form">
            <input type="hidden" name="intent" value="add-to-cart" />
            <input type="number" name="quantity" defaultValue="1" min="1" max={product.stock} />
            <button type="submit">Add to Cart</button>
          </Form>
        </div>
      </div>

      <div className="reviews-section">
        <h2>Reviews</h2>
        <Form method="post" className="review-form">
          <input type="hidden" name="intent" value="add-review" />
          <select name="rating" required>
            <option value="">Rate this product</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
          <textarea name="comment" placeholder="Write your review..." required />
          <button type="submit">Submit Review</button>
        </Form>

        <div className="reviews">
          {product.reviews.map((review) => (
            <div key={review.id} className="review">
              <div className="rating">{"★".repeat(review.rating)}</div>
              <p>{review.comment}</p>
              <small>
                By {review.author} on {review.date}
              </small>
            </div>
          ))}
        </div>
      </div>

      <Suspense fallback={<div>Loading related products...</div>}>
        <Await resolve={relatedProducts}>
          {(products) => (
            <div className="related-products">
              <h2>Related Products</h2>
              <div className="products-grid">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </Await>
      </Suspense>
    </div>
  );
}

// Navigation with active states
function Navigation() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <nav className="navigation">
      <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>
        Home
      </NavLink>
      <NavLink to="/products" className={({ isActive }) => (isActive ? "active" : "")}>
        Products
      </NavLink>

      {user ? (
        <>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
            Dashboard
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => (isActive ? "active" : "")}>
            Profile
          </NavLink>
          {user.role === "admin" && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? "active" : "")}>
              Admin
            </NavLink>
          )}
        </>
      ) : (
        <NavLink to="/login" state={{ from: location }}>
          Login
        </NavLink>
      )}
    </nav>
  );
}

// App component
function App() {
  return <RouterProvider router={router} />;
}
```

**📚 Real-World Routing Examples:**

1. **E-commerce**: Product catalogs, user accounts, checkout flows
2. **Social Media**: Feeds, profiles, messages, settings
3. **SaaS Dashboards**: Multi-tenant applications with role-based access
4. **Content Management**: Article editing, media libraries, user management
5. **Learning Platforms**: Courses, lessons, progress tracking
6. **Project Management**: Projects, tasks, team collaboration
7. **Financial Apps**: Account management, transactions, reporting

---

## Design Systems

Building a consistent design system ensures scalability and maintainability across large applications.

### Complete Design System Implementation

```jsx
// Design tokens
export const tokens = {
  colors: {
    // Brand colors
    brand: {
      primary: "#007bff",
      secondary: "#6c757d",
      accent: "#17a2b8",
    },

    // Semantic colors
    semantic: {
      success: "#28a745",
      warning: "#ffc107",
      error: "#dc3545",
      info: "#17a2b8",
    },

    // Neutral colors
    neutral: {
      0: "#ffffff",
      100: "#f8f9fa",
      200: "#e9ecef",
      300: "#dee2e6",
      400: "#ced4da",
      500: "#adb5bd",
      600: "#6c757d",
      700: "#495057",
      800: "#343a40",
      900: "#212529",
    },
  },

  typography: {
    fontFamilies: {
      primary: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      mono: "'JetBrains Mono', 'Courier New', monospace",
    },
    fontSizes: {
      xs: "0.75rem", // 12px
      sm: "0.875rem", // 14px
      base: "1rem", // 16px
      lg: "1.125rem", // 18px
      xl: "1.25rem", // 20px
      "2xl": "1.5rem", // 24px
      "3xl": "1.875rem", // 30px
      "4xl": "2.25rem", // 36px
    },
    fontWeights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  spacing: {
    0: "0",
    1: "0.25rem", // 4px
    2: "0.5rem", // 8px
    3: "0.75rem", // 12px
    4: "1rem", // 16px
    5: "1.25rem", // 20px
    6: "1.5rem", // 24px
    8: "2rem", // 32px
    10: "2.5rem", // 40px
    12: "3rem", // 48px
    16: "4rem", // 64px
  },

  borderRadius: {
    none: "0",
    sm: "0.125rem",
    base: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    full: "9999px",
  },

  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  },

  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },
};

// Base component system
import styled from "styled-components";

// Box component - fundamental layout primitive
const Box = styled.div`
  ${(props) => props.p && `padding: ${tokens.spacing[props.p]};`}
  ${(props) => props.px && `padding-left: ${tokens.spacing[props.px]}; padding-right: ${tokens.spacing[props.px]};`}
  ${(props) => props.py && `padding-top: ${tokens.spacing[props.py]}; padding-bottom: ${tokens.spacing[props.py]};`}
  ${(props) => props.m && `margin: ${tokens.spacing[props.m]};`}
  ${(props) => props.mx && `margin-left: ${tokens.spacing[props.mx]}; margin-right: ${tokens.spacing[props.mx]};`}
  ${(props) => props.my && `margin-top: ${tokens.spacing[props.my]}; margin-bottom: ${tokens.spacing[props.my]};`}
  ${(props) => props.bg && `background-color: ${props.bg};`}
  ${(props) => props.color && `color: ${props.color};`}
  ${(props) => props.rounded && `border-radius: ${tokens.borderRadius[props.rounded]};`}
  ${(props) => props.shadow && `box-shadow: ${tokens.shadows[props.shadow]};`}
`;

// Typography components
const Text = styled(Box).attrs({ as: "span" })`
  font-family: ${tokens.typography.fontFamilies.primary};
  font-size: ${(props) => tokens.typography.fontSizes[props.size] || tokens.typography.fontSizes.base};
  font-weight: ${(props) => tokens.typography.fontWeights[props.weight] || tokens.typography.fontWeights.normal};
  line-height: ${(props) => tokens.typography.lineHeights[props.leading] || tokens.typography.lineHeights.normal};
`;

const Heading = styled(Text)`
  font-weight: ${tokens.typography.fontWeights.semibold};
  line-height: ${tokens.typography.lineHeights.tight};
`;

// Button component with variants
const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${tokens.spacing[2]};
  padding: ${(props) => {
    switch (props.size) {
      case "sm":
        return `${tokens.spacing[2]} ${tokens.spacing[3]}`;
      case "lg":
        return `${tokens.spacing[4]} ${tokens.spacing[6]}`;
      default:
        return `${tokens.spacing[3]} ${tokens.spacing[4]}`;
    }
  }};
  font-family: ${tokens.typography.fontFamilies.primary};
  font-size: ${(props) => {
    switch (props.size) {
      case "sm":
        return tokens.typography.fontSizes.sm;
      case "lg":
        return tokens.typography.fontSizes.lg;
      default:
        return tokens.typography.fontSizes.base;
    }
  }};
  font-weight: ${tokens.typography.fontWeights.medium};
  border: none;
  border-radius: ${tokens.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${tokens.colors.brand.primary}40;
  }

  ${(props) => {
    switch (props.variant) {
      case "primary":
        return `
          background-color: ${tokens.colors.brand.primary};
          color: ${tokens.colors.neutral[0]};
          &:hover:not(:disabled) {
            background-color: #0056b3;
          }
        `;
      case "secondary":
        return `
          background-color: ${tokens.colors.neutral[200]};
          color: ${tokens.colors.neutral[800]};
          &:hover:not(:disabled) {
            background-color: ${tokens.colors.neutral[300]};
          }
        `;
      case "outline":
        return `
          background-color: transparent;
          color: ${tokens.colors.brand.primary};
          border: 2px solid ${tokens.colors.brand.primary};
          &:hover:not(:disabled) {
            background-color: ${tokens.colors.brand.primary};
            color: ${tokens.colors.neutral[0]};
          }
        `;
      case "ghost":
        return `
          background-color: transparent;
          color: ${tokens.colors.neutral[700]};
          &:hover:not(:disabled) {
            background-color: ${tokens.colors.neutral[100]};
          }
        `;
      default:
        return "";
    }
  }}
`;

// Input component
const Input = styled.input`
  width: 100%;
  padding: ${tokens.spacing[3]};
  font-family: ${tokens.typography.fontFamilies.primary};
  font-size: ${tokens.typography.fontSizes.base};
  border: 2px solid ${tokens.colors.neutral[300]};
  border-radius: ${tokens.borderRadius.md};
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${tokens.colors.brand.primary};
  }

  &:invalid {
    border-color: ${tokens.colors.semantic.error};
  }

  &::placeholder {
    color: ${tokens.colors.neutral[500]};
  }

  ${(props) =>
    props.error &&
    `
    border-color: ${tokens.colors.semantic.error};
  `}
`;

// Card component
const Card = styled(Box)`
  background-color: ${tokens.colors.neutral[0]};
  border-radius: ${tokens.borderRadius.lg};
  box-shadow: ${tokens.shadows.base};
  overflow: hidden;

  ${(props) =>
    props.hover &&
    `
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    &:hover {
      transform: translateY(-2px);
      box-shadow: ${tokens.shadows.lg};
    }
  `}
`;

// Stack component for consistent spacing
const Stack = styled(Box)`
  display: flex;
  flex-direction: ${(props) => props.direction || "column"};
  gap: ${(props) => tokens.spacing[props.spacing] || tokens.spacing[4]};
  align-items: ${(props) => props.align || "stretch"};
  justify-content: ${(props) => props.justify || "flex-start"};
`;

// Grid component
const Grid = styled(Box)`
  display: grid;
  grid-template-columns: repeat(${(props) => props.cols || "auto-fit"}, ${(props) => (props.cols ? "1fr" : "minmax(250px, 1fr)")});
  gap: ${(props) => tokens.spacing[props.gap] || tokens.spacing[4]};
`;

// Complex component using the design system
function ProductCard({ product, onAddToCart, onViewDetails }) {
  return (
    <Card hover p={4}>
      <Stack spacing={3}>
        <Box
          style={{
            height: "200px",
            backgroundColor: tokens.colors.neutral[100],
            borderRadius: tokens.borderRadius.md,
            backgroundImage: `url(${product.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        <Stack spacing={2}>
          <Heading as="h3" size="lg" color={tokens.colors.neutral[900]}>
            {product.name}
          </Heading>

          <Text size="sm" color={tokens.colors.neutral[600]} leading="relaxed">
            {product.description}
          </Text>

          <Stack direction="row" align="center" justify="space-between">
            <Heading as="span" size="xl" color={tokens.colors.brand.primary}>
              ${product.price}
            </Heading>

            {product.originalPrice && product.originalPrice > product.price && (
              <Text size="sm" color={tokens.colors.neutral[500]} style={{ textDecoration: "line-through" }}>
                ${product.originalPrice}
              </Text>
            )}
          </Stack>

          <Stack direction="row" spacing={2}>
            <Button variant="primary" size="sm" onClick={() => onAddToCart(product)}>
              Add to Cart
            </Button>
            <Button variant="outline" size="sm" onClick={() => onViewDetails(product)}>
              View Details
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}

// Form components using the design system
function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState({});

  return (
    <Card p={6} mx="auto" style={{ maxWidth: "500px" }}>
      <Stack spacing={4}>
        <Heading as="h2" size="2xl" color={tokens.colors.neutral[900]}>
          Contact Us
        </Heading>

        <Stack spacing={3}>
          <Box>
            <Text as="label" size="sm" weight="medium" color={tokens.colors.neutral[700]} style={{ display: "block", marginBottom: tokens.spacing[1] }}>
              Name
            </Text>
            <Input type="text" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} error={!!errors.name} placeholder="Your full name" />
            {errors.name && (
              <Text size="sm" color={tokens.colors.semantic.error} style={{ marginTop: tokens.spacing[1] }}>
                {errors.name}
              </Text>
            )}
          </Box>

          <Box>
            <Text as="label" size="sm" weight="medium" color={tokens.colors.neutral[700]} style={{ display: "block", marginBottom: tokens.spacing[1] }}>
              Email
            </Text>
            <Input type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} error={!!errors.email} placeholder="your@email.com" />
            {errors.email && (
              <Text size="sm" color={tokens.colors.semantic.error} style={{ marginTop: tokens.spacing[1] }}>
                {errors.email}
              </Text>
            )}
          </Box>

          <Box>
            <Text as="label" size="sm" weight="medium" color={tokens.colors.neutral[700]} style={{ display: "block", marginBottom: tokens.spacing[1] }}>
              Message
            </Text>
            <Input as="textarea" rows={4} value={formData.message} onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))} error={!!errors.message} placeholder="Your message..." style={{ resize: "vertical" }} />
            {errors.message && (
              <Text size="sm" color={tokens.colors.semantic.error} style={{ marginTop: tokens.spacing[1] }}>
                {errors.message}
              </Text>
            )}
          </Box>
        </Stack>

        <Stack direction="row" justify="flex-end" spacing={2}>
          <Button variant="ghost">Cancel</Button>
          <Button variant="primary">Send Message</Button>
        </Stack>
      </Stack>
    </Card>
  );
}
```

---

## Enterprise Architecture

Building scalable React applications for large teams requires thoughtful architecture and organization patterns.

### Feature-Based Architecture

```bash
# Recommended folder structure for large applications
src/
├── app/                    # App-level configuration
│   ├── store/             # Global state management
│   ├── router/            # Route configuration
│   └── providers/         # Context providers
├── shared/                # Shared utilities and components
│   ├── components/        # Reusable UI components
│   ├── hooks/             # Custom hooks
│   ├── utils/             # Utility functions
│   ├── constants/         # App constants
│   └── types/             # TypeScript types
├── features/              # Feature-based modules
│   ├── authentication/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   └── index.ts
│   ├── products/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   └── index.ts
│   └── dashboard/
├── assets/                # Static assets
├── styles/                # Global styles
└── main.tsx
```

### Feature Module Example

```jsx
// features/products/index.ts - Public API
export { ProductsList } from './components/ProductsList';
export { ProductDetail } from './components/ProductDetail';
export { useProducts } from './hooks/useProducts';
export { useProduct } from './hooks/useProduct';
export { productsService } from './services/productsService';

// features/products/services/productsService.ts
class ProductsService {
  private baseURL = '/api/products';

  async getProducts(params = {}) {
    const searchParams = new URLSearchParams(params);
    const response = await fetch(`${this.baseURL}?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  }

  async getProduct(id) {
    const response = await fetch(`${this.baseURL}/${id}`);
    if (!response.ok) throw new Error('Failed to fetch product');
    return response.json();
  }

  async createProduct(productData) {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    if (!response.ok) throw new Error('Failed to create product');
    return response.json();
  }

  async updateProduct(id, updates) {
    const response = await fetch(`${this.baseURL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update product');
    return response.json();
  }

  async deleteProduct(id) {
    const response = await fetch(`${this.baseURL}/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete product');
  }
}

export const productsService = new ProductsService();

// features/products/hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { productsService } from '../services/productsService';

export function useProducts(filters = {}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsService.getProducts(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// features/products/store/productsSlice.ts (if using Redux)
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productsService } from '../services/productsService';

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (filters) => {
    return await productsService.getProducts(filters);
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    loading: false,
    error: null,
    filters: {}
  },
  reducers: {
    setFilters: (state, action) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export const { setFilters, clearFilters } = productsSlice.actions;
export default productsSlice.reducer;
```

### Micro-Frontend Architecture

For very large applications, consider micro-frontend architecture:

```jsx
// Module Federation setup (webpack.config.js)
const ModuleFederationPlugin = require("@module-federation/webpack");

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: "shell",
      remotes: {
        products: "products@http://localhost:3001/remoteEntry.js",
        orders: "orders@http://localhost:3002/remoteEntry.js",
        auth: "auth@http://localhost:3003/remoteEntry.js",
      },
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
      },
    }),
  ],
};

// Shell application
import React, { Suspense } from "react";

const ProductsApp = React.lazy(() => import("products/App"));
const OrdersApp = React.lazy(() => import("orders/App"));
const AuthApp = React.lazy(() => import("auth/App"));

function App() {
  return (
    <Router>
      <Navigation />
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/products/*" element={<ProductsApp />} />
          <Route path="/orders/*" element={<OrdersApp />} />
          <Route path="/auth/*" element={<AuthApp />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
```

## Summary & Next Steps

You've now mastered component design and architecture! Here's what you should be comfortable with:

✅ **Component Patterns**: HOCs, render props, compound components  
✅ **Styling Strategies**: CSS-in-JS, Tailwind CSS, design systems  
✅ **Advanced Routing**: Data loading, authentication, nested routes  
✅ **Design Systems**: Consistent, scalable component libraries  
✅ **Enterprise Architecture**: Feature-based organization, micro-frontends

**🎯 Key Takeaways:**

- Choose component patterns based on reusability needs
- Implement consistent styling with design systems
- Use advanced routing features for better user experience
- Organize large applications with feature-based architecture
- Consider micro-frontends for very large, multi-team projects

**📈 Next Steps:**
Ready to optimize your applications for maximum performance? Continue with [Performance Optimization](./04-performance-optimization.md) to learn about memoization, code splitting, and advanced optimization techniques.

---

_💡 Pro Tip: Start with simple patterns and gradually introduce more sophisticated architecture as your application grows in complexity and team size._
