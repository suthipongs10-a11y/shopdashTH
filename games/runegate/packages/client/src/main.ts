import './styles.css';
import { enemies, heroes, turrets } from '@runegate/data';
import { preloadArt } from './render/sprites.js';
import type { Stage } from '@runegate/data';
import { BattleController, type BattleSquadInput } from './battle/controller.js';
import { arsenalScreen, bestiaryScreen, squadScreen, stageSelectScreen } from './ui/menus.js';
import { heroesScreen } from './ui/heroes.js';

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
  ui.appendChild(stageSelectScreen((stage) => showSquad(stage), showBestiary, showArsenal, () => showHeroes(showStageSelect)));
}

function showBestiary(): void {
  clear();
  ui.appendChild(bestiaryScreen(showStageSelect));
}

function showArsenal(): void {
  clear();
  ui.appendChild(arsenalScreen(showStageSelect));
}

function showHeroes(onBack: () => void): void {
  clear();
  ui.appendChild(heroesScreen(onBack));
}

function showSquad(stage: Stage): void {
  clear();
  ui.appendChild(
    squadScreen(
      stage,
      (squad) => startBattle(stage, squad),
      showStageSelect,
      () => showHeroes(() => showSquad(stage)),
    ),
  );
}

function startBattle(stage: Stage, squad: BattleSquadInput): void {
  clear();
  canvas.style.visibility = 'visible';
  controller = new BattleController(canvas, ui, stage, squad, {
    onExit: () => showStageSelect(),
    onRetry: () => startBattle(stage, squad),
  });
}

// โหลด atlas จริงจากโรงงาน sprite ถ้ามี — ไม่มีก็ใช้ placeholder ต่อได้เลย ไม่บล็อกการเปิดเกม
void preloadArt([...heroes.map((h) => h.id), ...enemies.map((e) => e.id), ...turrets.map((t) => t.id)]).then((n) => {
  if (n > 0) console.info(`[art] โหลด atlas จริงได้ ${n} ตัว`);
});

showStageSelect();
