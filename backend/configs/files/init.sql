-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUMs
CREATE TYPE institution_type AS ENUM ('ministerial', 'etablissement');
CREATE TYPE user_role AS ENUM ('super_admin', 'admin_local', 'hr', 'dg', 'msgg', 'agent', 'police');
CREATE TYPE mission_status AS ENUM ('draft', 'pending_dg', 'pending_msgg', 'validated', 'cancelled');

-- 1. Institutions table
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type institution_type NOT NULL,
    logo_url TEXT,
    header_text TEXT,
    footer_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role user_role NOT NULL,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    matricule VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    passport_number VARCHAR(50),
    position VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, matricule)
);

-- 4. Signatures table
CREATE TABLE signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    signed_by VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    stamp_url TEXT,
    signature_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Missions table
CREATE TABLE missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    
    destination VARCHAR(255) NOT NULL,
    transport_mode VARCHAR(100) NOT NULL,
    objective TEXT NOT NULL,
    
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    departure_date DATE NOT NULL,
    return_date DATE NOT NULL,
    
    status mission_status DEFAULT 'draft',
    created_by UUID REFERENCES users(id),
    validated_by_dg UUID REFERENCES users(id),
    validated_by_msgg UUID REFERENCES users(id),
    dg_validated_at TIMESTAMP,
    msgg_validated_at TIMESTAMP,
    
    pdf_url TEXT,
    qr_code TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_institution ON users(institution_id);
CREATE INDEX idx_employees_institution ON employees(institution_id);
CREATE INDEX idx_missions_institution ON missions(institution_id);
CREATE INDEX idx_missions_employee ON missions(employee_id);
CREATE INDEX idx_missions_status ON missions(status);
CREATE INDEX idx_signatures_institution ON signatures(institution_id);

-- Insert default super admin (password: admin123)
INSERT INTO users (username, email, password, role) 
VALUES ('superadmin', 'admin@mission-system.mr', '$2a$12$6xv811oSps0njto9ypiC4OCif03dynbGy.bPqCHHicYoBtun/PTzS', 'super_admin');

-- Insert sample institutions
INSERT INTO institutions (name, type, header_text, footer_text) VALUES 
('Ministry of Digital Transformation', 'ministerial', 'RÉPUBLIQUE ISLAMIQUE DE MAURITANIE\nHonneur - Fraternité - Justice', 'Avenue Moktar Ould Daddah ZRB 0441 Nouakchott - Mauritanie'),
('Agence Numérique de l''État', 'etablissement', 'RÉPUBLIQUE ISLAMIQUE DE MAURITANIE\nHonneur - Fraternité - Justice', 'Avenue Moktar Ould Daddah ZRB 0441 Nouakchott - Mauritanie');