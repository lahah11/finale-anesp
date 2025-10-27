-- Migration SQLite pour le système complet de gestion des missions

-- 1. Table des missions
CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    mission_reference TEXT UNIQUE NOT NULL,
    institution_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    
    -- Informations de base
    mission_object TEXT NOT NULL,
    departure_date TEXT NOT NULL,
    return_date TEXT NOT NULL,
    transport_mode TEXT NOT NULL,
    
    -- Calculs automatiques
    estimated_fuel REAL,
    estimated_costs REAL,
    distance_km REAL,
    
    -- Statut et workflow
    status TEXT DEFAULT 'draft',
    current_step INTEGER DEFAULT 1,
    
    -- Validations
    technical_validated_by TEXT,
    technical_validated_at DATETIME,
    technical_rejection_reason TEXT,
    
    logistics_validated_by TEXT,
    logistics_validated_at DATETIME,
    assigned_vehicle_id TEXT,
    assigned_driver_id TEXT,
    
    finance_validated_by TEXT,
    finance_validated_at DATETIME,
    finance_rejection_reason TEXT,
    
    dg_validated_by TEXT,
    dg_validated_at DATETIME,
    dg_rejection_reason TEXT,
    
    -- Documents générés
    authorization_document_url TEXT,
    mission_order_document_url TEXT,
    route_document_url TEXT,
    budget_document_url TEXT,
    fuel_exit_document_url TEXT,
    budget_usage_document_url TEXT,
    
    -- Métadonnées
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (technical_validated_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (logistics_validated_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (finance_validated_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (dg_validated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 2. Table des participants aux missions
CREATE TABLE IF NOT EXISTS mission_participants (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    mission_id TEXT NOT NULL,
    participant_type TEXT NOT NULL,
    
    -- Pour personnel ANESP
    employee_id TEXT,
    
    -- Pour personnel externe
    external_name TEXT,
    external_firstname TEXT,
    external_nni TEXT,
    external_profession TEXT,
    external_ministry TEXT,
    external_phone TEXT,
    external_email TEXT,
    
    -- Rôle dans la mission
    role_in_mission TEXT NOT NULL,
    
    -- Calculs de frais
    daily_allowance REAL,
    accommodation_allowance REAL,
    transport_allowance REAL,
    total_allowance REAL,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- 3. Table des véhicules
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    institution_id TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    license_plate TEXT UNIQUE NOT NULL,
    year INTEGER,
    fuel_type TEXT,
    fuel_consumption REAL,
    capacity INTEGER,
    is_available BOOLEAN DEFAULT 1,
    current_location TEXT,
    maintenance_due_date TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
);

-- 4. Table des chauffeurs
CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    institution_id TEXT NOT NULL,
    employee_id TEXT,
    
    -- Informations du chauffeur
    full_name TEXT NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    license_type TEXT NOT NULL,
    license_expiry_date TEXT,
    phone TEXT,
    email TEXT,
    
    -- Statut
    is_available BOOLEAN DEFAULT 1,
    current_mission_id TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (current_mission_id) REFERENCES missions(id) ON DELETE SET NULL
);

-- 5. Table des villes et distances
CREATE TABLE IF NOT EXISTS cities (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    region TEXT,
    country TEXT DEFAULT 'Mauritanie',
    latitude REAL,
    longitude REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS city_distances (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    from_city_id TEXT NOT NULL,
    to_city_id TEXT NOT NULL,
    distance_km REAL NOT NULL,
    estimated_fuel_liters REAL,
    estimated_travel_time_hours REAL,
    
    FOREIGN KEY (from_city_id) REFERENCES cities(id) ON DELETE CASCADE,
    FOREIGN KEY (to_city_id) REFERENCES cities(id) ON DELETE CASCADE,
    UNIQUE(from_city_id, to_city_id)
);

-- 6. Table des frais de mission par profil
CREATE TABLE IF NOT EXISTS mission_allowances (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    institution_id TEXT NOT NULL,
    profile_type TEXT NOT NULL,
    daily_allowance REAL NOT NULL,
    accommodation_allowance REAL,
    transport_allowance REAL,
    is_active BOOLEAN DEFAULT 1,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
);

-- 7. Table des documents générés
CREATE TABLE IF NOT EXISTS mission_documents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    mission_id TEXT NOT NULL,
    document_type TEXT NOT NULL,
    document_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    generated_by TEXT NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    mission_id TEXT,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
);

-- Index pour les performances (créés après les tables)
-- CREATE INDEX IF NOT EXISTS idx_missions_institution ON missions(institution_id);
-- CREATE INDEX IF NOT EXISTS idx_missions_created_by ON missions(created_by);
-- CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
-- CREATE INDEX IF NOT EXISTS idx_missions_dates ON missions(departure_date, return_date);
-- CREATE INDEX IF NOT EXISTS idx_mission_participants_mission ON mission_participants(mission_id);
-- CREATE INDEX IF NOT EXISTS idx_vehicles_institution ON vehicles(institution_id);
-- CREATE INDEX IF NOT EXISTS idx_drivers_institution ON drivers(institution_id);
-- CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
-- CREATE INDEX IF NOT EXISTS idx_notifications_mission ON notifications(mission_id);

-- Insertion des villes principales de Mauritanie
INSERT OR IGNORE INTO cities (id, name, region, country) VALUES
(lower(hex(randomblob(16))), 'Nouakchott', 'Nouakchott', 'Mauritanie'),
(lower(hex(randomblob(16))), 'Nouadhibou', 'Dakhlet Nouadhibou', 'Mauritanie'),
(lower(hex(randomblob(16))), 'Rosso', 'Trarza', 'Mauritanie'),
(lower(hex(randomblob(16))), 'Kaédi', 'Gorgol', 'Mauritanie'),
(lower(hex(randomblob(16))), 'Kiffa', 'Assaba', 'Mauritanie'),
(lower(hex(randomblob(16))), 'Zouérat', 'Tiris Zemmour', 'Mauritanie'),
(lower(hex(randomblob(16))), 'Atar', 'Adrar', 'Mauritanie'),
(lower(hex(randomblob(16))), 'Aleg', 'Brakna', 'Mauritanie'),
(lower(hex(randomblob(16))), 'Sélibaby', 'Guidimakha', 'Mauritanie'),
(lower(hex(randomblob(16))), 'Néma', 'Hodh Ech Chargui', 'Mauritanie');

-- Insertion des barèmes de frais par défaut
INSERT OR IGNORE INTO mission_allowances (id, institution_id, profile_type, daily_allowance, accommodation_allowance, transport_allowance, is_active) 
SELECT 
    lower(hex(randomblob(16))),
    i.id,
    'director',
    5000,
    3000,
    2000,
    1
FROM institutions i
WHERE NOT EXISTS (
    SELECT 1 FROM mission_allowances ma 
    WHERE ma.institution_id = i.id AND ma.profile_type = 'director'
);

INSERT OR IGNORE INTO mission_allowances (id, institution_id, profile_type, daily_allowance, accommodation_allowance, transport_allowance, is_active) 
SELECT 
    lower(hex(randomblob(16))),
    i.id,
    'engineer',
    4000,
    2500,
    1500,
    1
FROM institutions i
WHERE NOT EXISTS (
    SELECT 1 FROM mission_allowances ma 
    WHERE ma.institution_id = i.id AND ma.profile_type = 'engineer'
);

INSERT OR IGNORE INTO mission_allowances (id, institution_id, profile_type, daily_allowance, accommodation_allowance, transport_allowance, is_active) 
SELECT 
    lower(hex(randomblob(16))),
    i.id,
    'technician',
    3000,
    2000,
    1000,
    1
FROM institutions i
WHERE NOT EXISTS (
    SELECT 1 FROM mission_allowances ma 
    WHERE ma.institution_id = i.id AND ma.profile_type = 'technician'
);

INSERT OR IGNORE INTO mission_allowances (id, institution_id, profile_type, daily_allowance, accommodation_allowance, transport_allowance, is_active) 
SELECT 
    lower(hex(randomblob(16))),
    i.id,
    'driver',
    2500,
    1500,
    800,
    1
FROM institutions i
WHERE NOT EXISTS (
    SELECT 1 FROM mission_allowances ma 
    WHERE ma.institution_id = i.id AND ma.profile_type = 'driver'
);

INSERT OR IGNORE INTO mission_allowances (id, institution_id, profile_type, daily_allowance, accommodation_allowance, transport_allowance, is_active) 
SELECT 
    lower(hex(randomblob(16))),
    i.id,
    'external',
    2000,
    1000,
    500,
    1
FROM institutions i
WHERE NOT EXISTS (
    SELECT 1 FROM mission_allowances ma 
    WHERE ma.institution_id = i.id AND ma.profile_type = 'external'
);
