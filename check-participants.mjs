import Database from 'better-sqlite3';

const db = new Database('./src/db/sqlite.db');

try {
  // Query participants with interview tokens
  const participants = db.prepare(`
    SELECT
      p.id,
      p.name,
      p.email,
      p.interview_token as interviewToken,
      p.tbei_status as tbeiStatus,
      p.hipo_status as hipoStatus,
      p.quiz_status as quizStatus,
      s.name as sessionName
    FROM assessment_participants p
    LEFT JOIN assessment_sessions s ON p.session_id = s.id
    WHERE p.interview_token IS NOT NULL
  `).all();

  console.log('=== Participants with Interview Tokens ===');
  console.log('Total participants:', participants.length);

  participants.forEach((p, index) => {
    console.log(`\n${index + 1}. ${p.name} (${p.email})`);
    console.log(`   Interview Token: ${p.interviewToken}`);
    console.log(`   Session: ${p.sessionName}`);
    console.log(`   Status - TBEI: ${p.tbeiStatus}, HiPo: ${p.hipoStatus}, Quiz: ${p.quizStatus}`);
    console.log(`   URL: /interview/${p.interviewToken}`);
  });

  // Get session cookie info for comparison
  console.log('\n=== Session Info ===');
  console.log('Admin Session Cookie: vb-session = 35Uk-v5wAC5T1WyRS9kqBXsO2g81VBga');

  if (participants.length > 0) {
    const firstParticipant = participants[0];
    console.log(`\n=== API Testing Recommendations ===`);
    console.log(`For Admin APIs (dashboard, organization): Use session cookie`);
    console.log(`For Participant APIs (TBEI, assessments): Use participant data:`);
    console.log(`  - participantId: "${firstParticipant.id}"`);
    console.log(`  - interviewToken: "${firstParticipant.interviewToken}"`);
    console.log(`  - Test URL: https://viettinbank-ai-interviewer.fly.dev/interview/${firstParticipant.interviewToken}`);
  }
} catch (error) {
  console.error('Error querying database:', error);
} finally {
  db.close();
}