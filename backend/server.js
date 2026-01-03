process.env.PORT = '5001';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes de base
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API Quran Competition' });
});

// Routes API
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/candidates', require('./src/routes/candidate.routes'));
app.use('/api/rounds', require('./src/routes/round.routes'));
app.use('/api/scores', require('./src/routes/score.routes'));
app.use('/api/judges', require('./src/routes/judge.routes'));

// ⭐⭐ AJOUTEZ CETTE LIGNE ICI - APRÈS les autres routes API ⭐⭐
app.use('/api/admin', require('./src/routes/admin.routes'));

// Route pour soumettre les scores
app.post('/api/scores', async (req, res) => {
  try {
    const { candidate_id, round_id, questions } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token manquant'
      });
    }

    console.log('Token reçu:', token);
    
    if (!candidate_id || !round_id || !questions || !Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides'
      });
    }

    console.log('Scores reçus pour:', {
      candidate_id,
      round_id,
      questions_count: questions.length,
      total: questions.reduce((sum, q) => sum + (q.recitation + q.siffat + q.makharij + q.minorError), 0)
    });

    res.json({
      success: true,
      message: 'Scores enregistrés avec succès',
      data: {
        candidate_id,
        round_id,
        total_score: questions.reduce((sum, q) => sum + (q.recitation + q.siffat + q.makharij + q.minorError), 0),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erreur enregistrement scores:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route pour créer plusieurs candidats de test
app.post('/api/candidates/test', async (req, res) => {
  try {
    const testCandidates = [
      {
        registration_number: 'CAN001',
        name: 'Mohamed Alami',
        birth_date: '2005-03-15',
        category: 'Hifz'
      },
      {
        registration_number: 'CAN002',
        name: 'Fatima Zahra Benbrahim',
        birth_date: '2006-05-20',
        category: 'Tilawa'
      },
      {
        registration_number: 'CAN003',
        name: 'Youssef El Mansouri',
        birth_date: '2004-11-30',
        category: 'Hifz'
      },
      {
        registration_number: 'CAN004',
        name: 'Amina Toumi',
        birth_date: '2005-08-12',
        category: 'Tilawa'
      },
      {
        registration_number: 'CAN005',
        name: 'Hassan Berrada',
        birth_date: '2004-12-25',
        category: 'Hifz'
      }
    ];

    const createdCandidates = [];
    
    for (const candidate of testCandidates) {
      try {
        const roundResult = await query('SELECT id FROM rounds WHERE is_active = true LIMIT 1');
        const activeRoundId = roundResult.rows[0]?.id;

        const result = await query(
          `INSERT INTO candidates (registration_number, name, birth_date, category, round_id) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING *`,
          [candidate.registration_number, candidate.name, candidate.birth_date, 
           candidate.category, activeRoundId]
        );
        
        createdCandidates.push(result.rows[0]);
      } catch (err) {
        // Ignorer les doublons
      }
    }

    res.json({
      success: true,
      message: `${createdCandidates.length} candidats de test créés`,
      data: createdCandidates
    });

  } catch (error) {
    console.error('Erreur création candidats test:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// ⭐⭐ GESTION DES ERREURS - DOIT ÊTRE APRÈS TOUTES LES ROUTES ⭐⭐

// 404 Handler - DOIT ÊTRE AVANT le handler d'erreurs général mais APRÈS toutes les routes
app.use('*', (req, res) => {
  console.log(`❌ Route non trouvée: ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    message: 'Route non trouvée',
    attemptedUrl: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur serveur interne',
    error: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur backend lancé sur le port ${PORT}`);
  console.log(`🔗 API disponible sur: http://localhost:${PORT}/api`);
  console.log(`👑 Routes admin: http://localhost:${PORT}/api/admin/*`);
});