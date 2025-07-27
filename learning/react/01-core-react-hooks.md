# Core React & Modern Hooks 🎣

Master the fundamental building blocks of modern React development with hooks, component patterns, and real-world applications.

## Table of Contents

- [JSX & Virtual DOM Deep Dive](#jsx--virtual-dom-deep-dive)
- [React Internals Deep Dive](#react-internals-deep-dive)
- [Essential Hooks Mastery](#essential-hooks-mastery)
- [Custom Hooks](#custom-hooks)
- [Industry Best Practices](#industry-best-practices)

---

## JSX & Virtual DOM Deep Dive

### What is JSX Really?

JSX is syntactic sugar that gets transpiled to `React.createElement()` calls. Understanding this transformation is crucial for debugging and optimization.

```jsx
// This JSX code:
const element = <h1 className="greeting">Hello, world!</h1>;

// Gets transpiled to:
const element = React.createElement(
  'h1',
  { className: 'greeting' },
  'Hello, world!'
);

// Which creates this JavaScript object:
{
  type: 'h1',
  props: {
    className: 'greeting',
    children: 'Hello, world!'
  },
  key: null,
  ref: null
}
```

### Virtual DOM & Reconciliation

The Virtual DOM is React's in-memory representation of the real DOM. React uses a diffing algorithm to minimize expensive DOM operations.

```jsx
// Example: Understanding reconciliation
function App() {
  const [items, setItems] = useState(["apple", "banana"]);

  const addItem = () => {
    setItems((prev) => [...prev, "cherry"]); // React will only add the new li element
  };

  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li> // Key is crucial for efficient reconciliation
      ))}
    </ul>
  );
}
```

### Advanced Reconciliation Process

React's reconciliation algorithm works in phases to efficiently update the DOM:

```jsx
// Detailed reconciliation example
function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: "Learn React", completed: false },
    { id: 2, text: "Build app", completed: false },
  ]);

  // When updating todos, React's reconciler:
  // 1. Compares new Virtual DOM tree with previous tree
  // 2. Identifies differences (insertions, deletions, updates)
  // 3. Creates a minimal set of DOM operations
  // 4. Applies changes in a single batch

  const toggleTodo = (id) => {
    setTodos((prev) =>
      prev.map(
        (todo) =>
          todo.id === id
            ? { ...todo, completed: !todo.completed } // Only this element re-renders
            : todo // These elements are reused (same reference)
      )
    );
  };

  return (
    <div>
      {todos.map((todo) => (
        <TodoItem
          key={todo.id} // Key helps React identify which element is which
          todo={todo}
          onToggle={toggleTodo}
        />
      ))}
    </div>
  );
}

// Reconciliation rules React follows:
// 1. Elements of different types = complete rebuild
// 2. Same type = compare props and update if needed
// 3. Keys help identify moved elements
// 4. React assumes child order is stable without keys
```

**📊 Reconciliation Performance:**

✅ **Efficient Scenarios:**

- Same component types with prop changes
- List reordering with proper keys
- Conditional rendering of same component type

❌ **Inefficient Scenarios:**

- Changing component types frequently
- Using array index as keys in dynamic lists
- Deep nesting without memoization

**🎯 When to Use vs Avoid:**

- **Use**: For dynamic, interactive UIs with frequent updates
- **Avoid**: For static content or simple websites (consider SSG instead)

---

## React Internals Deep Dive

Understanding React's internal architecture is crucial for writing performant applications and debugging complex issues.

### Fiber Architecture Fundamentals

React uses a **Fiber architecture** - a complete rewrite of React's core algorithm that enables features like time slicing and concurrent rendering.

```javascript
// Simplified Fiber Node Structure
const fiberNode = {
  // Identity
  type: "div", // Component type or DOM tag
  key: "unique-key", // Unique identifier
  elementType: "div", // Original element type

  // Relationships
  child: firstChildFiber, // First child fiber
  sibling: nextSiblingFiber, // Next sibling fiber
  parent: parentFiber, // Parent fiber (return)

  // State & Props
  props: { className: "container" }, // Current props
  memoizedProps: {}, // Props from last render
  memoizedState: null, // State from last render

  // Effects & Updates
  effectTag: "UPDATE", // What work needs to be done
  updateQueue: null, // Queue of state updates
  hooks: null, // Linked list of hooks

  // Work tracking
  lanes: 0, // Priority lanes for this update
  childLanes: 0, // Priority lanes for children

  // Scheduling
  expirationTime: 0, // When this work expires
  mode: "concurrent", // Rendering mode
};

// How Fiber enables concurrent features:
function workLoop() {
  while (workInProgress && !shouldYield()) {
    // Process one fiber node
    performUnitOfWork(workInProgress);
  }

  if (!workInProgress && workInProgressRoot) {
    // All work complete, commit changes
    commitRoot();
  }
}

// shouldYield() checks if browser needs time for other tasks
// This enables "time slicing" - React yields control back to browser
```

### Hook Internals: Why Rules Exist

Hooks work through a **linked list** maintained per component instance. Understanding this explains why hook rules exist.

```javascript
// Simplified Hook Implementation
let currentComponent = null;
let currentHookIndex = 0;

// Component instance maintains hook linked list
const componentInstance = {
  hooks: [], // Array of hook states
  currentHookIndex: 0, // Current position in hooks array
};

// useState implementation (simplified)
function useState(initialState) {
  const component = currentComponent;
  const index = component.currentHookIndex++;

  // First render: create hook
  if (!component.hooks[index]) {
    component.hooks[index] = {
      state: initialState,
      queue: [], // Update queue
    };
  }

  const hook = component.hooks[index];

  // Process queued updates
  let newState = hook.state;
  hook.queue.forEach((update) => {
    newState = typeof update === "function" ? update(newState) : update;
  });
  hook.state = newState;
  hook.queue = [];

  // Setter function
  const setState = (update) => {
    hook.queue.push(update);
    scheduleUpdate(component); // Trigger re-render
  };

  return [hook.state, setState];
}

// Why hook rules exist:
function Component() {
  // ✅ GOOD: Hooks called in same order every render
  const [count, setCount] = useState(0); // Hook index 0
  const [name, setName] = useState(""); // Hook index 1

  // ❌ BAD: Conditional hooks break the linked list
  if (condition) {
    const [extra, setExtra] = useState(""); // Sometimes index 2, sometimes doesn't exist!
  }

  // ❌ BAD: Hooks in loops create unpredictable indices
  for (let i = 0; i < items.length; i++) {
    const [item, setItem] = useState(items[i]); // Index changes with array length!
  }

  // ❌ BAD: Nested function hooks don't run during render
  const handleClick = () => {
    const [temp, setTemp] = useState(0); // Not called during render!
  };
}

// React expects same number of hooks in same order every render
// This is how React maintains state across renders
```

### State Update Cycle: From setState to DOM

Understanding the complete state update process helps with debugging and optimization.

```javascript
// Complete State Update Flow
function StateUpdateCycle() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    // 1. CREATE UPDATE OBJECT
    setCount(1); // Creates: { action: 1, next: null }
    setCount((c) => c + 1); // Creates: { action: (c) => c + 1, next: null }

    // 2. ENQUEUE UPDATES (batched in React 18)
    // Both updates queued together, not executed immediately
  };

  // When React processes updates:
  return <button onClick={handleClick}>Count: {count}</button>;
}

// Internal update processing (simplified):
function processUpdates(hook) {
  let newState = hook.memoizedState;
  let update = hook.queue.first;

  // Process each update in queue
  while (update) {
    if (typeof update.action === "function") {
      newState = update.action(newState); // Functional update
    } else {
      newState = update.action; // Direct value
    }
    update = update.next;
  }

  hook.memoizedState = newState;
  hook.queue = { first: null, last: null }; // Clear queue
  return newState;
}

// Batching in React 18:
function automaticBatching() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);

  const handleClick = () => {
    // React 18: Both updates batched automatically
    setTimeout(() => {
      setCount((c) => c + 1); // Queued
      setFlag((f) => !f); // Queued
      // Only 1 re-render happens after both updates
    }, 1000);
  };

  // Before React 18: setTimeout caused 2 separate renders
  // React 18: Automatic batching means 1 render
}
```

### useEffect Internals: Dependency Comparison

useEffect's dependency array uses `Object.is()` comparison to determine when to run effects.

```javascript
// useEffect implementation (simplified)
function useEffect(effect, deps) {
  const component = currentComponent;
  const index = component.currentHookIndex++;

  const hook = component.hooks[index] || {
    effect: null,
    destroy: null, // Cleanup function
    deps: null,
    tag: "effect",
  };

  // Dependency comparison
  let hasChanged = true;
  if (hook.deps && deps) {
    hasChanged = deps.some(
      (dep, i) => !Object.is(dep, hook.deps[i]) // Shallow comparison with Object.is()
    );
  }

  if (hasChanged) {
    // Schedule effect to run after render
    hook.effect = effect;
    hook.deps = deps;
    scheduleEffect(hook);
  }

  component.hooks[index] = hook;
}

// Why dependencies matter:
function EffectExample() {
  const [count, setCount] = useState(0);
  const [user, setUser] = useState({ name: "John" });

  // ✅ GOOD: Primitive dependency
  useEffect(() => {
    console.log("Count changed:", count);
  }, [count]); // Object.is(0, 1) = false, effect runs

  // ❌ PROBLEMATIC: Object dependency
  useEffect(() => {
    console.log("User changed:", user);
  }, [user]); // Object.is({name: 'John'}, {name: 'John'}) = false, always runs!

  // ✅ BETTER: Specific property dependency
  useEffect(() => {
    console.log("User name changed:", user.name);
  }, [user.name]); // Object.is('John', 'Jane') works correctly

  // Cleanup timing
  useEffect(() => {
    const timer = setInterval(() => {
      console.log("Timer tick");
    }, 1000);

    // Cleanup runs BEFORE next effect or component unmount
    return () => {
      clearInterval(timer); // Cleanup previous timer before setting new one
    };
  }, [count]); // New effect + cleanup when count changes
}
```

### Event System Internals: SyntheticEvents

React uses a sophisticated event system that normalizes browser differences and provides performance optimizations.

```javascript
// React's Event Delegation System
class ReactEventSystem {
  constructor() {
    // React attaches ONE listener to the root element
    this.root = document.getElementById("root");
    this.listeners = new Map(); // Map of fiber -> event handlers

    // All events are captured at root level
    this.root.addEventListener("click", this.handleEvent.bind(this), true);
    this.root.addEventListener("change", this.handleEvent.bind(this), true);
    // ... other event types
  }

  handleEvent(nativeEvent) {
    // 1. Find the React component that triggered this event
    const targetFiber = this.findFiberFromDOMNode(nativeEvent.target);

    // 2. Create SyntheticEvent wrapper
    const syntheticEvent = this.createSyntheticEvent(nativeEvent);

    // 3. Traverse up the fiber tree and collect event handlers
    const eventPath = this.collectEventHandlers(targetFiber, syntheticEvent.type);

    // 4. Execute handlers in correct order (capture -> bubble)
    this.executeEventHandlers(eventPath, syntheticEvent);
  }

  createSyntheticEvent(nativeEvent) {
    return {
      type: nativeEvent.type,
      target: nativeEvent.target,
      currentTarget: null, // Set during propagation

      // Normalized properties (cross-browser)
      preventDefault: () => nativeEvent.preventDefault(),
      stopPropagation: () => nativeEvent.stopPropagation(),

      // Original native event
      nativeEvent: nativeEvent,

      // Normalized values
      persist: () => {}, // Legacy - no longer needed
      isPersistent: () => true,
    };
  }
}

// SyntheticEvent usage patterns:
function EventExample() {
  const handleClick = (syntheticEvent) => {
    // syntheticEvent is normalized across browsers
    console.log("Event type:", syntheticEvent.type); // 'click'
    console.log("Target element:", syntheticEvent.target); // Actual DOM element
    console.log("React component:", syntheticEvent.currentTarget); // React element

    // Access native event if needed
    console.log("Native event:", syntheticEvent.nativeEvent);

    // Prevent default browser behavior
    syntheticEvent.preventDefault();

    // Stop event propagation
    syntheticEvent.stopPropagation();
  };

  return <button onClick={handleClick}>Click me</button>;
}

// Event pooling (legacy concept, removed in React 17+)
function LegacyEventPooling() {
  const handleClick = (event) => {
    // React 16: Event object was pooled and reused
    setTimeout(() => {
      console.log(event.type); // Would be null! Event was recycled
    }, 100);

    // React 16: Had to call persist() to keep event
    // event.persist();

    // React 17+: Events are no longer pooled
    setTimeout(() => {
      console.log(event.type); // Works fine now!
    }, 100);
  };
}
```

### Context Propagation Mechanism

React Context uses a provider-consumer pattern that propagates through the fiber tree.

```javascript
// Context implementation internals (simplified)
function createContext(defaultValue) {
  const context = {
    _currentValue: defaultValue,
    _currentValue2: defaultValue, // For concurrent features
    Provider: null,
    Consumer: null,
    _subscribers: new Set(),
  };

  // Provider component
  context.Provider = function Provider({ value, children }) {
    const previousValue = context._currentValue;
    context._currentValue = value;

    // When value changes, mark all subscribers for update
    if (previousValue !== value) {
      context._subscribers.forEach((fiber) => {
        scheduleUpdate(fiber); // Mark component for re-render
      });
    }

    return children;
  };

  // Consumer hook (useContext)
  function useContext(context) {
    const component = currentComponent;

    // Subscribe component to context changes
    context._subscribers.add(component);

    // Cleanup subscription on unmount
    useEffect(() => {
      return () => context._subscribers.delete(component);
    }, []);

    return context._currentValue;
  }

  return context;
}

// How context propagation works:
function ContextExample() {
  const ThemeContext = createContext("light");

  return (
    <ThemeContext.Provider value="dark">
      {/* All children can access "dark" value */}
      <Toolbar />
      <Sidebar />
    </ThemeContext.Provider>
  );
}

function Toolbar() {
  // React walks up fiber tree to find nearest Provider
  const theme = useContext(ThemeContext); // Gets "dark"

  return (
    <div className={`toolbar ${theme}`}>
      <Button /> {/* Button also gets "dark" */}
    </div>
  );
}

// Context optimization: Prevent unnecessary re-renders
function OptimizedContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({});

  // ❌ BAD: New object every render
  const contextValue = { user, settings, setUser, setSettings };

  // ✅ GOOD: Memoized context value
  const contextValue = useMemo(
    () => ({
      user,
      settings,
      setUser,
      setSettings,
    }),
    [user, settings]
  );

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
}
```

**📚 Key Takeaways:**

✅ **Fiber Architecture**: Enables concurrent features and time slicing  
✅ **Hook Rules**: Required because hooks are stored in a linked list  
✅ **State Updates**: Batched and processed in phases for performance  
✅ **Event System**: Uses delegation and synthetic events for consistency  
✅ **Context**: Propagates through fiber tree with subscriber pattern

**🎯 Debugging Benefits:**

- Understanding hook order helps debug "hook call order" errors
- Knowing batching behavior explains why multiple setState calls don't cause multiple renders
- Event system knowledge helps with event handling bugs
- Context propagation understanding helps optimize re-renders

---

## Essential Hooks Mastery

### 1. useState: State Management Fundamentals

`useState` manages component-level state and triggers re-renders when state changes.

```jsx
import React, { useState } from "react";

// Basic usage
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount((prev) => prev + 1)}>Increment (functional)</button>
    </div>
  );
}

// Complex state with objects
function UserProfile() {
  const [user, setUser] = useState({
    name: "",
    email: "",
    preferences: { theme: "light", notifications: true },
  });

  const updateUserName = (name) => {
    setUser((prev) => ({
      ...prev,
      name, // Only update the name, preserve other properties
    }));
  };

  const updatePreferences = (newPrefs) => {
    setUser((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, ...newPrefs },
    }));
  };

  return (
    <form>
      <input value={user.name} onChange={(e) => updateUserName(e.target.value)} placeholder="Name" />
      <label>
        <input type="checkbox" checked={user.preferences.notifications} onChange={(e) => updatePreferences({ notifications: e.target.checked })} />
        Enable Notifications
      </label>
    </form>
  );
}
```

**📚 Real-World Examples:**

1. **E-commerce Cart**: Managing items, quantities, and totals
2. **Form Validation**: Tracking field values and error states
3. **Modal States**: Controlling open/close states and content
4. **Dashboard Filters**: Managing multiple filter criteria
5. **Chat Applications**: Storing messages and typing indicators
6. **Media Players**: Tracking play/pause, volume, progress
7. **Game State**: Scores, levels, player positions

**⚠️ Common Pitfalls:**

```jsx
// ❌ DON'T: Direct mutation
setUser((user.name = "New Name"));

// ✅ DO: Immutable updates
setUser((prev) => ({ ...prev, name: "New Name" }));

// ❌ DON'T: Calling hooks conditionally
if (condition) {
  const [state, setState] = useState(0);
}

// ✅ DO: Call hooks at the top level
const [state, setState] = useState(0);
```

### 2. useEffect: Side Effects & Lifecycle

`useEffect` handles side effects like API calls, subscriptions, and DOM manipulation.

```jsx
import React, { useState, useEffect } from "react";

// Basic data fetching
function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/users");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []); // Empty dependency array = run once on mount

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

// Advanced: Cleanup and subscriptions
function WebSocketComponent() {
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => setConnectionStatus("Connected");
    ws.onclose = () => setConnectionStatus("Disconnected");
    ws.onmessage = (event) => {
      setMessages((prev) => [...prev, JSON.parse(event.data)]);
    };

    // Cleanup function
    return () => {
      ws.close();
    };
  }, []); // No dependencies = run once

  return (
    <div>
      <p>Status: {connectionStatus}</p>
      <ul>
        {messages.map((msg, index) => (
          <li key={index}>{msg.content}</li>
        ))}
      </ul>
    </div>
  );
}

// Dependency array patterns
function SearchResults({ searchTerm, category }) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!searchTerm) {
      setResults([]);
      return;
    }

    const searchAPI = async () => {
      const response = await fetch(`/api/search?q=${searchTerm}&cat=${category}`);
      const data = await response.json();
      setResults(data);
    };

    searchAPI();
  }, [searchTerm, category]); // Re-run when either dependency changes

  return (
    <div>
      {results.map((result) => (
        <div key={result.id}>{result.title}</div>
      ))}
    </div>
  );
}
```

**📚 Real-World Examples:**

1. **Data Fetching**: API calls on component mount
2. **Real-time Updates**: WebSocket connections, polling
3. **Event Listeners**: Window resize, scroll, keyboard events
4. **Timers**: Countdown timers, auto-save functionality
5. **Analytics Tracking**: Page views, user interactions
6. **Cleanup Operations**: Removing event listeners, canceling requests
7. **Local Storage Sync**: Persisting state to localStorage

**⚠️ Common Pitfalls:**

```jsx
// ❌ DON'T: Missing dependencies
useEffect(() => {
  fetchData(userId); // userId should be in dependencies
}, []);

// ✅ DO: Include all dependencies
useEffect(() => {
  fetchData(userId);
}, [userId]);

// ❌ DON'T: Infinite loops
useEffect(() => {
  setCount(count + 1); // count should be in dependencies, causes infinite loop
});

// ✅ DO: Use functional updates or include in dependencies
useEffect(() => {
  setCount((prev) => prev + 1);
}, [someOtherDependency]);
```

### 3. useContext: Global State Without Prop Drilling

`useContext` provides a way to share values between components without explicitly passing props through every level.

```jsx
import React, { createContext, useContext, useState } from "react";

// Create contexts
const ThemeContext = createContext();
const UserContext = createContext();

// Theme Provider
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

// User Provider
function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (credentials) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const userData = await response.json();
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

// Custom hooks for contexts
function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

// Component using contexts
function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useUser();

  return (
    <header className={`header ${theme}`}>
      <h1>My App</h1>
      <button onClick={toggleTheme}>Switch to {theme === "light" ? "dark" : "light"} mode</button>
      {isAuthenticated ? (
        <div>
          <span>Welcome, {user.name}!</span>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button>Login</button>
      )}
    </header>
  );
}

// App component
function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <div className="app">
          <Header />
          <main>{/* Other components */}</main>
        </div>
      </UserProvider>
    </ThemeProvider>
  );
}
```

**📊 Pros/Cons Analysis:**

✅ **Pros:**

- Eliminates prop drilling
- Clean, readable component tree
- Easy to share global state

❌ **Cons:**

- All consumers re-render when context value changes
- Can become performance bottleneck with large objects
- Makes components less reusable

**🎯 When to Use vs Avoid:**

- **Use**: Theme, user authentication, language preferences, app configuration
- **Avoid**: Frequently changing data, large state objects, deeply nested data

### 4. useReducer: Complex State Logic

`useReducer` is perfect for complex state logic involving multiple sub-values or when the next state depends on the previous one.

```jsx
import React, { useReducer } from "react";

// Shopping cart reducer
const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD_ITEM":
      const existingItem = state.items.find((item) => item.id === action.payload.id);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) => (item.id === action.payload.id ? { ...item, quantity: item.quantity + 1 } : item)),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      };

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };

    case "UPDATE_QUANTITY":
      return {
        ...state,
        items: state.items.map((item) => (item.id === action.payload.id ? { ...item, quantity: action.payload.quantity } : item)),
      };

    case "CLEAR_CART":
      return { ...state, items: [] };

    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    default:
      return state;
  }
};

// Initial state
const initialCartState = {
  items: [],
  loading: false,
  error: null,
};

// Shopping cart component
function ShoppingCart() {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);

  const addItem = (product) => {
    dispatch({ type: "ADD_ITEM", payload: product });
  };

  const removeItem = (productId) => {
    dispatch({ type: "REMOVE_ITEM", payload: productId });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeItem(productId);
    } else {
      dispatch({
        type: "UPDATE_QUANTITY",
        payload: { id: productId, quantity },
      });
    }
  };

  const clearCart = () => {
    dispatch({ type: "CLEAR_CART" });
  };

  const totalPrice = state.items.reduce((total, item) => total + item.price * item.quantity, 0);

  const totalItems = state.items.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="shopping-cart">
      <h2>Shopping Cart ({totalItems} items)</h2>

      {state.items.length === 0 ? (
        <p>Your cart is empty</p>
      ) : (
        <>
          {state.items.map((item) => (
            <div key={item.id} className="cart-item">
              <span>{item.name}</span>
              <span>${item.price}</span>
              <div>
                <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
              </div>
              <button onClick={() => removeItem(item.id)}>Remove</button>
            </div>
          ))}

          <div className="cart-total">
            <strong>Total: ${totalPrice.toFixed(2)}</strong>
          </div>

          <button onClick={clearCart}>Clear Cart</button>
        </>
      )}
    </div>
  );
}

// Complex form with validation
const formReducer = (state, action) => {
  switch (action.type) {
    case "SET_FIELD":
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: "" },
      };

    case "SET_ERROR":
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.error },
      };

    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "RESET_FORM":
      return (
        action.payload || {
          values: { email: "", password: "", confirmPassword: "" },
          errors: {},
          loading: false,
        }
      );

    default:
      return state;
  }
};

function SignupForm() {
  const [state, dispatch] = useReducer(formReducer, {
    values: { email: "", password: "", confirmPassword: "" },
    errors: {},
    loading: false,
  });

  const validateField = (field, value) => {
    switch (field) {
      case "email":
        if (!value) return "Email is required";
        if (!/\S+@\S+\.\S+/.test(value)) return "Email is invalid";
        break;
      case "password":
        if (!value) return "Password is required";
        if (value.length < 8) return "Password must be at least 8 characters";
        break;
      case "confirmPassword":
        if (value !== state.values.password) return "Passwords do not match";
        break;
      default:
        return "";
    }
    return "";
  };

  const handleFieldChange = (field, value) => {
    dispatch({ type: "SET_FIELD", field, value });

    const error = validateField(field, value);
    if (error) {
      dispatch({ type: "SET_ERROR", field, error });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields
    const errors = {};
    Object.keys(state.values).forEach((field) => {
      const error = validateField(field, state.values[field]);
      if (error) errors[field] = error;
    });

    if (Object.keys(errors).length > 0) {
      Object.entries(errors).forEach(([field, error]) => {
        dispatch({ type: "SET_ERROR", field, error });
      });
      return;
    }

    dispatch({ type: "SET_LOADING", payload: true });

    try {
      await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.values),
      });

      dispatch({ type: "RESET_FORM" });
      alert("Account created successfully!");
    } catch (error) {
      dispatch({ type: "SET_ERROR", field: "general", error: error.message });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input type="email" placeholder="Email" value={state.values.email} onChange={(e) => handleFieldChange("email", e.target.value)} />
        {state.errors.email && <span className="error">{state.errors.email}</span>}
      </div>

      <div>
        <input type="password" placeholder="Password" value={state.values.password} onChange={(e) => handleFieldChange("password", e.target.value)} />
        {state.errors.password && <span className="error">{state.errors.password}</span>}
      </div>

      <div>
        <input type="password" placeholder="Confirm Password" value={state.values.confirmPassword} onChange={(e) => handleFieldChange("confirmPassword", e.target.value)} />
        {state.errors.confirmPassword && <span className="error">{state.errors.confirmPassword}</span>}
      </div>

      <button type="submit" disabled={state.loading}>
        {state.loading ? "Creating Account..." : "Sign Up"}
      </button>

      {state.errors.general && <div className="error">{state.errors.general}</div>}
    </form>
  );
}
```

**📚 Real-World Examples:**

1. **Shopping Carts**: Managing items, quantities, discounts
2. **Form Validation**: Complex forms with multiple fields and validations
3. **Game State**: Player actions, score calculations, game progression
4. **Wizard/Stepper Components**: Multi-step forms with navigation
5. **Data Tables**: Sorting, filtering, pagination state
6. **Chat Applications**: Message history, typing indicators, user status
7. **Todo Lists**: Adding, editing, filtering, marking complete

**🎯 When to Use vs Avoid:**

- **Use**: Complex state with multiple related values, predictable state transitions
- **Avoid**: Simple state that can be managed with useState, when logic is not complex

### 5. useRef: DOM Access & Mutable Values

`useRef` returns a mutable ref object whose `.current` property persists for the full lifetime of the component.

```jsx
import React, { useRef, useEffect, useState } from "react";

// DOM manipulation
function FocusInput() {
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const handleFocus = () => {
    inputRef.current?.focus();
  };

  return (
    <div>
      <input ref={inputRef} type="text" placeholder="I'll be focused on mount" />
      <button onClick={handleFocus}>Focus Input</button>
    </div>
  );
}

// Storing mutable values without causing re-renders
function Timer() {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef(null);

  const startTimer = () => {
    if (intervalRef.current) return; // Already running

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resetTimer = () => {
    stopTimer();
    setSeconds(0);
  };

  useEffect(() => {
    return () => stopTimer(); // Cleanup on unmount
  }, []);

  return (
    <div>
      <h2>Timer: {seconds}s</h2>
      <button onClick={startTimer}>Start</button>
      <button onClick={stopTimer}>Stop</button>
      <button onClick={resetTimer}>Reset</button>
    </div>
  );
}

// Previous value tracking
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

function CounterWithPrevious() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return (
    <div>
      <h2>Current: {count}</h2>
      <h3>Previous: {prevCount}</h3>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

// Complex example: Video player controls
function VideoPlayer({ src }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  };

  const seekTo = (time) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
    }
  };

  const changeVolume = (newVolume) => {
    const video = videoRef.current;
    if (video) {
      video.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="video-player">
      <video ref={videoRef} src={src} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} style={{ width: "100%" }} />

      <div className="controls">
        <button onClick={togglePlay}>{isPlaying ? "⏸️" : "▶️"}</button>

        <span>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <input type="range" min="0" max={duration} value={currentTime} onChange={(e) => seekTo(Number(e.target.value))} style={{ flex: 1, margin: "0 10px" }} />

        <span>🔊</span>
        <input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => changeVolume(Number(e.target.value))} />
      </div>
    </div>
  );
}
```

**📚 Real-World Examples:**

1. **Form Focus Management**: Auto-focusing inputs, managing tab order
2. **Scroll Management**: Scroll to top, infinite scroll implementations
3. **Canvas/WebGL**: Direct manipulation of canvas elements
4. **Third-party Integrations**: Google Maps, Chart.js, D3.js
5. **Media Controls**: Video/audio players, webcam access
6. **Animation Libraries**: GSAP, Framer Motion integration
7. **Measuring Elements**: Getting element dimensions, positions

**⚠️ Common Pitfalls:**

```jsx
// ❌ DON'T: Access ref during render
function BadExample() {
  const ref = useRef();
  console.log(ref.current); // undefined during initial render
  return <div ref={ref}>Content</div>;
}

// ✅ DO: Access ref in effects or event handlers
function GoodExample() {
  const ref = useRef();

  useEffect(() => {
    console.log(ref.current); // Available after mount
  }, []);

  return <div ref={ref}>Content</div>;
}
```

---

## Custom Hooks

Custom hooks allow you to extract component logic into reusable functions. They follow the naming convention `use*` and can call other hooks.

### Advanced Custom Hooks Examples

```jsx
// 1. API Data Fetching Hook
function useApi(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

// Usage
function UserProfile({ userId }) {
  const { data: user, loading, error, refetch } = useApi(`/api/users/${userId}`);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}

// 2. Local Storage Hook
function useLocalStorage(key, initialValue) {
  // Get value from localStorage or use initial value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback(
    (value) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove item from localStorage
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// Usage
function Settings() {
  const [theme, setTheme, removeTheme] = useLocalStorage("theme", "light");
  const [notifications, setNotifications] = useLocalStorage("notifications", true);

  return (
    <div>
      <label>
        Theme:
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>

      <label>
        <input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
        Enable Notifications
      </label>

      <button onClick={removeTheme}>Reset Theme</button>
    </div>
  );
}

// 3. Debounced Value Hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Search component using debounced input
function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const { data: results, loading } = useApi(debouncedSearchTerm ? `/api/search?q=${debouncedSearchTerm}` : null);

  return (
    <div>
      <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />

      {loading && <div>Searching...</div>}

      {results && (
        <ul>
          {results.map((result) => (
            <li key={result.id}>{result.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 4. Window Size Hook
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures that effect is only run on mount

  return windowSize;
}

// Responsive component
function ResponsiveComponent() {
  const { width } = useWindowSize();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  return (
    <div>
      {isMobile && <div>Mobile View</div>}
      {isTablet && <div>Tablet View</div>}
      {isDesktop && <div>Desktop View</div>}
      <p>Window size: {width}px</p>
    </div>
  );
}

// 5. Form Hook
function useForm(initialValues, validationRules = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const setValue = useCallback(
    (name, value) => {
      setValues((prev) => ({ ...prev, [name]: value }));

      // Clear error when user starts typing
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    },
    [errors]
  );

  const setTouched = useCallback((name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const validate = useCallback(() => {
    const newErrors = {};

    Object.keys(validationRules).forEach((field) => {
      const rules = validationRules[field];
      const value = values[field];

      for (const rule of rules) {
        const error = rule(value, values);
        if (error) {
          newErrors[field] = error;
          break;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validationRules]);

  const handleSubmit = useCallback(
    (onSubmit) => {
      return (e) => {
        e.preventDefault();

        // Mark all fields as touched
        const allTouched = Object.keys(initialValues).reduce((acc, key) => ({ ...acc, [key]: true }), {});
        setTouched(allTouched);

        if (validate()) {
          onSubmit(values);
        }
      };
    },
    [values, validate, initialValues]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    setValue,
    setTouched,
    handleSubmit,
    reset,
    isValid: Object.keys(errors).length === 0,
  };
}

// Validation rules
const required = (value) => (!value ? "This field is required" : "");
const email = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return value && !emailRegex.test(value) ? "Invalid email address" : "";
};
const minLength = (min) => (value) => value && value.length < min ? `Must be at least ${min} characters` : "";

// Contact form using the custom hook
function ContactForm() {
  const form = useForm(
    { name: "", email: "", message: "" },
    {
      name: [required],
      email: [required, email],
      message: [required, minLength(10)],
    }
  );

  const handleSubmit = async (data) => {
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      alert("Message sent successfully!");
      form.reset();
    } catch (error) {
      alert("Failed to send message");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <div>
        <input type="text" placeholder="Name" value={form.values.name} onChange={(e) => form.setValue("name", e.target.value)} onBlur={() => form.setTouched("name")} />
        {form.touched.name && form.errors.name && <span className="error">{form.errors.name}</span>}
      </div>

      <div>
        <input type="email" placeholder="Email" value={form.values.email} onChange={(e) => form.setValue("email", e.target.value)} onBlur={() => form.setTouched("email")} />
        {form.touched.email && form.errors.email && <span className="error">{form.errors.email}</span>}
      </div>

      <div>
        <textarea placeholder="Message" value={form.values.message} onChange={(e) => form.setValue("message", e.target.value)} onBlur={() => form.setTouched("message")} />
        {form.touched.message && form.errors.message && <span className="error">{form.errors.message}</span>}
      </div>

      <button type="submit" disabled={!form.isValid}>
        Send Message
      </button>
    </form>
  );
}
```

**📚 Real-World Custom Hook Examples:**

1. **useAuth**: Authentication state management
2. **useTheme**: Theme switching and persistence
3. **useIntersectionObserver**: Lazy loading and infinite scroll
4. **useGeolocation**: Location tracking and permissions
5. **useWebSocket**: Real-time connection management
6. **useClipboard**: Copy to clipboard functionality
7. **useKeyPress**: Keyboard shortcut handling
8. **useOnlineStatus**: Network connectivity detection

---

## Industry Best Practices

### 🏢 FAANG-Level Practices

1. **Component Composition over Inheritance**

```jsx
// ✅ Preferred: Composition
function Button({ children, variant, ...props }) {
  return (
    <button className={`btn btn-${variant}`} {...props}>
      {children}
    </button>
  );
}

function PrimaryButton({ children, ...props }) {
  return (
    <Button variant="primary" {...props}>
      {children}
    </Button>
  );
}
```

2. **Error Boundaries for Production Apps**

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}
```

3. **Prop Types for Type Safety** (or better yet, TypeScript)

```jsx
import PropTypes from "prop-types";

function UserCard({ user, onEdit, isLoading }) {
  return (
    <div className="user-card">
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
          <button onClick={() => onEdit(user.id)}>Edit</button>
        </>
      )}
    </div>
  );
}

UserCard.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

UserCard.defaultProps = {
  isLoading: false,
};
```

### 🎯 Performance Guidelines

1. **Avoid Creating Objects in Render**

```jsx
// ❌ Bad: Creates new object on every render
function UserList({ users }) {
  return (
    <div>
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          style={{ marginBottom: "10px" }} // New object every render!
        />
      ))}
    </div>
  );
}

