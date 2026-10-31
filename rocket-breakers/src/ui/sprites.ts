// Integrated raster sprites (assets/sprites/*.webp + sidecar JSON from
// tools/import_art_batch.py). Anything not loaded yet falls back to the coded
// placeholder drawing, so missing art never breaks a frame.
const URLS = import.meta.glob("../../assets/sprites/*.webp", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const METAS = import.meta.glob("../../assets/sprites/*.json", { eager: true, import: "default" }) as Record<string, Sidecar>;

export interface Sidecar {
  asset_id: string;
  runtime_size: [number, number];
  visible_rect: [number, number, number, number];
  pivot_px: [number, number];
  attachment_anchors: { muzzle?: [number, number]; socket?: [number, number] };
}
export interface Sprite { img: HTMLImageElement; meta: Sidecar }

const cache = new Map<string, Sprite | null>();

export function sprite(id: string): Sprite | null {
  if (!cache.has(id)) {
    const key = Object.keys(URLS).find((k) => k.endsWith(`/${id}.webp`));
    const metaKey = Object.keys(METAS).find((k) => k.endsWith(`/${id}.json`));
    if (!key || !metaKey || typeof Image === "undefined") cache.set(id, null);
    else {
      const img = new Image();
      img.src = URLS[key];
      cache.set(id, { img, meta: METAS[metaKey] });
    }
  }
  const s = cache.get(id);
  return s && s.img.complete && s.img.naturalWidth > 0 ? s : null;
}

// Start decoding every sprite up front: lazily creating an Image on first use meant
// the first (often only) use of a rare effect fell back to placeholder art.
export function preloadSprites(): void {
  for (const k of Object.keys(URLS)) {
    const id = k.slice(k.lastIndexOf("/") + 1, -".webp".length);
    sprite(id);
  }
}

export const visW = (s: Sprite) => s.meta.visible_rect[2] - s.meta.visible_rect[0];
export const visH = (s: Sprite) => s.meta.visible_rect[3] - s.meta.visible_rect[1];

// Draws the sprite so the point (ax, ay) in sprite pixels lands on (x, y),
// scaled by k and rotated by rot. `flash` brightens it (hit feedback) with an additive pass.
export function drawAt(g: CanvasRenderingContext2D, s: Sprite, x: number, y: number, ax: number, ay: number, k: number,
  rot = 0, alpha = 1, flash = false, additive = false): void {
  const [w, h] = s.meta.runtime_size;
  g.save();
  g.translate(x, y);
  if (rot) g.rotate(rot);
  g.globalAlpha *= alpha;
  if (additive) g.globalCompositeOperation = "lighter";
  g.drawImage(s.img, -ax * k, -ay * k, w * k, h * k);
  if (flash) {
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = 0.55 * alpha;
    g.drawImage(s.img, -ax * k, -ay * k, w * k, h * k);
  }
  g.restore();
}

// Centre of the visible (trimmed) area of the sprite, in sprite pixels.
export function visCenter(s: Sprite): [number, number] {
  const [x0, y0, x1, y1] = s.meta.visible_rect;
  return [(x0 + x1) / 2, (y0 + y1) / 2];
}
