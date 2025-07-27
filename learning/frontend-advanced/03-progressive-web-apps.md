# Progressive Web Apps (PWA) for SDE2+ Engineers 📱

## 🎯 **Overview**

Progressive Web Apps (PWAs) combine the best of web and mobile apps, delivering app-like experiences through modern web technologies. This guide covers comprehensive PWA implementation including service workers, offline functionality, push notifications, and native-like features.

## 📚 **PWA Fundamentals**

### **Core PWA Features**

- **Reliable** - Load instantly and work offline
- **Fast** - Respond quickly to user interactions
- **Engaging** - Feel like native apps with immersive UX
- **Progressive** - Work for every user on any device
- **Responsive** - Fit any form factor
- **Connectivity-independent** - Work offline or with poor connections
- **App-like** - Use app-style interactions and navigation
- **Fresh** - Always up-to-date with service workers
- **Safe** - Served via HTTPS
- **Discoverable** - Identifiable as applications
- **Re-engageable** - Access through push notifications
- **Installable** - Can be installed on device home screen
- **Linkable** - Share via URL without app store

### **PWA Requirements**

| Feature               | Requirement | Purpose                                 |
| --------------------- | ----------- | --------------------------------------- |
| **HTTPS**             | Mandatory   | Security and service worker requirement |
| **Web App Manifest**  | Required    | Installation and app metadata           |
| **Service Worker**    | Required    | Offline functionality and caching       |
| **Responsive Design** | Required    | Works on all devices                    |
| **Fast Performance**  | Recommended | App-like experience                     |

---

## 🔧 **Web App Manifest**

### **Complete Manifest Configuration**

```json
// public/manifest.json
{
  "name": "E-Commerce PWA",
  "short_name": "ShopPWA",
  "description": "A progressive web app for modern e-commerce experiences",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#2196F3",
  "background_color": "#ffffff",
  "lang": "en-US",
  "scope": "/",

  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],

  "shortcuts": [
    {
      "name": "Products",
      "short_name": "Products",
      "description": "Browse our product catalog",
      "url": "/products",
      "icons": [
        {
          "src": "/icons/products-96x96.png",
          "sizes": "96x96",
          "type": "image/png"
        }
      ]
    },
    {
      "name": "Cart",
      "short_name": "Cart",
      "description": "View shopping cart",
      "url": "/cart",
      "icons": [
        {
          "src": "/icons/cart-96x96.png",
          "sizes": "96x96",
          "type": "image/png"
        }
      ]
    },
    {
      "name": "Orders",
      "short_name": "Orders",
      "description": "Track your orders",
      "url": "/orders",
      "icons": [
        {
          "src": "/icons/orders-96x96.png",
          "sizes": "96x96",
          "type": "image/png"
        }
      ]
    }
  ],

  "categories": ["shopping", "business", "productivity"],

  "screenshots": [
    {
      "src": "/screenshots/desktop-1.png",
      "sizes": "1280x720",
      "type": "image/png",
      "platform": "wide",
      "label": "Product catalog on desktop"
    },
    {
      "src": "/screenshots/mobile-1.png",
      "sizes": "320x640",
      "type": "image/png",
      "platform": "narrow",
      "label": "Product catalog on mobile"
    }
  ],

  "related_applications": [
    {
      "platform": "play",
      "url": "https://play.google.com/store/apps/details?id=com.example.shop",
      "id": "com.example.shop"
    },
    {
      "platform": "itunes",
      "url": "https://apps.apple.com/app/shop-app/id123456789"
    }
  ],

  "prefer_related_applications": false,

  "protocol_handlers": [
    {
      "protocol": "web+shop",
      "url": "/product?id=%s"
    }
  ],

  "edge_side_panel": {
    "preferred_width": 400
  }
}
```

### **Manifest Integration in HTML**

