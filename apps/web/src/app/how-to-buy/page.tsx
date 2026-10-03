import Link from "next/link"
import { LegalPage, LegalSection, Bullets } from "@/components/legal/LegalPage"
import { COMPANY } from "@/lib/company"

export const metadata = { title: "วิธีสั่งซื้อและชำระเงิน" }

const STEPS = [
  { t: "เลือกสินค้า", d: "ค้นหาหรือเลือกดูสินค้าจากหน้าแรก หมวดหมู่ หรือหน้าร้านค้าชุมชน หน้าสินค้าแสดงราคา จำนวนคงเหลือ และข้อมูลร้านค้า" },
  { t: "เข้าสู่ระบบและใส่ตะกร้า", d: "เข้าสู่ระบบด้วยเบอร์โทรศัพท์ อีเมล LINE, Google หรือ Facebook แล้วกด \"เพิ่มลงตะกร้า\" ปรับจำนวนสินค้าได้ที่หน้าตะกร้า" },
  { t: "ระบุที่อยู่จัดส่งและยืนยันคำสั่งซื้อ", d: "ที่หน้าสั่งซื้อ เลือกหรือเพิ่มที่อยู่จัดส่ง ใส่คูปองส่วนลด (ถ้ามี) ตรวจสอบยอดรวม แล้วกดยืนยันคำสั่งซื้อ ระบบจะจองสต็อกสินค้าให้ทันที" },
  { t: "ชำระเงิน", d: "เลือกช่องทางชำระเงิน ได้แก่ PromptPay QR หรือบัตรเครดิต/เดบิต ผ่านระบบชำระเงินออนไลน์ที่ปลอดภัยของผู้ให้บริการชำระเงิน (Payment Gateway) ระบบยืนยันการชำระเงินอัตโนมัติ" },
  { t: "รับการยืนยัน", d: "เมื่อชำระสำเร็จ สถานะคำสั่งซื้อจะเปลี่ยนเป็น \"ชำระเงินแล้ว\" และผู้ซื้อจะได้รับการแจ้งเตือนในระบบ ร้านค้าจะได้รับแจ้งให้เตรียมสินค้า" },
  { t: "ร้านค้าจัดส่งและติดตามพัสดุ", d: "ร้านค้าจัดส่งสินค้าและบันทึกเลขพัสดุ ผู้ซื้อติดตามสถานะได้ที่เมนู \"คำสั่งซื้อของฉัน\" ตามนโยบายการจัดส่งสินค้า" },
  { t: "รับสินค้าและรีวิว", d: "เมื่อได้รับสินค้า ผู้ซื้อตรวจสอบสินค้าและให้คะแนนรีวิวร้านค้าได้ หากพบปัญหาสามารถแจ้งขอคืนสินค้า/คืนเงินได้ตามนโยบาย" },
]

export default function HowToBuyPage() {
  return (
    <LegalPage title="วิธีสั่งซื้อและชำระเงิน" updatedAt="3 ตุลาคม 2569">
      <ol className="space-y-4">
        {STEPS.map((s, i) => (
          <li key={s.t} className="flex gap-4">
            <span className="flex-none w-8 h-8 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center">{i + 1}</span>
            <div>
              <p className="font-semibold text-gray-900">{s.t}</p>
              <p className="text-sm">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>

      <LegalSection title="ช่องทางการชำระเงินที่รองรับ">
        <Bullets
          items={[
            "PromptPay QR — สแกนจ่ายผ่านแอปธนาคารได้ทุกธนาคาร ยืนยันยอดอัตโนมัติ",
            "บัตรเครดิต/เดบิต (Visa, Mastercard, JCB) — ผ่านการยืนยันตัวตน 3-D Secure",
            "ราคาสินค้าทั้งหมดเป็นสกุลเงินบาท (THB)",
            "ผู้รับชำระเงิน: " + COMPANY.nameTh + " ในฐานะผู้ให้บริการแพลตฟอร์ม",
          ]}
        />
        <p className="text-sm text-gray-500">
          แพลตฟอร์มไม่จัดเก็บข้อมูลบัตรของท่าน ข้อมูลบัตรถูกส่งตรงไปยังผู้ให้บริการชำระเงินซึ่งได้รับมาตรฐาน PCI DSS
        </p>
      </LegalSection>

      <p className="text-sm">
        อ่านเพิ่มเติม: <Link href="/shipping-policy" className="text-primary-600 underline">นโยบายการจัดส่งสินค้า</Link> ·{" "}
        <Link href="/refund-policy" className="text-primary-600 underline">นโยบายการยกเลิก คืนสินค้าและคืนเงิน</Link> ·{" "}
        <Link href="/terms" className="text-primary-600 underline">ข้อกำหนดและเงื่อนไข</Link>
      </p>
    </LegalPage>
  )
}
