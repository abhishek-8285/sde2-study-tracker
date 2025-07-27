# Testing Strategies 🧪

Master comprehensive testing approaches to build reliable, maintainable React applications with confidence in every release.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Unit Testing with Jest & RTL](#unit-testing-with-jest--rtl)
- [Integration Testing](#integration-testing)
- [API Mocking with MSW](#api-mocking-with-msw)
- [E2E Testing](#e2e-testing)

---

## Testing Philosophy

### The Testing Pyramid

```
     /\
    /  \    E2E Tests (Few)
   /____\   - Full user journeys
  /      \  - Browser automation
 /        \ - Slow but comprehensive
/__________\
Integration   Unit Tests (Many)
Tests (Some)  - Component behavior
- API + UI    - Business logic
- User flows  - Fast feedback
```

### Core Principles

1. **Test Behavior, Not Implementation**: Focus on what the user sees and does
2. **Write Tests That Give Confidence**: Tests should catch real bugs
3. **Maintainable Tests**: Easy to understand and update
4. **Fast Feedback Loop**: Quick test execution for rapid development

---

## Unit Testing with Jest & RTL

### 1. Component Testing Fundamentals

```jsx
// components/Button.jsx
import React from "react";

export function Button({ children, variant = "primary", size = "medium", disabled = false, loading = false, onClick, ...props }) {
  const handleClick = (e) => {
    if (disabled || loading) return;
    onClick?.(e);
  };

  return (
    <button className={`btn btn-${variant} btn-${size} ${disabled ? "disabled" : ""} ${loading ? "loading" : ""}`} onClick={handleClick} disabled={disabled || loading} aria-busy={loading} {...props}>
      {loading ? <span className="spinner" aria-label="Loading..." /> : children}
    </button>
  );
}

// __tests__/Button.test.jsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../Button";

describe("Button Component", () => {
  test("renders button with text", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  test("applies correct CSS classes based on props", () => {
    render(
      <Button variant="secondary" size="large">
        Test
      </Button>
    );

    const button = screen.getByRole("button");
    expect(button).toHaveClass("btn", "btn-secondary", "btn-large");
  });

  test("calls onClick handler when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test("does not call onClick when disabled", async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(
      <Button onClick={handleClick} disabled>
        Click me
      </Button>
    );

    const button = screen.getByRole("button");
    await user.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  test("shows loading state", () => {
    render(<Button loading>Click me</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });

  test("is accessible with keyboard navigation", async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole("button");
    button.focus();

    expect(button).toHaveFocus();

    await user.keyboard("[Enter]");
    expect(handleClick).toHaveBeenCalledTimes(1);

    await user.keyboard("[Space]");
    expect(handleClick).toHaveBeenCalledTimes(2);
  });
});
```

### 2. Form Testing

```jsx
// components/ContactForm.jsx
import React, { useState } from "react";

export function ContactForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    } else if (formData.message.length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-group">
        <label htmlFor="name">Name *</label>
        <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
        {errors.name && (
          <div id="name-error" role="alert" className="error">
            {errors.name}
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="email">Email *</label>
        <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
        {errors.email && (
          <div id="email-error" role="alert" className="error">
            {errors.email}
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="message">Message *</label>
        <textarea id="message" name="message" value={formData.message} onChange={handleChange} rows={4} aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-error" : undefined} />
        {errors.message && (
          <div id="message-error" role="alert" className="error">
            {errors.message}
          </div>
        )}
      </div>

      {errors.submit && (
        <div role="alert" className="error submit-error">
          {errors.submit}
        </div>
      )}

      <div className="form-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send Message"}
        </button>
      </div>
    </form>
  );
}

// __tests__/ContactForm.test.jsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactForm } from "../ContactForm";

describe("ContactForm", () => {
  const mockSubmit = jest.fn();
  const mockCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders all form fields", () => {
    render(<ContactForm onSubmit={mockSubmit} onCancel={mockCancel} />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  test("shows validation errors for empty required fields", async () => {
    const user = userEvent.setup();
    render(<ContactForm onSubmit={mockSubmit} onCancel={mockCancel} />);

    const submitButton = screen.getByRole("button", { name: /send message/i });
    await user.click(submitButton);

    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Message is required")).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  test("shows email validation error for invalid email", async () => {
    const user = userEvent.setup();
    render(<ContactForm onSubmit={mockSubmit} onCancel={mockCancel} />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, "invalid-email");

    const submitButton = screen.getByRole("button", { name: /send message/i });
    await user.click(submitButton);

    expect(screen.getByText("Email is invalid")).toBeInTheDocument();
  });

  test("shows message validation error for short message", async () => {
    const user = userEvent.setup();
    render(<ContactForm onSubmit={mockSubmit} onCancel={mockCancel} />);

    const messageInput = screen.getByLabelText(/message/i);
    await user.type(messageInput, "short");

    const submitButton = screen.getByRole("button", { name: /send message/i });
    await user.click(submitButton);

    expect(screen.getByText("Message must be at least 10 characters")).toBeInTheDocument();
  });

  test("clears validation errors when user starts typing", async () => {
    const user = userEvent.setup();
    render(<ContactForm onSubmit={mockSubmit} onCancel={mockCancel} />);

    // First trigger validation errors
    const submitButton = screen.getByRole("button", { name: /send message/i });
    await user.click(submitButton);

    expect(screen.getByText("Name is required")).toBeInTheDocument();

    // Then start typing in name field
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, "John");

    expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
  });

  test("submits form with valid data", async () => {
    const user = userEvent.setup();
    mockSubmit.mockResolvedValue();

    render(<ContactForm onSubmit={mockSubmit} onCancel={mockCancel} />);

    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(screen.getByLabelText(/message/i), "This is a test message");

    const submitButton = screen.getByRole("button", { name: /send message/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        name: "John Doe",
        email: "john@example.com",
        message: "This is a test message",
      });
    });
  });

  test("shows loading state during submission", async () => {
    const user = userEvent.setup();
    let resolveSubmit;
    mockSubmit.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        })
    );

    render(<ContactForm onSubmit={mockSubmit} onCancel={mockCancel} />);

    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(screen.getByLabelText(/message/i), "This is a test message");

    const submitButton = screen.getByRole("button", { name: /send message/i });
    await user.click(submitButton);

    expect(screen.getByRole("button", { name: /sending/i })).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    resolveSubmit();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
    });
  });

  test("handles submission errors", async () => {
    const user = userEvent.setup();
    mockSubmit.mockRejectedValue(new Error("Network error"));

    render(<ContactForm onSubmit={mockSubmit} onCancel={mockCancel} />);

    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(screen.getByLabelText(/message/i), "This is a test message");

    const submitButton = screen.getByRole("button", { name: /send message/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  test("calls onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<ContactForm onSubmit={mockSubmit} onCancel={mockCancel} />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockCancel).toHaveBeenCalled();
  });
});
```

### 3. Custom Hook Testing

```jsx
// hooks/useLocalStorage.js
import { useState, useEffect } from "react";

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setStoredValue = (value) => {
    try {
      setValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  const removeValue = () => {
    try {
      setValue(initialValue);
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  };

  return [value, setStoredValue, removeValue];
}

// __tests__/useLocalStorage.test.js
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "../useLocalStorage";

// Mock localStorage
const localStorageMock = (() => {
  let store = {};

  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test("returns initial value when localStorage is empty", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    expect(result.current[0]).toBe("initial");
  });

  test("returns value from localStorage if it exists", () => {
    localStorageMock.setItem("test-key", JSON.stringify("stored-value"));

    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    expect(result.current[0]).toBe("stored-value");
  });

  test("sets value in localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    act(() => {
      result.current[1]("new-value");
    });

    expect(result.current[0]).toBe("new-value");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("test-key", JSON.stringify("new-value"));
  });

  test("removes value from localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    act(() => {
      result.current[1]("stored-value");
    });

    expect(result.current[0]).toBe("stored-value");

    act(() => {
      result.current[2](); // removeValue
    });

    expect(result.current[0]).toBe("initial");
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("test-key");
  });

  test("handles JSON parsing errors gracefully", () => {
    localStorageMock.setItem("test-key", "invalid-json");

    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    expect(result.current[0]).toBe("initial");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test("works with complex objects", () => {
    const complexObject = {
      user: { name: "John", preferences: { theme: "dark" } },
      settings: { notifications: true },
    };

    const { result } = renderHook(() => useLocalStorage("complex-key", {}));

    act(() => {
      result.current[1](complexObject);
    });

    expect(result.current[0]).toEqual(complexObject);
    expect(localStorageMock.setItem).toHaveBeenCalledWith("complex-key", JSON.stringify(complexObject));
  });
});
```

---

## Integration Testing

### 1. Testing Component Integration

```jsx
// components/ProductSearch.jsx
import React, { useState, useEffect } from "react";
import { useDebounce } from "../hooks/useDebounce";

export function ProductSearch({ onResults, onLoading, onError }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    const searchProducts = async () => {
      if (!debouncedQuery.trim()) {
        onResults([]);
        return;
      }

      onLoading(true);
      onError(null);

      try {
        const params = new URLSearchParams({
          q: debouncedQuery,
          category: category === "all" ? "" : category,
        });

        const response = await fetch(`/api/products/search?${params}`);

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const results = await response.json();
        onResults(results);
      } catch (error) {
        onError(error.message);
        onResults([]);
      } finally {
        onLoading(false);
      }
    };

    searchProducts();
  }, [debouncedQuery, category, onResults, onLoading, onError]);

  return (
    <div className="product-search">
      <div className="search-controls">
        <input type="text" placeholder="Search products..." value={query} onChange={(e) => setQuery(e.target.value)} className="search-input" />

        <select value={category} onChange={(e) => setCategory(e.target.value)} className="category-filter">
          <option value="all">All Categories</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
          <option value="books">Books</option>
        </select>
      </div>
    </div>
  );
}

export function ProductList({ products, loading, error }) {
  if (loading) {
    return <div className="loading">Searching products...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (products.length === 0) {
    return <div className="no-results">No products found</div>;
  }

  return (
    <div className="product-list">
      {products.map((product) => (
        <div key={product.id} className="product-item">
          <img src={product.image} alt={product.name} />
          <h3>{product.name}</h3>
          <p>{product.description}</p>
          <span className="price">${product.price}</span>
        </div>
      ))}
    </div>
  );
}

export function ProductSearchPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  return (
    <div className="product-search-page">
      <h1>Search Products</h1>
      <ProductSearch onResults={setResults} onLoading={setLoading} onError={setError} />
      <ProductList products={results} loading={loading} error={error} />
    </div>
  );
}

// __tests__/ProductSearchIntegration.test.jsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductSearchPage } from "../ProductSearchPage";

// Mock fetch
global.fetch = jest.fn();

describe("Product Search Integration", () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test("performs search and displays results", async () => {
    const user = userEvent.setup();

    const mockProducts = [
      {
        id: 1,
        name: "Laptop",
        description: "Gaming laptop",
        price: 999,
        image: "/laptop.jpg",
      },
      {
        id: 2,
        name: "Mouse",
        description: "Wireless mouse",
        price: 29,
        image: "/mouse.jpg",
      },
    ];

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockProducts,
    });

    render(<ProductSearchPage />);

    const searchInput = screen.getByPlaceholderText(/search products/i);
    await user.type(searchInput, "laptop");

    // Wait for debounced search
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/products/search?q=laptop&category=");
    });

    // Check results are displayed
    await waitFor(() => {
      expect(screen.getByText("Laptop")).toBeInTheDocument();
      expect(screen.getByText("Gaming laptop")).toBeInTheDocument();
      expect(screen.getByText("$999")).toBeInTheDocument();
    });
  });

  test("shows loading state during search", async () => {
    const user = userEvent.setup();

    // Mock delayed response
    fetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => [],
              }),
            100
          )
        )
    );

    render(<ProductSearchPage />);

    const searchInput = screen.getByPlaceholderText(/search products/i);
    await user.type(searchInput, "test");

    await waitFor(() => {
      expect(screen.getByText("Searching products...")).toBeInTheDocument();
    });
  });

  test("handles search errors", async () => {
    const user = userEvent.setup();

    fetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<ProductSearchPage />);

    const searchInput = screen.getByPlaceholderText(/search products/i);
    await user.type(searchInput, "error");

    await waitFor(() => {
      expect(screen.getByText(/error: search failed/i)).toBeInTheDocument();
    });
  });

  test("filters by category", async () => {
    const user = userEvent.setup();

    fetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<ProductSearchPage />);

    const searchInput = screen.getByPlaceholderText(/search products/i);
    const categorySelect = screen.getByRole("combobox");

    await user.type(searchInput, "laptop");
    await user.selectOptions(categorySelect, "electronics");

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/products/search?q=laptop&category=electronics");
    });
  });

  test("shows no results message when search returns empty", async () => {
    const user = userEvent.setup();

    fetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<ProductSearchPage />);

    const searchInput = screen.getByPlaceholderText(/search products/i);
    await user.type(searchInput, "nonexistent");

    await waitFor(() => {
      expect(screen.getByText("No products found")).toBeInTheDocument();
    });
  });
});
```

---

## API Mocking with MSW

Mock Service Worker (MSW) provides powerful API mocking capabilities for testing.

### 1. MSW Setup

```js
// src/mocks/handlers.js
import { rest } from "msw";

export const handlers = [
  // Products API
  rest.get("/api/products", (req, res, ctx) => {
    const page = req.url.searchParams.get("page") || "1";
    const limit = req.url.searchParams.get("limit") || "10";

    const products = Array.from({ length: parseInt(limit) }, (_, i) => ({
      id: (parseInt(page) - 1) * parseInt(limit) + i + 1,
      name: `Product ${(parseInt(page) - 1) * parseInt(limit) + i + 1}`,
      description: `Description for product ${i + 1}`,
      price: Math.round(Math.random() * 1000),
      category: ["electronics", "clothing", "books"][i % 3],
      image: `/product-${i + 1}.jpg`,
    }));

    return res(
      ctx.status(200),
      ctx.json({
        products,
        totalPages: 10,
        currentPage: parseInt(page),
        totalItems: 100,
      })
    );
  }),

  rest.get("/api/products/search", (req, res, ctx) => {
    const query = req.url.searchParams.get("q");
    const category = req.url.searchParams.get("category");

    if (!query) {
      return res(ctx.status(200), ctx.json([]));
    }

    const products = [
      {
        id: 1,
        name: "Laptop Pro",
        description: "High-performance laptop",
        price: 1299,
        category: "electronics",
        image: "/laptop.jpg",
      },
      {
        id: 2,
        name: "Wireless Mouse",
        description: "Ergonomic wireless mouse",
        price: 49,
        category: "electronics",
        image: "/mouse.jpg",
      },
    ].filter((product) => {
      const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !category || product.category === category;
      return matchesQuery && matchesCategory;
    });

    return res(ctx.status(200), ctx.json(products));
  }),

  rest.get("/api/products/:id", (req, res, ctx) => {
    const { id } = req.params;

    if (id === "999") {
      return res(ctx.status(404), ctx.json({ error: "Product not found" }));
    }

    return res(
      ctx.status(200),
      ctx.json({
        id: parseInt(id),
        name: `Product ${id}`,
        description: `Detailed description for product ${id}`,
        price: Math.round(Math.random() * 1000),
        category: "electronics",
        image: `/product-${id}.jpg`,
        reviews: [
          {
            id: 1,
            author: "John Doe",
            rating: 5,
            comment: "Great product!",
            date: "2023-01-15",
          },
        ],
      })
    );
  }),

  // User authentication
  rest.post("/api/auth/login", (req, res, ctx) => {
    const { email, password } = req.body;

    if (email === "user@example.com" && password === "password") {
      return res(
        ctx.status(200),
        ctx.json({
          user: {
            id: 1,
            name: "John Doe",
            email: "user@example.com",
            role: "user",
          },
          token: "mock-jwt-token",
        })
      );
    }

    return res(ctx.status(401), ctx.json({ error: "Invalid credentials" }));
  }),

  // Error simulation
  rest.get("/api/error", (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ error: "Internal server error" }));
  }),

  // Slow response simulation
  rest.get("/api/slow", (req, res, ctx) => {
    return res(ctx.delay(2000), ctx.status(200), ctx.json({ message: "Slow response" }));
  }),
];

// src/mocks/server.js - For Node.js (tests)
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);

// src/mocks/browser.js - For browser (development)
import { setupWorker } from "msw";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);
```

### 2. Test Setup with MSW

```js
// src/setupTests.js
import "@testing-library/jest-dom";
import { server } from "./mocks/server";

// Enable MSW before all tests
beforeAll(() => server.listen());

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};
```

### 3. Testing with MSW

```jsx
// __tests__/ProductAPI.test.jsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { rest } from "msw";
import { server } from "../mocks/server";
import { ProductSearchPage } from "../components/ProductSearchPage";

describe("Product API Integration", () => {
  test("loads and displays products from API", async () => {
    render(<ProductSearchPage />);

    const searchInput = screen.getByPlaceholderText(/search products/i);
    await userEvent.type(searchInput, "laptop");

    await waitFor(() => {
      expect(screen.getByText("Laptop Pro")).toBeInTheDocument();
      expect(screen.getByText("High-performance laptop")).toBeInTheDocument();
    });
  });

  test("handles API errors gracefully", async () => {
    // Override handler to return error
    server.use(
      rest.get("/api/products/search", (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: "Server error" }));
      })
    );

    render(<ProductSearchPage />);

    const searchInput = screen.getByPlaceholderText(/search products/i);
    await userEvent.type(searchInput, "laptop");

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  test("handles network timeouts", async () => {
    server.use(
      rest.get("/api/products/search", (req, res, ctx) => {
        return res(ctx.delay("infinite"));
      })
    );

    render(<ProductSearchPage />);

    const searchInput = screen.getByPlaceholderText(/search products/i);
    await userEvent.type(searchInput, "laptop");

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText("Searching products...")).toBeInTheDocument();
    });
  });

  test("filters products by category", async () => {
    // Custom handler for category filtering
    server.use(
      rest.get("/api/products/search", (req, res, ctx) => {
        const category = req.url.searchParams.get("category");

        if (category === "electronics") {
          return res(
            ctx.status(200),
            ctx.json([
              {
                id: 1,
                name: "Electronics Item",
                description: "Electronics description",
                price: 299,
                category: "electronics",
              },
            ])
          );
        }

        return res(ctx.status(200), ctx.json([]));
      })
    );

    render(<ProductSearchPage />);

    const searchInput = screen.getByPlaceholderText(/search products/i);
    const categorySelect = screen.getByRole("combobox");

    await userEvent.type(searchInput, "item");
    await userEvent.selectOptions(categorySelect, "electronics");

    await waitFor(() => {
      expect(screen.getByText("Electronics Item")).toBeInTheDocument();
    });
  });
});
```

---

## E2E Testing

End-to-end testing validates complete user workflows across the entire application.

### 1. Cypress E2E Tests

```js
// cypress/e2e/user-journey.cy.js
describe("User Shopping Journey", () => {
  beforeEach(() => {
    // Reset database state
    cy.task("db:seed");

    // Visit homepage
    cy.visit("/");
  });

  it("completes full shopping journey", () => {
    // Search for products
    cy.get('[data-testid="search-input"]').type("laptop");
    cy.get('[data-testid="search-button"]').click();

    // Verify search results
    cy.get('[data-testid="product-list"]').should("be.visible");
    cy.get('[data-testid="product-item"]').should("have.length.gte", 1);

    // Click on first product
    cy.get('[data-testid="product-item"]').first().click();

    // Verify product details page
    cy.url().should("include", "/products/");
    cy.get('[data-testid="product-title"]').should("be.visible");
    cy.get('[data-testid="product-price"]').should("be.visible");

    // Add to cart
    cy.get('[data-testid="add-to-cart-button"]').click();

    // Verify cart updated
    cy.get('[data-testid="cart-count"]').should("contain", "1");

    // Go to cart
    cy.get('[data-testid="cart-link"]').click();

    // Verify cart contents
    cy.get('[data-testid="cart-item"]').should("have.length", 1);
    cy.get('[data-testid="cart-total"]').should("be.visible");

    // Proceed to checkout
    cy.get('[data-testid="checkout-button"]').click();

    // Fill checkout form
    cy.get('[data-testid="billing-name"]').type("John Doe");
    cy.get('[data-testid="billing-email"]').type("john@example.com");
    cy.get('[data-testid="billing-address"]').type("123 Main St");
    cy.get('[data-testid="billing-city"]').type("City");
    cy.get('[data-testid="billing-zip"]').type("12345");

    // Submit order
    cy.get('[data-testid="place-order-button"]').click();

    // Verify order confirmation
    cy.get('[data-testid="order-confirmation"]').should("be.visible");
    cy.get('[data-testid="order-number"]').should("contain", "#");
  });

  it("handles user authentication flow", () => {
    // Try to access protected page
    cy.visit("/profile");

    // Should redirect to login
    cy.url().should("include", "/login");

    // Fill login form
    cy.get('[data-testid="email-input"]').type("user@example.com");
    cy.get('[data-testid="password-input"]').type("password");
    cy.get('[data-testid="login-button"]').click();

    // Should redirect back to profile
    cy.url().should("include", "/profile");
    cy.get('[data-testid="user-name"]').should("contain", "John Doe");

    // Logout
    cy.get('[data-testid="logout-button"]').click();

    // Should redirect to homepage
    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });

  it("handles form validation errors", () => {
    cy.visit("/contact");

    // Submit empty form
    cy.get('[data-testid="submit-button"]').click();

    // Verify validation errors
    cy.get('[data-testid="name-error"]').should("contain", "Name is required");
    cy.get('[data-testid="email-error"]').should("contain", "Email is required");
    cy.get('[data-testid="message-error"]').should("contain", "Message is required");

    // Fill form with invalid email
    cy.get('[data-testid="name-input"]').type("John Doe");
    cy.get('[data-testid="email-input"]').type("invalid-email");
    cy.get('[data-testid="message-input"]').type("Test message");
    cy.get('[data-testid="submit-button"]').click();

    // Verify email validation error
    cy.get('[data-testid="email-error"]').should("contain", "Email is invalid");

    // Fix email and submit
    cy.get('[data-testid="email-input"]').clear().type("john@example.com");
    cy.get('[data-testid="submit-button"]').click();

    // Verify success
    cy.get('[data-testid="success-message"]').should("be.visible");
  });
});

// cypress/e2e/accessibility.cy.js
describe("Accessibility Tests", () => {
  it("meets accessibility standards", () => {
    cy.visit("/");
    cy.injectAxe();
    cy.checkA11y();

    // Check specific pages
    cy.visit("/products");
    cy.checkA11y();

    cy.visit("/contact");
    cy.checkA11y();
  });

  it("supports keyboard navigation", () => {
    cy.visit("/");

    // Tab through navigation
    cy.get("body").tab();
    cy.focused().should("have.attr", "data-testid", "home-link");

    cy.focused().tab();
    cy.focused().should("have.attr", "data-testid", "products-link");

    cy.focused().tab();
    cy.focused().should("have.attr", "data-testid", "contact-link");

    // Use Enter to navigate
    cy.focused().type("{enter}");
    cy.url().should("include", "/contact");
  });

  it("works with screen reader", () => {
    cy.visit("/products/1");

    // Check ARIA labels
    cy.get('[data-testid="product-image"]').should("have.attr", "alt");
    cy.get('[data-testid="add-to-cart-button"]').should("have.attr", "aria-label");
    cy.get('[data-testid="quantity-input"]').should("have.attr", "aria-describedby");

    // Check headings structure
    cy.get("h1").should("exist");
    cy.get("h2").should("exist");
  });
});

// cypress/support/commands.js
Cypress.Commands.add("login", (email = "user@example.com", password = "password") => {
  cy.request({
    method: "POST",
    url: "/api/auth/login",
    body: { email, password },
  }).then((response) => {
    window.localStorage.setItem("authToken", response.body.token);
  });
});

Cypress.Commands.add("logout", () => {
  window.localStorage.removeItem("authToken");
});

Cypress.Commands.add("addToCart", (productId, quantity = 1) => {
  cy.request({
    method: "POST",
    url: "/api/cart",
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem("authToken")}`,
    },
    body: { productId, quantity },
  });
});
```

### 2. Playwright E2E Tests

```js
// tests/e2e/shopping-flow.spec.js
import { test, expect } from "@playwright/test";

