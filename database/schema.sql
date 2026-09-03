-- ============================================================
-- NOVAFUNDS
-- PostgreSQL Database Schema V1
-- ============================================================

BEGIN;

-- ============================================================
-- EXTENSION
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_status AS ENUM (
    'PENDING',
    'ACTIVE',
    'SUSPENDED',
    'BANNED'
);

CREATE TYPE user_role AS ENUM (
    'SUPER_ADMIN',
    'ADMIN',
    'MANAGER',
    'MODERATOR',
    'SUPPORT',
    'USER'
);

CREATE TYPE payment_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);

CREATE TYPE task_status AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ACTIVE',
    'PAUSED',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE task_submission_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'FRAUD'
);

CREATE TYPE transaction_type AS ENUM (
    'ACTIVATION',
    'TASK_REWARD',
    'QUIZ_REWARD',
    'AFFILIATE_COMMISSION',
    'LEVEL_BONUS',
    'TEAM_BONUS',
    'CAMPAIGN_REWARD',
    'MANUAL_CREDIT',
    'WITHDRAWAL',
    'WITHDRAWAL_REVERSAL',
    'ADJUSTMENT'
);

CREATE TYPE transaction_status AS ENUM (
    'PENDING',
    'COMPLETED',
    'REVERSED',
    'CANCELLED'
);

CREATE TYPE withdrawal_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'APPROVED',
    'PAID',
    'REJECTED',
    'CANCELLED'
);

CREATE TYPE course_status AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
);

CREATE TYPE notification_type AS ENUM (
    'SYSTEM',
    'TASK',
    'PAYMENT',
    'WITHDRAWAL',
    'AFFILIATE',
    'COURSE',
    'ANNOUNCEMENT',
    'SECURITY'
);

CREATE TYPE fraud_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'DISMISSED'
);


-- ============================================================
-- ROLES
-- ============================================================

CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,

    name user_role NOT NULL UNIQUE,

    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- PERMISSIONS
-- ============================================================

CREATE TABLE permissions (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE,

    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL
        REFERENCES roles(id)
        ON DELETE CASCADE,

    permission_id BIGINT NOT NULL
        REFERENCES permissions(id)
        ON DELETE CASCADE,

    PRIMARY KEY (role_id, permission_id)
);


-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,

    username VARCHAR(50) NOT NULL UNIQUE,

    email VARCHAR(255) NOT NULL UNIQUE,

    phone VARCHAR(30),

    country_code VARCHAR(10),

    password_hash TEXT NOT NULL,

    role_id BIGINT NOT NULL
        REFERENCES roles(id),

    status user_status NOT NULL DEFAULT 'PENDING',

    membership_level VARCHAR(50) NOT NULL DEFAULT 'BASIC',

    referrer_id BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    remember_token_hash TEXT,

    last_login_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_referrer_not_self
        CHECK (
            referrer_id IS NULL
            OR referrer_id <> id
        )
);


CREATE INDEX idx_users_referrer_id
ON users(referrer_id);

CREATE INDEX idx_users_status
ON users(status);

CREATE INDEX idx_users_role_id
ON users(role_id);


-- ============================================================
-- USER PROFILES
-- ============================================================

