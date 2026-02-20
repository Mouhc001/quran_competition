import { query } from '../config/database.js';

class Judge {
  static async findAll() {
    const result = await query(
      'SELECT id, code, name, is_active, created_at FROM judges ORDER BY code'
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await query('SELECT * FROM judges WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByCode(code) {
    const result = await query('SELECT * FROM judges WHERE code = $1', [code.toUpperCase()]);
    return result.rows[0];
  }

  static async create(judgeData) {
    const { code, name } = judgeData;
    
    const result = await query(
      'INSERT INTO judges (code, name) VALUES ($1, $2) RETURNING *',
      [code.toUpperCase(), name]
    );
    
    return result.rows[0];
  }

  static async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    const setClause = fields.map((field, index) => 
      `${field} = $${index + 2}`
    ).join(', ');
    
    const result = await query(
      `UPDATE judges SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    
    return result.rows[0];
  }

  static async updateLastLogin(id) {
    try {
      // Vérifier si la colonne existe
      const check = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'judges' AND column_name = 'last_login'
      `);
      
      if (check.rows.length === 0) {
        console.log('⚠️  Colonne last_login non trouvée, création...');
        await query(`
          ALTER TABLE judges 
          ADD COLUMN last_login TIMESTAMP DEFAULT NULL
        `);
      }
      
      const result = await query(
        'UPDATE judges SET last_login = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Erreur updateLastLogin:', error);
      // Retourner le jury même si last_login échoue
      return this.findById(id);
    }
  }


  static async delete(id) {
    await query('DELETE FROM judges WHERE id = $1', [id]);
    return true;
  }

  static async activate(id) {
    const result = await query(
      'UPDATE judges SET is_active = true WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async deactivate(id) {
    const result = await query(
      'UPDATE judges SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  // Dans Judge.model.js - ajouter ces méthodes à la fin de la classe

// Assigner un jury à une catégorie pour un tour
static async assignToCategory(judgeId, categoryId, roundId, adminId) {
  console.log('📡 Judge.assignToCategory appelé:', { judgeId, categoryId, roundId, adminId });
  try {
    const result = await query(
      `INSERT INTO judge_category_assignments (judge_id, category_id, round_id, assigned_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (judge_id, category_id, round_id) DO NOTHING
       RETURNING *`,
      [judgeId, categoryId, roundId, adminId]
    );
    console.log('✅ Résultat assignToCategory:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Erreur dans assignToCategory:', error);
    throw error;
  }
}

// Retirer un jury d'une catégorie
static async removeFromCategory(judgeId, categoryId, roundId) {
  console.log('📡 Judge.removeFromCategory appelé:', { judgeId, categoryId, roundId });
  try {
    await query(
      `DELETE FROM judge_category_assignments 
       WHERE judge_id = $1 AND category_id = $2 AND round_id = $3`,
      [judgeId, categoryId, roundId]
    );
    console.log('✅ Jury retiré avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur dans removeFromCategory:', error);
    throw error;
  }
}

// Récupérer toutes les catégories assignées à un jury pour un tour
static async getCategoriesForJudge(judgeId, roundId) {
  console.log('📡 Judge.getCategoriesForJudge appelé:', { judgeId, roundId });
  try {
    const result = await query(
      `SELECT c.* 
       FROM categories c
       JOIN judge_category_assignments jca ON c.id = jca.category_id
       WHERE jca.judge_id = $1 AND jca.round_id = $2
       ORDER BY c.name`,
      [judgeId, roundId]
    );
    console.log(`📊 ${result.rows.length} catégories trouvées pour le jury`);
    return result.rows;
  } catch (error) {
    console.error('❌ Erreur dans getCategoriesForJudge:', error);
    throw error;
  }
}

// Récupérer tous les jurys assignés à une catégorie pour un tour
static async getJudgesForCategory(categoryId, roundId) {
  console.log('📡 Judge.getJudgesForCategory appelé:', { categoryId, roundId });
  try {
    const result = await query(
      `SELECT j.* 
       FROM judges j
       JOIN judge_category_assignments jca ON j.id = jca.judge_id
       WHERE jca.category_id = $1 AND jca.round_id = $2
       ORDER BY j.name`,
      [categoryId, roundId]
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Erreur dans getJudgesForCategory:', error);
    throw error;
  }
}

// Récupérer toutes les assignations pour un tour
static async getAssignmentsByRound(roundId) {
  console.log('📡 Judge.getAssignmentsByRound appelé pour round:', roundId);
  try {
    const result = await query(
      `SELECT 
          jca.id,
          jca.judge_id,
          j.name as judge_name,
          j.code as judge_code,
          jca.category_id,
          c.name as category_name,
          c.hizb_count,
          jca.assigned_at,
          a.name as assigned_by_name
       FROM judge_category_assignments jca
       JOIN judges j ON jca.judge_id = j.id
       JOIN categories c ON jca.category_id = c.id
       LEFT JOIN admins a ON jca.assigned_by = a.id
       WHERE jca.round_id = $1
       ORDER BY c.name, j.name`,
      [roundId]
    );
    console.log(`📊 ${result.rows.length} assignations trouvées`);
    return result.rows;
  } catch (error) {
    console.error('❌ Erreur dans getAssignmentsByRound:', error);
    throw error;
  }
}

// Vérifier si un jury est assigné à une catégorie
static async isJudgeAssignedToCategory(judgeId, categoryId, roundId) {
  console.log('📡 Judge.isJudgeAssignedToCategory appelé:', { judgeId, categoryId, roundId });
  try {
    const result = await query(
      `SELECT EXISTS(
         SELECT 1 FROM judge_category_assignments 
         WHERE judge_id = $1 AND category_id = $2 AND round_id = $3
       ) as assigned`,
      [judgeId, categoryId, roundId]
    );
    return result.rows[0].assigned;
  } catch (error) {
    console.error('❌ Erreur dans isJudgeAssignedToCategory:', error);
    throw error;
  }
}
}

export default Judge;