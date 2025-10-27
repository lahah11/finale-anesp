const { query } = require('./config/database-sqlite');

async function checkSuperAdmin() {
  try {
    const result = await query(`
      SELECT id, username, email, role, institution_id, is_active, created_at 
      FROM users 
      WHERE username = 'super.admin'
    `);
    
    console.log('=== SUPER ADMIN ===');
    console.log(JSON.stringify(result.rows || [], null, 2));
    
    if (result.rows && result.rows.length > 0) {
      console.log('\n✅ Super admin trouvé');
    } else {
      console.log('\n❌ Super admin non trouvé');
    }
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    process.exit();
  }
}

checkSuperAdmin();
