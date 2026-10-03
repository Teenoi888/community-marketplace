import Link from "next/link"
import { COMPANY } from "@/lib/company"

const POLICY_LINKS = [
  { href: "/about", label: "เกี่ยวกับเรา" },
  { href: "/how-to-buy", label: "วิธีสั่งซื้อและชำระเงิน" },
  { href: "/terms", label: "ข้อกำหนดและเงื่อนไข" },
  { href: "/refund-policy", label: "นโยบายการยกเลิก คืนสินค้าและคืนเงิน" },
  { href: "/shipping-policy", label: "นโยบายการจัดส่งสินค้า" },
  { href: "/privacy", label: "นโยบายความเป็นส่วนตัว" },
]

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid gap-8 md:grid-cols-3 text-sm text-gray-600">
        <div className="space-y-2">
          <p className="text-base font-bold text-gray-900">{COMPANY.platformName}</p>
          <p>ตลาดออนไลน์สำหรับสินค้าชุมชนไทย เชื่อมผู้ผลิตในท้องถิ่นกับผู้ซื้อทั่วประเทศ</p>
        </div>

        <div>
          <p className="font-semibold text-gray-900 mb-3">ข้อมูลและนโยบาย</p>
          <ul className="space-y-2">
            {POLICY_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-primary-600 hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <p className="font-semibold text-gray-900 mb-3">ติดต่อเรา</p>
          <p className="font-medium text-gray-700">{COMPANY.nameTh}</p>
          <p>
            <a href={`mailto:${COMPANY.supportEmail}`} className="hover:text-primary-600 hover:underline">
              {COMPANY.supportEmail}
            </a>
          </p>
          <p>{COMPANY.addressShortTh}</p>
        </div>
      </div>
      <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} {COMPANY.nameEn} สงวนลิขสิทธิ์
      </div>
    </footer>
  )
}
