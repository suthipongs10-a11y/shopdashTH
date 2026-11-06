# สรุปค้นคว้า: เกม 2D แนว Ragnarok และเกมอื่นทำท่าเดิน/ถือดาบยังไง (2026-11-06)

> ใช้เป็น**ความรู้เรื่องโครงสร้างและหลักแอนิเมชัน**เท่านั้น ไม่มีภาพของเกมอื่นในชุดนี้ และห้ามแนบภาพเกมอื่นให้ ChatGPT
> (ภาพเป็นลิขสิทธิ์เขา และจะทำให้ภาพเราติดหน้าตาเกมนั้น)

## 1. โครงของตัวละครแบบ Ragnarok Online
- ตัวละครเป็น**ชั้นภาพซ้อนกัน**: ตัว → หัว → หมวก / อาวุธ / โล่ แต่ละเฟรมของตัวมี "จุดยึด" (anchor) ไว้วางหัว อาวุธ โล่ และหมวก
  ทุกชั้นยึดกับตัวเท่านั้น ชั้นอื่นจึงขยับตามเฟรมของตัวเสมอ [Ragnarok Research Lab: ACT]
- แต่ละท่าเก็บเป็นคลิป มีเวลาต่อเฟรมของตัวเอง [Ragnarok Research Lab: ACT]
- ทิศ: ตัวละครมี 8 ทิศ (มอนสเตอร์มักมีแค่ 4, NPC บางตัว 2) และทิศที่ซ้ำกันทำด้วยการ**กลับภาพซ้ายขวา** [Hercules wiki: Acts]
  → ตรงกับแผนเรา: วาดจริง 5 ทิศ (S, SW, W, NW, N) แล้วกลับภาพเป็น SE, E, NE
- ข้อที่**ค้นไม่เจอหลักฐาน**: จำนวนเฟรมแน่นอนของแต่ละท่า และกฎว่าอาวุธเห็นตอนเดินหรือเห็นเฉพาะตอนตี (เราเลือกเองว่า "เห็นดาบตลอด")

## 2. ท่าเดิน (walk cycle) ในเกม 2D
- รอบเดิน 1 รอบ = **8 เฟรม**: contact (เท้าแตะพื้น ขากางสุด) → down (ทิ้งน้ำหนัก ตัวต่ำสุด) → passing (ขาผ่านกัน) → up (ตัวสูงสุด)
  แล้วทำซ้ำอีกข้าง · **แขนแกว่งสวนกับขาเสมอ** เพื่อทรงตัว [Construct: Walk cycle and Run cycle]
- ตัวกับหัวยกขึ้นเล็กน้อยในเฟรม passing ให้เห็นการเด้ง, เฟรม contact ค้างนานกว่าเฟรม passing นิดหน่อย,
  และ**เฟรม passing ที่หน้าตาเหมือนกันเกินไปจะทำให้ดูกระตุก** [itch.io: pixel art walk cycle animation]
- ในเกม pixel ส่วนใหญ่ เกิน 8 เฟรมถือเป็นความชอบส่วนตัว (8 เฟรมพอ) [Slynyrd Pixelblog 50: Human Walk Cycle]
- การเด้งมาจาก**ขา/สะโพก**: ตอนขากางออก ขาเฉียง ตัวจึงยกได้ไม่สูงและยุบลง = จุดต่ำสุดของการเด้ง; ขาตรงตอนขาผ่านกัน = ตัวสูง
  และ**ถ้าเฟรมมีเงา (silhouette) เหมือนกัน จะอ่านท่าไม่ออก** [Pixel Joint forum]
- ตัวละครขาสั้น (แบบ chibi ของเรา) ขาขยับได้น้อย → ใส่การขยับที่อก ไหล่ และหัวช่วย (หลักทั่วไปที่เจอในผลค้นหา แต่ยืนยันหน้าต้นทางไม่ได้)
- ความเห็นของ Claude (ไม่ใช่ข้อมูลจากแหล่ง): รอบเดิน 4 เฟรม (contact, passing × 2 ข้าง) ให้ AI วาดให้คงที่ได้ง่ายกว่า
  → เก็บไว้เป็นทางสำรอง STEP 2-ALT

