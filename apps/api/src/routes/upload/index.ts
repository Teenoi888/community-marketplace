import type { FastifyInstance } from "fastify"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { requireAuth } from "../../middleware/auth.js"
import { randomUUID } from "crypto"
import path from "path"

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME || "community-marketplace"
const CDN_URL = process.env.R2_CDN_URL || `https://pub-xxx.r2.dev`

export async function uploadRoutes(app: FastifyInstance) {

  // Upload file (multipart)
  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      return reply.code(503).send({ success: false, error: "ระบบอัปโหลดยังไม่ได้ตั้งค่า (R2 credentials missing)" })
    }

    const data = await request.file()
    if (!data) return reply.code(400).send({ success: false, error: "ไม่พบไฟล์" })

    const ext = path.extname(data.filename).toLowerCase()
    const allowed = [".jpg", ".jpeg", ".png", ".webp"]
    if (!allowed.includes(ext)) {
      return reply.code(400).send({ success: false, error: "รองรับเฉพาะ JPG, PNG, WEBP" })
    }

    const folder = (request.query as any).folder || "general"
    const key = `${folder}/${randomUUID()}${ext}`

    const buffer = await data.toBuffer()

    await r2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: data.mimetype,
      CacheControl: "public, max-age=31536000",
    }))

    const url = `${CDN_URL}/${key}`
    return { success: true, data: { url, key } }
  })

  // Get presigned URL for client-side upload (large files)
  app.post("/presign", { preHandler: [requireAuth] }, async (request) => {
    const { filename, contentType, folder = "general" } = request.body as any
    const ext = path.extname(filename).toLowerCase()
    const key = `${folder}/${randomUUID()}${ext}`

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    })

    const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 300 })
    const publicUrl = `${CDN_URL}/${key}`

    return { success: true, data: { presignedUrl, publicUrl, key } }
  })
}
