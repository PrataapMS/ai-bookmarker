import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Pinned so the identity survives a start_url change — Android treats a
    // changed manifest id as a different app and installs a second copy.
    id: "/",
    name: "BookmarkAI",
    short_name: "BookmarkAI",
    description:
      "Save links, get AI summaries, key takeaways, and action items.",
    start_url: "/bookmarks",
    scope: "/",
    display: "standalone",
    background_color: "#f7f7f5",
    theme_color: "#f7f7f5",
    // Share into an already-open window instead of stacking a new one each time.
    launch_handler: { client_mode: "navigate-existing" },
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Reading queue", url: "/bookmarks" },
      { name: "Todos", url: "/todos" },
    ],
    // Puts BookmarkAI in the Android share sheet once the app is installed.
    // GET, not POST: a cross-site POST would drop the sameSite=lax session
    // cookie (lib/auth.ts) and bounce the user to /login every time.
    share_target: {
      action: "/share",
      method: "GET",
      enctype: "application/x-www-form-urlencoded",
      params: { title: "title", text: "text", url: "url" },
    },
  };
}
