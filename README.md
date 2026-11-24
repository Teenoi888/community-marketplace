# ตลาดชุมชน — Community Marketplace

Marketplace สำหรับชุมชนท้องถิ่นไทย — ขายได้ ไม่โดนหัก GP

## Environments

| Environment | Web | API | Git branch | Railway |
|---|---|---|---|---|
| **Production** | https://www.chumchon.market | https://cmapi-production-5f4f.up.railway.app | `main` | `reasonable-respect` → `production` |
| **UAT** (ทดสอบ) | https://cmweb-uat.up.railway.app | https://cmapi-uat.up.railway.app | `uat` | `reasonable-respect` → `uat` |

- Push เข้า branch ไหน Railway จะ deploy environment นั้นอัตโนมัติ
- UAT ใช้ฐานข้อมูล (Postgres/Redis) แยกจาก production — ข้อมูลในนั้นเป็นข้อมูลทดสอบทั้งหมด
- UAT มีผู้ใช้ปลอม: แอดมิน `0990000001`, ผู้ขาย `0990000011`–`0990000013`, ผู้ซื้อ `0990000021`–`0990000025`
  รหัสผ่านดูได้ที่ Railway → `uat` → `@cm/api` → Variables → `UAT_SEED_PASSWORD`
  (สร้างใหม่/เติมที่ขาดได้ด้วย `POST /api/admin/seed-uat` พร้อม `ADMIN_SECRET` — ใช้ไม่ได้บน production)
- UAT ตั้งค่าเริ่มต้นให้ **ไม่ส่งอีเมล/LINE ถึงคนจริง** — ดูอีเมล (รวมรหัส OTP) และเปลี่ยนโหมดได้ที่หน้าแอดมิน `/admin/notifications`
- ระบบชำระเงิน (Xendit) บน UAT ต้องใช้ key ทดสอบ (`xnd_development_…`) เท่านั้น

## Tech Stack
- **Web**: Next.js 14, Tailwind CSS, shadcn/ui
- **API**: Node.js + Fastify, Drizzle ORM, PostgreSQL (Supabase)
- **Mobile**: React Native (Expo), NativeWind
- **Infra**: Turborepo + pnpm monorepo

## Project Structure
```
apps/
  web/     → Next.js web app (port 3000)
  api/     → Fastify REST API (port 3001)
  mobile/  → Expo React Native (iOS + Android)
packages/
  types/   → Shared TypeScript types
  utils/   → Shared utilities
```

## Getting Started

### Prerequisites
- Node.js >= 20
- pnpm >= 9
- PostgreSQL (or Supabase account)
- Redis

### Setup

```bash
# Install dependencies
pnpm install

# Copy env file and fill in values
cp .env.example .env

# Run database migrations
pnpm --filter @cm/api run db:migrate

# Start all apps in dev mode
pnpm dev
```

### Individual apps
```bash
pnpm --filter @cm/web dev       # Web on :3000
pnpm --filter @cm/api dev       # API on :3001
pnpm --filter @cm/mobile dev    # Expo mobile
```

## Payment Integration
- **GB Prime Pay** — PromptPay, QR Code, Credit Card
- **EasySlip API** — Bank transfer slip verification

## Line Integration (Phase 2)
- Line Login OAuth
- Line Bot (order notifications)
- LIFF (Line In-App Frontend)

## Mobile Build (EAS)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for both platforms
pnpm --filter @cm/mobile build:android
pnpm --filter @cm/mobile build:ios
```
