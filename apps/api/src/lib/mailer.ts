import { Resend } from "resend"
import { desc, eq } from "drizzle-orm"
import { db } from "../db/index.js"
import { emailOutbox, systemSettings } from "../db/schema.js"

// ── Environment ──────────────────────────────────────────────────────────────
// APP_ENV wins; otherwise Railway's own environment name ("production", "uat"…).
// Anything that isn't "production" is treated as a test environment.
export function appEnv(): string {
  return (process.env.APP_ENV || process.env.RAILWAY_ENVIRONMENT_NAME || "production").toLowerCase()
}
export function isProduction() {
  return appEnv() === "production"
}

// ── Settings ─────────────────────────────────────────────────────────────────
// live     = send to the real recipient
// redirect = send, but only to the admin's test inbox (redirectTo)
// capture  = never send; only store in email_outbox for admins to read
export type EmailMode = "live" | "redirect" | "capture"

export interface NotificationSettings {
  emailMode: EmailMode
  redirectTo: string | null
  lineEnabled: boolean
}

const SETTINGS_KEY = "notifications"

export function defaultNotificationSettings(): NotificationSettings {
  return isProduction()
    ? { emailMode: "live", redirectTo: null, lineEnabled: true }
    : { emailMode: "capture", redirectTo: null, lineEnabled: false }
}

let cache: { value: NotificationSettings; at: number } | null = null
const CACHE_MS = 15_000

export async function getNotificationSettings(): Promise<NotificationSettings> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value
  const row = await db.query.systemSettings.findFirst({ where: eq(systemSettings.key, SETTINGS_KEY) })
  const value = { ...defaultNotificationSettings(), ...((row?.value as Partial<NotificationSettings>) ?? {}) }
  cache = { value, at: Date.now() }
  return value
}

export async function saveNotificationSettings(value: NotificationSettings, adminId: string) {
  await db.insert(systemSettings)
    .values({ key: SETTINGS_KEY, value, updatedBy: adminId, updatedAt: new Date() })
    .onConflictDoUpdate({ target: systemSettings.key, set: { value, updatedBy: adminId, updatedAt: new Date() } })
  cache = null
}

// ── Sending ──────────────────────────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder")

interface SendEmailInput {
  to: string
  subject: string
  html: string
}

async function logOutbox(entry: typeof emailOutbox.$inferInsert) {
  try {
    await db.insert(emailOutbox).values(entry)
  } catch (err) {
    console.error("Failed to write email_outbox", err)
  }
}

// Sends (or redirects / captures) one email according to the admin settings.
// Throws only when a real send fails, so callers keep their current error
// handling (e.g. OTP returns 502 if Resend is down).
export async function sendEmail({ to, subject, html }: SendEmailInput) {
  const settings = await getNotificationSettings()

  if (settings.emailMode === "capture" || (settings.emailMode === "redirect" && !settings.redirectTo)) {
    await logOutbox({ channel: "email", status: "captured", originalTo: to, subject, html })
    return { status: "captured" as const }
  }

  const redirected = settings.emailMode === "redirect"
  const deliveredTo = redirected ? settings.redirectTo! : to
  const finalSubject = redirected ? `[${appEnv().toUpperCase()} → ${to}] ${subject}` : subject

  if (!process.env.RESEND_API_KEY) {
    await logOutbox({ channel: "email", status: "failed", originalTo: to, deliveredTo, subject, html, error: "RESEND_API_KEY not set" })
    throw new Error("RESEND_API_KEY not set")
  }

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: deliveredTo,
    subject: finalSubject,
    html,
  })
  if (error) {
    await logOutbox({ channel: "email", status: "failed", originalTo: to, deliveredTo, subject, html, error: error.message })
    throw error
  }
  await logOutbox({ channel: "email", status: redirected ? "redirected" : "sent", originalTo: to, deliveredTo, subject, html })
  return { status: redirected ? ("redirected" as const) : ("sent" as const) }
}

// LINE push: sent only when the admin setting allows it; otherwise captured.
export async function sendLinePush(lineUid: string, message: { altText?: string } & Record<string, unknown>) {
  const settings = await getNotificationSettings()
  const subject = String(message.altText ?? "LINE message")

  if (!settings.lineEnabled || !process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    await logOutbox({ channel: "line", status: "captured", originalTo: lineUid, subject, html: JSON.stringify(message) })
    return { status: "captured" as const }
  }

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to: lineUid, messages: [message] }),
  })
  await logOutbox({
    channel: "line",
    status: res.ok ? "sent" : "failed",
    originalTo: lineUid,
    deliveredTo: lineUid,
    subject,
    error: res.ok ? null : `HTTP ${res.status}`,
  })
  return { status: res.ok ? ("sent" as const) : ("failed" as const) }
}

export async function listOutbox(limit: number) {
  return db.select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(limit)
}
