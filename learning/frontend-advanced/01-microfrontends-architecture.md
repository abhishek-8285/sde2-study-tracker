# Micro-frontends Architecture for SDE2+ Engineers 🏗️

## 🎯 **Overview**

Micro-frontends extend the microservices concept to frontend development, allowing teams to work independently on different parts of a web application. This guide covers practical implementation of micro-frontend architectures using Module Federation, Single-SPA, and other modern approaches.

## 📚 **Micro-frontends Fundamentals**

### **What are Micro-frontends?**

- **Independent Development** - Teams work on separate frontend applications
- **Independent Deployment** - Deploy parts of the frontend independently
- **Technology Agnostic** - Different frameworks can coexist
- **Team Autonomy** - Each team owns their entire stack
- **Scalable Architecture** - Scale development across multiple teams

### **When to Use Micro-frontends**

✅ **Large teams** (10+ developers)  
✅ **Multiple product areas** with different requirements  
✅ **Legacy migration** (gradual modernization)  
✅ **Different technology needs** per team  
✅ **Independent release cycles** required

❌ **Small teams** (< 5 developers)  
❌ **Simple applications** with unified functionality  
❌ **Tight coupling** between features  
❌ **Performance-critical** applications (additional overhead)

---

## 🔧 **Module Federation Implementation**

### **Webpack Module Federation Setup**

#### **Shell Application (Host)**

```javascript
// webpack.config.js (Shell/Host)
const ModuleFederationPlugin = require('@module-federation/webpack');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  target: 'web',
  devServer: {
    port: 3000,
    historyApiFallback: true,
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        productCatalog: 'productCatalog@http://localhost:3001/remoteEntry.js',
        shoppingCart: 'shoppingCart@http://localhost:3002/remoteEntry.js',
        userProfile: 'userProfile@http://localhost:3003/remoteEntry.js',
        payment: 'payment@http://localhost:3004/remoteEntry.js',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.0.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.0.0',
        },
        '@shared/design-system': {
          singleton: true,
          requiredVersion: '^1.0.0',
        },
        '@shared/utils': {
          singleton: true,
          requiredVersion: '^1.0.0',
        },
      },
    }),
  ],
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: ['@babel/preset-react'],
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
};

// src/App.jsx (Shell Application)
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorFallback from './components/ErrorFallback';

// Lazy load micro-frontends
const ProductCatalog = lazy(() => import('productCatalog/ProductCatalogApp'));
const ShoppingCart = lazy(() => import('shoppingCart/ShoppingCartApp'));
const UserProfile = lazy(() => import('userProfile/UserProfileApp'));
const Payment = lazy(() => import('payment/PaymentApp'));

const App = () => {
  return (
    <Router>
      <div className="app">
        <Header />
        <Navigation />

        <main className="main-content">
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<Navigate to="/products" replace />} />
                <Route path="/products/*" element={<ProductCatalog />} />
                <Route path="/cart/*" element={<ShoppingCart />} />
                <Route path="/profile/*" element={<UserProfile />} />
                <Route path="/payment/*" element={<Payment />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>

        <Footer />
      </div>
    </Router>
  );
};

export default App;

// src/components/Header.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@shared/auth';
import { Button } from '@shared/design-system';

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">
          E-Commerce
        </Link>

        <nav className="header-nav">
          <Link to="/products">Products</Link>
          <Link to="/cart">Cart</Link>
          {user && <Link to="/profile">Profile</Link>}
        </nav>

        <div className="header-actions">
          {user ? (
            <div className="user-menu">
              <span>Welcome, {user.name}</span>
              <Button onClick={logout} variant="outline">
                Logout
              </Button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Button variant="outline">Login</Button>
              <Button variant="primary">Sign Up</Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
```

#### **Product Catalog Micro-frontend**

