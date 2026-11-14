# ชุดติดตั้ง Ashen Crown บน eggpact-dev (157.85.101.245) → https://crown.ragalpha.com

ชุดนี้ทำตามเงื่อนไขที่แชท EggPact ให้มาทุกข้อ (ตารางท้ายไฟล์) ให้แชท EggPact ตรวจทุกบรรทัดก่อนรัน

## ไฟล์ในชุด

| ไฟล์ | ติดตั้งไปที่ | หน้าที่ |
|---|---|---|
| `install.sh` | (รันจากโฟลเดอร์นี้ด้วย sudo) | ติดตั้งครั้งเดียว รันซ้ำได้ ไม่เสียหาย |
| `update.sh` | `/srv/crown/bin/update.sh` | สร้างเกมเวอร์ชันเว็บ รันในนามผู้ใช้ crown |
| `fetch-godot.sh` | `/srv/crown/bin/fetch-godot.sh` | ดาวน์โหลด Godot 4.7 + ไฟล์ส่งออกเว็บ ตรวจ SHA-512 ที่ฝังไว้ |
| `crown.conf.example` | `/srv/crown/crown.conf` | ค่าตั้ง: repo, สาขา, เงื่อนไข "เครื่องไม่ว่าง" |
| `nginx/crown.conf` | `/etc/nginx/sites-available/` | เว็บ crown.ragalpha.com อ่านได้แค่ `/srv/crown/www` |
| `nginx/00-deny-unknown.conf` | `/etc/nginx/conf.d/` | ชื่อโดเมนอื่นหรือเข้าด้วย IP ตรงๆ ได้อะไรกลับไปไม่ได้เลย |
| `systemd/crown-update.service` | `/etc/systemd/system/` | รันอัปเดตในนาม crown: 1 คอร์, RAM 1.5 GB, ความสำคัญต่ำสุด, มองไม่เห็น /home |
| `systemd/crown-update.timer` | `/etc/systemd/system/` | ทุกชั่วโมงนาทีที่ 17 เวลาไทย ยกเว้นชั่วโมง 05:xx |

## ขั้นตอน

1. **เอาชุดนี้ขึ้นเครื่อง** วาง zip ไว้ที่ไหนก็ได้ (เช่น `/tmp/crown-kit`) แล้ว `unzip`
2. **รันติดตั้ง** `cd /tmp/crown-kit/vps && sudo ./install.sh`
   - ขั้นไฟร์วอลล์จะถามก่อน ให้พิมพ์ `yes` (SSH ทุกพอร์ตที่ sshd ใช้จะเปิดไว้เหมือนเดิม)
   - ครั้งแรกจะดาวน์โหลด Godot ประมาณ 1.3 GB แล้วเก็บไว้แค่ ~110 MB
   - จบแล้วสคริปต์จะบอกว่า "ยังเหลืออะไรต้องทำ"
3. **ใส่ deploy key บน GitHub** (สคริปต์พิมพ์กุญแจสาธารณะให้)
   repo `suthipongs10-a11y/shopdashTH` → Settings → Deploy keys → Add deploy key → **ไม่ติ๊ก** Allow write access
4. **ใบรับรอง Cloudflare Origin**
   Cloudflare → ragalpha.com → SSL/TLS → Origin Server → Create Certificate (ชื่อ crown.ragalpha.com)
   บันทึกเป็น `/etc/ssl/crown/origin.pem` และกุญแจเป็น `/etc/ssl/crown/origin.key`
   ตั้ง SSL/TLS mode เป็น **Full (strict)** แล้วรัน `sudo ./install.sh` อีกครั้ง
5. **DNS** Cloudflare → ragalpha.com → DNS → Add record: Type A · Name `crown` · IPv4 `157.85.101.245` · Proxy เปิด (เมฆสีส้ม)
6. **สร้างเกมครั้งแรก** `sudo systemctl start crown-update.service` ดูความคืบหน้า `journalctl -u crown-update.service -f`
7. **เปิด** https://crown.ragalpha.com

## คำสั่งที่ใช้บ่อย

