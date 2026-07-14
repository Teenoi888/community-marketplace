import { db } from "../db/index.js"
import { adminActivityLogs } from "../db/schema.js"

interface LogAdminActivityInput {
  adminId: string
  action: string
  targetType: string
  targetId?: string
  details?: Record<string, unknown>
}

// Best-effort audit log — a logging failure should never break the admin
// action it's recording, so callers don't need to wrap this in try/catch.
export async function logAdminActivity({ adminId, action, targetType, targetId, details }: LogAdminActivityInput) {
  try {
    await db.insert(adminActivityLogs).values({
      adminId,
      action,
      targetType,
      targetId,
      details,
    })
  } catch (err) {
    console.error("Failed to write admin activity log", err)
  }
}