```javascript
// webpack.config.js (Product Catalog Remote)
const ModuleFederationPlugin = require('@module-federation/webpack');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  target: 'web',
  devServer: {
    port: 3001,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'productCatalog',
      filename: 'remoteEntry.js',
      exposes: {
        './ProductCatalogApp': './src/ProductCatalogApp',
        './ProductCard': './src/components/ProductCard',
        './ProductList': './src/components/ProductList',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.0.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.0.0',
        },
        '@shared/design-system': {
          singleton: true,
          requiredVersion: '^1.0.0',
        },
        '@shared/utils': {
          singleton: true,
          requiredVersion: '^1.0.0',
        },
      },
    }),
  ],
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: ['@babel/preset-react'],
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
};

// src/ProductCatalogApp.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProductList from './components/ProductList';
import ProductDetail from './components/ProductDetail';
import ProductSearch from './components/ProductSearch';
import { ProductProvider } from './context/ProductContext';

const ProductCatalogApp = () => {
  return (
    <ProductProvider>
      <div className="product-catalog">
        <Routes>
          <Route path="/" element={<ProductList />} />
          <Route path="/search" element={<ProductSearch />} />
          <Route path="/product/:id" element={<ProductDetail />} />
        </Routes>
      </div>
    </ProductProvider>
  );
};

export default ProductCatalogApp;

// src/components/ProductList.jsx
import React, { useState, useEffect } from 'react';
import { Grid, Card, Button, Input } from '@shared/design-system';
import { useProducts } from '../context/ProductContext';
import { formatCurrency } from '@shared/utils';
import ProductCard from './ProductCard';

const ProductList = () => {
  const { products, loading, error, fetchProducts, searchProducts } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    priceRange: '',
    inStock: false,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      await searchProducts(searchTerm, filters);
    } else {
      await fetchProducts();
    }
  };

  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);

    if (searchTerm) {
      searchProducts(searchTerm, newFilters);
    } else {
      fetchProducts(newFilters);
    }
  };

  if (loading) {
    return <div className="loading">Loading products...</div>;
  }

  if (error) {
    return <div className="error">Error loading products: {error.message}</div>;
  }

  return (
    <div className="product-list">
      <div className="product-list-header">
        <h1>Products</h1>

        <form onSubmit={handleSearch} className="search-form">
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button type="submit">Search</Button>
        </form>
      </div>

      <div className="filters">
        <select
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
          <option value="books">Books</option>
          <option value="home">Home & Garden</option>
        </select>

        <select
          value={filters.priceRange}
          onChange={(e) => handleFilterChange('priceRange', e.target.value)}
        >
          <option value="">Any Price</option>
          <option value="0-25">$0 - $25</option>
          <option value="25-50">$25 - $50</option>
          <option value="50-100">$50 - $100</option>
          <option value="100+">$100+</option>
        </select>

        <label>
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(e) => handleFilterChange('inStock', e.target.checked)}
          />
          In Stock Only
        </label>
      </div>

      <Grid columns={4} gap={20}>
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={(product) => {
              // Emit custom event for other micro-frontends
              window.dispatchEvent(new CustomEvent('addToCart', {
                detail: { product }
              }));
            }}
          />
        ))}
      </Grid>

      {products.length === 0 && (
        <div className="no-products">
          No products found. Try adjusting your search or filters.
        </div>
      )}
    </div>
  );
};

export default ProductList;

// src/components/ProductCard.jsx
import React from 'react';
import { Card, Button, Badge } from '@shared/design-system';
import { formatCurrency } from '@shared/utils';
import { Link } from 'react-router-dom';

const ProductCard = ({ product, onAddToCart }) => {
  const { id, name, price, image, category, inStock, rating, reviewCount } = product;

  return (
    <Card className="product-card">
      <div className="product-image">
        <img src={image} alt={name} />
        {!inStock && <Badge variant="error">Out of Stock</Badge>}
      </div>

      <div className="product-info">
        <div className="product-category">
          <Badge variant="secondary">{category}</Badge>
        </div>

        <h3 className="product-name">
          <Link to={`/products/product/${id}`}>{name}</Link>
        </h3>

        <div className="product-rating">
          <span className="stars">
            {'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}
          </span>
          <span className="review-count">({reviewCount} reviews)</span>
        </div>

        <div className="product-price">
          {formatCurrency(price)}
        </div>

        <div className="product-actions">
          <Button
            variant="primary"
            disabled={!inStock}
            onClick={() => onAddToCart(product)}
            fullWidth
          >
            {inStock ? 'Add to Cart' : 'Out of Stock'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;

// src/context/ProductContext.jsx
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { productAPI } from '../services/productAPI';

const ProductContext = createContext();

const initialState = {
  products: [],
  loading: false,
  error: null,
  filters: {},
};

const productReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_PRODUCTS_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_PRODUCTS_SUCCESS':
      return { ...state, loading: false, products: action.payload, error: null };
    case 'FETCH_PRODUCTS_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    default:
      return state;
  }
};

export const ProductProvider = ({ children }) => {
  const [state, dispatch] = useReducer(productReducer, initialState);

  const fetchProducts = useCallback(async (filters = {}) => {
    dispatch({ type: 'FETCH_PRODUCTS_START' });

    try {
      const products = await productAPI.getProducts(filters);
      dispatch({ type: 'FETCH_PRODUCTS_SUCCESS', payload: products });
    } catch (error) {
      dispatch({ type: 'FETCH_PRODUCTS_ERROR', payload: error });
    }
  }, []);

  const searchProducts = useCallback(async (searchTerm, filters = {}) => {
    dispatch({ type: 'FETCH_PRODUCTS_START' });

    try {
      const products = await productAPI.searchProducts(searchTerm, filters);
      dispatch({ type: 'FETCH_PRODUCTS_SUCCESS', payload: products });
    } catch (error) {
      dispatch({ type: 'FETCH_PRODUCTS_ERROR', payload: error });
    }
  }, []);

  const setFilters = useCallback((filters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const value = {
    ...state,
    fetchProducts,
    searchProducts,
    setFilters,
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within ProductProvider');
  }
  return context;
};
```

