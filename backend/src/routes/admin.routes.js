const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateAdmin, isAdmin } = require('../middleware/auth.middleware');

// Toutes les routes admin nécessitent une authentification admin
router.use(authenticateAdmin);
router.use(isAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Gestion des candidats
router.get('/candidates', adminController.getAllCandidates);
router.post('/candidates', adminController.createCandidate);
router.get('/candidates/:id', adminController.getCandidateDetails);
router.put('/candidates/:id', adminController.updateCandidate);
router.delete('/candidates/:id', adminController.deleteCandidate);
router.put('/candidates/:id/status', adminController.updateCandidateStatus);

// Gestion des tours
router.get('/rounds', adminController.getAllRounds);
router.post('/rounds', adminController.createRound);
router.put('/rounds/:id', adminController.updateRound);
router.put('/rounds/:id/toggle', adminController.toggleRound);

// Gestion des juges
router.get('/judges', adminController.getAllJudges);
router.post('/judges', adminController.createJudge);
router.put('/judges/:id', adminController.updateJudge); // Ajoute
router.delete('/judges/:id', adminController.deleteJudge); // Ajoute
router.put('/judges/:id/status', adminController.updateJudgeStatus); // Nouvelle route
router.post('/judges/generate', adminController.generateJudgeCodes);

// Gestion des catégories
router.get('/categories', adminController.getAllCategories);
router.post('/categories', adminController.createCategory);

// Tours
router.get('/rounds', isAdmin, adminController.getAllRounds);
router.post('/rounds', isAdmin, adminController.createRound);
router.get('/rounds/:id', isAdmin, adminController.getRoundDetails);
router.put('/rounds/:id', isAdmin, adminController.updateRound);
router.put('/rounds/:id/toggle', isAdmin, adminController.toggleRound);
router.delete('/rounds/:id', isAdmin, adminController.deleteRound);
router.get('/rounds/:id/candidates', isAdmin, adminController.getCandidatesByRound);


// Rapports
router.get('/reports/round/:roundId', adminController.getRoundReport);

// scores
router.get('/candidates/:candidateId/rounds/:roundId/scores', isAdmin, adminController.getCandidateDetailedScores);

module.exports = router;