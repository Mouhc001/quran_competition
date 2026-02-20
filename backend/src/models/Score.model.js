import { query } from '../config/database.js';

class Score {
static async submit(scoreData) {
  const { candidate_id, judge_id, round_id, questions } = scoreData;
  
  console.log('=== DIAGNOSTIC SUBMIT ===');
  console.log('Questions reçues:', JSON.stringify(questions, null, 2));
  
  // 1. Récupérer les scores existants pour ce candidat (tous les jurys)
  const existingScores = await query(
    `SELECT question_number, surah_number, ayah_number 
     FROM scores 
     WHERE candidate_id = $1 AND round_id = $2`,
    [candidate_id, round_id]
  );
  
  // Créer un map des valeurs existantes par question
  const existingValues = new Map();
  existingScores.rows.forEach(score => {
    if (!existingValues.has(score.question_number)) {
      existingValues.set(score.question_number, {
        surah: score.surah_number,
        ayah: score.ayah_number
      });
    }
  });
  
  // 2. Supprimer les anciens scores de CE jury uniquement
  await query(
    'DELETE FROM scores WHERE candidate_id = $1 AND judge_id = $2 AND round_id = $3',
    [candidate_id, judge_id, round_id]
  );

  // 3. Insérer les 5 questions avec gestion intelligente des sourates
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const questionNum = i + 1;
    
    // Calcul du total sur 10
    const total_score = (q.recitation * 3) + q.siffat + q.makharij + q.minorError;
    
    // Récupérer les valeurs existantes pour cette question
    const existing = existingValues.get(questionNum);
    
    // Déterminer la sourate à utiliser :
    // - Si le jury a fourni une valeur, on l'utilise
    // - Sinon, on garde la valeur existante (si elle existe)
    // - Sinon, null
    let surahToUse = q.surah;
    let ayahToUse = q.ayah;
    
    if ((surahToUse === undefined || surahToUse === null) && existing) {
      // Le jury n'a pas fourni de sourate, on garde l'ancienne valeur
      surahToUse = existing.surah;
      ayahToUse = existing.ayah;
      console.log(`Question ${questionNum}: Conservation de la sourate existante ${existing.surah}`);
    } else if (surahToUse) {
      // Le jury a fourni une nouvelle sourate, on l'utilise
      console.log(`Question ${questionNum}: Nouvelle sourate fournie: ${surahToUse}`);
    }
    
    console.log(`Question ${questionNum}:`, {
      recitation: q.recitation,
      siffat: q.siffat,
      makharij: q.makharij,
      minorError: q.minorError,
      surah: surahToUse,
      ayah: ayahToUse,
      total: total_score,
      source: surahToUse === q.surah ? 'jury' : (existing ? 'conservé' : 'aucun')
    });

    await query(
      `INSERT INTO scores 
       (candidate_id, judge_id, round_id, question_number, 
        recitation_score, siffat_score, makharij_score, minor_error_score, 
        surah_number, ayah_number, comment, total_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        candidate_id, 
        judge_id, 
        round_id, 
        questionNum,
        q.recitation, 
        q.siffat, 
        q.makharij, 
        q.minorError,
        surahToUse || null,  // ← Utilise la valeur déterminée
        ayahToUse || null,   // ← Utilise la valeur déterminée
        q.comment || '',
        total_score
      ]
    );
  }

  return this.getCandidateScores(candidate_id, round_id);
}

  static async getCandidateScores(candidateId, roundId) {
    const result = await query(`
      SELECT 
        s.*,
        j.name as judge_name,
        j.code as judge_code,
        c.name as candidate_name,
        c.registration_number,
        cat.name as category_name
      FROM scores s
      JOIN judges j ON s.judge_id = j.id
      JOIN candidates c ON s.candidate_id = c.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE s.candidate_id = $1 AND s.round_id = $2
      ORDER BY s.judge_id, s.question_number
    `, [candidateId, roundId]);
    return result.rows;
  }

   static async getCandidateScoreSummary(candidateId, roundId) {
  const result = await query(`
    WITH judge_totals AS (
      SELECT 
        s.judge_id,
        j.name as judge_name,
        SUM(s.total_score::float) as judge_total,
        json_agg(
          json_build_object(
            'question_number', s.question_number,
            'recitation_score', s.recitation_score::float,
            'siffat_score', s.siffat_score::float,
            'makharij_score', s.makharij_score::float,
            'minor_error_score', s.minor_error_score::float,
            'surah_number', s.surah_number,
            'ayah_number', s.ayah_number,
            'question_total', s.total_score::float,
            'comment', s.comment
          ) ORDER BY s.question_number
        ) as questions_details
      FROM scores s
      JOIN judges j ON s.judge_id = j.id
      WHERE s.candidate_id = $1 AND s.round_id = $2
      GROUP BY s.judge_id, j.name
    ),
    -- Récupérer la dernière sourate non-null pour chaque question
    latest_surah AS (
      SELECT DISTINCT ON (question_number)
        question_number,
        surah_number,
        ayah_number,
        submitted_at
      FROM scores
      WHERE candidate_id = $1 AND round_id = $2 AND surah_number IS NOT NULL
      ORDER BY question_number, submitted_at DESC
    ),
    candidate_info AS (
      SELECT 
        c.id,
        c.name as candidate_name,
        c.registration_number,
        cat.name as category_name,
        r.name as round_name
      FROM candidates c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN rounds r ON c.round_id = r.id
      WHERE c.id = $1
    )
    SELECT 
      ci.*,
      COUNT(jt.judge_id)::integer as judges_count,
      COALESCE(ROUND(AVG(jt.judge_total)::numeric, 2)::float, 0) as total_score,
      COALESCE(ROUND(AVG(jt.judge_total)::numeric / 5, 2)::float, 0) as average_per_question,
      COALESCE(ROUND((AVG(jt.judge_total)::numeric / 50) * 20, 2)::float, 0) as final_score,
      COALESCE(
        json_agg(
          json_build_object(
            'judge_id', jt.judge_id,
            'judge_name', jt.judge_name,
            'judge_total', jt.judge_total::float,
            'questions', jt.questions_details
          )
        ),
        '[]'::json
      ) as judges_details,
      -- Ajouter les dernières sourates valides
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'question_number', ls.question_number,
            'surah', ls.surah_number,
            'ayah', ls.ayah_number
          )
        ) FILTER (WHERE ls.question_number IS NOT NULL),
        '[]'::json
      ) as surah_info
    FROM candidate_info ci
    LEFT JOIN judge_totals jt ON true
    LEFT JOIN latest_surah ls ON true
    GROUP BY ci.id, ci.candidate_name, ci.registration_number, 
             ci.category_name, ci.round_name
  `, [candidateId, roundId]);
  
  return result.rows[0] || null;
}

  // Dans Score.model.js - getScoresByRoundCategory
static async getScoresByRoundCategory(roundId, categoryId) {
  const result = await query(`
    WITH candidate_scores AS (
      SELECT 
        c.id as candidate_id,
        c.name as candidate_name,
        c.registration_number,
        c.status,
        cat.name as category_name,
        s.judge_id,
        j.name as judge_name,
        j.code as judge_code,
        
        -- Score total du jury (5 questions × 10 points = 50)
        COALESCE(SUM(s.total_score::float), 0) as judge_total,
        
        -- Moyenne par question (total / 5)
        COALESCE(SUM(s.total_score::float) / 5, 0) as judge_average_per_question,
        
        json_agg(
          json_build_object(
            'question_number', s.question_number,
            'recitation_score', COALESCE(s.recitation_score::float, 0),
            'siffat_score', COALESCE(s.siffat_score::float, 0),
            'makharij_score', COALESCE(s.makharij_score::float, 0),
            'minor_error_score', COALESCE(s.minor_error_score::float, 0),
            'question_total', COALESCE(s.total_score::float, 0),  -- Sur 10
            'comment', COALESCE(s.comment, '')
          ) ORDER BY s.question_number
        ) as questions_details
        
      FROM candidates c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN scores s ON c.id = s.candidate_id AND s.round_id = $1
      LEFT JOIN judges j ON s.judge_id = j.id
      WHERE c.round_id = $1 
        AND c.category_id = $2
      GROUP BY c.id, c.name, c.registration_number, c.status, 
               cat.name, s.judge_id, j.name, j.code
    ),
    
    candidate_summary AS (
      SELECT 
        candidate_id,
        candidate_name,
        registration_number,
        status,
        category_name as category,
        
        COUNT(DISTINCT judge_id)::integer as judges_count,
        
        -- Moyenne par question (sur 10)
        COALESCE(
          ROUND(
            AVG(judge_average_per_question)::numeric, 
            2
          )::float, 
          0
        ) as average_per_question,
        
        -- Score total (sur 50)
        COALESCE(
          ROUND(
            AVG(judge_total)::numeric, 
            2
          )::float, 
          0
        ) as total_score
        
      FROM candidate_scores
      GROUP BY candidate_id, candidate_name, registration_number, 
               status, category_name
    )
    
    SELECT * FROM candidate_summary
    ORDER BY COALESCE(total_score, 0) DESC, candidate_name
  `, [roundId, categoryId]);
  
  return result.rows;
}
  static async getScoresByQuestion(roundId, categoryId) {
    const result = await query(`
      SELECT 
        c.id as candidate_id,
        c.name as candidate_name,
        c.registration_number,
        s.question_number,
        
        -- ✅ CORRECTION: Moyenne pour cette question (sur 10)
        COALESCE(ROUND(AVG(s.total_score::float)::numeric, 2)::float, 0) as average_score,
        
        -- Détails par jury
        COALESCE(
          json_agg(
            json_build_object(
              'judge_id', s.judge_id,
              'judge_name', j.name,
              'recitation_score', s.recitation_score::float,
              'siffat_score', s.siffat_score::float,
              'makharij_score', s.makharij_score::float,
              'minor_error_score', s.minor_error_score::float,
              'question_total', s.total_score::float,  -- Sur 10
              'comment', s.comment
            )
          ),
          '[]'::json
        ) as judges_scores
        
      FROM candidates c
      LEFT JOIN scores s ON c.id = s.candidate_id AND s.round_id = $1
      LEFT JOIN judges j ON s.judge_id = j.id
      WHERE c.round_id = $1 
        AND c.category_id = $2
        AND c.status = 'active'
        AND s.question_number IS NOT NULL
      GROUP BY c.id, c.name, c.registration_number, s.question_number
      ORDER BY c.registration_number, s.question_number
    `, [roundId, categoryId]);
    
    return result.rows;
  }

  static async getJudgeScores(judgeId, roundId) {
    const result = await query(`
      SELECT 
        c.id as candidate_id,
        c.name as candidate_name,
        c.registration_number,
        cat.name as category_name,
        
        -- Score total pour ce jury (5 questions)
        COALESCE(SUM(s.total_score::float), 0) as total_score,
        
        -- Détail des questions
        COALESCE(
          json_agg(
            json_build_object(
              'question_number', s.question_number,
              'recitation_score', s.recitation_score::float,
              'siffat_score', s.siffat_score::float,
              'makharij_score', s.makharij_score::float,
              'minor_error_score', s.minor_error_score::float,
              'question_total', s.total_score::float,
              'comment', s.comment
            ) ORDER BY s.question_number
          ),
          '[]'::json
        ) as questions
        
      FROM candidates c
      LEFT JOIN scores s ON c.id = s.candidate_id AND s.round_id = $2 AND s.judge_id = $1
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.round_id = $2 AND c.status = 'active'
      GROUP BY c.id, c.name, c.registration_number, cat.name
      ORDER BY c.registration_number
    `, [judgeId, roundId]);
    
    return result.rows;
  }

  static async getScoresByCandidateRoundJudge(candidateId, roundId, judgeId) {
    const result = await query(`
      SELECT 
        s.*,
        j.name as judge_name,
        c.name as candidate_name
      FROM scores s
      JOIN judges j ON s.judge_id = j.id
      JOIN candidates c ON s.candidate_id = c.id
      WHERE s.candidate_id = $1 
        AND s.round_id = $2 
        AND s.judge_id = $3
      ORDER BY s.question_number
    `, [candidateId, roundId, judgeId]);
    return result.rows;
  }

  static async getScoreStatistics(roundId, categoryId) {
    const result = await query(`
      WITH candidate_scores AS (
        SELECT 
          c.id as candidate_id,
          -- Calcul du score par candidat (moyenne des jurys)
          COALESCE(
            ROUND(
              AVG(
                (SELECT SUM(s2.total_score::float)
                 FROM scores s2 
                 WHERE s2.candidate_id = c.id 
                   AND s2.round_id = $1
                 GROUP BY s2.judge_id)
              )::numeric, 
              2
            )::float,
            0
          ) as candidate_total
        FROM candidates c
        WHERE c.round_id = $1 
          AND c.category_id = $2
          AND c.status = 'active'
        GROUP BY c.id
      )
      
      SELECT 
        COUNT(*)::integer as candidates_count,
        COALESCE(ROUND(AVG(candidate_total)::numeric, 2)::float, 0) as average_total,
        COALESCE(ROUND(MIN(candidate_total)::numeric, 2)::float, 0) as lowest_score,
        COALESCE(ROUND(MAX(candidate_total)::numeric, 2)::float, 0) as highest_score,
        COALESCE(ROUND(STDDEV(candidate_total)::numeric, 2)::float, 0) as standard_deviation,
        
        -- Distribution des scores
        SUM(CASE WHEN candidate_total >= 25 THEN 1 ELSE 0 END)::integer as excellent_count,
        SUM(CASE WHEN candidate_total >= 20 AND candidate_total < 25 THEN 1 ELSE 0 END)::integer as good_count,
        SUM(CASE WHEN candidate_total >= 15 AND candidate_total < 20 THEN 1 ELSE 0 END)::integer as average_count,
        SUM(CASE WHEN candidate_total < 15 THEN 1 ELSE 0 END)::integer as poor_count
        
      FROM candidate_scores
    `, [roundId, categoryId]);
    
    return result.rows[0] || null;
  }

  static async getCandidateDetailedScores(candidateId, roundId) {
    const result = await query(`
      WITH judge_totals AS (
        SELECT 
          s.judge_id,
          j.name as judge_name,
          j.code as judge_code,
          -- ✅ CORRECTION: judge_total sur 50
          SUM(s.total_score::float) as judge_total,
          json_agg(
            json_build_object(
              'question_number', s.question_number,
              'recitation_score', s.recitation_score::float,
              'siffat_score', s.siffat_score::float,
              'makharij_score', s.makharij_score::float,
              'minor_error_score', s.minor_error_score::float,
              'question_total', s.total_score::float,  -- Sur 10
              'comment', s.comment
            ) ORDER BY s.question_number
          ) as questions_details
        FROM scores s
        JOIN judges j ON s.judge_id = j.id
        WHERE s.candidate_id = $1 AND s.round_id = $2
        GROUP BY s.judge_id, j.name, j.code
      ),
      candidate_info AS (
        SELECT 
          c.id,
          c.name as candidate_name,
          c.registration_number,
          cat.name as category_name,
          r.name as round_name
        FROM candidates c
        LEFT JOIN categories cat ON c.category_id = cat.id
        LEFT JOIN rounds r ON c.round_id = r.id
        WHERE c.id = $1
      ),
      summary AS (
        SELECT 
          COUNT(judge_id)::integer as judges_count,
          -- ✅ CORRECTION: total_score sur 50
          COALESCE(ROUND(AVG(judge_total)::numeric, 2)::float, 0) as total_score,
          -- ✅ CORRECTION: average_per_question sur 10
          COALESCE(ROUND(AVG(judge_total)::numeric / 5, 2)::float, 0) as average_per_question,
          -- ✅ CORRECTION: final_score sur 20 (pour compatibilité front-end)
          COALESCE(ROUND((AVG(judge_total)::numeric / 50) * 20, 2)::float, 0) as final_score,
          CASE WHEN COUNT(judge_id) >= 3 THEN true ELSE false END as is_complete,
          CASE WHEN COUNT(judge_id) >= 3 THEN 0 ELSE 3 - COUNT(judge_id) END::integer as judges_needed
        FROM judge_totals
      )
      SELECT 
        ci.*,
        s.*,
        COALESCE(
          json_agg(
            json_build_object(
              'judge_id', jt.judge_id,
              'judge_name', jt.judge_name,
              'judge_code', jt.judge_code,
              'judge_total', jt.judge_total::float,  -- Sur 50
              'questions', jt.questions_details
            )
          ),
          '[]'::json
        ) as scores_by_judge
      FROM candidate_info ci
      CROSS JOIN summary s
      LEFT JOIN judge_totals jt ON true
      GROUP BY ci.id, ci.candidate_name, ci.registration_number, 
               ci.category_name, ci.round_name,
               s.judges_count, s.total_score, s.average_per_question, 
               s.final_score, s.is_complete, s.judges_needed
    `, [candidateId, roundId]);
    
    return result.rows[0] || null;
  }

  static async getRoundResults(roundId) {
    // Implémente cette méthode si nécessaire
    const result = await query(`
      SELECT 
        c.id as candidate_id,
        c.name as candidate_name,
        c.registration_number,
        cat.name as category_name,
        COALESCE(ROUND(AVG(s.total_score::float)::numeric, 2)::float, 0) as average_score
      FROM candidates c
      LEFT JOIN scores s ON c.id = s.candidate_id AND s.round_id = $1
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.round_id = $1 AND c.status = 'active'
      GROUP BY c.id, c.name, c.registration_number, cat.name
      ORDER BY average_score DESC
    `, [roundId]);
    
    return result.rows;
  }


// Dans Judge.model.js - ajouter ces méthodes

// Assigner un jury à une catégorie pour un tour
static async assignToCategory(judgeId, categoryId, roundId, adminId) {
  const result = await query(
    `INSERT INTO judge_category_assignments (judge_id, category_id, round_id, assigned_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (judge_id, category_id, round_id) DO NOTHING
     RETURNING *`,
    [judgeId, categoryId, roundId, adminId]
  );
  return result.rows[0];
}

// Retirer un jury d'une catégorie
static async removeFromCategory(judgeId, categoryId, roundId) {
  await query(
    `DELETE FROM judge_category_assignments 
     WHERE judge_id = $1 AND category_id = $2 AND round_id = $3`,
    [judgeId, categoryId, roundId]
  );
  return true;
}

// Récupérer toutes les catégories assignées à un jury pour un tour
static async getCategoriesForJudge(judgeId, roundId) {
  const result = await query(
    `SELECT c.* 
     FROM categories c
     JOIN judge_category_assignments jca ON c.id = jca.category_id
     WHERE jca.judge_id = $1 AND jca.round_id = $2
     ORDER BY c.name`,
    [judgeId, roundId]
  );
  return result.rows;
}

// Récupérer tous les jurys assignés à une catégorie pour un tour
static async getJudgesForCategory(categoryId, roundId) {
  const result = await query(
    `SELECT j.* 
     FROM judges j
     JOIN judge_category_assignments jca ON j.id = jca.judge_id
     WHERE jca.category_id = $1 AND jca.round_id = $2
     ORDER BY j.name`,
    [categoryId, roundId]
  );
  return result.rows;
}

// Récupérer toutes les assignations pour un tour
static async getAssignmentsByRound(roundId) {
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
  return result.rows;
}

// Vérifier si un jury est assigné à une catégorie
static async isJudgeAssignedToCategory(judgeId, categoryId, roundId) {
  const result = await query(
    `SELECT EXISTS(
       SELECT 1 FROM judge_category_assignments 
       WHERE judge_id = $1 AND category_id = $2 AND round_id = $3
     ) as assigned`,
    [judgeId, categoryId, roundId]
  );
  return result.rows[0].assigned;
}
}

export default Score;