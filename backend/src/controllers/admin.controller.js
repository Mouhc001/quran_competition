const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const Round = require('../models/Round.model');
const pool = require('../config/database'); 
const Score = require('../models/Score.model');

// Dashboard Stats - VERSION FINALE ROBUSTE
exports.getDashboardStats = async (req, res) => {
  try {
    console.log('📊 Chargement dashboard...');
    
    // Récupération en parallèle avec gestion d'erreur individuelle
    const stats = {
      candidates: 0,
      judges: 0,
      activeRounds: 0,
      totalScores: 0,
      categories: 0,
      recentCandidates: []
    };
    
    // 1. Candidats
    try {
      const result = await query('SELECT COUNT(*) FROM candidates');
      stats.candidates = parseInt(result.rows[0].count) || 0;
    } catch (err) {
      console.log('⚠️  Erreur candidats:', err.message);
    }
    
    // 2. Jurys actifs
    try {
      const result = await query('SELECT COUNT(*) FROM judges WHERE is_active = true');
      stats.judges = parseInt(result.rows[0].count) || 0;
    } catch (err) {
      console.log('⚠️  Erreur judges:', err.message);
    }
    
    // 3. Tours actifs
    try {
      const result = await query('SELECT COUNT(*) FROM rounds WHERE is_active = true');
      stats.activeRounds = parseInt(result.rows[0].count) || 0;
    } catch (err) {
      console.log('⚠️  Erreur rounds:', err.message);
    }
    
    // 4. Scores
    try {
      const result = await query('SELECT COUNT(*) FROM scores');
      stats.totalScores = parseInt(result.rows[0].count) || 0;
    } catch (err) {
      console.log('⚠️  Erreur scores:', err.message);
    }
    
    // 5. Catégories
    try {
      const result = await query('SELECT COUNT(*) FROM categories');
      stats.categories = parseInt(result.rows[0].count) || 0;
    } catch (err) {
      console.log('⚠️  Erreur categories:', err.message);
    }
    
    // 6. Candidats récents
    try {
      const result = await query(`
        SELECT 
          c.id,
          c.registration_number,
          c.name,
          c.created_at,
          COALESCE(cat.name, 'Non catégorisé') as category_name,
          COALESCE(r.name, 'Non assigné') as round_name,
          c.status
        FROM candidates c
        LEFT JOIN categories cat ON c.category_id = cat.id
        LEFT JOIN rounds r ON c.round_id = r.id
        ORDER BY c.created_at DESC 
        LIMIT 5
      `);
      stats.recentCandidates = result.rows;
    } catch (err) {
      console.log('⚠️  Erreur candidats récents:', err.message);
      // Fallback simple
      const result = await query('SELECT * FROM candidates ORDER BY created_at DESC LIMIT 5');
      stats.recentCandidates = result.rows || [];
    }
    
    console.log('✅ Dashboard chargé:', stats);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('❌ Erreur dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur chargement dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// CANDIDATES MANAGEMENT



exports.getAllCandidates = async (req, res) => {
  try {
    const { round, category, status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = ['1=1'];
    let queryParams = [];
    let paramIndex = 1;

    if (round && round !== 'all') {
      whereConditions.push(`c.round_id = $${paramIndex}`);
      queryParams.push(round);
      paramIndex++;
    }

    if (category && category !== 'all') {
      whereConditions.push(`c.category_id = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    if (status && status !== 'all') {
      whereConditions.push(`c.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(c.name ILIKE $${paramIndex} OR c.registration_number ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Version SIMPLE sans candidate_results
    const candidatesQuery = await query(`
      SELECT 
        c.*, 
        r.name as round_name, 
        cat.name as category_name,
        COALESCE((
          SELECT SUM(recitation_score + siffat_score + makharij_score + minor_error_score)
          FROM scores s 
          WHERE s.candidate_id = c.id
        ), 0) as total_score,
        0 as final_score  -- À calculer plus tard si besoin
      FROM candidates c
      LEFT JOIN rounds r ON c.round_id = r.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...queryParams, limit, offset]);

    // Total count
    const countQuery = await query(`
      SELECT COUNT(*) 
      FROM candidates c
      WHERE ${whereClause}
    `, queryParams);

    res.json({
      success: true,
      data: {
        candidates: candidatesQuery.rows,
        pagination: {
          total: parseInt(countQuery.rows[0].count),
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(countQuery.rows[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get candidates error:', error);
    
    // Fallback ultra simple
    try {
      const candidatesQuery = await query(`
        SELECT c.* FROM candidates c 
        ORDER BY c.created_at DESC 
        LIMIT 20
      `);
      
      res.json({
        success: true,
        data: {
          candidates: candidatesQuery.rows,
          pagination: {
            total: candidatesQuery.rows.length,
            page: 1,
            limit: 20,
            pages: 1
          }
        }
      });
    } catch (fallbackError) {
      res.status(500).json({ 
        success: false, 
        message: 'Erreur serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

exports.getCandidateDetails = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 [BACKEND] GET /admin/candidates/${id}`);
    
    // 1. D'abord, requête simple sans les scores
    const result = await pool.query(`
      SELECT 
        c.id,
        c.registration_number,
        c.name,
        c.birth_date,
        c.phone,
        c.email,
        c.category_id,
        c.round_id,
        c.status,
        c.notes,
        c.created_at,
        c.updated_at,
        cat.name as category_name,
        cat.hizb_count,
        cat.description as category_description,
        r.name as round_name,
        r.is_active as round_is_active,
        r.order_index as round_order,
        r.description as round_description
      FROM candidates c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN rounds r ON c.round_id = r.id
      WHERE c.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      console.log(`🔍 [BACKEND] Candidat ${id} non trouvé`);
      return res.status(404).json({
        success: false,
        message: 'Candidat non trouvé'
      });
    }
    
    const candidate = result.rows[0];
    console.log(`🔍 [BACKEND] Candidat trouvé: ${candidate.name}`);
    
    // 2. Récupérer les scores séparément (si la table existe)
    let scores = [];
    let roundResults = [];
    
    try {
      // Vérifier si la table scores existe
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'scores'
        )
      `);
      
      if (tableCheck.rows[0].exists) {
        // Récupérer les scores
        const scoresResult = await pool.query(`
          SELECT * FROM scores 
          WHERE candidate_id = $1
          ORDER BY question_number
        `, [id]);
        scores = scoresResult.rows;
        
        // Récupérer les résultats par tour
        const roundResultsResult = await pool.query(`
          SELECT 
            r.name as round_name,
            s.round_id,
            AVG(s.total_score) as average_score,
            SUM(s.total_score) as total_score
          FROM scores s
          JOIN rounds r ON s.round_id = r.id
          WHERE s.candidate_id = $1
          GROUP BY r.id, r.name, s.round_id
        `, [id]);
        roundResults = roundResultsResult.rows;
      }
    } catch (scoreError) {
      console.log('🔍 [BACKEND] Table scores non disponible:', scoreError.message);
      // Continuer sans les scores
    }
    
    // Formater la réponse
    const responseData = {
      ...candidate,
      scores: scores,
      roundResults: roundResults,
      round_status: candidate.round_is_active ? 'active' : 'inactive'
    };
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    console.error('🔍 [BACKEND] Candidate details error:', error.message);
    console.error('🔍 [BACKEND] Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du chargement du candidat'
    });
  }
};

// Utilisez votre modèle Score existant
exports.getCandidateDetailedScores = async (req, res) => {
  try {
    const { candidateId, roundId } = req.params;
    
    // 1. Récupérer les scores via le modèle Score
    const scores = await Score.getCandidateScores(candidateId, roundId);
    
    // 2. Organiser par jury
    const scoresByJudge = {};
    scores.forEach(score => {
      const judgeId = score.judge_id;
      
      if (!scoresByJudge[judgeId]) {
        scoresByJudge[judgeId] = {
          judge_id: judgeId,
          judge_name: score.judge_name || 'Jury',
          judge_code: score.judge_code || 'N/A',
          questions: [],
          total_score: 0
        };
      }
      
      scoresByJudge[judgeId].questions.push({
        question_number: score.question_number,
        recitation_score: parseFloat(score.recitation_score),
        siffat_score: parseFloat(score.siffat_score),
        makharij_score: parseFloat(score.makharij_score),
        minor_error_score: parseFloat(score.minor_error_score),
        question_total: parseFloat(score.question_total),
        comment: score.comment
      });
      
      scoresByJudge[judgeId].total_score += parseFloat(score.question_total);
    });
    
    // 3. Calculer le résumé
    const judgesArray = Object.values(scoresByJudge);
    const judgesCount = judgesArray.length;
    const totalQuestionsScored = scores.length;
    const totalScore = judgesArray.reduce((sum, judge) => sum + judge.total_score, 0);
    const averagePerQuestion = totalQuestionsScored > 0 ? totalScore / totalQuestionsScored : 0;
    
    // 4. Calculer le score final (moyenne des 3 meilleurs jurys)
    let finalScore = 0;
    const judgeTotals = judgesArray.map(j => j.total_score).sort((a, b) => b - a);
    
    if (judgeTotals.length >= 3) {
      finalScore = (judgeTotals[0] + judgeTotals[1] + judgeTotals[2]) / 3;
    } else if (judgeTotals.length > 0) {
      finalScore = judgeTotals.reduce((sum, score) => sum + score, 0) / judgeTotals.length;
    }
    
    res.json({
      success: true,
      data: {
        scores_by_judge: judgesArray,
        summary: {
          judges_count: judgesCount,
          total_questions_scored: totalQuestionsScored,
          total_score: parseFloat(totalScore.toFixed(2)),
          average_per_question: parseFloat(averagePerQuestion.toFixed(2)),
          final_score: parseFloat(finalScore.toFixed(2)),
          is_complete: judgesCount >= 3,
          judges_needed: Math.max(0, 3 - judgesCount)
        }
      }
    });
    
  } catch (error) {
    console.error('Get candidate detailed scores error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};
exports.createCandidate = async (req, res) => {
  try {
    const {
      name,
      birth_date,
      phone,
      email,
      category_id,
      round_id,
      notes
    } = req.body;

    // Récupérer le dernier numéro
    const lastNumberResult = await query(
      `SELECT registration_number FROM candidates 
       WHERE registration_number LIKE 'CAN%'
       ORDER BY registration_number DESC 
       LIMIT 1`
    );

     let nextNumber = 1;
    if (lastNumberResult.rows.length > 0) {
      const lastNumber = lastNumberResult.rows[0].registration_number;
      const match = lastNumber.match(/CAN(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const registration_number = `CAN${String(nextNumber).padStart(3, '0')}`;

    console.log('📝 Numéro généré:', registration_number);

    // 2. Vérifier si le numéro existe (par sécurité)
    const existing = await query(
      'SELECT id FROM candidates WHERE registration_number = $1',
      [registration_number]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Numéro d\'inscription déjà utilisé'
      });
    }

    const result = await query(
      `INSERT INTO candidates (
        registration_number, name, birth_date, phone, email,
        category_id, round_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        registration_number, name, birth_date, phone, email,
        category_id, round_id, notes
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Candidat créé avec succès',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create candidate error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.updateCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      birth_date,
      phone,
      email,
      category_id,
      round_id,
      notes,
      status
    } = req.body;

    const result = await query(
      `UPDATE candidates 
       SET name = $1, birth_date = $2, phone = $3, email = $4,
           category_id = $5, round_id = $6, notes = $7, status = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [name, birth_date, phone, email, category_id, round_id, notes, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Candidat non trouvé' });
    }

    res.json({
      success: true,
      message: 'Candidat mis à jour avec succès',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update candidate error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si le candidat a des scores
    const scoresCount = await query(
      'SELECT COUNT(*) FROM scores WHERE candidate_id = $1',
      [id]
    );

    if (parseInt(scoresCount.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un candidat avec des scores'
      });
    }

    const result = await query(
      'DELETE FROM candidates WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Candidat non trouvé' });
    }

    res.json({
      success: true,
      message: 'Candidat supprimé avec succès'
    });
  } catch (error) {
    console.error('Delete candidate error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.updateCandidateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'eliminated', 'qualified', 'disqualified'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide'
      });
    }

    const result = await query(
      `UPDATE candidates 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Candidat non trouvé' });
    }

    res.json({
      success: true,
      message: `Candidat ${status === 'qualified' ? 'qualifié' : 'éliminé'}`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ROUNDS MANAGEMENT
exports.getAllRounds = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        r.*,
        COUNT(DISTINCT c.id) as candidates_count,
        COUNT(DISTINCT cat.id) as categories_count
      FROM rounds r
      LEFT JOIN candidates c ON r.id = c.round_id AND c.status = 'active'
      LEFT JOIN categories cat ON 1=1 -- À adapter selon tes relations
      GROUP BY r.id
      ORDER BY r.order_index ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get rounds error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur'
    });
  }
};





exports.createRound = async (req, res) => {
  try {
    const { name, description, is_active } = req.body;
    
    const roundData = {
      name,
      description: description || '',
      is_active: is_active || false
      // order_index sera calculé automatiquement dans le modèle
    };
    
    const round = await Round.create(roundData);
    
    res.status(201).json({
      success: true,
      message: 'Tour créé avec succès',
      data: round
    });
  } catch (error) {
    console.error('Create round error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

exports.updateRound = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;
    
    const roundData = {
      name,
      description,
      is_active
    };
    
    const round = await Round.update(id, roundData);
    
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
    console.error('Update round error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

exports.toggleRound = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    const round = await Round.update(id, { is_active });
    
    if (!round) {
      return res.status(404).json({
        success: false,
        message: 'Tour non trouvé'
      });
    }
    
    res.json({
      success: true,
      message: `Tour ${is_active ? 'activé' : 'désactivé'} avec succès`,
      data: round
    });
  } catch (error) {
    console.error('Toggle round error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

exports.getRoundDetails = async (req, res) => {
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
    console.error('Get round details error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

exports.deleteRound = async (req, res) => {
  try {
    const { id } = req.params;
    
    const round = await Round.delete(id);
    
    if (!round) {
      return res.status(404).json({
        success: false,
        message: 'Tour non trouvé ou impossible à supprimer'
      });
    }
    
    res.json({
      success: true,
      message: 'Tour supprimé avec succès',
      data: round
    });
  } catch (error) {
    console.error('Delete round error:', error);
    
    // Messages d'erreur spécifiques
    if (error.message.includes('candidat')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('score')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression'
    });
  }
};

// Dans admin.controller.js
exports.getCandidatesByRound = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id } = req.query;
    
    let queryStr = `
      SELECT c.*, cat.name as category_name
      FROM candidates c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.round_id = $1
    `;
    
    const params = [id];
    
    if (category_id) {
      queryStr += ' AND c.category_id = $2';
      params.push(category_id);
    }
    
    queryStr += ' ORDER BY c.name';
    
    const result = await pool.query(queryStr, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get candidates by round error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};
// JUDGES MANAGEMENT
exports.createJudge = async (req, res) => {
  try {
    const { name, code, email, is_active = true } = req.body;

    // Validation
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Nom et code sont requis'
      });
    }

    // Vérifier si le code existe déjà
    const existing = await query(
      'SELECT id FROM judges WHERE code = $1',
      [code]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Code déjà utilisé'
      });
    }

    const result = await query(
      `INSERT INTO judges (name, code, email, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, code, email, is_active]
    );

    res.status(201).json({
      success: true,
      message: 'Jury créé avec succès',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create judge error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

exports.deleteJudge = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si le jury existe
    const existing = await query('SELECT id FROM judges WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Jury non trouvé'
      });
    }

    // Supprimer le jury
    await query('DELETE FROM judges WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Jury supprimé avec succès'
    });
  } catch (error) {
    console.error('Delete judge error:', error);
    
    // Si le jury a des scores, on ne peut pas le supprimer
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer ce jury car il a déjà noté des candidats'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
};

exports.getAllJudges = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '1=1';
    let queryParams = [];
    
    if (search) {
      whereClause = 'j.name ILIKE $1 OR j.code ILIKE $1';
      queryParams.push(`%${search}%`);
    }

    // Vérifiez d'abord si la colonne submitted_at existe
    let timestampColumn = 'created_at';
    try {
      const checkColumn = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'scores' 
          AND column_name IN ('submitted_at', 'created_at')
        LIMIT 1
      `);
      
      if (checkColumn.rows.length > 0) {
        timestampColumn = checkColumn.rows[0].column_name;
      }
    } catch (checkError) {
      console.log('⚠️  Impossible de vérifier les colonnes:', checkError.message);
    }

    console.log(`📊 Utilisation de la colonne: ${timestampColumn}`);

    const result = await query(
      `SELECT j.*,
              COUNT(DISTINCT s.id) as scores_count,
              MAX(s.${timestampColumn}) as last_scoring
       FROM judges j
       LEFT JOIN scores s ON j.id = s.judge_id
       WHERE ${whereClause}
       GROUP BY j.id
       ORDER BY j.created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM judges WHERE ${whereClause}`,
      queryParams
    );

    res.json({
      success: true,
      data: {
        judges: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get judges error:', error.message);
    
    // Toujours retourner quelque chose
    res.json({
      success: true,
      data: {
        judges: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20
        }
      }
    });
  }
};

exports.createJudge = async (req, res) => {
  try {
    const { name, email, is_active = false } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Le nom est requis'
      });
    }

    // 1. Générer un code unique
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    let attempts = 0;
    
    do {
      let random = '';
      for (let i = 0; i < 6; i++) {
        random += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      code = `JURY-${random}`;
      
      const existing = await query('SELECT id FROM judges WHERE code = $1', [code]);
      attempts++;
      
      if (existing.rows.length === 0 || attempts > 10) {
        break;
      }
    } while (true);

    console.log(`🎯 Code généré: ${code}`);

    // 2. Insérer le jury avec TOUS les champs requis
    let queryText;
    let queryParams;

    if (email) {
      queryText = `INSERT INTO judges (code, name, email, is_active)
                   VALUES ($1, $2, $3, $4)
                   RETURNING *`;
      queryParams = [code, name, email, is_active];
    } else {
      queryText = `INSERT INTO judges (code, name, is_active)
                   VALUES ($1, $2, $3)
                   RETURNING *`;
      queryParams = [code, name, is_active];
    }

    const result = await query(queryText, queryParams);

    res.status(201).json({
      success: true,
      message: 'Jury créé avec succès',
      data: {
        ...result.rows[0],
        login_code: code // Pour afficher à l'admin
      }
    });
  } catch (error) {
    console.error('Create judge error:', error);
    
    // Erreur spécifique pour nom dupliqué
    if (error.code === '23505' && error.constraint?.includes('name')) {
      return res.status(400).json({
        success: false,
        message: 'Un jury avec ce nom existe déjà'
      });
    }
    
    // Erreur spécifique pour code dupliqué (ne devrait pas arriver)
    if (error.code === '23505' && error.constraint?.includes('code')) {
      return res.status(400).json({
        success: false,
        message: 'Erreur génération code, veuillez réessayer'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

exports.generateJudgeCodes = async (req, res) => {
  try {
    const { count = 5, prefix = 'JUDGE' } = req.body;
    const generatedJudges = [];

    for (let i = 0; i < count; i++) {
      const code = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const name = `Jury ${i + 1}`;
      
      try {
        const result = await query(
          `INSERT INTO judges (name, code)
           VALUES ($1, $2)
           RETURNING *`,
          [name, code]
        );
        
        generatedJudges.push(result.rows[0]);
      } catch (err) {
        console.error('Erreur génération code:', err);
      }
    }

    res.json({
      success: true,
      message: `${generatedJudges.length} codes générés`,
      data: generatedJudges
    });
  } catch (error) {
    console.error('Generate codes error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.updateJudge = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, name, email, code } = req.body; // Ajoute "code" ici

    // Vérifier si le jury existe
    const existing = await query('SELECT id FROM judges WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Jury non trouvé'
      });
    }

    // Construire les champs à mettre à jour
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(is_active);
      paramIndex++;
    }

    if (name !== undefined && name.trim() !== '') {
      updates.push(`name = $${paramIndex}`);
      values.push(name.trim());
      paramIndex++;
    }

    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      values.push(email);
      paramIndex++;
    }

    if (code !== undefined && code.trim() !== '') {
      updates.push(`code = $${paramIndex}`);
      values.push(code.trim());
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune donnée à mettre à jour'
      });
    }

    // Ajouter l'ID à la fin
    values.push(id);

    const result = await query(
      `UPDATE judges SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({
      success: true,
      message: 'Jury mis à jour',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update judge error:', error);
    
    // Gérer les contraintes uniques
    if (error.code === '23505') {
      if (error.constraint?.includes('name')) {
        return res.status(400).json({
          success: false,
          message: 'Ce nom est déjà utilisé par un autre jury'
        });
      }
      if (error.constraint?.includes('code')) {
        return res.status(400).json({
          success: false,
          message: 'Ce code est déjà utilisé'
        });
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
};

exports.updateJudgeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const result = await query(
      'UPDATE judges SET is_active = $1 WHERE id = $2 RETURNING *',
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Jury non trouvé'
      });
    }

    res.json({
      success: true,
      message: `Jury ${is_active ? 'activé' : 'désactivé'}`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update judge status error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
// CATEGORIES MANAGEMENT

// CATEGORIES MANAGEMENT - Ajoutez ces méthodes
exports.getAllCategories = async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, COUNT(DISTINCT cand.id) as candidates_count
      FROM categories c
      LEFT JOIN candidates cand ON c.id = cand.category_id
      GROUP BY c.id
      ORDER BY c.name
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description, max_participants } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Le nom de la catégorie est requis'
      });
    }

    const result = await query(
      `INSERT INTO categories (name, description, max_participants)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description, max_participants]
    );

    res.status(201).json({
      success: true,
      message: 'Catégorie créée avec succès',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, max_participants } = req.body;

    const result = await query(
      `UPDATE categories 
       SET name = $1, description = $2, max_participants = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, description, max_participants, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    }

    res.json({
      success: true,
      message: 'Catégorie mise à jour avec succès',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si la catégorie a des candidats
    const candidatesCount = await query(
      'SELECT COUNT(*) FROM candidates WHERE category_id = $1',
      [id]
    );

    if (parseInt(candidatesCount.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une catégorie avec des candidats'
      });
    }

    const result = await query(
      'DELETE FROM categories WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    }

    res.json({
      success: true,
      message: 'Catégorie supprimée avec succès'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// REPORTS
exports.getRoundReport = async (req, res) => {
  try {
    const { roundId } = req.params;

    const result = await query(`
      SELECT cr.*, c.phone, c.email, c.notes
      FROM candidate_results cr
      JOIN candidates c ON cr.candidate_id = c.id
      WHERE cr.round_id = $1
      ORDER BY cr.final_score DESC
    `, [roundId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Round report error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};