import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Pool } from 'pg'; // si tu utilises pg directement
// import { prisma } from './prismaClient.js'; // si tu utilises Prisma
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// === Configuration PostgreSQL ===
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // nécessaire pour Render/Neon
});

// === Fonction pour créer un admin si aucun n'existe ===
async function createAdminIfNone() {
  try {
    const client = await pool.connect();

    const res = await client.query('SELECT * FROM admins LIMIT 1');
    if (res.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('MotDePasseSecurise123', 10);
      await client.query(
        'INSERT INTO admins(email, password) VALUES($1, $2)',
        ['admin@exemple.com', hashedPassword]
      );
      console.log('✅ Admin créé automatiquement : admin@exemple.com / MotDePasseSecurise123');
    } else {
      console.log('ℹ️ Admin déjà existant, aucune action nécessaire');
    }

    client.release();
  } catch (err) {
    console.error('❌ Erreur lors de la création de l\'admin :', err);
  }
}

// === Routes ===
app.get('/', (req, res) => {
  res.send('API is running');
});

// TODO: tes autres routes ici
// app.use('/auth', authRoutes);
// app.use('/users', userRoutes);

// === Lancement du serveur ===
(async () => {
  await createAdminIfNone(); // Crée l’admin avant de démarrer le serveur

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})();
