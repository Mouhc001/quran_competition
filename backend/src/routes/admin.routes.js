import express from 'express';
const router = express.Router();
import * as adminController from '../controllers/admin.controller.js';
import { authenticateAdmin, isAdmin } from '../middleware/auth.middleware.js';
import QualificationController from '../controllers/qualification.controller.js';

// ✅ Une seule fois, ça suffit pour TOUTES les routes
router.use(authenticateAdmin);
router.use(isAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// ============ CANDIDATS ============
router.get('/candidates', adminController.getAllCandidates);
router.post('/candidates', adminController.createCandidate);
router.get('/candidates/:id', adminController.getCandidateDetails);
router.put('/candidates/:id', adminController.updateCandidate);
router.delete('/candidates/:id', adminController.deleteCandidate);
router.put('/candidates/:id/status', adminController.updateCandidateStatus);

// ============ JUGES ============
router.get('/judges', adminController.getAllJudges);
router.post('/judges', adminController.createJudge);
router.put('/judges/:id', adminController.updateJudge);
router.delete('/judges/:id', adminController.deleteJudge);
router.put('/judges/:id/status', adminController.updateJudgeStatus);
router.post('/judges/generate', adminController.generateJudgeCodes);

// ============ CATÉGORIES ============
router.get('/categories', adminController.getAllCategories);
router.post('/categories', adminController.createCategory);

// ============ TOURS ============
router.get('/rounds', adminController.getAllRounds);
router.post('/rounds', adminController.createRound);
router.get('/rounds/:id', adminController.getRoundDetails);
router.put('/rounds/:id', adminController.updateRound);
router.put('/rounds/:id/toggle', adminController.toggleRound);
router.delete('/rounds/:id', adminController.deleteRound);
router.get('/rounds/:id/candidates', adminController.getCandidatesByRound);
// ✅ NOUVEAU - Prochain tour
router.get('/rounds/:id/next', adminController.getNextRound);

// ============ SCORES DES CANDIDATS ============
router.get('/candidates/:candidateId/rounds/:roundId/scores', adminController.getCandidateDetailedScores);
// ✅ NOUVEAU - Résumé des scores
router.get('/scores/candidate/:candidateId/round/:roundId/summary', adminController.getCandidateScoreSummary);

// ============ SCORES PAR CATÉGORIE ============
// ✅ NOUVEAU - Scores par catégorie
router.get('/scores/round/:roundId/category/:categoryId', adminController.getCategoryScores);
router.get('/scores/round/:roundId/category/:categoryId/questions', adminController.getScoresByQuestion);
router.get('/scores/round/:roundId/category/:categoryId/statistics', adminController.getScoreStatistics);

// ============ QUALIFICATION ============
// ✅ NOUVEAU - Qualification
router.get('/qualification/rounds/:roundId/candidates', QualificationController.getRoundCandidatesWithHistory);
router.post('/qualification/rounds/:roundId/qualify-batch', QualificationController.qualifyCandidatesBatch);
router.post('/qualification/candidates/:candidateId/qualify', QualificationController.qualifyCandidate);

// ============ RAPPORTS ============
router.get('/reports/round/:roundId', adminController.getRoundReport);

export default router;