#### **Shopping Cart Micro-frontend**

```javascript
// src/ShoppingCartApp.jsx
import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import CartView from './components/CartView';
import Checkout from './components/Checkout';
import { CartProvider, useCart } from './context/CartContext';

const ShoppingCartApp = () => {
  const { addItem } = useCart();

  // Listen for add to cart events from other micro-frontends
  useEffect(() => {
    const handleAddToCart = (event) => {
      const { product } = event.detail;
      addItem(product);
    };

    window.addEventListener('addToCart', handleAddToCart);

    return () => {
      window.removeEventListener('addToCart', handleAddToCart);
    };
  }, [addItem]);

  return (
    <div className="shopping-cart-app">
      <Routes>
        <Route path="/" element={<CartView />} />
        <Route path="/checkout" element={<Checkout />} />
      </Routes>
    </div>
  );
};

const WrappedShoppingCartApp = () => (
  <CartProvider>
    <ShoppingCartApp />
  </CartProvider>
);

export default WrappedShoppingCartApp;

// src/components/CartView.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@shared/design-system';
import { formatCurrency } from '@shared/utils';
import { useCart } from '../context/CartContext';
import CartItem from './CartItem';

const CartView = () => {
  const { items, total, itemCount, clearCart } = useCart();

  if (itemCount === 0) {
    return (
      <div className="empty-cart">
        <h2>Your cart is empty</h2>
        <p>Add some products to get started!</p>
        <Link to="/products">
          <Button variant="primary">Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="cart-view">
      <div className="cart-header">
        <h1>Shopping Cart ({itemCount} items)</h1>
        <Button variant="outline" onClick={clearCart}>
          Clear Cart
        </Button>
      </div>

      <div className="cart-content">
        <div className="cart-items">
          {items.map(item => (
            <CartItem key={item.id} item={item} />
          ))}
        </div>

        <div className="cart-summary">
          <Card>
            <h3>Order Summary</h3>

            <div className="summary-line">
              <span>Subtotal:</span>
              <span>{formatCurrency(total)}</span>
            </div>

            <div className="summary-line">
              <span>Shipping:</span>
              <span>Free</span>
            </div>

            <div className="summary-line">
              <span>Tax:</span>
              <span>{formatCurrency(total * 0.08)}</span>
            </div>

            <div className="summary-total">
              <span>Total:</span>
              <span>{formatCurrency(total * 1.08)}</span>
            </div>

            <div className="cart-actions">
              <Link to="/payment/checkout">
                <Button variant="primary" fullWidth>
                  Proceed to Checkout
                </Button>
              </Link>

              <Link to="/products">
                <Button variant="outline" fullWidth>
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CartView;

// src/context/CartContext.jsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';

const CartContext = createContext();

const initialState = {
  items: [],
  total: 0,
  itemCount: 0,
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id);

      if (existingItem) {
        const updatedItems = state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
        return calculateTotals({ ...state, items: updatedItems });
      } else {
        const newItem = { ...action.payload, quantity: 1 };
        return calculateTotals({ ...state, items: [...state.items, newItem] });
      }
    }

    case 'UPDATE_QUANTITY': {
      const updatedItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      ).filter(item => item.quantity > 0);

      return calculateTotals({ ...state, items: updatedItems });
    }

    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter(item => item.id !== action.payload.id);
      return calculateTotals({ ...state, items: updatedItems });
    }

    case 'CLEAR_CART':
      return initialState;

    case 'LOAD_CART':
      return calculateTotals({ ...state, items: action.payload });

    default:
      return state;
  }
};

const calculateTotals = (state) => {
  const total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

  return { ...state, total, itemCount };
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('shopping-cart');
    if (savedCart) {
      try {
        const items = JSON.parse(savedCart);
        dispatch({ type: 'LOAD_CART', payload: items });
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('shopping-cart', JSON.stringify(state.items));

    // Emit cart change event for other micro-frontends
    window.dispatchEvent(new CustomEvent('cartChanged', {
      detail: { items: state.items, total: state.total, itemCount: state.itemCount }
    }));
  }, [state.items, state.total, state.itemCount]);

  const addItem = (product) => {
    dispatch({ type: 'ADD_ITEM', payload: product });
  };

  const updateQuantity = (id, quantity) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const removeItem = (id) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const value = {
    ...state,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
```