test.describe("Shopping Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("complete purchase flow", async ({ page }) => {
    // Search for product
    await page.fill('[data-testid="search-input"]', "laptop");
    await page.click('[data-testid="search-button"]');

    // Wait for results
    await page.waitForSelector('[data-testid="product-list"]');

    // Click first product
    await page.click('[data-testid="product-item"] >> nth=0');

    // Add to cart
    await page.click('[data-testid="add-to-cart-button"]');

    // Verify cart badge updated
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText("1");

    // Go to cart
    await page.click('[data-testid="cart-link"]');

    // Verify cart contents
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);

    // Screenshot for visual testing
    await page.screenshot({ path: "cart-page.png" });

    // Proceed to checkout
    await page.click('[data-testid="checkout-button"]');

    // Fill billing information
    await page.fill('[data-testid="billing-name"]', "John Doe");
    await page.fill('[data-testid="billing-email"]', "john@example.com");
    await page.fill('[data-testid="billing-address"]', "123 Main St");

    // Submit order
    await page.click('[data-testid="place-order-button"]');

    // Wait for confirmation
    await page.waitForSelector('[data-testid="order-confirmation"]');

    // Verify order number exists
    await expect(page.locator('[data-testid="order-number"]')).toContainText("#");
  });

  test("responsive design", async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Mobile menu should be visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

    // Desktop navigation should be hidden
    await expect(page.locator('[data-testid="desktop-nav"]')).toBeHidden();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
  });

  test("performance metrics", async ({ page }) => {
    // Start tracing
    await page.tracing.start({ screenshots: true, snapshots: true });

    await page.goto("/");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Stop tracing
    await page.tracing.stop({ path: "trace.zip" });

    // Check Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(
            entries.map((entry) => ({
              name: entry.name,
              value: entry.value,
            }))
          );
        }).observe({ entryTypes: ["measure"] });
      });
    });

    console.log("Performance metrics:", vitals);
  });
});
```

### 3. Visual Regression Testing

```js
// tests/visual/components.spec.js
import { test, expect } from "@playwright/test";

