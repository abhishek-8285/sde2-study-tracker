# React 18+ & Modern Features 🚀

Master the latest React features and prepare for the future of React development with concurrent rendering, Suspense, and Server Components.

## Table of Contents

- [React 18 Concurrent Features](#react-18-concurrent-features)
- [Suspense for Data Fetching](#suspense-for-data-fetching)
- [Server Components (RSC)](#server-components-rsc)
- [New Hooks & APIs](#new-hooks--apis)
- [React 19 Preparation](#react-19-preparation)

---

## React 18 Concurrent Features

### Automatic Batching

React 18 automatically batches multiple state updates into a single re-render for better performance, even in async operations.

```jsx
// React 17: Multiple re-renders in async operations
function App() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);

  // React 17: Would cause 2 re-renders
  // React 18: Automatically batched into 1 re-render
  function handleClick() {
    setTimeout(() => {
      setCount((c) => c + 1);
      setFlag((f) => !f);
      // In React 18, these are automatically batched
    }, 1000);
  }

  console.log("Renders:", Date.now()); // Check render frequency

  return (
    <div>
      <button onClick={handleClick}>
        Count: {count}, Flag: {flag.toString()}
      </button>
    </div>
  );
}

// Manual batching control when needed
import { unstable_batchedUpdates } from "react-dom";

function handleClickOld() {
  // React 17 manual batching
  unstable_batchedUpdates(() => {
    setCount((c) => c + 1);
    setFlag((f) => !f);
  });
}

// Opt out of automatic batching if needed
import { flushSync } from "react-dom";

function handleClickUnbatched() {
  flushSync(() => {
    setCount((c) => c + 1);
  });
  // Force a re-render here
  flushSync(() => {
    setFlag((f) => !f);
  });
  // Force another re-render here
}
```

### Concurrent Rendering Internals

React 18's concurrent rendering is powered by a sophisticated **priority-based scheduling system** that enables time slicing and interruptible rendering.

```javascript
// Priority Levels in React 18
const PriorityLevels = {
  ImmediatePriority: 1, // Synchronous, blocks everything (flushSync)
  UserBlockingPriority: 2, // User interactions (clicks, typing)
  NormalPriority: 3, // Default priority for most updates
  LowPriority: 4, // Data fetching, background tasks
  IdlePriority: 5, // Offscreen content, analytics
};

// How React's Scheduler Works
class ReactScheduler {
  constructor() {
    this.taskQueue = []; // Pending tasks sorted by expiration
    this.timerQueue = []; // Delayed tasks
    this.isHostCallbackScheduled = false;
    this.currentTime = 0;

    // Time slicing configuration
    this.frameInterval = 5; // 5ms time slices (default)
    this.maxYieldInterval = 300; // Max continuous work time
  }

  scheduleCallback(priorityLevel, callback, options = {}) {
    const currentTime = performance.now();

    // Calculate expiration time based on priority
    let timeout;
    switch (priorityLevel) {
      case PriorityLevels.ImmediatePriority:
        timeout = -1; // Never expires, run immediately
        break;
      case PriorityLevels.UserBlockingPriority:
        timeout = 250; // 250ms timeout
        break;
      case PriorityLevels.NormalPriority:
        timeout = 5000; // 5s timeout
        break;
      case PriorityLevels.LowPriority:
        timeout = 10000; // 10s timeout
        break;
      case PriorityLevels.IdlePriority:
        timeout = maxSigned31BitInt; // Never expires
        break;
    }

    const expirationTime = currentTime + timeout;

    const newTask = {
      id: this.taskIdCounter++,
      callback,
      priorityLevel,
      startTime: currentTime,
      expirationTime,
      sortIndex: expirationTime,
    };

    // Add to appropriate queue
    if (startTime > currentTime) {
      this.timerQueue.push(newTask);
    } else {
      this.taskQueue.push(newTask);
      this.flushWork();
    }

    return newTask;
  }

  // Time slicing implementation
  workLoop(hasTimeRemaining, initialTime) {
    let currentTime = initialTime;
    this.advanceTimers(currentTime);

    currentTask = this.taskQueue.peek();

    while (currentTask && !isSchedulerPaused) {
      // Check if we should yield control back to browser
      if (currentTask.expirationTime > currentTime && (!hasTimeRemaining || this.shouldYieldToHost())) {
        break; // Yield to browser for other tasks
      }

      // Execute the task
      const callback = currentTask.callback;
      if (typeof callback === "function") {
        currentTask.callback = null;
        const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;

        const continuationCallback = callback(didUserCallbackTimeout);

        if (typeof continuationCallback === "function") {
          // Task yielded, continue later
          currentTask.callback = continuationCallback;
        } else {
          // Task completed
          this.taskQueue.pop();
        }
      }

      currentTask = this.taskQueue.peek();
    }

    // Return whether there's more work
    return currentTask !== null;
  }

  // Determines when to yield control
  shouldYieldToHost() {
    const timeElapsed = performance.now() - startTime;
    return timeElapsed >= this.frameInterval;
  }
}

// React's Fiber Work Loop with Time Slicing
function workLoopConcurrent() {
  // Work on fibers until time slice expires or work is done
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(unitOfWork) {
  // 1. Begin work on current fiber
  const next = beginWork(unitOfWork);

  if (next === null) {
    // 2. Complete work if no more children
    completeUnitOfWork(unitOfWork);
  } else {
    // 3. Continue to child
    workInProgress = next;
  }
}

// Lane-based Priority System (React 18+)
const Lanes = {
  NoLanes: 0b0000000000000000000000000000000,
  SyncLane: 0b0000000000000000000000000000001, // Synchronous
  InputContinuousLane: 0b0000000000000000000000000000100, // User input
  DefaultLane: 0b0000000000000000000000000010000, // Default updates
  TransitionLane: 0b0000000000000000001000000000000, // Transitions
  IdleLane: 0b0100000000000000000000000000000, // Idle updates
};

// How transitions work internally
function useTransition() {
  const [isPending, setPending] = useState(false);

  const startTransition = useCallback((callback) => {
    setPending(true);

    // Mark updates inside callback as transitions (lower priority)
    const prevTransition = ReactCurrentBatchConfig.transition;
    ReactCurrentBatchConfig.transition = { _updatedFibers: new Set() };

    try {
      setPending(false); // This update is urgent (higher priority)
      callback(); // These updates are transitions (lower priority)
    } finally {
      ReactCurrentBatchConfig.transition = prevTransition;
    }
  }, []);

  return [isPending, startTransition];
}
```

### Priority-Based Update Processing

React 18 introduces a sophisticated lane system that ensures important updates aren't blocked by less important ones.

```jsx
// Priority demonstration
function SearchWithTransitions() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (newQuery) => {
    // HIGH PRIORITY: User input should be immediate
    setQuery(newQuery);

    // LOW PRIORITY: Search results can be delayed
    startTransition(() => {
      // This expensive operation won't block the input
      const searchResults = performExpensiveSearch(newQuery);
      setResults(searchResults);
    });
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search..."
      />

      {isPending && <div>Searching...</div>}

      <SearchResults results={results} />
    </div>
  );
}

// What happens internally:
function internalUpdateProcessing() {
  // When user types:
  // 1. Input update gets SyncLane (highest priority)
  // 2. Search update gets TransitionLane (lower priority)
  // 3. React processes SyncLane immediately
  // 4. React processes TransitionLane when browser is idle

  const updates = [
    { lane: SyncLane, update: () => setQuery("new value") },
    { lane: TransitionLane, update: () => setResults([...]) }
  ];

  // React processes in priority order
  processUpdatesInPriorityOrder(updates);
}

// Concurrent features enable smooth UX
function InterruptibleRendering() {
  const [list, setList] = useState(generateLargeList());
  const [urgent, setUrgent] = useState(0);

  const handleUrgentUpdate = () => {
    // This will interrupt any ongoing transition rendering
    setUrgent(urgent + 1);
  };

  const handleListUpdate = () => {
    startTransition(() => {
      // This expensive update can be interrupted
      setList(generateLargeList());
    });
  };

  return (
    <div>
      {/* This always stays responsive */}
      <button onClick={handleUrgentUpdate}>
        Urgent Counter: {urgent}
      </button>

      <button onClick={handleListUpdate}>
        Update Large List
      </button>

      {/* This might render progressively */}
      <ExpensiveList items={list} />
    </div>
  );
}
```

**📊 Concurrent Features Benefits:**

✅ **Time Slicing Advantages:**

- Keeps UI responsive during heavy computations
- Allows high-priority updates to interrupt low-priority work
- Prevents main thread blocking
- Better user experience on slow devices

✅ **Priority System Benefits:**

- User interactions always feel immediate
- Background work doesn't interfere with interactions
- Automatic performance optimization
- Graceful degradation under load

❌ **Considerations:**

- Increased complexity in debugging
- Need to understand priority concepts
- Breaking changes in some edge cases
- Memory usage can increase temporarily

**🎯 When to Use:**

- **Use**: Apps with heavy computations, large lists, complex forms
- **Avoid**: Simple static sites, basic CRUD applications

### useDeferredValue: Smart Value Deferring

`useDeferredValue` creates a "deferred" version of a value that lags behind during urgent updates.

```jsx
// Deferred values for performance
function SearchResults({ query }) {
  // This value will lag behind during rapid typing
  const deferredQuery = useDeferredValue(query);

  // Expensive operation uses deferred value
  const results = useMemo(() => {
    return searchProducts(deferredQuery);
  }, [deferredQuery]);

  // Show loading state when values are out of sync
  const isStale = query !== deferredQuery;

  return (
    <div style={{ opacity: isStale ? 0.5 : 1 }}>
      {results.map((result) => (
        <ProductCard key={result.id} product={result} />
      ))}
    </div>
  );
}

// How useDeferredValue works internally
function useDeferredValue(value) {
  const [deferredValue, setDeferredValue] = useState(value);

  useEffect(() => {
    // Schedule deferred update with low priority
    startTransition(() => {
      setDeferredValue(value);
    });
  }, [value]);

  return deferredValue;
}

// Advanced usage with loading states
function SmartSearch() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const isLoading = query !== deferredQuery;

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type to search..." />

      <Suspense fallback={<div>Loading...</div>}>
        <div className={isLoading ? "loading" : ""}>
          <SearchResults query={deferredQuery} />
        </div>
      </Suspense>
    </div>
  );
}
```

**📚 Real-World Concurrent Examples:**

1. **Search Interfaces**: Immediate input response, deferred results
2. **Data Tables**: Responsive controls, background data processing
3. **Gaming UIs**: Immediate controls, background world updates
4. **Video Editors**: Real-time playback, background rendering
5. **Code Editors**: Immediate typing, background syntax highlighting
6. **Dashboard Analytics**: Interactive controls, background chart updates
7. **Social Media Feeds**: Immediate scrolling, background content loading

---

## Suspense for Data Fetching

Suspense enables declarative loading states and better UX for asynchronous operations.

### Basic Suspense Setup

```jsx
import { Suspense, lazy } from "react";

// Code splitting with Suspense
const LazyDashboard = lazy(() => import("./Dashboard"));
const LazyProfile = lazy(() => import("./Profile"));

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<DashboardSkeleton />}>
              <LazyDashboard />
            </Suspense>
          }
        />
        <Route
          path="/profile"
          element={
            <Suspense fallback={<ProfileSkeleton />}>
              <LazyProfile />
            </Suspense>
          }
        />
      </Routes>
    </Router>
  );
}

// Custom skeleton components
function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      <div className="skeleton-header" />
      <div className="skeleton-content">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    </div>
  );
}
```

### Data Fetching with Suspense

```jsx
// Custom hook for Suspense-compatible data fetching
function useSuspenseQuery(queryFn, deps = []) {
  const [data, setData] = useState(null);
  const [promise, setPromise] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchPromise = queryFn().then((result) => {
      if (!cancelled) {
        setData(result);
        setPromise(null);
      }
      return result;
    });

    setPromise(fetchPromise);
    return () => {
      cancelled = true;
    };
  }, deps);

  if (promise) {
    throw promise; // Suspense catches this promise
  }

  return data;
}

// Component using Suspense for data fetching
function UserProfile({ userId }) {
  const user = useSuspenseQuery(() => fetchUser(userId), [userId]);
  const posts = useSuspenseQuery(() => fetchUserPosts(userId), [userId]);

  return (
    <div className="user-profile">
      <img src={user.avatar} alt={user.name} />
      <h1>{user.name}</h1>
      <div className="user-posts">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

// App with nested Suspense boundaries
function App() {
  return (
    <div className="app">
      <Suspense fallback={<AppSkeleton />}>
        <Header />
        <main>
          <Suspense fallback={<ProfileSkeleton />}>
            <UserProfile userId="123" />
          </Suspense>
        </main>
      </Suspense>
    </div>
  );
}
```

### Advanced Suspense Patterns

```jsx
// Error boundaries with Suspense
class SuspenseErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Suspense Error:", error, errorInfo);
    // Log to monitoring service
    logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false, error: null })}>Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Suspense with error boundaries
function SafeSuspense({ children, fallback, errorFallback }) {
  return (
    <SuspenseErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </SuspenseErrorBoundary>
  );
}

// Usage in app
function ProductCatalog() {
  return (
    <SafeSuspense fallback={<ProductsSkeleton />} errorFallback={<ProductsError />}>
      <ProductList />
    </SafeSuspense>
  );
}
```

**📚 Real-World Suspense Examples:**

1. **E-commerce Product Catalog**: Progressive loading of products with skeletons
2. **Social Media Feed**: Incremental post loading with smooth transitions
3. **Dashboard Analytics**: Parallel data fetching for different widgets
4. **Video Streaming Platform**: Content metadata loading while video buffers
5. **Document Editor**: Collaborative features loading after core editor
6. **Gaming Platform**: Asset loading with progress indicators
7. **Financial Trading**: Market data streaming with fallback states

---

## Server Components (RSC)

React Server Components run on the server and enable zero-bundle-size components.

### Understanding Server vs Client Components

```jsx
// server/components/BlogPost.server.jsx (Server Component)
import fs from 'fs';
import path from 'path';

// This runs on the server only
export default function BlogPost({ slug }) {
  // Direct file system access (server-only)
  const postPath = path.join(process.cwd(), 'posts', `${slug}.md`);
  const content = fs.readFileSync(postPath, 'utf8');
  const { frontmatter, body } = parseMarkdown(content);

  return (
    <article className="blog-post">
      <header>
        <h1>{frontmatter.title}</h1>
        <time>{frontmatter.date}</time>
        <AuthorInfo authorId={frontmatter.authorId} />
      </header>

      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: body }}
      />

      {/* Client component for interactivity */}
      <CommentSection postId={slug} />
    </article>
  );
}

// server/components/AuthorInfo.server.jsx
export default function AuthorInfo({ authorId }) {
  // Direct database access (server-only)
  const author = await db.authors.findById(authorId);

  return (
    <div className="author-info">
      <img src={author.avatar} alt={author.name} />
      <span>{author.name}</span>
    </div>
  );
}
```

```jsx
// client/components/CommentSection.client.jsx (Client Component)
"use client"; // Directive for client component

import { useState, useEffect } from "react";

export default function CommentSection({ postId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    fetchComments(postId).then(setComments);
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const comment = await submitComment(postId, newComment);
    setComments((prev) => [comment, ...prev]);
    setNewComment("");
  };

  return (
    <section className="comments">
      <h3>Comments</h3>

      <form onSubmit={handleSubmit}>
        <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." />
        <button type="submit">Post Comment</button>
      </form>

      <div className="comments-list">
        {comments.map((comment) => (
          <Comment key={comment.id} comment={comment} />
        ))}
      </div>
    </section>
  );
}
```

### Server Component Patterns

```jsx
// Data fetching in Server Components
export default async function ProductCatalog({ category, filters }) {
  // Multiple parallel server-side data fetches
  const [products, categories, reviews] = await Promise.all([
    fetchProducts({ category, filters }),
    fetchCategories(),
    fetchTopReviews(category)
  ]);

  return (
    <div className="catalog">
      <aside>
        <CategoryFilter categories={categories} />
        <PriceFilter />
        <RatingFilter />
      </aside>

      <main>
        <ProductGrid products={products} />
        <TopReviews reviews={reviews} />
      </main>
    </div>
  );
}

// Streaming with Server Components
export default function Dashboard() {
  return (
    <div className="dashboard">
      <Suspense fallback={<AnalyticsSkeleton />}>
        <Analytics />
      </Suspense>

      <Suspense fallback={<RecentOrdersSkeleton />}>
        <RecentOrders />
      </Suspense>

      <Suspense fallback={<InventorySkeleton />}>
        <InventoryStatus />
      </Suspense>
    </div>
  );
}

// Each component can load independently
async function Analytics() {
  const data = await fetchAnalytics();
  return <AnalyticsCharts data={data} />;
}

async function RecentOrders() {
  const orders = await fetchRecentOrders();
  return <OrdersList orders={orders} />;
}
```

**📊 Server Components Trade-offs:**

✅ **Pros:**

- Zero JavaScript bundle size for server components
- Direct server resource access (databases, files)
- Improved performance and SEO
- Reduced client-side complexity

❌ **Cons:**

- No browser APIs (localStorage, DOM events)
- Cannot use hooks or state
- Requires server infrastructure
- Debugging complexity

**🎯 Usage Guidelines:**

- **Server Components**: Data fetching, static content, SEO-critical content
- **Client Components**: Interactivity, browser APIs, state management

---

## New Hooks & APIs

### useTransition & useDeferredValue

```jsx
import { useState, useTransition, useDeferredValue, useMemo } from "react";

function SearchInterface() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  // Defer expensive filtering operations
  const deferredQuery = useDeferredValue(query);

  // Expensive computation that can be deferred
  const filteredResults = useMemo(() => {
    if (!deferredQuery) return [];

    return performExpensiveFilter(results, deferredQuery);
  }, [results, deferredQuery]);

  const handleSearch = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery); // High priority - immediate UI update

    // Low priority - can be interrupted
    startTransition(() => {
      searchAPI(newQuery).then(setResults);
    });
  };

  return (
    <div className="search-interface">
      <input value={query} onChange={handleSearch} placeholder="Search products..." />

      {isPending && <SearchSpinner />}

      <ResultsList results={filteredResults} query={deferredQuery} />
    </div>
  );
}

// Real-world example: Product filtering
function ProductFilter() {
  const [products] = useState(generateLargeProductList()); // 10k products
  const [filterText, setFilterText] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [isPending, startTransition] = useTransition();

  const deferredFilter = useDeferredValue(filterText);
  const deferredSort = useDeferredValue(sortBy);

  const filteredProducts = useMemo(() => {
    let filtered = products.filter((product) => product.name.toLowerCase().includes(deferredFilter.toLowerCase()));

    return filtered.sort((a, b) => {
      switch (deferredSort) {
        case "price":
          return a.price - b.price;
        case "rating":
          return b.rating - a.rating;
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [products, deferredFilter, deferredSort]);

  const handleFilterChange = (e) => {
    setFilterText(e.target.value);
  };

  const handleSortChange = (newSort) => {
    startTransition(() => {
      setSortBy(newSort);
    });
  };

  return (
    <div className="product-filter">
      <div className="controls">
        <input value={filterText} onChange={handleFilterChange} placeholder="Filter products..." />

        <select onChange={(e) => handleSortChange(e.target.value)}>
          <option value="name">Sort by Name</option>
          <option value="price">Sort by Price</option>
          <option value="rating">Sort by Rating</option>
        </select>

        {isPending && <div className="sorting-indicator">Sorting...</div>}
      </div>

      <ProductGrid products={filteredProducts} />
    </div>
  );
}
```

### useId & useSyncExternalStore

```jsx
import { useId, useSyncExternalStore } from "react";

// useId for stable IDs across server/client
function FormField({ label, type = "text", ...props }) {
  const id = useId();

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} {...props} />
    </div>
  );
}

// Complex form with multiple fields
function UserRegistrationForm() {
  const formId = useId();

  return (
    <form>
      <fieldset>
        <legend>Personal Information</legend>
        <FormField label="First Name" name="firstName" />
        <FormField label="Last Name" name="lastName" />
        <FormField label="Email" type="email" name="email" />
      </fieldset>

      <fieldset>
        <legend>Account Settings</legend>
        <FormField label="Username" name="username" />
        <FormField label="Password" type="password" name="password" />
      </fieldset>
    </form>
  );
}

// useSyncExternalStore for external state
class WindowDimensionsStore {
  constructor() {
    this.listeners = new Set();
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    window.addEventListener("resize", this.handleResize);
  }

  handleResize = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.listeners.forEach((listener) => listener());
  };

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => ({
    width: this.width,
    height: this.height,
  });

  getServerSnapshot = () => ({
    width: 1024,
    height: 768,
  });
}

const windowStore = new WindowDimensionsStore();

function useWindowDimensions() {
  return useSyncExternalStore(windowStore.subscribe, windowStore.getSnapshot, windowStore.getServerSnapshot);
}

// Component using window dimensions
function ResponsiveLayout() {
  const { width, height } = useWindowDimensions();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  return (
    <div className={`layout ${isMobile ? "mobile" : isTablet ? "tablet" : "desktop"}`}>
      <header>Responsive Header</header>

      <main
        style={{
          gridTemplateColumns: isDesktop ? "250px 1fr 300px" : isTablet ? "200px 1fr" : "1fr",
        }}
      >
        {(isTablet || isDesktop) && <aside>Sidebar</aside>}
        <section>Main Content</section>
        {isDesktop && <aside>Right Sidebar</aside>}
      </main>

      <footer>
        Viewport: {width}x{height}
      </footer>
    </div>
  );
}
```

---

## React 19 Preparation

### Upcoming Features & Changes

```jsx
// React 19: Actions and useActionState (experimental)
import { useActionState } from "react";

function ContactForm() {
  const [state, submitAction] = useActionState(
    async (prevState, formData) => {
      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to submit");
        }

        return { success: true, message: "Message sent successfully!" };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    { success: false, message: "" }
  );

  return (
    <form action={submitAction}>
      <input name="name" placeholder="Your name" required />
      <input name="email" type="email" placeholder="Your email" required />
      <textarea name="message" placeholder="Your message" required />

      <button type="submit">Send Message</button>

      {state.success && <p className="success">{state.message}</p>}
      {state.error && <p className="error">{state.error}</p>}
    </form>
  );
}

// React 19: Improved ref handling
function ModernRef() {
  return (
    <input
      ref={(node) => {
        // Cleanup function support
        if (node) {
          node.focus();
          return () => {
            console.log("Input unmounted");
          };
        }
      }}
    />
  );
}

// React 19: Asset loading APIs
function ImageWithPreload({ src, alt }) {
  useEffect(() => {
    // Preload image
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = src;
    document.head.appendChild(link);

    return () => document.head.removeChild(link);
  }, [src]);

  return <img src={src} alt={alt} />;
}
```

### Future-Proofing Strategies

```jsx
// 1. Gradual adoption of new features
function ModernApp() {
  return (
    <StrictMode>
      <BrowserRouter>
        <Suspense fallback={<AppSkeleton />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products/*" element={<ProductsApp />} />
            <Route path="/dashboard/*" element={<DashboardApp />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </StrictMode>
  );
}

// 2. Component migration strategy
function LegacyButton({ onClick, children, ...props }) {
  // Gradually migrate to new patterns
  const handleClick = useCallback(onClick, [onClick]);

  return (
    <button onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

// 3. Prepare for concurrent features
function SearchResults({ query }) {
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState([]);

  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (!deferredQuery) return;

    startTransition(() => {
      searchAPI(deferredQuery).then(setResults);
    });
  }, [deferredQuery]);

  return (
    <div>
      {isPending && <SearchSpinner />}
      <ResultsList results={results} />
    </div>
  );
}
```

**📊 Migration Strategy:**

| Feature           | React 18              | React 19                    | Migration Path                     |
| ----------------- | --------------------- | --------------------------- | ---------------------------------- |
| **State Updates** | Manual batching       | Auto batching + Actions     | Gradual adoption of useActionState |
| **Data Fetching** | useEffect patterns    | Server Components + Actions | Server-first architecture          |
| **Performance**   | Manual optimization   | Built-in optimizations      | Less manual memoization needed     |
| **Forms**         | Controlled components | Action-based forms          | Migrate to form actions            |

---

## Summary & Best Practices

### 🎯 Key Takeaways

✅ **React 18 Concurrent Features**: Automatic batching, useTransition, useDeferredValue  
✅ **Suspense Patterns**: Code splitting, data fetching, error boundaries  
✅ **Server Components**: Zero-bundle components with server-side rendering  
✅ **New Hooks**: useId, useSyncExternalStore for modern patterns  
✅ **React 19 Preparation**: Actions, improved refs, asset loading

### 📈 Implementation Strategy

1. **Start with Concurrent Features**

   - Enable React 18 concurrent rendering
   - Add useTransition for heavy operations
   - Use useDeferredValue for expensive computations

2. **Adopt Suspense Gradually**

   - Begin with code splitting
   - Add data fetching Suspense boundaries
   - Implement proper error boundaries

3. **Server Components (When Ready)**

   - Start with static content
   - Move data fetching to server
   - Keep interactivity on client

4. **Prepare for React 19**
   - Learn action patterns
   - Experiment with form actions
   - Plan migration strategy

### ⚠️ Common Pitfalls

- **Over-using Suspense**: Not every loading state needs Suspense
- **Mixing Server/Client**: Understanding the boundary is crucial
- **Ignoring Browser Support**: Ensure graceful degradation
- **Performance Assumptions**: Measure before optimizing

**📈 Next Steps:**
Ready to add type safety to your React applications? Continue with [TypeScript & Advanced Patterns](./07-typescript-advanced-patterns.md) to learn production-ready TypeScript patterns for React development.

---

_💡 Pro Tip: React's future is concurrent and server-first. Start adopting these patterns gradually to stay ahead of the curve._