```html
<!-- public/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json" />

    <!-- iOS specific meta tags -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="ShopPWA" />
    <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
    <link rel="apple-touch-startup-image" href="/icons/splash-640x1136.png" />

    <!-- Windows specific meta tags -->
    <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
    <meta name="msapplication-TileColor" content="#2196F3" />

    <!-- Theme colors -->
    <meta name="theme-color" content="#2196F3" />
    <meta name="msapplication-navbutton-color" content="#2196F3" />
    <meta name="apple-mobile-web-app-status-bar-style" content="#2196F3" />

    <title>E-Commerce PWA</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

---

## ⚙️ **Service Worker Implementation**

### **Complete Service Worker Setup**

```javascript
// public/sw.js
const CACHE_NAME = "shop-pwa-v1.2.0";
const STATIC_CACHE_NAME = "static-v1.2.0";
const DYNAMIC_CACHE_NAME = "dynamic-v1.2.0";
const IMAGE_CACHE_NAME = "images-v1.2.0";

// Assets to cache immediately
const STATIC_ASSETS = ["/", "/static/css/main.css", "/static/js/main.js", "/manifest.json", "/offline.html", "/icons/icon-192x192.png", "/icons/icon-512x512.png"];

// API endpoints to cache
const API_CACHE_PATTERNS = [/\/api\/products/, /\/api\/categories/, /\/api\/user\/profile/];

// Image cache patterns
const IMAGE_PATTERNS = [/\.(?:png|jpg|jpeg|svg|gif|webp)$/, /\/images\//, /\/uploads\//];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker");

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      }),

      // Skip waiting to activate immediately
      self.skipWaiting(),
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker");

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return !cacheName.includes("v1.2.0");
            })
            .map((cacheName) => {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            })
        );
      }),

      // Take control of all clients
      self.clients.claim(),
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Handle different request types
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else {
    event.respondWith(handleNavigationRequest(request));
  }
});

// Strategy: Cache First (for static assets)
async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // If not in cache, fetch and cache
    const response = await fetch(request);

    if (response.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error("[SW] Static asset fetch failed:", error);

    // Return offline fallback for critical assets
    if (request.url.includes(".html")) {
      return caches.match("/offline.html");
    }

    throw error;
  }
}

// Strategy: Cache First with expiration (for images)
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Check if image is stale (older than 7 days)
      const cachedDate = cachedResponse.headers.get("sw-cached-date");
      if (cachedDate) {
        const age = Date.now() - parseInt(cachedDate);
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

        if (age > maxAge) {
          // Image is stale, fetch new version in background
          fetchAndCacheImage(request, cache);
        }
      }

      return cachedResponse;
    }

    // Fetch and cache new image
    return await fetchAndCacheImage(request, cache);
  } catch (error) {
    console.error("[SW] Image fetch failed:", error);

    // Return placeholder image
    return caches.match("/icons/placeholder.png");
  }
}

async function fetchAndCacheImage(request, cache) {
  const response = await fetch(request);

  if (response.status === 200) {
    const responseClone = response.clone();

    // Add custom header for cache date
    const customResponse = new Response(responseClone.body, {
      status: responseClone.status,
      statusText: responseClone.statusText,
      headers: {
        ...Object.fromEntries(responseClone.headers.entries()),
        "sw-cached-date": Date.now().toString(),
      },
    });

    cache.put(request, customResponse);
  }

  return response;
}

