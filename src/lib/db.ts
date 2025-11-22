import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '@/db/schema'

const dbPath = process.env.DATABASE_URL || './src/db/sqlite.db'
const sqlite = new Database(dbPath)
export const db = drizzle(sqlite, { schema })

// Auto-migrate on startup (production runtime, not build time)
if (process.env.NODE_ENV === 'production' && !process.env.CI) {
  migrate(db, { migrationsFolder: './src/db/migrations' })
}

export { schema }