## 3. การถือดาบ
- จับดาบด้วย**กำมือเต็ม** เห็นแรงที่ข้อมือ/แขน — ถ้าจับเหมือนใช้สองนิ้ว ดาบจะดูเป็นของเล่น [Autodesk: Sword poses]
- ดาบที่ถือตรงหน้าอกจะ "จม" หายไปกับลำตัว → ยื่นดาบออกด้านข้างให้เห็นรูปร่างชัด และทดสอบโดยถมภาพเป็นสีดำทั้งตัว
  (silhouette test) ว่ายังอ่านออก [Autodesk: Sword poses]
- ท่าพร้อมสู้: เท้าข้างหนึ่งก้าวนำ ตัวเฉียงเล็กน้อย ถือดาบแบบตั้งรับ น้ำหนักอยู่ปลายเท้า + ขยับขึ้นลงเบา ๆ ให้ดูมีชีวิต
  [Sebastian Lague: RPG graphics E10, Autodesk: Sword poses]
- ในงาน 3D เขาทำ "ท่ากำอาวุธ" แยกไว้ 1 เฟรม เพื่อให้นิ้วอยู่รอบด้ามจริงทุกท่า [Sebastian Lague: RPG graphics E10]

## 4. ทำไมของเราตอนนี้ยังไม่ผ่าน และชุด P12 แก้ยังไง
| ปัญหาเดิม (rig v0.6) | สาเหตุ | P12 แก้ด้วย |
|---|---|---|
| ถือดาบไม่เต็มมือ | ดาบเป็นภาพแยกที่หมุนแปะใต้กำปั้นซึ่งวาดมาแบบมือเปล่า นิ้วไม่ได้โอบด้ามจริง | ให้ ChatGPT วาดดาบอยู่ในกำมือมาในทุกเฟรม + กฎการกำ (4 นิ้วโอบ นิ้วโป้งทับ กระบังอยู่เหนือกำปั้น) |
| เดิน "เหมือนเจ็บก้น" / ไม่เป็นธรรมชาติ | ขยับภาพนิ่งภาพเดียวด้วยการบิด ขางอได้จำกัด ตัวไม่เด้งจริง | วาดทุกเฟรมจริง 8 ท่าตามหลัก contact→down→passing→up + กฎตัวตรง สะโพกอยู่ใต้ไหล่ |
| ดาบพาดหน้า/ทับตัว | ภาพดาบหมุนผ่านหน้าตัวละคร | กฎ silhouette: ดาบห้ามทับหน้าและขา |

## แหล่งข้อมูล
- Ragnarok Research Lab — ACT file format: https://ragnarokresearchlab.github.io/file-formats/act
- Ragnarok Research Lab — Animation systems: https://ragnarokresearchlab.github.io/rendering/animation-systems
- Hercules wiki — Acts: https://github.com/lenaxia/Hercules/wiki/Acts
- Construct — Animation: Walk cycle and Run cycle: https://www.construct.net/en/tutorials/animation-walk-cycle-run-cycle-935
- itch.io — Pixel art walk cycle animation: https://itch.io/blog/526535/pixel-art-walk-cycle-animation
- Slynyrd — Pixelblog 50, Human Walk Cycle: https://www.slynyrd.com/blog/2024/5/24/pixelblog-50-human-walk-cycle
- Pixel Joint forum — Character walking animation: https://pixeljoint.com/forum/printer_friendly_posts.asp?TID=25611
- Autodesk — Sword poses: https://origin-exchange.autodesk.com/sword-poses
- Sebastian Lague — RPG graphics E10: Attack Animations: https://rosetta.to/u/sebastianlague/rpg-graphics-e10-attack-animations-blender
