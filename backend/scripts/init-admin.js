const bcrypt = require('bcryptjs');
const { query } = require('../src/config/database');

async function createAdmin() {
  try {
    const email = 'admin@competition.com';
    const password = 'admin123';
    const name = 'Administrateur Principal';
    
    // Vérifier si l'admin existe déjà
    const existing = await query('SELECT id FROM admins WHERE email = $1', [email]);
    
    if (existing.rows.length > 0) {
      console.log('⚠️  Administrateur existe déjà');
      return;
    }
    
    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Insérer l'admin
    await query(
      'INSERT INTO admins (email, password_hash, name) VALUES ($1, $2, $3)',
      [email, passwordHash, name]
    );
    
    console.log('✅ Administrateur créé avec succès');
    console.log('📧 Email:', email);
    console.log('🔑 Mot de passe:', password);
    
  } catch (error) {
    console.error('❌ Erreur création admin:', error);
  }
}

createAdmin();