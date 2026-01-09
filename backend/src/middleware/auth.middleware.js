const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

exports.authenticateJudge = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Accès non autorisé. Token manquant.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
    
    console.log('🔐 Token décodé:', decoded);
    
    // CORRECTION : Utilisez decoded.id au lieu de decoded.judgeId
    const judgeResult = await query(
      'SELECT * FROM judges WHERE id = $1',
      [decoded.id] // ← CHANGER ICI
    );
    
    if (judgeResult.rows.length === 0) {
      console.log('❌ Jury non trouvé dans la base');
      return res.status(401).json({
        success: false,
        message: 'Jury non autorisé'
      });
    }
    
    const judge = judgeResult.rows[0];
    
    if (!judge.is_active) {
      console.log('❌ Jury désactivé');
      return res.status(401).json({
        success: false,
        message: 'Compte jury désactivé'
      });
    }

    req.user = {
      id: decoded.id,
      code: decoded.code,
      name: decoded.name,
      type: 'judge'
    };
    
    console.log('✅ Jury authentifié:', req.user);
    
    next();
  } catch (error) {
    console.error('❌ Erreur authentification jury:', error);
    
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
    
    return res.status(401).json({
      success: false,
      message: 'Erreur d\'authentification'
    });
  }
};

exports.authenticateAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Accès non autorisé. Token manquant.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux administrateurs'
      });
    }

    // Vérifier si l'admin existe
    const adminResult = await query(
      'SELECT * FROM admins WHERE id = $1',
      [decoded.adminId]
    );
    
    if (adminResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Administrateur non trouvé'
      });
    }

    req.user = {
      id: decoded.adminId,
      email: decoded.email,
      type: 'admin'
    };
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token invalide ou expiré'
    });
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.user?.type !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs'
    });
  }
  next();
};