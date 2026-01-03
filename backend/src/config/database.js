const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'quran_competition',
  user: process.env.PG_USER || 'admin',
  password: process.env.PG_PASSWORD || 'admin123',
  // Vous pouvez aussi utiliser la DATABASE_URL directement :
  // connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test de connexion
pool.on('connect', () => {
  console.log('✅ Connecté à PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erreur de connexion PostgreSQL:', err.message);
});

// Fonction pour exécuter des requêtes
const query = (text, params) => pool.query(text, params);

module.exports = {
  query,
  pool
};