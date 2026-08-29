/** สคริปต์ตรวจคอนเทนต์ทั้งหมด — รันก่อน commit ทุกครั้ง (Phase 0 DoD) */
import { cards, dropTables, enemies, heroes, skills, stages, validateContent } from '@himmapan/data';

const issues = validateContent();
const errors = issues.filter((i) => i.level === 'error');
const warns = issues.filter((i) => i.level === 'warn');

console.log('📦 คอนเทนต์ที่โหลดได้:');
console.log(`   ฮีโร่ ${heroes.length} | ศัตรู ${enemies.length} | สกิล ${skills.length} | การ์ด ${cards.length} | ด่าน ${stages.length} | ตารางดรอป ${dropTables.length}`);

for (const w of warns) console.warn(`⚠️  [${w.where}] ${w.message}`);
for (const e of errors) console.error(`❌ [${e.where}] ${e.message}`);

if (errors.length > 0) {
  console.error(`\nพบข้อผิดพลาด ${errors.length} รายการ`);
  process.exit(1);
}
console.log(`\n✅ คอนเทนต์ผ่านการตรวจทั้งหมด (คำเตือน ${warns.length} รายการ)`);
