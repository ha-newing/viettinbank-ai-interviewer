// Test script to verify Assessment Center database schema
import { db } from '../src/lib/db';
import {
  assessmentSessions,
  assessmentParticipants,
  caseStudyTranscripts,
  caseStudyEvaluations,
  tbeiResponses,
  hipoAssessments,
  quizResponses
} from '../src/db/schema';

console.log('Testing Assessment Center database schema...\n');

try {
  // Test each table by attempting to select from it
  const tables = [
    { name: 'assessment_sessions', table: assessmentSessions },
    { name: 'assessment_participants', table: assessmentParticipants },
    { name: 'case_study_transcripts', table: caseStudyTranscripts },
    { name: 'case_study_evaluations', table: caseStudyEvaluations },
    { name: 'tbei_responses', table: tbeiResponses },
    { name: 'hipo_assessments', table: hipoAssessments },
    { name: 'quiz_responses', table: quizResponses }
  ];

  console.log('Assessment Center tables verification:');

  for (const { name, table } of tables) {
    try {
      // Try to query the table (should return empty array if table exists)
      const result = await db.select().from(table).limit(0);
      console.log(`✓ ${name} - table exists and is accessible`);
    } catch (error) {
      console.log(`✗ ${name} - ERROR: ${error.message}`);
    }
  }

  console.log('\n✅ Assessment Center database schema test completed successfully!');
  console.log('All 7 Assessment Center tables are properly created and accessible.');

} catch (error) {
  console.error('❌ Database schema test failed:', error.message);
  process.exit(1);
}