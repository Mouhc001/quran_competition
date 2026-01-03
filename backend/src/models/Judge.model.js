const { query } = require('../config/database');

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
}

module.exports = Judge;