-- Migration V12.9: Auth Flow Fields
-- Adiciona campos para suporte a login social, verificação de e-mail e bloqueio de conta

-- Verificar se as colunas já existem antes de adicionar
-- emailVerified: indica se o e-mail foi verificado
ALTER TABLE users ADD COLUMN IF NOT EXISTS emailVerified BOOLEAN DEFAULT FALSE;

-- emailVerifiedAt: data/hora da verificação do e-mail
ALTER TABLE users ADD COLUMN IF NOT EXISTS emailVerifiedAt TIMESTAMP NULL;

-- loginProvider: provedor de autenticação usado (email, phone, google, apple, facebook)
ALTER TABLE users ADD COLUMN IF NOT EXISTS loginProvider ENUM('email', 'phone', 'google', 'apple', 'facebook') DEFAULT 'email';

-- accountStatus: status da conta (active, blocked, pending_verification)
ALTER TABLE users ADD COLUMN IF NOT EXISTS accountStatus ENUM('active', 'blocked', 'pending_verification') DEFAULT 'active';

-- failedLoginAttempts: contador de tentativas de login falhas
ALTER TABLE users ADD COLUMN IF NOT EXISTS failedLoginAttempts INT DEFAULT 0;

-- blockedAt: data/hora do bloqueio da conta
ALTER TABLE users ADD COLUMN IF NOT EXISTS blockedAt TIMESTAMP NULL;

-- blockedReason: motivo do bloqueio
ALTER TABLE users ADD COLUMN IF NOT EXISTS blockedReason TEXT NULL;

-- Índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(emailVerified);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(accountStatus);
CREATE INDEX IF NOT EXISTS idx_users_login_provider ON users(loginProvider);
