import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import Admin from '../models/Admin.model.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email et mot de passe requis' 
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: 'Identifiants incorrects' 
      });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        message: 'Identifiants incorrects' 
      });
    }

    const token = jwt.sign(
      { 
        id: admin._id, 
        email: admin.email,
        role: admin.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        token,
        admin: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role
        }
      }
    });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur'
    });
  }
};

export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false,
        message: 'Tous les champs sont requis' 
      });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false,
        message: 'Cet email est déjà utilisé' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      email,
      password: hashedPassword,
      name,
      role: 'admin'
    });

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      data: {
        admin: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role
        }
      }
    });
  } catch (error) {
    console.error('Erreur register:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur'
    });
  }
};

export const logout = async (req, res) => {
  try {
    res.json({ 
      success: true,
      message: 'Déconnexion réussie' 
    });
  } catch (error) {
    console.error('Erreur logout:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur'
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password');
    
    if (!admin) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }

    res.json({ 
      success: true,
      data: { admin }
    });
  } catch (error) {
    console.error('Erreur getCurrentUser:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur'
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false,
        message: 'Token requis' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const newToken = jwt.sign(
      { 
        id: decoded.id, 
        email: decoded.email,
        role: decoded.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      success: true,
      data: { token: newToken }
    });
  } catch (error) {
    console.error('Erreur refreshToken:', error);
    res.status(401).json({ 
      success: false,
      message: 'Token invalide'
    });
  }
};