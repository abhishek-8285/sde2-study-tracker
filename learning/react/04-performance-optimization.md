# Performance Optimization 🚀

Master React performance optimization techniques to build lightning-fast applications that scale to millions of users.

## Table of Contents

- [Memoization Strategies](#memoization-strategies)
- [Code Splitting & Lazy Loading](#code-splitting--lazy-loading)
- [List Virtualization](#list-virtualization)
- [Bundle Optimization](#bundle-optimization)
- [Performance Monitoring](#performance-monitoring)

---

## Memoization Strategies

Memoization prevents unnecessary re-renders and expensive calculations, dramatically improving application performance.

### 1. React.memo for Component Memoization

`React.memo` prevents component re-renders when props haven't changed.

```jsx
import React, { memo, useState, useCallback, useMemo } from "react";

// Basic React.memo usage
const ExpensiveComponent = memo(function ExpensiveComponent({ data, onUpdate }) {
  console.log("ExpensiveComponent rendered");

  // Simulate expensive calculation
  const processedData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      computed: item.value * 2 + Math.random(),
    }));
  }, [data]);

  return (
    <div>
      {processedData.map((item) => (
        <div key={item.id} onClick={() => onUpdate(item.id)}>
          {item.name}: {item.computed}
        </div>
      ))}
    </div>
  );
});

// Custom comparison function for complex props
const UserCard = memo(
  function UserCard({ user, settings, onEdit }) {
    return (
      <div className="user-card">
        <h3>{user.name}</h3>
        <p>{user.email}</p>
        {settings.showPhone && <p>{user.phone}</p>}
        <button onClick={() => onEdit(user.id)}>Edit</button>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison - only re-render if user data or relevant settings change
    return prevProps.user.id === nextProps.user.id && prevProps.user.name === nextProps.user.name && prevProps.user.email === nextProps.user.email && prevProps.user.phone === nextProps.user.phone && prevProps.settings.showPhone === nextProps.settings.showPhone;
  }
);

// Example parent component
function UsersList() {
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({ showPhone: false });
  const [count, setCount] = useState(0); // This change won't re-render UserCard

  const handleEditUser = useCallback((userId) => {
    console.log("Editing user:", userId);
    // Edit logic here
  }, []);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>

      <label>
        <input type="checkbox" checked={settings.showPhone} onChange={(e) => setSettings({ ...settings, showPhone: e.target.checked })} />
        Show Phone Numbers
      </label>

      {users.map((user) => (
        <UserCard key={user.id} user={user} settings={settings} onEdit={handleEditUser} />
      ))}
    </div>
  );
}
```

### 2. useCallback for Function Memoization

`useCallback` memoizes functions to prevent child components from re-rendering unnecessarily.

```jsx
// Product list with optimized callbacks
function ProductsList({ products, onProductUpdate, onProductDelete }) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  // ❌ Bad: New function created on every render
  const handleUpdate = (id, updates) => {
    onProductUpdate(id, updates);
  };

  // ✅ Good: Memoized function
  const handleUpdate = useCallback(
    (id, updates) => {
      onProductUpdate(id, updates);
    },
    [onProductUpdate]
  );

  // ✅ Good: Memoized function with dependencies
  const handleDelete = useCallback(
    (id) => {
      if (window.confirm("Are you sure?")) {
        onProductDelete(id);
      }
    },
    [onProductDelete]
  );

  // Memoized filter function
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => selectedCategory === "all" || product.category === selectedCategory)
      .sort((a, b) => {
        switch (sortBy) {
          case "name":
            return a.name.localeCompare(b.name);
          case "price":
            return a.price - b.price;
          case "rating":
            return b.rating - a.rating;
          default:
            return 0;
        }
      });
  }, [products, selectedCategory, sortBy]);

  return (
    <div>
      <div className="filters">
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option value="all">All Categories</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
          <option value="books">Books</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Sort by Name</option>
          <option value="price">Sort by Price</option>
          <option value="rating">Sort by Rating</option>
        </select>
      </div>

      <div className="products-grid">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} onUpdate={handleUpdate} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}

// Optimized ProductCard component
const ProductCard = memo(function ProductCard({ product, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(product);

  const handleSave = useCallback(() => {
    onUpdate(product.id, editData);
    setIsEditing(false);
  }, [product.id, editData, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditData(product);
    setIsEditing(false);
  }, [product]);

  const handleDelete = useCallback(() => {
    onDelete(product.id);
  }, [product.id, onDelete]);

  if (isEditing) {
    return (
      <div className="product-card editing">
        <input value={editData.name} onChange={(e) => setEditData((prev) => ({ ...prev, name: e.target.value }))} />
        <input type="number" value={editData.price} onChange={(e) => setEditData((prev) => ({ ...prev, price: Number(e.target.value) }))} />
        <div className="actions">
          <button onClick={handleSave}>Save</button>
          <button onClick={handleCancel}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <div className="actions">
        <button onClick={() => setIsEditing(true)}>Edit</button>
        <button onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
});
```

### 3. useMemo for Expensive Calculations

`useMemo` memoizes the result of expensive calculations.

```jsx
// Complex data processing with useMemo
function AnalyticsDashboard({ data, dateRange, filters }) {
  // Expensive calculation - only recalculate when dependencies change
  const processedAnalytics = useMemo(() => {
    console.log("Processing analytics data...");

    // Filter data by date range
    const filteredData = data.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= dateRange.start && itemDate <= dateRange.end;
    });

    // Apply additional filters
    const filteredByCategory = filteredData.filter((item) => {
      if (filters.category && filters.category !== "all") {
        return item.category === filters.category;
      }
      return true;
    });

    // Calculate metrics
    const totalRevenue = filteredByCategory.reduce((sum, item) => sum + item.revenue, 0);
    const totalOrders = filteredByCategory.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Group by period
    const groupedByPeriod = filteredByCategory.reduce((acc, item) => {
      const period = item.date.substring(0, 7); // YYYY-MM
      if (!acc[period]) {
        acc[period] = { revenue: 0, orders: 0 };
      }
      acc[period].revenue += item.revenue;
      acc[period].orders += 1;
      return acc;
    }, {});

    // Calculate growth rates
    const periods = Object.keys(groupedByPeriod).sort();
    const growthData = periods.map((period, index) => {
      const current = groupedByPeriod[period];
      const previous = index > 0 ? groupedByPeriod[periods[index - 1]] : null;

      const revenueGrowth = previous ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0;

      return {
        period,
        revenue: current.revenue,
        orders: current.orders,
        revenueGrowth,
      };
    });

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      growthData,
      topCategories: calculateTopCategories(filteredByCategory),
      trends: calculateTrends(growthData),
    };
  }, [data, dateRange, filters]);

  // Memoized chart data transformations
  const chartData = useMemo(() => {
    return {
      revenueChart: processedAnalytics.growthData.map((item) => ({
        x: item.period,
        y: item.revenue,
      })),
      ordersChart: processedAnalytics.growthData.map((item) => ({
        x: item.period,
        y: item.orders,
      })),
      growthChart: processedAnalytics.growthData.map((item) => ({
        x: item.period,
        y: item.revenueGrowth,
      })),
    };
  }, [processedAnalytics.growthData]);

  return (
    <div className="analytics-dashboard">
      <div className="metrics">
        <MetricCard title="Total Revenue" value={`$${processedAnalytics.totalRevenue.toLocaleString()}`} />
        <MetricCard title="Total Orders" value={processedAnalytics.totalOrders.toLocaleString()} />
        <MetricCard title="Average Order Value" value={`$${processedAnalytics.averageOrderValue.toFixed(2)}`} />
      </div>

      <div className="charts">
        <LineChart data={chartData.revenueChart} title="Revenue Trend" />
        <BarChart data={chartData.ordersChart} title="Orders Volume" />
        <LineChart data={chartData.growthChart} title="Growth Rate" />
      </div>

      <div className="insights">
        <TopCategories categories={processedAnalytics.topCategories} />
        <TrendAnalysis trends={processedAnalytics.trends} />
      </div>
    </div>
  );
}

function calculateTopCategories(data) {
  // Expensive category analysis
  return data.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = { revenue: 0, orders: 0 };
    }
    acc[item.category].revenue += item.revenue;
    acc[item.category].orders += 1;
    return acc;
  }, {});
}

function calculateTrends(growthData) {
  // Expensive trend analysis
  const recentGrowth = growthData.slice(-3).map((item) => item.revenueGrowth);
  const averageGrowth = recentGrowth.reduce((sum, rate) => sum + rate, 0) / recentGrowth.length;

  return {
    direction: averageGrowth > 0 ? "positive" : "negative",
    magnitude: Math.abs(averageGrowth),
    consistency: calculateConsistency(recentGrowth),
  };
}
```

### 4. Performance Anti-Patterns to Avoid

```jsx
// ❌ Anti-patterns that hurt performance

// 1. Creating objects/arrays in render
function BadComponent({ users, onUserClick }) {
  return (
    <div>
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          style={{ padding: "10px" }} // ❌ New object every render
          config={{ showAvatar: true }} // ❌ New object every render
          onClick={() => onUserClick(user.id)} // ❌ New function every render
        />
      ))}
    </div>
  );
}

// ✅ Correct approach
const userCardStyle = { padding: "10px" };
const userConfig = { showAvatar: true };

function GoodComponent({ users, onUserClick }) {
  const handleUserClick = useCallback(
    (userId) => {
      onUserClick(userId);
    },
    [onUserClick]
  );

  return (
    <div>
      {users.map((user) => (
        <UserCard key={user.id} user={user} style={userCardStyle} config={userConfig} onClick={handleUserClick} />
      ))}
    </div>
  );
}

// 2. Unnecessary useEffect dependencies
function BadEffectComponent({ userId, userData }) {
  const [profile, setProfile] = useState(null);

  // ❌ userData changes frequently, causing unnecessary API calls
  useEffect(() => {
    fetchUserProfile(userId).then(setProfile);
  }, [userId, userData]);

  return <div>{profile?.name}</div>;
}

function GoodEffectComponent({ userId, userData }) {
  const [profile, setProfile] = useState(null);

  // ✅ Only depend on what actually matters
  useEffect(() => {
    fetchUserProfile(userId).then(setProfile);
  }, [userId]);

  return <div>{profile?.name}</div>;
}

// 3. Inappropriate use of useMemo/useCallback
function OverOptimizedComponent({ name, age }) {
  // ❌ Unnecessary memoization for simple values
  const displayName = useMemo(() => {
    return name.toUpperCase();
  }, [name]);

  // ❌ Unnecessary callback for simple handler
  const handleClick = useCallback(() => {
    console.log("clicked");
  }, []);

  // ✅ Simple values don't need memoization
  const simpleDisplayName = name.toUpperCase();

  return (
    <div onClick={() => console.log("clicked")}>
      {simpleDisplayName} ({age})
    </div>
  );
}
```

---

## Code Splitting & Lazy Loading

Code splitting reduces initial bundle size by loading code only when needed.

### 1. Route-Based Code Splitting

```jsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Lazy load route components
const HomePage = lazy(() => import("./pages/HomePage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// Loading component
function LoadingSpinner() {
  return (
    <div className="loading-container">
      <div className="spinner" />
      <p>Loading...</p>
    </div>
  );
}

// Enhanced loading with skeleton
function PageSkeleton() {
  return (
    <div className="page-skeleton">
      <div className="skeleton-header" />
      <div className="skeleton-content">
        <div className="skeleton-line" />
        <div className="skeleton-line" />
        <div className="skeleton-line short" />
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navigation />
        <main>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}

// Advanced: Preload routes on hover
function NavigationLink({ to, children, preload = true }) {
  const handleMouseEnter = () => {
    if (preload) {
      // Preload the route component
      switch (to) {
        case "/products":
          import("./pages/ProductsPage");
          break;
        case "/profile":
          import("./pages/UserProfile");
          break;
        case "/admin":
          import("./pages/AdminDashboard");
          break;
      }
    }
  };

  return (
    <Link to={to} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  );
}
```

### 2. Component-Based Code Splitting

```jsx
// Large components that aren't always needed
const DataVisualization = lazy(() => import("./components/DataVisualization"));
const VideoPlayer = lazy(() => import("./components/VideoPlayer"));
const CodeEditor = lazy(() => import("./components/CodeEditor"));
const ChatWidget = lazy(() => import("./components/ChatWidget"));

function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="dashboard">
      <nav className="tabs">
        <button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>
          Overview
        </button>
        <button className={activeTab === "analytics" ? "active" : ""} onClick={() => setActiveTab("analytics")}>
          Analytics
        </button>
        <button className={activeTab === "media" ? "active" : ""} onClick={() => setActiveTab("media")}>
          Media
        </button>
      </nav>

      <div className="tab-content">
        {activeTab === "overview" && (
          <div>
            <h1>Dashboard Overview</h1>
            <p>Key metrics and quick actions...</p>
          </div>
        )}

        {activeTab === "analytics" && (
          <Suspense fallback={<div>Loading analytics...</div>}>
            <DataVisualization />
          </Suspense>
        )}

        {activeTab === "media" && (
          <Suspense fallback={<div>Loading media player...</div>}>
            <VideoPlayer src="/demo-video.mp4" />
          </Suspense>
        )}
      </div>

      <button className="chat-toggle" onClick={() => setShowChat(!showChat)}>
        💬 Support
      </button>

      {showChat && (
        <Suspense fallback={<div>Loading chat...</div>}>
          <ChatWidget />
        </Suspense>
      )}
    </div>
  );
}

// Dynamic imports with error handling
function useAsyncComponent(importFunc) {
  const [component, setComponent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadComponent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const module = await importFunc();
      setComponent(() => module.default);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [importFunc]);

  return { component, loading, error, loadComponent };
}

// Usage
function ConditionalCodeEditor({ showEditor, code, onChange }) {
  const { component: CodeEditor, loading, error, loadComponent } = useAsyncComponent(() => import("./CodeEditor"));

  useEffect(() => {
    if (showEditor && !CodeEditor && !loading) {
      loadComponent();
    }
  }, [showEditor, CodeEditor, loading, loadComponent]);

  if (!showEditor) return null;

  if (loading) {
    return <div className="code-editor-skeleton">Loading editor...</div>;
  }

  if (error) {
    return <div className="error">Failed to load editor: {error.message}</div>;
  }

  if (!CodeEditor) return null;

  return <CodeEditor code={code} onChange={onChange} />;
}
```

### 3. Library Code Splitting

```jsx
// Split heavy libraries
const ChartLibrary = lazy(() => import("recharts").then((module) => ({ default: module })));

const DatePicker = lazy(() => import("react-datepicker").then((module) => ({ default: module.default })));

// Bundle splitting by feature
const AdminFeatures = lazy(() =>
  Promise.all([import("./components/UserManagement"), import("./components/SystemSettings"), import("./components/AuditLog")]).then(([userMgmt, settings, audit]) => ({
    default: {
      UserManagement: userMgmt.default,
      SystemSettings: settings.default,
      AuditLog: audit.default,
    },
  }))
);

// Webpack magic comments for better chunk naming
const ProductionAnalytics = lazy(() =>
  import(
    /* webpackChunkName: "analytics" */
    /* webpackPrefetch: true */
    "./components/ProductionAnalytics"
  )
);

const DeveloperTools = lazy(() =>
  import(
    /* webpackChunkName: "dev-tools" */
    /* webpackMode: "lazy" */
    "./components/DeveloperTools"
  )
);
```

---

## List Virtualization

For large lists, virtualization renders only visible items, dramatically improving performance.

### 1. Basic Virtualization with react-window

```jsx
import { FixedSizeList as List } from "react-window";
import { memo } from "react";

// Large dataset simulation
const generateLargeDataset = (size) => {
  return Array.from({ length: size }, (_, index) => ({
    id: index,
    name: `Item ${index}`,
    description: `Description for item ${index}`,
    value: Math.random() * 1000,
    category: ["A", "B", "C"][index % 3],
    date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
  }));
};

// Memoized row component
const ListItem = memo(function ListItem({ index, style, data }) {
  const item = data[index];

  return (
    <div style={style} className={`list-item ${index % 2 === 0 ? "even" : "odd"}`}>
      <div className="item-content">
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <div className="item-meta">
          <span className="value">${item.value.toFixed(2)}</span>
          <span className="category">{item.category}</span>
          <span className="date">{item.date.toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
});

function VirtualizedList() {
  const [data] = useState(() => generateLargeDataset(10000));
  const [filteredData, setFilteredData] = useState(data);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Filter data based on search and category
  useEffect(() => {
    const filtered = data.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
    setFilteredData(filtered);
  }, [data, searchTerm, categoryFilter]);

  return (
    <div className="virtualized-list-container">
      <div className="filters">
        <input type="text" placeholder="Search items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          <option value="A">Category A</option>
          <option value="B">Category B</option>
          <option value="C">Category C</option>
        </select>
        <span className="count">{filteredData.length} items</span>
      </div>

      <List
        height={600} // Container height
        itemCount={filteredData.length}
        itemSize={120} // Each item height
        itemData={filteredData} // Pass data to items
        overscanCount={5} // Render extra items for smooth scrolling
      >
        {ListItem}
      </List>
    </div>
  );
}
```

### 2. Variable Size Virtualization

```jsx
import { VariableSizeList as List } from "react-window";

// Dynamic content with variable heights
const VariableListItem = memo(function VariableListItem({ index, style, data, setItemSize }) {
  const item = data.items[index];
  const rowRef = useRef();

  useEffect(() => {
    if (rowRef.current) {
      const height = rowRef.current.offsetHeight;
      data.setItemSize(index, height);
    }
  }, [index, data, item]);

  return (
    <div style={style}>
      <div ref={rowRef} className="variable-item">
        <h3>{item.title}</h3>
        <p>{item.content}</p>
        {item.image && <img src={item.image} alt={item.title} />}
        {item.tags && (
          <div className="tags">
            {item.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="metadata">
          <span>By {item.author}</span>
          <span>{item.date}</span>
          <span>{item.likes} likes</span>
        </div>
      </div>
    </div>
  );
});

function VariableSizeVirtualizedList() {
  const [items] = useState(() => generateVariableContent(5000));
  const listRef = useRef();
  const itemSizes = useRef(new Map());

  const getItemSize = useCallback((index) => {
    return itemSizes.current.get(index) || 200; // Default height
  }, []);

  const setItemSize = useCallback((index, size) => {
    itemSizes.current.set(index, size);
    if (listRef.current) {
      listRef.current.resetAfterIndex(index);
    }
  }, []);

  const itemData = useMemo(
    () => ({
      items,
      setItemSize,
    }),
    [items, setItemSize]
  );

  return (
    <div className="variable-virtualized-container">
      <List ref={listRef} height={600} itemCount={items.length} itemSize={getItemSize} itemData={itemData} estimatedItemSize={200} overscanCount={3}>
        {VariableListItem}
      </List>
    </div>
  );
}
```

### 3. Grid Virtualization

```jsx
import { FixedSizeGrid as Grid } from "react-window";

const GridCell = memo(function GridCell({ columnIndex, rowIndex, style, data }) {
  const itemIndex = rowIndex * data.columnCount + columnIndex;
  const item = data.items[itemIndex];

  if (!item) return null;

  return (
    <div
      style={{
        ...style,
        padding: "8px",
        border: "1px solid #ddd",
      }}
    >
      <div className="grid-item">
        <img src={item.thumbnail} alt={item.name} />
        <h4>{item.name}</h4>
        <p>${item.price}</p>
      </div>
    </div>
  );
});

function VirtualizedGrid() {
  const [items] = useState(() => generateGridItems(10000));
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const columnCount = Math.floor(dimensions.width / 200); // 200px per column
  const rowCount = Math.ceil(items.length / columnCount);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const gridData = useMemo(
    () => ({
      items,
      columnCount,
    }),
    [items, columnCount]
  );

  return (
    <div ref={containerRef} className="virtualized-grid-container" style={{ width: "100%", height: "600px" }}>
      <Grid columnCount={columnCount} columnWidth={200} height={dimensions.height} rowCount={rowCount} rowHeight={250} width={dimensions.width} itemData={gridData} overscanRowCount={2} overscanColumnCount={2}>
        {GridCell}
      </Grid>
    </div>
  );
}
```

### 4. Infinite Scroll with Virtualization

```jsx
import InfiniteLoader from "react-window-infinite-loader";
import { FixedSizeList as List } from "react-window";

function InfiniteVirtualizedList() {
  const [items, setItems] = useState([]);
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMoreItems = useCallback(
    async (startIndex, stopIndex) => {
      if (loading) return;

      setLoading(true);
      try {
        const newItems = await fetchItems(startIndex, stopIndex);
        setItems((prev) => [...prev, ...newItems]);

        if (newItems.length === 0) {
          setHasMoreItems(false);
        }
      } catch (error) {
        console.error("Failed to load items:", error);
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  const isItemLoaded = useCallback(
    (index) => {
      return !!items[index];
    },
    [items]
  );

  const itemCount = hasMoreItems ? items.length + 1 : items.length;

  const InfiniteListItem = memo(function InfiniteListItem({ index, style }) {
    const item = items[index];

    if (!item) {
      return (
        <div style={style} className="loading-item">
          <div className="spinner" />
          <span>Loading...</span>
        </div>
      );
    }

    return (
      <div style={style} className="infinite-list-item">
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <span className="item-meta">{item.date}</span>
      </div>
    );
  });

  return (
    <div className="infinite-virtualized-container">
      <InfiniteLoader
        isItemLoaded={isItemLoaded}
        itemCount={itemCount}
        loadMoreItems={loadMoreItems}
        threshold={15} // Start loading when 15 items from the end
      >
        {({ onItemsRendered, ref }) => (
          <List ref={ref} height={600} itemCount={itemCount} itemSize={120} onItemsRendered={onItemsRendered}>
            {InfiniteListItem}
          </List>
        )}
      </InfiniteLoader>
    </div>
  );
}

async function fetchItems(startIndex, stopIndex) {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return Array.from({ length: stopIndex - startIndex + 1 }, (_, i) => ({
    id: startIndex + i,
    title: `Item ${startIndex + i}`,
    description: `Description for item ${startIndex + i}`,
    date: new Date().toLocaleDateString(),
  }));
}
```

---

## Bundle Optimization

Optimize your bundle size and loading performance with advanced webpack configurations.

### 1. Bundle Analysis

```bash
# Install bundle analyzer
npm install --save-dev webpack-bundle-analyzer

# Analyze your bundle
npm run build
npx webpack-bundle-analyzer build/static/js/*.js
```

```js
// webpack.config.js optimizations
const path = require("path");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

module.exports = {
  optimization: {
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        // Vendor libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
          priority: 10,
        },
        // React and React-DOM
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: "react",
          chunks: "all",
          priority: 20,
        },
        // UI libraries
        ui: {
          test: /[\\/]node_modules[\\/](@mui|antd|react-bootstrap)[\\/]/,
          name: "ui-libs",
          chunks: "all",
          priority: 15,
        },
        // Common code
        common: {
          name: "common",
          minChunks: 2,
          chunks: "all",
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
    // Tree shaking
    usedExports: true,
    sideEffects: false,
    // Minimize
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
        },
      }),
    ],
  },

  // Production plugins
  plugins: [
    // Analyze bundle in development
    process.env.ANALYZE && new BundleAnalyzerPlugin(),

    // Preload important chunks
    new PreloadWebpackPlugin({
      rel: "preload",
      include: "initial",
    }),
  ].filter(Boolean),
};
```

### 2. Import Optimization

```jsx
// ❌ Bad: Imports entire library
import _ from 'lodash';
import * as MUI from '@mui/material';

// ✅ Good: Import only what you need
import { debounce, throttle } from 'lodash';
import { Button, TextField, Card } from '@mui/material';

// ✅ Better: Use babel plugin for automatic optimization
// babel-plugin-import configuration
{
  "plugins": [
    ["import", {
      "libraryName": "lodash",
      "libraryDirectory": "",
      "camel2DashComponentName": false
    }, "lodash"],
    ["import", {
      "libraryName": "@mui/material",
      "libraryDirectory": "",
      "camel2DashComponentName": false
    }, "mui-core"]
  ]
}

// Tree-shakable utility functions
export const utils = {
  formatCurrency: (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  },

  formatDate: (date, options = {}) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    }).format(new Date(date));
  },

  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};
```

### 3. Image Optimization

```jsx
// Modern image formats and lazy loading
function OptimizedImage({ src, alt, className, ...props }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          observer.unobserve(img);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className={`image-container ${className || ""}`}>
      {loading && <div className="image-skeleton" />}
      <img ref={imgRef} data-src={src} alt={alt} onLoad={() => setLoading(false)} onError={() => setError(true)} style={{ display: loading ? "none" : "block" }} {...props} />
      {error && <div className="image-error">Failed to load image</div>}
    </div>
  );
}

// WebP support with fallback
function ResponsiveImage({ src, alt, sizes, className }) {
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/, ".webp");

  return (
    <picture className={className}>
      <source srcSet={webpSrc} type="image/webp" />
      <source srcSet={src} type="image/jpeg" />
      <img src={src} alt={alt} sizes={sizes} loading="lazy" />
    </picture>
  );
}
```

---

## Performance Monitoring

Monitor and measure performance to identify bottlenecks and track improvements.

### 1. React Developer Tools Profiler

```jsx
// Profile component performance
function ProfiledApp() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <Profiler id="HomePage" onRender={onRenderCallback}>
                <HomePage />
              </Profiler>
            }
          />
          <Route
            path="/products"
            element={
              <Profiler id="ProductsPage" onRender={onRenderCallback}>
                <ProductsPage />
              </Profiler>
            }
          />
        </Routes>
      </Router>
    </Profiler>
  );
}

function onRenderCallback(id, phase, actualDuration, baseDuration, startTime, commitTime) {
  // Log performance metrics
  console.log("Component Performance:", {
    id,
    phase, // 'mount' or 'update'
    actualDuration, // Time spent rendering
    baseDuration, // Estimated time without memoization
    startTime,
    commitTime,
  });

  // Send to analytics service
  if (actualDuration > 100) {
    // Alert for slow renders
    analytics.track("slow_render", {
      component: id,
      duration: actualDuration,
      phase,
    });
  }
}
```

### 2. Web Vitals Monitoring

```jsx
import { getCLS, getFID, getFCP, getLCP, getTTFB } from "web-vitals";

// Monitor Core Web Vitals
function setupWebVitals() {
  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getFCP(sendToAnalytics);
  getLCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
}

function sendToAnalytics({ name, delta, value, id }) {
  console.log("Web Vital:", { name, delta, value, id });

  // Send to your analytics service
  analytics.track("web_vital", {
    metric: name,
    value,
    delta,
    id,
  });
}

// Custom performance hooks
function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({});

  const measureRender = useCallback((componentName, fn) => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();

    setMetrics((prev) => ({
      ...prev,
      [componentName]: end - start,
    }));

    return result;
  }, []);

  const measureAsync = useCallback(async (operationName, asyncFn) => {
    const start = performance.now();
    try {
      const result = await asyncFn();
      const end = performance.now();

      setMetrics((prev) => ({
        ...prev,
        [operationName]: end - start,
      }));

      return result;
    } catch (error) {
      const end = performance.now();
      console.error(`${operationName} failed in ${end - start}ms:`, error);
      throw error;
    }
  }, []);

  return { metrics, measureRender, measureAsync };
}

// Usage
function AnalyticsPage() {
  const { metrics, measureAsync } = usePerformanceMonitor();
  const [data, setData] = useState(null);

  useEffect(() => {
    measureAsync("load_analytics_data", async () => {
      const response = await fetch("/api/analytics");
      const result = await response.json();
      setData(result);
      return result;
    });
  }, [measureAsync]);

  return (
    <div>
      <h1>Analytics Dashboard</h1>
      {data && <AnalyticsCharts data={data} />}

      {/* Performance metrics in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="perf-metrics">
          {Object.entries(metrics).map(([name, time]) => (
            <div key={name}>
              {name}: {time.toFixed(2)}ms
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3. Performance Budget

```js
// webpack.config.js - Performance budget
module.exports = {
  performance: {
    maxAssetSize: 250000, // 250kb
    maxEntrypointSize: 250000,
    hints: 'warning', // or 'error' to fail build
    assetFilter: function(assetFilename) {
      return assetFilename.endsWith('.js') || assetFilename.endsWith('.css');
    }
  }
};

// Package.json scripts for performance monitoring
{
  "scripts": {
    "analyze": "npm run build && npx webpack-bundle-analyzer build/static/js/*.js",
    "size": "npm run build && size-limit",
    "perf": "lighthouse http://localhost:3000 --only-categories=performance --output=json --output-path=./lighthouse-report.json"
  }
}

// size-limit configuration
[
  {
    "path": "build/static/js/*.js",
    "limit": "250 KB"
  },
  {
    "path": "build/static/css/*.css",
    "limit": "50 KB"
  }
]
```

## Summary & Next Steps

You've now mastered React performance optimization! Here's what you should be comfortable with:

✅ **Memoization**: React.memo, useCallback, useMemo for preventing unnecessary renders  
✅ **Code Splitting**: Route and component-based lazy loading  
✅ **Virtualization**: Efficient rendering of large lists and grids  
✅ **Bundle Optimization**: Tree shaking, code splitting, import optimization  
✅ **Performance Monitoring**: Profiling, Web Vitals, performance budgets

**🎯 Key Takeaways:**

- Profile first, optimize second - measure before making changes
- Use memoization judiciously - not everything needs to be memoized
- Implement code splitting for better loading performance
- Virtualize large lists to maintain smooth scrolling
- Monitor performance continuously in production

**📈 Next Steps:**
Ready to ensure your applications are bulletproof? Continue with [Testing Strategies](./05-testing-strategies.md) to learn comprehensive testing approaches with Jest, React Testing Library, and E2E testing.

---

_💡 Pro Tip: Performance optimization is about finding the right balance. Over-optimization can make code harder to maintain, so focus on the biggest performance bottlenecks first._

**📚 Real-World Memoization Examples:**

1. **Data Tables**: Large datasets with filtering and sorting
2. **Search Results**: Expensive filtering operations
3. **Charts/Graphs**: Complex data calculations
4. **Image Processing**: Thumbnail generation, filters
5. **Real-time Dashboards**: Live data transformations
6. **Gaming**: Physics calculations, collision detection
7. **Video Players**: Playback controls, timeline scrubbing

### Memory Management & Optimization Internals

Understanding React's memory management helps prevent memory leaks and optimize performance at scale.

```javascript
// React's Memory Management Internals
class ReactMemoryManager {
  constructor() {
    this.componentInstances = new WeakMap(); // Automatically cleaned up
    this.eventListeners = new Map(); // Tracked for cleanup
    this.timers = new Set(); // Tracked for cleanup
    this.subscriptions = new Set(); // External subscriptions
  }

  // How React tracks component memory
  createComponentInstance(component) {
    const instance = {
      state: {},
      props: {},
      hooks: [], // Hook state array
      effectList: [], // useEffect cleanup functions
      memoCache: new Map(), // useMemo/useCallback cache
      eventHandlers: new Set(),
    };

    this.componentInstances.set(component, instance);
    return instance;
  }

  // Cleanup process when component unmounts
  cleanupComponent(component) {
    const instance = this.componentInstances.get(component);

    if (instance) {
      // 1. Run all effect cleanup functions
      instance.effectList.forEach((cleanup) => {
        if (typeof cleanup === "function") {
          cleanup();
        }
      });

      // 2. Clear memoization cache
      instance.memoCache.clear();

      // 3. Remove event listeners
      instance.eventHandlers.forEach((handler) => {
        this.removeEventListener(handler);
      });

      // 4. WeakMap automatically handles garbage collection
      // No need to manually delete from componentInstances
    }
  }
}

// Memory Leak Prevention Patterns
function MemoryLeakPrevention() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // ❌ MEMORY LEAK: Event listener not cleaned up
    const handleResize = () => setData((prev) => [...prev, window.innerWidth]);
    window.addEventListener("resize", handleResize);
    // Missing cleanup!

    // ✅ PROPER CLEANUP
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    // ❌ MEMORY LEAK: Timer not cleared
    const interval = setInterval(() => {
      setData((prev) => [...prev, Date.now()]);
    }, 1000);
    // Missing cleanup!

    // ✅ PROPER CLEANUP
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // ❌ MEMORY LEAK: Subscription not unsubscribed
    const subscription = dataService.subscribe((newData) => {
      setData(newData);
    });
    // Missing cleanup!

    // ✅ PROPER CLEANUP
    return () => {
      subscription.unsubscribe();
    };
  }, []);
}

// Advanced Memory Optimization Techniques
function MemoryOptimizedComponent() {
  // ✅ Use refs for large objects that don't trigger re-renders
  const largeDataRef = useRef(new Map());

  // ✅ Lazy initialization for expensive objects
  const [expensiveData] = useState(() => {
    return createExpensiveObject(); // Only created once
  });

  // ✅ Memoize expensive calculations
  const processedData = useMemo(() => {
    return processLargeDataset(data);
  }, [data]);

  // ✅ Use callback refs for dynamic cleanup
  const elementRef = useCallback((element) => {
    if (element) {
      // Setup
      const observer = new IntersectionObserver(handleIntersection);
      observer.observe(element);

      // Cleanup stored on element for later removal
      element._cleanup = () => observer.disconnect();
    }
  }, []);

  // ✅ Custom hook for subscription management
  const useSubscription = (subscribe, dependency) => {
    useEffect(() => {
      const subscription = subscribe();
      return () => subscription.unsubscribe();
    }, [dependency]);
  };
}

// Garbage Collection Optimization
function GarbageCollectionOptimization() {
  // ❌ BAD: Creates new objects every render
  const badConfig = {
    theme: "dark",
    locale: "en",
    features: ["feature1", "feature2"],
  };

  // ✅ GOOD: Static objects outside component
  const STATIC_CONFIG = {
    theme: "dark",
    locale: "en",
    features: ["feature1", "feature2"],
  };

  // ✅ GOOD: Memoized objects
  const memoizedConfig = useMemo(
    () => ({
      theme: currentTheme,
      locale: currentLocale,
      features: enabledFeatures,
    }),
    [currentTheme, currentLocale, enabledFeatures]
  );

  // ❌ BAD: Function recreated every render
  const handleClick = () => doSomething();

  // ✅ GOOD: Memoized function
  const handleClick = useCallback(() => doSomething(), []);
}

// Memory profiling utilities
function useMemoryProfiler(componentName) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const startMemory = performance.memory?.usedJSHeapSize;

      return () => {
        const endMemory = performance.memory?.usedJSHeapSize;
        const memoryDiff = endMemory - startMemory;

        if (memoryDiff > 1000000) {
          // 1MB threshold
          console.warn(`${componentName} may have memory leak: ${memoryDiff} bytes`);
        }
      };
    }
  }, [componentName]);
}