---

## 🔧 **Single-SPA Implementation**

### **Root Config Setup**

```javascript
// src/index.js (Root Config)
import { registerApplication, start } from "single-spa";

// Import map for micro-frontends
const importMapOverrides = {
  "@ecommerce/shell": "http://localhost:3000/main.js",
  "@ecommerce/product-catalog": "http://localhost:3001/main.js",
  "@ecommerce/shopping-cart": "http://localhost:3002/main.js",
  "@ecommerce/user-profile": "http://localhost:3003/main.js",
  "@ecommerce/payment": "http://localhost:3004/main.js",
};

// Register applications
registerApplication({
  name: "@ecommerce/shell",
  app: () => System.import("@ecommerce/shell"),
  activeWhen: ["/"],
});

registerApplication({
  name: "@ecommerce/product-catalog",
  app: () => System.import("@ecommerce/product-catalog"),
  activeWhen: ["/products"],
});

registerApplication({
  name: "@ecommerce/shopping-cart",
  app: () => System.import("@ecommerce/shopping-cart"),
  activeWhen: ["/cart"],
});

registerApplication({
  name: "@ecommerce/user-profile",
  app: () => System.import("@ecommerce/user-profile"),
  activeWhen: ["/profile"],
});

registerApplication({
  name: "@ecommerce/payment",
  app: () => System.import("@ecommerce/payment"),
  activeWhen: ["/payment"],
});

// Start single-spa
start({
  urlRerouteOnly: true,
});

// Single-SPA application wrapper
// src/single-spa-app.js (for each micro-frontend)
import React from "react";
import ReactDOM from "react-dom";
import singleSpaReact from "single-spa-react";
import App from "./App";

const lifecycles = singleSpaReact({
  React,
  ReactDOM,
  rootComponent: App,
  errorBoundary(err, info, props) {
    return (
      <div style={{ color: "red" }}>
        <h2>Error in {props.name}</h2>
        <p>{err.message}</p>
      </div>
    );
  },
});

export const { bootstrap, mount, unmount } = lifecycles;
```

---

## 🔄 **Inter-Micro-frontend Communication**

