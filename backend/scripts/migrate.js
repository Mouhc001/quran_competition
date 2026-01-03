const { query } = require('../src/config/database');
require('dotenv').config();

async function runMigrations() {
  console.log('🚀 Début des migrations PostgreSQL...');
  console.log(`📁 Base: ${process.env.PG_DATABASE || 'quran_competition'}`);
  console.log(`👤 Utilisateur: ${process.env.PG_USER || 'postgres'}`);

  try {
    // Test de connexion
    console.log('🔌 Test de connexion...');
    const test = await query('SELECT version()');
    console.log('✅ Connecté à PostgreSQL:', test.rows[0].version.split('\n')[0]);

    // Étape 0: Activer l'extension UUID
    console.log('\n🔧 Activation extension UUID...');
    await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Étape 1: Supprimer les tables existantes dans le bon ordre (si besoin)
    console.log('\n🗑️  Nettoyage des tables existantes...');
    const dropOrder = [
      'scores', 'round_results', 'candidates', 'judges', 'admins', 'categories', 'rounds'
    ];
    
    for (const table of dropOrder) {
      try {
        await query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`  ✅ Table ${table} supprimée`);
      } catch (error) {
        console.log(`  ⚠️  Impossible de supprimer ${table}: ${error.message}`);
      }
    }

    // Étape 2: Créer les tables dans le BON ORDRE
    console.log('\n📋 Création des tables...');

    // 2.1 Table admins (sans dépendances)
    console.log('  👤 Création table admins...');
    await query(`
      CREATE TABLE admins (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // 2.2 Table categories (avant candidates) - Utiliser IF NOT EXISTS
    console.log('  📊 Création/Vérification table categories...');
    
    // D'abord vérifier si la table existe
    const categoriesExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'categories'
      )
    `);
    
    if (!categoriesExists.rows[0].exists) {
      await query(`
        CREATE TABLE categories (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          hizb_count INTEGER NOT NULL,
          description TEXT,
          min_age INTEGER,
          max_age INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('  ✅ Table categories créée');
    } else {
      console.log('  ⚠️  Table categories existe déjà, vérification des colonnes...');
      
      // Vérifier et ajouter les colonnes manquantes
      const columnsToCheck = [
        { name: 'hizb_count', type: 'INTEGER' },
        { name: 'min_age', type: 'INTEGER' },
        { name: 'max_age', type: 'INTEGER' }
      ];
      
      for (const col of columnsToCheck) {
        const colExists = await query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'categories' AND column_name = $1
        `, [col.name]);
        
        if (colExists.rows.length === 0) {
          await query(`ALTER TABLE categories ADD COLUMN ${col.name} ${col.type}`);
          console.log(`    ✅ Colonne ${col.name} ajoutée`);
        }
      }
    }

    // 2.3 Table rounds
    console.log('  🏆 Création table rounds...');
    await query(`
      CREATE TABLE rounds (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        order_index INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' 
          CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2.4 Table judges
    console.log('  ⚖️ Création table judges...');
    await query(`
      CREATE TABLE judges (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      )
    `);

    // 2.5 Table candidates (DOIT être après categories et rounds)
    console.log('  👥 Création table candidates...');
    await query(`
      CREATE TABLE candidates (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        registration_number VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        birth_date DATE,
        phone VARCHAR(20),
        email VARCHAR(255),
        category_id UUID REFERENCES categories(id),
        round_id UUID REFERENCES rounds(id),
        status VARCHAR(50) DEFAULT 'active' 
            CHECK (status IN ('active', 'eliminated', 'qualified', 'disqualified')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2.6 Table scores (DOIT être après candidates, judges, rounds)
    console.log('  📝 Création table scores...');
    await query(`
      CREATE TABLE scores (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
        judge_id UUID REFERENCES judges(id) ON DELETE CASCADE,
        round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
        question_number INTEGER NOT NULL CHECK (question_number BETWEEN 1 AND 5),
        recitation_score DECIMAL(3,2) DEFAULT 0 CHECK (recitation_score BETWEEN 0 AND 2),
        siffat_score DECIMAL(3,2) DEFAULT 0 CHECK (siffat_score BETWEEN 0 AND 1),
        makharij_score DECIMAL(3,2) DEFAULT 0 CHECK (makharij_score BETWEEN 0 AND 2),
        minor_error_score DECIMAL(3,2) DEFAULT 0 CHECK (minor_error_score BETWEEN 0 AND 1),
        comment TEXT,
        total_score DECIMAL(5,2) GENERATED ALWAYS AS (
          recitation_score + siffat_score + makharij_score + minor_error_score
        ) STORED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(candidate_id, judge_id, round_id, question_number)
      )
    `);

    // 2.7 Table round_results
    console.log('  🏅 Création table round_results...');
    await query(`
      CREATE TABLE round_results (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
        round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
        total_score DECIMAL(8,2) DEFAULT 0,
        average_score DECIMAL(8,2) DEFAULT 0,
        rank INTEGER,
        qualified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(candidate_id, round_id)
      )
    `);

    console.log('✅ Toutes les tables créées avec succès!');

    // Étape 3: Insertion des données par défaut
    console.log('\n📝 Insertion des données par défaut...');

    // 3.1 Catégories
        // 3.1 Catégories
    console.log('  📊 Insertion des catégories...');
    
    const categories = [
      ['1 Hizb', 1, 'Mémorisation d\'un Hizb'],
      ['2 Hizb', 2, 'Mémorisation de deux Hizb'],
      ['5 Hizb', 5, 'Mémorisation de cinq Hizb'],
      ['10 Hizb', 10, 'Mémorisation de dix Hizb'],
      ['20 Hizb', 20, 'Mémorisation de vingt Hizb'],
      ['30 Hizb', 30, 'Mémorisation de trente Hizb (1/2 Coran)'],
      ['40 Hizb', 40, 'Mémorisation de quarante Hizb'],
      ['60 Hizb', 60, 'Mémorisation complète du Coran']
    ];
    
    for (const [name, hizb_count, description] of categories) {
      // Vérifier d'abord si la catégorie existe
      const exists = await query(
        'SELECT id FROM categories WHERE name = $1',
        [name]
      );
      
      if (exists.rows.length === 0) {
        await query(
          'INSERT INTO categories (name, hizb_count, description) VALUES ($1, $2, $3)',
          [name, hizb_count, description]
        );
        console.log(`    ✅ Catégorie "${name}" ajoutée`);
      } else {
        console.log(`    ⚠️  Catégorie "${name}" existe déjà`);
      }
    }

        // 3.2 Tours
console.log('  🏆 Insertion des tours...');

const roundsData = [
  ['1/8 de finale', 'Premier tour éliminatoire', 1, true],   // is_active = true
  ['1/4 de finale', 'Second tour éliminatoire', 2, false],   // is_active = false
  ['Demi-finale', 'Tour des demi-finales', 3, false],        // is_active = false
  ['Finale', 'Tour final du concours', 4, false]             // is_active = false
];

for (const [name, description, order_index, is_active] of roundsData) {
  try {
    await query(
      'INSERT INTO rounds (name, description, order_index, is_active) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING',
      [name, description, order_index, is_active]  // Notez: is_active, pas status
    );
  } catch (error) {
    console.log(`Erreur pour le tour ${name}:`, error.message);
    // Vérification manuelle si ON CONFLICT échoue
    const exists = await query('SELECT id FROM rounds WHERE name = $1', [name]);
    if (exists.rows.length === 0) {
      await query(
        'INSERT INTO rounds (name, description, order_index, is_active) VALUES ($1, $2, $3, $4)',
        [name, description, order_index, is_active]
      );
    }
  }
}

console.log('    ✅ Tours insérés');

    // 3.3 Jurys
    console.log('  ⚖️ Insertion des jurys...');
    await query(`
      INSERT INTO judges (code, name, email) VALUES 
        ('JURY001', 'Jury 1', 'jury1@quran.com'),
        ('JURY002', 'Jury 2', 'jury2@quran.com'),
        ('JURY003', 'Jury 3', 'jury3@quran.com')
      ON CONFLICT (code) DO NOTHING
    `);

    console.log('✅ Données par défaut insérées!');

    // Étape 4: Création des index
    console.log('\n🔍 Création des index...');
    
    const indexes = [
      `CREATE INDEX idx_scores_candidate ON scores(candidate_id)`,
      `CREATE INDEX idx_scores_judge ON scores(judge_id)`,
      `CREATE INDEX idx_scores_round ON scores(round_id)`,
      `CREATE INDEX idx_candidates_round ON candidates(round_id)`,
      `CREATE INDEX idx_candidates_category ON candidates(category_id)`,
      `CREATE INDEX idx_candidates_status ON candidates(status)`,
      `CREATE INDEX idx_rounds_status ON rounds(status)`,
      `CREATE INDEX idx_judges_active ON judges(is_active)`,
      `CREATE INDEX idx_rounds_order ON rounds(order_index)`,
      `CREATE INDEX idx_candidates_registration ON candidates(registration_number)`
    ];

    for (const sql of indexes) {
      try {
        await query(sql);
        console.log(`  ✅ Index créé: ${sql.split(' ON ')[0].replace('CREATE INDEX ', '')}`);
      } catch (error) {
        console.log(`  ⚠️  Impossible de créer l'index: ${error.message}`);
      }
    }

    console.log('✅ Index créés!');

    // Étape 5: Vérification finale
    console.log('\n🎉 Migrations terminées avec succès!');
    
    console.log('\n📊 Résumé des données:');
    
    const tables = ['admins', 'categories', 'rounds', 'judges', 'candidates', 'scores', 'round_results'];
    for (const table of tables) {
      const count = await query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ${table}: ${count.rows[0].count} enregistrements`);
    }

    // Afficher les tours
    console.log('\n📋 Tours:');
    const roundsResult = await query(`SELECT id, name, order_index, status FROM rounds ORDER BY order_index`);
    console.table(roundsResult.rows);

    // Afficher les catégories
    console.log('\n📊 Catégories:');
    const categoriesResult = await query(`SELECT id, name, hizb_count, description FROM categories ORDER BY hizb_count`);
    console.table(categoriesResult.rows);

    // Afficher les jurys
    console.log('\n👥 Jurys:');
    const judgesResult = await query(`SELECT id, code, name, is_active FROM judges`);
    console.table(judgesResult.rows);
    
    console.log('\n✅ Base de données prête !');
    
  } catch (error) {
    console.error('\n❌ Erreur lors des migrations:', error.message);
    console.error('Détails:', error);
    process.exit(1);
  }
}

runMigrations();