const express = require('express');
const router = express.Router();
const Round = require('../models/Round.model');
const { authenticateAdmin } = require('../middleware/auth.middleware.js');

// Route pour récupérer tous les tours
router.get('/', async (req, res) => {
  try {
    const rounds = await Round.findAll();
    res.json({
      success: true,
      data: rounds
    });
  } catch (error) {
    console.error('Erreur récupération tours:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// IMPORTANT : Cette route doit être AVANT la route '/:id'
// Route pour récupérer le tour actif
router.get('/active', async (req, res) => {
  try {
    const activeRound = await Round.findActive();
    
    if (!activeRound) {
      return res.status(404).json({
        success: false,
        message: 'Aucun tour actif'
      });
    }

    res.json({
      success: true,
      data: activeRound
    });
  } catch (error) {
    console.error('Erreur récupération tour actif:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route pour récupérer un tour par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const round = await Round.findById(id);
    
    if (!round) {
      return res.status(404).json({
        success: false,
        message: 'Tour non trouvé'
      });
    }

    res.json({
      success: true,
      data: round
    });
  } catch (error) {
    console.error('Erreur récupération tour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Routes admin protégées
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const round = await Round.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Tour créé avec succès',
      data: round
    });
  } catch (error) {
    console.error('Erreur création tour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const round = await Round.update(id, req.body);
    
    if (!round) {
      return res.status(404).json({
        success: false,
        message: 'Tour non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Tour mis à jour avec succès',
      data: round
    });
  } catch (error) {
    console.error('Erreur mise à jour tour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const round = await Round.delete(id);
    
    if (!round) {
      return res.status(404).json({
        success: false,
        message: 'Tour non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Tour supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression tour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route pour activer un tour
router.post('/:id/activate', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const round = await Round.activate(id);
    
    if (!round) {
      return res.status(404).json({
        success: false,
        message: 'Tour non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Tour activé avec succès',
      data: round
    });
  } catch (error) {
    console.error('Erreur activation tour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Dans round.routes.js, modifiez la route /:id/next :
router.get('/:id/next', async (req, res) => {
  console.log('=== ROUTE /api/rounds/:id/next APPELÉE ===');
  console.log('ID reçu:', req.params.id);
  console.log('URL complète:', req.originalUrl);
  
  try {
    const { id } = req.params;
    
    console.log('🔍 Appel de Round.findNextRound avec id:', id);
    
    const nextRound = await Round.findNextRound(id);
    
    console.log('📊 Résultat de findNextRound:', nextRound ? nextRound.name : 'null');
    
    if (!nextRound) {
      console.log('❌ Aucun tour suivant trouvé');
      return res.json({
        success: true,
        data: null,
        message: 'Aucun tour suivant disponible'
      });
    }

    console.log('✅ Tour suivant trouvé:', {
      id: nextRound.id,
      name: nextRound.name,
      order_index: nextRound.order_index
    });
    
    res.json({
      success: true,
      data: nextRound
    });
  } catch (error) {
    console.error('❌ Erreur dans /api/rounds/:id/next:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Optionnel: Route pour récupérer le tour précédent
router.get('/:id/previous', async (req, res) => {
  try {
    const { id } = req.params;
    const previousRound = await Round.findPreviousRound(id);
    
    if (!previousRound) {
      return res.json({
        success: true,
        data: null,
        message: 'Aucun tour précédent disponible'
      });
    }

    res.json({
      success: true,
      data: previousRound
    });
  } catch (error) {
    console.error('Erreur récupération tour précédent:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Optionnel: Route pour récupérer les tours avant/après
router.get('/:id/surrounding', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [current, previous, next] = await Promise.all([
      Round.findById(id),
      Round.findPreviousRound(id),
      Round.findNextRound(id)
    ]);
    
    res.json({
      success: true,
      data: {
        current,
        previous,
        next
      }
    });
  } catch (error) {
    console.error('Erreur récupération tours environnants:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});


// Route pour copier les qualifiés d'un tour vers un autre
router.post('/copy-qualified', authenticateAdmin, async (req, res) => {
  try {
    const { sourceRoundId, targetRoundId } = req.body;

    // 1. Vérifier que les tours existent
    const sourceRound = await Round.findById(sourceRoundId);
    const targetRound = await Round.findById(targetRoundId);
    
    if (!sourceRound || !targetRound) {
      return res.status(404).json({
        success: false,
        message: 'Tour source ou cible non trouvé'
      });
    }

    // 2. Vérifier que le tour cible est vide
    const existingCandidatesQuery = `
      SELECT COUNT(*) as count FROM candidates WHERE round_id = $1
    `;
    const existingResult = await pool.query(existingCandidatesQuery, [targetRoundId]);
    
    if (parseInt(existingResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Le tour cible contient déjà des candidats'
      });
    }

    // 3. Récupérer tous les candidats qualifiés du tour source
    const qualifiedQuery = `
      SELECT DISTINCT ON (c.registration_number) 
        c.registration_number,
        c.name,
        c.category_id
      FROM candidates c
      WHERE c.round_id = $1 
        AND c.status = 'qualified'
      ORDER BY c.registration_number, c.created_at DESC
    `;
    
    const qualifiedResult = await pool.query(qualifiedQuery, [sourceRoundId]);
    const qualifiedCandidates = qualifiedResult.rows;

    if (qualifiedCandidates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun candidat qualifié dans le tour source'
      });
    }

    // 4. Insérer les qualifiés dans le tour cible
    const insertedCandidates = [];
    
    for (const candidate of qualifiedCandidates) {
      const insertQuery = `
        INSERT INTO candidates (
          registration_number,
          name,
          category_id,
          round_id,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, 'active', NOW())
        RETURNING id, registration_number, name
      `;
      
      const insertResult = await pool.query(insertQuery, [
        candidate.registration_number,
        candidate.name,
        candidate.category_id,
        targetRoundId
      ]);
      
      insertedCandidates.push(insertResult.rows[0]);
    }

    res.json({
      success: true,
      message: `${insertedCandidates.length} candidat(s) qualifié(s) copié(s) vers le nouveau tour`,
      data: {
        sourceRound: sourceRound.name,
        targetRound: targetRound.name,
        candidatesCount: insertedCandidates.length,
        candidates: insertedCandidates.slice(0, 10) // Retourner les 10 premiers pour préview
      }
    });

  } catch (error) {
    console.error('Erreur copie qualifiés:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la copie des qualifiés'
    });
  }
});

// Route pour récupérer les candidats qualifiés d'un tour
router.get('/:id/qualified-candidates', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        c.id,
        c.registration_number,
        c.name,
        cat.name as category_name,
        c.status,
        s.total_score,
        s.judges_count
      FROM candidates c
      JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN (
        SELECT 
          candidate_id,
          SUM(score) as total_score,
          COUNT(DISTINCT judge_id) as judges_count
        FROM scores 
        GROUP BY candidate_id
      ) s ON c.id = s.candidate_id
      WHERE c.round_id = $1 
        AND c.status = 'qualified'
      ORDER BY c.name
    `;
    
    const result = await pool.query(query, [id]);
    
    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Erreur récupération qualifiés:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route pour initialiser automatiquement un nouveau tour avec les qualifiés du précédent
router.post('/:id/initialize-from-previous', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const targetRound = await Round.findById(id);
    
    if (!targetRound) {
      return res.status(404).json({
        success: false,
        message: 'Tour non trouvé'
      });
    }

    // 1. Trouver le tour précédent
    const previousRound = await Round.findPreviousRound(id);
    
    if (!previousRound) {
      return res.status(400).json({
        success: false,
        message: 'Aucun tour précédent trouvé (ceci doit être le tour #1)'
      });
    }

    // 2. Vérifier que le tour cible est vide
    const existingCandidatesQuery = `
      SELECT COUNT(*) as count FROM candidates WHERE round_id = $1
    `;
    const existingResult = await pool.query(existingCandidatesQuery, [id]);
    
    if (parseInt(existingResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Le tour contient déjà des candidats'
      });
    }

    // 3. Copier les qualifiés du tour précédent
    const qualifiedQuery = `
      SELECT DISTINCT ON (c.registration_number) 
        c.registration_number,
        c.name,
        c.category_id
      FROM candidates c
      WHERE c.round_id = $1 
        AND c.status = 'qualified'
      ORDER BY c.registration_number, c.created_at DESC
    `;
    
    const qualifiedResult = await pool.query(qualifiedQuery, [previousRound.id]);
    const qualifiedCandidates = qualifiedResult.rows;

    if (qualifiedCandidates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun candidat qualifié dans le tour précédent'
      });
    }

    // 4. Insérer dans le nouveau tour
    const insertedCandidates = [];
    
    for (const candidate of qualifiedCandidates) {
      const insertQuery = `
        INSERT INTO candidates (
          registration_number,
          name,
          category_id,
          round_id,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, 'active', NOW())
        RETURNING id, registration_number, name
      `;
      
      const insertResult = await pool.query(insertQuery, [
        candidate.registration_number,
        candidate.name,
        candidate.category_id,
        id
      ]);
      
      insertedCandidates.push(insertResult.rows[0]);
    }

    res.json({
      success: true,
      message: `Tour initialisé avec ${insertedCandidates.length} candidat(s) qualifié(s) du tour précédent`,
      data: {
        previousRound: previousRound.name,
        targetRound: targetRound.name,
        candidatesCount: insertedCandidates.length
      }
    });

  } catch (error) {
    console.error('Erreur initialisation tour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'initialisation du tour'
    });
  }
});


module.exports = router;