### **Event Bus Implementation**

```javascript
// shared/event-bus.js
class EventBus {
  constructor() {
    this.events = {};
  }

  subscribe(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    this.events[eventName].push(callback);

    // Return unsubscribe function
    return () => {
      this.events[eventName] = this.events[eventName].filter((cb) => cb !== callback);
    };
  }

  emit(eventName, data) {
    if (this.events[eventName]) {
      this.events[eventName].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${eventName}:`, error);
        }
      });
    }
  }

  once(eventName, callback) {
    const unsubscribe = this.subscribe(eventName, (data) => {
      callback(data);
      unsubscribe();
    });

    return unsubscribe;
  }

  clear(eventName) {
    if (eventName) {
      delete this.events[eventName];
    } else {
      this.events = {};
    }
  }
}

// Global event bus instance
const eventBus = new EventBus();

// Predefined event types for type safety
export const EVENTS = {
  USER_LOGGED_IN: "user:logged-in",
  USER_LOGGED_OUT: "user:logged-out",
  CART_ITEM_ADDED: "cart:item-added",
  CART_ITEM_REMOVED: "cart:item-removed",
  CART_CLEARED: "cart:cleared",
  PRODUCT_VIEWED: "product:viewed",
  ORDER_COMPLETED: "order:completed",
  NAVIGATION_CHANGED: "navigation:changed",
};

export default eventBus;

// Usage in React components
import { useEffect, useCallback } from "react";
import eventBus, { EVENTS } from "@shared/event-bus";

export const useEventBus = () => {
  const subscribe = useCallback((eventName, callback) => {
    return eventBus.subscribe(eventName, callback);
  }, []);

  const emit = useCallback((eventName, data) => {
    eventBus.emit(eventName, data);
  }, []);

  const once = useCallback((eventName, callback) => {
    return eventBus.once(eventName, callback);
  }, []);

  return { subscribe, emit, once };
};

// Custom hook for specific events
export const useCartEvents = () => {
  const { subscribe, emit } = useEventBus();

  const subscribeToCartChanges = useCallback(
    (callback) => {
      const unsubscribes = [subscribe(EVENTS.CART_ITEM_ADDED, callback), subscribe(EVENTS.CART_ITEM_REMOVED, callback), subscribe(EVENTS.CART_CLEARED, callback)];

      return () => {
        unsubscribes.forEach((unsub) => unsub());
      };
    },
    [subscribe]
  );

  const emitCartItemAdded = useCallback(
    (item) => {
      emit(EVENTS.CART_ITEM_ADDED, { item });
    },
    [emit]
  );

  const emitCartItemRemoved = useCallback(
    (itemId) => {
      emit(EVENTS.CART_ITEM_REMOVED, { itemId });
    },
    [emit]
  );

  const emitCartCleared = useCallback(() => {
    emit(EVENTS.CART_CLEARED, {});
  }, [emit]);

  return {
    subscribeToCartChanges,
    emitCartItemAdded,
    emitCartItemRemoved,
    emitCartCleared,
  };
};
```

### **Shared State Management**

```javascript
// shared/store.js
import { createStore, combineReducers } from "redux";
import { Provider, useSelector, useDispatch } from "react-redux";

// Shared state slices
const authReducer = (state = { user: null, isAuthenticated: false }, action) => {
  switch (action.type) {
    case "AUTH_LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
      };
    case "AUTH_LOGOUT":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
      };
    default:
      return state;
  }
};

const cartReducer = (state = { items: [], total: 0 }, action) => {
  switch (action.type) {
    case "CART_ADD_ITEM":
      // Cart logic here
      return state;
    case "CART_REMOVE_ITEM":
      // Remove logic here
      return state;
    case "CART_CLEAR":
      return { items: [], total: 0 };
    default:
      return state;
  }
};

const rootReducer = combineReducers({
  auth: authReducer,
  cart: cartReducer,
});

// Create store
export const store = createStore(rootReducer);

// Action creators
export const authActions = {
  loginSuccess: (user) => ({ type: "AUTH_LOGIN_SUCCESS", payload: { user } }),
  logout: () => ({ type: "AUTH_LOGOUT" }),
};

