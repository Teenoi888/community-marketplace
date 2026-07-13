# CLAUDE.md

## Branch policy (ห้าม push ตรงเข้า `main`)

แต่ละคนทำงานใน branch ของตัวเอง แล้วค่อย merge เข้า `main` ทีหลัง เพื่อไม่ให้ push ทับกันอีก:

- **Jirapinyaeiei** → ทำงานใน branch `dev/jirapinyaeiei`
- **Teenoi888** → ทำงานใน branch `dev/teenoi888` (สร้าง branch นี้จาก `main` ก่อนเริ่มงานครั้งต่อไป ถ้ายังไม่มี)

ขั้นตอนทำงานปกติ:
1. ทำงานและ commit ใน branch ของตัวเองเท่านั้น — **ห้าม commit/push ตรงเข้า `main`**
2. ก่อน push เข้า branch ตัวเอง ให้ `git fetch origin` แล้ว merge หรือ rebase จาก `origin/main` เข้ามาก่อน เพื่อให้ branch ตัวเองอัปเดตล่าสุดเสมอ (กัน conflict บานตอน merge เข้า main ทีหลัง)
3. เมื่องานพร้อม ให้เปิด Pull Request จาก branch ของตัวเองเข้า `main` แล้วให้อีกฝั่ง review ก่อน merge จริง — ไม่ merge เอง

## Git push workflow (ต้องทำตามทุกครั้ง — ห้ามข้าม)

ทุกครั้งที่จะ push โค้ดขึ้น GitHub ของ repo นี้ ให้ push เข้า **branch ของตัวเอง** (`dev/jirapinyaeiei` หรือ `dev/teenoi888`) เท่านั้น ตาม Branch policy ด้านบน:

1. รัน `git fetch origin` ก่อนเสมอ เพื่อเช็คว่ามีการเปลี่ยนแปลงใหม่บน remote ที่เครื่องนี้ยังไม่มี
2. รัน `git pull --rebase origin main` เข้า branch ตัวเอง เพื่อดึงงานล่าสุดจาก `main` มารวมกับงานที่ทำอยู่ ถ้ามี conflict ให้แก้ conflict ให้เรียบร้อยก่อน (อย่าเลือกทับฝั่งใดฝั่งหนึ่งแบบไม่ดูเนื้อหา ให้เทียบดูว่าอะไรใหม่จริง อะไรซ้ำ)
3. push แบบปกติด้วย `git push origin <ชื่อ branch ตัวเอง>` เท่านั้น — **ห้าม push เข้า `main` ตรงๆ** ยกเว้นตอน merge ผ่าน Pull Request
4. **ห้ามใช้ `git push --force` หรือ `git push -f` โดยเด็ดขาด** เพราะจะทับประวัติ commit ของคนอื่นที่ push ไปก่อนหน้า ถ้าจำเป็นต้อง force จริงๆ (เช่นหลัง rebase) ให้ใช้ `git push --force-with-lease` แทน ซึ่งจะปฏิเสธการ push ถ้ามีคนอื่น push ใหม่เข้ามาที่เรายังไม่ได้ pull มา ป้องกันการทับงานคนอื่นโดยไม่รู้ตัว
5. ก่อน commit ให้ตรวจ `git status` และ `git log --oneline -5` ก่อนเสมอ เพื่อยืนยันว่าอยู่ใน branch ของตัวเองจริง (ไม่ใช่ `main`) ก่อนเริ่มแก้โค้ด

ถ้าขั้นตอนไหนเจอ error หรือ conflict ที่ไม่แน่ใจว่าควรแก้ยังไง ให้หยุดแล้วถามผู้ใช้ก่อน อย่าตัดสินใจเลือกทับเองเด็ดขาด
