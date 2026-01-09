// backend/src/models/Round.model.js
const pool = require('../config/database');

class Round {
  static async create(data) {
    const { name, description = '', is_active = false } = data;
    
    // Calculer l'ordre automatiquement si non fourni
    let order_index = data.order_index;
    if (!order_index) {
      const orderQuery = await pool.query('SELECT COALESCE(MAX(order_index), 0) as max_order FROM rounds');
      order_index = orderQuery.rows[0].max_order + 1;
    }
    
    const result = await pool.query(
      `INSERT INTO rounds (name, description, is_active, order_index) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, description, is_active, order_index]
    );
    
    return result.rows[0];
  }
  
  static async update(id, data) {
    const { name, description, is_active, order_index } = data;
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      values.push(is_active);
      paramCount++;
    }
    
    if (order_index !== undefined) {
      updates.push(`order_index = $${paramCount}`);
      values.push(order_index);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return null;
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const result = await pool.query(
      `UPDATE rounds 
       SET ${updates.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING *`,
      values
    );
    
    return result.rows[0] || null;
  }
  
  static async findAll() {
    const result = await pool.query(`
      SELECT r.*, 
             COUNT(c.id) as candidates_count
      FROM rounds r
      LEFT JOIN candidates c ON r.id = c.round_id
      GROUP BY r.id
      ORDER BY r.order_index
    `);
    return result.rows;
  }
  
  static async findById(id) {
    const result = await pool.query(`
      SELECT r.*, 
             COUNT(c.id) as candidates_count
      FROM rounds r
      LEFT JOIN candidates c ON r.id = c.round_id
      WHERE r.id = $1
      GROUP BY r.id
    `, [id]);
    return result.rows[0] || null;
  }
  
  static async delete(id) {
  try {
    // Commencer par vérifier s'il existe des candidats
    const candidatesCheck = await pool.query(
      'SELECT COUNT(*) FROM candidates WHERE round_id = $1',
      [id]
    );
    
    const candidatesCount = parseInt(candidatesCheck.rows[0].count);
    if (candidatesCount > 0) {
      throw new Error(`Ce tour contient ${candidatesCount} candidat(s). Déplacez-les d'abord.`);
    }
    
    // Vérifier s'il existe des scores pour ce tour
    const scoresCheck = await pool.query(
      'SELECT COUNT(*) FROM scores WHERE round_id = $1',
      [id]
    );
    
    const scoresCount = parseInt(scoresCheck.rows[0].count);
    if (scoresCount > 0) {
      throw new Error(`Ce tour contient ${scoresCount} score(s). Supprimez-les d'abord.`);
    }
    
    // Supprimer le tour
    const result = await pool.query(
      'DELETE FROM rounds WHERE id = $1 RETURNING *',
      [id]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Delete round error in model:', error);
    throw error;
  }
}
  
  static async findActive() {
    const result = await pool.query(`
      SELECT r.*, 
             COUNT(c.id) as candidates_count
      FROM rounds r
      LEFT JOIN candidates c ON r.id = c.round_id
      WHERE r.is_active = true
      GROUP BY r.id
      LIMIT 1
    `);
    return result.rows[0] || null;
  }


  // Dans Round.model.js, modifiez findNextRound :
static async findNextRound(currentRoundId) {
  try {
    console.log('🔍 [findNextRound] Début - ID tour actuel:', currentRoundId);
    
    // Récupérer l'order_index du tour actuel
    const currentRound = await this.findById(currentRoundId);
    
    if (!currentRound) {
      console.log('❌ [findNextRound] Tour actuel non trouvé');
      throw new Error('Tour actuel non trouvé');
    }
    
    console.log('✅ [findNextRound] Tour actuel trouvé:', {
      id: currentRound.id,
      name: currentRound.name,
      order_index: currentRound.order_index
    });
    
    // Trouver le tour suivant (order_index + 1)
    console.log('🔍 [findNextRound] Recherche tour avec order_index:', currentRound.order_index + 1);
    
    const result = await pool.query(
      `SELECT * FROM rounds 
       WHERE order_index = $1 
       ORDER BY order_index ASC 
       LIMIT 1`,
      [currentRound.order_index + 1]
    );
    
    console.log('📊 [findNextRound] Résultat requête:', {
      rowsCount: result.rows.length,
      foundTour: result.rows[0] ? {
        id: result.rows[0].id,
        name: result.rows[0].name,
        order_index: result.rows[0].order_index
      } : null
    });
    
    // DEBUG: Afficher tous les tours
    const allRounds = await pool.query('SELECT id, name, order_index FROM rounds ORDER BY order_index');
    console.log('📋 [findNextRound] Tous les tours:', allRounds.rows);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ [findNextRound] Erreur:', error);
    throw error;
  }
}

  // Activer le tour suivant
  static async activateNextRound(currentRoundId) {
    try {
      // Désactiver tous les tours
      await pool.query('UPDATE rounds SET is_active = false');
      
      // Activer le prochain tour
      const nextRound = await this.findNextRound(currentRoundId);
      
      if (nextRound) {
        await pool.query(
          'UPDATE rounds SET is_active = true WHERE id = $1',
          [nextRound.id]
        );
      }
      
      return nextRound;
    } catch (error) {
      console.error('Erreur activateNextRound:', error);
      throw error;
    }
  }

  // Obtenir tous les tours après un certain tour
  static async getRoundsAfter(currentRoundId) {
    try {
      const currentRound = await this.findById(currentRoundId);
      
      const result = await pool.query(
        `SELECT * FROM rounds 
         WHERE order_index > $1 
         ORDER BY order_index ASC`,
        [currentRound.order_index]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Erreur getRoundsAfter:', error);
      throw error;
    }
  }

  // Vérifier si un tour a des candidats actifs
  static async hasActiveCandidates(roundId) {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) FROM candidates 
         WHERE round_id = $1 AND status = 'active'`,
        [roundId]
      );
      
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('Erreur hasActiveCandidates:', error);
      throw error;
    }
  }

  // Obtenir les statistiques du tour
  static async getRoundStats(roundId) {
    try {
      const result = await pool.query(`
        SELECT 
          -- Total candidats
          COUNT(c.id) as total_candidates,
          -- Candidats notés
          COUNT(DISTINCT s.candidate_id) as scored_candidates,
          -- Candidats qualifiés
          SUM(CASE WHEN c.status = 'qualified' THEN 1 ELSE 0 END) as qualified_candidates,
          -- Candidats actifs
          SUM(CASE WHEN c.status = 'active' THEN 1 ELSE 0 END) as active_candidates,
          -- Moyenne des scores
          COALESCE(ROUND(AVG(s.total_score), 2), 0) as average_score
        FROM candidates c
        LEFT JOIN scores s ON c.id = s.candidate_id AND s.round_id = $1
        WHERE c.round_id = $1
      `, [roundId]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Erreur getRoundStats:', error);
      throw error;
    }
  }

static async findNextRound(currentRoundId) {
  try {
    // Récupérer l'order_index du tour actuel
    const currentRound = await this.findById(currentRoundId);
    if (!currentRound) {
      return null;
    }

    // Trouver le tour avec l'order_index suivant
    const query = `
      SELECT * FROM rounds 
      WHERE order_index = $1 
      ORDER BY order_index ASC 
      LIMIT 1
    `;
    const values = [currentRound.order_index + 1];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Erreur recherche prochain tour:', error);
    throw error;
  }
}

// Optionnel: méthode pour récupérer le tour précédent
static async findPreviousRound(currentRoundId) {
  try {
    const currentRound = await this.findById(currentRoundId);
    if (!currentRound) {
      return null;
    }

    const query = `
      SELECT * FROM rounds 
      WHERE order_index = $1 
      ORDER BY order_index DESC 
      LIMIT 1
    `;
    const values = [currentRound.order_index - 1];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Erreur recherche tour précédent:', error);
    throw error;
  }
}
// backend/src/models/Round.model.js

static async findPreviousRound(currentRoundId) {
  try {
    // Récupérer l'order_index du tour actuel
    const currentRound = await this.findById(currentRoundId);
    if (!currentRound) {
      return null;
    }

    // Trouver le tour avec l'order_index précédent
    const query = `
      SELECT * FROM rounds 
      WHERE order_index = $1 
      ORDER BY order_index DESC 
      LIMIT 1
    `;
    const values = [currentRound.order_index - 1];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Erreur recherche tour précédent:', error);
    throw error;
  }
}
}
module.exports = Round;