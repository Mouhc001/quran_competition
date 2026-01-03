const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Judge = require('../models/Judge.model');

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