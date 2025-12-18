-- ═══════════════════════════════════════════════════════════════
-- BASE AGENCY - ENTERPRISE SCHEMA
-- Executar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'member', 'viewer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'professional', 'business', 'enterprise');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'paused');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE job_status AS ENUM ('pending', 'queued', 'processing', 'completed', 'failed', 'canceled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE ai_provider AS ENUM ('freepik', 'replicate', 'openai', 'elevenlabs', 'runway', 'falai', 'google');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE generation_type AS ENUM ('image', 'video', 'audio', 'text');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE credit_transaction_type AS ENUM ('purchase', 'usage', 'refund', 'bonus', 'subscription', 'adjustment');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ═══════════════════════════════════════════════════════════════
-- ORGANIZAÇÕES (Multi-tenant)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{
    "allowMemberInvites": true,
    "defaultMemberRole": "member",
    "requireApproval": false
  }',
  custom_limits JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- ═══════════════════════════════════════════════════════════════
-- USUÁRIOS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(50),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  role user_role DEFAULT 'member',
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  preferences JSONB DEFAULT '{
    "theme": "dark",
    "language": "pt-BR",
    "notifications": {"email": true, "push": true}
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_auth ON users(auth_id);

-- ═══════════════════════════════════════════════════════════════
-- PLANOS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug subscription_plan UNIQUE NOT NULL,
  price_monthly INTEGER NOT NULL DEFAULT 0,
  price_yearly INTEGER NOT NULL DEFAULT 0,
  credits_monthly INTEGER NOT NULL DEFAULT 0,
  limits JSONB NOT NULL DEFAULT '{}',
  features JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir planos padrão
INSERT INTO plans (name, slug, price_monthly, price_yearly, credits_monthly, limits, features) VALUES
('Free', 'free', 0, 0, 50,
  '{"images_per_month": 50, "videos_per_month": 0, "audio_minutes_per_month": 0, "max_resolution": "512x512", "max_team_members": 1, "max_projects": 2, "api_requests_per_minute": 5, "api_requests_per_day": 100}',
  '{"image_generation": true, "video_generation": false, "audio_generation": false, "workflow": true, "analytics": false, "api_access": false}'
),
('Starter', 'starter', 4900, 47000, 500,
  '{"images_per_month": 500, "videos_per_month": 20, "audio_minutes_per_month": 30, "max_resolution": "1024x1024", "max_team_members": 3, "max_projects": 10, "api_requests_per_minute": 20, "api_requests_per_day": 5000}',
  '{"image_generation": true, "video_generation": true, "audio_generation": true, "workflow": true, "analytics": true, "api_access": false}'
),
('Professional', 'professional', 9900, 95000, 2000,
  '{"images_per_month": 2000, "videos_per_month": 100, "audio_minutes_per_month": 120, "max_resolution": "2048x2048", "max_team_members": 10, "max_projects": 50, "api_requests_per_minute": 60, "api_requests_per_day": 20000, "priority_queue": true}',
  '{"image_generation": true, "video_generation": true, "audio_generation": true, "workflow": true, "analytics": true, "api_access": true, "webhooks": true}'
),
('Business', 'business', 24900, 239000, 10000,
  '{"images_per_month": 10000, "videos_per_month": 500, "audio_minutes_per_month": 500, "max_resolution": "4096x4096", "max_team_members": 50, "max_projects": 200, "api_requests_per_minute": 120, "api_requests_per_day": 100000, "priority_queue": true, "custom_models": true}',
  '{"image_generation": true, "video_generation": true, "audio_generation": true, "workflow": true, "analytics": true, "api_access": true, "webhooks": true, "sso": true}'
),
('Enterprise', 'enterprise', 0, 0, 0,
  '{"images_per_month": -1, "videos_per_month": -1, "audio_minutes_per_month": -1, "max_resolution": "unlimited", "max_team_members": -1, "max_projects": -1, "api_requests_per_minute": -1, "api_requests_per_day": -1, "priority_queue": true, "custom_models": true, "white_label": true}',
  '{"image_generation": true, "video_generation": true, "audio_generation": true, "workflow": true, "analytics": true, "api_access": true, "webhooks": true, "sso": true}'
)
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- ASSINATURAS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status subscription_status DEFAULT 'trialing',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  external_id VARCHAR(255),
  payment_method JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ═══════════════════════════════════════════════════════════════
