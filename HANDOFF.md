# สรุปงานที่ทำไปแล้ว — ตลาดชุมชน (Community Marketplace)

ถึง Teenoi888 — สรุปนี้เขียนไว้ให้เข้าใจเร็วๆ ว่างานฝั่งเราไปถึงไหนแล้ว ก่อนที่จะ push โค้ดฝั่งคุณเข้ามาทับใน `main` อีก 🙏

**สถานะ ณ 13 ก.ค. 2026** — commit ล่าสุดที่ deploy สำเร็จบน production คือ `304243d`

---

## ⚠️ ขอความร่วมมือก่อนอื่น: กรุณา Pull ก่อน Push

เท่าที่ตรวจ git log พบว่ามีการ **force-push ทับ `main` มาแล้ว 10 ครั้ง** ในช่วงที่ผ่านมา (สาเหตุคือเครื่องที่ push ไม่เคย `git pull` จาก remote เลยตั้งแต่เริ่มงาน โค้ดฝั่งนั้นจึง frozen อยู่ที่ commit เก่ามาก พอ push เลยต้อง force ทับประวัติทั้งหมด) แต่ละครั้งเราต้องเสียเวลา diff เทียบเพื่อแยกว่าอะไรใหม่จริง อะไรซ้ำ/บั๊กเก่าที่เคยแก้ไปแล้ว แล้วค่อย merge กลับ

**ขอให้ทำตามนี้ทุกครั้งก่อน push:**
```bash
git fetch origin
git pull --rebase origin main
# แก้ conflict ถ้ามี แล้วค่อย push
git push origin main
```
วิธีนี้จะทำให้ push ปกติ (ไม่ force) และไม่ทับงานที่ทำไปแล้วฝั่งนี้ — ถ้าจำเป็นต้อง force จริงๆ ให้ใช้ `git push --force-with-lease` แทน `--force` เฉยๆ (มันจะปฏิเสธถ้ามีคนอื่น push ไปก่อนโดยที่คุณยังไม่ได้ pull มา ป้องกันเหตุการณ์ซ้ำ)

---

## ฟีเจอร์ที่ทำเสร็จแล้ว

### 🔐 ระบบ Login / Auth
- Login ด้วย **เบอร์โทร + รหัสผ่าน** (ทางหลัก)
- Login ด้วย **อีเมล + OTP** (ไม่ต้องตั้งรหัสผ่าน)
- **Google OAuth** และ **Facebook OAuth**
- **LINE Login OAuth**
- ลืมรหัสผ่าน 2 ทาง แยกตามวิธี login: `/forgot-password` (อีเมล) และ `/forgot-password-phone` → `/reset-password` (เบอร์โทร)
- ออกแบบหน้า auth ใหม่ทั้งหมด (redesign)
- Auto-logout เมื่อไม่มีกิจกรรม 30 นาที (มี toast เตือนล่วงหน้า 2 นาที)

### 🛒 ร้านค้า / ตะกร้า / ออเดอร์
- ระบบ multi-tenant: 1 user เปิดได้หลายร้าน, ผูกกับชุมชน
- ตะกร้า + checkout พร้อม**ที่อยู่จัดส่งที่บันทึกไว้ได้** (ตั้ง label, default address, จังหวัด/อำเภอ/รหัสไปรษณีย์แบบ cascading)
- **จองสต็อกทันทีตอนสร้างออเดอร์** กันขายเกินสต็อก
- หน้าจัดการออเดอร์ฝั่งร้านค้า (`/seller/orders`) — เปลี่ยนสถานะ + บันทึกเลข tracking
- บังคับ login ก่อนกดเพิ่มสินค้าลงตะกร้า (มี toast พร้อมปุ่มลิงก์ไปหน้า login)
- Dashboard สถิติแบบ real-time จาก API + UI สำหรับชำระด้วยบัตรเครดิต + multi-gateway API