| ต้องการ | คำสั่ง |
|---|---|
| อัปเดตทันที (ใช้ข้อจำกัดทรัพยากรของ systemd) | `sudo systemctl start crown-update.service` |
| ดูบันทึก | `journalctl -u crown-update.service -n 50` |
| ดูว่าตอนนี้เกมเวอร์ชันไหน | `cat /srv/crown/www/version.txt` |
| ย้อนกลับเวอร์ชันก่อน | `sudo -u crown -H /srv/crown/bin/update.sh --rollback` |
| สร้างใหม่แม้โค้ดไม่เปลี่ยน (ใช้ข้อจำกัดทรัพยากรเดียวกัน) | `sudo systemctl start crown-update-force.service` |
| หยุดอัปเดตอัตโนมัติ | `sudo systemctl disable --now crown-update.timer` |

## ถ้า GitHub ใช้ไม่ได้ (สำรอง)

บนเครื่องไหนก็ได้ที่มีโค้ด: `git archive --format=tar.gz -o crown-src.tar.gz HEAD game`
ส่งไฟล์ขึ้นเครื่องแล้ว:
```
sudo install -o crown -g crown -m 0600 crown-src.tar.gz /srv/crown/src/upload.tar.gz
sudo -u crown -H /srv/crown/bin/update.sh --from-tar /srv/crown/src/upload.tar.gz
```
หรือเปลี่ยน `REPO_URL` ใน `/srv/crown/crown.conf` ไปที่ git ที่อื่น

## ให้ข้ามรอบเมื่อเครื่องไม่ว่าง (เชื่อมกับงาน EggPact)

แก้ `/srv/crown/crown.conf` (ต้องใช้ sudo):
- `MAX_LOAD="2.5"` ข้ามรอบเมื่อ load เฉลี่ย 1 นาทีเกิน 2.5 (เครื่องมี 4 คอร์) **เปิดอยู่แล้ว**
- `BUSY_FILE="/path/ไฟล์ล็อก"` ข้ามรอบเมื่อไฟล์นี้มีอยู่ (ถ้างานเทสต์ EggPact สร้างไฟล์ล็อก)
- `BUSY_CMD='คำสั่ง'` ข้ามรอบเมื่อคำสั่งนี้คืนค่า 0 เช่น `pgrep -u eggbound -f "ชื่อคำสั่งเทสต์"`

แชท EggPact บอกว่ามีวิธีเช็ก ให้ใส่ตรงนี้

## ผลทดสอบก่อนส่ง (ทำใน Ubuntu 24.04 + nginx 1.24 เวอร์ชันเดียวกับเครื่องจริง)

- `update.sh` ในนามผู้ใช้ทดสอบ: clone → import → ทดสอบรันเกม → ส่งออก → เผยแพร่ ใช้ 19 วินาที (เครื่องทดสอบไม่จำกัด CPU บนเครื่องจริง 1 คอร์ + ความสำคัญต่ำ น่าจะ 1–3 นาที) หน่วยความจำสูงสุด 756 MB
- โค้ดไม่เปลี่ยน: จบใน 0.06 วินาที · เครื่องไม่ว่าง: ข้ามรอบ · ย้อนเวอร์ชัน: ใช้ได้ · รันด้วย root: ปฏิเสธ
- nginx: `nginx -t` ผ่าน · `.wasm` ส่งเป็น `application/wasm` บีบอัดจาก 39.5 MB เหลือ 10.1 MB · ไฟล์ซ่อน (.env) 403 · symlink ไป /etc/passwd 404 · ดูรายชื่อไฟล์ในโฟลเดอร์ 403 · `../` ออกนอกโฟลเดอร์ 400 · เข้าด้วย IP ตรงๆ ถูกตัด
- เปิดในเบราว์เซอร์ Chromium ผ่าน nginx: หน้าโหลด → เกมเริ่มได้
- `shellcheck` ผ่านทุกสคริปต์ · `systemd-analyze verify` ผ่าน
- ที่ทดสอบไม่ได้ในเครื่องทดสอบ: ไฟร์วอลล์ ufw, Cloudflare จริง, deploy key กับ GitHub จริง, การดาวน์โหลด Godot ทั้งชุด (ทดสอบแค่ว่าชื่อไฟล์ในชุดถูก)

## ถอนการติดตั้ง

```
sudo systemctl disable --now crown-update.timer
sudo rm /etc/systemd/system/crown-update.{service,timer} && sudo systemctl daemon-reload
sudo rm /etc/nginx/sites-enabled/crown.conf /etc/nginx/sites-available/crown.conf && sudo systemctl reload nginx
sudo userdel crown && sudo rm -rf /srv/crown /etc/ssl/crown
```
(ไฟร์วอลล์และ `00-deny-unknown.conf` ถ้าไม่ใช้ nginx ต่อ ลบหรือ `sudo ufw disable` ได้)