-- CRÉDITOS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS credit_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_purchased INTEGER DEFAULT 0,
  lifetime_used INTEGER DEFAULT 0,
  lifetime_bonus INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  period_credits_used INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_credit_balances_org ON credit_balances(organization_id);

-- ═══════════════════════════════════════════════════════════════
-- TRANSAÇÕES DE CRÉDITO
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type credit_transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_org ON credit_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);

-- ═══════════════════════════════════════════════════════════════
-- API KEYS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['read', 'write'],
  rate_limit_per_minute INTEGER,
  rate_limit_per_day INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- ═══════════════════════════════════════════════════════════════
-- PROVIDER API KEYS (Chaves das APIs externas - CRIPTOGRAFADAS)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS provider_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider ai_provider NOT NULL,
  encrypted_key TEXT NOT NULL,
  key_hint VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  is_valid BOOLEAN DEFAULT TRUE,
  last_validated_at TIMESTAMPTZ,
  validation_error TEXT,
  last_used_at TIMESTAMPTZ,
  total_requests INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_provider_keys_org ON provider_api_keys(organization_id);

-- ═══════════════════════════════════════════════════════════════
-- JOBS DE IA
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  type generation_type NOT NULL,
  provider ai_provider NOT NULL,
  model VARCHAR(100) NOT NULL,
  status job_status DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  input JSONB NOT NULL,
  output JSONB,
  output_url TEXT,
  error_message TEXT,
  error_code VARCHAR(50),
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  queued_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_org ON ai_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user ON ai_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_created ON ai_jobs(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- GERAÇÕES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES ai_jobs(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  type generation_type NOT NULL,
  provider ai_provider NOT NULL,
  model VARCHAR(100) NOT NULL,
  prompt TEXT,
  negative_prompt TEXT,
  input_params JSONB DEFAULT '{}',
  output_url TEXT NOT NULL,
  thumbnail_url TEXT,
  output_metadata JSONB DEFAULT '{}',
  width INTEGER,
  height INTEGER,
  duration_seconds DECIMAL(10, 2),
  file_size_bytes BIGINT,
  tokens_used INTEGER DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  project_id UUID,
  folder_path TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_favorite BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generations_org ON generations(organization_id);
CREATE INDEX IF NOT EXISTS idx_generations_user ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_type ON generations(type);
CREATE INDEX IF NOT EXISTS idx_generations_created ON generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_tags ON generations USING GIN(tags);

-- ═══════════════════════════════════════════════════════════════
-- ANALYTICS DIÁRIO
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS usage_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  images_generated INTEGER DEFAULT 0,
  videos_generated INTEGER DEFAULT 0,
  audio_generated INTEGER DEFAULT 0,
  usage_by_provider JSONB DEFAULT '{}',
  usage_by_model JSONB DEFAULT '{}',
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 2) DEFAULT 0,
  api_requests INTEGER DEFAULT 0,
  api_errors INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_daily_org ON usage_daily(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_daily_date ON usage_daily(date DESC);

-- ═══════════════════════════════════════════════════════════════
-- ANALYTICS POR USUÁRIO
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS usage_by_user (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  images_generated INTEGER DEFAULT 0,
  videos_generated INTEGER DEFAULT 0,
  audio_generated INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  UNIQUE(organization_id, user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_user_org ON usage_by_user(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_by_user(date DESC);

-- ═══════════════════════════════════════════════════════════════
-- RATE LIMITING
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier VARCHAR(255) NOT NULL,
  identifier_type VARCHAR(50) NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_size_seconds INTEGER NOT NULL,
  request_count INTEGER DEFAULT 1,
  max_requests INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier, identifier_type, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, identifier_type);

-- ═══════════════════════════════════════════════════════════════
-- AUDIT LOG
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  description TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  status VARCHAR(50) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- WEBHOOKS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(255),
  events TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  max_retries INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,
  total_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhooks(organization_id);

-- ═══════════════════════════════════════════════════════════════
-- WEBHOOK DELIVERIES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  response_headers JSONB,
  duration_ms INTEGER,
  attempt INTEGER DEFAULT 1,
  delivered BOOLEAN DEFAULT FALSE,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);

-- ═══════════════════════════════════════════════════════════════
-- PRICING
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider ai_provider NOT NULL,
  model VARCHAR(100) NOT NULL,
  operation VARCHAR(50) NOT NULL,
  credits_per_unit INTEGER NOT NULL,
  cost_usd_per_unit DECIMAL(10, 6) NOT NULL,
  unit_type VARCHAR(50) NOT NULL,
  resolution_multipliers JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, model, operation)
);

-- Inserir preços padrão
INSERT INTO pricing (provider, model, operation, credits_per_unit, cost_usd_per_unit, unit_type, resolution_multipliers) VALUES
('freepik', 'mystic', 'generate', 1, 0.02, 'image', '{"512": 1, "1024": 2, "2048": 4}'),
('falai', 'flux-schnell', 'generate', 1, 0.003, 'image', '{}'),
('falai', 'flux-dev', 'generate', 2, 0.025, 'image', '{}'),
('falai', 'flux-pro', 'generate', 3, 0.055, 'image', '{}'),
('replicate', 'sdxl', 'generate', 1, 0.004, 'image', '{}'),
('openai', 'dall-e-3', 'generate', 4, 0.04, 'image', '{"1024": 1, "1792": 2}'),
('openai', 'dall-e-3-hd', 'generate', 8, 0.08, 'image', '{}'),
('google', 'imagen-3', 'generate', 3, 0.03, 'image', '{}'),
('falai', 'kling-pro', 'generate', 15, 0.15, 'second', '{}'),
('falai', 'minimax', 'generate', 10, 0.10, 'second', '{}'),
('falai', 'luma-ray2', 'generate', 12, 0.12, 'second', '{}'),
('elevenlabs', 'eleven_multilingual_v2', 'generate', 1, 0.30, 'minute', '{}')
ON CONFLICT (provider, model, operation) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Função: Debitar créditos
CREATE OR REPLACE FUNCTION debit_credits(
  p_organization_id UUID,
  p_user_id UUID,
  p_amount INTEGER,
  p_reference_type VARCHAR(50),
  p_reference_id UUID,
  p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT balance INTO v_current_balance
  FROM credit_balances
  WHERE organization_id = p_organization_id
  FOR UPDATE;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  v_new_balance := v_current_balance - p_amount;

  UPDATE credit_balances
  SET
    balance = v_new_balance,
    lifetime_used = lifetime_used + p_amount,
    period_credits_used = period_credits_used + p_amount,
    updated_at = NOW()
  WHERE organization_id = p_organization_id;

  INSERT INTO credit_transactions (
    organization_id, user_id, type, amount, balance_after,
    reference_type, reference_id, description
  ) VALUES (
    p_organization_id, p_user_id, 'usage', -p_amount, v_new_balance,
    p_reference_type, p_reference_id, p_description
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Função: Creditar créditos
CREATE OR REPLACE FUNCTION credit_credits(
  p_organization_id UUID,
  p_amount INTEGER,
  p_type credit_transaction_type,
  p_description TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE credit_balances
  SET
    balance = balance + p_amount,
    lifetime_purchased = CASE WHEN p_type = 'purchase' THEN lifetime_purchased + p_amount ELSE lifetime_purchased END,
    lifetime_bonus = CASE WHEN p_type = 'bonus' THEN lifetime_bonus + p_amount ELSE lifetime_bonus END,
    updated_at = NOW()
  WHERE organization_id = p_organization_id
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    INSERT INTO credit_balances (organization_id, balance, period_start, period_end)
    VALUES (p_organization_id, p_amount, NOW(), NOW() + INTERVAL '1 month')
    RETURNING balance INTO v_new_balance;
  END IF;

  INSERT INTO credit_transactions (
    organization_id, type, amount, balance_after, description
  ) VALUES (
    p_organization_id, p_type, p_amount, v_new_balance, p_description
  );

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Função: Verificar rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier VARCHAR(255),
  p_identifier_type VARCHAR(50),
  p_max_requests INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  v_window_start := date_trunc('second', NOW()) - (EXTRACT(EPOCH FROM NOW())::INTEGER % p_window_seconds) * INTERVAL '1 second';

  INSERT INTO rate_limits (identifier, identifier_type, window_start, window_size_seconds, request_count, max_requests)
  VALUES (p_identifier, p_identifier_type, v_window_start, p_window_seconds, 1, p_max_requests)
  ON CONFLICT (identifier, identifier_type, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_max_requests;
END;
$$ LANGUAGE plpgsql;

-- Função: Limpar rate limits antigos
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits() RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- Trigger: Atualizar analytics diário após geração
CREATE OR REPLACE FUNCTION update_daily_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usage_daily (
    organization_id, date,
    images_generated, videos_generated, audio_generated,
    credits_used, cost_usd
  ) VALUES (
    NEW.organization_id,
    DATE(NEW.created_at),
    CASE WHEN NEW.type = 'image' THEN 1 ELSE 0 END,
    CASE WHEN NEW.type = 'video' THEN 1 ELSE 0 END,
    CASE WHEN NEW.type = 'audio' THEN 1 ELSE 0 END,
    NEW.credits_used,
    NEW.cost_usd
  )
  ON CONFLICT (organization_id, date)
  DO UPDATE SET
    images_generated = usage_daily.images_generated + CASE WHEN NEW.type = 'image' THEN 1 ELSE 0 END,
    videos_generated = usage_daily.videos_generated + CASE WHEN NEW.type = 'video' THEN 1 ELSE 0 END,
    audio_generated = usage_daily.audio_generated + CASE WHEN NEW.type = 'audio' THEN 1 ELSE 0 END,
    credits_used = usage_daily.credits_used + NEW.credits_used,
    cost_usd = usage_daily.cost_usd + NEW.cost_usd;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_daily_usage ON generations;
CREATE TRIGGER trg_update_daily_usage
AFTER INSERT ON generations
FOR EACH ROW
EXECUTE FUNCTION update_daily_usage();

-- Trigger: Atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_organizations_updated ON organizations;
CREATE TRIGGER trg_organizations_updated
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_subscriptions_updated ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_organization_usage AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  p.slug AS plan,
  s.status AS subscription_status,
  cb.balance AS credits_available,
  cb.period_credits_used AS credits_used_this_period,
  p.limits->>'images_per_month' AS images_limit,
  p.limits->>'videos_per_month' AS videos_limit,
  (SELECT COUNT(*) FROM generations g WHERE g.organization_id = o.id AND g.type = 'image' AND g.created_at >= cb.period_start) AS images_used,
  (SELECT COUNT(*) FROM generations g WHERE g.organization_id = o.id AND g.type = 'video' AND g.created_at >= cb.period_start) AS videos_used
FROM organizations o
LEFT JOIN subscriptions s ON s.organization_id = o.id AND s.status = 'active'
LEFT JOIN plans p ON p.id = s.plan_id
LEFT JOIN credit_balances cb ON cb.organization_id = o.id;

CREATE OR REPLACE VIEW v_cost_by_provider AS
SELECT
  organization_id,
  date_trunc('month', created_at) AS month,
  provider,
  COUNT(*) AS total_generations,
  SUM(credits_used) AS total_credits,
  SUM(cost_usd) AS total_cost_usd
FROM generations
WHERE deleted_at IS NULL
GROUP BY organization_id, date_trunc('month', created_at), provider
ORDER BY month DESC, total_cost_usd DESC;

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para service role (backend)
CREATE POLICY "Service role full access organizations" ON organizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access generations" ON generations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access credit_balances" ON credit_balances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access credit_transactions" ON credit_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access api_keys" ON api_keys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- DONE!
-- ═══════════════════════════════════════════════════════════════
