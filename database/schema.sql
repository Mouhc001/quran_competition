-- =============================================
-- Base de données : Quran Competition
-- Schéma complet avec gestion de la qualification
-- =============================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Table des administrateurs
-- =============================================
CREATE TABLE admins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table des jurys
-- =============================================
CREATE TABLE judges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table des tours
-- =============================================
CREATE TABLE rounds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT false,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name)
);

-- =============================================
-- Table des catégories
-- =============================================
CREATE TABLE categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    hizb_count INTEGER NOT NULL,  -- Nombre de Hizb mémorisés
    description TEXT,
    min_age INTEGER,              -- Âge minimum (optionnel)
    max_age INTEGER,              -- Âge maximum (optionnel)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table des candidats (AVEC GESTION DES CLONES)
-- =============================================
CREATE TABLE candidates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    registration_number VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    birth_date DATE,
    phone VARCHAR(20),
    email VARCHAR(255),
    category_id UUID REFERENCES categories(id),
    round_id UUID REFERENCES rounds(id),
    
    -- Gestion des clones pour la qualification
    original_candidate_id UUID REFERENCES candidates(id),
    is_original BOOLEAN DEFAULT true,
    
    -- Statut du candidat
    status VARCHAR(50) DEFAULT 'active' 
        CHECK (status IN ('active', 'eliminated', 'qualified', 'disqualified')),
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contrainte d'unicité par tour
    UNIQUE(registration_number, round_id)
);

-- =============================================
-- Table des scores
-- =============================================
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
    
    -- Calcul du score total
    total_score DECIMAL(5,2) GENERATED ALWAYS AS (
        recitation_score + siffat_score + makharij_score + minor_error_score
    ) STORED,
    
    comment TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contrainte d'unicité
    UNIQUE(candidate_id, judge_id, round_id, question_number)
);

-- =============================================
-- Table de suivi de la qualification
-- =============================================
CREATE TABLE candidate_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    from_round_id UUID NOT NULL REFERENCES rounds(id),
    to_round_id UUID NOT NULL REFERENCES rounds(id),
    
    status VARCHAR(20) NOT NULL DEFAULT 'qualified',
    qualified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    qualified_by UUID REFERENCES admins(id),
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contrainte pour éviter les doublons
    UNIQUE(candidate_id, to_round_id)
);

-- =============================================
-- Table des paramètres système
-- =============================================
CREATE TABLE system_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- VUES
-- =============================================

-- Vue pour les résultats par candidat (AMÉLIORÉE)
CREATE OR REPLACE VIEW candidate_results AS
SELECT 
    c.id as candidate_id,
    c.registration_number,
    c.name as candidate_name,
    c.category_id,
    cat.name as category_name,
    cat.hizb_count,
    r.id as round_id,
    r.name as round_name,
    r.order_index as round_order,
    
    -- Gestion des clones
    c.is_original,
    c.original_candidate_id,
    
    -- Statut
    c.status,
    
    -- Statistiques de notation
    COUNT(DISTINCT s.judge_id) as judges_count,
    COUNT(s.question_number) as questions_scored,
    COALESCE(SUM(s.total_score), 0) as total_score,
    ROUND(COALESCE(AVG(s.total_score), 0), 2) as average_per_question,
    ROUND(COALESCE((SUM(s.total_score) / NULLIF(COUNT(DISTINCT s.judge_id), 0)) * 5, 0), 2) as final_score,
    
    -- Calcul du score sur 30 (5 questions × 6 points max)
    ROUND(COALESCE(SUM(s.total_score), 0) * 5, 2) as score_out_of_30
    
FROM candidates c
JOIN rounds r ON c.round_id = r.id
JOIN categories cat ON c.category_id = cat.id
LEFT JOIN scores s ON c.id = s.candidate_id AND r.id = s.round_id
GROUP BY c.id, c.registration_number, c.name, c.category_id, 
         cat.name, cat.hizb_count, r.id, r.name, r.order_index, 
         c.is_original, c.original_candidate_id, c.status;

