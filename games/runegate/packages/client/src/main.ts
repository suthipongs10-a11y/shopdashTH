import './styles.css';
import { enemies, heroes, turrets } from '@runegate/data';
import { preloadArt } from './render/sprites.js';
import type { Stage } from '@runegate/data';
import { BattleController } from './battle/controller.js';
import { arsenalScreen, bestiaryScreen, squadScreen, stageSelectScreen } from './ui/menus.js';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLElement;

let controller: BattleController | null = null;

function clear(): void {
  controller?.destroy();
  controller = null;
  ui.replaceChildren();
  canvas.style.visibility = 'hidden';
}

function showStageSelect(): void {
  clear();
  ui.appendChild(stageSelectScreen((stage) => showSquad(stage), showBestiary, showArsenal));
}

function showBestiary(): void {
  clear();
  ui.appendChild(bestiaryScreen(showStageSelect));
}

function showArsenal(): void {
  clear();
  ui.appendChild(arsenalScreen(showStageSelect));
}

function showSquad(stage: Stage): void {
  clear();
  ui.appendChild(squadScreen(stage, (squad, level) => startBattle(stage, squad, level), showStageSelect));
}

function startBattle(stage: Stage, squad: string[], level: number): void {
  clear();
  canvas.style.visibility = 'visible';
  controller = new BattleController(canvas, ui, stage, squad, level, {
    onExit: () => showStageSelect(),
    onRetry: () => startBattle(stage, squad, level),
  });
}

// โหลด atlas จริงจากโรงงาน sprite ถ้ามี — ไม่มีก็ใช้ placeholder ต่อได้เลย ไม่บล็อกการเปิดเกม
void preloadArt([...heroes.map((h) => h.id), ...enemies.map((e) => e.id), ...turrets.map((t) => t.id)]).then((n) => {
  if (n > 0) console.info(`[art] โหลด atlas จริงได้ ${n} ตัว`);
});

showStageSelect();
