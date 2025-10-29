-- Migration SQLite pour le schéma initial

-- 1. Institutions table
CREATE TABLE IF NOT EXISTS institutions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ministerial', 'etablissement')),
    logo_url TEXT,
    header_text TEXT,
    footer_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin_local', 'hr', 'dg', 'msgg', 'agent', 'police')),
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Employees table
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    matricule TEXT NOT NULL,
    full_name TEXT NOT NULL,
    passport_number TEXT,
    position TEXT,
    email TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, matricule)
);

-- 4. Signatures table
CREATE TABLE IF NOT EXISTS signatures (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    signed_by TEXT NOT NULL,
    title TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin_local', 'hr', 'dg', 'msgg', 'agent', 'police')),
    stamp_url TEXT,
    signature_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Missions table
CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    mission_number TEXT UNIQUE NOT NULL,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    
    destination TEXT NOT NULL,
    transport_mode TEXT NOT NULL,
    objective TEXT NOT NULL,
    
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    departure_date DATE NOT NULL,
    return_date DATE NOT NULL,
    
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_dg', 'pending_msgg', 'validated', 'cancelled')),
    created_by TEXT REFERENCES users(id),
    validated_by_dg TEXT REFERENCES users(id),
    validated_by_msgg TEXT REFERENCES users(id),
    dg_validated_at DATETIME,
    msgg_validated_at DATETIME,
    
    pdf_url TEXT,
    qr_code TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_institution ON users(institution_id);
CREATE INDEX IF NOT EXISTS idx_employees_institution ON employees(institution_id);
CREATE INDEX IF NOT EXISTS idx_missions_institution ON missions(institution_id);
CREATE INDEX IF NOT EXISTS idx_missions_employee ON missions(employee_id);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_signatures_institution ON signatures(institution_id);

-- Insert default super admin (password: admin123)
INSERT OR IGNORE INTO users (username, email, password, role) 
VALUES ('superadmin', 'admin@mission-system.mr', '$2a$12$6xv811oSps0njto9ypiC4OCif03dynbGy.bPqCHHicYoBtun/PTzS', 'super_admin');

-- Insert sample institutions
INSERT OR IGNORE INTO institutions (name, type, header_text, footer_text) VALUES 
('Ministry of Digital Transformation', 'ministerial', 'RÉPUBLIQUE ISLAMIQUE DE MAURITANIE\nHonneur - Fraternité - Justice', 'Avenue Moktar Ould Daddah ZRB 0441 Nouakchott - Mauritanie'),
('Agence Numérique de l''État', 'etablissement', 'RÉPUBLIQUE ISLAMIQUE DE MAURITANIE\nHonneur - Fraternité - Justice', 'Avenue Moktar Ould Daddah ZRB 0441 Nouakchott - Mauritanie');
