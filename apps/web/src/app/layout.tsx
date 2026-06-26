import type { Metadata } from "next"
import { Noto_Sans_Thai } from "next/font/google"
import { Toaster } from "sonner"
import { Providers } from "@/components/layout/Providers"
import "./globals.css"

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-noto-sans-thai",
})

export const metadata: Metadata = {
  title: { default: "ตลาดชุมชน", template: "%s | ตลาดชุมชน" },
  description: "Marketplace สำหรับชุมชนไทย — ขายได้ ไม่โดนหัก GP",
  keywords: ["ตลาดชุมชน", "ซื้อขายออนไลน์", "สินค้าชุมชน", "OTOP", "วิสาหกิจชุมชน"],
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "ตลาดชุมชน",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={notoSansThai.variable}>
      <body className="font-sans bg-gray-50 text-gray-900 antialiased">
        <Providers>
          {children}
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  )
}
