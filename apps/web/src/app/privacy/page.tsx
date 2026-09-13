import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { MainNav } from "@/components/layout/MainNav"

export const metadata = {
  title: "นโยบายความเป็นส่วนตัว",
}

const UPDATED_AT = "20 กันยายน 2569"

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
        </Link>

        <div className="card space-y-8 text-gray-700 leading-relaxed">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">นโยบายความเป็นส่วนตัว</h1>
            <p className="text-sm text-gray-400">ปรับปรุงล่าสุด: {UPDATED_AT}</p>
          </div>

          <p>
            &quot;ตลาดชุมชน&quot; (&quot;เรา&quot;) ให้ความสำคัญกับความเป็นส่วนตัวของผู้ใช้งานทุกคน นโยบายนี้อธิบายว่าเราเก็บรวบรวม
            ใช้ และเปิดเผยข้อมูลส่วนบุคคลของท่านอย่างไรเมื่อใช้งานเว็บไซต์และแอปพลิเคชันมือถือของเรา
          </p>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. ข้อมูลที่เราเก็บรวบรวม</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>ข้อมูลบัญชี:</strong> ชื่อ-นามสกุล, เบอร์โทรศัพท์, อีเมล, รูปโปรไฟล์</li>
              <li>
                <strong>ข้อมูลจากผู้ให้บริการล็อกอินภายนอก:</strong> เมื่อท่านเข้าสู่ระบบด้วย LINE, Google หรือ Facebook
                เราจะได้รับชื่อ อีเมล และรูปโปรไฟล์จากผู้ให้บริการนั้น ตามสิทธิ์ที่ท่านอนุญาต
              </li>
              <li><strong>ที่อยู่จัดส่ง:</strong> ชื่อผู้รับ เบอร์โทร ที่อยู่ ตำบล/อำเภอ/จังหวัด รหัสไปรษณีย์</li>
              <li><strong>ข้อมูลการสั่งซื้อและชำระเงิน:</strong> รายการสินค้า ยอดชำระ สถานะออเดอร์ และหลักฐานการโอนเงิน (สลิป) ที่ท่านอัปโหลด</li>
              <li><strong>เนื้อหาที่ท่านสร้าง:</strong> รูปภาพสินค้า ข้อความแชทกับผู้ขาย/ผู้ซื้อ รีวิวและคะแนนสินค้า</li>
              <li><strong>ไลฟ์สด:</strong> หากท่านเป็นผู้ขายและเริ่มไลฟ์สด เราจะเข้าถึงกล้องและไมโครโฟนของอุปกรณ์ท่านเพื่อถ่ายทอดสด ระบบไม่บันทึกวิดีโอไลฟ์ไว้หลังจบการถ่ายทอด</li>
              <li><strong>ข้อมูลการใช้งาน:</strong> ประวัติการค้นหา สินค้าที่ถูกใจ (Wishlist) และการตั้งค่าที่บันทึกไว้ในอุปกรณ์ของท่าน</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. เราใช้ข้อมูลของท่านเพื่อ</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>สร้างและดูแลบัญชีผู้ใช้ ยืนยันตัวตนเมื่อเข้าสู่ระบบ</li>
              <li>ดำเนินการสั่งซื้อ จัดส่งสินค้า และติดต่อประสานงานระหว่างผู้ซื้อกับผู้ขาย</li>
              <li>ส่งการแจ้งเตือนเกี่ยวกับสถานะออเดอร์ ข้อความแชท และกิจกรรมที่เกี่ยวข้องกับบัญชีของท่าน</li>
              <li>ป้องกันการฉ้อโกงและดูแลความปลอดภัยของแพลตฟอร์ม</li>
              <li>ปรับปรุงคุณภาพและพัฒนาฟีเจอร์ของแพลตฟอร์ม</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. การเปิดเผยข้อมูลต่อบุคคลที่สาม</h2>
            <p className="mb-2">เราไม่ขายข้อมูลส่วนบุคคลของท่าน แต่อาจแบ่งปันข้อมูลเท่าที่จำเป็นกับ:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>ผู้ขาย/ผู้ซื้อที่ท่านทำธุรกรรมด้วย (เช่น ชื่อและที่อยู่จัดส่งสำหรับการส่งสินค้า)</li>
              <li>ผู้ให้บริการชำระเงิน (เช่น GB Prime Pay, Omise, 2C2P) เพื่อประมวลผลการชำระเงิน</li>
              <li>ผู้ให้บริการล็อกอิน (LINE, Google, Facebook) เมื่อท่านเลือกเข้าสู่ระบบผ่านช่องทางนั้น</li>
              <li>ผู้ให้บริการโครงสร้างพื้นฐานทางเทคนิค เช่น ผู้ให้บริการเซิร์ฟเวอร์และพื้นที่จัดเก็บไฟล์</li>
              <li>หน่วยงานราชการ เมื่อกฎหมายกำหนดให้ต้องเปิดเผย</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. การเก็บรักษาข้อมูล</h2>
            <p>
              เราเก็บรักษาข้อมูลส่วนบุคคลของท่านตราบเท่าที่บัญชีของท่านยังใช้งานอยู่ หรือเท่าที่จำเป็นเพื่อให้บริการแก่ท่าน
              ปฏิบัติตามภาระผูกพันทางกฎหมาย ระงับข้อพิพาท และบังคับใช้ข้อตกลงของเรา
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. สิทธิของท่าน</h2>
            <p className="mb-2">ท่านมีสิทธิ:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>เข้าถึงและขอสำเนาข้อมูลส่วนบุคคลของท่าน</li>
              <li>แก้ไขข้อมูลที่ไม่ถูกต้องผ่านหน้าโปรไฟล์ของท่าน</li>
              <li>ขอให้ลบบัญชีและข้อมูลส่วนบุคคลของท่าน</li>
              <li>ถอนความยินยอมในการเชื่อมต่อบัญชี LINE/Google/Facebook ได้ทุกเมื่อ</li>
            </ul>
            <p className="mt-2">
              หากต้องการใช้สิทธิดังกล่าว กรุณาติดต่อเราตามช่องทางด้านล่าง
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. คุกกี้และการจัดเก็บข้อมูลในอุปกรณ์</h2>
            <p>
              เราใช้ local storage/secure storage บนอุปกรณ์ของท่านเพื่อจดจำสถานะการเข้าสู่ระบบและตะกร้าสินค้า
              เพื่อให้ใช้งานได้ต่อเนื่องแม้ปิดแอปหรือรีเฟรชหน้าเว็บ
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">7. ความปลอดภัยของข้อมูล</h2>
            <p>
              เรามีมาตรการทางเทคนิคและการบริหารจัดการที่เหมาะสมเพื่อปกป้องข้อมูลส่วนบุคคลของท่านจากการเข้าถึง
              การใช้ หรือการเปิดเผยโดยไม่ได้รับอนุญาต อย่างไรก็ตาม ไม่มีระบบใดปลอดภัย 100%
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">8. การเปลี่ยนแปลงนโยบาย</h2>
            <p>
              เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว การเปลี่ยนแปลงจะมีผลทันทีเมื่อเผยแพร่บนหน้านี้
              พร้อมระบุวันที่ปรับปรุงล่าสุดด้านบน
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">9. ติดต่อเรา</h2>
            <p>
              หากมีข้อสงสัยเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ หรือต้องการใช้สิทธิเกี่ยวกับข้อมูลส่วนบุคคลของท่าน
              สามารถติดต่อเราได้ที่อีเมล{" "}
              <a href="mailto:privacy@chumchon.market" className="text-primary-600 underline">
                privacy@chumchon.market
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
