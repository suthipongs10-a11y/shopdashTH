# ROCKET BREAKERS — BATCH 009

ครบ 8 PNG ศัตรู E17–E24 ตามชื่อที่ขอ สร้างทีละภาพด้วยเครื่องมือสร้างภาพในตัว
ใช้ enemies_board เป็นแนววัสดุและสไตล์ ไม่ตัดภาพจากบอร์ด
ขนาดจริงทุกภาพ 1254×1254 พิกเซล (คำขอ 512×512 อัตราส่วน 1:1 ตรงกัน) เก็บต้นฉบับ ไม่ย่อหรือแก้พิกเซล
ทุกภาพ RGBA alpha จริง 0–255 ตรวจพื้นดำ ขาว และตารางแล้ว ไม่มีพื้นหลังทึบหรือ checkerboard วาดติดภาพ
ไม่พบส่วนชัดเจนถูกตัดขอบที่ alpha>16 ทุกไฟล์มี alpha จางมาก 1/255 บางจุดที่ขอบ ควรตรวจ atlas bleed
ระยะ padding แตกต่างกัน บางลำยาวเกือบเต็ม canvas ให้ใช้ bbox ใน manifest จัดขนาดรายลำ

## ส่งต่อ Claude
manifest จับคู่ enemy_id/name/role/move/attack ตาม BATCH_009 พร้อมขนาด alpha bbox และ SHA256
ทิศหน้าอ้างอิงขึ้น (0,-1) ให้เอนจินหมุนเข้าหาผู้เล่น จุดกลาง canvas จริง=(627,627) หรือ normalized=(0.5,0.5) เป็นจุดเริ่มต้น ต้องตรวจ optical pivot และ hitbox รายลำ
ภาพชุดนี้เป็น sprite พื้นฐาน ไม่มี animation, collision หรือ VFX การโจมตีที่ทดสอบแล้ว ให้สร้างพฤติกรรม/จุดยิงใน code
Orbit Guard เป็น 1 PNG ตามจำนวนรายการ ภายในมี hull กลางและ blade pods สามชุดมีช่องโปร่งใสแยกอยู่รอบตัว แต่ยังไม่ใช่ไฟล์ชิ้นส่วนแยก หากต้องการหมุน blade pods อิสระ ต้องแยก regions/เลเยอร์จากต้นฉบับตอน import แล้วตั้ง pivot รายชิ้น ห้ามหมุนทั้ง texture หากต้องการให้ hull ไม่หมุนตาม
Gravity Anchor มีวง emitter สีม่วงในตัว; field gameplay และ VFX รัศมีกว้างให้ code สร้างต่างหาก
Mirror Decoy มีแผงกระจกสีเงิน; ghost/echo copy ให้ code สร้างตามพฤติกรรม ไม่วาดลำซ้ำติดภาพ
Loot Snatcher มีกรงเล็บอำพันสำหรับขโมย เป็นทรงไม่สมมาตร ต้องแยก collision การจับจาก hitbox ลำตัว
Missile Frigate มีช่องยิงหลายช่อง จำนวนช่องในภาพไม่ใช่จำนวนกระสุนที่ต้องยิงทุกครั้ง ให้ balance/code เป็นตัวกำหนด
Beam Cutter: คำขอต้นทางบรรยาย stationary prism sentry แต่ move ระบุ cross ให้เก็บรูปทรง sentry และใช้ move=cross ตามข้อมูลเกมจนกว่าผู้ออกแบบจะเปลี่ยน ไม่เปลี่ยนเป็น stationary อัตโนมัติ
Armor Carrier มีช่อง launch bay ว่าง ลำลูก scout ต้อง spawn เป็น entity แยกใน code
ภาพย่อ 48px ตรวจเบื้องต้นแล้ว รายละเอียดกลไกจะลดลงเมื่อย่อ ต้องทดสอบสเกล ความอ่านง่าย ความสว่างและ hitbox ในฉากเกมจริง

## ZIP
PART 01: E17 Gravity Anchor, E18 Orbit Guard, E19 Mirror Decoy
PART 02: E20 Citadel Guard, E21 Loot Snatcher, E22 Missile Frigate
PART 03: E23 Beam Cutter, E24 Armor Carrier
แต่ละ ZIP อิสระ แตกทั้งหมดลงโฟลเดอร์เดียวกันได้
แนบ manifest ชุดคำสั่งจริง และคำขอต้นทาง สถานะสร้างครบ/ตรวจไฟล์เบื้องต้นแล้ว รอ Claude ตรวจในเอนจิน
