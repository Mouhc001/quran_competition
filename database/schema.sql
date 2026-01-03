-- Base de données : Quran Competition

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des administrateurs
CREATE TABLE admins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des jurys
CREATE TABLE judges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);

-- Table des tours
CREATE TABLE rounds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    "order_index" INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT false,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name)
);

-- Table des catégories
CREATE TABLE categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    hizb_count INTEGER NOT NULL,  -- Nombre de Hizb mémorisés
    description TEXT,
    min_age INTEGER,              -- Âge minimum (optionnel)
    max_age INTEGER,              -- Âge maximum (optionnel)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des candidats
CREATE TABLE candidates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    birth_date DATE,
    phone VARCHAR(20),
    email VARCHAR(255),
    category_id UUID REFERENCES categories(id),
    round_id UUID REFERENCES rounds(id),
    status VARCHAR(50) DEFAULT 'active' 
        CHECK (status IN ('active', 'eliminated', 'qualified', 'disqualified')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des scores
CREATE TABLE scores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    judge_id UUID REFERENCES judges(id) ON DELETE CASCADE,
    round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL CHECK (question_number BETWEEN 1 AND 5),
    
    -- Notation
    recitation_score DECIMAL(3,2) DEFAULT 0 
        CHECK (recitation_score BETWEEN 0 AND 2),
    siffat_score DECIMAL(3,2) DEFAULT 0 
        CHECK (siffat_score BETWEEN 0 AND 1),
    makharij_score DECIMAL(3,2) DEFAULT 0 
        CHECK (makharij_score BETWEEN 0 AND 2),
    minor_error_score DECIMAL(3,2) DEFAULT 0 
        CHECK (minor_error_score BETWEEN 0 AND 1),
    
    -- Calculs
    total_score DECIMAL(5,2) GENERATED ALWAYS AS (
        recitation_score + siffat_score + makharij_score + minor_error_score
    ) STORED,
    
    comment TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contrainte d'unicité
    UNIQUE(candidate_id, judge_id, round_id, question_number)
);

-- Vue pour les résultats par candidat
CREATE VIEW candidate_results AS
SELECT 
    c.id as candidate_id,
    c.registration_number,
    c.name as candidate_name,
    c.category_id,
    cat.name as category_name,
    r.id as round_id,
    r.name as round_name,
    COUNT(DISTINCT s.judge_id) as judges_count,
    COUNT(s.question_number) as questions_scored,
    SUM(s.question_total) as total_score,
    ROUND(AVG(s.question_total), 2) as average_per_question,
    ROUND((SUM(s.question_total) / NULLIF(COUNT(DISTINCT s.judge_id), 0)) * 5, 2) as final_score
FROM candidates c
JOIN rounds r ON c.round_id = r.id
JOIN categories cat ON c.category_id = cat.id
LEFT JOIN scores s ON c.id = s.candidate_id AND r.id = s.round_id
GROUP BY c.id, c.registration_number, c.name, c.category_id, 
         cat.name, r.id, r.name;

-- Table des paramètres système
CREATE TABLE system_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des paramètres par défaut
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('competition_name', 'Concours National de Récitation du Coran', 'Nom du concours'),
    ('current_year', '2024', 'Année du concours'),
    ('max_judges_per_candidate', '3', 'Nombre maximum de jurys par candidat'),
    ('scoring_enabled', 'true', 'Activation du système de notation'),
    ('registration_open', 'true', 'Inscriptions ouvertes');

-- Index pour les performances
CREATE INDEX idx_candidates_round ON candidates(round_id);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_category ON candidates(category_id);
CREATE INDEX idx_scores_candidate_round ON scores(candidate_id, round_id);
CREATE INDEX idx_scores_judge_round ON scores(judge_id, round_id);
CREATE INDEX idx_scores_submitted_at ON scores(submitted_at);

-- Fonction pour mettre à jour le timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_judges_updated_at BEFORE UPDATE ON judges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rounds_updated_at BEFORE UPDATE ON rounds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();