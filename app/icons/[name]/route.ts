import { appIconResponse } from "@/lib/app-icon";

// The manifest points at these by name, so the URLs have to be stable and
// spelled out rather than content-hashed the way app/icon.tsx is.
const ICONS: Record<string, { size: number; maskable?: boolean }> = {
  "icon-192.png": { size: 192 },
  "icon-512.png": { size: 512 },
  "maskable-512.png": { size: 512, maskable: true },
};

// Prerendered at build time.
export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const icon = ICONS[name];
  if (!icon) return new Response("Not found", { status: 404 });
  return appIconResponse(icon);
}
