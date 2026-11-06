# ชุดคำสั่ง P12 — ท่าถือดาบ + ท่าเดิน (ทิศ SW ก่อน)

ชุดนี้ทำแค่ 2 เรื่องตามที่ขอ: **ถือดาบให้เต็มมือ** และ **เดินให้เป็นธรรมชาติ** ทำทีละขั้น ตรวจทุกภาพก่อนไปขั้นถัดไป
ตัวละครยังเป็น Kaelrin หน้าตาเดิม (REF_03 / P01) แต่ภาพทุกเฟรมวาดใหม่หมด ดาบวาดอยู่ในมือมาเลย ไม่ใช่ภาพดาบที่หมุนแปะ
(ที่มาของปัญหา "ถือไม่เต็มมือ" ใน rig เดิม) · ข้อมูลที่ค้นมาจากเกมอื่นสรุปไว้ใน `02_RESEARCH_TH.md`

| ขั้น | ไฟล์ | ได้อะไร | SAVE AS |
|---|---|---|---|
| 1 | `STEP1_P12A_sword_hold.txt` | Kaelrin ถือดาบ 3 แบบ (ถือต่ำ / ตั้งการ์ด / พาดบ่า) **ให้คุณเลือก 1 แบบ** | `P12A_hero_sw_hold3.png` |
| 2 | `STEP2_P12B_walk8_sw.txt` | ท่าเดิน 8 เฟรม ถือดาบแบบที่เลือก | `P12B_hero_sw_walk8.png` |
| 2 สำรอง | `STEP2-ALT_P12C_walk4_sw.txt` | ท่าเดิน 4 เฟรม (ใช้เมื่อแบบ 8 เฟรมเพี้ยนหลายรอบ) | `P12C_hero_sw_walk4.png` |

ผ่านทั้ง 2 ขั้นแล้ว Claude จะทำชุดต่อไป (ทิศ S, W, NW, N → ท่ายืนหายใจ → ท่าฟัน)

## วิธีใช้ (มือถือ)

1. เปิดแชท ChatGPT เดิม **"Acknowledge Readiness"** (มีภาพต้นแบบอยู่แล้ว) หรือเริ่มแชทใหม่ก็ได้
2. แนบไฟล์ zip นี้ แล้วพิมพ์:
   ```
   Read 01_START_HERE_for_ChatGPT.md in this zip, look at every image in refs/, and follow it.
   ```
3. ChatGPT ตอบ `Ready — waiting for STEP 1` → พิมพ์ `STEP 1`
4. ได้ภาพ → กดค้างบันทึกภาพ → อัปโหลดเข้า GitHub `games/mossbridge/art/inbox/` (branch `claude/optimistic-carson-cr4kam`)
   ตั้งชื่อ `P12A_hero_sw_hold3.png` → บอก Claude ว่า "อัปโหลดแล้ว" (หรือแนบภาพในแชท Claude ให้ดูก่อนก็ได้)
5. Claude ตรวจ (กำเต็มมือไหม ดาบมือขวาไหม ขนาดเท่ากันไหม) แล้วส่งภาพตรวจกลับ → **คุณเลือกแบบ 1, 2 หรือ 3**
6. กลับไปแชท ChatGPT พิมพ์ (เปลี่ยนเลขตามที่เลือก):
   ```
   I choose cell 2 from P12A. STEP 2
   ```
7. ได้ภาพเดิน → อัปโหลดชื่อ `P12B_hero_sw_walk8.png` → Claude ทำ GIF เดินจริงให้ดู → คุณตัดสินว่าผ่านไหม
8. ถ้าแบบ 8 เฟรมเพี้ยน (หน้าตาเปลี่ยน/ขนาดไม่เท่า) 2–3 รอบแล้วยังไม่ดีขึ้น → พิมพ์ `STEP 2-ALT` (แบบ 4 เฟรม)

**ถ้า ChatGPT เปิด zip ไม่ได้ หรือบอกว่าไม่เห็นรูป:** แตก zip ในมือถือ (แอป Files) แนบ 4 รูปในโฟลเดอร์ `refs/` เอง
แล้วคัดลอกข้อความในไฟล์ `01_START_HERE...` และไฟล์ STEP (ส่วนหลัง `PROMPT:`) ไปวางทีละข้อความ

**ถ้า ChatGPT ให้เลือกระหว่าง 2 ภาพ:** เลือกภาพที่ตัวละครขนาดเท่ากันทุกช่องและกำดาบเต็มมือ หรือบันทึกทั้งสองภาพส่งให้ Claude เลือก

## ภาพผิด → พิมพ์ประโยคขวามือต่อในแชทเดิม (ให้วาดใหม่)

| เห็นอะไร | พิมพ์ต่อ |
|---|---|
| ดาบไม่อยู่ในกำปั้น / จับสองนิ้ว / ดาบลอย | `His RIGHT fist must be fully closed around the leather grip: four fingers wrapped, thumb over them, brass guard just above the fist, pommel just below. The sword must not float. Redo, change nothing else.` |
| ดาบอยู่มือซ้าย | `The sword must be in his RIGHT hand, the hand on the left side of the picture in view SW. Redo, change nothing else.` |
| ดาบใหญ่/เล็กไม่เท่ากันในแต่ละเฟรม | `The sword must be the same size in every frame, about 55% of his height, exactly like my P03 image.` |
| ดาบพาดหน้า/ทับขา ดูไม่ออกว่าเป็นอะไร | `Keep the blade clear of his face and legs so the silhouette reads clearly.` |
| ตัวละครขนาดไม่เท่ากัน / เท้าไม่อยู่ระดับเดียวกัน | `All frames must be the same size, feet on the same baseline. Redo.` |
| หน้าตา/ชุดเพี้ยนจาก Kaelrin | `He must match REF_03 and my P01 image exactly: same face, teal spiky hair, teal armor with brass trim, scarf, belt pouch. Redo.` |
| หันผิดทิศ | `Every frame must be view SW like REF_03 view 1: front three-quarter, facing down-left.` |
| เดินแล้วตัวเอนหลัง/ก้นยื่น ("เจ็บก้น") | `He leans back like he is sitting. Keep him upright: hips under the shoulders, chest up, a very slight forward lean. Redo.` |
| เฟรมเดินคล้ายกันเกินไป ขาไม่ขยับ | `The frames are too similar. In CONTACT frames the legs are wide apart, in PASSING frames one leg swings past the other under the body. Redo.` |
| จำนวน/ลำดับเฟรมผิด | `There must be exactly 8 frames in a 4x2 grid in this order: contact, down, passing, up, contact, down, passing, up (the legs swap after frame 4).` |
| ตัวไหลออกข้าง ไม่เดินอยู่กับที่ | `He must walk in place: his body stays in the middle of each cell.` |
| มีเส้นความเร็ว ฝุ่น แสง ตัวเลข ตัวอักษร | `Remove all motion lines, dust, glow, numbers and text.` |
| พื้นหลังไม่ใช่ม่วงเรียบ | `Redo it with ONE flat solid magenta #FF00FF background, no floor, no shadow.` |

ไม่ผ่านซ้ำ 3 รอบ: บอก Claude พร้อมภาพล่าสุด Claude จะเขียนประโยคแก้เฉพาะจุดให้
