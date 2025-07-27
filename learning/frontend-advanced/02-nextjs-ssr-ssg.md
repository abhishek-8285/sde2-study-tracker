# Next.js SSR/SSG for SDE2+ Engineers ⚡

## 🎯 **Overview**

Next.js is the leading React framework for production-ready applications, offering Server-Side Rendering (SSR), Static Site Generation (SSG), and hybrid approaches. This guide covers comprehensive implementation patterns for building high-performance, SEO-optimized web applications.

## 📚 **Next.js Fundamentals**

### **Rendering Strategies**

- **SSG (Static Site Generation)** - Pre-render at build time
- **SSR (Server-Side Rendering)** - Pre-render on each request
- **ISR (Incremental Static Regeneration)** - Update static content without rebuilding
- **CSR (Client-Side Rendering)** - Render in browser like traditional SPA

### **When to Use Each Strategy**

| Strategy | Use Case                         | Performance | SEO        | Real-time Data |
| -------- | -------------------------------- | ----------- | ---------- | -------------- |
| **SSG**  | Marketing, blogs, docs           | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐ | ❌             |
| **ISR**  | E-commerce, news                 | ⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐ | ✅             |
| **SSR**  | User dashboards, dynamic content | ⭐⭐⭐      | ⭐⭐⭐⭐⭐ | ✅             |
| **CSR**  | Admin panels, interactive apps   | ⭐⭐        | ⭐         | ✅             |

---

## 🔧 **Project Setup & Configuration**

### **Advanced Next.js Configuration**

```javascript
// next.config.js
const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // React configuration
  reactStrictMode: true,
  swcMinify: true, // Use SWC for faster builds

  // Experimental features
  experimental: {
    appDir: true, // Next.js 13+ App Router
    serverComponentsExternalPackages: ["mongoose"],
    turbotrace: {
      logLevel: "error",
    },
  },

  // Images optimization
  images: {
    domains: ["example.com", "cdn.example.com"],
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: "/old-blog/:slug*",
        destination: "/blog/:slug*",
        permanent: true,
      },
      {
        source: "/admin",
        destination: "/admin/dashboard",
        permanent: false,
      },
    ];
  },

  // Rewrites for API proxy
  async rewrites() {
    return [
      {
        source: "/api/external/:path*",
        destination: "https://external-api.example.com/:path*",
      },
    ];
  },

  // Webpack customization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Custom webpack configuration
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });

    // Bundle analyzer in development
    if (dev && !isServer) {
      const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: "server",
          openAnalyzer: false,
        })
      );
    }

    return config;
  },

  // Output configuration
  output: "standalone", // For Docker deployment

  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: "your-org",
  project: "your-project",
});
```

