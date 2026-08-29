import { describe, expect, it } from 'vitest';
import { cards, economy, enemies, heroes, runeConfig, skillById, skills, stages, validateContent } from '@runegate/data';

describe('คอนเทนต์ทั้งหมด (Phase 0 DoD)', () => {
  it('ผ่าน schema และการอ้างอิงข้ามไฟล์ทั้งหมด', () => {
    const errors = validateContent().filter((i) => i.level === 'error');
    expect(errors.map((e) => `${e.where}: ${e.message}`)).toEqual([]);
  });

  it('มีคอนเทนต์ครบตามที่ Phase ปัจจุบันต้องการ', () => {
    expect(heroes.length).toBeGreaterThanOrEqual(12);
    expect(enemies.length).toBeGreaterThanOrEqual(12);
    expect(stages.length).toBeGreaterThanOrEqual(3);
    expect(cards.length).toBeGreaterThanOrEqual(12);
  });

  it('ครบทั้ง 6 คลาสและ 5 ธาตุ', () => {
    expect(new Set(heroes.map((h) => h.class)).size).toBe(6);
    expect(new Set(heroes.map((h) => h.element)).size).toBe(5);
    expect(new Set(enemies.map((e) => e.race)).size).toBe(5);
  });

  it('ครบทั้ง 8 archetype ของศัตรู (§5.4)', () => {
    const traits = new Set(enemies.flatMap((e) => e.traits));
    for (const t of ['flying', 'stealth', 'armored', 'magic_resist', 'healer', 'swarm', 'elite', 'boss']) {
      expect(traits.has(t as never)).toBe(true);
    }
    expect(enemies.some((e) => e.traits.length === 0)).toBe(true); // ศัตรูปกติ
  });

  it('เรทสุ่มรวมได้ 1 และมี pity ตามกติกา §6.3', () => {
    const { rates, hardPity, softPityStart } = economy.gacha;
    expect(rates.r5 + rates.r4 + rates.r3).toBeCloseTo(1, 9);
    expect(hardPity).toBeLessThanOrEqual(60);
    expect(softPityStart).toBeLessThan(hardPity);
  });

  it('ตารางตีบวกไม่มีขั้นไหนทำให้ของหายถาวร (§8.3)', () => {
    for (const step of economy.refine) {
      expect(['keep', 'downgrade', 'break']).toContain(step.onFail);
    }
    expect(economy.refine.filter((s) => s.from <= 3).every((s) => s.successRate === 1)).toBe(true);
  });

  it('รูนมี 6 เซ็ตและกติกาช่อง 1/3/5 ตายตัว (§7)', () => {
    expect(runeConfig.sets.length).toBe(6);
    expect(runeConfig.slotRules.filter((r) => r.fixedMain).map((r) => r.slot)).toEqual([1, 3, 5]);
    expect(runeConfig.sets.some((s) => s.bonus.stat === 'cost_down')).toBe(true);
  });

  it('ฮีโร่ทุกตัวมีสกิลที่มีอยู่จริง และตัวที่มี ultimate มีคูลดาวน์', () => {
    for (const h of heroes) {
      for (const id of h.skills) {
        const s = skillById.get(id);
        expect(s, `${h.id} → ${id}`).toBeDefined();
        if (s!.type === 'ultimate') {
          expect(s!.trigger).toBe('manual');
          expect(s!.cooldownSec).toBeGreaterThan(0);
        }
      }
    }
    expect(skills.length).toBeGreaterThan(20);
  });

  it('ทุกด่านมีเวฟเรียงตามเวลาและมีรางวัล', () => {
    for (const s of stages) {
      expect(s.waves.length).toBeGreaterThan(0);
      expect(s.rewards.gold).toBeGreaterThan(0);
      const times = s.waves.map((w) => w.startSec);
      expect([...times].sort((a, b) => a - b)).toEqual(times);
    }
  });
});
