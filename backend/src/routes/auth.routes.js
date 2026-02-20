import express from 'express';
const router = express.Router();
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { query } from '../config/database.js';

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


// Login jury
router.post('/judge/login', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code jury requis'
      });
    }

    // Récupérer le jury par son code
    const result = await query(
      'SELECT * FROM judges WHERE code = $1 AND is_active = true',
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Code jury invalide'
      });
    }

    const judge = result.rows[0];
    
    console.log('👨‍⚖️ Jury trouvé:', judge.code, judge.id);

    // 🔐 GÉNÉRER LE TOKEN AVEC type: 'judge'
    const token = jwt.sign(
      {
        id: judge.id,
        code: judge.code,
        name: judge.name,
        type: 'judge'  // ← CRUCIAL : 'judge' pas 'admin' !
      },
      process.env.JWT_SECRET || 'super_secret_987654321',
      { expiresIn: '8h' }
    );

    console.log('🎫 Token généré pour le jury');

    // Mettre à jour last_login si la colonne existe
    try {
      await query(
        'UPDATE judges SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [judge.id]
      );
    } catch (e) {
      console.log('⚠️ Colonne last_login manquante, ignore');
    }

    res.json({
      success: true,
      message: 'Connexion jury réussie',
      data: {
        token,
        judge: {
          id: judge.id,
          code: judge.code,
          name: judge.name,
          is_active: judge.is_active
        }
      }
    });

  } catch (error) {
    console.error('❌ Judge login error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Vérifier le token jury
router.get('/judge/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token manquant'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Vérifier que c'est bien un token jury
    if (decoded.type !== 'judge') {
      return res.status(403).json({
        success: false,
        message: 'Token non valide pour un jury'
      });
    }

    // Vérifier que le jury existe toujours et est actif
    const result = await query(
      'SELECT id, code, name, is_active, last_login FROM judges WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'Jury non trouvé ou désactivé'
      });
    }

    res.json({
      success: true,
      data: {
        judge: result.rows[0]
      }
    });

  } catch (error) {
    console.error('❌ Judge verify error:', error);
    
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
    
    res.status(401).json({
      success: false,
      message: 'Token invalide'
    });
  }
});

export default router;