// Strategy: Network First with cache fallback (for API requests)
async function handleAPIRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);

  try {
    // Try network first
    const response = await fetch(request, {
      timeout: 5000, // 5 second timeout
    });

    if (response.status === 200) {
      // Only cache successful GET requests
      if (request.method === "GET") {
        // Add timestamp for cache validation
        const responseClone = response.clone();
        const customResponse = new Response(responseClone.body, {
          status: responseClone.status,
          statusText: responseClone.statusText,
          headers: {
            ...Object.fromEntries(responseClone.headers.entries()),
            "sw-cached-date": Date.now().toString(),
            "Cache-Control": "max-age=300", // 5 minutes
          },
        });

        cache.put(request, customResponse);
      }
    }

    return response;
  } catch (error) {
    console.log("[SW] Network failed, trying cache:", error);

    // Fall back to cache
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Check if cached data is stale
      const cachedDate = cachedResponse.headers.get("sw-cached-date");
      if (cachedDate) {
        const age = Date.now() - parseInt(cachedDate);
        const maxAge = 10 * 60 * 1000; // 10 minutes

        if (age > maxAge) {
          console.log("[SW] Cached data is stale");
          // Could show a "data may be outdated" indicator
        }
      }

      return cachedResponse;
    }

    // No cache available, return offline response
    return new Response(
      JSON.stringify({
        error: "Offline",
        message: "No network connection and no cached data available",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Strategy: Network first with cache fallback (for navigation)
async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);

    // Cache successful navigation responses
    if (response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log("[SW] Navigation fetch failed:", error);

    // Try to find cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fall back to offline page
    const offlinePage = await caches.match("/offline.html");
    if (offlinePage) {
      return offlinePage;
    }

    // Last resort - basic offline response
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Offline</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>
        <h1>You're offline</h1>
        <p>Check your internet connection and try again.</p>
      </body>
      </html>
      `,
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}

// Helper functions
function isStaticAsset(request) {
  return request.url.includes("/static/") || request.url.endsWith(".css") || request.url.endsWith(".js") || request.url.endsWith(".json") || request.url.endsWith(".html");
}

function isImageRequest(request) {
  return IMAGE_PATTERNS.some((pattern) => pattern.test(request.url));
}

function isAPIRequest(request) {
  return API_CACHE_PATTERNS.some((pattern) => pattern.test(request.url));
}

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync event:", event.tag);

  if (event.tag === "background-sync-cart") {
    event.waitUntil(syncOfflineCartActions());
  } else if (event.tag === "background-sync-analytics") {
    event.waitUntil(syncAnalytics());
  }
});

async function syncOfflineCartActions() {
  try {
    // Get offline actions from IndexedDB
    const db = await openDB();
    const actions = await db.getAll("offline-actions");

    for (const action of actions) {
      try {
        await fetch("/api/cart/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });

        // Remove successful action
        await db.delete("offline-actions", action.id);
      } catch (error) {
        console.error("[SW] Sync failed for action:", action, error);
      }
    }
  } catch (error) {
    console.error("[SW] Background sync failed:", error);
  }
}

// Push notification handling
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  const options = {
    body: "Default notification body",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "View",
        icon: "/icons/view-icon.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/icons/close-icon.png",
      },
    ],
  };

  if (event.data) {
    const payload = event.data.json();
    options.title = payload.title || "PWA Notification";
    options.body = payload.body || options.body;
    options.icon = payload.icon || options.icon;
    options.data = { ...options.data, ...payload.data };
  }

  event.waitUntil(self.registration.showNotification("PWA Notification", options));
});

// Notification click handling
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification click received:", event);

  event.notification.close();

  if (event.action === "explore") {
    // Open specific page
    event.waitUntil(clients.openWindow("/products"));
  } else if (event.action === "close") {
    // Just close the notification
    return;
  } else {
    // Default action - open app
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        for (const client of clientList) {
          if (client.url === "/" && "focus" in client) {
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow("/");
        }
      })
    );
  }
});

// IndexedDB helper
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("PWAStore", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("offline-actions")) {
        const store = db.createObjectStore("offline-actions", { keyPath: "id" });
        store.createIndex("timestamp", "timestamp");
      }
    };
  });
}
```

### **Service Worker Registration**

```javascript
// src/utils/serviceWorker.js
const isLocalhost = Boolean(window.location.hostname === "localhost" || window.location.hostname === "[::1]" || window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));

export function register(config) {
  if ("serviceWorker" in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener("load", () => {
      const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log("PWA: App is being served cache-first by a service worker");
        });
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log("PWA: Service worker registered successfully");

      // Check for updates
      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.addEventListener("statechange", () => {
          if (installingWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              console.log("PWA: New content available; please refresh");

              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              console.log("PWA: Content cached for offline use");

              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        });
      });
    })
    .catch((error) => {
      console.error("PWA: Service worker registration failed:", error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, {
    headers: { "Service-Worker": "script" },
  })
    .then((response) => {
      const contentType = response.headers.get("content-type");
      if (response.status === 404 || (contentType != null && contentType.indexOf("javascript") === -1)) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log("PWA: No internet connection found. App is running in offline mode.");
    });
}

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// Update notification component
export function showUpdateAvailable(registration) {
  const updateButton = document.createElement("button");
  updateButton.textContent = "Update Available - Click to Refresh";
  updateButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    background: #2196F3;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 4px;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  `;

  updateButton.addEventListener("click", () => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
  });

  document.body.appendChild(updateButton);

  // Auto-hide after 10 seconds
  setTimeout(() => {
    if (document.body.contains(updateButton)) {
      document.body.removeChild(updateButton);
    }
  }, 10000);
}
```

---

## 🔔 **Push Notifications**

### **Push Notification Service**

```javascript
// src/services/pushNotifications.js
class PushNotificationService {
  constructor() {
    this.vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
    this.apiEndpoint = process.env.REACT_APP_API_URL;
  }

  // Request notification permission
  async requestPermission() {
    if (!("Notification" in window)) {
      throw new Error("This browser does not support notifications");
    }

    if (!("serviceWorker" in navigator)) {
      throw new Error("This browser does not support service workers");
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      throw new Error("Notification permission denied");
    }

    return permission;
  }

  // Subscribe to push notifications
  async subscribe() {
    try {
      await this.requestPermission();

      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey),
        });
      }

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);

      return subscription;
    } catch (error) {
      console.error("Push subscription failed:", error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await this.removeSubscriptionFromServer(subscription);
      }

      return true;
    } catch (error) {
      console.error("Push unsubscribe failed:", error);
      throw error;
    }
  }

  // Check subscription status
  async getSubscriptionStatus() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return { supported: false, subscribed: false };
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      return {
        supported: true,
        subscribed: !!subscription,
        permission: Notification.permission,
      };
    } catch (error) {
      console.error("Failed to check subscription status:", error);
      return { supported: false, subscribed: false };
    }
  }

  // Send subscription to server
  async sendSubscriptionToServer(subscription) {
    const response = await fetch(`${this.apiEndpoint}/push/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to send subscription to server");
    }

    return await response.json();
  }

  // Remove subscription from server
  async removeSubscriptionFromServer(subscription) {
    const response = await fetch(`${this.apiEndpoint}/push/unsubscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to remove subscription from server");
    }
  }

  // Utility functions
  urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  getAuthToken() {
    return localStorage.getItem("auth_token") || "";
  }
}

