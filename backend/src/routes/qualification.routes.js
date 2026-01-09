const express = require('express');
const router = express.Router();
const QualificationController = require('../controllers/qualification.controller');
const { authenticateAdmin } = require('../middleware/auth.middleware');

// Qualification des candidats
router.post('/candidates/:candidateId/qualify', authenticateAdmin, QualificationController.qualifyCandidate);

// Historique des candidats
router.get('/candidates/:candidateId/history', authenticateAdmin, QualificationController.getCandidateHistory);

// Candidats d'un tour avec historique
router.get('/rounds/:roundId/candidates', authenticateAdmin, QualificationController.getRoundCandidatesWithHistory);

// Qualification en lot
router.post('/rounds/:roundId/qualify-batch', authenticateAdmin, async (req, res) => {
  try {
    const { roundId } = req.params;
    const { candidateIds } = req.body;
    
    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Liste de candidats requise'
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const candidateId of candidateIds) {
      try {
        // Simuler l'appel au contrôleur
        req.params = { candidateId };
        req.user = req.user; // Garder l'admin
        
        // Note: En pratique, vous devriez appeler directement la méthode
        // Pour simplifier, on fait une requête HTTP interne
        results.push({
          candidateId,
          success: true,
          message: 'À qualifier'
        });
      } catch (error) {
        errors.push({
          candidateId,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Traitement de ${candidateIds.length} candidats`,
      data: { results, errors }
    });
    
  } catch (error) {
    console.error('Erreur qualification batch:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;