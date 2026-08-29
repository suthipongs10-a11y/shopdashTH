/** ฉาก 3D สร้างจาก Stage JSON ทั้งหมด (Phase 2 DoD) — §5.1 กล้อง isometric แบบ RO */
import * as THREE from 'three';
import type { Stage } from '@runegate/data';

export interface TileMeshData {
  tx: number;
  ty: number;
  type: string;
}

/** ชนิดช่องที่วางได้ — สีต่างกันเพื่อให้เห็นทันทีว่าช่องไหน "บล็อค" ได้ */
export type DeployTileKind = 'block' | 'ground' | 'high';

export interface DeployTile {
  x: number;
  y: number;
  kind: DeployTileKind;
}

const DEPLOY_COLOR: Record<DeployTileKind, number> = {
  block: 0x7fd4e8, // บนทางเดิน — ขวางศัตรูได้
  ground: 0x4f9e86, // ข้างทาง — ตีได้แต่ไม่บล็อค
  high: 0xf0a860, // ที่สูง — เฉพาะฮีโร่ระยะไกล
};

/** พื้นผิวของโลก RUNEGATE: หินสกัด มอส และรอยแยกมิติ */
const TILE_STYLE: Record<string, { color: number; height: number; top?: number }> = {
  R: { color: 0x7d7668, height: 0.09 }, // ทางหินปูเก่า
  G: { color: 0x3c6a48, height: 0.18 }, // พื้นดินมีมอส
  H: { color: 0x4e6b57, height: 0.64, top: 0x6f9573 }, // แท่นหินยกระดับ
  T: { color: 0x5a5f70, height: 0.5, top: 0xb08a4a }, // แท่นเครื่องยิง — ขอบทองเหลืองให้เห็นชัด
  X: { color: 0x3a3f52, height: 0.95 },
  S: { color: 0xb0405e, height: 0.09 }, // รอยแยกมิติ
  E: { color: 0x9aa3b5, height: 0.11 }, // ลานหน้าประตู
  '.': { color: 0x141c28, height: 0.04 },
};

