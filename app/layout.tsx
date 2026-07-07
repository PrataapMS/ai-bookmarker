import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BookmarkAI",
  description: "Save links, get AI summaries, key takeaways, and action items.",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
