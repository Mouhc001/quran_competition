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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Vérifier si le jury existe et est actif
    const judgeResult = await query(
      'SELECT * FROM judges WHERE id = $1',
      [decoded.judgeId]
    );
    
    if (judgeResult.rows.length === 0 || !judgeResult.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'Jury non autorisé ou désactivé'
      });
    }

    req.user = {
      id: decoded.judgeId,
      code: decoded.code,
      type: 'judge'
    };
    
    // Mettre à jour le last_login
    await query(
      'UPDATE judges SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [decoded.judgeId]
    );
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token invalide ou expiré'
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