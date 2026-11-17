// BookmarkAI service worker: installability (and so the Android share
// target, see app/manifest.ts), offline support, and todo reminders sent by
// Web Push (lib/push.ts).
//
// Offline strategy
// - Build assets (/_next/static, icons) are immutable: cache-first.
// - App pages (bookmarks, feed, starred, todos) are network-first. A good
//   response is kept as an offline copy; the copy is only served when the
//   network fails or is very slow, so you never see stale data while online.
// - Anything else that fails offline gets /offline.html.
// - Offline copies are per-person data: they're wiped whenever a page
//   redirects (i.e. the session ended) and on sign-out (see sidebar.tsx).
// - Data requests (RSC, server actions, /api) are never touched.

const VERSION = "v2";
const STATIC_CACHE = `static-${VERSION}`;
const PAGES_CACHE = "pages-v1"; // name shared with sidebar.tsx sign-out
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

const PAGE_PATHS = /^\/(bookmarks|feed|starred|todos)(\/|$)/;
const SLOW_NETWORK_MS = 8000;
const MAX_PAGES = 60;
const MAX_STATIC = 400;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, PAGES_CACHE]);
      for (const key of await caches.keys()) {
        if (!keep.has(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) {
    await cache.delete(key);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) {
    await cache.put(request, res.clone());
    trim(STATIC_CACHE, MAX_STATIC);
  }
  return res;
}

async function offlinePage() {
  const cache = await caches.open(STATIC_CACHE);
  return (await cache.match(OFFLINE_URL)) || new Response("You're offline.", { status: 503 });
}

async function cachedPage(request) {
  const cache = await caches.open(PAGES_CACHE);
  return (
    (await cache.match(request, { ignoreVary: true })) ||
    (await cache.match(request, { ignoreVary: true, ignoreSearch: true }))
  );
}

async function networkFirstPage(event) {
  const request = event.request;
  const network = fetch(request).then(async (res) => {
    if (res.type === "opaqueredirect" || res.redirected) {
      // Redirected away (signed out): drop everyone's offline copies.
      await caches.delete(PAGES_CACHE);
    } else if (res.ok && (res.headers.get("content-type") || "").includes("text/html")) {
      const cache = await caches.open(PAGES_CACHE);
      await cache.put(request, res.clone());
      trim(PAGES_CACHE, MAX_PAGES);
    }
    return res;
  });
  event.waitUntil(network.catch(() => {}));

  let slowTimer;
  const slow = new Promise((resolve) => {
    slowTimer = setTimeout(() => resolve("slow"), SLOW_NETWORK_MS);
  });
  try {
    const first = await Promise.race([network, slow]);
    if (first !== "slow") return first;
    // Very slow network: show the offline copy if there is one, else keep waiting.
    return (await cachedPage(request)) || (await network);
  } catch {
    return (await cachedPage(request)) || offlinePage();
  } finally {
    clearTimeout(slowTimer);
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    if (PAGE_PATHS.test(url.pathname)) {
      event.respondWith(networkFirstPage(event));
    } else {
      event.respondWith(fetch(request).catch(() => offlinePage()));
    }
  }
});

// --- Todo reminders (Web Push) ---

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "BookmarkAI", body: event.data ? event.data.text() : "" };
  }
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag,
    renotify: Boolean(data.tag),
    data: { url: data.url || "/todos", todoId: data.todoId },
    actions: data.todoId
      ? [
          { action: "done", title: "✓ Done" },
          { action: "snooze", title: "Snooze 1h" },
        ]
      : [],
  };
  event.waitUntil(self.registration.showNotification(data.title || "BookmarkAI", options));
});

async function openApp(url) {
  const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of all) {
    if ("focus" in client) {
      await client.focus();
      if ("navigate" in client) return client.navigate(url);
      return;
    }
  }
  return self.clients.openWindow(url);
}

self.addEventListener("notificationclick", (event) => {
  const { url, todoId } = event.notification.data || {};
  event.notification.close();

  if (todoId && (event.action === "done" || event.action === "snooze")) {
    event.waitUntil(
      fetch(`/api/todos/${encodeURIComponent(todoId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: event.action }),
      }).then(
        (res) => (res.ok ? undefined : openApp(url || "/todos")),
        () => openApp(url || "/todos"),
      ),
    );
    return;
  }
  event.waitUntil(openApp(url || "/todos"));
});