-- Vue pour l'historique de qualification
CREATE OR REPLACE VIEW candidate_qualification_history AS
SELECT 
    cp.id as progress_id,
    cp.candidate_id,
    c.name as candidate_name,
    c.registration_number,
    
    -- Tour de départ
    cp.from_round_id,
    r1.name as from_round_name,
    r1.order_index as from_round_order,
    
    -- Tour d'arrivée
    cp.to_round_id,
    r2.name as to_round_name,
    r2.order_index as to_round_order,
    
    -- Informations de qualification
    cp.status,
    cp.qualified_at,
    cp.qualified_by,
    a.name as qualified_by_name,
    cp.notes,
    
    -- Clone créé
    cl.id as cloned_candidate_id,
    cl.registration_number as cloned_registration_number
    
FROM candidate_progress cp
JOIN candidates c ON cp.candidate_id = c.id
JOIN rounds r1 ON cp.from_round_id = r1.id
JOIN rounds r2 ON cp.to_round_id = r2.id
LEFT JOIN admins a ON cp.qualified_by = a.id
LEFT JOIN candidates cl ON cl.original_candidate_id = c.id AND cl.round_id = r2.id;

-- =============================================
-- INSERTION DES DONNÉES PAR DÉFAUT
-- =============================================

-- Paramètres système
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('competition_name', 'Concours National de Récitation du Coran', 'Nom du concours'),
    ('current_year', '2024', 'Année du concours'),
    ('max_judges_per_candidate', '3', 'Nombre maximum de jurys par candidat'),
    ('min_judges_to_qualify', '3', 'Nombre minimum de jurys pour qualifier'),
    ('scoring_enabled', 'true', 'Activation du système de notation'),
    ('registration_open', 'true', 'Inscriptions ouvertes'),
    ('auto_qualification_threshold', '15', 'Score minimum pour qualification automatique');

-- Catégories par défaut
INSERT INTO categories (name, hizb_count, description) VALUES
    ('Débutant (5 Hizb)', 5, 'Pour ceux qui ont mémorisé 5 Hizb ou moins'),
    ('Intermédiaire (10 Hizb)', 10, 'Pour ceux qui ont mémorisé entre 6 et 10 Hizb'),
    ('Avancé (20 Hizb)', 20, 'Pour ceux qui ont mémorisé entre 11 et 20 Hizb'),
    ('Expert (30 Hizb)', 30, 'Pour ceux qui ont mémorisé 30 Hizb (le Coran complet)');

-- Tours par défaut
INSERT INTO rounds (name, description, order_index, is_active) VALUES
    ('1/32 de finale', 'Premier tour de qualification', 1, true),
    ('1/16 de finale', 'Deuxième tour', 2, false),
    ('1/8 de finale', 'Troisième tour', 3, false),
    ('Quart de finale', 'Quatrième tour', 4, false),
    ('Demi-finale', 'Cinquième tour', 5, false),
    ('Finale', 'Tour final', 6, false);

-- =============================================
-- INDEX POUR LES PERFORMANCES
-- =============================================

-- Index pour les candidats
CREATE INDEX idx_candidates_round ON candidates(round_id);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_category ON candidates(category_id);
CREATE INDEX idx_candidates_original ON candidates(original_candidate_id);
CREATE INDEX idx_candidates_is_original ON candidates(is_original);
CREATE INDEX idx_candidates_registration ON candidates(registration_number);

-- Index pour les scores
CREATE INDEX idx_scores_candidate_round ON scores(candidate_id, round_id);
CREATE INDEX idx_scores_judge_round ON scores(judge_id, round_id);
CREATE INDEX idx_scores_candidate_judge ON scores(candidate_id, judge_id);
CREATE INDEX idx_scores_submitted_at ON scores(submitted_at);

-- Index pour le suivi de qualification
CREATE INDEX idx_candidate_progress_candidate ON candidate_progress(candidate_id);
CREATE INDEX idx_candidate_progress_from_round ON candidate_progress(from_round_id);
CREATE INDEX idx_candidate_progress_to_round ON candidate_progress(to_round_id);
CREATE INDEX idx_candidate_progress_qualified_at ON candidate_progress(qualified_at);