### 💬 แชท และการแจ้งเตือน
- แชทระหว่างผู้ซื้อ-ผู้ขาย ผ่าน websocket (`@fastify/websocket`) — แก้บั๊กที่แชทใช้งานไม่ได้เลย (ผูก WS object ผิด, ขาด env var) + เพิ่มแนบรูปภาพได้
- ปุ่ม "แชทกับผู้ขาย" ทั้งจากหน้าร้าน/ชุมชน และไอคอนแชทถาวรบน desktop nav
- **แจ้งเตือนสถานะออเดอร์แบบ real-time** — unread badge, push สด, ส่งอีเมล/LINE เมื่อสถานะเปลี่ยน (มี template อีเมลแบบ branded HTML ด้วย)

### 🛠️ Admin Panel (`/admin`)
- จัดการหมวดหมู่สินค้า (categories เป็น dynamic จาก DB แล้ว ไม่ hardcode, seed 8 หมวดเริ่มต้น)
- จัดการผู้ใช้ (ค้นหา / reset password / ตั้งสิทธิ์ admin)
- จัดการ/ลบ/แก้ไขสินค้าได้ทุกร้าน (product moderation)
- สถิติรวมระบบ
- endpoint `POST /api/admin/seed` สำหรับใส่ข้อมูลตัวอย่าง (3 ชุมชน/3 ร้าน/11 สินค้า) กัน secret + กันใส่ซ้ำ

### 🩹 Bug fix / Infra
- แก้ CI ที่ type-check และ lint ค้าง, pin เวอร์ชัน `@types/react` ให้ตรงกันทั้ง workspace
- แก้ cart badge hydration mismatch
- แก้ mobile responsive nav (hamburger drawer, login/register บนมือถือ, user menu)
- อัปเกรด Next.js เพื่อปิดช่องโหว่ระดับ HIGH ที่บล็อกการ deploy บน Railway
- แก้ layout โลโก้ชุมชนที่ลอยทับ banner
- แก้ CORS ให้ยอมรับ origin `chumchon.market`

---

## ช่องว่างที่ยังไม่ได้ทำ (รู้อยู่แล้ว ไม่ต้องเสียเวลาหาใหม่)

1. ไม่มี unread badge จริงบนกระดิ่งใน MainNav (หน้า `/notifications` ยัง derive จาก `/orders` สดทุกครั้ง)
2. Payment gateway (GB Prime Pay / EasySlip) ยังเป็น manual/บางส่วน ยังไม่ verify integration เต็มรูปแบบ
3. Mobile app (`@cm/mobile`, Expo) — build ล้มเหลวมาเกิน 2 สัปดาห์ ยังไม่ได้ตามแก้

## ของที่ตั้งใจข้ามไป (มีอยู่ใน git history เผื่อย้อนดู แต่ไม่ได้ merge เข้า main)

- OAuth เวอร์ชันคู่ขนานที่เคยเขียนแยก (route `/api/auth/google` ฯลฯ, column `google_uid`/`facebook_uid`) — ซ้ำกับของที่ใช้งานจริงบน production แล้ว
- บั๊กตัดสต็อกซ้ำสองรอบใน `payments/index.ts`
- Logo แบบ `-mt-14` ที่ลอยทับ banner ในหน้าชุมชน/my-community — ขัดกับที่แก้ไปแล้วก่อนหน้า
- Migration runner แบบรันไฟล์ .sql ทุกไฟล์ซ้ำทุก boot — เก็บของเดิม (drizzle journal-tracked) ไว้เพราะปลอดภัยกว่า

---

## Production

| ส่วน | URL | Host |
|---|---|---|
| Web (frontend) | https://www.chumchon.market | Railway `@cm/web`, project `reasonable-respect` |
| API (backend) | https://cmapi-production-5f4f.up.railway.app | Railway `@cm/api`, project `reasonable-respect` |
| Database | PostgreSQL | Railway (`DATABASE_URL`) |

หมายเหตุ: Railway มักจะข้าม deploy อัตโนมัติ (`SKIPPED`) ถ้า commit มาจากการ force-push ที่ทับประวัติ — เป็นอีกเหตุผลที่อยากให้เลี่ยง force-push
