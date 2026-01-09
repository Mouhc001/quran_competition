// backend/scripts/migrate_fixed.js
const { query } = require('../src/config/database');
require('dotenv').config();

async function runFullMigration() {
  console.log('🚀 MIGRATION COMPLÈTE CORRIGÉE - Quran Competition');
  console.log('='.repeat(50));

  try {
    // Test de connexion
    console.log('🔌 Test de connexion...');
    const test = await query('SELECT version()');
    console.log('✅ PostgreSQL:', test.rows[0].version.split('\n')[0]);

    // Activer UUID
    console.log('\n🔧 Activation UUID...');
    await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // ============ ÉTAPE 1: SUPPRESSION SÉCURISÉE ============
    console.log('\n🗑️  Nettoyage sécurisé des anciennes tables...');
    
    // D'abord supprimer les contraintes de clés étrangères qui pointent vers system_settings
    console.log('  🔧 Vérification des dépendances...');
    
    // Liste des tables à supprimer DANS LE BON ORDRE
    const tablesToDrop = [
      'candidate_progress',
      'scores',
      'candidates',
      'judges',
      'admins',
      'categories',
      'rounds'
    ];
    
    // Supprimer les tables
    for (const table of tablesToDrop) {
      try {
        await query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`  ✅ ${table}`);
      } catch (error) {
        console.log(`  ⚠️  ${table}: ${error.message}`);
      }
    }
    
    // Gestion spéciale pour system_settings
    console.log('\n🔧 Gestion spéciale pour system_settings...');
    try {
      // Essayer de la supprimer normalement
      await query('DROP TABLE IF EXISTS system_settings CASCADE');
      console.log('  ✅ system_settings supprimée');
    } catch (error) {
      console.log(`  ⚠️  Impossible de supprimer system_settings: ${error.message}`);
      console.log('  🔧 Tentative de création avec IF NOT EXISTS...');
    }

    // Supprimer les vues
    console.log('\n🗑️  Nettoyage des vues...');
    try {
      await query('DROP VIEW IF EXISTS candidate_results CASCADE');
      await query('DROP VIEW IF EXISTS candidate_qualification_history CASCADE');
      console.log('  ✅ Vues supprimées');
    } catch (error) {
      console.log(`  ⚠️  Vues: ${error.message}`);
    }

    // ============ ÉTAPE 2: CRÉATION DES TABLES ============
    console.log('\n📋 Création des nouvelles tables...');

    // 2.1 Table admins
    console.log('  👤 admins');
    await query(`
      CREATE TABLE IF NOT EXISTS admins (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2.2 Table categories
    console.log('  📊 categories');
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        hizb_count INTEGER NOT NULL,
        description TEXT,
        min_age INTEGER,
        max_age INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2.3 Table rounds
    console.log('  🏆 rounds');
    await query(`
      CREATE TABLE IF NOT EXISTS rounds (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        order_index INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT false,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name)
      )
    `);

    // 2.4 Table judges
    console.log('  ⚖️ judges');
    await query(`
      CREATE TABLE IF NOT EXISTS judges (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2.5 Table candidates
    console.log('  👥 candidates');
    await query(`
      CREATE TABLE IF NOT EXISTS candidates (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        registration_number VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        birth_date DATE,
        phone VARCHAR(20),
        email VARCHAR(255),
        category_id UUID REFERENCES categories(id),
        round_id UUID REFERENCES rounds(id),
        
        -- Gestion des clones pour la qualification
        original_candidate_id UUID REFERENCES candidates(id),
        is_original BOOLEAN DEFAULT true,
        
        -- Statut
        status VARCHAR(50) DEFAULT 'active' 
          CHECK (status IN ('active', 'eliminated', 'qualified', 'disqualified')),
        
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Contrainte d'unicité par tour
        UNIQUE(registration_number, round_id)
      )
    `);

    // 2.6 Table scores
    console.log('  📝 scores');
    await query(`
      CREATE TABLE IF NOT EXISTS scores (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
        judge_id UUID REFERENCES judges(id) ON DELETE CASCADE,
        round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
        question_number INTEGER NOT NULL CHECK (question_number BETWEEN 1 AND 5),
        
        -- Notation
        recitation_score DECIMAL(3,2) DEFAULT 0 
          CHECK (recitation_score BETWEEN 0 AND 2),
        siffat_score DECIMAL(3,2) DEFAULT 0 
          CHECK (siffat_score BETWEEN 0 AND 1),
        makharij_score DECIMAL(3,2) DEFAULT 0 
          CHECK (makharij_score BETWEEN 0 AND 2),
        minor_error_score DECIMAL(3,2) DEFAULT 0 
          CHECK (minor_error_score BETWEEN 0 AND 1),
        
        -- Calcul du score total
        total_score DECIMAL(5,2) GENERATED ALWAYS AS (
          recitation_score + siffat_score + makharij_score + minor_error_score
        ) STORED,
        
        comment TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Contrainte d'unicité
        UNIQUE(candidate_id, judge_id, round_id, question_number)
      )
    `);

    // 2.7 Table candidate_progress
    console.log('  📈 candidate_progress');
    await query(`
      CREATE TABLE IF NOT EXISTS candidate_progress (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        from_round_id UUID NOT NULL REFERENCES rounds(id),
        to_round_id UUID NOT NULL REFERENCES rounds(id),
        
        status VARCHAR(20) NOT NULL DEFAULT 'qualified',
        qualified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        qualified_by UUID REFERENCES admins(id),
        
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Contrainte pour éviter les doublons
        UNIQUE(candidate_id, to_round_id)
      )
    `);

    // 2.8 Table system_settings (AVEC TRUC POUR ÉVITER LES CONFLITS)
    console.log('  ⚙️ system_settings');
    
    // D'abord vérifier si elle existe vraiment
    const settingsExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'system_settings'
      )
    `);
    
    if (settingsExists.rows[0].exists) {
      console.log('  ⚠️  system_settings existe déjà, on la garde');
      // Vider la table si elle existe
      await query('DELETE FROM system_settings');
    } else {
      // Créer la table
      await query(`
        CREATE TABLE system_settings (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          setting_key VARCHAR(100) UNIQUE NOT NULL,
          setting_value TEXT,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('  ✅ system_settings créée');
    }

    console.log('✅ Toutes les tables vérifiées/créées!');

    // ============ ÉTAPE 3: CRÉATION DES VUES ============
    console.log('\n👁️  Création des vues...');

    // Vue candidate_results
    console.log('  👁️  candidate_results');
    await query(`
      CREATE OR REPLACE VIEW candidate_results AS
      SELECT 
        c.id as candidate_id,
        c.registration_number,
        c.name as candidate_name,
        c.category_id,
        cat.name as category_name,
        cat.hizb_count,
        r.id as round_id,
        r.name as round_name,
        r.order_index as round_order,
        
        -- Gestion des clones
        c.is_original,
        c.original_candidate_id,
        
        -- Statut
        c.status,
        
        -- Statistiques de notation
        COUNT(DISTINCT s.judge_id) as judges_count,
        COUNT(s.question_number) as questions_scored,
        COALESCE(SUM(s.total_score), 0) as total_score,
        ROUND(COALESCE(AVG(s.total_score), 0), 2) as average_per_question,
        ROUND(COALESCE((SUM(s.total_score) / NULLIF(COUNT(DISTINCT s.judge_id), 0)) * 5, 0), 2) as final_score,
        
        -- Calcul du score sur 30 (5 questions × 6 points max)
        ROUND(COALESCE(SUM(s.total_score), 0) * 5, 2) as score_out_of_30
        
      FROM candidates c
      JOIN rounds r ON c.round_id = r.id
      JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN scores s ON c.id = s.candidate_id AND r.id = s.round_id
      GROUP BY c.id, c.registration_number, c.name, c.category_id, 
               cat.name, cat.hizb_count, r.id, r.name, r.order_index, 
               c.is_original, c.original_candidate_id, c.status
    `);

    console.log('✅ Vues créées!');

    // ============ ÉTAPE 4: INSERTION DES DONNÉES PAR DÉFAUT ============
    console.log('\n📝 Insertion des données par défaut...');

    // 4.1 Catégories
    console.log('  📊 Catégories');
    const categories = [
      ['1 Hizb', 1, 'Mémorisation d\'un Hizb', 5, 8],
      ['2 Hizb', 2, 'Mémorisation de deux Hizb', 5, 10],
      ['5 Hizb', 5, 'Mémorisation de cinq Hizb', 7, 12],
      ['10 Hizb', 10, 'Mémorisation de dix Hizb', 10, 15],
      ['20 Hizb', 20, 'Mémorisation de vingt Hizb', 12, 18],
      ['30 Hizb', 30, 'Mémorisation de trente Hizb (1/2 Coran)', 15, 25],
      ['40 Hizb', 40, 'Mémorisation de quarante Hizb', 18, 30],
      ['60 Hizb', 60, 'Mémorisation complète du Coran', 20, 99]
    ];
    
    for (const [name, hizb_count, description, min_age, max_age] of categories) {
      await query(`
        INSERT INTO categories (name, hizb_count, description, min_age, max_age) 
        VALUES ($1, $2, $3, $4, $5) 
        ON CONFLICT (name) DO UPDATE SET 
          hizb_count = EXCLUDED.hizb_count,
          description = EXCLUDED.description,
          min_age = EXCLUDED.min_age,
          max_age = EXCLUDED.max_age
      `, [name, hizb_count, description, min_age, max_age]);
    }

    // 4.2 Tours
    console.log('  🏆 Tours');
    const roundsData = [
      ['1/32 de finale', 'Premier tour de qualification', 1, true],
      ['1/16 de finale', 'Deuxième tour', 2, false],
      ['1/8 de finale', 'Troisième tour', 3, false],
      ['1/4 de finale', 'Quatrième tour', 4, false],
      ['Demi-finale', 'Cinquième tour', 5, false],
      ['Finale', 'Tour final', 6, false]
    ];
    
    for (const [name, description, order_index, is_active] of roundsData) {
      await query(`
        INSERT INTO rounds (name, description, order_index, is_active) 
        VALUES ($1, $2, $3, $4) 
        ON CONFLICT (name) DO UPDATE SET 
          description = EXCLUDED.description,
          order_index = EXCLUDED.order_index,
          is_active = EXCLUDED.is_active
      `, [name, description, order_index, is_active]);
    }

    // 4.3 Jurys
    console.log('  ⚖️ Jurys');
    await query(`
      INSERT INTO judges (code, name, email) VALUES 
        ('JURY001', 'Cheikh Ahmed', 'ahmed@quran.com'),
        ('JURY002', 'Cheikh Youssef', 'youssef@quran.com'),
        ('JURY003', 'Cheikh Fatima', 'fatima@quran.com'),
        ('JURY004', 'Cheikh Karim', 'karim@quran.com'),
        ('JURY005', 'Cheikh Amina', 'amina@quran.com')
      ON CONFLICT (code) DO UPDATE SET 
        name = EXCLUDED.name,
        email = EXCLUDED.email
    `);

    // 4.4 Paramètres système
    console.log('  ⚙️ Paramètres système');
    const settings = [
      ['competition_name', 'Concours National de Récitation du Coran', 'Nom du concours'],
      ['current_year', '2024', 'Année du concours'],
      ['max_judges_per_candidate', '3', 'Nombre maximum de jurys par candidat'],
      ['min_judges_to_qualify', '3', 'Nombre minimum de jurys pour qualifier'],
      ['scoring_enabled', 'true', 'Activation du système de notation'],
      ['registration_open', 'true', 'Inscriptions ouvertes'],
      ['auto_qualification_threshold', '15', 'Score minimum pour qualification automatique'],
      ['competition_phase', 'qualification', 'Phase du concours'],
      ['results_public', 'false', 'Résultats publics']
    ];
    
    for (const [key, value, description] of settings) {
      await query(`
        INSERT INTO system_settings (setting_key, setting_value, description) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (setting_key) DO UPDATE SET 
          setting_value = EXCLUDED.setting_value,
          description = EXCLUDED.description
      `, [key, value, description]);
    }

    console.log('✅ Données par défaut insérées!');

    // ============ ÉTAPE 5: CRÉATION DES INDEX ============
    console.log('\n🔍 Création des index...');

    const indexes = [
      // Candidats
      { sql: `CREATE INDEX IF NOT EXISTS idx_candidates_round ON candidates(round_id)`, name: 'idx_candidates_round' },
      { sql: `CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status)`, name: 'idx_candidates_status' },
      { sql: `CREATE INDEX IF NOT EXISTS idx_candidates_category ON candidates(category_id)`, name: 'idx_candidates_category' },
      { sql: `CREATE INDEX IF NOT EXISTS idx_candidates_original ON candidates(original_candidate_id)`, name: 'idx_candidates_original' },
      { sql: `CREATE INDEX IF NOT EXISTS idx_candidates_is_original ON candidates(is_original)`, name: 'idx_candidates_is_original' },
      { sql: `CREATE INDEX IF NOT EXISTS idx_candidates_registration ON candidates(registration_number)`, name: 'idx_candidates_registration' },
      
      // Scores
      { sql: `CREATE INDEX IF NOT EXISTS idx_scores_candidate_round ON scores(candidate_id, round_id)`, name: 'idx_scores_candidate_round' },
      { sql: `CREATE INDEX IF NOT EXISTS idx_scores_judge_round ON scores(judge_id, round_id)`, name: 'idx_scores_judge_round' },
      { sql: `CREATE INDEX IF NOT EXISTS idx_scores_candidate_judge ON scores(candidate_id, judge_id)`, name: 'idx_scores_candidate_judge' },
      { sql: `CREATE INDEX IF NOT EXISTS idx_scores_submitted_at ON scores(submitted_at)`, name: 'idx_scores_submitted_at' },
      
      // Tours
      { sql: `CREATE INDEX IF NOT EXISTS idx_rounds_order_index ON rounds(order_index)`, name: 'idx_rounds_order_index' },
      { sql: `CREATE INDEX IF NOT EXISTS idx_rounds_is_active ON rounds(is_active)`, name: 'idx_rounds_is_active' },
      
      // Jurys
      { sql: `CREATE INDEX IF NOT EXISTS idx_judges_code ON judges(code)`, name: 'idx_judges_code' },
      { sql: `CREATE INDEX IF NOT EXISTS idx_judges_active ON judges(is_active)`, name: 'idx_judges_active' },
      
      // Qualification
      { sql: `CREATE INDEX IF NOT EXISTS idx_candidate_progress_candidate ON candidate_progress(candidate_id)`, name: 'idx_candidate_progress_candidate' },
      { sql: `CREATE INDEX IF NOT EXISTS idx_candidate_progress_from_round ON candidate_progress(from_round_id)`, name: 'idx_candidate_progress_from_round' },
      { sql: `CREATE INDEX IF NOT EXISTS idx_candidate_progress_to_round ON candidate_progress(to_round_id)`, name: 'idx_candidate_progress_to_round' },
      { sql: `CREATE INDEX IF NOT EXISTS idx_candidate_progress_qualified_at ON candidate_progress(qualified_at)`, name: 'idx_candidate_progress_qualified_at' },
      
      // Catégories
      { sql: `CREATE INDEX IF NOT EXISTS idx_categories_hizb_count ON categories(hizb_count)`, name: 'idx_categories_hizb_count' }
    ];

    for (const index of indexes) {
      try {
        await query(index.sql);
        console.log(`  ✅ ${index.name}`);
      } catch (error) {
        console.log(`  ⚠️  ${index.name}: ${error.message}`);
      }
    }

    console.log('✅ Index créés!');

    // ============ ÉTAPE 6: VÉRIFICATION FINALE ============
    console.log('\n🎉 MIGRATION TERMINÉE AVEC SUCCÈS!');
    console.log('='.repeat(50));

    console.log('\n📊 RÉSUMÉ DES DONNÉES:');
    
    const tables = ['admins', 'categories', 'rounds', 'judges', 'candidates', 'scores', 'candidate_progress', 'system_settings'];
    
    for (const table of tables) {
      try {
        const count = await query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ${table.padEnd(20)}: ${count.rows[0].count}`);
      } catch (error) {
        console.log(`  ${table.padEnd(20)}: ERREUR - ${error.message}`);
      }
    }

    // Afficher plus de détails
    console.log('\n🏆 TOURS CRÉÉS:');
    const rounds = await query(`
      SELECT name, order_index, is_active, 
             (SELECT COUNT(*) FROM candidates WHERE round_id = rounds.id) as candidates_count
      FROM rounds 
      ORDER BY order_index
    `);
    
    console.table(rounds.rows);

    console.log('\n📊 CATÉGORIES:');
    const cats = await query(`
      SELECT name, hizb_count, 
             (SELECT COUNT(*) FROM candidates WHERE category_id = categories.id) as candidates_count
      FROM categories 
      ORDER BY hizb_count
    `);
    
    console.table(cats.rows);

    console.log('\n✅ BASE DE DONNÉES PRÊTE !');
    console.log('\n🔑 Pour créer un admin: npm run create-admin');
    console.log('🚀 Pour démarrer: npm run dev');

  } catch (error) {
    console.error('\n❌ ERREUR DE MIGRATION:', error.message);
    console.error('Détails:', error);
    
    // Essayer de récupérer
    console.log('\n🔄 Tentative de récupération...');
    try {
      // Vérifier quelles tables existent
      const existingTables = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      console.log('\n📋 Tables existantes:');
      existingTables.rows.forEach(row => console.log(`  - ${row.table_name}`));
      
    } catch (recoveryError) {
      console.log('❌ Impossible de récupérer:', recoveryError.message);
    }
    
    process.exit(1);
  }
}

runFullMigration();