### **TypeScript Configuration**

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/pages/*": ["./src/pages/*"],
      "@/styles/*": ["./src/styles/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"],
      "@/lib/*": ["./src/lib/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## 🏗️ **Static Site Generation (SSG)**

### **Basic SSG Implementation**

```tsx
// pages/blog/[slug].tsx
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { ParsedUrlQuery } from "querystring";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: {
    name: string;
    avatar: string;
  };
  publishedAt: string;
  updatedAt: string;
  tags: string[];
  featuredImage: string;
  readingTime: number;
  seo: {
    metaTitle: string;
    metaDescription: string;
    ogImage: string;
  };
}

interface BlogPostPageProps {
  post: BlogPost;
  relatedPosts: BlogPost[];
}

interface Params extends ParsedUrlQuery {
  slug: string;
}

const BlogPostPage: NextPage<BlogPostPageProps> = ({ post, relatedPosts }) => {
  return (
    <>
      <Head>
        <title>{post.seo.metaTitle || post.title}</title>
        <meta name="description" content={post.seo.metaDescription || post.excerpt} />
        <meta property="og:title" content={post.seo.metaTitle || post.title} />
        <meta property="og:description" content={post.seo.metaDescription || post.excerpt} />
        <meta property="og:image" content={post.seo.ogImage || post.featuredImage} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={post.publishedAt} />
        <meta property="article:modified_time" content={post.updatedAt} />
        <meta property="article:author" content={post.author.name} />
        {post.tags.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        <link rel="canonical" href={`https://example.com/blog/${post.id}`} />

        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: post.title,
              description: post.excerpt,
              author: {
                "@type": "Person",
                name: post.author.name,
              },
              datePublished: post.publishedAt,
              dateModified: post.updatedAt,
              image: post.featuredImage,
              url: `https://example.com/blog/${post.id}`,
            }),
          }}
        />
      </Head>

      <article className="blog-post">
        <header className="blog-post-header">
          <div className="blog-post-meta">
            <time dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleDateString()}</time>
            <span>{post.readingTime} min read</span>
          </div>

          <h1 className="blog-post-title">{post.title}</h1>

          <div className="blog-post-author">
            <Image src={post.author.avatar} alt={post.author.name} width={40} height={40} className="author-avatar" />
            <span>{post.author.name}</span>
          </div>

          {post.featuredImage && (
            <div className="featured-image">
              <Image src={post.featuredImage} alt={post.title} width={800} height={400} priority sizes="(max-width: 768px) 100vw, 800px" />
            </div>
          )}
        </header>

        <div className="blog-post-content">
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>

        <footer className="blog-post-footer">
          <div className="tags">
            {post.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        </footer>
      </article>

      {relatedPosts.length > 0 && (
        <section className="related-posts">
          <h2>Related Posts</h2>
          <div className="related-posts-grid">
            {relatedPosts.map((relatedPost) => (
              <BlogPostCard key={relatedPost.id} post={relatedPost} />
            ))}
          </div>
        </section>
      )}
    </>
  );
};

export const getStaticPaths: GetStaticPaths<Params> = async () => {
  // Fetch all blog post slugs
  const posts = await fetchAllBlogPosts();

  const paths = posts.map((post) => ({
    params: { slug: post.slug },
  }));

  return {
    paths,
    fallback: "blocking", // Enable ISR for new posts
  };
};

export const getStaticProps: GetStaticProps<BlogPostPageProps, Params> = async ({ params, preview = false }) => {
  try {
    if (!params?.slug) {
      return { notFound: true };
    }

    // Fetch blog post data
    const post = await fetchBlogPost(params.slug, preview);

    if (!post) {
      return { notFound: true };
    }

    // Fetch related posts
    const relatedPosts = await fetchRelatedPosts(post.id, post.tags);

    return {
      props: {
        post,
        relatedPosts: relatedPosts.slice(0, 3), // Limit to 3 related posts
      },
      revalidate: 3600, // Revalidate every hour (ISR)
    };
  } catch (error) {
    console.error("Error in getStaticProps:", error);

    return {
      notFound: true,
    };
  }
};

export default BlogPostPage;

// lib/blog.ts - Data fetching functions
import { cache } from "react";

export const fetchBlogPost = cache(async (slug: string, preview = false): Promise<BlogPost | null> => {
  try {
    const response = await fetch(`${process.env.CMS_API_URL}/posts/${slug}`, {
      headers: {
        Authorization: `Bearer ${process.env.CMS_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.post;
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return null;
  }
});

export const fetchAllBlogPosts = cache(async (): Promise<BlogPost[]> => {
  try {
    const response = await fetch(`${process.env.CMS_API_URL}/posts`, {
      headers: {
        Authorization: `Bearer ${process.env.CMS_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch posts");
    }

    const data = await response.json();
    return data.posts;
  } catch (error) {
    console.error("Error fetching all blog posts:", error);
    return [];
  }
});

export const fetchRelatedPosts = cache(async (postId: string, tags: string[]): Promise<BlogPost[]> => {
  try {
    const response = await fetch(`${process.env.CMS_API_URL}/posts/related`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CMS_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ postId, tags }),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.posts;
  } catch (error) {
    console.error("Error fetching related posts:", error);
    return [];
  }
});
```

### **Advanced SSG with Dynamic Routes**

```tsx
// pages/products/[category]/[...slug].tsx - Catch-all dynamic routes
import { GetStaticPaths, GetStaticProps } from "next";

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  images: string[];
  description: string;
  specifications: Record<string, any>;
  availability: {
    inStock: boolean;
    quantity: number;
    estimatedDelivery: string;
  };
}

interface ProductPageProps {
  product: Product;
  breadcrumbs: Array<{ name: string; href: string }>;
  relatedProducts: Product[];
}

interface Params extends ParsedUrlQuery {
  category: string;
  slug: string[];
}

const ProductPage: NextPage<ProductPageProps> = ({ product, breadcrumbs, relatedProducts }) => {
  return (
    <div className="product-page">
      <Breadcrumbs items={breadcrumbs} />
      <ProductDetails product={product} />
      <RelatedProducts products={relatedProducts} />
    </div>
  );
};

export const getStaticPaths: GetStaticPaths<Params> = async () => {
  // Generate paths for popular products only
  // Less popular products will use fallback: 'blocking'
  const popularProducts = await fetchPopularProducts();

  const paths = popularProducts.map((product) => ({
    params: {
      category: product.category,
      slug: [product.subcategory, product.slug].filter(Boolean),
    },
  }));

  return {
    paths,
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps<ProductPageProps, Params> = async ({ params }) => {
  if (!params?.category || !params?.slug) {
    return { notFound: true };
  }

  const category = params.category;
  const productSlug = params.slug[params.slug.length - 1];

  try {
    const [product, relatedProducts] = await Promise.all([fetchProduct(category, productSlug), fetchRelatedProducts(category, productSlug)]);

    if (!product) {
      return { notFound: true };
    }

    const breadcrumbs = generateBreadcrumbs(category, params.slug);

    return {
      props: {
        product,
        breadcrumbs,
        relatedProducts,
      },
      revalidate: 86400, // Revalidate daily
    };
  } catch (error) {
    console.error("Error in getStaticProps:", error);
    return { notFound: true };
  }
};

export default ProductPage;
```

---

## ⚡ **Server-Side Rendering (SSR)**

### **SSR with Authentication**

```tsx
// pages/dashboard/index.tsx
import { GetServerSideProps } from "next";
import { useSession, getSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  analytics: {
    totalRevenue: number;
    totalOrders: number;
    conversionRate: number;
    topProducts: Array<{
      id: string;
      name: string;
      sales: number;
    }>;
  };
  recentOrders: Array<{
    id: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
}

interface DashboardPageProps {
  data: DashboardData;
  error?: string;
}

const DashboardPage: NextPage<DashboardPageProps> = ({ data, error }) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (!session) {
      router.push("/login");
      return;
    }
  }, [session, status, router]);

  if (error) {
    return (
      <div className="error-page">
        <h1>Error Loading Dashboard</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  if (!session) {
    return null; // Will redirect to login
  }

  return (
    <div className="dashboard">
      <DashboardHeader user={data.user} />
      <DashboardStats analytics={data.analytics} />
      <RecentOrders orders={data.recentOrders} />
    </div>
  );
};

export const getServerSideProps: GetServerSideProps<DashboardPageProps> = async (context) => {
  try {
    // Get session from request
    const session = await getSession(context);

    if (!session) {
      return {
        redirect: {
          destination: "/login",
          permanent: false,
        },
      };
    }

    // Check user permissions
    if (!["admin", "manager"].includes(session.user.role)) {
      return {
        redirect: {
          destination: "/unauthorized",
          permanent: false,
        },
      };
    }

    // Fetch dashboard data server-side
    const [analyticsData, recentOrders] = await Promise.all([fetchAnalytics(session.user.id), fetchRecentOrders(session.user.id)]);

    return {
      props: {
        data: {
          user: session.user,
          analytics: analyticsData,
          recentOrders,
        },
      },
    };
  } catch (error) {
    console.error("Dashboard SSR error:", error);

    return {
      props: {
        data: null,
        error: "Failed to load dashboard data",
      },
    };
  }
};

export default DashboardPage;

// lib/dashboard.ts
export async function fetchAnalytics(userId: string) {
  const response = await fetch(`${process.env.INTERNAL_API_URL}/analytics/${userId}`, {
    headers: {
      Authorization: `Bearer ${process.env.INTERNAL_API_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch analytics");
  }

  return response.json();
}

export async function fetchRecentOrders(userId: string) {
  const response = await fetch(`${process.env.INTERNAL_API_URL}/orders/recent`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.INTERNAL_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, limit: 10 }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch recent orders");
  }

  return response.json();
}
```

### **SSR with Real-time Data**

```tsx
// pages/stocks/[symbol].tsx
import { GetServerSideProps } from "next";
import { useEffect, useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  historicalData: Array<{
    timestamp: string;
    price: number;
    volume: number;
  }>;
  news: Array<{
    id: string;
    title: string;
    summary: string;
    publishedAt: string;
    source: string;
  }>;
}

interface StockPageProps {
  initialData: StockData;
  symbol: string;
}

const StockPage: NextPage<StockPageProps> = ({ initialData, symbol }) => {
  const [stockData, setStockData] = useState<StockData>(initialData);

  // Real-time price updates via WebSocket
  const { lastMessage, readyState } = useWebSocket(`wss://api.example.com/stocks/${symbol}/live`, {
    onMessage: (event) => {
      const update = JSON.parse(event.data);
      setStockData((prev) => ({
        ...prev,
        price: update.price,
        change: update.change,
        changePercent: update.changePercent,
        volume: update.volume,
      }));
    },
  });

  return (
    <div className="stock-page">
      <Head>
        <title>
          {stockData.name} ({stockData.symbol}) - Stock Price
        </title>
        <meta name="description" content={`Real-time stock price for ${stockData.name} (${stockData.symbol})`} />
      </Head>

      <StockHeader stock={stockData} isLive={readyState === 1} />

      <div className="stock-content">
        <div className="stock-chart">
          <PriceChart data={stockData.historicalData} />
        </div>

        <div className="stock-info">
          <StockMetrics stock={stockData} />
          <StockNews news={stockData.news} />
        </div>
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps<StockPageProps> = async ({ params, req }) => {
  const symbol = params?.symbol as string;

  if (!symbol) {
    return { notFound: true };
  }

  try {
    // Fetch initial stock data server-side
    const stockData = await fetchStockData(symbol);

    if (!stockData) {
      return { notFound: true };
    }

    // Set cache headers for frequent updates
    if (req && req.res) {
      req.res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    }

    return {
      props: {
        initialData: stockData,
        symbol,
      },
    };
  } catch (error) {
    console.error("Error fetching stock data:", error);
    return { notFound: true };
  }
};

export default StockPage;
```

---

## 🔄 **Incremental Static Regeneration (ISR)**

### **ISR Implementation**

```tsx
// pages/products/index.tsx
import { GetStaticProps } from "next";

interface ProductsPageProps {
  products: Product[];
  categories: Category[];
  totalCount: number;
  lastUpdated: string;
}

const ProductsPage: NextPage<ProductsPageProps> = ({ products, categories, totalCount, lastUpdated }) => {
  return (
    <div className="products-page">
      <Head>
        <title>Products - E-commerce Store</title>
        <meta name="description" content={`Browse our collection of ${totalCount} products`} />
      </Head>

      <ProductsHeader totalCount={totalCount} lastUpdated={lastUpdated} />

      <div className="products-content">
        <ProductFilters categories={categories} />
        <ProductGrid products={products} />
      </div>
    </div>
  );
};

export const getStaticProps: GetStaticProps<ProductsPageProps> = async () => {
  try {
    const [products, categories, totalCount] = await Promise.all([fetchFeaturedProducts(), fetchCategories(), fetchProductCount()]);

    return {
      props: {
        products,
        categories,
        totalCount,
        lastUpdated: new Date().toISOString(),
      },
      // Revalidate every 5 minutes
      revalidate: 300,
    };
  } catch (error) {
    console.error("Error in getStaticProps:", error);

    // Return fallback data or empty state
    return {
      props: {
        products: [],
        categories: [],
        totalCount: 0,
        lastUpdated: new Date().toISOString(),
      },
      revalidate: 60, // Retry more frequently on error
    };
  }
};

export default ProductsPage;

// lib/products.ts
export async function fetchFeaturedProducts(): Promise<Product[]> {
  const response = await fetch(`${process.env.API_URL}/products/featured`, {
    headers: {
      Authorization: `Bearer ${process.env.API_TOKEN}`,
    },
    // Add timeout to prevent hanging builds
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch featured products: ${response.status}`);
  }

  const data = await response.json();
  return data.products;
}
```

### **On-Demand ISR**

```tsx
// pages/api/revalidate.ts
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check for secret to confirm this is a valid request
  if (req.query.secret !== process.env.REVALIDATION_SECRET) {
    return res.status(401).json({ message: "Invalid token" });
  }

  try {
    const { path, type } = req.body;

    switch (type) {
      case "product":
        // Revalidate specific product page
        await res.revalidate(`/products/${path}`);
        // Also revalidate products listing
        await res.revalidate("/products");
        break;

      case "blog":
        // Revalidate specific blog post
        await res.revalidate(`/blog/${path}`);
        // Also revalidate blog index
        await res.revalidate("/blog");
        break;

      case "page":
        // Revalidate specific page
        await res.revalidate(path);
        break;

      default:
        return res.status(400).json({ message: "Invalid revalidation type" });
    }

    return res.json({
      revalidated: true,
      path,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Revalidation error:", err);
    return res.status(500).json({ message: "Error revalidating" });
  }
}

// Webhook handler for CMS updates
// pages/api/webhooks/cms.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Verify webhook signature
  const signature = req.headers["x-webhook-signature"] as string;
  if (!verifyWebhookSignature(req.body, signature)) {
    return res.status(401).json({ message: "Invalid signature" });
  }

  const { event, data } = req.body;

  try {
    switch (event) {
      case "post.published":
      case "post.updated":
        await res.revalidate(`/blog/${data.slug}`);
        await res.revalidate("/blog");
        break;

      case "product.updated":
        await res.revalidate(`/products/${data.category}/${data.slug}`);
        await res.revalidate("/products");
        break;

      case "page.updated":
        await res.revalidate(data.path);
        break;
    }

    res.status(200).json({
      message: "Revalidation triggered",
      event,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Webhook revalidation error:", error);
    res.status(500).json({ message: "Revalidation failed" });
  }
}

function verifyWebhookSignature(payload: any, signature: string): boolean {
  const crypto = require("crypto");
  const secret = process.env.WEBHOOK_SECRET;

  const expectedSignature = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");

  return signature === `sha256=${expectedSignature}`;
}
```

---

## 🌐 **API Routes**

### **RESTful API Implementation**

```tsx
// pages/api/products/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { withAuth } from "@/middleware/auth";
import { rateLimit } from "@/middleware/rateLimit";
import { cors } from "@/middleware/cors";

const querySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  category: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["name", "price", "created_at"]).optional().default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().min(1),
  price: z.number().positive(),
  category: z.string().min(1),
  images: z.array(z.string().url()).min(1),
  specifications: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "GET":
      return await getProducts(req, res);
    case "POST":
      return await createProduct(req, res);
    default:
      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(405).json({ error: "Method not allowed" });
  }
}

async function getProducts(req: NextApiRequest, res: NextApiResponse) {
  try {
    const query = querySchema.parse(req.query);

    const page = parseInt(query.page);
    const limit = Math.min(parseInt(query.limit), 100); // Max 100 items
    const offset = (page - 1) * limit;

    const products = await db.product.findMany({
      where: {
        ...(query.category && { category: query.category }),
        ...(query.search && {
          OR: [{ name: { contains: query.search, mode: "insensitive" } }, { description: { contains: query.search, mode: "insensitive" } }],
        }),
      },
      orderBy: {
        [query.sortBy]: query.sortOrder,
      },
      skip: offset,
      take: limit,
      include: {
        category: true,
        images: true,
      },
    });

    const totalCount = await db.product.count({
      where: {
        ...(query.category && { category: query.category }),
        ...(query.search && {
          OR: [{ name: { contains: query.search, mode: "insensitive" } }, { description: { contains: query.search, mode: "insensitive" } }],
        }),
      },
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");

    return res.status(200).json({
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get products error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: error.errors,
      });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
}

async function createProduct(req: NextApiRequest, res: NextApiResponse) {
  try {
    const productData = createProductSchema.parse(req.body);

    const product = await db.product.create({
      data: {
        ...productData,
        slug: generateSlug(productData.name),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        category: true,
        images: true,
      },
    });

    // Trigger revalidation of product pages
    await res.revalidate("/products");
    await res.revalidate(`/products/${product.category}/${product.slug}`);

    return res.status(201).json({ product });
  } catch (error) {
    console.error("Create product error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid product data",
        details: error.errors,
      });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
}

// Apply middleware
export default cors(rateLimit(withAuth(handler, { requireAdmin: true })));

// pages/api/products/[id].ts
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid product ID" });
  }

  switch (req.method) {
    case "GET":
      return await getProduct(id, res);
    case "PUT":
      return await updateProduct(id, req, res);
    case "DELETE":
      return await deleteProduct(id, res);
    default:
      res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
      return res.status(405).json({ error: "Method not allowed" });
  }
}

async function getProduct(id: string, res: NextApiResponse) {
  try {
    const product = await db.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: true,
        reviews: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");

    return res.status(200).json({ product });
  } catch (error) {
    console.error("Get product error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default cors(rateLimit(handler));
```

### **GraphQL API Route**

```tsx
// pages/api/graphql.ts
import { ApolloServer } from "apollo-server-micro";
import { typeDefs } from "@/graphql/schema";
import { resolvers } from "@/graphql/resolvers";
import { createContext } from "@/graphql/context";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: createContext,
  plugins: [process.env.NODE_ENV === "development" ? ApolloServerPluginLandingPageGraphQLPlayground() : {}],
  introspection: process.env.NODE_ENV === "development",
});

const startServer = apolloServer.start();

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.end();
    return false;
  }

  await startServer;
  await apolloServer.createHandler({
    path: "/api/graphql",
  })(req, res);
}

export const config = {
  api: {
    bodyParser: false,
  },
};

// graphql/schema.ts
import { gql } from "apollo-server-micro";

export const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    name: String!
    avatar: String
    role: Role!
    createdAt: String!
  }

  type Product {
    id: ID!
    name: String!
    description: String!
    price: Float!
    category: Category!
    images: [String!]!
    specifications: JSON
    reviews: [Review!]!
    rating: Float
    createdAt: String!
  }

  type Query {
    me: User
    products(first: Int, after: String, category: String, search: String): ProductConnection!
    product(id: ID!): Product
  }

  type Mutation {
    createProduct(input: CreateProductInput!): Product!
    updateProduct(id: ID!, input: UpdateProductInput!): Product!
    deleteProduct(id: ID!): Boolean!
  }

  scalar JSON
`;

// graphql/resolvers.ts
export const resolvers = {
  Query: {
    me: async (parent, args, context) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }
      return context.user;
    },

    products: async (parent, { first = 10, after, category, search }, context) => {
      const products = await context.db.product.findMany({
        where: {
          ...(category && { categoryId: category }),
          ...(search && {
            OR: [{ name: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }],
          }),
        },
        take: first + 1,
        ...(after && { cursor: { id: after }, skip: 1 }),
        include: {
          category: true,
          reviews: true,
        },
      });

      const hasNextPage = products.length > first;
      const edges = products.slice(0, first).map((product) => ({
        node: product,
        cursor: product.id,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges[edges.length - 1]?.cursor,
        },
      };
    },
  },

  Mutation: {
    createProduct: async (parent, { input }, context) => {
      if (!context.user || context.user.role !== "ADMIN") {
        throw new Error("Not authorized");
      }

      return await context.db.product.create({
        data: input,
        include: {
          category: true,
          reviews: true,
        },
      });
    },
  },

  Product: {
    rating: async (product, args, context) => {
      const avg = await context.db.review.aggregate({
        where: { productId: product.id },
        _avg: { rating: true },
      });

      return avg._avg.rating || 0;
    },
  },
};
```

---

## 🚀 **Performance Optimization**

### **Image Optimization**

```tsx
// components/OptimizedImage.tsx
import Image from "next/image";
import { useState } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  sizes?: string;
  fill?: boolean;
  quality?: number;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({ src, alt, width, height, priority = false, className, sizes, fill = false, quality = 75 }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`image-container ${className || ""}`}>
      {!hasError ? (
        <Image
          src={src}
          alt={alt}
          width={!fill ? width : undefined}
          height={!fill ? height : undefined}
          fill={fill}
          priority={priority}
          quality={quality}
          sizes={sizes || "(max-width: 768px) 100vw, 50vw"}
          className={`
            transition-opacity duration-300
            ${isLoading ? "opacity-0" : "opacity-100"}
          `}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxAAPwCdABmX/9k="
        />
      ) : (
        <div className="image-error">
          <span>Failed to load image</span>
        </div>
      )}

      {isLoading && (
        <div className="image-skeleton">
          <div className="animate-pulse bg-gray-300 w-full h-full" />
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;

// components/ProductGallery.tsx
import { useState } from "react";
import OptimizedImage from "./OptimizedImage";

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

const ProductGallery: React.FC<ProductGalleryProps> = ({ images, productName }) => {
  const [selectedImage, setSelectedImage] = useState(0);

  return (
    <div className="product-gallery">
      <div className="main-image">
        <OptimizedImage src={images[selectedImage]} alt={`${productName} - Image ${selectedImage + 1}`} width={600} height={600} priority={selectedImage === 0} sizes="(max-width: 768px) 100vw, 600px" quality={85} />
      </div>

      <div className="thumbnail-list">
        {images.map((image, index) => (
          <button key={index} className={`thumbnail ${index === selectedImage ? "active" : ""}`} onClick={() => setSelectedImage(index)}>
            <OptimizedImage src={image} alt={`${productName} - Thumbnail ${index + 1}`} width={80} height={80} quality={60} sizes="80px" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProductGallery;
```

### **Bundle Optimization**

```javascript
// next.config.js - Bundle optimization
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  // Optimize bundle splitting
  experimental: {
    optimizePackageImports: ["@mui/material", "@mui/icons-material", "lodash"],
  },

  // Custom webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Optimize lodash imports
    config.resolve.alias = {
      ...config.resolve.alias,
      lodash: "lodash-es",
    };

    // Split vendor chunks
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            priority: 10,
            chunks: "all",
          },
          mui: {
            test: /[\\/]node_modules[\\/]@mui[\\/]/,
            name: "mui",
            priority: 15,
            chunks: "all",
          },
        },
      };
    }

    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);

// Dynamic imports for code splitting
// components/LazyComponents.tsx
import dynamic from "next/dynamic";

// Lazy load heavy components
export const ChartComponent = dynamic(() => import("./Chart"), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Disable SSR for client-only components
});

export const VideoPlayer = dynamic(() => import("./VideoPlayer"), {
  loading: () => <VideoPlayerSkeleton />,
  ssr: false,
});

export const MapComponent = dynamic(() => import("./Map").then((mod) => mod.MapComponent), {
  loading: () => <MapSkeleton />,
  ssr: false,
});

// Conditional loading
export const AdminPanel = dynamic(() => import("./AdminPanel"), {
  loading: () => <AdminPanelSkeleton />,
});

// Usage with user permissions
const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <div>
      <h1>Dashboard</h1>
      {user?.role === "admin" && (
        <Suspense fallback={<AdminPanelSkeleton />}>
          <AdminPanel />
        </Suspense>
      )}
    </div>
  );
};
```

---

## 🎯 **Best Practices Summary**

### **✅ Next.js Production Checklist**

#### **Performance**

- ✅ **Image optimization** - Use Next.js Image component
- ✅ **Bundle splitting** - Dynamic imports for large components
- ✅ **Caching strategy** - Proper cache headers and ISR
- ✅ **Critical CSS** - Inline critical styles
- ✅ **Preloading** - Priority loading for important resources

#### **SEO & Accessibility**

- ✅ **Meta tags** - Comprehensive SEO meta tags
- ✅ **Structured data** - JSON-LD for rich snippets
- ✅ **Semantic HTML** - Proper heading hierarchy
- ✅ **Alt text** - Descriptive image alt attributes
- ✅ **Focus management** - Accessible navigation

#### **Security**

- ✅ **Security headers** - CSP, HSTS, X-Frame-Options
- ✅ **Environment variables** - Secure API keys
- ✅ **Input validation** - Sanitize user inputs
- ✅ **CSRF protection** - CSRF tokens for forms
- ✅ **Rate limiting** - API rate limiting

#### **Monitoring**

- ✅ **Error tracking** - Sentry or similar service
- ✅ **Performance monitoring** - Core Web Vitals
- ✅ **Analytics** - User behavior tracking
- ✅ **Uptime monitoring** - Service availability
- ✅ **Bundle analysis** - Regular bundle size monitoring

---

## 🚀 **Next Steps**

1. **Choose rendering strategy** based on your use case
2. **Set up performance monitoring** from day one
3. **Implement proper SEO** with meta tags and structured data
4. **Optimize images and fonts** for better Core Web Vitals
5. **Set up proper caching** with ISR and API caching
6. **Deploy with CI/CD** for consistent builds

_Next.js provides the foundation for building fast, SEO-friendly, and scalable React applications. Master these patterns to deliver exceptional user experiences!_
