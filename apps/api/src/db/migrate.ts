import "dotenv/config"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const client = postgres(process.env.DATABASE_URL!, { max: 1 })
const db = drizzle(client)

console.log("⏳ Running migrations...")
await migrate(db, { migrationsFolder: path.join(__dirname, "migrations") })
console.log("✅ Migrations done")
await client.end()
