// Temporary feature flags — flip back to `true` to re-enable.

// ปิดฟีเจอร์ไลฟ์สด/ไลฟ์ขายของบนเว็บชั่วคราว (ปิดเมื่อ 2026-09-13 ตามคำขอของทีม)
// ซ่อนทางเข้าทั้งหมด (nav, หน้าแรก) และกันไม่ให้เข้าหน้า /live โดยตรงผ่านลิงก์เก่า/บุ๊กมาร์ก
// ฝั่ง backend (apps/api/src/routes/live) ยังไม่ได้แตะ — เปิดกลับมาได้ทันทีโดยแก้ค่านี้เป็น true
export const LIVE_ENABLED = false
