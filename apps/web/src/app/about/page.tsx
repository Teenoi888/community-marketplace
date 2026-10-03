import Link from "next/link"
import { LegalPage, LegalSection, Bullets } from "@/components/legal/LegalPage"
import { COMPANY } from "@/lib/company"

export const metadata = { title: "เกี่ยวกับเรา" }

export default function AboutPage() {
  return (
    <LegalPage title="เกี่ยวกับตลาดชุมชน">
      <p>
        &quot;{COMPANY.platformName}&quot; ({COMPANY.platformDomain}) คือตลาดออนไลน์ (e-Marketplace) สำหรับสินค้าชุมชนไทย
        เช่น สินค้า OTOP สินค้าเกษตรแปรรูป ผ้าทอ และงานหัตถกรรม เปิดโอกาสให้วิสาหกิจชุมชนและผู้ผลิตในท้องถิ่นเปิดร้านค้าออนไลน์ได้ฟรี
        และขายสินค้าตรงถึงผู้ซื้อทั่วประเทศ
      </p>

      <LegalSection title="ผู้ให้บริการแพลตฟอร์ม">
        <p>แพลตฟอร์มตลาดชุมชนพัฒนาและให้บริการโดย</p>
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-1 text-sm">
          <p className="font-semibold text-gray-900">{COMPANY.nameTh}</p>
          <p>{COMPANY.nameEn}</p>
          <p>เลขทะเบียนนิติบุคคล / เลขประจำตัวผู้เสียภาษี: {COMPANY.registrationNo}</p>
          <p>ที่อยู่: {COMPANY.addressTh}</p>
          <p>อีเมล: <a href={`mailto:${COMPANY.supportEmail}`} className="text-primary-600 underline">{COMPANY.supportEmail}</a></p>
          <p>เว็บไซต์บริษัท: <a href={COMPANY.website} className="text-primary-600 underline" target="_blank" rel="noreferrer">{COMPANY.website}</a></p>
        </div>
      </LegalSection>

      <LegalSection title="รูปแบบการให้บริการ">
        <Bullets
          items={[
            "ผู้ขาย (ร้านค้าชุมชน) สมัครและเปิดร้านบนแพลตฟอร์ม ลงรายการสินค้าพร้อมราคาและจำนวนคงเหลือ",
            "ผู้ซื้อเลือกสินค้า ใส่ตะกร้า ระบุที่อยู่จัดส่ง และชำระเงินผ่านระบบชำระเงินออนไลน์ของแพลตฟอร์ม",
            "บริษัทรับชำระเงินแทนร้านค้า และโอนรายได้ให้ร้านค้าหลังจากคำสั่งซื้อดำเนินการสำเร็จ",
            "ร้านค้าเป็นผู้จัดเตรียมและจัดส่งสินค้า พร้อมแจ้งเลขพัสดุในระบบให้ผู้ซื้อติดตามได้",
            "ทีมงานแพลตฟอร์มดูแลการแก้ไขปัญหา การยกเลิก และการคืนเงิน ตามนโยบายที่ประกาศไว้",
          ]}
        />
      </LegalSection>

      <LegalSection title="นโยบายที่เกี่ยวข้อง">
        <Bullets
          items={[
            <Link key="h" href="/how-to-buy" className="text-primary-600 underline">วิธีสั่งซื้อและชำระเงิน</Link>,
            <Link key="t" href="/terms" className="text-primary-600 underline">ข้อกำหนดและเงื่อนไขการใช้บริการ</Link>,
            <Link key="r" href="/refund-policy" className="text-primary-600 underline">นโยบายการยกเลิก คืนสินค้าและคืนเงิน</Link>,
            <Link key="s" href="/shipping-policy" className="text-primary-600 underline">นโยบายการจัดส่งสินค้า</Link>,
            <Link key="p" href="/privacy" className="text-primary-600 underline">นโยบายความเป็นส่วนตัว</Link>,
          ]}
        />
      </LegalSection>
    </LegalPage>
  )
}
