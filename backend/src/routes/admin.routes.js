const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateAdmin, isAdmin } = require('../middleware/auth.middleware');

// ✅ Une seule fois, ça suffit pour TOUTES les routes
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

// Gestion des juges
router.get('/judges', adminController.getAllJudges);
router.post('/judges', adminController.createJudge);
router.put('/judges/:id', adminController.updateJudge);
router.delete('/judges/:id', adminController.deleteJudge);
router.put('/judges/:id/status', adminController.updateJudgeStatus);
router.post('/judges/generate', adminController.generateJudgeCodes);

// Gestion des catégories
router.get('/categories', adminController.getAllCategories);
router.post('/categories', adminController.createCategory);

// ✅ Tours - PLUS AUCUN isAdmin en double !
router.get('/rounds', adminController.getAllRounds);
router.post('/rounds', adminController.createRound);
router.get('/rounds/:id', adminController.getRoundDetails);
router.put('/rounds/:id', adminController.updateRound);
router.put('/rounds/:id/toggle', adminController.toggleRound);
router.delete('/rounds/:id', adminController.deleteRound);
router.get('/rounds/:id/candidates', adminController.getCandidatesByRound);

// Rapports
router.get('/reports/round/:roundId', adminController.getRoundReport);

// ✅ Scores - PLUS de isAdmin
router.get('/candidates/:candidateId/rounds/:roundId/scores', adminController.getCandidateDetailedScores);

module.exports = router;