// Temporary SQLite configuration for development
const { db, query, initializeDatabase } = require('./database-sqlite');

// Initialize database on startup
initializeDatabase().catch(console.error);

module.exports = {
  pool: db,
  query
};