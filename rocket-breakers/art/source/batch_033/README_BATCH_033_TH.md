# ROCKET BREAKERS — BATCH 033

ครบ 8 PNG อุปสรรค HZ01–HZ08 ตามชื่อไฟล์ที่ขอ สร้างทีละภาพด้วยเครื่องมือสร้างภาพในตัว
ขนาดจริงทุกภาพ 1254×1254 (คำขอ 1024×1024 อัตราส่วน 1:1 ตรงกัน) เก็บต้นฉบับ ไม่ย่อหรือแก้พิกเซล
ทุกภาพ RGBA มี alpha จริง ตรวจพื้นดำ ขาว และตารางแล้ว ไม่มีพื้นหลังทึบหรือ checkerboard วาดติดภาพ
ไม่พบส่วนชัดเจนถูกตัดขอบที่ alpha>16 มี alpha 1–2/255 บางจุดที่ขอบของบางภาพ ต้องตรวจ atlas bleed
Molten Gates มีระยะขอบด้านข้างน้อยสุดประมาณ 31px ต้องเผื่อ padding ตอนจัด atlas
Ion Front และ Eclipse Gates ส่งรุ่นแก้ที่ลดความหนาแน่น ไม่รวมรุ่นแรกที่แสงแน่น

## ภาพกับระบบเกม
แต่ละ hazard มี 1 static base frame ไม่ใช่ animation หรือชุด warning/active/cooldown ครบทุกสถานะ
พฤติกรรมเวลาเตือน แรงผลัก แรงดึง collision ทางปลอดภัยและการสะท้อน ต้องสร้าง/ทดสอบใน code รายละเอียดตามต้นทางอยู่ใน integration_rules.json
ภาพอย่างเดียวไม่รับประกันว่าจะไม่บังกระสุน ต้องวาง bullets และ weak-joint markers เหนือ fog/field/physical hazards และทดสอบจริงบนมือถือ
ค่าความทึบแนะนำเป็นจุดเริ่มต้นเท่านั้น: Ion 0.35, Sand 0.15, Gravity 0.25 (material modulation) แล้วปรับกับฉากจริง
Sand Veil เป็น fog texture มีส่วนกลางหนาแน่น ต้องลด opacity และใช้เฉพาะ background layer
Gravity Wells มีศูนย์กลางโปร่งใส แต่ความสว่างรอบวงต้องลดลงก่อนใช้ใน bullet-dense scene; ทางหนีที่เข้าถึงได้ต้องตรวจจากเกมจริง
Eclipse Gates เป็นรุ่น base state วงเปิดกับ emitter สีส้ม ไม่มี active pulse ให้เอนจินทำลำดับคำเตือนสองชนิดโดยไม่ปิดทางหนี
Molten Gates เป็น hardware พร้อมช่องว่าง ไม่ได้วาดสอง lane ปลอดภัยเป็นเส้น UI ไว้ในภาพ ให้ code รักษาสอง lane ปลอดภัยเสมอ
Prism Ice มีขอบสะท้อนทำเครื่องหมายสองด้าน ต้องตั้ง reflector segments แยกจาก collision shape ใน code
Root Lattice เป็นรากสองฝั่ง มีช่องกลาง แต่อย่าใช้ rectangular collider ครอบทั้ง PNG; ถ้าต้องแตกทำลายเป็นส่วน ให้แยก regions/physics ในขั้น import
ภาพแข็งบางชิ้นมี bevel/depth ในรายละเอียด ต้องทดสอบความเข้ากันกับกล้องและขนาดจริงของด่าน
จุดกลาง canvas=(627,627), normalized=(0.5,0.5) เป็นจุดเริ่มต้น ต้องตรวจ optical pivot และ world scale รายชนิด

## ZIP
PART 01: HZ01 Wreck Drift + HZ02 Molten Gates
PART 02: HZ03 Ion Front + HZ04 Root Lattice
PART 03: HZ05 Prism Ice + HZ06 Sand Veil
PART 04: HZ07 Gravity Wells + HZ08 Eclipse Gates
แต่ละ ZIP อิสระ แตกทั้งหมดลงโฟลเดอร์เดียวกันได้
แนบ manifest ขนาด/alpha/bbox/SHA256, integration rules, ชุดคำสั่งจริงและคำขอต้นทาง
สถานะ: สร้างภาพครบ ตรวจไฟล์และภาพเบื้องต้นแล้ว ยังไม่ผ่าน gameplay/collision/bullet visibility QA ในเอนจิน
