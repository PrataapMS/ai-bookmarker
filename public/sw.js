// Minimal service worker. It exists only so Chromium treats BookmarkAI as
// installable — installing to the home screen is what registers the Android
// share target (see app/manifest.ts).
//
// It deliberately never calls event.respondWith(), so every request goes to
// the network untouched. An authenticated, always-dynamic app must not serve
// cached pages: no offline shell, no stale summaries, no other user's data.

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {});