// React hook for push notifications
import { useState, useEffect } from "react";

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState("default");
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pushService = new PushNotificationService();

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const status = await pushService.getSubscriptionStatus();
      setIsSupported(status.supported);
      setIsSubscribed(status.subscribed);
      setPermission(status.permission);
    } catch (error) {
      console.error("Failed to check push notification status:", error);
      setError(error.message);
    }
  };

  const subscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      const sub = await pushService.subscribe();
      setSubscription(sub);
      setIsSubscribed(true);
      setPermission("granted");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      await pushService.unsubscribe();
      setSubscription(null);
      setIsSubscribed(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    permission,
    subscription,
    loading,
    error,
    subscribe,
    unsubscribe,
    checkStatus,
  };
};

// Push notification component
export const PushNotificationButton = () => {
  const { isSupported, isSubscribed, permission, loading, error, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className="push-notification-unsupported">
        <p>Push notifications are not supported in this browser.</p>
      </div>
    );
  }

  return (
    <div className="push-notification-controls">
      <h3>Push Notifications</h3>

      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      )}

      <div className="notification-status">
        <p>Permission: {permission}</p>
        <p>Subscribed: {isSubscribed ? "Yes" : "No"}</p>
      </div>

      <div className="notification-actions">
        {!isSubscribed ? (
          <button onClick={subscribe} disabled={loading} className="btn btn-primary">
            {loading ? "Subscribing..." : "Enable Notifications"}
          </button>
        ) : (
          <button onClick={unsubscribe} disabled={loading} className="btn btn-secondary">
            {loading ? "Unsubscribing..." : "Disable Notifications"}
          </button>
        )}
      </div>
    </div>
  );
};
```

### **Server-side Push Implementation (Node.js)**

```javascript
// server/services/pushService.js
const webpush = require("web-push");
const crypto = require("crypto");