test.describe("Visual Regression Tests", () => {
  test("button components", async ({ page }) => {
    await page.goto("/storybook/?path=/story/button--all-variants");

    // Wait for storybook to load
    await page.waitForSelector('[data-testid="button-variants"]');

    // Take screenshot of all button variants
    await expect(page.locator('[data-testid="button-variants"]')).toHaveScreenshot("button-variants.png");
  });

  test("form components", async ({ page }) => {
    await page.goto("/storybook/?path=/story/form--contact-form");

    await expect(page.locator('[data-testid="contact-form"]')).toHaveScreenshot("contact-form.png");

    // Test form with validation errors
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="contact-form"]')).toHaveScreenshot("contact-form-errors.png");
  });

  test("responsive layouts", async ({ page }) => {
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(page).toHaveScreenshot("homepage-mobile.png");

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page).toHaveScreenshot("homepage-tablet.png");

    // Desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page).toHaveScreenshot("homepage-desktop.png");
  });

  test("dark mode theme", async ({ page }) => {
    await page.goto("/");

    // Switch to dark mode
    await page.click('[data-testid="theme-toggle"]');
    await page.waitForTimeout(500); // Wait for theme transition

    await expect(page).toHaveScreenshot("homepage-dark.png");
  });
});
```

## Summary & Best Practices

### 🎯 Testing Strategy Summary

**Unit Tests (70%)**

- Individual component behavior
- Custom hooks
- Utility functions
- Fast feedback loop

**Integration Tests (20%)**

- Component interactions
- API integration
- User workflows
- MSW for API mocking

**E2E Tests (10%)**

- Critical user journeys
- Cross-browser compatibility
- Performance validation
- Accessibility testing

### 🔧 Best Practices

1. **Write Tests That Give Confidence**

   - Test user behavior, not implementation
   - Focus on critical user paths
   - Maintain tests as code evolves

2. **Use the Right Tools**

   - Jest + RTL for unit/integration tests
   - MSW for API mocking
   - Cypress/Playwright for E2E tests
   - Axe for accessibility testing

3. **Maintain Test Quality**

   - Clear, descriptive test names
   - Arrange-Act-Assert pattern
   - Avoid test interdependencies
   - Regular test maintenance

4. **Performance Considerations**
   - Fast unit tests for quick feedback
   - Parallel test execution
   - Strategic E2E test selection
   - CI/CD integration

**🎉 Congratulations!** You've completed the comprehensive React SDE2 Mastery Guide. You now have the knowledge and skills to build, optimize, and test production-ready React applications at an industry-leading level.

---

_💡 Final Tip: Testing is an investment in code quality and team confidence. Start with the most critical user paths and gradually expand your test coverage as your application grows._
