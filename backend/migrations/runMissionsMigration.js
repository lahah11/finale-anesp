const { query } = require('../config/database');

async function runMissionsMigration() {
  try {
    console.log('🚀 Starting missions system migration...');
    
    // Lire le fichier de migration
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, '003_missions_system_sqlite.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Diviser les instructions SQL
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Exécuter chaque instruction
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
          await query(statement);
        } catch (error) {
          // Ignorer les erreurs de colonnes existantes
          if (error.message.includes('duplicate column name') || 
              error.message.includes('already exists')) {
            console.log(`⚠️  Skipping duplicate column/table: ${error.message}`);
            continue;
          }
          throw error;
        }
      }
    }
    
    console.log('✅ Missions system migration completed successfully!');
    console.log('🎉 Database is ready for the missions system!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Exécuter la migration si le script est appelé directement
if (require.main === module) {
  runMissionsMigration()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = runMissionsMigration;