## เงื่อนไขจากแชท EggPact → อยู่ตรงไหนในชุด

| ข้อ | เงื่อนไข | จัดการที่ |
|---|---|---|
| 3 | nginx ติดตั้งตรง ไม่ใช้ Docker, ผู้ใช้ไม่มี sudo → สคริปต์ติดตั้งรันด้วย sudo | `install.sh` ขั้น 1, 5 |
| 5 | Cloudflare proxy + Origin Certificate (Full strict) | `nginx/crown.conf`, `install.sh` ขั้น 5 |
| 6 | crown.ragalpha.com | ทุกไฟล์ |
| 7 | ผู้ใช้ crown แยก, `/srv/crown/www` และ `/srv/crown/src`, nginx อ่านได้แค่ www, crown อ่าน /home/eggbound ไม่ได้ | `install.sh` ขั้น 2 (ตรวจและเตือน), service `ProtectHome=yes`, nginx `root` + `disable_symlinks on` |
| 8 | deploy key อ่านอย่างเดียว ผูก repo เดียว เก็บในผู้ใช้ crown ไม่ใช้ token | `install.sh` ขั้น 3 (host key ของ GitHub ฝังไว้ กันปลอม) |
| 9 | Godot รันด้วย nice + จำกัด 1 คอร์ RAM 1.5 GB, ไม่ฝาก GitHub ที่เดียว | service `CPUQuota=100%` `MemoryMax=1536M` `Nice=19` `IOSchedulingClass=idle`, `--from-tar` |
| 10 | fetch ก่อน build เฉพาะเมื่อเปลี่ยน, ข้ามเมื่อเทสต์รัน, ห้าม 04:30–05:30, | `update.sh`, `crown.conf` (MAX_LOAD/BUSY_FILE/BUSY_CMD), timer ข้ามชั่วโมง 05 เวลาไทย |
| 11 | ห้ามเสิร์ฟนอก www, autoindex ปิด, firewall เปิด 80/443 เฉพาะ Cloudflare, SSH เหมือนเดิม, ไม่ใช้ thread, wasm mime + gzip | `nginx/*.conf`, `install.sh` ขั้น 6, ส่งออกแบบ nothreads |

## ตรวจโดยแชท EggPact (2026-11-13) — แก้แล้ว 6 จุด

1. **บีบอัด wasm ตอน build แทนทุกครั้งที่มีคนโหลด** (`update.sh` + `gzip_static on` ใน nginx) เดิม nginx บีบอัดไฟล์ 40 MB ใหม่ทุกครั้งที่มีคนเปิดเกม (Cloudflare ส่งต่อมาทุกครั้งเพราะ no-cache) กิน CPU เครื่องที่รันเทสต์ EggPact
2. **ผู้ใช้ crown ไม่มี shell สำหรับล็อกอิน** (`/usr/sbin/nologin`) `sudo -u crown คำสั่ง` ยังใช้ได้
3. **sandbox ของ service แน่นขึ้น** (ไม่มี capability ใดๆ · ห้าม namespace/realtime · ห้ามแตะนาฬิกา/hostname/kernel log · เฉพาะ socket เครือข่ายปกติ)
4. **สร้างใหม่แบบบังคับใช้ข้อจำกัดเดียวกัน** `crown-update-force.service` (เดิม README ให้รัน `sudo -u crown update.sh --force` ตรงๆ ซึ่งไม่ผ่านข้อจำกัด CPU/RAM)
5. **BUSY_CMD สำหรับงาน EggPact** ใน `crown.conf` (เทสต์ชุดเต็ม · deploy/ดึงสำรองตามเวลา · Chromium ทดสอบหน้าจอ · build Android · สคริปต์ tools/sim · ขยายภาพ)
6. ลูปบีบอัดใช้ `if` ไม่ใช่ `&&` (ภายใต้ `set -e` ลูปที่จบด้วยเงื่อนไขเท็จจะทำให้สคริปต์หยุด)

ช่วงห้าม 04:30–05:30 ถูกต้อง (เวลาไทย) ตัวตั้งเวลาข้ามชั่วโมง 05 ทั้งชั่วโมงใช้ได้ · nginx ลบหน้า Welcome ได้ เครื่องนี้ไม่มีแผนใช้ nginx กับงานอื่น
