import pool from '../config/database.js';
import Round from '../models/Round.model.js';
import Candidate from '../models/Candidate.model.js';

// qualifyCandidateAuto
export const qualifyCandidateAuto = async (req, res) => {
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
    
    // 2. Trouver le prochain tour
    const nextRoundQuery = await pool.query(`
      SELECT * FROM rounds 
      WHERE order_index = $1
    `, [candidate.current_round_order + 1]);
    
    const nextRound = nextRoundQuery.rows[0];
    
    console.log('📊 [qualifyCandidateAuto] Résultat:', {
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
    
    // 3. Créer un clone du candidat pour le prochain tour
    const cloneResult = await pool.query(
      `INSERT INTO candidates (
        registration_number, name, birth_date, phone, email,
        category_id, round_id, notes, status, is_original,
        original_candidate_id, created_at
      ) SELECT 
        registration_number || '-R' || $1, name, birth_date, phone, email,
        category_id, $2, notes, 'active', false, $3, NOW()
      FROM candidates WHERE id = $3
      RETURNING *`,
      [nextRound.order_index, nextRound.id, id]
    );
    
    // 4. Marquer l'original comme qualifié
    await pool.query(
      `UPDATE candidates SET status = 'qualified' WHERE id = $1`,
      [id]
    );
    
    res.json({
      success: true,
      message: `Candidat qualifié pour le tour ${nextRound.name}`,
      data: {
        original: { ...candidate, status: 'qualified' },
        clone: cloneResult.rows[0],
        next_round: nextRound
      }
    });
    
  } catch (error) {
    console.error('❌ [qualifyCandidateAuto] Erreur:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la qualification'
    });
  }
};

// qualifyCandidatesBatchAuto
export const qualifyCandidatesBatchAuto = async (req, res) => {
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
        const candidateQuery = await pool.query(
          'SELECT * FROM candidates WHERE id = $1',
          [candidateId]
        );
        
        const candidate = candidateQuery.rows[0];
        
        if (!candidate) {
          errors.push({ candidateId, error: 'Candidat non trouvé' });
          continue;
        }
        
        if (candidate.status === 'qualified') {
          errors.push({ candidateId, error: 'Déjà qualifié' });
          continue;
        }
        
        const roundQuery = await pool.query(
          `SELECT r.* FROM rounds r 
           WHERE r.order_index = (
             SELECT order_index + 1 
             FROM rounds 
             WHERE id = $1
           )`,
          [candidate.round_id]
        );
        
        const nextRound = roundQuery.rows[0];
        
        if (!nextRound) {
          errors.push({ candidateId, error: 'Aucun tour suivant' });
          continue;
        }
        
        await pool.query(
          `INSERT INTO candidates (
            registration_number, name, birth_date, phone, email,
            category_id, round_id, notes, status, is_original,
            original_candidate_id
          ) SELECT 
            registration_number || '-R' || $1, name, birth_date, phone, email,
            category_id, $2, notes, 'active', false, $3
          FROM candidates WHERE id = $3`,
          [nextRound.order_index, nextRound.id, candidateId]
        );
        
        await pool.query(
          `UPDATE candidates SET status = 'qualified' WHERE id = $1`,
          [candidateId]
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

// createCandidate
export const createCandidate = async (req, res) => {
  try {
    const { name, birth_date, phone, email, category_id, notes, status } = req.body;
    
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
    const registrationNumber = `CAN${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;
    
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
      firstRoundId,
      notes || null,
      status || 'active'
    ];
    
    const result = await pool.query(query, values);
    const candidate = result.rows[0];
    
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