-- Migration SQLite pour étendre le système avec rôles et permissions spécifiques aux institutions

-- 1. Table des rôles institutionnels
CREATE TABLE IF NOT EXISTS institution_roles (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL,
    role_code TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table des permissions
CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    permission_name TEXT NOT NULL UNIQUE,
    permission_code TEXT NOT NULL UNIQUE,
    description TEXT,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table de liaison rôles-permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    role_id TEXT NOT NULL REFERENCES institution_roles(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- 4. Extension de la table users pour inclure les rôles institutionnels
-- Vérifier si les colonnes existent avant de les ajouter
-- Note: SQLite ne supporte pas IF NOT EXISTS pour ALTER TABLE, donc on ignore les erreurs

-- 5. Table d'audit pour tracer toutes les actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id),
    institution_id TEXT NOT NULL REFERENCES institutions(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_values TEXT,
    new_values TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Table pour les informations administratives des institutions
-- Les colonnes seront ajoutées si elles n'existent pas déjà

-- 7. Table pour les workflows de validation personnalisés
CREATE TABLE IF NOT EXISTS institution_workflows (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    workflow_name TEXT NOT NULL,
    workflow_type TEXT NOT NULL,
    steps TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des permissions de base
INSERT OR IGNORE INTO permissions (permission_name, permission_code, description, module, action) VALUES
-- Missions
('Créer une mission', 'mission_create', 'Créer de nouvelles missions', 'missions', 'create'),
('Consulter les missions', 'mission_read', 'Consulter les missions', 'missions', 'read'),
('Modifier une mission', 'mission_update', 'Modifier les missions', 'missions', 'update'),
('Supprimer une mission', 'mission_delete', 'Supprimer les missions', 'missions', 'delete'),
('Valider mission DG', 'mission_validate_dg', 'Valider les missions en tant que DG', 'missions', 'validate_dg'),
('Valider mission MSGG', 'mission_validate_msgg', 'Valider les missions en tant que MSGG', 'missions', 'validate_msgg'),
('Annuler une mission', 'mission_cancel', 'Annuler les missions', 'missions', 'cancel'),

-- Employés
('Créer un employé', 'employee_create', 'Créer de nouveaux employés', 'employees', 'create'),
('Consulter les employés', 'employee_read', 'Consulter les employés', 'employees', 'read'),
('Modifier un employé', 'employee_update', 'Modifier les employés', 'employees', 'update'),
('Supprimer un employé', 'employee_delete', 'Supprimer les employés', 'employees', 'delete'),

-- Utilisateurs
('Créer un utilisateur', 'user_create', 'Créer de nouveaux utilisateurs', 'users', 'create'),
('Consulter les utilisateurs', 'user_read', 'Consulter les utilisateurs', 'users', 'read'),
('Modifier un utilisateur', 'user_update', 'Modifier les utilisateurs', 'users', 'update'),
('Supprimer un utilisateur', 'user_delete', 'Supprimer les utilisateurs', 'users', 'delete'),

-- Rapports
('Consulter les rapports', 'report_read', 'Consulter les rapports', 'reports', 'read'),
('Générer des rapports', 'report_generate', 'Générer des rapports', 'reports', 'generate'),
('Exporter des données', 'data_export', 'Exporter des données', 'reports', 'export'),

-- Signatures
('Gérer les signatures', 'signature_manage', 'Gérer les signatures', 'signatures', 'manage'),

-- Administration
('Gérer l''institution', 'institution_manage', 'Gérer les paramètres de l''institution', 'institution', 'manage'),
('Audit des actions', 'audit_read', 'Consulter les logs d''audit', 'audit', 'read');

-- Index pour les performances (après création des tables)
-- Ces index seront créés après l'insertion des données