// Weak references for large datasets
function useWeakCache() {
  const cache = useRef(new WeakMap());

  const memoize = useCallback((key, computeFn) => {
    if (cache.current.has(key)) {
      return cache.current.get(key);
    }

    const result = computeFn();
    cache.current.set(key, result);
    return result;
  }, []);

  return memoize;
}
```

### React Fiber Memory Model

React's Fiber architecture has specific memory patterns that affect performance.

```javascript
// Fiber Memory Allocation Patterns
class FiberMemoryModel {
  constructor() {
    this.fiberPool = []; // Reused fiber nodes
    this.workInProgress = null;
    this.current = null;
  }

  // Fiber node recycling for memory efficiency
  createFiber(type, props, key) {
    let fiber;

    if (this.fiberPool.length > 0) {
      // Reuse existing fiber node
      fiber = this.fiberPool.pop();
      this.resetFiber(fiber, type, props, key);
    } else {
      // Create new fiber node
      fiber = new FiberNode(type, props, key);
    }

    return fiber;
  }

  resetFiber(fiber, type, props, key) {
    fiber.type = type;
    fiber.props = props;
    fiber.key = key;
    fiber.child = null;
    fiber.sibling = null;
    fiber.return = null;
    fiber.effectTag = "NoEffect";
    fiber.deletions = null;
  }

