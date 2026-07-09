import { ViewTransition } from "react";
import type { ViewTransitionClass } from "react";

// Directional page slides. Links opt in via transitionTypes
// ('nav-forward' when drilling into a bookmark, 'nav-back' when returning);
// untyped navigations (sidebar, browser back/forward) swap without sliding,
// though shared-element morphs still play.
const NAV_CLASSES: ViewTransitionClass = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "none",
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter={NAV_CLASSES} exit={NAV_CLASSES} default="none">
      {children}
    </ViewTransition>
  );
}
