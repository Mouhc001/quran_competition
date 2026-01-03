const express = require('express');
const router = express.Router();
const Candidate = require('../models/Candidate.model');

// GET /api/candidates - Liste tous les candidats
router.get('/', async (req, res) => {
  try {
    const candidates = await Candidate.findAll();
    
    res.json({
      success: true,
      count: candidates.length,
      data: candidates
    });
  } catch (error) {
    console.error('Erreur récupération candidats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/candidates/:id - Récupère un candidat par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = await Candidate.findById(id);
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidat non trouvé'
      });
    }

    res.json({
      success: true,
      data: candidate
    });
  } catch (error) {
    console.error('Erreur récupération candidat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/candidates - Créer un candidat


// PUT /api/candidates/:id - Mettre à jour un candidat
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const candidate = await Candidate.update(id, updates);
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidat non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Candidat mis à jour avec succès',
      data: candidate
    });
  } catch (error) {
    console.error('Erreur mise à jour candidat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// DELETE /api/candidates/:id - Supprimer un candidat
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await Candidate.delete(id);
    
    res.json({
      success: true,
      message: 'Candidat supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression candidat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/candidates/round/:roundId - Candidats par tour
router.get('/round/:roundId', async (req, res) => {
  try {
    const { roundId } = req.params;
    const candidates = await Candidate.getByRound(roundId);
    
    res.json({
      success: true,
      count: candidates.length,
      data: candidates
    });
  } catch (error) {
    console.error('Erreur récupération candidats par tour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/candidates/:id/qualify - Qualifier un candidat
router.post('/:id/qualify', async (req, res) => {
  try {
    const { id } = req.params;
    const { next_round_id } = req.body;
    
    if (!next_round_id) {
      return res.status(400).json({
        success: false,
        message: 'next_round_id est requis'
      });
    }

    const candidate = await Candidate.qualify(id, next_round_id);
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidat non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Candidat qualifié pour le tour suivant',
      data: candidate
    });
  } catch (error) {
    console.error('Erreur qualification candidat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/candidates/:id/eliminate - Éliminer un candidat
router.post('/:id/eliminate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const candidate = await Candidate.eliminate(id);
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidat non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Candidat éliminé',
      data: candidate
    });
  } catch (error) {
    console.error('Erreur élimination candidat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;