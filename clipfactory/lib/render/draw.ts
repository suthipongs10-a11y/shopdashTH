import { fitText, wrapText } from './text';
import type { RenderOptions, Timeline, TimelineShot } from '../types';

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type Drawable = ImageBitmap | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas;

function sizeOf(img: Drawable): { w: number; h: number } {
  if ('naturalWidth' in img && img.naturalWidth) return { w: img.naturalWidth, h: img.naturalHeight };
  return { w: (img as ImageBitmap).width, h: (img as ImageBitmap).height };
}

/** วาดรูปแบบ cover เต็มเฟรม พร้อม Ken Burns */
function drawCover(ctx: Ctx2D, img: Drawable, W: number, H: number, zoom: number, driftY: number) {
  const { w: iw, h: ih } = sizeOf(img);
  if (!iw || !ih) return;
  const base = Math.max(W / iw, H / ih);
  const scale = base * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (W - dw) / 2;
  const dy = (H - dh) / 2 + driftY * (dh - H) * 0.5;
  ctx.drawImage(img as CanvasImageSource, dx, dy, dw, dh);
}

/** พื้นหลังสำรองเมื่อยังไม่ได้อัปโหลดรูป */
function drawPlaceholder(ctx: Ctx2D, W: number, H: number, accent: string, label: string, font: string) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#1B1F27');
  g.addColorStop(1, '#0B0D11');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(W * 0.5, H * 0.42, W * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.34)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(W * 0.045)}px ${font}`;
  const lines = wrapText(ctx, label, W * 0.7);
  const lh = W * 0.062;
  lines.slice(0, 3).forEach((ln, i) => {
    ctx.fillText(ln, W / 2, H * 0.42 + (i - (Math.min(lines.length, 3) - 1) / 2) * lh);
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/** ไล่เฉดมืดด้านล่างให้ตัวหนังสืออ่านออกบนรูปสว่าง */
function drawScrim(ctx: Ctx2D, W: number, H: number) {
  const g = ctx.createLinearGradient(0, H * 0.42, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.45)');
  g.addColorStop(1, 'rgba(0,0,0,0.82)');
  ctx.fillStyle = g;
  ctx.fillRect(0, H * 0.42, W, H * 0.58);

  const top = ctx.createLinearGradient(0, 0, 0, H * 0.28);
  top.addColorStop(0, 'rgba(0,0,0,0.5)');
  top.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, H * 0.28);
}

function roundRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** ป้ายหัวเรื่องที่ค้างทั้งคลิป (สูตร listicle / beat-sync) */
function drawHeadline(ctx: Ctx2D, text: string, W: number, H: number, o: RenderOptions) {
  if (!text.trim()) return;
  const padX = W * 0.035;
  const padY = W * 0.022;
  const maxW = W * (1 - o.safeRight) - W * 0.08 - padX * 2;

  const { lines, fontSize } = fitText(ctx as CanvasRenderingContext2D, text, {
    maxWidth: maxW,
    maxHeight: H * 0.13,
    fontFamily: o.theme.fontFamily,
    weight: 800,
    maxSize: Math.round(W * 0.062),
    minSize: Math.round(W * 0.036),
    lineHeight: 1.28,
  });
  if (!lines.length) return;

  const lh = fontSize * 1.28;
  let widest = 0;
  for (const ln of lines) widest = Math.max(widest, ctx.measureText(ln).width);

  const boxW = widest + padX * 2;
  const boxH = lines.length * lh + padY * 2;
  const x = W * 0.055;
  const y = H * o.safeTop;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = W * 0.02;
  ctx.shadowOffsetY = W * 0.006;
  ctx.fillStyle = o.theme.headlineBg;
  roundRect(ctx, x, y, boxW, boxH, W * 0.018);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = o.theme.headlineFg;
  ctx.textBaseline = 'top';
  lines.forEach((ln, i) => ctx.fillText(ln, x + padX, y + padY + i * lh + (lh - fontSize) * 0.18));
  ctx.textBaseline = 'alphabetic';
}

/** ข้อความบรรยายซีน วางเหนือ safe zone ล่างเสมอ */
function drawCaption(ctx: Ctx2D, text: string, W: number, H: number, o: RenderOptions, emphasis: boolean) {
  if (!text.trim()) return;
  const maxW = W * (1 - o.safeRight) - W * 0.1;
  const bottomLimit = H * (1 - o.safeBottom);

  const { lines, fontSize } = fitText(ctx as CanvasRenderingContext2D, text, {
    maxWidth: maxW,
    maxHeight: H * 0.24,
    fontFamily: o.theme.fontFamily,
    weight: 700,
    maxSize: Math.round(W * (emphasis ? 0.085 : 0.072)),
    minSize: Math.round(W * 0.042),
    lineHeight: 1.3,
  });
  if (!lines.length) return;

  const lh = fontSize * 1.3;
  const blockH = lines.length * lh;
  const y = bottomLimit - blockH - H * 0.025;
  const x = W * 0.055;

  if (emphasis) {
    ctx.fillStyle = o.theme.accent;
    roundRect(ctx, x, y - H * 0.012, W * 0.012, blockH + H * 0.024, W * 0.006);
    ctx.fill();
  }

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = W * 0.022;
  ctx.shadowOffsetY = W * 0.004;
  ctx.fillStyle = emphasis ? o.theme.accent : o.theme.captionFg;
  ctx.textBaseline = 'top';
  const textX = emphasis ? x + W * 0.032 : x;
  lines.forEach((ln, i) => ctx.fillText(ln, textX, y + i * lh + (lh - fontSize) * 0.15));
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

/** แถบความคืบหน้าบางๆ ช่วยให้คนดูรู้ว่าคลิปสั้น เลยดูต่อ */
function drawProgress(ctx: Ctx2D, ratio: number, W: number, H: number, o: RenderOptions) {
  const y = H * (1 - o.safeBottom) + H * 0.004;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(W * 0.055, y, W * 0.89, H * 0.0035);
  ctx.fillStyle = o.theme.accent;
  ctx.fillRect(W * 0.055, y, W * 0.89 * Math.min(1, Math.max(0, ratio)), H * 0.0035);
}

function drawSafeGuides(ctx: Ctx2D, W: number, H: number, o: RenderOptions) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,80,80,0.85)';
  ctx.setLineDash([W * 0.02, W * 0.014]);
  ctx.lineWidth = Math.max(2, W * 0.004);

  ctx.beginPath();
  ctx.moveTo(0, H * (1 - o.safeBottom));
  ctx.lineTo(W, H * (1 - o.safeBottom));
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(W * (1 - o.safeRight), 0);
  ctx.lineTo(W * (1 - o.safeRight), H);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, H * o.safeTop);
  ctx.lineTo(W, H * o.safeTop);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,80,80,0.9)';
  ctx.font = `600 ${Math.round(W * 0.026)}px ${o.theme.fontFamily}`;
  ctx.fillText('เขตปลอดภัย — ห้ามวางข้อความใต้เส้นนี้', W * 0.03, H * (1 - o.safeBottom) + W * 0.045);
  ctx.restore();
}

export function shotAt(timeline: Timeline, t: number): TimelineShot {
  const shots = timeline.shots;
  for (const s of shots) {
    if (t >= s.startSec && t < s.endSec) return s;
  }
  return shots[shots.length - 1];
}

/** วาดหนึ่งเฟรมที่เวลา t (วินาที) — ใช้ทั้งพรีวิวและตอนเรนเดอร์จริง */
export function drawFrame(
  ctx: Ctx2D,
  t: number,
  timeline: Timeline,
  images: Drawable[],
  o: RenderOptions,
  productName = '',
) {
  const W = o.width;
  const H = o.height;
  const shot = shotAt(timeline, t);
  const idx = timeline.shots.indexOf(shot);

  ctx.fillStyle = o.theme.bg;
  ctx.fillRect(0, 0, W, H);

  const img = images.length ? images[shot.assetIndex % images.length] : null;
  const span = Math.max(0.001, shot.endSec - shot.startSec);
  const p = Math.min(1, Math.max(0, (t - shot.startSec) / span));

  if (img) {
    const dir = idx % 2 === 0 ? 1 : -1;
    const zoom = 1.02 + (dir > 0 ? p : 1 - p) * 0.07;
    const drift = dir * (p - 0.5) * 0.22;
    drawCover(ctx, img, W, H, zoom, drift);
  } else {
    drawPlaceholder(ctx, W, H, o.theme.accent, productName || 'ยังไม่ได้อัปโหลดรูปสินค้า', o.theme.fontFamily);
  }

  drawScrim(ctx, W, H);
  drawHeadline(ctx, o.headline, W, H, o);
  drawCaption(ctx, shot.caption, W, H, o, shot.kind !== 'body');
  drawProgress(ctx, timeline.totalSec > 0 ? t / timeline.totalSec : 0, W, H, o);

  if (o.showSafeGuides) drawSafeGuides(ctx, W, H, o);
}
