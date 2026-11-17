import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "./_components/register-service-worker";

export const metadata: Metadata = {
  title: "BookmarkAI",
  description: "Save links, get AI summaries, key takeaways, and action items.",
  applicationName: "BookmarkAI",
  // "Add to Home Screen" on iPhone/iPad: open full screen like an app, with
  // this name under the icon (icon comes from app/apple-icon.tsx).
  appleWebApp: { capable: true, title: "BookmarkAI", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

// Colours the Android system bars when running as an installed app. The
// in-app dusk/dark toggle can't be read from here, so match the OS instead.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#17171a" },
  ],
};

// Runs before first paint to set the theme and list density, avoiding a flash of the wrong
// theme (FOUC) and a hydration mismatch. Falls back to the OS preference when
// the user has not chosen a theme yet.
const themeInitScript = `(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t !== "light" && t !== "dusk" && t !== "dark") {
      t = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.dataset.theme = t;
    if (localStorage.getItem("density") === "compact") {
      document.documentElement.dataset.density = "compact";
    }
  } catch (e) {}
  try {
    // Lets the server group lists by the viewer's calendar day.
    document.cookie =
      "tz=" + encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone) +
      "; path=/; max-age=31536000; samesite=lax";
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
