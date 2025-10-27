-- Migration pour les tables de moyens logistiques
-- Création des tables vehicles et drivers

-- Table des véhicules
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    license_plate TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    color TEXT,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'maintenance', 'out_of_service')),
    institution_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
    UNIQUE(license_plate, institution_id)
);

-- Table des chauffeurs
CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    license_number TEXT NOT NULL,
    license_type TEXT,
    license_expiry DATE,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'busy', 'unavailable')),
    institution_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
    UNIQUE(license_number, institution_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_vehicles_institution ON vehicles(institution_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_drivers_institution ON drivers(institution_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);

-- Insertion de données de test pour l'institution par défaut
INSERT OR IGNORE INTO vehicles (license_plate, brand, model, year, color, status, institution_id) VALUES
('1234AZ00', 'Toyota', 'Hilux', 2020, 'Blanc', 'available', '32c5a15e4679067315c5d2bab813e6d4'),
('5678BB00', 'Nissan', 'Navara', 2021, 'Noir', 'available', '32c5a15e4679067315c5d2bab813e6d4'),
('9012CC00', 'Ford', 'Ranger', 2019, 'Gris', 'maintenance', '32c5a15e4679067315c5d2bab813e6d4');

INSERT OR IGNORE INTO drivers (full_name, phone_number, license_number, license_type, license_expiry, status, institution_id) VALUES
('Mamadou Ismail Kane', '+222 12345678', 'DL123456', 'B', '2025-12-31', 'available', '32c5a15e4679067315c5d2bab813e6d4'),
('Sidi Md Abdallahi Cheikh Ahmed', '+222 87654321', 'DL789012', 'B', '2026-06-30', 'available', '32c5a15e4679067315c5d2bab813e6d4'),
('Ahmed Ould Mohamed', '+222 11223344', 'DL345678', 'B', '2025-03-15', 'busy', '32c5a15e4679067315c5d2bab813e6d4');
