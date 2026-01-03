const { query } = require('../config/database');

class Score {
  static async submit(scoreData) {
    const { candidate_id, judge_id, round_id, questions } = scoreData;
    
    // Supprimer les anciens scores pour ce jury/candidat/tour
    await query(
      'DELETE FROM scores WHERE candidate_id = $1 AND judge_id = $2 AND round_id = $3',
      [candidate_id, judge_id, round_id]
    );

    // Insérer les 5 questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await query(
        `INSERT INTO scores 
         (candidate_id, judge_id, round_id, question_number, 
          recitation_score, siffat_score, makharij_score, minor_error_score, comment)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [candidate_id, judge_id, round_id, i + 1,
         q.recitation, q.siffat, q.makharij, q.minorError, q.comment]
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
              'question_total', s.total_score::float,
              'comment', s.comment
            ) ORDER BY s.question_number
          ) as questions_details
        FROM scores s
        JOIN judges j ON s.judge_id = j.id
        WHERE s.candidate_id = $1 AND s.round_id = $2
        GROUP BY s.judge_id, j.name
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
        ) as judges_details
      FROM candidate_info ci
      LEFT JOIN judge_totals jt ON true
      GROUP BY ci.id, ci.candidate_name, ci.registration_number, ci.category_name, ci.round_name
    `, [candidateId, roundId]);
    
    return result.rows[0] || null;
  }

  static async getScoresByRoundCategory(roundId, categoryId) {
    const result = await query(`
      WITH candidate_scores AS (
        SELECT 
          c.id as candidate_id,
          c.name as candidate_name,
          c.registration_number,
          cat.name as category_name,
          s.judge_id,
          j.name as judge_name,
          j.code as judge_code,
          
          -- CAST en float pour éviter les problèmes de type JSON
          COALESCE(SUM(s.total_score::float), 0) as judge_total,
          
          json_agg(
            json_build_object(
              'question_number', s.question_number,
              'recitation_score', COALESCE(s.recitation_score::float, 0),
              'siffat_score', COALESCE(s.siffat_score::float, 0),
              'makharij_score', COALESCE(s.makharij_score::float, 0),
              'minor_error_score', COALESCE(s.minor_error_score::float, 0),
              'question_total', COALESCE(s.total_score::float, 0),
              'comment', COALESCE(s.comment, '')
            ) ORDER BY s.question_number
          ) as questions_details
          
        FROM candidates c
        LEFT JOIN categories cat ON c.category_id = cat.id
        LEFT JOIN scores s ON c.id = s.candidate_id AND s.round_id = $1
        LEFT JOIN judges j ON s.judge_id = j.id
        WHERE c.round_id = $1 
          AND c.category_id = $2
          AND c.status = 'active'
        GROUP BY c.id, c.name, c.registration_number, cat.name, s.judge_id, j.name, j.code
      ),
      
      candidate_summary AS (
        SELECT 
          candidate_id,
          candidate_name,
          registration_number,
          category_name as category,
          
          COUNT(DISTINCT judge_id)::integer as judges_count,
          
          -- CAST en float avec COALESCE pour gérer les NULL
          COALESCE(
            ROUND(
              AVG(
                CASE 
                  WHEN judge_total > 0 THEN judge_total 
                  ELSE NULL 
                END
              )::numeric, 
              2
            )::float, 
            0
          ) as total_score,
          
          COALESCE(
            ROUND(
              AVG(
                CASE 
                  WHEN judge_total > 0 THEN judge_total 
                  ELSE NULL 
                END
              )::numeric / 5, 
              2
            )::float,
            0
          ) as average_per_question,
          
          COALESCE(
            json_agg(
              json_build_object(
                'judge_id', judge_id,
                'judge_name', judge_name,
                'judge_code', judge_code,
                'judge_total', judge_total::float,
                'questions', questions_details
              )
            ),
            '[]'::json
          ) as judges_details
          
        FROM candidate_scores
        GROUP BY candidate_id, candidate_name, registration_number, category_name
      )
      
      SELECT * FROM candidate_summary
      ORDER BY COALESCE(total_score, 0) DESC, candidate_name
    `, [roundId, categoryId]);
    
    // Log de débogage
    console.log('📊 [MODEL] Query result - rows:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('📊 [MODEL] First row total_score:', result.rows[0].total_score);
      console.log('📊 [MODEL] First row total_score type:', typeof result.rows[0].total_score);
    }
    
    return result.rows;
  }

  static async getScoresByQuestion(roundId, categoryId) {
    const result = await query(`
      SELECT 
        c.id as candidate_id,
        c.name as candidate_name,
        c.registration_number,
        s.question_number,
        
        -- Moyenne pour cette question (sur les jurys qui ont noté)
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
              'question_total', s.total_score::float,
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
          SUM(s.total_score::float) as judge_total,
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
          COALESCE(ROUND(AVG(judge_total)::numeric, 2)::float, 0) as total_score,
          COALESCE(ROUND(AVG(judge_total)::numeric / 5, 2)::float, 0) as average_per_question,
          COALESCE(ROUND(AVG(judge_total)::numeric, 2)::float, 0) as final_score,
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
              'judge_total', jt.judge_total::float,
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
}

module.exports = Score;