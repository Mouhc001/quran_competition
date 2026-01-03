const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database'); // AJOUTEZ CETTE LIGNE

// Login admin
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    // Récupérer l'admin
    const result = await query(
      'SELECT * FROM admins WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    const admin = result.rows[0];

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      {
        adminId: admin.id,
        email: admin.email,
        name: admin.name,
        type: 'admin'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name
        }
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Vérifier le token admin
router.get('/admin/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token manquant'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Token invalide'
      });
    }

    res.json({
      success: true,
      data: {
        admin: {
          id: decoded.adminId,
          email: decoded.email,
          name: decoded.name
        }
      }
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token invalide ou expiré'
    });
  }
});

module.exports = router;