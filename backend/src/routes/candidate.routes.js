const express = require('express');
const router = express.Router();
const Candidate = require('../models/Candidate.model');
const candidateController = require('../controllers/candidate.controller');
const { authenticateAdmin } = require('../middleware/auth.middleware'); 
const pool = require('../config/database');

// GET /api/candidates - Liste tous les candidats
router.get('/', async (req, res) => {
  try {
    const candidates = await Candidate.findAll();
    
    res.json({
      success: true,
      count: candidates.length,
      data: candidates
    });
  } catch (error) {
    console.error('Erreur récupération candidats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/candidates/:id - Récupère un candidat par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = await Candidate.findById(id);
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidat non trouvé'
      });
    }

    res.json({
      success: true,
      data: candidate
    });
  } catch (error) {
    console.error('Erreur récupération candidat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/candidates - Créer un candidat


// PUT /api/candidates/:id - Mettre à jour un candidat
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const candidate = await Candidate.update(id, updates);
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidat non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Candidat mis à jour avec succès',
      data: candidate
    });
  } catch (error) {
    console.error('Erreur mise à jour candidat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// DELETE /api/candidates/:id - Supprimer un candidat
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await Candidate.delete(id);
    
    res.json({
      success: true,
      message: 'Candidat supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression candidat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/candidates/round/:roundId - Candidats par tour
router.get('/round/:roundId', async (req, res) => {
  try {
    const { roundId } = req.params;
    const candidates = await Candidate.getByRound(roundId);
    
    res.json({
      success: true,
      count: candidates.length,
      data: candidates
    });
  } catch (error) {
    console.error('Erreur récupération candidats par tour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/candidates/:id/qualify - Qualifier un candidat
router.post('/:id/qualify', async (req, res) => {
  try {
    const { id } = req.params;
    const { next_round_id } = req.body;
    
    if (!next_round_id) {
      return res.status(400).json({
        success: false,
        message: 'next_round_id est requis'
      });
    }

    const candidate = await Candidate.qualify(id, next_round_id);
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidat non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Candidat qualifié pour le tour suivant',
      data: candidate
    });
  } catch (error) {
    console.error('Erreur qualification candidat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/candidates/:id/eliminate - Éliminer un candidat
router.post('/:id/eliminate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const candidate = await Candidate.eliminate(id);
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidat non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Candidat éliminé',
      data: candidate
    });
  } catch (error) {
    console.error('Erreur élimination candidat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});


// backend/src/routes/candidate.routes.js - AJOUTEZ ces routes :
router.post('/:id/qualify-auto', candidateController.qualifyCandidateAuto);
router.post('/qualify-batch', candidateController.qualifyCandidatesBatchAuto);

// backend/src/routes/round.routes.js - AJOUTEZ :
router.get('/:id/next', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT r.* FROM rounds r 
      WHERE r.order_index = (
        SELECT order_index + 1 
        FROM rounds 
        WHERE id = $1
      )
    `, [id]);
    
    const nextRound = result.rows[0];
    
    if (!nextRound) {
      return res.json({
        success: true,
        data: null,
        message: 'Aucun tour suivant disponible'
      });
    }
    
    res.json({
      success: true,
      data: nextRound
    });
    
  } catch (error) {
    console.error('Erreur récupération prochain tour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});


router.post('/:id/qualify-to-next', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { currentRoundId } = req.body;

    // 1. Récupérer le candidat
    const candidateQuery = `
      SELECT c.*, r.order_index as current_round_order 
      FROM candidates c 
      JOIN rounds r ON c.round_id = r.id 
      WHERE c.id = $1
    `;
    const candidateResult = await pool.query(candidateQuery, [id]);
    
    if (candidateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Candidat non trouvé'
      });
    }
    
    const candidate = candidateResult.rows[0];
    
    // 2. Trouver le prochain tour
    const nextRoundQuery = `
      SELECT * FROM rounds 
      WHERE order_index = $1 
      ORDER BY order_index ASC 
      LIMIT 1
    `;
    const nextRoundResult = await pool.query(nextRoundQuery, [candidate.current_round_order + 1]);
    
    if (nextRoundResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun tour suivant disponible. Vérifiez que vous avez créé le tour suivant.'
      });
    }
    
    const nextRound = nextRoundResult.rows[0];
    
    // 3. Vérifier si le candidat est déjà dans le tour suivant
    const existingQuery = `
      SELECT id FROM candidates 
      WHERE registration_number = $1 
      AND round_id = $2 
      AND category_id = $3
    `;
    const existingResult = await pool.query(existingQuery, [
      candidate.registration_number,
      nextRound.id,
      candidate.category_id
    ]);
    
    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ce candidat est déjà inscrit au tour suivant'
      });
    }
    
    // 4. Mettre à jour le statut dans le tour actuel
    await pool.query(
      `UPDATE candidates SET status = 'qualified' WHERE id = $1`,
      [id]
    );
    
    // 5. Créer une nouvelle inscription pour le tour suivant
    const insertQuery = `
      INSERT INTO candidates (
        registration_number, 
        name, 
        category_id, 
        round_id, 
        status, 
        created_at
      ) VALUES ($1, $2, $3, $4, 'active', NOW())
      RETURNING *
    `;
    
    const newCandidateResult = await pool.query(insertQuery, [
      candidate.registration_number,
      candidate.name,
      candidate.category_id,
      nextRound.id
    ]);
    
    const newCandidate = newCandidateResult.rows[0];
    
    res.json({
      success: true,
      message: `Candidat qualifié pour le tour suivant: ${nextRound.name}`,
      data: {
        qualifiedCandidate: {
          id: newCandidate.id,
          name: newCandidate.name,
          registration_number: newCandidate.registration_number
        },
        nextRound: {
          id: nextRound.id,
          name: nextRound.name,
          order_index: nextRound.order_index
        }
      }
    });
    
  } catch (error) {
    console.error('Erreur qualification vers tour suivant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la qualification'
    });
  }
});

// Route pour qualifier plusieurs candidats en lot
router.post('/qualify-batch', authenticateAdmin, async (req, res) => {
  try {
    const { candidateIds } = req.body;
    
    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Liste de candidats invalide'
      });
    }
    
    const results = [];
    
    for (const candidateId of candidateIds) {
      try {
        // Récupérer le candidat
        const candidateQuery = `
          SELECT c.*, r.order_index as current_round_order 
          FROM candidates c 
          JOIN rounds r ON c.round_id = r.id 
          WHERE c.id = $1
        `;
        const candidateResult = await pool.query(candidateQuery, [candidateId]);
        
        if (candidateResult.rows.length === 0) {
          results.push({
            candidateId,
            success: false,
            error: 'Candidat non trouvé'
          });
          continue;
        }
        
        const candidate = candidateResult.rows[0];
        
        // Vérifier que le candidat a été noté par 3 jurys
        const scoresQuery = `
          SELECT COUNT(DISTINCT judge_id) as judge_count 
          FROM scores 
          WHERE candidate_id = $1
        `;
        const scoresResult = await pool.query(scoresQuery, [candidateId]);
        const judgeCount = parseInt(scoresResult.rows[0].judge_count) || 0;
        
        if (judgeCount < 3) {
          results.push({
            candidateId,
            success: false,
            error: `Seulement ${judgeCount}/3 jurys ont noté`
          });
          continue;
        }
        
        // Trouver le prochain tour
        const nextRoundQuery = `
          SELECT * FROM rounds 
          WHERE order_index = $1 
          ORDER BY order_index ASC 
          LIMIT 1
        `;
        const nextRoundResult = await pool.query(nextRoundQuery, [candidate.current_round_order + 1]);
        
        if (nextRoundResult.rows.length === 0) {
          results.push({
            candidateId,
            success: false,
            error: 'Aucun tour suivant disponible'
          });
          continue;
        }
        
        const nextRound = nextRoundResult.rows[0];
        
        // Vérifier si le candidat existe déjà dans le tour suivant
        const existingQuery = `
          SELECT id FROM candidates 
          WHERE registration_number = $1 
          AND round_id = $2 
          AND category_id = $3
        `;
        const existingResult = await pool.query(existingQuery, [
          candidate.registration_number,
          nextRound.id,
          candidate.category_id
        ]);
        
        if (existingResult.rows.length > 0) {
          // Mettre à jour le statut seulement
          await pool.query(
            `UPDATE candidates SET status = 'qualified' WHERE id = $1`,
            [candidateId]
          );
          
          results.push({
            candidateId,
            success: true,
            warning: 'Déjà inscrit au tour suivant, statut mis à jour seulement',
            nextRoundId: nextRound.id
          });
        } else {
          // Mettre à jour le statut et créer une nouvelle inscription
          await pool.query(
            `UPDATE candidates SET status = 'qualified' WHERE id = $1`,
            [candidateId]
          );
          
          await pool.query(
            `INSERT INTO candidates (
              registration_number, 
              name, 
              category_id, 
              round_id, 
              status, 
              created_at
            ) VALUES ($1, $2, $3, $4, 'active', NOW())`,
            [
              candidate.registration_number,
              candidate.name,
              candidate.category_id,
              nextRound.id
            ]
          );
          
          results.push({
            candidateId,
            success: true,
            nextRoundId: nextRound.id
          });
        }
        
      } catch (error) {
        console.error(`Erreur qualification candidat ${candidateId}:`, error);
        results.push({
          candidateId,
          success: false,
          error: error.message || 'Erreur inconnue'
        });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    res.json({
      success: true,
      message: `${successful} candidat(s) qualifié(s), ${failed} échec(s)`,
      data: {
        results,
        summary: {
          total: candidateIds.length,
          successful,
          failed
        }
      }
    });
    
  } catch (error) {
    console.error('Erreur qualification batch:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la qualification batch'
    });
  }
});

module.exports = router;