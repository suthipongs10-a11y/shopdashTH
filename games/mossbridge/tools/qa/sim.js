// 90 s simulated fight (auto-target, skills, potions) — must finish with no errors, quests counting, boss killable.
const { open } = require('./_browser');
(async () => {
  const { browser, page, errors } = await open();
  const res = await page.evaluate(() => {
    const g = window.__mossbridge, out = [];
    g.step(.1); const m0 = g.mobs.find(m => !m.boss); g.hero.path = g.findPath(g.hero.x, g.hero.y, m0.x, m0.y);
    for (let sec = 0; sec < 90; sec++) {
      if (!g.hero.target || g.hero.target.dead) { const live = g.mobs.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - g.hero.x, a.y - g.hero.y) - Math.hypot(b.x - g.hero.x, b.y - g.hero.y)); g.hero.target = live.find(m => !m.boss) || live[0]; }
      if (sec % 3 === 0) g.useSkill(sec % 4);
      if (g.hero.hp < 4000) g.useSkill(4);
      g.step(1, 30);
      if (sec % 15 === 14) out.push({ sec, hp: g.hero.hp | 0, dead: g.hero.dead, alive: g.mobs.filter(m => !m.dead).length, boss: g.boss.hp | 0 });
    }
    return out;
  });
  res.forEach(r => console.log(JSON.stringify(r)));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
  await browser.close(); process.exit(errors.length ? 1 : 0);
})();