class PushService {
  constructor() {
    // Configure VAPID keys
    webpush.setVapidDetails("mailto:your-email@domain.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  }

  // Send push notification to specific user
  async sendToUser(userId, payload) {
    try {
      const subscriptions = await this.getUserSubscriptions(userId);
      const results = [];

      for (const subscription of subscriptions) {
        try {
          const result = await this.sendNotification(subscription, payload);
          results.push({ subscription: subscription.id, success: true, result });
        } catch (error) {
          console.error("Failed to send to subscription:", error);
          results.push({ subscription: subscription.id, success: false, error: error.message });

          // Remove invalid subscriptions
          if (error.statusCode === 410) {
            await this.removeSubscription(subscription.id);
          }
        }
      }

      return results;
    } catch (error) {
      console.error("Send to user failed:", error);
      throw error;
    }
  }

  // Send push notification to multiple users
  async sendToUsers(userIds, payload) {
    const results = [];

    for (const userId of userIds) {
      try {
        const userResults = await this.sendToUser(userId, payload);
        results.push({ userId, success: true, results: userResults });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }

    return results;
  }

  // Send broadcast notification
  async sendBroadcast(payload, filters = {}) {
    try {
      const subscriptions = await this.getSubscriptions(filters);
      const batchSize = 100; // Send in batches to avoid overwhelming
      const results = [];

      for (let i = 0; i < subscriptions.length; i += batchSize) {
        const batch = subscriptions.slice(i, i + batchSize);
        const batchPromises = batch.map(async (subscription) => {
          try {
            const result = await this.sendNotification(subscription, payload);
            return { subscription: subscription.id, success: true, result };
          } catch (error) {
            console.error("Broadcast notification failed:", error);

            // Remove invalid subscriptions
            if (error.statusCode === 410) {
              await this.removeSubscription(subscription.id);
            }

            return { subscription: subscription.id, success: false, error: error.message };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults.map((r) => r.value || r.reason));

        // Add delay between batches
        if (i + batchSize < subscriptions.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      return results;
    } catch (error) {
      console.error("Broadcast failed:", error);
      throw error;
    }
  }

  // Send individual notification
  async sendNotification(subscription, payload) {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    const options = {
      vapidDetails: {
        subject: "mailto:your-email@domain.com",
        publicKey: process.env.VAPID_PUBLIC_KEY,
        privateKey: process.env.VAPID_PRIVATE_KEY,
      },
      TTL: 60 * 60 * 24, // 24 hours
      urgency: payload.urgency || "normal",
      headers: {
        Topic: payload.topic || "general",
      },
    };

    return await webpush.sendNotification(pushSubscription, JSON.stringify(payload), options);
  }

  // Store subscription
  async storeSubscription(userId, subscriptionData) {
    const subscription = {
      id: crypto.randomUUID(),
      userId: userId,
      endpoint: subscriptionData.endpoint,
      p256dh: subscriptionData.keys.p256dh,
      auth: subscriptionData.keys.auth,
      userAgent: subscriptionData.userAgent,
      createdAt: new Date(),
      lastUsed: new Date(),
    };

    // Check for duplicate subscription
    const existing = await db.subscription.findFirst({
      where: {
        userId: userId,
        endpoint: subscriptionData.endpoint,
      },
    });

    if (existing) {
      // Update last used
      return await db.subscription.update({
        where: { id: existing.id },
        data: { lastUsed: new Date() },
      });
    }

    return await db.subscription.create({
      data: subscription,
    });
  }

  // Remove subscription
  async removeSubscription(subscriptionId) {
    return await db.subscription.delete({
      where: { id: subscriptionId },
    });
  }

  // Get user subscriptions
  async getUserSubscriptions(userId) {
    return await db.subscription.findMany({
      where: { userId: userId },
    });
  }

  // Get subscriptions with filters
  async getSubscriptions(filters = {}) {
    const where = {};

    if (filters.userIds) {
      where.userId = { in: filters.userIds };
    }

    if (filters.createdAfter) {
      where.createdAt = { gte: filters.createdAfter };
    }

    return await db.subscription.findMany({ where });
  }

  // Send scheduled notifications
  async sendOrderUpdates() {
    const pendingOrders = await db.order.findMany({
      where: {
        status: { in: ["shipped", "delivered"] },
        lastNotificationSent: {
          lt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        },
      },
      include: { user: true },
    });

    for (const order of pendingOrders) {
      const payload = {
        title: "Order Update",
        body: `Your order #${order.id} is ${order.status}`,
        icon: "/icons/order-icon.png",
        badge: "/icons/badge-72x72.png",
        data: {
          orderId: order.id,
          action: "view-order",
        },
        actions: [
          {
            action: "view",
            title: "View Order",
          },
          {
            action: "track",
            title: "Track Package",
          },
        ],
      };

      try {
        await this.sendToUser(order.userId, payload);

        // Update last notification sent
        await db.order.update({
          where: { id: order.id },
          data: { lastNotificationSent: new Date() },
        });
      } catch (error) {
        console.error(`Failed to send order update for ${order.id}:`, error);
      }
    }
  }

  // Send promotional notifications
  async sendPromotion(promotion) {
    const payload = {
      title: promotion.title,
      body: promotion.description,
      icon: "/icons/promo-icon.png",
      badge: "/icons/badge-72x72.png",
      image: promotion.image,
      data: {
        promotionId: promotion.id,
        action: "view-promotion",
        url: `/promotions/${promotion.id}`,
      },
      actions: [
        {
          action: "view",
          title: "View Offer",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ],
      requireInteraction: true,
    };

    // Send to users who opted in for promotions
    const targetUsers = await db.user.findMany({
      where: {
        promotionalNotifications: true,
        subscriptions: { some: {} },
      },
      select: { id: true },
    });

    const userIds = targetUsers.map((user) => user.id);
    return await this.sendToUsers(userIds, payload);
  }
}

// Express.js routes
const pushService = new PushService();

app.post("/api/push/subscribe", authenticateUser, async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.id;

    await pushService.storeSubscription(userId, subscription);

    res.json({ success: true, message: "Subscription stored successfully" });
  } catch (error) {
    console.error("Subscribe error:", error);
    res.status(500).json({ error: "Failed to store subscription" });
  }
});

app.post("/api/push/unsubscribe", authenticateUser, async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.id;

    // Find and remove subscription
    const existingSubscription = await db.subscription.findFirst({
      where: {
        userId: userId,
        endpoint: subscription.endpoint,
      },
    });

    if (existingSubscription) {
      await pushService.removeSubscription(existingSubscription.id);
    }

    res.json({ success: true, message: "Unsubscribed successfully" });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

app.post("/api/push/send", authenticateAdmin, async (req, res) => {
  try {
    const { userIds, payload } = req.body;

    let results;
    if (userIds && userIds.length > 0) {
      results = await pushService.sendToUsers(userIds, payload);
    } else {
      results = await pushService.sendBroadcast(payload);
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error("Send notification error:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

module.exports = { PushService, pushService };
```

---

## 📲 **Installation & App-like Features**

### **Install Prompt Implementation**

```javascript
// src/hooks/useInstallPrompt.js
import { useState, useEffect } from "react";

export const useInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (event) => {
      console.log("PWA: Install prompt available");
      event.preventDefault();
      setInstallPrompt(event);
      setIsInstallable(true);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      console.log("PWA: App was installed");
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) {
      return false;
    }

    try {
      const result = await installPrompt.prompt();
      console.log("PWA: Install prompt result:", result);

      if (result.outcome === "accepted") {
        setIsInstallable(false);
        setInstallPrompt(null);
        return true;
      }

      return false;
    } catch (error) {
      console.error("PWA: Install prompt failed:", error);
      return false;
    }
  };

  return {
    isInstallable,
    isInstalled,
    install,
  };
};

// Install prompt component
import React, { useState } from "react";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

export const InstallPrompt = () => {
  const { isInstallable, isInstalled, install } = useInstallPrompt();
  const [isVisible, setIsVisible] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    const success = await install();

    if (success) {
      setIsVisible(false);
    }

    setIsInstalling(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Store dismissal in localStorage to avoid showing again for some time
    localStorage.setItem("install-prompt-dismissed", Date.now().toString());
  };

  // Don't show if already installed, not installable, or dismissed recently
  if (isInstalled || !isInstallable || !isVisible) {
    return null;
  }

  // Check if dismissed recently (within 7 days)
  const dismissedTime = localStorage.getItem("install-prompt-dismissed");
  if (dismissedTime) {
    const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
    if (daysSinceDismissed < 7) {
      return null;
    }
  }

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <div className="install-prompt-icon">
          <img src="/icons/icon-72x72.png" alt="App Icon" />
        </div>

        <div className="install-prompt-text">
          <h3>Install ShopPWA</h3>
          <p>Get the full app experience with offline access and push notifications.</p>
        </div>

        <div className="install-prompt-actions">
          <button onClick={handleInstall} disabled={isInstalling} className="btn btn-primary">
            {isInstalling ? "Installing..." : "Install"}
          </button>

          <button onClick={handleDismiss} className="btn btn-secondary">
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
};

// CSS for install prompt
const installPromptStyles = `
.install-prompt {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  padding: 20px;
  max-width: 400px;
  width: calc(100vw - 40px);
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
}

.install-prompt-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.install-prompt-icon img {
  width: 48px;
  height: 48px;
  border-radius: 8px;
}

.install-prompt-text {
  flex: 1;
}

.install-prompt-text h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
}

.install-prompt-text p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.install-prompt-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.install-prompt-actions .btn {
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  min-width: 80px;
}

.btn-primary {
  background: #2196F3;
  color: white;
}

.btn-primary:hover {
  background: #1976D2;
}

.btn-secondary {
  background: transparent;
  color: #666;
}

.btn-secondary:hover {
  background: #f5f5f5;
}

@keyframes slideUp {
  from {
    transform: translateX(-50%) translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

@media (max-width: 480px) {
  .install-prompt-content {
    flex-direction: column;
    text-align: center;
  }
  
  .install-prompt-actions {
    flex-direction: row;
    justify-content: center;
  }
}
`;
```

### **Offline Functionality**

```javascript
// src/hooks/useOffline.js
import { useState, useEffect } from "react";

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Trigger sync when coming back online
        syncOfflineData();
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  const syncOfflineData = async () => {
    if ("serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register("background-sync-cart");
        console.log("Background sync registered");
      } catch (error) {
        console.error("Background sync registration failed:", error);
      }
    }
  };

  return {
    isOnline,
    wasOffline,
    syncOfflineData,
  };
};

// Offline indicator component
export const OfflineIndicator = () => {
  const { isOnline, wasOffline } = useOffline();
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowIndicator(true);
    } else if (wasOffline) {
      // Show "back online" message briefly
      setShowIndicator(true);
      setTimeout(() => setShowIndicator(false), 3000);
    } else {
      setShowIndicator(false);
    }
  }, [isOnline, wasOffline]);

  if (!showIndicator) return null;

  return (
    <div className={`offline-indicator ${isOnline ? "online" : "offline"}`}>
      <div className="offline-indicator-content">
        {isOnline ? (
          <>
            <span className="indicator-icon">✅</span>
            <span>Back online! Syncing data...</span>
          </>
        ) : (
          <>
            <span className="indicator-icon">📡</span>
            <span>You're offline. Some features may be limited.</span>
          </>
        )}
      </div>
    </div>
  );
};

// Offline storage service
class OfflineStorageService {
  constructor() {
    this.dbName = "PWAOfflineStore";
    this.version = 1;
    this.db = null;
  }

  async initDB() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create stores
        if (!db.objectStoreNames.contains("cart")) {
          const cartStore = db.createObjectStore("cart", { keyPath: "id" });
          cartStore.createIndex("timestamp", "timestamp");
        }

        if (!db.objectStoreNames.contains("favorites")) {
          const favStore = db.createObjectStore("favorites", { keyPath: "productId" });
          favStore.createIndex("addedAt", "addedAt");
        }

        if (!db.objectStoreNames.contains("offlineActions")) {
          const actionsStore = db.createObjectStore("offlineActions", { keyPath: "id" });
          actionsStore.createIndex("timestamp", "timestamp");
        }
      };
    });
  }

  async saveCartItem(item) {
    const db = await this.initDB();
    const tx = db.transaction(["cart"], "readwrite");
    const store = tx.objectStore("cart");

    const cartItem = {
      ...item,
      timestamp: Date.now(),
    };

    await store.put(cartItem);
    return cartItem;
  }

  async getCartItems() {
    const db = await this.initDB();
    const tx = db.transaction(["cart"], "readonly");
    const store = tx.objectStore("cart");

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveOfflineAction(action) {
    const db = await this.initDB();
    const tx = db.transaction(["offlineActions"], "readwrite");
    const store = tx.objectStore("offlineActions");

    const offlineAction = {
      id: Date.now() + "-" + Math.random().toString(36).substr(2, 9),
      ...action,
      timestamp: Date.now(),
    };

    await store.add(offlineAction);
    return offlineAction;
  }

  async getOfflineActions() {
    const db = await this.initDB();
    const tx = db.transaction(["offlineActions"], "readonly");
    const store = tx.objectStore("offlineActions");

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearOfflineActions() {
    const db = await this.initDB();
    const tx = db.transaction(["offlineActions"], "readwrite");
    const store = tx.objectStore("offlineActions");

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineStorage = new OfflineStorageService();
```

---

## 🎯 **Best Practices Summary**

### **✅ PWA Production Checklist**

#### **Performance**

- ✅ **Service Worker caching** - Implement appropriate caching strategies
- ✅ **Critical resource priority** - Load essential resources first
- ✅ **Code splitting** - Split bundles for faster initial load
- ✅ **Image optimization** - Use WebP, lazy loading, responsive images
- ✅ **Lighthouse score** - Achieve 90+ in all categories

#### **Reliability**

- ✅ **Offline functionality** - Core features work offline
- ✅ **Background sync** - Sync data when connection restored
- ✅ **Error handling** - Graceful fallbacks for network failures
- ✅ **Cache management** - Proper cache invalidation and updates
- ✅ **Data persistence** - Use IndexedDB for offline storage

#### **Engagement**

- ✅ **Push notifications** - Re-engage users with relevant content
- ✅ **Installation prompt** - Encourage app installation
- ✅ **App shortcuts** - Quick access to key features
- ✅ **Native features** - Camera, geolocation, file access
- ✅ **App-like navigation** - Smooth transitions and interactions

#### **Security**

- ✅ **HTTPS only** - Required for service workers and secure features
- ✅ **Content Security Policy** - Protect against XSS attacks
- ✅ **Permission management** - Request permissions responsibly
- ✅ **Secure storage** - Encrypt sensitive data
- ✅ **Update mechanisms** - Secure and reliable app updates

---

## 🚀 **Next Steps**

1. **Audit existing app** with Lighthouse PWA audit
2. **Implement service worker** with appropriate caching strategies
3. **Create web app manifest** with proper icons and metadata
4. **Add offline functionality** for core features
5. **Implement push notifications** for user engagement
6. **Test on real devices** across different platforms
7. **Monitor performance** and user adoption metrics

_Progressive Web Apps bridge the gap between web and native apps. Master these patterns to deliver exceptional mobile-like experiences through the web!_
