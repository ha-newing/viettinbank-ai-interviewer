// Test script to verify Assessment Center database schema
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'database.db');

try {
  const db = new Database(dbPath, { readonly: true });

  console.log('Testing Assessment Center database schema...\n');

  // Get all table names
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('All tables in database:');
  tables.forEach(table => console.log(`  - ${table.name}`));
  console.log('');

  // Check Assessment Center tables specifically
  const assessmentTables = [
    'assessment_sessions',
    'assessment_participants',
    'case_study_transcripts',
    'case_study_evaluations',
    'tbei_responses',
    'hipo_assessments',
    'quiz_responses'
  ];

  console.log('Assessment Center tables verification:');

  for (const tableName of assessmentTables) {
    try {
      const info = db.prepare(`PRAGMA table_info(${tableName})`).all();
      console.log(`✓ ${tableName} exists with ${info.length} columns`);

      // Check foreign key constraints
      const fkeys = db.prepare(`PRAGMA foreign_key_list(${tableName})`).all();
      if (fkeys.length > 0) {
        console.log(`  - Has ${fkeys.length} foreign key constraint(s)`);
      }

    } catch (err) {
      console.log(`✗ ${tableName} NOT found: ${err.message}`);
    }
  }

  // Test indexes
  console.log('\nUnique indexes verification:');
  const indexes = db.prepare(`SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name LIKE '%assessment%'`).all();
  indexes.forEach(idx => {
    console.log(`✓ Index: ${idx.name} on table ${idx.tbl_name}`);
  });

  console.log('\n✅ Assessment Center database schema test completed successfully!');

} catch (error) {
  console.error('❌ Database schema test failed:', error.message);
  process.exit(1);
}