export const cartActions = {
  addItem: (item) => ({ type: "CART_ADD_ITEM", payload: { item } }),
  removeItem: (itemId) => ({ type: "CART_REMOVE_ITEM", payload: { itemId } }),
  clear: () => ({ type: "CART_CLEAR" }),
};

// Shared hooks
export const useAuth = () => {
  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  return {
    ...auth,
    login: (user) => dispatch(authActions.loginSuccess(user)),
    logout: () => dispatch(authActions.logout()),
  };
};

export const useSharedCart = () => {
  const cart = useSelector((state) => state.cart);
  const dispatch = useDispatch();

  return {
    ...cart,
    addItem: (item) => dispatch(cartActions.addItem(item)),
    removeItem: (itemId) => dispatch(cartActions.removeItem(itemId)),
    clear: () => dispatch(cartActions.clear()),
  };
};

// Provider wrapper for micro-frontends
export const SharedStoreProvider = ({ children }) => <Provider store={store}>{children}</Provider>;
```

---

## 🎨 **Shared Design System**

### **Design System Package**

```javascript
// packages/design-system/src/index.js
export { default as Button } from "./components/Button";
export { default as Input } from "./components/Input";
export { default as Card } from "./components/Card";
export { default as Modal } from "./components/Modal";
export { default as Grid } from "./components/Grid";
export { default as Badge } from "./components/Badge";

// Theme provider
export { ThemeProvider, useTheme } from "./theme/ThemeProvider";
export { lightTheme, darkTheme } from "./theme/themes";

// packages/design-system/src/components/Button.jsx
import React from "react";
import styled, { css } from "styled-components";

const StyledButton = styled.button`
  border: none;
  border-radius: ${(props) => props.theme.borderRadius.md};
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  font-family: ${(props) => props.theme.fonts.primary};
  font-weight: ${(props) => props.theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.2s ease;

  ${(props) =>
    props.variant === "primary" &&
    css`
      background-color: ${props.theme.colors.primary};
      color: ${props.theme.colors.white};

      &:hover {
        background-color: ${props.theme.colors.primaryDark};
      }
    `}

  ${(props) =>
    props.variant === "outline" &&
    css`
      background-color: transparent;
      color: ${props.theme.colors.primary};
      border: 1px solid ${props.theme.colors.primary};

      &:hover {
        background-color: ${props.theme.colors.primary};
        color: ${props.theme.colors.white};
      }
    `}
  
  ${(props) =>
    props.fullWidth &&
    css`
      width: 100%;
    `}
  
  ${(props) =>
    props.disabled &&
    css`
      opacity: 0.6;
      cursor: not-allowed;

      &:hover {
        background-color: ${props.variant === "primary" ? props.theme.colors.primary : "transparent"};
      }
    `}
`;

const Button = ({ children, variant = "primary", fullWidth = false, disabled = false, onClick, type = "button", ...props }) => {
  return (
    <StyledButton variant={variant} fullWidth={fullWidth} disabled={disabled} onClick={onClick} type={type} {...props}>
      {children}
    </StyledButton>
  );
};

export default Button;

// packages/design-system/src/theme/ThemeProvider.jsx
import React, { createContext, useContext } from "react";
import { ThemeProvider as StyledThemeProvider } from "styled-components";
import { lightTheme } from "./themes";

const ThemeContext = createContext();

export const ThemeProvider = ({ theme = lightTheme, children }) => {
  return (
    <ThemeContext.Provider value={theme}>
      <StyledThemeProvider theme={theme}>{children}</StyledThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

// packages/design-system/src/theme/themes.js
export const lightTheme = {
  colors: {
    primary: "#007bff",
    primaryDark: "#0056b3",
    secondary: "#6c757d",
    success: "#28a745",
    danger: "#dc3545",
    warning: "#ffc107",
    info: "#17a2b8",
    white: "#ffffff",
    black: "#000000",
    gray100: "#f8f9fa",
    gray200: "#e9ecef",
    gray300: "#dee2e6",
    gray400: "#ced4da",
    gray500: "#adb5bd",
  },
  fonts: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"Fira Code", "Monaco", "Consolas", monospace',
  },
  fontSizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
  },
  borderRadius: {
    sm: "0.125rem",
    md: "0.25rem",
    lg: "0.5rem",
    xl: "1rem",
    full: "50%",
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
  },
};

