import './styles.css';
import type { Stage } from '@runegate/data';
import { BattleController } from './battle/controller.js';
import { bestiaryScreen, squadScreen, stageSelectScreen } from './ui/menus.js';

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
  ui.appendChild(stageSelectScreen((stage) => showSquad(stage), showBestiary));
}

function showBestiary(): void {
  clear();
  ui.appendChild(bestiaryScreen(showStageSelect));
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

showStageSelect();
