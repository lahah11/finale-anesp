-- Migration SQLite pour créer la table missions_unified
-- Cette table centralise TOUTES les informations de mission

CREATE TABLE IF NOT EXISTS missions_unified (
    -- Identifiants
    id TEXT PRIMARY KEY,
    mission_reference TEXT NOT NULL UNIQUE,
    institution_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    
    -- Informations de base
    mission_object TEXT NOT NULL,
    departure_date DATE NOT NULL,
    return_date DATE NOT NULL,
    transport_mode TEXT NOT NULL,
    
    -- Villes (IDs et noms)
    departure_city_id TEXT,
    departure_city_name TEXT,
    departure_city_region TEXT,
    arrival_city_id TEXT,
    arrival_city_name TEXT,
    arrival_city_region TEXT,
    
    -- Véhicule
    vehicle_id TEXT,
    vehicle_plate TEXT,
    vehicle_model TEXT,
    vehicle_brand TEXT,
    vehicle_year INTEGER,
    vehicle_color TEXT,
    
    -- Chauffeur
    driver_id TEXT,
    driver_name TEXT,
    driver_phone TEXT,
    driver_license TEXT,
    driver_license_type TEXT,
    driver_license_expiry DATE,
    
    -- Participants (JSON complet)
    participants_data TEXT, -- JSON avec tous les participants
    participants_count INTEGER DEFAULT 0,
    
    -- Coûts et frais
    estimated_fuel REAL DEFAULT 0,
    fuel_cost REAL DEFAULT 0,
    participants_cost REAL DEFAULT 0,
    total_mission_cost REAL DEFAULT 0,
    mission_fees REAL DEFAULT 0,
    
    -- Distances et calculs
    distance_km REAL DEFAULT 0,
    estimated_duration_hours REAL DEFAULT 0,
    
    -- Statut et workflow
    status TEXT DEFAULT 'pending_technical',
    current_step INTEGER DEFAULT 2,
    
    -- Validations
    technical_validated_by TEXT,
    technical_validated_at DATETIME,
    technical_rejection_reason TEXT,
    
    logistics_validated_by TEXT,
    logistics_validated_at DATETIME,
    logistics_assigned_by TEXT,
    logistics_assigned_at DATETIME,
    
    finance_validated_by TEXT,
    finance_validated_at DATETIME,
    finance_rejection_reason TEXT,
    
    dg_validated_by TEXT,
    dg_validated_at DATETIME,
    dg_rejection_reason TEXT,
    
    -- Documents
    air_ticket_pdf TEXT,
    mission_report_url TEXT,
    stamped_mission_orders_url TEXT,
    documents_uploaded_by TEXT,
    documents_uploaded_at DATETIME,
    documents_verified_by TEXT,
    documents_verified_at DATETIME,
    
    -- Clôture
    mission_closed_by TEXT,
    mission_closed_at DATETIME,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_missions_unified_reference ON missions_unified(mission_reference);
CREATE INDEX IF NOT EXISTS idx_missions_unified_institution ON missions_unified(institution_id);
CREATE INDEX IF NOT EXISTS idx_missions_unified_created_by ON missions_unified(created_by);
CREATE INDEX IF NOT EXISTS idx_missions_unified_status ON missions_unified(status);
CREATE INDEX IF NOT EXISTS idx_missions_unified_step ON missions_unified(current_step);
CREATE INDEX IF NOT EXISTS idx_missions_unified_dates ON missions_unified(departure_date, return_date);

