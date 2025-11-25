import Database from 'better-sqlite3';

const db = new Database('./src/db/sqlite.db');

try {
  // Check if organizations table exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Available tables:', tables.map(t => t.name));

  // Query organizations
  const orgs = db.prepare('SELECT * FROM organizations').all();

  console.log('\n=== Organizations in database ===');
  console.log('Total organizations:', orgs.length);

  if (orgs.length > 0) {
    orgs.forEach((org, index) => {
      console.log(`${index + 1}. Domain: "${org.domain}" | Name: "${org.name}" | ID: ${org.id}`);
    });

    // Check specifically for newing.vn
    const newingOrg = orgs.find(org => org.domain.toLowerCase() === 'newing.vn');
    console.log('\n=== Checking for newing.vn ===');
    if (newingOrg) {
      console.log('✅ Found newing.vn organization:', newingOrg);
    } else {
      console.log('❌ No organization with domain "newing.vn" found');
      console.log('Available domains:', orgs.map(org => `"${org.domain}"`).join(', '));
    }
  } else {
    console.log('❌ No organizations found in database');
  }
} catch (error) {
  console.error('Error querying database:', error);
} finally {
  db.close();
}