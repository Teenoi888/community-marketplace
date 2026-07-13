# PROJECT_CONTEXT.md — ตลาดชุมชน (Community Marketplace)

สถานะล่าสุด ณ 2026-07-13 — เก็บไว้ให้ session/คนอื่นที่มาต่องานเข้าใจบริบทเร็วๆ โดยไม่ต้องไล่อ่าน git log ทั้งหมด

## Production

| ส่วน | URL | Host |
|---|---|---|
| Web (frontend) | https://www.chumchon.market | Railway service `@cm/web`, project `reasonable-respect` |
| API (backend) | https://cmapi-production-5f4f.up.railway.app | Railway service `@cm/api`, project `reasonable-respect` |
| Database | PostgreSQL | Railway (ผ่าน `DATABASE_URL`) |

Repo: `github.com/Teenoi888/community-marketplace` (เจ้าของ repo คือ Teenoi888 ซึ่งเป็นอีก dev ที่ทำงานร่วมกัน — ดูหัวข้อ "เหตุการณ์ force-push" ด้านล่าง)

Commit ล่าสุดที่ deploy สำเร็จบน production: `304243d`

## Auth ที่ใช้งานได้แล้ว

- **เบอร์โทร + รหัสผ่าน** (login หลัก)
- **อีเมล + OTP** (login ทางเลือก, ไม่ต้องตั้งรหัสผ่าน)
- **Google OAuth** — Client ID `895007963910-l5fmj940sd8uvidvl3jm6to29qg5ko7u.apps.googleusercontent.com` (Client เก่า `366403456955-...` ใช้งานไม่ได้แล้ว/หาไม่เจอในทุกโปรเจกต์ Google Cloud ที่มี ต้องสร้างใหม่และย้ายมาใช้ตัวนี้แทน — อย่าเผลอไปแก้ Client ตัวเก่าอีก)
- **Facebook OAuth** — App "ตลาดชุมชน" ต้องเปิด permission `email` ใน "กรณีการใช้งาน → เข้าสู่ระบบ Facebook → ปรับแต่ง" ด้วย ไม่ใช่แค่ตั้ง redirect URI
- **LINE Login OAuth** — ใช้งานได้ปกติ

ลืมรหัสผ่านมี **2 flow แยกกัน** โดยตั้งใจ (ไม่ใช่ของซ้ำ):
- อีเมล+OTP: `/forgot-password` (สำหรับ user ที่มีอีเมลผูกบัญชี)
- เบอร์โทร+OTP: `/forgot-password-phone` → `/reset-password` (สำหรับ user ที่ login ด้วยเบอร์+รหัสผ่านเป็นหลักและไม่มีอีเมลในระบบ — เชื่อมจากลิงก์ "ลืมรหัสผ่าน?" หน้า login)

## ฟีเจอร์หลักที่มีแล้ว

- สินค้า/ร้านค้า/ชุมชน (multi-tenant: 1 user เปิดได้หลายร้าน)
- ตะกร้า + checkout พร้อมที่อยู่จัดส่งที่บันทึกไว้ได้ (label, default address, cascading province/district/zipCode)
- ออเดอร์: จองสต็อกทันทีตอนสร้างออเดอร์ (กันขายเกิน stock) — **อย่าเพิ่ม logic ตัดสต็อกซ้ำใน payments/index.ts อีก** เคยมีบั๊กตัดซ้ำสองรอบมาแล้ว
- หน้าจัดการออเดอร์ฝั่งร้านค้า (`/seller/orders`) — เปลี่ยนสถานะ + บันทึกเลข tracking ได้
- แชทระหว่างผู้ซื้อ-ผู้ขาย (มี websocket infra อยู่แล้วผ่าน `@fastify/websocket`)
- Admin panel (`/admin`) — จัดการหมวดหมู่, ผู้ใช้ (ค้นหา/reset password/ตั้ง admin), สถิติรวม
- Categories เป็น dynamic จาก DB (ไม่ hardcode แล้ว) มี seed 8 หมวดเริ่มต้น
- `POST /api/admin/seed` — endpoint ใส่ข้อมูลตัวอย่าง (3 ชุมชน/3 ร้าน/11 สินค้า) ครั้งเดียว กัน secret + กันใส่ซ้ำ
- Auto-logout เมื่อไม่มีกิจกรรม 30 นาที (เตือนก่อน 2 นาที)
- บังคับ login ก่อนกดเพิ่มสินค้าลงตะกร้า (toast พร้อมปุ่มไปหน้า login)

