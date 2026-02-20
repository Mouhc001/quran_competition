import express from 'express';
import jwt from 'jsonwebtoken';
import Judge from '../models/Judge.model.js';
import { query as dbQuery } from '../config/database.js';
import { authenticateJudge } from '../middleware/auth.middleware.js';

const router = express.Router();

// Toutes les routes jury nécessitent une authentification
router.use(authenticateJudge);

// GET /api/judges/me - Récupérer les infos du jury connecté
router.get('/me', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        id: req.user.id,
        code: req.user.code,
        name: req.user.name,
        is_active: req.user.is_active
      }
    });
  } catch (error) {
    console.error('Erreur récupération jury:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/judges - Liste tous les jurys
router.get('/', async (req, res) => {
  try {
    const judges = await Judge.findAll();
    
    res.json({
      success: true,
      count: judges.length,
      data: judges
    });
  } catch (error) {
    console.error('Erreur récupération jurys:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/judges/rounds - Liste de tous les tours pour les jurys
router.get('/rounds', async (req, res) => {
  try {
    console.log('🔑 Jury authentifié pour /rounds:', req.user.id);
    
    const roundsQuery = await dbQuery(`
      SELECT id, name, description, order_index, is_active
      FROM rounds 
      ORDER BY order_index
    `);
    
    console.log(`📋 ${roundsQuery.rows.length} tours récupérés`);
    
    res.json({
      success: true,
      data: roundsQuery.rows
    });
  } catch (error) {
    console.error('❌ Erreur récupération tours:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des tours'
    });
  }
});

// GET /api/judges/round-candidates/:roundId? - Candidats d'un tour spécifique
router.get('/round-candidates/:roundId?', async (req, res) => {
  try {
    const judgeId = req.user.id;
    let roundId = req.params.roundId;
    
    console.log('🎯 Jury ID:', judgeId, 'Round ID demandé:', roundId);
    
    if (!roundId) {
      const activeRoundQuery = await dbQuery(
        'SELECT * FROM rounds WHERE is_active = true ORDER BY order_index LIMIT 1'
      );
      
      if (activeRoundQuery.rows.length === 0) {
        return res.json({
          success: true,
          data: [],
          message: 'Aucun tour actif'
        });
      }
      roundId = activeRoundQuery.rows[0].id;
    }
    
    console.log('🏆 Tour sélectionné:', roundId);
    
    // 1. Récupérer les catégories assignées à ce jury
    const assignedCategories = await Judge.getCategoriesForJudge(judgeId, roundId);
    const categoryIds = assignedCategories.map(c => c.id);
    
    console.log('📋 Catégories assignées:', categoryIds);
    
    // Si aucune catégorie assignée, retourner une liste vide
    if (categoryIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        round: {
          id: roundId,
          name: (await dbQuery('SELECT name FROM rounds WHERE id = $1', [roundId])).rows[0]?.name,
          order_index: (await dbQuery('SELECT order_index FROM rounds WHERE id = $1', [roundId])).rows[0]?.order_index,
          is_active: (await dbQuery('SELECT is_active FROM rounds WHERE id = $1', [roundId])).rows[0]?.is_active
        }
      });
    }
    
    // 2. Récupérer les candidats uniquement des catégories assignées
    const candidatesQuery = await dbQuery(`
      SELECT DISTINCT ON (coalesce(c.original_candidate_id, c.id)) 
        c.*,
        cat.name as category_name,
        r.name as round_name,
        r.order_index as round_order,
        COALESCE((
          SELECT COUNT(DISTINCT s.judge_id) 
          FROM scores s 
          WHERE s.candidate_id = c.id 
          AND s.round_id = c.round_id
        ), 0) as judges_count,
        COALESCE((
          SELECT SUM(total_score)
          FROM scores 
          WHERE candidate_id = c.id
        ), 0) as total_score,
        EXISTS(
          SELECT 1 FROM scores s2 
          WHERE s2.candidate_id = c.id 
          AND s2.judge_id = $1
          AND s2.round_id = $2
        ) as already_scored
      FROM candidates c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN rounds r ON c.round_id = r.id
      WHERE c.round_id = $2
        AND c.category_id = ANY($3::uuid[])
        AND (
          (c.is_original = false AND c.original_candidate_id IS NOT NULL)
          OR (c.is_original = true AND NOT EXISTS (
            SELECT 1 FROM candidates c2 
            WHERE c2.original_candidate_id = c.id 
            AND c2.round_id = $2
          ))
        )
        AND c.status = 'active'
      ORDER BY coalesce(c.original_candidate_id, c.id), c.is_original DESC
    `, [judgeId, roundId, categoryIds]);
    
    console.log(`📊 ${candidatesQuery.rows.length} candidats trouvés pour le jury dans ses catégories`);
    
    const roundInfoQuery = await dbQuery(
      'SELECT * FROM rounds WHERE id = $1',
      [roundId]
    );
    
    const roundInfo = roundInfoQuery.rows[0] || {};
    
    res.json({
      success: true,
      data: candidatesQuery.rows,
      round: {
        id: roundInfo.id,
        name: roundInfo.name,
        order_index: roundInfo.order_index,
        is_active: roundInfo.is_active
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération candidats jury:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/judges/active-candidates - Candidats actifs pour le jury
router.get('/active-candidates', async (req, res) => {
  try {
    const judgeId = req.user.id;
    
    const result = await dbQuery(
      `SELECT DISTINCT c.*, cat.name as category_name
       FROM candidates c
       JOIN categories cat ON c.category_id = cat.id
       LEFT JOIN scores s ON c.id = s.candidate_id AND s.judge_id = $1
       WHERE c.status = 'active'
         AND s.id IS NULL
       ORDER BY c.name`,
      [judgeId]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Erreur récupération candidats actifs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});



// GET /api/judges/:id - Récupérer un jury par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || id === 'rounds' || id === 'active-candidates') {
      return res.status(404).json({
        success: false,
        message: 'Route non trouvée'
      });
    }
    
    const judge = await Judge.findById(id);
    
    if (!judge) {
      return res.status(404).json({
        success: false,
        message: 'Jury non trouvé'
      });
    }

    const { password_hash, ...judgeData } = judge;
    
    res.json({
      success: true,
      data: judgeData
    });
  } catch (error) {
    console.error('Erreur récupération jury:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/judges - Créer un nouveau jury
router.post('/', async (req, res) => {
  try {
    const { code, name } = req.body;
    
    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: 'code et name sont requis'
      });
    }

    const existing = await Judge.findByCode(code);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Code déjà utilisé'
      });
    }

    const judge = await Judge.create({ code, name });
    
    res.status(201).json({
      success: true,
      message: 'Jury créé avec succès',
      data: judge
    });
  } catch (error) {
    console.error('Erreur création jury:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Code déjà utilisé'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PUT /api/judges/:id/activate - Activer un jury
router.put('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const judge = await Judge.activate(id);
    
    if (!judge) {
      return res.status(404).json({
        success: false,
        message: 'Jury non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Jury activé avec succès',
      data: judge
    });
  } catch (error) {
    console.error('Erreur activation jury:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PUT /api/judges/:id/deactivate - Désactiver un jury
router.put('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const judge = await Judge.deactivate(id);
    
    if (!judge) {
      return res.status(404).json({
        success: false,
        message: 'Jury non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Jury désactivé avec succès',
      data: judge
    });
  } catch (error) {
    console.error('Erreur désactivation jury:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});


// // POST /api/judges/scores/submit - Soumettre les scores pour un candidat
// router.post('/scores/submit', authenticateJudge, submitScore);



// GET /api/judges/scores/judge/:judgeId/round/:roundId/status
// Récupère le statut des candidats notés par ce jury
router.get('/scores/judge/:judgeId/round/:roundId/status', async (req, res) => {
  try {
    const { judgeId, roundId } = req.params;
    
    // Vérifier que le judgeId correspond au jury connecté
    if (judgeId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }
    
    const scoredCandidates = await dbQuery(
      `SELECT DISTINCT candidate_id 
       FROM scores 
       WHERE judge_id = $1 
         AND round_id = $2`,
      [judgeId, roundId]
    );
    
    res.json({
      success: true,
      data: scoredCandidates.rows.map(row => ({
        candidate_id: row.candidate_id,
        scored: true
      }))
    });
  } catch (error) {
    console.error('❌ Erreur récupération statut notation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/judges/scores/candidate/:candidateId/round/:roundId/judge/:judgeId
// Récupère les détails des scores d'un jury pour un candidat spécifique
router.get('/scores/candidate/:candidateId/round/:roundId/judge/:judgeId', 
  authenticateJudge, 
  async (req, res) => {
    try {
      const { candidateId, roundId, judgeId } = req.params;
      
      console.log('📊 Récupération détails scores - Judge:', judgeId, 'Candidate:', candidateId, 'Round:', roundId);
      
      // Vérifier que le judgeId correspond au jury connecté
      if (judgeId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé'
        });
      }
      
      const result = await dbQuery(
        `SELECT * FROM scores 
         WHERE judge_id = $1 
           AND candidate_id = $2 
           AND round_id = $3
         ORDER BY question_number`,
        [judgeId, candidateId, roundId]
      );
      
      console.log(`📋 ${result.rows.length} scores trouvés`);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error) {
      console.error('❌ Erreur récupération détails scores:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);
export default router;