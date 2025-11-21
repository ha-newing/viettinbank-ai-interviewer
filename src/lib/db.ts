import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '@/db/schema'

const sqlite = new Database('./src/db/sqlite.db')
export const db = drizzle(sqlite, { schema })

// Auto-migrate on startup (production)
if (process.env.NODE_ENV === 'production') {
  migrate(db, { migrationsFolder: './src/db/migrations' })
}

export { schema }