export const darkTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    primary: "#0084ff",
    primaryDark: "#0066cc",
    white: "#1a1a1a",
    black: "#ffffff",
    gray100: "#2d2d2d",
    gray200: "#3d3d3d",
    gray300: "#4d4d4d",
    gray400: "#5d5d5d",
    gray500: "#6d6d6d",
  },
};
```

---

## 🚀 **Deployment & CI/CD**

### **Independent Deployment Pipeline**

```yaml
# .github/workflows/product-catalog-deploy.yml
name: Deploy Product Catalog

on:
  push:
    branches: [main]
    paths: ["product-catalog/**"]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
        working-directory: ./product-catalog
      - run: npm run test
        working-directory: ./product-catalog
      - run: npm run test:e2e
        working-directory: ./product-catalog

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
        working-directory: ./product-catalog
      - run: npm run build
        working-directory: ./product-catalog
        env:
          REACT_APP_API_URL: ${{ secrets.API_URL }}

      - name: Deploy to CDN
        run: |
          aws s3 sync ./product-catalog/dist/ s3://microfrontends-bucket/product-catalog/ --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/product-catalog/*"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

  integration-test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run integration tests
        run: npm run test:integration
        env:
          PRODUCT_CATALOG_URL: https://cdn.example.com/product-catalog/remoteEntry.js
```

### **Container Deployment**

```dockerfile
# Dockerfile.product-catalog
FROM node:18-alpine as build

WORKDIR /app
COPY product-catalog/package*.json ./
RUN npm ci

COPY product-catalog/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```yaml
# docker-compose.yml
version: "3.8"
services:
  shell:
    build:
      context: .
      dockerfile: Dockerfile.shell
    ports:
      - "3000:80"
    environment:
      - PRODUCT_CATALOG_URL=http://product-catalog/remoteEntry.js
      - SHOPPING_CART_URL=http://shopping-cart/remoteEntry.js

  product-catalog:
    build:
      context: .
      dockerfile: Dockerfile.product-catalog
    ports:
      - "3001:80"

  shopping-cart:
    build:
      context: .
      dockerfile: Dockerfile.shopping-cart
    ports:
      - "3002:80"
```

---

## 📊 **Monitoring & Observability**

### **Micro-frontend Monitoring**

