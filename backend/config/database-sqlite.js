const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Create database file path
const dbPath = path.join(__dirname, '..', 'database.sqlite');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log('✅ SQLite database connected successfully');
    db.exec('PRAGMA foreign_keys = ON;');
  }
});

async function runSqlStatements(statements) {
  for (const statement of statements) {
    const sql = statement.trim();
    if (!sql) continue;
    await new Promise((resolve, reject) => {
      db.run(sql, (err) => {
        if (err) {
          console.error('❌ Migration statement failed:', sql, err.message);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

async function runSqlFile(fileName) {
  const filePath = path.join(__dirname, '..', 'migrations', fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Migration file ${fileName} not found, skipping.`);
    return;
  }

  const sqlContent = fs.readFileSync(filePath, 'utf8');
  const statements = sqlContent
    .split(';')
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

  await runSqlStatements(statements);
}

// Insert initial data for default admin and institutions
async function seedDefaultData() {
  const statements = [
    "INSERT OR IGNORE INTO users (username, email, password, role) VALUES ('superadmin', 'admin@mission-system.mr', '$2a$12$6xv811oSps0njto9ypiC4OCif03dynbGy.bPqCHHicYoBtun/PTzS', 'super_admin')",
    "INSERT OR IGNORE INTO institutions (id, name, type, header_text, footer_text) VALUES ('32c5a15e4679067315c5d2bab813e6d4', 'Ministry of Digital Transformation', 'ministerial', 'RÉPUBLIQUE ISLAMIQUE DE MAURITANIE\\nHonneur - Fraternité - Justice', 'Avenue Moktar Ould Daddah ZRB 0441 Nouakchott - Mauritanie')",
    "INSERT OR IGNORE INTO institutions (id, name, type, header_text, footer_text) VALUES ('d65a41cfb8a549e6ab454f4ef57df14c', 'Agence Numérique de l''État', 'etablissement', 'RÉPUBLIQUE ISLAMIQUE DE MAURITANIE\\nHonneur - Fraternité - Justice', 'Avenue Moktar Ould Daddah ZRB 0441 Nouakchott - Mauritanie')"
  ];

  await runSqlStatements(statements);
}

// Initialize database
async function initializeDatabase() {
  try {
    const migrationFiles = [
      '001_initial_schema_sqlite.sql',
      '002_institution_roles_permissions_sqlite.sql',
      '003_missions_system_sqlite.sql',
      '004_unified_missions_table_sqlite.sql',
      '004_logistics_tables.sql',
      '005_missions_unified_enhancements_sqlite.sql'
    ];

    for (const file of migrationFiles) {
      await runSqlFile(file);
    }

    await seedDefaultData();

    console.log('🎉 Database initialization completed successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Query function compatible with PostgreSQL interface
function query(text, params = []) {
  return new Promise((resolve, reject) => {
    db.all(text, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve({ rows });
      }
    });
  });
}

module.exports = {
  db,
  query,
  initializeDatabase
};



