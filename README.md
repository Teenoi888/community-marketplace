# ตลาดชุมชน — Community Marketplace

Marketplace สำหรับชุมชนท้องถิ่นไทย — ขายได้ ไม่โดนหัก GP

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
