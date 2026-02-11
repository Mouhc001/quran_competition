const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // obligatoire pour Neon
});

// Test de connexion immédiat
pool.connect()
  .then(() => console.log('✅ Connecté à PostgreSQL (Neon)'))
  .catch(err => console.error('❌ Erreur de connexion PostgreSQL:', err.message));

// Fonction pour exécuter des requêtes
const query = (text, params) => pool.query(text, params);

module.exports = {
  query,
  pool
};