## ช่องว่างที่รู้อยู่แล้ว (ยังไม่ได้ทำ)

1. **ไม่มี unread badge บนไอคอนกระดิ่งใน MainNav** — หน้า `/notifications` มีอยู่แต่เป็นแค่ derive จาก `/orders` สดทุกครั้งที่เปิดหน้า ไม่มี read/unread state จริง
2. **ไม่มีการแจ้งเตือนแบบ real-time** — มี websocket infra จากฟีเจอร์แชทอยู่แล้ว แต่ยังไม่เอามาใช้กับการเปลี่ยนสถานะออเดอร์
3. **ไม่มีอีเมล/LINE แจ้งเตือนเมื่อสถานะออเดอร์เปลี่ยน** — ผู้ซื้อต้องเข้าแอปมาเช็คเองเท่านั้น
4. Payment gateway (GB Prime Pay / EasySlip) ตามที่ระบุใน README ยังเป็น manual/บางส่วนเท่านั้น — ยังไม่ได้ verify integration เต็มรูปแบบ
5. Mobile app (`@cm/mobile`, Expo) — build ล้มเหลวมา 2 สัปดาห์แล้ว (ดูใน Railway canvas) ยังไม่ได้ตามแก้

## เหตุการณ์ force-push (สำคัญมาก — ต้องรู้ก่อนแตะ git history)

Dev อีกคน (Teenoi888) เคย force-push ทับ `main` มาแล้ว **10 ครั้ง** ในช่วงสั้นๆ เพราะเครื่องเขาไม่เคย pull จาก remote เลยตั้งแต่เริ่มงาน (frozen ที่ commit เก่ามาก) ทุกครั้งที่ push จึงต้อง force ทับประวัติทั้งหมด

วิธีจัดการที่ใช้ตลอด: `git fetch origin` เช็คก่อนทำอะไรทุกครั้ง → ถ้ามี force-push ใหม่ diff กับ commit ก่อนหน้าของเขาเพื่อแยกว่าอะไร "ใหม่จริง" กับอะไร "ซ้ำ/บั๊กเก่า/ขัดกับสิ่งที่ตัดสินใจไปแล้ว" → extract เฉพาะของใหม่ที่ผ่านการ verify มารวมกับ main ของเรา → push กลับด้วย `--force-with-lease`

**ของที่ข้ามไปโดยตั้งใจ** (อยู่ใน git history ของเขาเผื่อย้อนกลับมาดู แต่ไม่ได้ merge):
- OAuth เวอร์ชันคู่ขนานที่เขาเขียนเอง (route `/api/auth/google` ฯลฯ, column `google_uid`/`facebook_uid`) — ซ้ำกับของที่เรามีอยู่แล้วและ deploy ใช้งานจริง
- บั๊กตัดสต็อกซ้ำสองรอบใน payments/index.ts
- Logo ลอยทับ banner แบบ `-mt-14` ในหน้าชุมชน/my-community — ขัดกับที่ตัดสินใจแก้ไปแล้วก่อนหน้า
- Migration runner แบบรันไฟล์ .sql ทุกไฟล์ซ้ำทุก boot — เก็บของเดิม (drizzle journal-tracked) ไว้เพราะปลอดภัยกว่า

**แนะนำ Teenoi888 แล้ว**: ใช้ `git pull --rebase origin main` ก่อน push ทุกครั้ง แทน force push — ยังไม่ยืนยันว่าเขาทำตามหรือยัง ต้องเฝ้าดูต่อว่ามี force-push ครั้งที่ 11 อีกไหม

## Known config gotchas

- Railway มักจะ**ข้าม deploy** (`SKIPPED — No changes to watched files`) เมื่อ commit มาจากการ force-push ที่ทับประวัติ ต้องเข้าไป trigger deploy ด้วยมือจาก commit ล่าสุดจริงๆ บางครั้ง — อย่าเชื่อ auto-deploy เฉยๆ ให้ verify ผ่าน curl เช็ค endpoint จริงเสมอ
- CORS origin ฝัง `chumchon.market` และ `www.chumchon.market` ไว้ตรงในโค้ด (`apps/api/src/index.ts`) แล้ว ไม่ได้พึ่ง `NEXT_PUBLIC_APP_URL` env var อย่างเดียว
