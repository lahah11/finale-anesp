const { query } = require('./config/database-sqlite');
const bcrypt = require('bcryptjs');

async function checkPasswords() {
  try {
    console.log('🔍 Vérification des mots de passe...\n');

    const result = await query(`
      SELECT id, username, email, password, role, is_active 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log('=== UTILISATEURS ===');
    for (const user of result.rows || []) {
      console.log(`\n👤 ${user.username} (${user.role})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Actif: ${user.is_active ? 'Oui' : 'Non'}`);
      console.log(`   Mot de passe hashé: ${user.password.substring(0, 20)}...`);
      
      // Tester différents mots de passe
      const passwords = ['admin123', 'password', '123456', 'admin', 'anesp123'];
      for (const pwd of passwords) {
        try {
          const isValid = await bcrypt.compare(pwd, user.password);
          if (isValid) {
            console.log(`   ✅ Mot de passe valide: "${pwd}"`);
            break;
          }
        } catch (e) {
          // Ignorer les erreurs de comparaison
        }
      }
    }
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    process.exit();
  }
}

checkPasswords();