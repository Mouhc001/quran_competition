const express = require('express');
const router = express.Router();
const Round = require('../models/Round.model');
const { authenticateAdmin } = require('../middleware/auth.middleware.js');

// Route pour récupérer tous les tours
router.get('/', async (req, res) => {
  try {
    const rounds = await Round.findAll();
    res.json({
      success: true,
      data: rounds
    });
  } catch (error) {
    console.error('Erreur récupération tours:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// IMPORTANT : Cette route doit être AVANT la route '/:id'
// Route pour récupérer le tour actif
router.get('/active', async (req, res) => {
  try {
    const activeRound = await Round.findActive();
    
    if (!activeRound) {
      return res.status(404).json({
        success: false,
        message: 'Aucun tour actif'
      });
    }

    res.json({
      success: true,
      data: activeRound
    });
  } catch (error) {
    console.error('Erreur récupération tour actif:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route pour récupérer un tour par ID
router.get('/:id', async (req, res) => {
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
    console.error('Erreur récupération tour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Routes admin protégées
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const round = await Round.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Tour créé avec succès',
      data: round
    });
  } catch (error) {
    console.error('Erreur création tour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const round = await Round.update(id, req.body);
    
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
    console.error('Erreur mise à jour tour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const round = await Round.delete(id);
    
    if (!round) {
      return res.status(404).json({
        success: false,
        message: 'Tour non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Tour supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression tour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route pour activer un tour
router.post('/:id/activate', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const round = await Round.activate(id);
    
    if (!round) {
      return res.status(404).json({
        success: false,
        message: 'Tour non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Tour activé avec succès',
      data: round
    });
  } catch (error) {
    console.error('Erreur activation tour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;