-- Index pour les tours
CREATE INDEX idx_rounds_order_index ON rounds(order_index);
CREATE INDEX idx_rounds_is_active ON rounds(is_active);

-- Index pour les catégories
CREATE INDEX idx_categories_hizb_count ON categories(hizb_count);

-- =============================================
-- FONCTIONS ET TRIGGERS
-- =============================================

-- Fonction pour mettre à jour le timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_admins_updated_at 
    BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_judges_updated_at 
    BEFORE UPDATE ON judges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rounds_updated_at 
    BEFORE UPDATE ON rounds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at 
    BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidate_progress_updated_at 
    BEFORE UPDATE ON candidate_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour générer un numéro d'inscription unique par tour
CREATE OR REPLACE FUNCTION generate_registration_number(round_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    round_order INTEGER;
    candidate_count INTEGER;
    prefix VARCHAR(10);
    registration_num VARCHAR(50);
BEGIN
    -- Récupérer l'ordre du tour
    SELECT order_index INTO round_order 
    FROM rounds WHERE id = round_id;
    
    -- Compter les candidats dans ce tour
    SELECT COUNT(*) INTO candidate_count 
    FROM candidates 
    WHERE round_id = generate_registration_number.round_id;
    
    -- Générer un préfixe basé sur l'ordre du tour
    prefix := 'R' || LPAD(round_order::TEXT, 2, '0');
    
    -- Générer le numéro d'inscription
    registration_num := prefix || '-' || LPAD((candidate_count + 1)::TEXT, 3, '0');
    
    RETURN registration_num;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier si un candidat peut être qualifié
CREATE OR REPLACE FUNCTION can_qualify_candidate(candidate_id UUID)
RETURNS TABLE (
    can_qualify BOOLEAN,
    judges_count INTEGER,
    total_score DECIMAL(5,2),
    message TEXT
) AS $$
DECLARE
    candidate_record RECORD;
    judges_count_var INTEGER;
    total_score_var DECIMAL(5,2);
    min_judges INTEGER;
BEGIN
    -- Récupérer le paramètre système
    SELECT setting_value::INTEGER INTO min_judges 
    FROM system_settings 
    WHERE setting_key = 'min_judges_to_qualify';
    
    IF min_judges IS NULL THEN
        min_judges := 3;
    END IF;
    
    -- Récupérer les informations du candidat
    SELECT c.*, r.order_index INTO candidate_record
    FROM candidates c
    JOIN rounds r ON c.round_id = r.id
    WHERE c.id = candidate_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, 0, 'Candidat non trouvé';
        RETURN;
    END IF;
    
    -- Vérifier si déjà qualifié
    IF candidate_record.status = 'qualified' THEN
        RETURN QUERY SELECT false, 0, 0, 'Candidat déjà qualifié';
        RETURN;
    END IF;
    
    -- Compter les jurys qui ont noté
    SELECT COUNT(DISTINCT judge_id), COALESCE(SUM(total_score), 0)
    INTO judges_count_var, total_score_var
    FROM scores 
    WHERE candidate_id = can_qualify_candidate.candidate_id 
      AND round_id = candidate_record.round_id;
    
    -- Vérifier les conditions
    IF judges_count_var < min_judges THEN
        RETURN QUERY SELECT false, judges_count_var, total_score_var, 
            format('Seulement %s/%s jurys ont noté', judges_count_var, min_judges);
        RETURN;
    END IF;
    
    RETURN QUERY SELECT true, judges_count_var, total_score_var, 
        format('Prêt à qualifier (%s jurys, score: %s)', judges_count_var, total_score_var);
    
END;
$$ LANGUAGE plpgsql;

-- Fonction pour qualifier automatiquement les candidats éligibles
CREATE OR REPLACE FUNCTION auto_qualify_candidates(round_id UUID)
RETURNS INTEGER AS $$
DECLARE
    qualified_count INTEGER := 0;
    candidate_record RECORD;
    can_qualify_result RECORD;
    next_round_record RECORD;
BEGIN
    -- Trouver le tour suivant
    SELECT * INTO next_round_record 
    FROM rounds 
    WHERE order_index = (
        SELECT order_index + 1 
        FROM rounds 
        WHERE id = round_id
    );
    
    -- Parcourir tous les candidats actifs du tour
    FOR candidate_record IN 
        SELECT c.id, c.name, c.registration_number, c.category_id
        FROM candidates c
        WHERE c.round_id = auto_qualify_candidates.round_id 
          AND c.status = 'active'
    LOOP
        -- Vérifier si le candidat peut être qualifié
        SELECT * INTO can_qualify_result
        FROM can_qualify_candidate(candidate_record.id);
        
        IF can_qualify_result.can_qualify THEN
            -- Qualifier le candidat
            PERFORM qualify_single_candidate(
                candidate_record.id,
                round_id,
                next_round_record.id,
                'system'::UUID
            );
            
            qualified_count := qualified_count + 1;
        END IF;
    END LOOP;
    
    RETURN qualified_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction utilitaire pour qualifier un seul candidat
CREATE OR REPLACE FUNCTION qualify_single_candidate(
    candidate_id UUID,
    from_round_id UUID,
    to_round_id UUID,
    qualified_by UUID
)
RETURNS UUID AS $$
DECLARE
    candidate_record RECORD;
    new_candidate_id UUID;
    registration_num VARCHAR(50);
BEGIN
    -- Récupérer les informations du candidat
    SELECT * INTO candidate_record 
    FROM candidates 
    WHERE id = candidate_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidat non trouvé';
    END IF;
    
    -- Générer un nouveau numéro d'inscription
    registration_num := generate_registration_number(to_round_id);
    
    -- Créer un clone du candidat pour le nouveau tour
    INSERT INTO candidates (
        registration_number,
        name,
        birth_date,
        phone,
        email,
        category_id,
        round_id,
        original_candidate_id,
        is_original,
        status,
        notes
    ) VALUES (
        registration_num,
        candidate_record.name,
        candidate_record.birth_date,
        candidate_record.phone,
        candidate_record.email,
        candidate_record.category_id,
        to_round_id,
        candidate_record.original_candidate_id OR candidate_record.id,
        false,
        'active',
        candidate_record.notes
    ) RETURNING id INTO new_candidate_id;
    
    -- Mettre à jour le statut du candidat original
    UPDATE candidates 
    SET status = 'qualified' 
    WHERE id = candidate_id;
    
    -- Enregistrer l'historique de qualification
    INSERT INTO candidate_progress (
        candidate_id,
        from_round_id,
        to_round_id,
        qualified_by,
        notes
    ) VALUES (
        candidate_record.original_candidate_id OR candidate_record.id,
        from_round_id,
        to_round_id,
        qualified_by,
        format('Qualifié de %s vers %s', 
               (SELECT name FROM rounds WHERE id = from_round_id),
               (SELECT name FROM rounds WHERE id = to_round_id))
    );
    
    RETURN new_candidate_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTAIRES DES TABLES
-- =============================================
COMMENT ON TABLE admins IS 'Administrateurs du système';
COMMENT ON TABLE judges IS 'Jury évaluant les candidats';
COMMENT ON TABLE rounds IS 'Tours du concours (1/32, 1/16, 1/8, etc.)';
COMMENT ON TABLE categories IS 'Catégories de mémorisation (par nombre de Hizb)';
COMMENT ON TABLE candidates IS 'Candidats avec gestion des clones pour chaque tour';
COMMENT ON TABLE scores IS 'Notes attribuées par les jurys aux candidats';
COMMENT ON TABLE candidate_progress IS 'Historique de qualification des candidats';
COMMENT ON TABLE system_settings IS 'Paramètres de configuration du système';

-- =============================================
-- FIN DU SCHÉMA
-- =============================================