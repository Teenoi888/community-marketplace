# สรุปงานที่ทำไปแล้ว — ตลาดชุมชน (Community Marketplace)

ถึง Teenoi888 — สรุปนี้เขียนไว้ให้เข้าใจเร็วๆ ว่างานฝั่งเราไปถึงไหนแล้ว ก่อนที่จะ push โค้ดฝั่งคุณเข้ามาทับใน `main` อีก 🙏

**สถานะ ณ 14 ก.ย. 2026** — commit ล่าสุดที่ deploy สำเร็จบน production คือ `a89f3a5` (merge `dev/sarayut` → `main`)

---

## 🆕 อัปเดตล่าสุด — 14 ก.ย. 2026 (อ่านก่อนเริ่มงานบนเครื่องนี้)

### 1) ปิดฟีเจอร์ Live streaming / ไลฟ์ขายของ บนเว็บ (ชั่วคราว)
ใช้ feature flag `LIVE_ENABLED = false` ที่ `apps/web/src/lib/features.ts` — ซ่อนทางเข้าทุกจุด (nav, หน้าแรก) และกันลิงก์เก่า/บุ๊กมาร์กที่ตรงเข้า `/live` ฝั่ง backend (`apps/api/src/routes/live`) **ไม่ได้แตะเลย** เปิดกลับได้ทันทีโดยแก้ค่านี้เป็น `true` ค่าเดียว ไม่ต้องเขียนโค้ดใหม่

### 2) ⚠️ ย้ายที่เก็บ repo ออกจาก OneDrive แล้ว — สำคัญมาก
พบว่าฐานข้อมูล git ที่อยู่ใต้ OneDrive (โหมด Files-On-Demand) **เสียหายจริง** (`git fsck` เจอ broken object links, invalid reflog หลายจุด) สาเหตุคือ OneDrive sync ไฟล์ข้างใน `.git` ทีละไฟล์เหมือนเป็นเอกสารทั่วไป ทั้งที่ไฟล์พวกนี้ต้องเขียนแบบ atomic (ล็อกแล้วเปลี่ยนชื่อทันที) พอ OneDrive แทรกจังหวะพอดี object เลยพังและ lock file ค้าง — **นี่คือสาเหตุตัวจริงของปัญหา force-push 10 ครั้งที่เขียนเตือนไว้ด้านล่าง** (ไม่ใช่แค่ "ลืม pull" อย่างเดียว)

**กติกาใหม่ (ทำเหมือนกันทุกเครื่อง):**
- ห้ามเก็บโฟลเดอร์ repo (`.git`) ไว้ใต้ OneDrive อีกเด็ดขาด
- Clone ไว้ที่ `~/Documents/community-marketplace` แทน แล้วใช้ `git pull` / `git push` ซิงค์งานระหว่างเครื่อง — OneDrive ยังใช้เก็บไฟล์เอกสาร/รูป/สเปรดชีตทั่วไปได้ตามปกติ แค่ไม่ให้ `.git` ไปอยู่ในนั้น
- ก่อนเริ่มงานทุกครั้ง: `cd ~/Documents/community-marketplace && git pull --rebase origin dev/sarayut`
- ก่อน push ทุกครั้ง: `git pull --rebase origin dev/sarayut` ซ้ำอีกรอบ กันชนกับอีกเครื่อง แล้วค่อย `git push origin dev/sarayut`
- Repo เก่าที่เสีย (เผื่ออ้างอิง) สำรองไว้ที่ `community-marketplace-OLD-corrupted-20260914` ใน OneDrive บนเครื่อง `naradee-3-local` — ลบทิ้งได้เมื่อมั่นใจว่าไม่ต้องใช้แล้ว

### 3) Facebook Login พังบน production
กดปุ่ม "Login with Facebook" แล้วเจอ error ระดับ Facebook Platform ("แอปไม่ทำงาน") — **ไม่ใช่ error จากโค้ดเรา** น่าจะเป็นการตั้งค่าฝั่ง Meta App (เช่น app ยังอยู่โหมด Development / โดนระงับ / ต้องขอ permission เพิ่ม) ต้องเข้าไปเช็คที่ Meta for Developers Console โดยตรง — ยังไม่ได้แก้ในรอบนี้

---

## ⚠️ ขอความร่วมมือก่อนอื่น: กรุณา Pull ก่อน Push

เท่าที่ตรวจ git log พบว่ามีการ **force-push ทับ `main` มาแล้ว 10 ครั้ง** ในช่วงที่ผ่านมา (สาเหตุเดิมที่เข้าใจคือเครื่องที่ push ไม่เคย `git pull` จาก remote เลย แต่ตอนนี้รู้เพิ่มแล้วว่าอีกสาเหตุคือ OneDrive ทำ `.git` เสียหาย — ดูหัวข้ออัปเดตด้านบน) แต่ละครั้งเราต้องเสียเวลา diff เทียบเพื่อแยกว่าอะไรใหม่จริง อะไรซ้ำ/บั๊กเก่าที่เคยแก้ไปแล้ว แล้วค่อย merge กลับ

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
4. Facebook Login error ระดับ Meta Platform บน production (ดูหัวข้ออัปเดตล่าสุดด้านบน) — ต้องเช็คที่ Meta for Developers Console
5. ฟีเจอร์ Live streaming/ไลฟ์ขายของบนเว็บถูกปิดชั่วคราว (ดูหัวข้ออัปเดตล่าสุดด้านบน) — เปิดกลับเมื่อพร้อม

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

---

## 💻 ทำงานหลายเครื่อง — ที่เก็บ repo ที่ถูกต้อง

**ใช้ path เดียวกันทุกเครื่อง:** `~/Documents/community-marketplace` (ไม่ใช่ใต้ OneDrive)

```bash
# เครื่องใหม่ / ยังไม่เคย clone ที่นี่
cd ~/Documents
git clone https://github.com/Teenoi888/community-marketplace.git
cd community-marketplace
git checkout dev/sarayut

# ทุกครั้งก่อนเริ่มงาน
git pull --rebase origin dev/sarayut

# ทุกครั้งก่อน push
git pull --rebase origin dev/sarayut
git push origin dev/sarayut
```
