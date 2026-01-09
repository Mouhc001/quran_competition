const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Score = require('../models/Score.model');
const Judge = require('../models/Judge.model');
const scoreController = require('../controllers/score.controller');

// Middleware pour vérifier l'authentification des jurys
const authenticateJudge = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
    
    // Vérifier que c'est bien un jury
    if (decoded.role !== 'judge') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux jurys'
      });
    }

    // Vérifier que le jury existe et est actif
    const judge = await Judge.findById(decoded.id);
    if (!judge || !judge.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Jury non autorisé'
      });
    }

    // Ajouter les infos du jury à la requête
    req.user = {
      id: decoded.id,
      code: decoded.code,
      name: decoded.name,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré'
      });
    }

    console.error('Erreur authentification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// POST /api/scores/candidate/:candidateId/round/:roundId - Soumettre les scores
router.post('/candidate/:candidateId/round/:roundId', 
  authenticateJudge, 
  scoreController.submitScore
);

// GET /api/scores/candidate/:candidateId/round/:roundId - Récupérer les scores d'un candidat
router.get('/candidate/:candidateId/round/:roundId', 
  scoreController.getCandidateScores
);

// GET /api/scores/round/:roundId/category/:categoryId - Scores par tour et catégorie
router.get('/round/:roundId/category/:categoryId', 
  scoreController.getScoresByRoundCategory
);

// GET /api/scores/round/:roundId/category/:categoryId/questions - Scores par question
router.get('/round/:roundId/category/:categoryId/questions', 
  scoreController.getScoresByQuestion
);

// GET /api/scores/round/:roundId/category/:categoryId/statistics - Statistiques
router.get('/round/:roundId/category/:categoryId/statistics', 
  scoreController.getScoreStatistics
);

// GET /api/scores/candidate/:candidateId/round/:roundId/summary - Résumé candidat
router.get('/candidate/:candidateId/round/:roundId/summary', 
  scoreController.getCandidateScoreSummary
);

// GET /api/scores/round/:roundId/results - Résultats du tour
router.get('/round/:roundId/results', 
  scoreController.getRoundResults
);

// GET /api/scores/judge/:judgeId/round/:roundId - Scores par jury
router.get('/judge/:judgeId/round/:roundId', async (req, res) => {
  try {
    const { judgeId, roundId } = req.params;
    
    const scores = await Score.getJudgeScores(judgeId, roundId);
    
    res.json({
      success: true,
      data: scores
    });
  } catch (error) {
    console.error('Erreur récupération scores jury:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});


// Dans score.routes.js - AJOUTE CETTE ROUTE
router.get('/test/round/:roundId/category/:categoryId', async (req, res) => {
  try {
    const { roundId, categoryId } = req.params;
    
    console.log('🚨 TEST ROUTE - Pas d\'auth requise');
    
    // Utiliser ta fonction existante
    const scores = await Score.getScoresByRoundCategory(roundId, categoryId);
    
    // DEBUG: Voir ce qui est retourné
    console.log('📊 Scores depuis DB:', scores);
    console.log('💰 Premier total_score:', scores[0]?.total_score);
    console.log('💰 Type:', typeof scores[0]?.total_score);
    
    // Convertir explicitement
    const convertedScores = scores.map(score => ({
      ...score,
      total_score: score.total_score ? parseFloat(score.total_score) : 0,
      average_per_question: score.average_per_question ? parseFloat(score.average_per_question) : 0,
      judges_count: parseInt(score.judges_count, 10) || 0
    }));
    
    console.log('✅ Après conversion:', convertedScores[0]?.total_score);
    
    res.json({
      success: true,
      message: 'TEST - Données brutes',
      raw_data: scores, // Données brutes
      converted_data: convertedScores, // Données converties
      debug: {
        first_score_raw: scores[0]?.total_score,
        first_score_type: typeof scores[0]?.total_score,
        first_score_converted: convertedScores[0]?.total_score
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur test:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;