const { query } = require('../config/database');

class Admin {
  static async findByEmail(email) {
    const result = await query('SELECT * FROM admins WHERE email = $1', [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query('SELECT * FROM admins WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async create(adminData) {
    const { email, password_hash, name } = adminData;
    
    const result = await query(
      'INSERT INTO admins (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *',
      [email, password_hash, name]
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
      `UPDATE admins SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    
    return result.rows[0];
  }

  static async delete(id) {
    await query('DELETE FROM admins WHERE id = $1', [id]);
    return true;
  }
}

module.exports = Admin;