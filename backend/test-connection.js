const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'quran_competition',
    user: 'admin',
    password: 'admin123'
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connexion réussie à PostgreSQL!');
    
    // Tester une requête simple
    const result = await client.query('SELECT version()');
    console.log('Version PostgreSQL:', result.rows[0].version);
    
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur de connexion:', err.message);
    console.log('\nVérifiez les points suivants:');
    console.log('1. PostgreSQL est-il démarré? (brew services start postgresql)');
    console.log('2. La base "quran_competition" existe-t-elle?');
    console.log('3. L\'utilisateur "admin" existe-t-il?');
    console.log('4. Le mot de passe est-il correct?');
    process.exit(1);
  }
}

testConnection();