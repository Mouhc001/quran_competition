import express from 'express';
import { authenticateAdmin } from '../middleware/auth.middleware.js';
import Judge from '../models/Judge.model.js';
import { query as dbQuery } from '../config/database.js';

const router = express.Router();

// Toutes ces routes nécessitent d'être admin
router.use(authenticateAdmin);

// GET /api/admin/judge-assignments/rounds - Liste des tours pour le dropdown
router.get('/rounds', async (req, res) => {
  try {
    const rounds = await dbQuery(
      `SELECT id, name, order_index, is_active 
       FROM rounds 
       ORDER BY order_index`
    );
    
    res.json({
      success: true,
      data: rounds.rows
    });
  } catch (error) {
    console.error('Erreur récupération tours:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/admin/judge-assignments/judges - Liste des jurys
router.get('/judges', async (req, res) => {
  try {
    const judges = await Judge.findAll();
    res.json({
      success: true,
      data: judges
    });
  } catch (error) {
    console.error('Erreur récupération jurys:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/admin/judge-assignments/categories - Liste des catégories
router.get('/categories', async (req, res) => {
  try {
    const categories = await dbQuery(
      `SELECT * FROM categories ORDER BY hizb_count`
    );
    
    res.json({
      success: true,
      data: categories.rows
    });
  } catch (error) {
    console.error('Erreur récupération catégories:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/admin/judge-assignments/round/:roundId - Récupérer toutes les assignations d'un tour
router.get('/round/:roundId', async (req, res) => {
  try {
    const { roundId } = req.params;
    
    const assignments = await Judge.getAssignmentsByRound(roundId);
    
    // Regrouper par catégorie pour faciliter l'affichage
    const groupedByCategory = assignments.reduce((acc, item) => {
      if (!acc[item.category_id]) {
        acc[item.category_id] = {
          category_id: item.category_id,
          category_name: item.category_name,
          hizb_count: item.hizb_count,
          judges: []
        };
      }
      acc[item.category_id].judges.push({
        id: item.id,
        judge_id: item.judge_id,
        judge_name: item.judge_name,
        judge_code: item.judge_code,
        assigned_at: item.assigned_at,
        assigned_by_name: item.assigned_by_name
      });
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: Object.values(groupedByCategory)
    });
  } catch (error) {
    console.error('Erreur récupération assignations:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/admin/judge-assignments/assign - Assigner un jury à une catégorie
router.post('/assign', async (req, res) => {
  try {
    const { judgeId, categoryId, roundId } = req.body;
    const adminId = req.user.id;
    
    if (!judgeId || !categoryId || !roundId) {
      return res.status(400).json({
        success: false,
        message: 'judgeId, categoryId et roundId sont requis'
      });
    }
    
    const assignment = await Judge.assignToCategory(judgeId, categoryId, roundId, adminId);
    
    if (!assignment) {
      return res.json({
        success: false,
        message: 'Cette assignation existe déjà'
      });
    }
    
    res.json({
      success: true,
      message: 'Jury assigné avec succès',
      data: assignment
    });
  } catch (error) {
    console.error('Erreur assignation:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/admin/judge-assignments/remove - Retirer un jury d'une catégorie
router.delete('/remove', async (req, res) => {
  try {
    const { judgeId, categoryId, roundId } = req.body;
    
    if (!judgeId || !categoryId || !roundId) {
      return res.status(400).json({
        success: false,
        message: 'judgeId, categoryId et roundId sont requis'
      });
    }
    
    await Judge.removeFromCategory(judgeId, categoryId, roundId);
    
    res.json({
      success: true,
      message: 'Jury retiré avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/admin/judge-assignments/judge/:judgeId/round/:roundId/categories
// Récupérer les catégories d'un jury pour un tour
router.get('/judge/:judgeId/round/:roundId/categories', async (req, res) => {
  try {
    const { judgeId, roundId } = req.params;
    
    const categories = await Judge.getCategoriesForJudge(judgeId, roundId);
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Erreur récupération catégories du jury:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;