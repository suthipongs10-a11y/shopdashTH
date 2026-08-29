import { Stage, type Wave } from '@runegate/data';

/** สนามทดสอบเล็กๆ: ทางเดินตรงกลาง (y=2) จากซ้ายไปขวา, มีที่สูงบน-ล่าง */
export function makeStage(waves: Wave[], overrides: Record<string, unknown> = {}) {
  return Stage.parse({
    id: 'test_stage',
    name_th: 'ด่านทดสอบ',
    chapter: 1,
    index: 1,
    grid: { w: 8, h: 5 },
    tiles: ['HHHHHHHH', 'GGGGGGGG', 'SRRRRRRE', 'GGGGGGGG', 'HHHHHHHH'],
    paths: { main: [[0, 2], [7, 2]] },
    baseHp: 10,
    deploy: { initialCost: 30, costPerSec: 1, deployLimit: 6, retreatRefund: 0.5 },
    waves,
    stars: { two: { type: 'base_hp_pct', value: 80 }, three: { type: 'no_leak' } },
    rewards: { gold: 100, exp: 10 },
    ...overrides,
  });
}

export function wave(enemy: string, count: number, startSec = 1, intervalSec = 0.5): Wave {
  return {
    id: `w_${enemy}_${startSec}`,
    startSec,
    label_th: 'ทดสอบ',
    groups: [{ enemy, count, intervalSec, delaySec: 0, path: 'main', hpMult: 1, atkMult: 1 }],
  };
}
