import "server-only";
import { ImageResponse } from "next/og";

// The app mark: a white bookmark ribbon on the accent square. Drawn as an
// inline SVG path so nothing has to be committed as a binary asset and no
// font or emoji set needs to load at render time.
const ACCENT = "#4f46e5";
const MARK = "#ffffff";
const RIBBON =
  "M6 2.75h12A1.25 1.25 0 0 1 19.25 4v17.1a.9.9 0 0 1-1.4.75L12 17.9l-5.85 3.95a.9.9 0 0 1-1.4-.75V4A1.25 1.25 0 0 1 6 2.75Z";

/**
 * Render a square PNG app icon at `size` pixels.
 *
 * `maskable` icons are cropped by Android to a shape inscribed in a circle
 * 80% of the canvas wide, so the background runs edge to edge and the ribbon
 * shrinks to stay inside that safe zone.
 */
export function renderAppIcon({
  size,
  maskable = false,
}: {
  size: number;
  maskable?: boolean;
}): ImageResponse {
  const ribbon = Math.round(size * (maskable ? 0.46 : 0.58));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: ACCENT,
          borderRadius: maskable ? 0 : Math.round(size * 0.22),
        }}
      >
        <svg width={ribbon} height={ribbon} viewBox="0 0 24 24" fill={MARK}>
          <path d={RIBBON} />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
