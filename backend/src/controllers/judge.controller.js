// backend/controllers/judge.controller.js
const pool = require('../config/database');

class JudgeController {
  // Récupérer les candidats du tour actif pour les jurys (seulement les derniers clones)
  static async getActiveRoundCandidates(req, res) {
    try {
      const judgeId = req.user.id;
      console.log('🎯 Jury ID:', judgeId);
      
      // Récupérer le tour actif
      const activeRoundQuery = await pool.query(
        'SELECT * FROM rounds WHERE is_active = true ORDER BY order_index LIMIT 1'
      );
      
      if (activeRoundQuery.rows.length === 0) {
        return res.json({
          success: true,
          data: [],
          message: 'Aucun tour actif'
        });
      }
      
      const activeRound = activeRoundQuery.rows[0];
      console.log('🏆 Tour actif:', activeRound.name);
      
      // Récupérer les candidats VISIBLES pour les jurys :
      // 1. Les clones (is_original = false) du tour actif
      // 2. Ou les originaux qui n'ont pas encore de clone dans ce tour
      const candidatesQuery = await pool.query(`
        SELECT DISTINCT ON (coalesce(c.original_candidate_id, c.id)) 
          c.*,
          cat.name as category_name,
          COALESCE((
            SELECT COUNT(DISTINCT s.judge_id) 
            FROM scores s 
            WHERE s.candidate_id = c.id 
            AND s.round_id = c.round_id
          ), 0) as judges_count,
          COALESCE((
            SELECT SUM(total_score)
            FROM scores 
            WHERE candidate_id = c.id
          ), 0) as total_score,
          
          -- Vérifier si ce jury a déjà noté ce candidat
          EXISTS(
            SELECT 1 FROM scores s2 
            WHERE s2.candidate_id = c.id 
            AND s2.judge_id = $1
            AND s2.round_id = $2
          ) as already_scored
          
        FROM candidates c
        LEFT JOIN categories cat ON c.category_id = cat.id
        WHERE c.round_id = $2
          AND (
            -- Soit c'est un clone dans ce tour
            (c.is_original = false AND c.original_candidate_id IS NOT NULL)
            -- Soit c'est un original qui n'a pas encore de clone dans ce tour
            OR (c.is_original = true AND NOT EXISTS (
              SELECT 1 FROM candidates c2 
              WHERE c2.original_candidate_id = c.id 
              AND c2.round_id = $2
            ))
          )
          AND c.status = 'active'
        ORDER BY coalesce(c.original_candidate_id, c.id), c.is_original DESC
      `, [judgeId, activeRound.id]);
      
      console.log(`📊 ${candidatesQuery.rows.length} candidats trouvés pour le jury`);
      
      res.json({
        success: true,
        data: candidatesQuery.rows,
        activeRound: {
          id: activeRound.id,
          name: activeRound.name,
          order_index: activeRound.order_index
        }
      });
      
    } catch (error) {
      console.error('❌ Erreur récupération candidats jury:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
}

module.exports = JudgeController;