import { query } from '../config/database.js';

class Candidate {
  static async findAll() {
    const result = await query(`
      SELECT c.*, r.name as round_name 
      FROM candidates c
      LEFT JOIN rounds r ON c.round_id = r.id
      ORDER BY c.created_at DESC
    `);
    return result.rows;
  }

  static async findById(id) {
    const result = await query('SELECT * FROM candidates WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByRegistrationNumber(registrationNumber) {
    const result = await query('SELECT * FROM candidates WHERE registration_number = $1', [registrationNumber]);
    return result.rows[0];
  }

  
  static async create(candidateData) {
  const { 
    registration_number, 
    name, 
    birth_date, 
    phone, 
    email, 
    category_id, 
    round_id,
    notes,
    status 
  } = candidateData;
  
  // Si round_id n'est pas fourni, utiliser le tour actif
  let effectiveRoundId = round_id;
  if (!effectiveRoundId) {
    const roundResult = await query('SELECT id FROM rounds WHERE is_active = true LIMIT 1');
    effectiveRoundId = roundResult.rows[0]?.id;
  }
  
  const result = await query(
    `INSERT INTO candidates 
     (registration_number, name, birth_date, phone, email, category_id, round_id, notes, status) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
     RETURNING *`,
    [
      registration_number, 
      name, 
      birth_date, 
      phone || null, 
      email || null, 
      category_id, 
      effectiveRoundId,
      notes || null,
      status || 'active'
    ]
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
      `UPDATE candidates SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    
    return result.rows[0];
  }

  static async delete(id) {
    await query('DELETE FROM candidates WHERE id = $1', [id]);
    return true;
  }

  static async getByRound(roundId) {
    const result = await query(
      'SELECT * FROM candidates WHERE round_id = $1 AND status = $2 ORDER BY name',
      [roundId, 'active']
    );
    return result.rows;
  }

  static async qualify(candidateId, nextRoundId) {
    const result = await query(
      `UPDATE candidates 
       SET round_id = $2, status = 'active' 
       WHERE id = $1 RETURNING *`,
      [candidateId, nextRoundId]
    );
    return result.rows[0];
  }

  static async eliminate(candidateId) {
    const result = await query(
      "UPDATE candidates SET status = 'eliminated' WHERE id = $1 RETURNING *",
      [candidateId]
    );
    return result.rows[0];
  }

  static async getActiveCandidatesCount() {
    const result = await query(
      "SELECT COUNT(*) as count FROM candidates WHERE status = 'active'"
    );
    return parseInt(result.rows[0].count);
  }
}

export default Candidate;