export class StageScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly root = new THREE.Group();
  readonly tileMeshes: THREE.Mesh[] = [];
  readonly highlights = new THREE.Group();

  private rangeRing: THREE.Group | null = null;
  private target = new THREE.Vector3();
  private azimuth = -Math.PI / 4;
  private polar = 1.02;
  private distance = 18;
  private minDistance = 8;
  private maxDistance = 34;
  private disposers: (() => void)[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly stage: Stage,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e15);
    this.scene.fog = new THREE.Fog(0x0a0e15, 22, 52);
    this.scene.add(this.root);
    this.root.add(this.highlights);

    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 200);

    this.buildLights();
    this.buildGround();
    this.buildPaths();
    this.buildMarkers();

    const w = stage.grid.w;
    const h = stage.grid.h;
    this.target.set(w / 2, 0, h / 2);
    this.distance = Math.max(11, Math.max(w, h * 1.6) * 1.02);
    this.maxDistance = this.distance * 1.7;
    this.minDistance = Math.max(6, this.distance * 0.45);

    this.attachControls();
    this.resize();
    this.updateCamera();
  }

  /* ---------------- ฉาก ---------------- */

  private buildLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xc6dcf2, 0x2b3444, 1.4));
    const sun = new THREE.DirectionalLight(0xffe9c2, 1.75);
    sun.position.set(-8, 16, 9);
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x4fa8c9, 0.55);
    rim.position.set(10, 6, -10);
    this.scene.add(rim);
  }

  private buildGround(): void {
    const { w, h } = this.stage.grid;
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(w + 3, 0.6, h + 3),
      new THREE.MeshLambertMaterial({ color: 0x172029 }),
    );
    base.position.set(w / 2, -0.35, h / 2);
    this.root.add(base);

    const geo = new THREE.BoxGeometry(0.98, 1, 0.98);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = this.stage.tiles[y]?.[x] ?? '.';
        const style = TILE_STYLE[ch];
        if (!style) continue;
        const tint = (x + y) % 2 === 0 ? 1 : 0.92;
        const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(style.color).multiplyScalar(tint) });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.scale.y = style.height;
        mesh.position.set(x + 0.5, style.height / 2 - 0.02, y + 0.5);
        mesh.userData = { tx: x, ty: y, type: ch } satisfies TileMeshData;
        this.root.add(mesh);
        if (ch !== '.') this.tileMeshes.push(mesh);

        if (style.top !== undefined) {
          const cap = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 0.06, 0.9),
            new THREE.MeshLambertMaterial({ color: style.top }),
          );
          cap.position.set(x + 0.5, style.height + 0.01, y + 0.5);
          this.root.add(cap);
        }
      }
    }
  }

  private buildPaths(): void {
    for (const pts of Object.values(this.stage.paths)) {
      const curve = new THREE.CatmullRomCurve3(
        pts.map(([x, y]) => new THREE.Vector3(x + 0.5, 0.1, y + 0.5)),
        false,
        'catmullrom',
        0,
      );
      const geo = new THREE.TubeGeometry(curve, pts.length * 24, 0.055, 6, false);
      const mat = new THREE.MeshBasicMaterial({ color: 0x7fd4e8, transparent: true, opacity: 0.42 });
      this.root.add(new THREE.Mesh(geo, mat));
    }
  }

  private buildMarkers(): void {
    for (const pts of Object.values(this.stage.paths)) {
      const s = pts[0]!;
      const e = pts[pts.length - 1]!;

      // รอยแยกมิติที่ศัตรูทะลักออกมา
      const rift = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.09, 8, 20),
        new THREE.MeshBasicMaterial({ color: 0xd94f74 }),
      );
      rift.position.set(s[0] + 0.5, 0.7, s[1] + 0.5);
      rift.rotation.x = Math.PI / 2;
      this.root.add(rift);

      // ประตูรูนหิน: เสาสองต้น + คานทับหลัง + วงรูนเรืองแสงตรงกลาง
      const gate = new THREE.Group();
      const stone = new THREE.MeshLambertMaterial({ color: 0x8e97a6 });
      const stoneDark = new THREE.MeshLambertMaterial({ color: 0x6c7583 });
      const pillar = new THREE.BoxGeometry(0.26, 1.55, 0.26);
      for (const dx of [-0.46, 0.46]) {
        const p = new THREE.Mesh(pillar, stone);
        p.position.set(dx, 0.78, 0);
        gate.add(p);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.36), stoneDark);
        cap.position.set(dx, 1.62, 0);
        gate.add(cap);
      }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.26, 0.32), stone);
      lintel.position.y = 1.82;
      gate.add(lintel);

      const rune = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.055, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x7fd4e8, transparent: true, opacity: 0.9 }),
      );
      rune.position.y = 0.95;
      gate.add(rune);

      gate.position.set(e[0] + 0.5, 0.1, e[1] + 0.5);
      this.root.add(gate);
    }
  }

  /* ---------------- ไฮไลต์ช่องวาง ---------------- */

  showDeployTiles(tiles: DeployTile[]): void {
    this.clearHighlights();
    const geo = new THREE.PlaneGeometry(0.92, 0.92);
    for (const t of tiles) {
      const ch = this.stage.tiles[t.y]?.[t.x] ?? '.';
      const height = TILE_STYLE[ch]?.height ?? 0.1;
      const mat = new THREE.MeshBasicMaterial({
        color: DEPLOY_COLOR[t.kind],
        transparent: true,
        opacity: t.kind === 'ground' ? 0.3 : 0.44,
        depthWrite: false,
      });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(t.x + 0.5, height + 0.04, t.y + 0.5);
      this.highlights.add(m);
    }
  }

  /** วงแสดงระยะโจมตี — ช่วยให้เห็นว่าฮีโร่เอื้อมถึงทางเดินไหม */
  showRangeRing(tileX: number, tileY: number, radius: number): void {
    this.clearRangeRing();
    const y = this.tileHeight(tileX, tileY) + 0.06;
    const group = new THREE.Group();
    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 40),
      new THREE.MeshBasicMaterial({ color: 0x7fd4e8, transparent: true, opacity: 0.1, depthWrite: false }),
    );
    const edge = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.055, radius, 44),
      new THREE.MeshBasicMaterial({ color: 0x9ee7f5, transparent: true, opacity: 0.62, depthWrite: false }),
    );
    fill.rotation.x = -Math.PI / 2;
    edge.rotation.x = -Math.PI / 2;
    group.add(fill, edge);
    group.position.set(tileX + 0.5, y, tileY + 0.5);
    this.rangeRing = group;
    this.root.add(group);
  }

  clearRangeRing(): void {
    if (!this.rangeRing) return;
    this.root.remove(this.rangeRing);
    for (const child of this.rangeRing.children) {
      const m = child as THREE.Mesh;
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.rangeRing = null;
  }

  clearHighlights(): void {
    for (const child of [...this.highlights.children]) {
      this.highlights.remove(child);
      const m = child as THREE.Mesh;
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
  }

  tileHeight(x: number, y: number): number {
    const ch = this.stage.tiles[y]?.[x] ?? '.';
    return TILE_STYLE[ch]?.height ?? 0;
  }

  /* ---------------- กล้อง / อินพุต ---------------- */

  private updateCamera(): void {
    const sp = new THREE.Spherical(this.distance, this.polar, this.azimuth);
    this.camera.position.setFromSpherical(sp).add(this.target);
    this.camera.lookAt(this.target);
  }

  private attachControls(): void {
    const pointers = new Map<number, { x: number; y: number }>();
    let lastPinch = 0;
    let moved = 0;

    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
      this.canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved += Math.abs(dx) + Math.abs(dy);

      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        if (lastPinch > 0) this.zoom((lastPinch - d) * 0.03);
        lastPinch = d;
        return;
      }
      this.azimuth -= dx * 0.006;
      this.polar = Math.max(0.55, Math.min(1.32, this.polar - dy * 0.004));
      this.updateCamera();
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) lastPinch = 0;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.zoom(e.deltaY * 0.012);
    };

    this.canvas.addEventListener('pointerdown', onDown);
    this.canvas.addEventListener('pointermove', onMove);
    this.canvas.addEventListener('pointerup', onUp);
    this.canvas.addEventListener('pointercancel', onUp);
    this.canvas.addEventListener('wheel', onWheel, { passive: false });
    this.movedRef = () => moved;

    this.disposers.push(() => {
      this.canvas.removeEventListener('pointerdown', onDown);
      this.canvas.removeEventListener('pointermove', onMove);
      this.canvas.removeEventListener('pointerup', onUp);
      this.canvas.removeEventListener('pointercancel', onUp);
      this.canvas.removeEventListener('wheel', onWheel);
    });
  }

  private movedRef: () => number = () => 0;

  /** ระยะที่นิ้ว/เมาส์ขยับในท่าล่าสุด — ใช้แยก "แตะเลือก" ออกจาก "ลากหมุนกล้อง" */
  get dragDistance(): number {
    return this.movedRef();
  }

  zoom(delta: number): void {
    this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance + delta));
    this.updateCamera();
  }

  resetCamera(): void {
    this.azimuth = -Math.PI / 4;
    this.polar = 1.02;
    this.updateCamera();
  }

  /** หา tile ที่ตำแหน่งจอ (คืน null ถ้าไม่โดน) */
  pickTile(clientX: number, clientY: number): TileMeshData | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hits = ray.intersectObjects(this.tileMeshes, false);
    const hit = hits[0];
    return hit ? (hit.object.userData as TileMeshData) : null;
  }

  /** แปลงพิกัดโลกเป็นพิกัดจอ (สำหรับ HUD overlay: หลอดเลือด, ตัวเลขดาเมจ) */
  project(x: number, y: number, z: number, out: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    out.set(x, y, z).project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    out.x = ((out.x + 1) / 2) * rect.width;
    out.y = ((1 - out.y) / 2) * rect.height;
    return out;
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.clearHighlights();
    this.clearRangeRing();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.renderer.dispose();
  }
}