  // Fiber cleanup and pooling
  releaseFiber(fiber) {
    // Clear references to prevent memory leaks
    fiber.child = null;
    fiber.sibling = null;
    fiber.return = null;
    fiber.stateNode = null;
    fiber.updateQueue = null;

    // Add back to pool for reuse
    if (this.fiberPool.length < MAX_POOL_SIZE) {
      this.fiberPool.push(fiber);
    }
    // Otherwise let garbage collector handle it
  }

  // Double buffering for memory efficiency
  swapFiberTrees() {
    // React maintains two fiber trees: current and work-in-progress
    const temp = this.current;
    this.current = this.workInProgress;
    this.workInProgress = temp;

    // This allows React to:
    // 1. Keep current tree stable during updates
    // 2. Work on work-in-progress tree
    // 3. Swap when update is complete
    // 4. Reuse previous current tree as next work-in-progress
  }
}

// Hook memory management
function hookMemoryManagement() {
  // Each hook creates a hook object in memory
  const hookMemoryUsage = {
    useState: 64, // bytes per useState hook
    useEffect: 96, // bytes per useEffect hook
    useMemo: 128, // bytes per useMemo hook + cached value
    useCallback: 96, // bytes per useCallback hook
    useRef: 48, // bytes per useRef hook
    useContext: 32, // bytes per useContext hook
  };

  // Memory grows with hook count
  function ComponentWithManyHooks() {
    // Each of these allocates memory
    const [state1] = useState(""); // ~64 bytes
    const [state2] = useState(0); // ~64 bytes
    const [state3] = useState([]); // ~64 bytes + array size

    // Memory accumulates across renders
    const memoized = useMemo(() => {
      // ~128 bytes + result size
      return expensiveComputation();
    }, []);

    // Total component memory footprint grows with hooks
  }
}
```

**🎯 Memory Optimization Best Practices:**

✅ **Efficient Memory Usage:**

- Use refs for non-rendering data
- Implement proper cleanup in useEffect
- Avoid creating objects/functions in render
- Use WeakMap/WeakSet for caches
- Implement component recycling for large lists

✅ **Memory Leak Prevention:**

- Always clean up event listeners
- Clear timers and intervals
- Unsubscribe from external services
- Remove DOM references in cleanup
- Use AbortController for fetch requests

❌ **Memory Anti-Patterns:**

- Storing large objects in component state
- Not cleaning up subscriptions
- Creating objects/functions in render
- Circular references in objects
- Keeping references to unmounted components

---
