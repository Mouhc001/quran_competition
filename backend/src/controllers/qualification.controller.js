// backend/controllers/qualification.controller.js - VERSION CORRIGÉE
import pool from '../config/database.js';

class QualificationController {
  // Dans qualification.controller.js, ajoutez des logs :
static async qualifyCandidate(req, res) {
  console.log('🎯 DÉBUT Qualification du candidat');
  
  try {
    const { candidateId } = req.params;
    const adminId = req.user?.id || 'system';
    
    console.log(`📋 Candidat ID: ${candidateId}`);
    console.log(`👤 Admin ID: ${adminId}`);
    
    // Récupérer le candidat
    const candidateQuery = `
      SELECT c.*, r.order_index, r.name as round_name
      FROM candidates c
      JOIN rounds r ON c.round_id = r.id
      WHERE c.id = $1
    `;
    
    const candidateResult = await pool.query(candidateQuery, [candidateId]);
    
    if (candidateResult.rows.length === 0) {
      console.log('❌ Candidat non trouvé');
      return res.status(404).json({
        success: false,
        message: 'Candidat non trouvé'
      });
    }
    
    const candidate = candidateResult.rows[0];
    console.log(`📊 Candidat trouvé: ${candidate.name}`);
    console.log(`📊 Tour actuel: ${candidate.round_name} (order: ${candidate.order_index})`);
    console.log(`📊 Statut actuel: ${candidate.status}`);
    
    // Vérifier si déjà qualifié
    if (candidate.status === 'qualified') {
      console.log('⚠️  Candidat déjà qualifié');
      return res.status(400).json({
        success: false,
        message: 'Candidat déjà qualifié'
      });
    }
    
    // Trouver le tour suivant
    console.log(`🔍 Recherche tour suivant pour order_index: ${candidate.order_index + 1}`);
    
    const nextRoundQuery = `
      SELECT * FROM rounds 
      WHERE order_index = $1 
      ORDER BY order_index ASC 
      LIMIT 1
    `;
    
    const nextRoundResult = await pool.query(nextRoundQuery, [candidate.order_index + 1]);
    
    if (nextRoundResult.rows.length === 0) {
      console.log('❌ Aucun tour suivant trouvé');
      // Juste mettre à jour le statut
      await pool.query(
        'UPDATE candidates SET status = $1 WHERE id = $2',
        ['qualified', candidateId]
      );
      
      return res.json({
        success: true,
        message: 'Candidat qualifié (dernier tour)',
        data: { qualified: true, next_round: null }
      });
    }
    
    const nextRound = nextRoundResult.rows[0];
    console.log(`✅ Tour suivant trouvé: ${nextRound.name} (ID: ${nextRound.id})`);
    
    // Générer un nouveau numéro d'inscription
const registrationNumber = await QualificationController.generateRegistrationNumberSimple(nextRound.id);    console.log(`📝 Nouveau numéro: ${registrationNumber}`);
    
    // Créer le clone
    const cloneQuery = `
      INSERT INTO candidates (
        registration_number,
        name,
        birth_date,
        phone,
        email,
        category_id,
        round_id,
        original_candidate_id,
        is_original,
        status,
        notes,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *
    `;
    
    console.log('🔄 Création du clone...');
    
    const cloneResult = await pool.query(cloneQuery, [
      registrationNumber,
      candidate.name,
      candidate.birth_date,
      candidate.phone,
      candidate.email,
      candidate.category_id,
      nextRound.id,
      candidate.id,
      false,
      'active',
      candidate.notes || null
    ]);
    
    const clonedCandidate = cloneResult.rows[0];
    console.log(`✅ Clone créé: ${clonedCandidate.id}`);
    
    // Mettre à jour le statut original
    await pool.query(
      'UPDATE candidates SET status = $1 WHERE id = $2',
      ['qualified', candidateId]
    );
    
    // Enregistrer dans candidate_progress
    const progressQuery = `
      INSERT INTO candidate_progress (
        candidate_id,
        from_round_id,
        to_round_id,
        qualified_by,
        notes
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    await pool.query(progressQuery, [
      candidate.id,
      candidate.round_id,
      nextRound.id,
      adminId,
      `Qualifié de ${candidate.round_name} vers ${nextRound.name}`
    ]);
    
    console.log('📝 Historique enregistré dans candidate_progress');
    console.log('✅ Qualification terminée avec succès!');
    
    res.json({
      success: true,
      message: `Candidat qualifié pour ${nextRound.name}`,
      data: {
        original_candidate: {
          id: candidate.id,
          name: candidate.name,
          status: 'qualified'
        },
        cloned_candidate: {
          id: clonedCandidate.id,
          registration_number: clonedCandidate.registration_number,
          round_id: clonedCandidate.round_id,
          round_name: nextRound.name
        }
      }
    });
    
  } catch (error) {
    console.error('❌ ERREUR Qualification:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la qualification'
    });
  }
}
  
// backend/controllers/qualification.controller.js
static async generateRegistrationNumberSimple(roundId) {
  try {
    // Récupérer tous les numéros d'inscription existants pour ce round
    const existingNumbersQuery = await pool.query(
      `SELECT registration_number FROM candidates WHERE round_id = $1 ORDER BY registration_number`,
      [roundId]
    );
    
    const existingNumbers = existingNumbersQuery.rows.map(row => row.registration_number);
    console.log('🔢 Numéros existants:', existingNumbers);
    
    const roundQuery = await pool.query(
      `SELECT order_index FROM rounds WHERE id = $1`,
      [roundId]
    );
    const roundOrder = roundQuery.rows[0]?.order_index || 1;
    const roundPrefix = `R${String(roundOrder).padStart(2, '0')}`;
    
    // Trouver le premier numéro disponible
    let nextNumber = 1;
    
    // Extraire les numéros existants
    const usedNumbers = [];
    existingNumbers.forEach(num => {
      const match = num.match(/R\d{2}-(\d{3})/);
      if (match) {
        usedNumbers.push(parseInt(match[1]));
      }
    });
    
    // Trier les numéros utilisés
    usedNumbers.sort((a, b) => a - b);
    console.log('🔢 Numéros utilisés triés:', usedNumbers);
    
    // Trouver le premier numéro disponible
    for (let i = 0; i < usedNumbers.length; i++) {
      if (usedNumbers[i] !== i + 1) {
        nextNumber = i + 1;
        break;
      }
      nextNumber = usedNumbers.length + 1;
    }
    
    const newNumber = `${roundPrefix}-${String(nextNumber).padStart(3, '0')}`;
    console.log(`🔢 Nouveau numéro généré: ${newNumber}`);
    
    return newNumber;
    
  } catch (error) {
    console.error('Erreur génération numéro:', error);
    // Fallback: utiliser timestamp
    return `TEMP-${Date.now()}`;
  }
}
  static async getCandidateHistory(req, res) {
    try {
      const { candidateId } = req.params;
      
      // Trouver le candidat original
      const candidateQuery = `
        SELECT 
          COALESCE(original_candidate_id, id) as original_id
        FROM candidates 
        WHERE id = $1
      `;
      
      const candidateResult = await pool.query(candidateQuery, [candidateId]);
      
      if (candidateResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Candidat non trouvé'
        });
      }
      
      const originalId = candidateResult.rows[0].original_id;
      
      const historyQuery = `
        SELECT 
          cp.*,
          r1.name as from_round_name,
          r2.name as to_round_name,
          a.name as qualified_by_name
        FROM candidate_progress cp
        JOIN rounds r1 ON cp.from_round_id = r1.id
        JOIN rounds r2 ON cp.to_round_id = r2.id
        LEFT JOIN admins a ON cp.qualified_by = a.id
        WHERE cp.candidate_id = $1
        ORDER BY cp.qualified_at DESC
      `;
      
      const result = await pool.query(historyQuery, [originalId]);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error) {
      console.error('Erreur récupération historique:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
  
  static async getRoundCandidatesWithHistory(req, res) {
    try {
      const { roundId } = req.params;
      
      const candidatesQuery = `
        WITH candidate_scores AS (
          SELECT 
            s.candidate_id,
            COUNT(DISTINCT s.judge_id) as judges_count,
            SUM(s.total_score) as total_score,
            ROUND(AVG(s.total_score), 2) as average_per_question
          FROM scores s
          WHERE s.round_id = $1
          GROUP BY s.candidate_id
        )
        SELECT 
          c.*,
          cat.name as category_name,
          COALESCE(cs.judges_count, 0) as judges_count,
          COALESCE(cs.total_score, 0) as total_score,
          COALESCE(cs.average_per_question, 0) as average_per_question,
          -- Info sur le candidat original
          oc.name as original_candidate_name,
          oc.registration_number as original_registration_number,
          -- Historique
          (
            SELECT json_agg(
              json_build_object(
                'from_round', r1.name,
                'to_round', r2.name,
                'qualified_at', cp.qualified_at,
                'status', cp.status
              )
            )
            FROM candidate_progress cp
            JOIN rounds r1 ON cp.from_round_id = r1.id
            JOIN rounds r2 ON cp.to_round_id = r2.id
            WHERE cp.candidate_id = COALESCE(c.original_candidate_id, c.id)
          ) as qualification_history
        FROM candidates c
        LEFT JOIN categories cat ON c.category_id = cat.id
        LEFT JOIN candidate_scores cs ON c.id = cs.candidate_id
        LEFT JOIN candidates oc ON c.original_candidate_id = oc.id
        WHERE c.round_id = $1
        ORDER BY COALESCE(cs.total_score, 0) DESC, c.name
      `;
      
      const result = await pool.query(candidatesQuery, [roundId]);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error) {
      console.error('Erreur récupération candidats:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
  
  static async qualifyCandidatesBatch(req, res) {
    const transaction = await pool.connect();
    
    try {
      await transaction.query('BEGIN');
      
      const { roundId } = req.params;
      const { candidateIds } = req.body;
      
      if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
        await transaction.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Liste de candidats requise'
        });
      }
      
      const results = [];
      const errors = [];
      
      for (const candidateId of candidateIds) {
        try {
          // Logique de qualification simplifiée pour le batch
          const candidateQuery = `
            SELECT c.*, r.order_index 
            FROM candidates c
            JOIN rounds r ON c.round_id = r.id
            WHERE c.id = $1 AND c.status = 'active'
          `;
          
          const candidateResult = await transaction.query(candidateQuery, [candidateId]);
          
          if (candidateResult.rows.length === 0) {
            errors.push({
              candidateId,
              error: 'Candidat actif non trouvé'
            });
            continue;
          }
          
          const candidate = candidateResult.rows[0];
          
          // Mettre à jour le statut
          await transaction.query(
            `UPDATE candidates SET status = 'qualified' WHERE id = $1`,
            [candidateId]
          );
          
          results.push({
            candidateId,
            candidateName: candidate.name,
            success: true
          });
          
        } catch (error) {
          errors.push({
            candidateId,
            error: error.message
          });
        }
      }
      
      await transaction.query('COMMIT');
      
      res.json({
        success: true,
        message: `Traitement de ${candidateIds.length} candidats`,
        data: {
          qualified: results.length,
          failed: errors.length,
          results,
          errors
        }
      });
      
    } catch (error) {
      await transaction.query('ROLLBACK');
      console.error('Erreur qualification batch:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    } finally {
      transaction.release();
    }
  }
  
  // Nouvelle méthode pour qualifier automatiquement les candidats notés
  static async qualifyCandidatesAuto(req, res) {
    const transaction = await pool.connect();
    
    try {
      await transaction.query('BEGIN');
      
      const { candidate_ids } = req.body;
      
      if (!candidate_ids || !Array.isArray(candidate_ids)) {
        await transaction.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Liste de candidats requise'
        });
      }
      
      const results = [];
      
      for (const candidateId of candidate_ids) {
        try {
          // Appeler la logique de qualification pour chaque candidat
          req.params = { candidateId };
          req.user = req.user;
          
          // Note: Cette méthode devrait être refactorisée pour éviter la duplication
          // Pour l'instant, on fait une qualification simple
          
          const candidateQuery = `
            SELECT c.*, r.order_index 
            FROM candidates c
            JOIN rounds r ON c.round_id = r.id
            WHERE c.id = $1
          `;
          
          const candidateResult = await transaction.query(candidateQuery, [candidateId]);
          
          if (candidateResult.rows.length === 0) {
            continue;
          }
          
          const candidate = candidateResult.rows[0];
          
          // Vérifier si le candidat a au moins 3 notes
          const scoresQuery = `
            SELECT COUNT(DISTINCT judge_id) as judges_count
            FROM scores 
            WHERE candidate_id = $1 AND round_id = $2
          `;
          
          const scoresResult = await transaction.query(scoresQuery, [candidateId, candidate.round_id]);
          const judgesCount = parseInt(scoresResult.rows[0].judges_count) || 0;
          
          if (judgesCount >= 3) {
            // Qualifier le candidat
            await this.qualifySingleCandidate(transaction, candidateId, req.user?.id);
            results.push({
              candidateId,
              success: true,
              message: 'Qualifié automatiquement'
            });
          } else {
            results.push({
              candidateId,
              success: false,
              message: `Seulement ${judgesCount}/3 jurys`
            });
          }
          
        } catch (error) {
          results.push({
            candidateId,
            success: false,
            error: error.message
          });
        }
      }
      
      await transaction.query('COMMIT');
      
      const successful = results.filter(r => r.success).length;
      
      res.json({
        success: true,
        message: `${successful} candidat(s) qualifié(s) sur ${candidate_ids.length}`,
        data: results
      });
      
    } catch (error) {
      await transaction.query('ROLLBACK');
      console.error('Erreur qualification auto:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    } finally {
      transaction.release();
    }
  }
  
  // Méthode helper pour qualifier un seul candidat
  static async qualifySingleCandidate(transaction, candidateId, adminId = 'system') {
    // Implémentation simplifiée pour la qualification auto
    const candidateQuery = `
      SELECT c.*, r.order_index 
      FROM candidates c
      JOIN rounds r ON c.round_id = r.id
      WHERE c.id = $1
    `;
    
    const candidateResult = await transaction.query(candidateQuery, [candidateId]);
    
    if (candidateResult.rows.length === 0) {
      throw new Error('Candidat non trouvé');
    }
    
    const candidate = candidateResult.rows[0];
    
    // Trouver le tour suivant
    const nextRoundQuery = `
      SELECT * FROM rounds 
      WHERE order_index = $1 
      LIMIT 1
    `;
    
    const nextRoundResult = await transaction.query(nextRoundQuery, [candidate.order_index + 1]);
    
    if (nextRoundResult.rows.length > 0) {
      const nextRound = nextRoundResult.rows[0];
      
      // Créer un clone
      const cloneQuery = `
        INSERT INTO candidates (
          registration_number,
          name,
          category_id,
          round_id,
          original_candidate_id,
          is_original,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      await transaction.query(cloneQuery, [
        `AUTO-${candidate.registration_number}`,
        candidate.name,
        candidate.category_id,
        nextRound.id,
        candidate.original_candidate_id || candidate.id,
        false,
        'active'
      ]);
    }
    
    // Mettre à jour le statut
    await transaction.query(
      `UPDATE candidates SET status = 'qualified' WHERE id = $1`,
      [candidateId]
    );
  }


  // backend/controllers/qualification.controller.js
// Modifiez la partie d'enregistrement dans l'historique pour les clones
static async updateCandidateStatus(req, res) {
  console.log('🔄 DÉBUT Mise à jour statut du candidat');
  
  try {
    const { candidateId } = req.params;
    const { status } = req.body;
    const adminId = req.user?.id || 'system';
    
    console.log(`📋 Candidat ID: ${candidateId}`);
    console.log(`📊 Nouveau statut: ${status}`);
    
    // Récupérer le candidat avec toutes ses infos
    const candidateQuery = `
      SELECT 
        c.*, 
        r.order_index,
        r.name as round_name,
        c.original_candidate_id
      FROM candidates c
      JOIN rounds r ON c.round_id = r.id
      WHERE c.id = $1
    `;
    
    const candidateResult = await pool.query(candidateQuery, [candidateId]);
    
    if (candidateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Candidat non trouvé'
      });
    }
    
    const candidate = candidateResult.rows[0];
    const oldStatus = candidate.status;
    console.log(`📊 Ancien statut: ${oldStatus}`);
    
    // Si le statut ne change pas, rien à faire
    if (oldStatus === status) {
      return res.json({
        success: true,
        message: 'Statut inchangé'
      });
    }
    
    // Initialiser les variables pour les clones
    let clonesCount = 0;
    
    // Logique spéciale quand on passe de "qualified" à autre chose
    if (oldStatus === 'qualified' && status !== 'qualified') {
      console.log('⚠️  Passage de "qualified" à autre chose - Recherche des clones...');
      
      // Trouver tous les clones créés par ce candidat
      const findClonesQuery = `
        WITH RECURSIVE find_clones AS (
          SELECT id, original_candidate_id, round_id, registration_number
          FROM candidates 
          WHERE id = $1 OR original_candidate_id = $1
          
          UNION ALL
          
          SELECT c.id, c.original_candidate_id, c.round_id, c.registration_number
          FROM candidates c
          INNER JOIN find_clones fc ON c.original_candidate_id = fc.id
        )
        SELECT * FROM find_clones WHERE id != $1
      `;
      
      const clonesResult = await pool.query(findClonesQuery, [candidateId]);
      const clones = clonesResult.rows;
      clonesCount = clones.length;
      
      console.log(`🔍 ${clonesCount} clone(s) trouvé(s)`);
      
      if (clonesCount > 0) {
        const cloneIds = clones.map(clone => clone.id);
        
        // 1. D'abord, supprimez les entrées de candidate_progress liées aux clones
        const deleteProgressQuery = `
          DELETE FROM candidate_progress 
          WHERE candidate_id = ANY($1::uuid[])
            OR (candidate_id = $2 AND to_round_id IN (
              SELECT round_id FROM candidates WHERE id = ANY($1::uuid[])
            ))
        `;
        
        await pool.query(deleteProgressQuery, [cloneIds, candidate.id]);
        console.log(`🗑️  Entrées candidate_progress supprimées pour les clones`);
        
        // 2. Ensuite, supprimez les clones
        const deleteClonesQuery = `
          DELETE FROM candidates 
          WHERE id = ANY($1::uuid[])
          RETURNING id, registration_number, round_id
        `;
        
        const deleteResult = await pool.query(deleteClonesQuery, [cloneIds]);
        
        console.log(`🗑️  ${deleteResult.rows.length} clone(s) supprimé(s):`);
        deleteResult.rows.forEach(clone => {
          console.log(`   - ${clone.registration_number} (ID: ${clone.id})`);
        });
      }
    }
    
    // Mettre à jour le statut du candidat
    const updateQuery = `
      UPDATE candidates 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const updateResult = await pool.query(updateQuery, [status, candidateId]);
    const updatedCandidate = updateResult.rows[0];
    
    console.log(`✅ Statut mis à jour de "${oldStatus}" à "${status}"`);
    
    // CORRECTION : Vérifiez si une entrée existe déjà pour ce (candidate_id, to_round_id)
    const checkExistingQuery = `
      SELECT id FROM candidate_progress 
      WHERE candidate_id = $1 AND to_round_id = $2
    `;
    
    const existingResult = await pool.query(checkExistingQuery, [
      candidateId,
      candidate.round_id  // to_round_id = tour actuel
    ]);
    
    if (existingResult.rows.length > 0) {
      // Mettre à jour l'entrée existante
      console.log('📝 Mise à jour entrée existante dans candidate_progress');
      const updateProgressQuery = `
        UPDATE candidate_progress 
        SET 
          notes = CONCAT(COALESCE(notes, ''), ' | Statut changé de "${oldStatus}" à "${status}" le ', NOW()),
          status = $1,
          qualified_at = NOW()
        WHERE candidate_id = $2 AND to_round_id = $3
      `;
      
      await pool.query(updateProgressQuery, [
        status,
        candidateId,
        candidate.round_id
      ]);
    } else {
      // Créer une nouvelle entrée
      console.log('📝 Création nouvelle entrée dans candidate_progress');
      const historyQuery = `
        INSERT INTO candidate_progress (
          candidate_id,
          from_round_id,
          to_round_id,
          qualified_by,
          notes,
          status,
          qualified_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `;
      
      await pool.query(historyQuery, [
        candidateId,
        candidate.round_id,
        candidate.round_id,
        adminId,
        `Statut changé de "${oldStatus}" à "${status}"`,
        status
      ]);
    }
    
    res.json({
      success: true,
      message: `Statut mis à jour: ${status}`,
      data: {
        candidate: updatedCandidate,
        clones_deleted: clonesCount
      }
    });
    
  } catch (error) {
    console.error('❌ ERREUR mise à jour statut:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour du statut'
    });
  }
}
}


export default QualificationController;