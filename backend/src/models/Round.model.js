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
}

module.exports = Round;