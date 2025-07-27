# State Management 🗄️

Master modern state management patterns from simple local state to complex global state with the right tools for every scenario.

## Table of Contents

- [Understanding State Types](#understanding-state-types)
- [Redux Toolkit for Complex Applications](#redux-toolkit-for-complex-applications)
- [Zustand for Lightweight State](#zustand-for-lightweight-state)
- [TanStack Query for Server State](#tanstack-query-for-server-state)
- [Decision Framework](#decision-framework)

---

## Understanding State Types

### Client-Side vs Server-Side State

Understanding the difference between these state types is crucial for choosing the right management strategy.

```jsx
// CLIENT-SIDE STATE: UI-specific, ephemeral
const [isModalOpen, setIsModalOpen] = useState(false);
const [selectedTab, setSelectedTab] = useState("profile");
const [formData, setFormData] = useState({ name: "", email: "" });

// SERVER-SIDE STATE: Data from APIs, persisted
const [users, setUsers] = useState([]);
const [posts, setPosts] = useState([]);
const [userProfile, setUserProfile] = useState(null);
```

**📊 State Classification:**

| State Type          | Examples                        | Best Tool            | Persistence          |
| ------------------- | ------------------------------- | -------------------- | -------------------- |
| **Local UI State**  | Modal open/close, form inputs   | useState, useReducer | Component lifetime   |
| **Global UI State** | Theme, language, navigation     | Context, Zustand     | Session/localStorage |
| **Server State**    | User data, posts, products      | TanStack Query       | API/Database         |
| **Complex Logic**   | Shopping cart, multi-step forms | Redux Toolkit        | Varies               |

### Real-World State Examples

```jsx
// 1. E-commerce Application State Architecture
function EcommerceApp() {
  // LOCAL UI STATE
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // GLOBAL UI STATE (Context/Zustand)
  const { theme, language, currency } = useAppSettings();
  const { cartItems, addToCart } = useShoppingCart();

  // SERVER STATE (TanStack Query)
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", searchQuery],
    queryFn: () => fetchProducts(searchQuery),
  });

  return (
    <div className={`app theme-${theme}`}>
      <Header />
      <ProductGrid products={products} loading={isLoading} />
      <ShoppingCart items={cartItems} />
    </div>
  );
}

// 2. Social Media Dashboard
function SocialDashboard() {
  // LOCAL UI STATE
  const [activeView, setActiveView] = useState("feed");
  const [newPostContent, setNewPostContent] = useState("");

  // GLOBAL UI STATE
  const { user, notifications } = useAuth();
  const { darkMode, sidebarCollapsed } = useUI();

  // SERVER STATE
  const { data: posts } = useInfiniteQuery({
    queryKey: ["posts", user.id],
    queryFn: ({ pageParam = 0 }) => fetchPosts(pageParam),
  });

  const { data: friends } = useQuery({
    queryKey: ["friends", user.id],
    queryFn: () => fetchFriends(user.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <div className={`dashboard ${darkMode ? "dark" : "light"}`}>
      <Sidebar collapsed={sidebarCollapsed} />
      <Feed posts={posts} />
      <FriendsPanel friends={friends} />
    </div>
  );
}
```

---

## Redux Toolkit for Complex Applications

Redux Toolkit (RTK) is the modern, opinionated way to write Redux. It includes utilities to simplify common Redux use cases.

### When to Use Redux Toolkit

✅ **Use Redux Toolkit when:**

- Complex state logic across multiple components
- Predictable state updates are crucial
- Time-travel debugging is needed
- Large team development requiring consistent patterns
- State needs to be shared across many unrelated components

❌ **Avoid Redux Toolkit when:**

- Simple component state
- Small applications
- Mostly server state (use TanStack Query instead)
- Rapid prototyping

### Complete Redux Toolkit Setup

```jsx
// store/index.js
import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import cartSlice from './slices/cartSlice';
import uiSlice from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    cart: cartSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk for login
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      return data.user;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { dispatch }) => {
    localStorage.removeItem('token');
    dispatch(cartSlice.actions.clearCart()); // Clear cart on logout
    return null;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Logout cases
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;

// store/slices/cartSlice.js
import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    total: 0,
    discountCode: null,
    shipping: {
      method: 'standard',
      cost: 0,
    },
  },
  reducers: {
    addItem: (state, action) => {
      const { product, quantity = 1 } = action.payload;
      const existingItem = state.items.find(item => item.id === product.id);

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({ ...product, quantity });
      }

      cartSlice.caseReducers.calculateTotal(state);
    },

    removeItem: (state, action) => {
      state.items = state.items.filter(item => item.id !== action.payload);
      cartSlice.caseReducers.calculateTotal(state);
    },

    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.items.find(item => item.id === id);

      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter(item => item.id !== id);
        } else {
          item.quantity = quantity;
        }
      }

      cartSlice.caseReducers.calculateTotal(state);
    },

    applyDiscount: (state, action) => {
      state.discountCode = action.payload;
      cartSlice.caseReducers.calculateTotal(state);
    },

    setShipping: (state, action) => {
      state.shipping = action.payload;
      cartSlice.caseReducers.calculateTotal(state);
    },

    clearCart: (state) => {
      state.items = [];
      state.total = 0;
      state.discountCode = null;
    },

    calculateTotal: (state) => {
      const subtotal = state.items.reduce(
        (sum, item) => sum + (item.price * item.quantity), 0
      );

      let discount = 0;
      if (state.discountCode) {
        discount = subtotal * 0.1; // 10% discount example
      }

      state.total = subtotal - discount + state.shipping.cost;
    },
  },
});

export const {
  addItem,
  removeItem,
  updateQuantity,
  applyDiscount,
  setShipping,
  clearCart
} = cartSlice.actions;
export default cartSlice.reducer;

// Selectors for better performance
export const selectCartItems = (state) => state.cart.items;
export const selectCartTotal = (state) => state.cart.total;
export const selectCartItemCount = (state) =>
  state.cart.items.reduce((count, item) => count + item.quantity, 0);

// hooks/redux.js - Typed hooks
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '../store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Components using Redux
function ShoppingCart() {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCartItems);
  const total = useAppSelector(selectCartTotal);
  const itemCount = useAppSelector(selectCartItemCount);

  const handleUpdateQuantity = (id, quantity) => {
    dispatch(updateQuantity({ id, quantity }));
  };

  const handleRemoveItem = (id) => {
    dispatch(removeItem(id));
  };

  const handleClearCart = () => {
    dispatch(clearCart());
  };

  return (
    <div className="shopping-cart">
      <h2>Shopping Cart ({itemCount} items)</h2>

      {items.length === 0 ? (
        <p>Your cart is empty</p>
      ) : (
        <>
          {items.map(item => (
            <div key={item.id} className="cart-item">
              <img src={item.image} alt={item.name} />
              <div className="item-details">
                <h3>{item.name}</h3>
                <p>${item.price}</p>
              </div>
              <div className="quantity-controls">
                <button
                  onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                >
                  -
                </button>
                <span>{item.quantity}</span>
                <button
                  onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                >
                  +
                </button>
              </div>
              <button
                onClick={() => handleRemoveItem(item.id)}
                className="remove-btn"
              >
                Remove
              </button>
            </div>
          ))}

          <div className="cart-summary">
            <p>Total: ${total.toFixed(2)}</p>
            <button onClick={handleClearCart}>Clear Cart</button>
            <button className="checkout-btn">Proceed to Checkout</button>
          </div>
        </>
      )}
    </div>
  );
}

function LoginForm() {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(state => state.auth);
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser(credentials));
  };

  const handleChange = (e) => {
    setCredentials(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="error">
          {error}
          <button onClick={() => dispatch(clearError())}>×</button>
        </div>
      )}

      <input
        type="email"
        name="email"
        placeholder="Email"
        value={credentials.email}
        onChange={handleChange}
        required
      />

      <input
        type="password"
        name="password"
        placeholder="Password"
        value={credentials.password}
        onChange={handleChange}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Signing In...' : 'Sign In'}
      </button>
    </form>
  );
}
```

**📚 Real-World Redux Examples:**

1. **E-commerce Platforms**: Cart, user preferences, product filters
2. **Social Media Apps**: User profiles, posts, notifications
3. **Project Management Tools**: Tasks, projects, team members
4. **Trading Platforms**: Portfolio, watchlists, market data
5. **Gaming Applications**: Game state, player progress, leaderboards
6. **Enterprise Dashboards**: User roles, permissions, widgets
7. **Collaboration Tools**: Workspaces, documents, real-time updates

---

## Zustand for Lightweight State

Zustand is a small, fast, and scalable state management solution. Perfect for when Redux feels like overkill.

### When to Use Zustand

✅ **Use Zustand when:**

- Medium complexity state management
- Want minimal boilerplate
- Need good TypeScript support
- Rapid development
- Don't need time-travel debugging

❌ **Avoid Zustand when:**

- Very simple local state (use useState)
- Need advanced debugging tools
- Large team requires strict patterns

### Zustand Implementation Examples

```jsx
// stores/authStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      // Actions
      login: async (credentials) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
          });

          if (!response.ok) throw new Error("Login failed");

          const data = await response.json();
          set({
            user: data.user,
            isAuthenticated: true,
            loading: false,
          });

          return data;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
        localStorage.removeItem("token");
      },

      updateProfile: (updates) => {
        const currentUser = get().user;
        set({ user: { ...currentUser, ...updates } });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage", // localStorage key
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// stores/uiStore.js
export const useUIStore = create((set) => ({
  // State
  theme: "light",
  sidebarOpen: true,
  notifications: [],
  modals: {},

  // Actions
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === "light" ? "dark" : "light",
    })),

  toggleSidebar: () =>
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    })),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          id: Date.now(),
          timestamp: new Date(),
          ...notification,
        },
      ],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  openModal: (modalName, props = {}) =>
    set((state) => ({
      modals: { ...state.modals, [modalName]: { open: true, props } },
    })),

  closeModal: (modalName) =>
    set((state) => ({
      modals: { ...state.modals, [modalName]: { open: false, props: {} } },
    })),
}));

// stores/cartStore.js
export const useCartStore = create(
  persist(
    (set, get) => ({
      // State
      items: [],
      discountCode: null,

      // Computed values (getters)
      get total() {
        const state = get();
        const subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const discount = state.discountCode ? subtotal * 0.1 : 0;
        return subtotal - discount;
      },

      get itemCount() {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },

      // Actions
      addItem: (product, quantity = 1) =>
        set((state) => {
          const existingItem = state.items.find((item) => item.id === product.id);

          if (existingItem) {
            return {
              items: state.items.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item)),
            };
          } else {
            return {
              items: [...state.items, { ...product, quantity }],
            };
          }
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((item) => item.id !== productId),
            };
          }

          return {
            items: state.items.map((item) => (item.id === productId ? { ...item, quantity } : item)),
          };
        }),

      applyDiscount: (code) => set({ discountCode: code }),

      clearCart: () => set({ items: [], discountCode: null }),
    }),
    {
      name: "shopping-cart",
    }
  )
);

// Using Zustand in components
function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const itemCount = useCartStore((state) => state.itemCount);

  return (
    <header className={`header theme-${theme}`}>
      <h1>My Store</h1>

      <nav>
        <button onClick={toggleTheme}>{theme === "light" ? "🌙" : "☀️"}</button>

        <div className="cart-icon">
          🛒 <span className="badge">{itemCount}</span>
        </div>

        {isAuthenticated ? (
          <div>
            <span>Welcome, {user.name}!</span>
            <button onClick={logout}>Logout</button>
          </div>
        ) : (
          <button>Login</button>
        )}
      </nav>
    </header>
  );
}

function ProductCard({ product }) {
  const addItem = useCartStore((state) => state.addItem);
  const { addNotification } = useUIStore();

  const handleAddToCart = () => {
    addItem(product);
    addNotification({
      type: "success",
      message: `${product.name} added to cart!`,
    });
  };

  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
}

// Advanced: Zustand with subscriptions
function NotificationSystem() {
  const notifications = useUIStore((state) => state.notifications);
  const removeNotification = useUIStore((state) => state.removeNotification);

  useEffect(() => {
    // Auto-remove notifications after 5 seconds
    const timers = notifications.map((notification) =>
      setTimeout(() => {
        removeNotification(notification.id);
      }, 5000)
    );

    return () => timers.forEach(clearTimeout);
  }, [notifications, removeNotification]);

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div key={notification.id} className={`notification ${notification.type}`}>
          {notification.message}
          <button onClick={() => removeNotification(notification.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
```

**📊 Zustand vs Redux Comparison:**

| Feature            | Zustand   | Redux Toolkit  |
| ------------------ | --------- | -------------- |
| **Bundle Size**    | ~700B     | ~10KB          |
| **Boilerplate**    | Minimal   | Moderate       |
| **TypeScript**     | Excellent | Good           |
| **DevTools**       | Basic     | Advanced       |
| **Learning Curve** | Low       | Moderate       |
| **Time Travel**    | No        | Yes            |
| **Middleware**     | Limited   | Rich Ecosystem |

---

## TanStack Query for Server State

TanStack Query (formerly React Query) is the best solution for managing server state, caching, and synchronization.

### Why TanStack Query?

✅ **Advantages:**

- Automatic caching and background refetching
- Optimistic updates
- Request deduplication
- Offline support
- Excellent developer experience

### Complete TanStack Query Setup

```jsx
// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);

// api/users.js
const API_BASE = "/api";

export const userAPI = {
  getUsers: async (page = 1, limit = 10) => {
    const response = await fetch(`${API_BASE}/users?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error("Failed to fetch users");
    return response.json();
  },

  getUserById: async (id) => {
    const response = await fetch(`${API_BASE}/users/${id}`);
    if (!response.ok) throw new Error("Failed to fetch user");
    return response.json();
  },

  createUser: async (userData) => {
    const response = await fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error("Failed to create user");
    return response.json();
  },

  updateUser: async ({ id, ...userData }) => {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error("Failed to update user");
    return response.json();
  },

  deleteUser: async (id) => {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete user");
    return response.json();
  },
};

// hooks/useUsers.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userAPI } from "../api/users";

// Query hooks
export const useUsers = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ["users", page, limit],
    queryFn: () => userAPI.getUsers(page, limit),
    keepPreviousData: true, // For pagination
  });
};

