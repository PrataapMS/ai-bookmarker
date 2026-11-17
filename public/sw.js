// Minimal service worker. It makes BookmarkAI installable (which registers
// the Android share target, see app/manifest.ts) and shows todo reminders
// sent by Web Push (lib/push.ts).
//
// It deliberately never calls event.respondWith(), so every request goes to
// the network untouched. An authenticated, always-dynamic app must not serve
// cached pages: no offline shell, no stale summaries, no other user's data.

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {});

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
