import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Configuration CORS complète
const allowedOrigins = [
  'http://localhost:3000',           // développement local
  'https://quran-competition-nine.vercel.app'      // remplace par ton URL Vercel
  
];

app.use(cors({
  origin: function(origin, callback) {
    // Autorise les requêtes sans origin (comme Postman) ou si l'origine est dans la liste
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // important pour les cookies/tokens
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Gère les preflight requests OPTIONS
app.options('*', cors());

app.use(bodyParser.json());

// PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Middleware pour partager pool avec les routes
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

// Crée un admin si aucun n'existe
async function createAdminIfNone() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM admins LIMIT 1');
    if (res.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('MotDePasseSecurise123', 10);
      await client.query(
        'INSERT INTO admins(email, password_hash) VALUES($1, $2)',
        ['admin@exemple.com', hashedPassword]
      );
      console.log('✅ Admin créé automatiquement : admin@exemple.com / MotDePasseSecurise123');
    }
  } catch (err) {
    console.error('❌ Erreur création admin :', err);
  } finally {
    client.release();
  }
}

// Routes
app.get('/', (req, res) => res.send('API is running'));
app.use('/api/auth', authRoutes);

// Lancement serveur
(async () => {
  await createAdminIfNone();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})();