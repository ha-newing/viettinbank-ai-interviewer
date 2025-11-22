/**
 * Integration test setup file
 * This file sets up a separate test database for integration tests
 */

import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '@/db/schema'
import path from 'path'
import fs from 'fs'

// Create test database
const testDbPath = path.join(process.cwd(), 'src/test/test.db')

let testDb: ReturnType<typeof drizzle>

beforeAll(async () => {
  // Remove existing test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath)
  }

  // Create new test database
  const sqlite = new Database(testDbPath)
  testDb = drizzle(sqlite, { schema })

  // Run migrations
  migrate(testDb, { migrationsFolder: 'src/db/migrations' })
})

afterAll(async () => {
  // Clean up test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath)
  }
})

// Clean all tables before each test
beforeEach(async () => {
  await testDb.delete(schema.candidateStatuses)
  await testDb.delete(schema.interviewResponses)
  await testDb.delete(schema.interviews)
  await testDb.delete(schema.interviewQuestions)
  await testDb.delete(schema.jobTemplates)
  await testDb.delete(schema.userSessions)
  await testDb.delete(schema.emailVerifications)
  await testDb.delete(schema.users)
  await testDb.delete(schema.organizations)
})

// Export test database for use in tests
export { testDb }