// ✅ Good: Define styles outside or use CSS classes
const userCardStyle = { marginBottom: "10px" };

function UserList({ users }) {
  return (
    <div>
      {users.map((user) => (
        <UserCard key={user.id} user={user} style={userCardStyle} />
      ))}
    </div>
  );
}
```

2. **Use Keys Properly**

```jsx
// ❌ Bad: Using index as key
{
  items.map((item, index) => <Item key={index} data={item} />);
}

// ✅ Good: Using unique identifier
{
  items.map((item) => <Item key={item.id} data={item} />);
}
```

### 🔧 Development Tools

**Essential Tools for Professional Development:**

1. **React Developer Tools**: Browser extension for debugging
2. **ESLint + Prettier**: Code quality and formatting
3. **Husky + lint-staged**: Pre-commit hooks
4. **Storybook**: Component development and documentation
5. **React Testing Library**: User-centric testing

---

## Summary & Next Steps

You've now mastered both the **fundamentals and internals** of React! Here's what you should be comfortable with:

✅ **JSX & Virtual DOM**: Understanding compilation, reconciliation, and diffing algorithms  
✅ **React Internals**: Fiber architecture, hook implementation, and memory management  
✅ **useState**: Managing state and understanding the update cycle  
✅ **useEffect**: Side effects, dependency comparison, and cleanup patterns  
✅ **useContext**: Global state and context propagation mechanisms  
✅ **useReducer**: Complex state logic and predictable updates  
✅ **useRef**: DOM access, mutable values, and memory optimization  
✅ **Custom Hooks**: Reusable logic and advanced patterns  
✅ **Event System**: SyntheticEvents, delegation, and performance implications

**🎯 Key Takeaways:**

- **Hook Rules**: Required because hooks are stored in a linked list per component
- **State Batching**: React 18 automatically batches updates for better performance
- **Memory Management**: Proper cleanup prevents leaks and optimizes performance
- **Event Delegation**: React uses a single event listener for all events
- **Fiber Architecture**: Enables concurrent rendering and time slicing
- **Reconciliation**: React efficiently updates only changed DOM elements

**🔧 Debugging Benefits:**

- Understanding hook order helps debug "hook call order" errors
- Knowing batching behavior explains why multiple setState calls don't cause multiple renders
- Event system knowledge helps with event handling and performance issues
- Memory patterns help identify and fix memory leaks
- Fiber concepts explain concurrent rendering behavior

**📈 Next Steps:**
Ready to tackle more complex topics? Continue with [State Management](./02-state-management.md) to learn about Redux Toolkit, Zustand, and TanStack Query for managing application state at scale.

---

_💡 Pro Tip: Understanding React's internals makes you a better developer. You'll write more performant code, debug issues faster, and make better architectural decisions._
