import { RefreshOnRevisit } from "./refresh-on-revisit";

function renderStamp() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Drop into a screen's server component: when the screen is shown again from
 * the router cache, it refreshes its data in the background.
 */
export function LiveData() {
  return <RefreshOnRevisit stamp={renderStamp()} />;
}