```javascript
// shared/monitoring.js
class MicroFrontendMonitoring {
  constructor() {
    this.metrics = {
      loadTimes: new Map(),
      errors: new Map(),
      interactions: new Map(),
    };

    this.setupErrorTracking();
    this.setupPerformanceMonitoring();
  }

  trackMicroFrontendLoad(name, startTime, endTime) {
    const loadTime = endTime - startTime;

    if (!this.metrics.loadTimes.has(name)) {
      this.metrics.loadTimes.set(name, []);
    }

    this.metrics.loadTimes.get(name).push(loadTime);

    // Send to analytics
    this.sendMetric("microfrontend_load_time", {
      name,
      loadTime,
      timestamp: Date.now(),
    });
  }

  trackError(microfrontendName, error, context = {}) {
    const errorInfo = {
      name: microfrontendName,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
    };

    if (!this.metrics.errors.has(microfrontendName)) {
      this.metrics.errors.set(microfrontendName, []);
    }

    this.metrics.errors.get(microfrontendName).push(errorInfo);

    // Send to error tracking service
    this.sendError(errorInfo);
  }

  trackInteraction(microfrontendName, action, metadata = {}) {
    const interaction = {
      name: microfrontendName,
      action,
      metadata,
      timestamp: Date.now(),
    };

    if (!this.metrics.interactions.has(microfrontendName)) {
      this.metrics.interactions.set(microfrontendName, []);
    }

    this.metrics.interactions.get(microfrontendName).push(interaction);

    // Send to analytics
    this.sendMetric("microfrontend_interaction", interaction);
  }

  setupErrorTracking() {
    window.addEventListener("error", (event) => {
      const microfrontendName = this.detectMicroFrontend(event.filename);
      this.trackError(microfrontendName, event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      const microfrontendName = this.detectMicroFrontend();
      this.trackError(microfrontendName, new Error(event.reason), {
        type: "unhandled_promise_rejection",
        reason: event.reason,
      });
    });
  }

  setupPerformanceMonitoring() {
    // Monitor micro-frontend loading
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes("remoteEntry.js")) {
          const microfrontendName = this.extractMicroFrontendName(entry.name);
          this.trackMicroFrontendLoad(microfrontendName, entry.startTime, entry.responseEnd);
        }
      });
    });

    observer.observe({ entryTypes: ["resource"] });
  }

  detectMicroFrontend(filename) {
    // Detect which micro-frontend based on filename or current route
    const url = filename || window.location.pathname;

    if (url.includes("product-catalog") || url.includes("/products")) {
      return "product-catalog";
    } else if (url.includes("shopping-cart") || url.includes("/cart")) {
      return "shopping-cart";
    } else if (url.includes("user-profile") || url.includes("/profile")) {
      return "user-profile";
    } else if (url.includes("payment") || url.includes("/payment")) {
      return "payment";
    }

    return "shell";
  }

  extractMicroFrontendName(url) {
    const match = url.match(/\/([^\/]+)\/remoteEntry\.js/);
    return match ? match[1] : "unknown";
  }

  sendMetric(metricName, data) {
    // Send to your analytics service (DataDog, New Relic, etc.)
    if (window.analytics) {
      window.analytics.track(metricName, data);
    }
  }

  sendError(errorInfo) {
    // Send to your error tracking service (Sentry, Bugsnag, etc.)
    if (window.Sentry) {
      window.Sentry.captureException(new Error(errorInfo.message), {
        tags: {
          microfrontend: errorInfo.name,
        },
        extra: errorInfo.context,
      });
    }
  }

  getMetrics() {
    return {
      loadTimes: Object.fromEntries(this.metrics.loadTimes),
      errors: Object.fromEntries(this.metrics.errors),
      interactions: Object.fromEntries(this.metrics.interactions),
    };
  }
}

// Initialize monitoring
const monitoring = new MicroFrontendMonitoring();

// Export for use in micro-frontends
export default monitoring;
```

---

## 🎯 **Best Practices Summary**

### **✅ Micro-frontends Checklist**

#### **Architecture Design**

- ✅ **Independent deployment** - Each micro-frontend can be deployed separately
- ✅ **Technology flexibility** - Teams can choose appropriate tech stacks
- ✅ **Shared dependencies** - Optimize bundle sizes with shared libraries
- ✅ **Communication patterns** - Event bus or shared state for coordination
- ✅ **Error boundaries** - Isolate failures between micro-frontends

#### **Development Practices**

- ✅ **Contract testing** - Ensure API compatibility between parts
- ✅ **Shared design system** - Consistent UI across micro-frontends
- ✅ **Code sharing** - Reusable utilities and components
- ✅ **Testing strategy** - Unit, integration, and E2E testing
- ✅ **Documentation** - Clear APIs and integration guidelines

#### **Production Considerations**

- ✅ **Performance monitoring** - Track loading times and errors
- ✅ **Graceful degradation** - Handle micro-frontend failures
- ✅ **Caching strategy** - Optimize asset loading and updates
- ✅ **Security** - Secure communication between micro-frontends
- ✅ **Rollback strategy** - Quick recovery from failed deployments

---

## 🚀 **Next Steps**

1. **Start small** - Begin with 2-3 micro-frontends
2. **Establish contracts** - Define clear APIs between parts
3. **Set up monitoring** - Track performance and errors
4. **Implement CI/CD** - Independent deployment pipelines
5. **Scale gradually** - Add more micro-frontends as teams grow

_Micro-frontends enable large-scale frontend development with team independence and technology flexibility. Master these patterns to build scalable, maintainable frontend architectures!_
