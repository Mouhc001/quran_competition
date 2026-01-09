const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Judge = require('../models/Judge.model');
const authenticateJudge = require('../middleware/auth.middleware').authenticateJudge;


// POST /api/judges/login - Connexion d'un jury
router.post('/login', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code requis'
      });
    }

    const judge = await Judge.findByCode(code);
    
    if (!judge) {
      return res.status(401).json({
        success: false,
        message: 'Code invalide'
      });
    }

    if (!judge.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Compte jury désactivé'
      });
    }

    // Mettre à jour la dernière connexion
    await Judge.updateLastLogin(judge.id);

    // Créer un token JWT
    const token = jwt.sign(
      { 
        id: judge.id, 
        code: judge.code, 
        name: judge.name,
        role: 'judge' 
      },
      process.env.JWT_SECRET || 'votre_secret_jwt',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        token,
        judge: {
          id: judge.id,
          code: judge.code,
          name: judge.name
        }
      }
    });

  } catch (error) {
    console.error('Erreur connexion jury:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/judges/me - Récupérer les infos du jury connecté
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token manquant'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
    
    const judge = await Judge.findById(decoded.id);
    
    if (!judge) {
      return res.status(401).json({
        success: false,
        message: 'Jury non trouvé'
      });
    }

    // Retourner seulement les infos publiques
    const { password_hash, ...judgeData } = judge;
    
    res.json({
      success: true,
      data: judgeData
    });

  } catch (error) {
    console.error('Erreur récupération jury:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/judges - Liste tous les jurys
router.get('/', async (req, res) => {
  try {
    const judges = await Judge.findAll();
    
    res.json({
      success: true,
      count: judges.length,
      data: judges
    });
  } catch (error) {
    console.error('Erreur récupération jurys:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/judges/active-candidates - Candidats du tour actif pour les jurys
router.get('/active-candidates', authenticateJudge, async (req, res) => {
  try {
    const judgeId = req.user.id;
    console.log('🎯 Jury ID:', judgeId);
    
    // Récupérer le tour actif
    const { query } = require('../config/database');
    const activeRoundQuery = await query(
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
    
    // Récupérer les candidats VISIBLES pour les jurys
    const candidatesQuery = await query(`
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
});

// GET /api/judges/:id - Récupérer un jury par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const judge = await Judge.findById(id);
    
    if (!judge) {
      return res.status(404).json({
        success: false,
        message: 'Jury non trouvé'
      });
    }

    // Ne pas renvoyer le hash de mot de passe
    const { password_hash, ...judgeData } = judge;
    
    res.json({
      success: true,
      data: judgeData
    });
  } catch (error) {
    console.error('Erreur récupération jury:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/judges - Créer un nouveau jury
router.post('/', async (req, res) => {
  try {
    const { code, name } = req.body;
    
    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: 'code et name sont requis'
      });
    }

    // Vérifier si le code existe déjà
    const existing = await Judge.findByCode(code);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Code déjà utilisé'
      });
    }

    const judge = await Judge.create({ code, name });
    
    res.status(201).json({
      success: true,
      message: 'Jury créé avec succès',
      data: judge
    });
  } catch (error) {
    console.error('Erreur création jury:', error);
    
    if (error.code === '23505') { // Violation d'unicité
      return res.status(409).json({
        success: false,
        message: 'Code déjà utilisé'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PUT /api/judges/:id/activate - Activer un jury
router.put('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const judge = await Judge.activate(id);
    
    if (!judge) {
      return res.status(404).json({
        success: false,
        message: 'Jury non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Jury activé avec succès',
      data: judge
    });
  } catch (error) {
    console.error('Erreur activation jury:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PUT /api/judges/:id/deactivate - Désactiver un jury
router.put('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const judge = await Judge.deactivate(id);
    
    if (!judge) {
      return res.status(404).json({
        success: false,
        message: 'Jury non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Jury désactivé avec succès',
      data: judge
    });
  } catch (error) {
    console.error('Erreur désactivation jury:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;