CREATE TABLE user_profiles (
    user_id BIGINT PRIMARY KEY
        REFERENCES users(id)
        ON DELETE CASCADE,

    first_name VARCHAR(100),

    last_name VARCHAR(100),

    avatar_url TEXT,

    address TEXT,

    city VARCHAR(100),

    country VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- PLATFORM SETTINGS
-- ============================================================

CREATE TABLE platform_settings (
    id BIGSERIAL PRIMARY KEY,

    setting_key VARCHAR(150) NOT NULL UNIQUE,

    setting_value TEXT NOT NULL,

    description TEXT,

    updated_by BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- DEFAULT SETTINGS
-- ============================================================

INSERT INTO platform_settings
(
    setting_key,
    setting_value,
    description
)
VALUES
(
    'activation_fee',
    '10.00',
    'Frais d activation du compte en USD'
),
(
    'minimum_withdrawal',
    '20.00',
    'Montant minimum de retrait en USD'
),
(
    'maximum_withdrawal',
    '5000.00',
    'Montant maximum de retrait en USD'
),
(
    'withdrawal_processing_hours_min',
    '1',
    'Délai minimum de traitement'
),
(
    'withdrawal_processing_hours_max',
    '2',
    'Délai maximum de traitement'
);


-- ============================================================
-- PAYMENT METHODS
-- ============================================================

CREATE TABLE payment_methods (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    provider_code VARCHAR(50) NOT NULL UNIQUE,

    country_code VARCHAR(10) NOT NULL DEFAULT 'CD',

    account_number VARCHAR(50) NOT NULL,

    account_name VARCHAR(150) NOT NULL,

    instructions TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- RDC PAYMENT METHODS
-- ============================================================

INSERT INTO payment_methods
(
    name,
    provider_code,
    country_code,
    account_number,
    account_name
)
VALUES
(
    'Orange Money',
    'ORANGE_MONEY',
    'CD',
    'CHANGE_ME',
    'CHANGE_ME'
),
(
    'Airtel Money',
    'AIRTEL_MONEY',
    'CD',
    'CHANGE_ME',
    'CHANGE_ME'
),
(
    'Africell Money',
    'AFRICELL_MONEY',
    'CD',
    'CHANGE_ME',
    'CHANGE_ME'
);


-- ============================================================
-- ACTIVATION PAYMENTS
-- ============================================================

CREATE TABLE activation_payments (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    payment_method_id BIGINT NOT NULL
        REFERENCES payment_methods(id),

    amount NUMERIC(18,8) NOT NULL
        CHECK (amount > 0),

    transaction_reference VARCHAR(150),

    proof_image_url TEXT,

    status payment_status NOT NULL DEFAULT 'PENDING',

    reviewed_by BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    reviewed_at TIMESTAMPTZ,

    rejection_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_activation_payments_user
ON activation_payments(user_id);

CREATE INDEX idx_activation_payments_status
ON activation_payments(status);


-- ============================================================
-- WALLETS
-- ============================================================

CREATE TABLE wallets (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL UNIQUE
        REFERENCES users(id)
        ON DELETE CASCADE,

    balance NUMERIC(18,8) NOT NULL DEFAULT 0.00000000,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT wallet_balance_positive
        CHECK (balance >= 0)
);


-- ============================================================
-- FINANCIAL TRANSACTIONS
-- ============================================================

CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    type transaction_type NOT NULL,

    status transaction_status NOT NULL DEFAULT 'COMPLETED',

    amount NUMERIC(18,8) NOT NULL
        CHECK (amount > 0),

    balance_before NUMERIC(18,8),

    balance_after NUMERIC(18,8),

    reference_type VARCHAR(100),

    reference_id BIGINT,

    description TEXT,

    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_transactions_user
ON transactions(user_id);

CREATE INDEX idx_transactions_type
ON transactions(type);

CREATE INDEX idx_transactions_created
ON transactions(created_at DESC);


-- ============================================================
-- WITHDRAWAL ACCOUNTS
-- ============================================================

CREATE TABLE withdrawal_accounts (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    payment_method_id BIGINT NOT NULL
        REFERENCES payment_methods(id),

    account_number VARCHAR(50) NOT NULL,

    account_name VARCHAR(150),

    is_verified BOOLEAN NOT NULL DEFAULT FALSE,

    is_default BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_withdrawal_accounts_user
ON withdrawal_accounts(user_id);


-- ============================================================
-- WITHDRAWALS
-- ============================================================

CREATE TABLE withdrawals (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    withdrawal_account_id BIGINT NOT NULL
        REFERENCES withdrawal_accounts(id),

    amount NUMERIC(18,8) NOT NULL
        CHECK (amount > 0),

    status withdrawal_status NOT NULL DEFAULT 'PENDING',

    admin_note TEXT,

    rejection_reason TEXT,

    transaction_reference VARCHAR(150),

    processed_by BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    processed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_withdrawals_user
ON withdrawals(user_id);

CREATE INDEX idx_withdrawals_status
ON withdrawals(status);


-- ============================================================
-- AFFILIATE LEVELS
-- ============================================================

CREATE TABLE affiliate_levels (
    id BIGSERIAL PRIMARY KEY,

    level_number INTEGER NOT NULL UNIQUE
        CHECK (level_number > 0),

    name VARCHAR(100) NOT NULL,

    required_active_referrals INTEGER NOT NULL
        CHECK (required_active_referrals > 0),

    required_active_days INTEGER NOT NULL DEFAULT 0
        CHECK (required_active_days >= 0),

    reward_amount NUMERIC(18,8) NOT NULL DEFAULT 0
        CHECK (reward_amount >= 0),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


INSERT INTO affiliate_levels
(
    level_number,
    name,
    required_active_referrals,
    required_active_days,
    reward_amount
)
VALUES
(1, 'Level 1', 5, 3, 10.00),
(2, 'Level 2', 10, 3, 20.00),
(3, 'Level 3', 15, 5, 30.00);


-- ============================================================
-- REFERRALS
-- ============================================================

CREATE TABLE referrals (
    id BIGSERIAL PRIMARY KEY,

    referrer_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    referred_user_id BIGINT NOT NULL UNIQUE
        REFERENCES users(id)
        ON DELETE CASCADE,

    level INTEGER NOT NULL
        CHECK (level > 0),

    activated_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT referral_not_self
        CHECK (referrer_id <> referred_user_id)
);


CREATE INDEX idx_referrals_referrer
ON referrals(referrer_id);


-- ============================================================
-- AFFILIATE COMMISSIONS
-- ============================================================

CREATE TABLE affiliate_commissions (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    source_user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    level INTEGER NOT NULL
        CHECK (level > 0),

    amount NUMERIC(18,8) NOT NULL
        CHECK (amount > 0),

    transaction_id BIGINT
        REFERENCES transactions(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- CAMPAIGNS
-- ============================================================

CREATE TABLE campaigns (
    id BIGSERIAL PRIMARY KEY,

    title VARCHAR(255) NOT NULL,

    description TEXT,

    campaign_type VARCHAR(50) NOT NULL,

    total_budget NUMERIC(18,8)
        CHECK (
            total_budget IS NULL
            OR total_budget >= 0
        ),

    used_budget NUMERIC(18,8) NOT NULL DEFAULT 0
        CHECK (used_budget >= 0),

    reward_per_completion NUMERIC(18,8)
        CHECK (
            reward_per_completion IS NULL
            OR reward_per_completion >= 0
        ),

    max_participants INTEGER
        CHECK (
            max_participants IS NULL
            OR max_participants > 0
        ),

    start_at TIMESTAMPTZ,

    end_at TIMESTAMPTZ,

    status task_status NOT NULL DEFAULT 'DRAFT',

    created_by BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TASKS
-- ============================================================

CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,

    campaign_id BIGINT
        REFERENCES campaigns(id)
        ON DELETE SET NULL,

    title VARCHAR(255) NOT NULL,

    description TEXT,

    task_type VARCHAR(50) NOT NULL,

    reward_amount NUMERIC(18,8) NOT NULL
        CHECK (reward_amount >= 0),

    verification_type VARCHAR(50) NOT NULL,

    max_completions INTEGER
        CHECK (
            max_completions IS NULL
            OR max_completions > 0
        ),

    current_completions INTEGER NOT NULL DEFAULT 0
        CHECK (current_completions >= 0),

    start_at TIMESTAMPTZ,

    end_at TIMESTAMPTZ,

    status task_status NOT NULL DEFAULT 'DRAFT',

    requires_active_user BOOLEAN NOT NULL DEFAULT TRUE,

    created_by BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_tasks_status
ON tasks(status);

CREATE INDEX idx_tasks_type
ON tasks(task_type);


-- ============================================================
-- TASK SUBMISSIONS
-- ============================================================

CREATE TABLE task_submissions (
    id BIGSERIAL PRIMARY KEY,

    task_id BIGINT NOT NULL
        REFERENCES tasks(id)
        ON DELETE CASCADE,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    proof_image_url TEXT,

    proof_data JSONB,

    claimed_views INTEGER
        CHECK (
            claimed_views IS NULL
            OR claimed_views >= 0
        ),

    verified_views INTEGER
        CHECK (
            verified_views IS NULL
            OR verified_views >= 0
        ),

    status task_submission_status NOT NULL DEFAULT 'PENDING',

    reward_amount NUMERIC(18,8)
        CHECK (
            reward_amount IS NULL
            OR reward_amount >= 0
        ),

    transaction_id BIGINT
        REFERENCES transactions(id)
        ON DELETE SET NULL,

    reviewed_by BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    reviewed_at TIMESTAMPTZ,

    rejection_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(task_id, user_id)
);


-- ============================================================
-- QUIZZES
-- ============================================================

CREATE TABLE quizzes (
    id BIGSERIAL PRIMARY KEY,

    task_id BIGINT UNIQUE
        REFERENCES tasks(id)
        ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,

    description TEXT,

    passing_score INTEGER NOT NULL
        CHECK (passing_score >= 0),

    reward_amount NUMERIC(18,8) NOT NULL DEFAULT 0
        CHECK (reward_amount >= 0),

    max_attempts INTEGER
        CHECK (
            max_attempts IS NULL
            OR max_attempts > 0
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE quiz_questions (
    id BIGSERIAL PRIMARY KEY,

    quiz_id BIGINT NOT NULL
        REFERENCES quizzes(id)
        ON DELETE CASCADE,

    question TEXT NOT NULL,

    points INTEGER NOT NULL DEFAULT 1
        CHECK (points > 0),

    position INTEGER NOT NULL
        CHECK (position > 0),

    UNIQUE(quiz_id, position)
);


CREATE TABLE quiz_answers (
    id BIGSERIAL PRIMARY KEY,

    question_id BIGINT NOT NULL
        REFERENCES quiz_questions(id)
        ON DELETE CASCADE,

    answer_text TEXT NOT NULL,

    is_correct BOOLEAN NOT NULL DEFAULT FALSE,

    position INTEGER NOT NULL
        CHECK (position > 0),

    UNIQUE(question_id, position)
);


CREATE TABLE quiz_attempts (
    id BIGSERIAL PRIMARY KEY,

    quiz_id BIGINT NOT NULL
        REFERENCES quizzes(id)
        ON DELETE CASCADE,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    score INTEGER NOT NULL DEFAULT 0
        CHECK (score >= 0),

    passed BOOLEAN NOT NULL DEFAULT FALSE,

    reward_amount NUMERIC(18,8) NOT NULL DEFAULT 0
        CHECK (reward_amount >= 0),

    transaction_id BIGINT
        REFERENCES transactions(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- FORMATIONS
-- ============================================================

CREATE TABLE courses (
    id BIGSERIAL PRIMARY KEY,

    title VARCHAR(255) NOT NULL,

    slug VARCHAR(255) NOT NULL UNIQUE,

    description TEXT,

    thumbnail_url TEXT,

    file_url TEXT,

    status course_status NOT NULL DEFAULT 'DRAFT',

    can_download BOOLEAN NOT NULL DEFAULT TRUE,

    can_redistribute BOOLEAN NOT NULL DEFAULT FALSE,

    can_resell BOOLEAN NOT NULL DEFAULT FALSE,

    published_by BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE course_access (
    id BIGSERIAL PRIMARY KEY,

    course_id BIGINT NOT NULL
        REFERENCES courses(id)
        ON DELETE CASCADE,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(course_id, user_id)
);


-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================

CREATE TABLE announcements (
    id BIGSERIAL PRIMARY KEY,

    title VARCHAR(255) NOT NULL,

    content TEXT NOT NULL,

    image_url TEXT,

    is_published BOOLEAN NOT NULL DEFAULT FALSE,

    published_at TIMESTAMPTZ,

    expires_at TIMESTAMPTZ,

    created_by BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT
        REFERENCES users(id)
        ON DELETE CASCADE,

    type notification_type NOT NULL,

    title VARCHAR(255) NOT NULL,

    message TEXT NOT NULL,

    data JSONB,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    read_at TIMESTAMPTZ
);


CREATE INDEX idx_notifications_user
ON notifications(user_id, is_read);


-- ============================================================
-- BONUS CODES
-- ============================================================

CREATE TABLE bonus_codes (
    id BIGSERIAL PRIMARY KEY,

    code VARCHAR(100) NOT NULL UNIQUE,

    amount NUMERIC(18,8) NOT NULL
        CHECK (amount > 0),

    max_uses INTEGER
        CHECK (
            max_uses IS NULL
            OR max_uses > 0
        ),

    current_uses INTEGER NOT NULL DEFAULT 0
        CHECK (current_uses >= 0),

    expires_at TIMESTAMPTZ,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_by BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE bonus_code_redemptions (
    id BIGSERIAL PRIMARY KEY,

    bonus_code_id BIGINT NOT NULL
        REFERENCES bonus_codes(id)
        ON DELETE CASCADE,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    amount NUMERIC(18,8) NOT NULL
        CHECK (amount > 0),

    transaction_id BIGINT
        REFERENCES transactions(id)
        ON DELETE SET NULL,

    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(bonus_code_id, user_id)
);


-- ============================================================
-- FRAUD CASES
-- ============================================================

CREATE TABLE fraud_cases (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    task_submission_id BIGINT
        REFERENCES task_submissions(id)
        ON DELETE SET NULL,

    withdrawal_id BIGINT
        REFERENCES withdrawals(id)
        ON DELETE SET NULL,

    fraud_type VARCHAR(100) NOT NULL,

    description TEXT,

    evidence JSONB,

    status fraud_status NOT NULL DEFAULT 'PENDING',

    reviewed_by BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,

    actor_user_id BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    action VARCHAR(150) NOT NULL,

    entity_type VARCHAR(100),

    entity_id BIGINT,

    old_values JSONB,

    new_values JSONB,

    ip_address INET,

    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- SUPPORT
-- ============================================================

CREATE TABLE support_conversations (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    assigned_to BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    subject VARCHAR(255),

    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE support_messages (
    id BIGSERIAL PRIMARY KEY,

    conversation_id BIGINT NOT NULL
        REFERENCES support_conversations(id)
        ON DELETE CASCADE,

    sender_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    message TEXT NOT NULL,

    attachment_url TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TEAM TOP 5
-- ============================================================

CREATE TABLE team_rankings (
    id BIGSERIAL PRIMARY KEY,

    period_type VARCHAR(30) NOT NULL,

    period_start TIMESTAMPTZ NOT NULL,

    period_end TIMESTAMPTZ NOT NULL,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    rank_position INTEGER NOT NULL
        CHECK (rank_position BETWEEN 1 AND 5),

    score NUMERIC(18,8) NOT NULL DEFAULT 0,

    reward_amount NUMERIC(18,8) NOT NULL DEFAULT 0,

    transaction_id BIGINT
        REFERENCES transactions(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- DEFAULT ROLES
-- ============================================================

INSERT INTO roles (name, description)
VALUES
(
    'SUPER_ADMIN',
    'Accès complet à la plateforme'
),
(
    'ADMIN',
    'Gestion administrative'
),
(
    'MANAGER',
    'Gestion opérationnelle'
),
(
    'MODERATOR',
    'Validation et modération'
),
(
    'SUPPORT',
    'Service client'
),
(
    'USER',
    'Utilisateur standard'
);


-- ============================================================
-- DEFAULT PERMISSIONS
-- ============================================================

INSERT INTO permissions (name, description)
VALUES
('view_users', 'Voir les utilisateurs'),
('manage_users', 'Gérer les utilisateurs'),
('manage_tasks', 'Créer et gérer les tâches'),
('approve_tasks', 'Valider les tâches'),
('manage_campaigns', 'Gérer les campagnes'),
('manage_courses', 'Gérer les formations'),
('manage_quizzes', 'Gérer les quiz'),
('manage_withdrawals', 'Gérer les retraits'),
('approve_withdrawals', 'Approuver ou rejeter les retraits'),
('manage_payments', 'Gérer les paiements'),
('view_finances', 'Voir les finances'),
('manage_affiliates', 'Gérer les affiliations'),
('manage_bonus_codes', 'Gérer les codes bonus'),
('manage_notifications', 'Gérer les notifications'),
('manage_announcements', 'Gérer les annonces'),
('manage_admins', 'Gérer les administrateurs'),
('manage_permissions', 'Gérer les permissions'),
('manage_settings', 'Gérer les paramètres'),
('view_audit_logs', 'Voir les journaux'),
('manage_fraud', 'Gérer les fraudes'),
('manage_support', 'Gérer le support');


-- ============================================================
-- AUTOMATIC WALLET CREATION
-- ============================================================

CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    INSERT INTO wallets (user_id, balance)
    VALUES (NEW.id, 0.00000000);

    RETURN NEW;

END;
$$;


CREATE TRIGGER trg_create_user_wallet
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_user_wallet();


-- ============================================================
-- UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;
$$;


CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_wallets_updated_at
BEFORE UPDATE ON wallets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_payment_methods_updated_at
BEFORE UPDATE ON payment_methods
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_withdrawals_updated_at
BEFORE UPDATE ON withdrawals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_announcements_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- FIN
-- ============================================================

COMMIT;
