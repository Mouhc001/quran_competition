const pool = require('../config/database');

// backend/src/controllers/candidate.controller.js - AJOUTEZ ces méthodes :
// Dans candidate.controller.js, modifiez qualifyCandidateAuto
exports.qualifyCandidateAuto = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🎯 [qualifyCandidateAuto] Début - Candidat ID:', id);
    
    // 1. Récupérer le candidat avec son tour
    const candidateQuery = `
      SELECT c.*, r.order_index as current_round_order 
      FROM candidates c 
      JOIN rounds r ON c.round_id = r.id 
      WHERE c.id = $1
    `;
    const candidateResult = await pool.query(candidateQuery, [id]);
    
    if (candidateResult.rows.length === 0) {
      console.log('❌ [qualifyCandidateAuto] Candidat non trouvé');
      return res.status(404).json({
        success: false,
        message: 'Candidat non trouvé'
      });
    }
    
    const candidate = candidateResult.rows[0];
    console.log('✅ [qualifyCandidateAuto] Candidat trouvé:', {
      name: candidate.name,
      round_id: candidate.round_id,
      order_index: candidate.current_round_order
    });
    
    // 2. Appeler Round.findNextRound
    console.log('🔍 [qualifyCandidateAuto] Appel Round.findNextRound avec:', candidate.round_id);
    
    // IMPORTANT: Vérifiez l'import de Round
    const Round = require('../models/Round.model');
    
    const nextRound = await Round.findNextRound(candidate.round_id);
    
    console.log('📊 [qualifyCandidateAuto] Résultat findNextRound:', {
      trouvé: !!nextRound,
      nextRound: nextRound ? {
        id: nextRound.id,
        name: nextRound.name,
        order_index: nextRound.order_index
      } : null
    });
    
    if (!nextRound) {
      console.log('❌ [qualifyCandidateAuto] Aucun tour suivant trouvé');
      return res.status(400).json({
        success: false,
        message: 'Aucun tour suivant disponible',
        debug: {
          current_round_id: candidate.round_id,
          current_order_index: candidate.current_round_order,
          searched_order_index: candidate.current_round_order + 1
        }
      });
    }
    
    // ... reste du code ...
    
  } catch (error) {
    console.error('❌ [qualifyCandidateAuto] Erreur:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la qualification'
    });
  }
};

exports.qualifyCandidatesBatchAuto = async (req, res) => {
  try {
    const { candidateIds } = req.body;
    
    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Liste de candidats requise'
      });
    }
    
    console.log(`🎯 Qualification en lot: ${candidateIds.length} candidats`);
    
    const results = [];
    const errors = [];
    
    for (const candidateId of candidateIds) {
      try {
        // Utiliser la même logique que qualifyCandidateAuto
        const candidate = await Candidate.findById(candidateId);
        
        if (!candidate) {
          errors.push({ candidateId, error: 'Candidat non trouvé' });
          continue;
        }
        
        if (candidate.status === 'qualified') {
          errors.push({ candidateId, error: 'Déjà qualifié' });
          continue;
        }
        
        // Trouver le prochain tour
        const nextRoundResult = await pool.query(`
          SELECT r.* FROM rounds r 
          WHERE r.order_index = (
            SELECT order_index + 1 
            FROM rounds 
            WHERE id = $1
          )
        `, [candidate.round_id]);
        
        const nextRound = nextRoundResult.rows[0];
        
        if (!nextRound) {
          errors.push({ candidateId, error: 'Aucun tour suivant' });
          continue;
        }
        
        // Qualifier le candidat
        await pool.query(
          `UPDATE candidates 
           SET round_id = $1, status = 'active', updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [nextRound.id, candidateId]
        );
        
        // Marquer comme qualifié dans l'ancien tour
        await pool.query(
          `UPDATE candidates 
           SET status = 'qualified' 
           WHERE id = $1 AND round_id = $2`,
          [candidateId, candidate.round_id]
        );
        
        results.push({
          candidate_id: candidateId,
          candidate_name: candidate.name,
          new_round: nextRound.name,
          success: true
        });
        
      } catch (error) {
        errors.push({ candidateId, error: error.message });
      }
    }
    
    res.json({
      success: true,
      message: `${results.length} candidat(s) qualifié(s)`,
      data: {
        qualified: results,
        errors: errors
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur qualification en lot:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

exports.createCandidate = async (req, res) => {
  try {
    const { name, birth_date, phone, email, category_id, notes, status } = req.body;
    
    // 1. Trouver automatiquement le premier tour (order_index = 1)
    const firstRoundResult = await pool.query(
      `SELECT id FROM rounds WHERE order_index = 1 ORDER BY order_index ASC LIMIT 1`
    );
    
    if (firstRoundResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun tour disponible. Créez d\'abord un tour.'
      });
    }
    
    const firstRoundId = firstRoundResult.rows[0].id;
    
    // 2. Générer un numéro d'inscription automatique
    const registrationNumber = `CAN${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;
    
    // 3. Créer le candidat
    const query = `
      INSERT INTO candidates (
        registration_number,
        name,
        birth_date,
        phone,
        email,
        category_id,
        round_id,
        notes,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `;
    
    const values = [
      registrationNumber,
      name,
      birth_date || null,
      phone || null,
      email || null,
      category_id,
      firstRoundId, // Tour automatique
      notes || null,
      status || 'active'
    ];
    
    const result = await pool.query(query, values);
    const candidate = result.rows[0];
    
    // Récupérer les détails du tour pour la réponse
    const roundQuery = await pool.query(
      `SELECT name, order_index FROM rounds WHERE id = $1`,
      [firstRoundId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Candidat créé avec succès',
      data: {
        ...candidate,
        round: roundQuery.rows[0]
      }
    });
    
  } catch (error) {
    console.error('Erreur création candidat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};