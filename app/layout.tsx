import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "./_components/register-service-worker";

export const metadata: Metadata = {
  title: "BookmarkAI",
  description: "Save links, get AI summaries, key takeaways, and action items.",
};

// Colours the Android system bars when running as an installed app. The
// in-app dusk/dark toggle can't be read from here, so match the OS instead.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#17171a" },
  ],
};

// Runs before first paint to set the theme, avoiding a flash of the wrong
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
