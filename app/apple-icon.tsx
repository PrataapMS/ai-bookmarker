import { appIconResponse } from "@/lib/app-icon";

// iOS/iPadOS home screen icon. Full-bleed (the maskable variant): iOS rounds
// the corners itself and shows black behind any transparency.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return appIconResponse({ size: size.width, maskable: true });
}