export const useUser = (id) => {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => userAPI.getUserById(id),
    enabled: !!id, // Only run if id exists
  });
};

// Mutation hooks
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userAPI.createUser,
    onSuccess: (newUser) => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ["users"] });

      // Optimistically add to cache
      queryClient.setQueryData(["users", newUser.id], newUser);
    },
    onError: (error) => {
      console.error("Failed to create user:", error);
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userAPI.updateUser,
    onMutate: async (updatedUser) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["users", updatedUser.id] });

      // Snapshot previous value
      const previousUser = queryClient.getQueryData(["users", updatedUser.id]);

      // Optimistically update cache
      queryClient.setQueryData(["users", updatedUser.id], updatedUser);

      return { previousUser };
    },
    onError: (err, updatedUser, context) => {
      // Rollback on error
      queryClient.setQueryData(["users", updatedUser.id], context.previousUser);
    },
    onSettled: (data, error, updatedUser) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["users", updatedUser.id] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userAPI.deleteUser,
    onSuccess: (_, deletedUserId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ["users", deletedUserId] });

      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

// Components using TanStack Query
function UsersList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching, isPreviousData } = useUsers(page, 10);

  const deleteUserMutation = useDeleteUser();

  const handleDelete = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUserMutation.mutateAsync(userId);
      } catch (error) {
        alert("Failed to delete user");
      }
    }
  };

  if (isLoading) return <div className="loading">Loading users...</div>;

  if (isError) {
    return <div className="error">Error: {error.message}</div>;
  }

  return (
    <div className="users-list">
      <h2>Users Management</h2>

      {isFetching && <div className="fetching">Updating...</div>}

      <div className="users-grid">
        {data.users.map((user) => (
          <div key={user.id} className="user-card">
            <img src={user.avatar} alt={user.name} />
            <h3>{user.name}</h3>
            <p>{user.email}</p>
            <div className="actions">
              <Link to={`/users/${user.id}`}>View</Link>
              <button onClick={() => handleDelete(user.id)} disabled={deleteUserMutation.isLoading}>
                {deleteUserMutation.isLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pagination">
        <button onClick={() => setPage(page - 1)} disabled={page === 1}>
          Previous
        </button>

        <span>
          Page {page} of {data.totalPages}
        </span>

        <button onClick={() => setPage(page + 1)} disabled={isPreviousData || page === data.totalPages}>
          Next
        </button>
      </div>
    </div>
  );
}

function CreateUserForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user",
  });

  const createUserMutation = useCreateUser();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await createUserMutation.mutateAsync(formData);
      setFormData({ name: "", email: "", role: "user" });
      alert("User created successfully!");
    } catch (error) {
      alert("Failed to create user");
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="create-user-form">
      <h2>Create New User</h2>

      <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} required />

      <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />

      <select name="role" value={formData.role} onChange={handleChange}>
        <option value="user">User</option>
        <option value="admin">Admin</option>
        <option value="moderator">Moderator</option>
      </select>

      <button type="submit" disabled={createUserMutation.isLoading}>
        {createUserMutation.isLoading ? "Creating..." : "Create User"}
      </button>

      {createUserMutation.error && <div className="error">Error: {createUserMutation.error.message}</div>}
    </form>
  );
}

