/**
 * Production database migration script
 * Runs migrations automatically on application startup
 */

const { migrate } = require('drizzle-orm/better-sqlite3/migrator')
const Database = require('better-sqlite3')
const { drizzle } = require('drizzle-orm/better-sqlite3')
const path = require('path')
const fs = require('fs')

async function runMigrations() {
  try {
    const dbPath = process.env.DATABASE_URL || '/data/app.db'

    // Ensure the directory exists
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    console.log('🔄 Connecting to database:', dbPath)

    const sqlite = new Database(dbPath)
    const db = drizzle(sqlite)

    console.log('🔄 Running database migrations...')

    // Run migrations from the migrations folder
    await migrate(db, {
      migrationsFolder: path.join(__dirname, 'migrations')
    })

    console.log('✅ Database migrations completed successfully')

    sqlite.close()
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations()
}

module.exports = { runMigrations }