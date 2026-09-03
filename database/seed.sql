-- Initial Seed Data for NovaFunds

-- 1. Roles
INSERT INTO roles (name, description) VALUES
('SUPER_ADMIN', 'Accès total au système'),
('ADMIN', 'Gestion générale de la plateforme'),
('MANAGER', 'Gestion des campagnes et tâches'),
('MODERATOR', 'Validation des tâches et modération'),
('SUPPORT', 'Support client et litiges'),
('USER', 'Utilisateur standard');

-- 2. Permissions (Examples)
INSERT INTO permissions (name, description) VALUES
('manage_users', 'Créer, modifier, bannir des utilisateurs'),
('manage_roles', 'Gérer les rôles et permissions'),
('manage_tasks', 'Créer et modifier des tâches'),
('verify_tasks', 'Valider ou rejeter les preuves des tâches'),
('manage_finances', 'Approuver les retraits et ajuster les soldes'),
('view_analytics', 'Voir les statistiques financières');

-- 3. Role Permissions Mapping
-- Super Admin gets everything (example mapping)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'SUPER_ADMIN';

-- 4. Initial Settings
INSERT INTO settings (key, value, description) VALUES
('referral_levels', '[{"level": 1, "percentage": 10}, {"level": 2, "percentage": 5}, {"level": 3, "percentage": 2}]', 'Pourcentages de commission par niveau d affiliation'),
('minimum_withdrawal', '{"amount": 5000, "currency": "XOF"}', 'Montant minimum pour un retrait'),
('platform_currency', '{"code": "XOF", "symbol": "CFA"}', 'Devise principale de la plateforme');

-- 5. Insert Super Admin User
-- We use a dummy UUID and a placeholder hash (e.g., bcrypt for "password123")
INSERT INTO users (id, first_name, last_name, email, password_hash, phone, status, role_id)
VALUES (
    uuid_generate_v4(),
    'Super',
    'Admin',
    'admin@novafunds.com',
    '$2b$10$EpD.P8.Vpt/L7Y45K.uHKeU.33zM6R2Xv6GzZqQ3/W/Y0C', -- Placeholder hash
    '+0000000000',
    'ACTIVE',
    (SELECT id FROM roles WHERE name = 'SUPER_ADMIN')
);