// Advanced: Infinite Queries for feeds
function useInfinitePosts() {
  return useInfiniteQuery({
    queryKey: ["posts"],
    queryFn: ({ pageParam = 0 }) => fetch(`/api/posts?cursor=${pageParam}`).then((res) => res.json()),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

function PostsFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfinitePosts();

  const loadMoreRef = useRef(null);

  // Intersection Observer for auto-loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <div>Loading posts...</div>;
  if (isError) return <div>Error loading posts</div>;

  return (
    <div className="posts-feed">
      {data.pages.map((page, pageIndex) => (
        <div key={pageIndex}>
          {page.posts.map((post) => (
            <div key={post.id} className="post">
              <h3>{post.title}</h3>
              <p>{post.content}</p>
              <small>By {post.author.name}</small>
            </div>
          ))}
        </div>
      ))}

      <div ref={loadMoreRef} className="load-more">
        {isFetchingNextPage ? "Loading more..." : "Scroll for more"}
      </div>
    </div>
  );
}
```

**📚 Real-World TanStack Query Examples:**

1. **Social Media Feeds**: Infinite scrolling, real-time updates
2. **E-commerce Products**: Search, filtering, recommendations
3. **Dashboard Analytics**: Charts, metrics, real-time data
4. **Chat Applications**: Message history, user presence
5. **Content Management**: Articles, media, user-generated content
6. **Project Management**: Tasks, comments, file uploads
7. **Financial Apps**: Transaction history, account balances

---

## Decision Framework

### Choosing the Right State Management Tool

```jsx
// Decision Tree for State Management
function StateManagementDecision() {
  return (
    <div className="decision-tree">
      <h3>State Management Decision Framework</h3>

      <div className="decision-node">
        <h4>1. Is this server data?</h4>
        <div className="options">
          <div className="option yes">
            <strong>YES</strong> → Use TanStack Query
            <ul>
              <li>API responses</li>
              <li>User profiles</li>
              <li>Product catalogs</li>
              <li>Real-time data</li>
            </ul>
          </div>
          <div className="option no">
            <strong>NO</strong> → Continue to question 2
          </div>
        </div>
      </div>

      <div className="decision-node">
        <h4>2. Is this component-local state?</h4>
        <div className="options">
          <div className="option yes">
            <strong>YES</strong> → Use useState/useReducer
            <ul>
              <li>Form inputs</li>
              <li>Modal open/close</li>
              <li>Component-specific toggles</li>
              <li>Local calculations</li>
            </ul>
          </div>
          <div className="option no">
            <strong>NO</strong> → Continue to question 3
          </div>
        </div>
      </div>

      <div className="decision-node">
        <h4>3. How complex is your state logic?</h4>
        <div className="options">
          <div className="option simple">
            <strong>SIMPLE</strong> → Use Context + useReducer or Zustand
            <ul>
              <li>Theme preferences</li>
              <li>User authentication</li>
              <li>Language settings</li>
              <li>Simple global flags</li>
            </ul>
          </div>
          <div className="option complex">
            <strong>COMPLEX</strong> → Use Redux Toolkit
            <ul>
              <li>Shopping carts</li>
              <li>Multi-step workflows</li>
              <li>Complex business logic</li>
              <li>Time-travel debugging needed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Hybrid Approach Example

Most real applications use a combination of state management tools:

```jsx
// Real-world app combining all approaches
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {" "}
        {/* Context for auth state */}
        <Provider store={reduxStore}>
          {" "}
          {/* Redux for complex logic */}
          <Router>
            <ThemeProvider>
              {" "}
              {/* Zustand for UI preferences */}
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Routes>
            </ThemeProvider>
          </Router>
        </Provider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Different components using different state management
function Dashboard() {
  // Server state with TanStack Query
  const { data: analytics } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
  });

  // Global UI state with Zustand
  const { theme, sidebarOpen } = useUIStore();

  // Complex local state with useReducer
  const [filterState, filterDispatch] = useReducer(filterReducer, initialFilters);

  // Simple local state with useState
  const [selectedChart, setSelectedChart] = useState("revenue");

  return (
    <div className={`dashboard theme-${theme}`}>
      <Sidebar open={sidebarOpen} />
      <main>
        <AnalyticsCharts data={analytics} filters={filterState} selectedChart={selectedChart} />
      </main>
    </div>
  );
}
```

## Summary & Next Steps

You've now mastered modern state management in React! Here's what you should be comfortable with:

✅ **State Types**: Understanding client-side vs server-side state  
✅ **Redux Toolkit**: Complex state logic with predictable updates  
✅ **Zustand**: Lightweight global state with minimal boilerplate  
✅ **TanStack Query**: Server state management with caching and synchronization  
✅ **Decision Framework**: Choosing the right tool for the right job

**🎯 Key Takeaways:**

- Use TanStack Query for all server state
- Redux Toolkit for complex client-side logic
- Zustand for simple global state
- Context for stable, infrequently changing values
- useState/useReducer for component-local state

**📈 Next Steps:**
Ready to build scalable component architectures? Continue with [Component Design & Architecture](./03-component-architecture.md) to learn about component patterns, styling strategies, and routing.

---

_💡 Pro Tip: Start simple with useState and Context, then gradually introduce more sophisticated tools as your application grows in complexity._
