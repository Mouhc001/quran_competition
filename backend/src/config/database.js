import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test de connexion immédiat
pool.connect()
  .then(() => console.log('✅ Connecté à PostgreSQL (Neon)'))
  .catch(err => console.error('❌ Erreur de connexion PostgreSQL:', err.message));

// Fonction pour exécuter des requêtes
export const query = (text, params) => pool.query(text, params);
export default pool;