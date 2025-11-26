#!/usr/bin/env tsx
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { caseStudyEvaluations } from '../src/db/schema'
import { like } from 'drizzle-orm'

// Initialize database
const sqlite = new Database('./src/db/sqlite.db')
const db = drizzle(sqlite)

async function cleanupMockEvaluations() {
  console.log('🧹 Cleaning up mock evaluations...')

  try {
    // Delete evaluations with mock rationale pattern
    const mockPatterns = [
      '%đã thể hiện năng lực%tốt thông qua các phát biểu và đóng góp trong thảo luận nhóm%',
      '%Phát biểu của%về%'
    ]

    let totalDeleted = 0

    for (const pattern of mockPatterns) {
      const deletedRows = await db
        .delete(caseStudyEvaluations)
        .where(like(caseStudyEvaluations.rationale, pattern))

      console.log(`🗑️ Deleted ${deletedRows.changes} evaluations matching pattern: ${pattern}`)
      totalDeleted += deletedRows.changes
    }

    // Also delete by evidence pattern
    const deletedByEvidence = await db
      .delete(caseStudyEvaluations)
      .where(like(caseStudyEvaluations.evidence, '%Phát biểu của%về%'))

    console.log(`🗑️ Deleted ${deletedByEvidence.changes} evaluations with mock evidence pattern`)
    totalDeleted += deletedByEvidence.changes

    console.log(`✅ Cleanup complete! Total deleted: ${totalDeleted} mock evaluations`)

    // Show remaining count
    const remaining = await db.select().from(caseStudyEvaluations)
    console.log(`📊 Remaining evaluations: ${remaining.length}`)

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    sqlite.close()
  }
}

cleanupMockEvaluations()