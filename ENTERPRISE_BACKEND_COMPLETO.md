# 🏢 BASE AGENCY - ARQUITETURA ENTERPRISE (+10.000 USUÁRIOS)

## ⚠️ INSTRUÇÕES PARA CLAUDE CODE

```
═══════════════════════════════════════════════════════════════════════════════
  EXECUTE TUDO SEM PARAR. SEM CONFIRMAÇÕES. CORRIJA ERROS E CONTINUE.
  ESTE É UM PROJETO ENTERPRISE. QUALIDADE MÁXIMA. SEM ATALHOS.
═══════════════════════════════════════════════════════════════════════════════
```

---

## 📁 INFORMAÇÕES DO PROJETO

```yaml
PROJETO: BASE Agency SaaS
PASTA: C:\Users\Gabriel\Downloads\base-agency-saas
BACKEND: /server (Node.js/Express)
FRONTEND: /src (React/TypeScript)
DATABASE: Supabase (PostgreSQL)
CACHE: Redis (Upstash)
QUEUE: BullMQ + Redis
DEPLOY: Render (Backend) + Vercel (Frontend)
ESCALA: 10.000+ usuários simultâneos
```

---

# ═══════════════════════════════════════════════════════════════
# PARTE 1: ARQUITETURA GERAL
# ═══════════════════════════════════════════════════════════════

## 🏗️ VISÃO GERAL DA ARQUITETURA

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ARQUITETURA ENTERPRISE                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                       │
│  │   CLIENTE   │     │   CLIENTE   │     │   CLIENTE   │                       │
│  │   (React)   │     │   (React)   │     │   (React)   │                       │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                       │
│         │                   │                   │                               │
│         └───────────────────┼───────────────────┘                               │
│                             │                                                   │
│                             ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        CLOUDFLARE (CDN + WAF)                            │   │
│  │                    Rate Limiting + DDoS Protection                       │   │
│  └─────────────────────────────────┬───────────────────────────────────────┘   │
│                                    │                                           │
│                                    ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         LOAD BALANCER (Render)                           │   │
│  └─────────────────────────────────┬───────────────────────────────────────┘   │
│                                    │                                           │
│         ┌──────────────────────────┼──────────────────────────┐                │
│         │                          │                          │                │
│         ▼                          ▼                          ▼                │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐          │
│  │  API NODE   │           │  API NODE   │           │  API NODE   │          │
│  │  Instance 1 │           │  Instance 2 │           │  Instance N │          │
│  └──────┬──────┘           └──────┬──────┘           └──────┬──────┘          │
│         │                          │                          │                │
│         └──────────────────────────┼──────────────────────────┘                │
│                                    │                                           │
│         ┌──────────────────────────┼──────────────────────────┐                │
│         │                          │                          │                │
│         ▼                          ▼                          ▼                │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐          │
│  │    REDIS    │           │  SUPABASE   │           │   WORKERS   │          │
│  │   (Cache)   │           │ (PostgreSQL)│           │  (BullMQ)   │          │
│  │  + BullMQ   │           │  + Storage  │           │  AI Jobs    │          │
│  └─────────────┘           └─────────────┘           └──────┬──────┘          │
│                                                             │                  │
│                    ┌────────────────────────────────────────┘                  │
│                    │                                                           │
│         ┌─────────┴─────────┬─────────────────┬─────────────────┐             │
│         ▼                   ▼                 ▼                 ▼             │
│  ┌─────────────┐     ┌─────────────┐   ┌─────────────┐   ┌─────────────┐      │
│  │   FREEPIK   │     │  REPLICATE  │   │   OPENAI    │   │  ELEVENLABS │      │
│  │     API     │     │     API     │   │     API     │   │     API     │      │
│  └─────────────┘     └─────────────┘   └─────────────┘   └─────────────┘      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# ═══════════════════════════════════════════════════════════════
# PARTE 2: ESTRUTURA DE PASTAS (ENTERPRISE)
# ═══════════════════════════════════════════════════════════════

```
server/
├── src/
│   ├── config/
│   │   ├── index.ts                 # Configurações gerais
│   │   ├── database.ts              # Config Supabase
│   │   ├── redis.ts                 # Config Redis
│   │   ├── queue.ts                 # Config BullMQ
│   │   └── providers.ts             # Config APIs externas
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── index.ts             # Router principal
│   │   │   ├── auth.routes.ts       # Autenticação
│   │   │   ├── users.routes.ts      # Usuários
│   │   │   ├── organizations.routes.ts  # Organizações/Times
│   │   │   ├── billing.routes.ts    # Faturamento/Créditos
│   │   │   ├── ai.routes.ts         # Geração de IA
│   │   │   ├── studio.routes.ts     # Creator Studio
│   │   │   ├── workflow.routes.ts   # Workflow
│   │   │   ├── analytics.routes.ts  # Analytics/Métricas
│   │   │   └── admin.routes.ts      # Admin (super admin)
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── organizations.controller.ts
│   │   │   ├── billing.controller.ts
│   │   │   ├── ai.controller.ts
│   │   │   ├── studio.controller.ts
│   │   │   ├── workflow.controller.ts
│   │   │   ├── analytics.controller.ts
│   │   │   └── admin.controller.ts
│   │   │
│   │   └── validators/
│   │       ├── auth.validator.ts
│   │       ├── ai.validator.ts
│   │       └── billing.validator.ts
│   │
│   ├── services/
│   │   ├── ai/
│   │   │   ├── index.ts             # Factory de providers
│   │   │   ├── base.provider.ts     # Classe base
│   │   │   ├── freepik.provider.ts
│   │   │   ├── replicate.provider.ts
│   │   │   ├── openai.provider.ts
│   │   │   └── elevenlabs.provider.ts
│   │   │
│   │   ├── billing/
│   │   │   ├── credits.service.ts   # Sistema de créditos
│   │   │   ├── usage.service.ts     # Tracking de uso
│   │   │   ├── pricing.service.ts   # Cálculo de preços
│   │   │   └── invoice.service.ts   # Faturas
│   │   │
│   │   ├── analytics/
│   │   │   ├── metrics.service.ts   # Métricas gerais
│   │   │   ├── usage.analytics.ts   # Analytics de uso
│   │   │   └── cost.analytics.ts    # Analytics de custo
│   │   │
│   │   ├── cache/
│   │   │   └── redis.service.ts     # Serviço de cache
│   │   │
│   │   ├── queue/
│   │   │   ├── queue.service.ts     # Gerenciador de filas
│   │   │   └── jobs/
│   │   │       ├── image.job.ts
│   │   │       ├── video.job.ts
│   │   │       └── audio.job.ts
│   │   │
│   │   ├── storage/
│   │   │   └── supabase.storage.ts  # Upload de arquivos
│   │   │
│   │   └── notification/
│   │       ├── email.service.ts
│   │       ├── webhook.service.ts
│   │       └── realtime.service.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts       # Autenticação JWT
│   │   ├── rateLimit.middleware.ts  # Rate limiting por plano
│   │   ├── billing.middleware.ts    # Verificar créditos
│   │   ├── organization.middleware.ts # Contexto da org
│   │   ├── apiKey.middleware.ts     # Validar API keys
│   │   ├── audit.middleware.ts      # Audit log
│   │   ├── cors.middleware.ts       # CORS
│   │   └── error.middleware.ts      # Error handler
│   │
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── organization.model.ts
│   │   ├── subscription.model.ts
│   │   ├── credits.model.ts
│   │   ├── usage.model.ts
│   │   ├── apiKey.model.ts
│   │   └── auditLog.model.ts
│   │
│   ├── utils/
│   │   ├── encryption.ts            # Criptografia de API keys
│   │   ├── tokens.ts                # Contagem de tokens
│   │   ├── cost.ts                  # Cálculo de custos
│   │   ├── helpers.ts
│   │   └── constants.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── ai.types.ts
│   │   ├── billing.types.ts
│   │   └── analytics.types.ts
│   │
│   └── workers/
│       ├── index.ts                 # Entry point workers
│       ├── image.worker.ts
│       ├── video.worker.ts
│       └── audio.worker.ts
│
├── prisma/                          # Se usar Prisma
│   └── schema.prisma
│
├── server.ts                        # Entry point
├── package.json
├── tsconfig.json
├── .env
└── .env.example
```

---

# ═══════════════════════════════════════════════════════════════
# PARTE 3: BANCO DE DADOS ENTERPRISE (SUPABASE)
# ═══════════════════════════════════════════════════════════════

## 3.1 SCHEMA COMPLETO SQL

```sql
-- ═══════════════════════════════════════════════════════════════
-- EXTENSÕES
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'member', 'viewer');
CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'professional', 'business', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'paused');
CREATE TYPE job_status AS ENUM ('pending', 'queued', 'processing', 'completed', 'failed', 'canceled');
CREATE TYPE ai_provider AS ENUM ('freepik', 'replicate', 'openai', 'elevenlabs', 'runway', 'midjourney');
CREATE TYPE generation_type AS ENUM ('image', 'video', 'audio', 'text');
CREATE TYPE credit_transaction_type AS ENUM ('purchase', 'usage', 'refund', 'bonus', 'subscription', 'adjustment');

-- ═══════════════════════════════════════════════════════════════
-- ORGANIZAÇÕES (Multi-tenant)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  
  -- Configurações
  settings JSONB DEFAULT '{
    "allowMemberInvites": true,
    "defaultMemberRole": "member",
    "requireApproval": false
  }',
  
  -- Limites customizados (override do plano)
  custom_limits JSONB DEFAULT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- ═══════════════════════════════════════════════════════════════
-- USUÁRIOS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Auth (Supabase Auth)
  auth_id UUID UNIQUE, -- ID do Supabase Auth
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  
  -- Perfil
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(50),
  
  -- Organização
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  role user_role DEFAULT 'member',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  
  -- Preferências
  preferences JSONB DEFAULT '{
    "theme": "dark",
    "language": "pt-BR",
    "notifications": {
      "email": true,
      "push": true
    }
  }',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_auth ON users(auth_id);

-- ═══════════════════════════════════════════════════════════════
-- PLANOS E LIMITES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug subscription_plan UNIQUE NOT NULL,
  
  -- Preços (em centavos)
  price_monthly INTEGER NOT NULL DEFAULT 0,
  price_yearly INTEGER NOT NULL DEFAULT 0,
  
  -- Créditos inclusos por mês
  credits_monthly INTEGER NOT NULL DEFAULT 0,
  
  -- Limites
  limits JSONB NOT NULL DEFAULT '{
    "images_per_month": 100,
    "videos_per_month": 10,
    "audio_minutes_per_month": 30,
    "max_resolution": "1024x1024",
    "max_video_duration": 10,
    "max_team_members": 1,
    "max_projects": 5,
    "max_storage_gb": 1,
    "api_requests_per_minute": 10,
    "api_requests_per_day": 1000,
    "priority_queue": false,
    "custom_models": false,
    "white_label": false,
    "dedicated_support": false
  }',
  
  -- Features habilitadas
  features JSONB NOT NULL DEFAULT '{
    "image_generation": true,
    "video_generation": false,
    "audio_generation": false,
    "workflow": true,
    "analytics": false,
    "api_access": false,
    "webhooks": false,
    "sso": false
  }',
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir planos padrão
INSERT INTO plans (name, slug, price_monthly, price_yearly, credits_monthly, limits, features) VALUES
('Free', 'free', 0, 0, 50, 
  '{"images_per_month": 50, "videos_per_month": 0, "audio_minutes_per_month": 0, "max_resolution": "512x512", "max_video_duration": 0, "max_team_members": 1, "max_projects": 2, "max_storage_gb": 0.5, "api_requests_per_minute": 5, "api_requests_per_day": 100, "priority_queue": false}',
  '{"image_generation": true, "video_generation": false, "audio_generation": false, "workflow": true, "analytics": false, "api_access": false}'
),
('Starter', 'starter', 4900, 47000, 500,
  '{"images_per_month": 500, "videos_per_month": 20, "audio_minutes_per_month": 30, "max_resolution": "1024x1024", "max_video_duration": 5, "max_team_members": 3, "max_projects": 10, "max_storage_gb": 5, "api_requests_per_minute": 20, "api_requests_per_day": 5000, "priority_queue": false}',
  '{"image_generation": true, "video_generation": true, "audio_generation": true, "workflow": true, "analytics": true, "api_access": false}'
),
('Professional', 'professional', 9900, 95000, 2000,
  '{"images_per_month": 2000, "videos_per_month": 100, "audio_minutes_per_month": 120, "max_resolution": "2048x2048", "max_video_duration": 10, "max_team_members": 10, "max_projects": 50, "max_storage_gb": 25, "api_requests_per_minute": 60, "api_requests_per_day": 20000, "priority_queue": true}',
  '{"image_generation": true, "video_generation": true, "audio_generation": true, "workflow": true, "analytics": true, "api_access": true, "webhooks": true}'
),
('Business', 'business', 24900, 239000, 10000,
  '{"images_per_month": 10000, "videos_per_month": 500, "audio_minutes_per_month": 500, "max_resolution": "4096x4096", "max_video_duration": 30, "max_team_members": 50, "max_projects": 200, "max_storage_gb": 100, "api_requests_per_minute": 120, "api_requests_per_day": 100000, "priority_queue": true, "custom_models": true}',
  '{"image_generation": true, "video_generation": true, "audio_generation": true, "workflow": true, "analytics": true, "api_access": true, "webhooks": true, "sso": true}'
),
('Enterprise', 'enterprise', 0, 0, 0,
  '{"images_per_month": -1, "videos_per_month": -1, "audio_minutes_per_month": -1, "max_resolution": "unlimited", "max_video_duration": -1, "max_team_members": -1, "max_projects": -1, "max_storage_gb": -1, "api_requests_per_minute": -1, "api_requests_per_day": -1, "priority_queue": true, "custom_models": true, "white_label": true, "dedicated_support": true}',
  '{"image_generation": true, "video_generation": true, "audio_generation": true, "workflow": true, "analytics": true, "api_access": true, "webhooks": true, "sso": true}'
);

-- ═══════════════════════════════════════════════════════════════
-- ASSINATURAS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  
  -- Status
  status subscription_status DEFAULT 'trialing',
  
  -- Período
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  
  -- Pagamento (integração com Stripe/Asaas)
  external_id VARCHAR(255), -- ID no gateway de pagamento
  payment_method JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ═══════════════════════════════════════════════════════════════
-- CRÉDITOS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE credit_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Saldos
  balance INTEGER NOT NULL DEFAULT 0, -- Créditos disponíveis
  lifetime_purchased INTEGER DEFAULT 0, -- Total já comprado
  lifetime_used INTEGER DEFAULT 0, -- Total já usado
  lifetime_bonus INTEGER DEFAULT 0, -- Total de bônus recebido
  
  -- Controle de período
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  period_credits_used INTEGER DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id)
);

CREATE INDEX idx_credit_balances_org ON credit_balances(organization_id);

-- ═══════════════════════════════════════════════════════════════
-- TRANSAÇÕES DE CRÉDITO
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Tipo e valor
  type credit_transaction_type NOT NULL,
  amount INTEGER NOT NULL, -- Positivo = crédito, Negativo = débito
  balance_after INTEGER NOT NULL, -- Saldo após transação
  
  -- Referência
  reference_type VARCHAR(50), -- 'generation', 'purchase', 'subscription', etc
  reference_id UUID,
  
  -- Detalhes
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_org ON credit_transactions(organization_id);
CREATE INDEX idx_credit_transactions_created ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);

-- ═══════════════════════════════════════════════════════════════
-- API KEYS (Criptografadas)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  
  -- Identificação
  name VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL, -- Primeiros caracteres para identificação (ex: "base_")
  key_hash VARCHAR(255) NOT NULL, -- Hash da chave (nunca armazena a chave real)
  
  -- Permissões
  scopes TEXT[] DEFAULT ARRAY['read', 'write'],
  
  -- Limites específicos
  rate_limit_per_minute INTEGER,
  rate_limit_per_day INTEGER,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- ═══════════════════════════════════════════════════════════════
-- PROVIDER API KEYS (Chaves das APIs externas - CRIPTOGRAFADAS)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE provider_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Provider
  provider ai_provider NOT NULL,
  
  -- Chave criptografada (usar pgcrypto)
  encrypted_key TEXT NOT NULL,
  key_hint VARCHAR(20), -- Últimos 4 caracteres para identificação
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_valid BOOLEAN DEFAULT TRUE, -- Última validação
  last_validated_at TIMESTAMPTZ,
  validation_error TEXT,
  
  -- Uso
  last_used_at TIMESTAMPTZ,
  total_requests INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, provider)
);

CREATE INDEX idx_provider_keys_org ON provider_api_keys(organization_id);

-- ═══════════════════════════════════════════════════════════════
-- JOBS DE IA (Fila de processamento)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE ai_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Tipo
  type generation_type NOT NULL,
  provider ai_provider NOT NULL,
  model VARCHAR(100) NOT NULL,
  
  -- Status
  status job_status DEFAULT 'pending',
  priority INTEGER DEFAULT 0, -- 0 = normal, 1+ = prioritário
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  -- Input
  input JSONB NOT NULL,
  
  -- Output
  output JSONB,
  output_url TEXT,
  
  -- Erro
  error_message TEXT,
  error_code VARCHAR(50),
  
  -- Métricas
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  
  -- Timing
  queued_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_jobs_org ON ai_jobs(organization_id);
CREATE INDEX idx_ai_jobs_user ON ai_jobs(user_id);
CREATE INDEX idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX idx_ai_jobs_created ON ai_jobs(created_at DESC);
CREATE INDEX idx_ai_jobs_type ON ai_jobs(type);
CREATE INDEX idx_ai_jobs_provider ON ai_jobs(provider);

-- ═══════════════════════════════════════════════════════════════
-- GERAÇÕES (Histórico de imagens/vídeos/áudios gerados)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES ai_jobs(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Tipo
  type generation_type NOT NULL,
  provider ai_provider NOT NULL,
  model VARCHAR(100) NOT NULL,
  
  -- Input
  prompt TEXT,
  negative_prompt TEXT,
  input_params JSONB DEFAULT '{}',
  
  -- Output
  output_url TEXT NOT NULL,
  thumbnail_url TEXT,
  output_metadata JSONB DEFAULT '{}',
  
  -- Dimensões
  width INTEGER,
  height INTEGER,
  duration_seconds DECIMAL(10, 2), -- Para vídeo/áudio
  file_size_bytes BIGINT,
  
  -- Custos
  tokens_used INTEGER DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  
  -- Organização
  project_id UUID,
  folder_path TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Status
  is_favorite BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_generations_org ON generations(organization_id);
CREATE INDEX idx_generations_user ON generations(user_id);
CREATE INDEX idx_generations_type ON generations(type);
CREATE INDEX idx_generations_created ON generations(created_at DESC);
CREATE INDEX idx_generations_provider ON generations(provider);
CREATE INDEX idx_generations_model ON generations(model);
CREATE INDEX idx_generations_tags ON generations USING GIN(tags);

-- ═══════════════════════════════════════════════════════════════
-- ANALYTICS DE USO (Agregado por dia)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE usage_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Contagens por tipo
  images_generated INTEGER DEFAULT 0,
  videos_generated INTEGER DEFAULT 0,
  audio_generated INTEGER DEFAULT 0,
  
  -- Contagens por provider
  usage_by_provider JSONB DEFAULT '{}',
  -- Exemplo: {"freepik": 50, "replicate": 30, "openai": 20}
  
  -- Contagens por modelo
  usage_by_model JSONB DEFAULT '{}',
  -- Exemplo: {"flux-schnell": 40, "dall-e-3": 30}
  
  -- Tokens
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  
  -- Créditos e custos
  credits_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 2) DEFAULT 0,
  
  -- API
  api_requests INTEGER DEFAULT 0,
  api_errors INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, date)
);

CREATE INDEX idx_usage_daily_org ON usage_daily(organization_id);
CREATE INDEX idx_usage_daily_date ON usage_daily(date DESC);

-- ═══════════════════════════════════════════════════════════════
-- ANALYTICS POR USUÁRIO
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE usage_by_user (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Contagens
  images_generated INTEGER DEFAULT 0,
  videos_generated INTEGER DEFAULT 0,
  audio_generated INTEGER DEFAULT 0,
  
  -- Custos
  credits_used INTEGER DEFAULT 0,
  
  UNIQUE(organization_id, user_id, date)
);

CREATE INDEX idx_usage_user_org ON usage_by_user(organization_id);
CREATE INDEX idx_usage_user_user ON usage_by_user(user_id);
CREATE INDEX idx_usage_user_date ON usage_by_user(date DESC);

-- ═══════════════════════════════════════════════════════════════
-- RATE LIMITING (Controle de requisições)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identificador (pode ser org_id, user_id, ip, api_key)
  identifier VARCHAR(255) NOT NULL,
  identifier_type VARCHAR(50) NOT NULL, -- 'organization', 'user', 'ip', 'api_key'
  
  -- Janela de tempo
  window_start TIMESTAMPTZ NOT NULL,
  window_size_seconds INTEGER NOT NULL,
  
  -- Contagem
  request_count INTEGER DEFAULT 1,
  
  -- Limite
  max_requests INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(identifier, identifier_type, window_start)
);

CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier, identifier_type);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);

-- Limpar rate limits antigos automaticamente
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- AUDIT LOG (Log de auditoria)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Ação
  action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'login', 'api_call', etc
  resource_type VARCHAR(100) NOT NULL, -- 'generation', 'user', 'api_key', etc
  resource_id UUID,
  
  -- Detalhes
  description TEXT,
  old_values JSONB,
  new_values JSONB,
  
  -- Request info
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  
  -- Resultado
  status VARCHAR(50) DEFAULT 'success', -- 'success', 'failure', 'error'
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- WEBHOOKS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Configuração
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(255), -- Para validação HMAC
  
  -- Eventos
  events TEXT[] NOT NULL, -- ['generation.completed', 'generation.failed', etc]
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Retry config
  max_retries INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,
  
  -- Stats
  total_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhooks_org ON webhooks(organization_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active);

-- ═══════════════════════════════════════════════════════════════
-- WEBHOOK DELIVERIES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  
  -- Evento
  event VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  
  -- Resposta
  status_code INTEGER,
  response_body TEXT,
  response_headers JSONB,
  
  -- Timing
  duration_ms INTEGER,
  attempt INTEGER DEFAULT 1,
  
  -- Status
  delivered BOOLEAN DEFAULT FALSE,
  error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_created ON webhook_deliveries(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- PRICING (Preços por modelo/operação)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identificação
  provider ai_provider NOT NULL,
  model VARCHAR(100) NOT NULL,
  operation VARCHAR(50) NOT NULL, -- 'generate', 'upscale', 'edit', etc
  
  -- Preço
  credits_per_unit INTEGER NOT NULL, -- Créditos por operação
  cost_usd_per_unit DECIMAL(10, 6) NOT NULL, -- Custo real para a plataforma
  
  -- Unidade
  unit_type VARCHAR(50) NOT NULL, -- 'image', 'second', 'minute', '1k_tokens'
  
  -- Multiplicadores
  resolution_multipliers JSONB DEFAULT '{}',
  -- Exemplo: {"512": 1.0, "1024": 2.0, "2048": 4.0}
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(provider, model, operation)
);

-- Inserir preços padrão
INSERT INTO pricing (provider, model, operation, credits_per_unit, cost_usd_per_unit, unit_type, resolution_multipliers) VALUES
-- Freepik
('freepik', 'mystic', 'generate', 1, 0.02, 'image', '{"512": 1, "1024": 2, "2048": 4}'),
-- Replicate
('replicate', 'flux-schnell', 'generate', 1, 0.003, 'image', '{"512": 1, "1024": 1, "2048": 2}'),
('replicate', 'flux-pro', 'generate', 3, 0.055, 'image', '{"512": 1, "1024": 1, "2048": 2}'),
('replicate', 'sdxl', 'generate', 1, 0.004, 'image', '{}'),
('replicate', 'kling-1.5', 'generate', 10, 0.10, 'second', '{}'),
('replicate', 'minimax', 'generate', 15, 0.15, 'second', '{}'),
-- OpenAI
('openai', 'dall-e-3', 'generate', 4, 0.04, 'image', '{"1024": 1, "1792": 2}'),
('openai', 'dall-e-3-hd', 'generate', 8, 0.08, 'image', '{"1024": 1, "1792": 2}'),
-- ElevenLabs
('elevenlabs', 'eleven_multilingual_v2', 'generate', 1, 0.30, 'minute', '{}');

-- ═══════════════════════════════════════════════════════════════
-- VIEWS ÚTEIS
-- ═══════════════════════════════════════════════════════════════

-- View: Uso atual da organização
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
  (
    SELECT COUNT(*) FROM generations g 
    WHERE g.organization_id = o.id 
    AND g.type = 'image' 
    AND g.created_at >= cb.period_start
  ) AS images_used,
  (
    SELECT COUNT(*) FROM generations g 
    WHERE g.organization_id = o.id 
    AND g.type = 'video' 
    AND g.created_at >= cb.period_start
  ) AS videos_used
FROM organizations o
LEFT JOIN subscriptions s ON s.organization_id = o.id AND s.status = 'active'
LEFT JOIN plans p ON p.id = s.plan_id
LEFT JOIN credit_balances cb ON cb.organization_id = o.id;

-- View: Analytics de custo por provider
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
  -- Obter saldo atual (com lock)
  SELECT balance INTO v_current_balance
  FROM credit_balances
  WHERE organization_id = p_organization_id
  FOR UPDATE;
  
  -- Verificar saldo suficiente
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Calcular novo saldo
  v_new_balance := v_current_balance - p_amount;
  
  -- Atualizar saldo
  UPDATE credit_balances
  SET 
    balance = v_new_balance,
    lifetime_used = lifetime_used + p_amount,
    period_credits_used = period_credits_used + p_amount,
    updated_at = NOW()
  WHERE organization_id = p_organization_id;
  
  -- Registrar transação
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
  -- Atualizar saldo
  UPDATE credit_balances
  SET 
    balance = balance + p_amount,
    lifetime_purchased = CASE WHEN p_type = 'purchase' THEN lifetime_purchased + p_amount ELSE lifetime_purchased END,
    lifetime_bonus = CASE WHEN p_type = 'bonus' THEN lifetime_bonus + p_amount ELSE lifetime_bonus END,
    updated_at = NOW()
  WHERE organization_id = p_organization_id
  RETURNING balance INTO v_new_balance;
  
  -- Se não existir, criar
  IF v_new_balance IS NULL THEN
    INSERT INTO credit_balances (organization_id, balance, period_start, period_end)
    VALUES (p_organization_id, p_amount, NOW(), NOW() + INTERVAL '1 month')
    RETURNING balance INTO v_new_balance;
  END IF;
  
  -- Registrar transação
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
  
  -- Tentar incrementar ou inserir
  INSERT INTO rate_limits (identifier, identifier_type, window_start, window_size_seconds, request_count, max_requests)
  VALUES (p_identifier, p_identifier_type, v_window_start, p_window_seconds, 1, p_max_requests)
  ON CONFLICT (identifier, identifier_type, window_start) 
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_count;
  
  RETURN v_count <= p_max_requests;
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

CREATE TRIGGER trg_organizations_updated
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_subscriptions_updated
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════

-- Habilitar RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar conforme necessidade)
CREATE POLICY "Users can view own organization"
ON organizations FOR SELECT
USING (id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view organization members"
ON users FOR SELECT
USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view own generations"
ON generations FOR SELECT
USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can create generations"
ON generations FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));
```

---

# ═══════════════════════════════════════════════════════════════
# PARTE 4: BACKEND - ARQUIVOS PRINCIPAIS
# ═══════════════════════════════════════════════════════════════

## 4.1 server.ts (Entry Point)

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { errorMiddleware } from './src/middleware/error.middleware';
import { corsMiddleware } from './src/middleware/cors.middleware';
import { rateLimitMiddleware } from './src/middleware/rateLimit.middleware';
import { auditMiddleware } from './src/middleware/audit.middleware';

import routes from './src/api/routes';
import { initializeQueue } from './src/services/queue/queue.service';
import { initializeRedis } from './src/config/redis';
import { logger } from './src/utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security
app.use(helmet());
app.use(corsMiddleware);

// Performance
app.use(compression());

// Parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Rate Limiting (global)
app.use(rateLimitMiddleware);

// Audit logging
app.use(auditMiddleware);

// Routes
app.use('/api', routes);

// Error handling
app.use(errorMiddleware);

// Start server
async function start() {
  try {
    // Initialize Redis
    await initializeRedis();
    logger.info('✅ Redis connected');

    // Initialize Queue
    await initializeQueue();
    logger.info('✅ Queue initialized');

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
```

## 4.2 src/config/index.ts

```typescript
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // URLs
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  
  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_KEY!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  // AI Providers (chaves da plataforma - fallback)
  providers: {
    freepik: {
      apiKey: process.env.FREEPIK_API_KEY,
      baseUrl: 'https://api.freepik.com/v1',
    },
    replicate: {
      apiToken: process.env.REPLICATE_API_TOKEN,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    elevenlabs: {
      apiKey: process.env.ELEVENLABS_API_KEY,
    },
  },
  
  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY!, // 32 bytes para AES-256
    algorithm: 'aes-256-gcm',
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '7d',
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: {
      free: 10,
      starter: 30,
      professional: 60,
      business: 120,
      enterprise: 300,
    },
  },
  
  // Queue
  queue: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  },
};
```

## 4.3 src/utils/encryption.ts

```typescript
import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Criptografar uma string (API key)
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(config.encryption.key, 'hex');
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Formato: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Descriptografar uma string
 */
export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = Buffer.from(config.encryption.key, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Hash de API key (para armazenar referência sem expor)
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Gerar API key segura
 */
export function generateApiKey(prefix: string = 'base'): { key: string; hash: string } {
  const randomPart = crypto.randomBytes(32).toString('base64url');
  const key = `${prefix}_${randomPart}`;
  const hash = hashApiKey(key);
  
  return { key, hash };
}

/**
 * Obter hint de uma chave (últimos 4 caracteres)
 */
export function getKeyHint(key: string): string {
  return `****${key.slice(-4)}`;
}
```

## 4.4 src/services/billing/credits.service.ts

```typescript
import { supabase } from '../../config/database';
import { logger } from '../../utils/logger';

interface DebitResult {
  success: boolean;
  newBalance?: number;
  error?: string;
}

interface CreditResult {
  success: boolean;
  newBalance: number;
}

export const creditsService = {
  /**
   * Obter saldo de créditos
   */
  async getBalance(organizationId: string): Promise<number> {
    const { data, error } = await supabase
      .from('credit_balances')
      .select('balance')
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      return 0;
    }

    return data.balance;
  },

  /**
   * Verificar se tem créditos suficientes
   */
  async hasEnoughCredits(organizationId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(organizationId);
    return balance >= amount;
  },

  /**
   * Debitar créditos (usar)
   */
  async debit(params: {
    organizationId: string;
    userId: string;
    amount: number;
    referenceType: string;
    referenceId: string;
    description?: string;
  }): Promise<DebitResult> {
    const { organizationId, userId, amount, referenceType, referenceId, description } = params;

    try {
      // Chamar função do banco
      const { data, error } = await supabase.rpc('debit_credits', {
        p_organization_id: organizationId,
        p_user_id: userId,
        p_amount: amount,
        p_reference_type: referenceType,
        p_reference_id: referenceId,
        p_description: description,
      });

      if (error) {
        logger.error('Error debiting credits:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Insufficient credits' };
      }

      const newBalance = await this.getBalance(organizationId);
      return { success: true, newBalance };

    } catch (error: any) {
      logger.error('Error debiting credits:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Creditar créditos (adicionar)
   */
  async credit(params: {
    organizationId: string;
    amount: number;
    type: 'purchase' | 'subscription' | 'bonus' | 'refund' | 'adjustment';
    description?: string;
  }): Promise<CreditResult> {
    const { organizationId, amount, type, description } = params;

    const { data, error } = await supabase.rpc('credit_credits', {
      p_organization_id: organizationId,
      p_amount: amount,
      p_type: type,
      p_description: description,
    });

    if (error) {
      throw new Error(`Error crediting: ${error.message}`);
    }

    return { success: true, newBalance: data };
  },

  /**
   * Obter histórico de transações
   */
  async getTransactions(organizationId: string, options?: {
    limit?: number;
    offset?: number;
    type?: string;
  }) {
    let query = supabase
      .from('credit_transactions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (options?.type) {
      query = query.eq('type', options.type);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Obter uso do período atual
   */
  async getPeriodUsage(organizationId: string) {
    const { data, error } = await supabase
      .from('credit_balances')
      .select('period_start, period_end, period_credits_used, balance')
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      periodStart: data.period_start,
      periodEnd: data.period_end,
      creditsUsed: data.period_credits_used,
      creditsRemaining: data.balance,
    };
  },
};
```

## 4.5 src/services/billing/pricing.service.ts

```typescript
import { supabase } from '../../config/database';

interface PricingInfo {
  creditsPerUnit: number;
  costUsdPerUnit: number;
  resolutionMultiplier?: number;
}

// Cache de preços
let pricingCache: Map<string, PricingInfo> = new Map();
let cacheExpiry: Date | null = null;

export const pricingService = {
  /**
   * Obter preço de uma operação
   */
  async getPrice(
    provider: string,
    model: string,
    operation: string = 'generate',
    resolution?: string
  ): Promise<PricingInfo> {
    // Verificar cache
    const cacheKey = `${provider}:${model}:${operation}`;
    
    if (cacheExpiry && cacheExpiry > new Date() && pricingCache.has(cacheKey)) {
      const cached = pricingCache.get(cacheKey)!;
      
      // Aplicar multiplicador de resolução se necessário
      if (resolution && cached.resolutionMultiplier) {
        return {
          ...cached,
          creditsPerUnit: Math.ceil(cached.creditsPerUnit * cached.resolutionMultiplier),
        };
      }
      
      return cached;
    }

    // Buscar do banco
    await this.refreshCache();
    
    return pricingCache.get(cacheKey) || {
      creditsPerUnit: 1,
      costUsdPerUnit: 0.01,
    };
  },

  /**
   * Calcular custo de uma geração
   */
  async calculateCost(params: {
    provider: string;
    model: string;
    operation?: string;
    resolution?: string;
    quantity?: number;
    durationSeconds?: number;
  }): Promise<{
    credits: number;
    costUsd: number;
  }> {
    const { provider, model, operation = 'generate', resolution, quantity = 1, durationSeconds } = params;

    const pricing = await this.getPrice(provider, model, operation, resolution);

    let multiplier = 1;

    // Para vídeo/áudio, multiplicar por duração
    if (durationSeconds) {
      multiplier = Math.ceil(durationSeconds);
    }

    // Aplicar multiplicador de resolução
    if (resolution && pricing.resolutionMultiplier) {
      multiplier *= pricing.resolutionMultiplier;
    }

    const credits = Math.ceil(pricing.creditsPerUnit * quantity * multiplier);
    const costUsd = pricing.costUsdPerUnit * quantity * multiplier;

    return { credits, costUsd };
  },

  /**
   * Atualizar cache de preços
   */
  async refreshCache(): Promise<void> {
    const { data, error } = await supabase
      .from('pricing')
      .select('*')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Error fetching pricing: ${error.message}`);
    }

    pricingCache.clear();

    for (const price of data || []) {
      const key = `${price.provider}:${price.model}:${price.operation}`;
      pricingCache.set(key, {
        creditsPerUnit: price.credits_per_unit,
        costUsdPerUnit: parseFloat(price.cost_usd_per_unit),
        resolutionMultiplier: price.resolution_multipliers,
      });
    }

    // Cache válido por 5 minutos
    cacheExpiry = new Date(Date.now() + 5 * 60 * 1000);
  },
};
```

## 4.6 src/middleware/billing.middleware.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { creditsService } from '../services/billing/credits.service';
import { pricingService } from '../services/billing/pricing.service';

/**
 * Middleware para verificar créditos antes de operações de IA
 */
export async function checkCreditsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { organizationId } = req.user!; // Assumindo que auth middleware já rodou
    const { model, provider } = req.body;

    // Calcular custo estimado
    const { credits } = await pricingService.calculateCost({
      provider: provider || 'freepik',
      model: model || 'mystic',
      operation: 'generate',
    });

    // Verificar saldo
    const hasCredits = await creditsService.hasEnoughCredits(organizationId, credits);

    if (!hasCredits) {
      return res.status(402).json({
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        required: credits,
        balance: await creditsService.getBalance(organizationId),
      });
    }

    // Passar custo estimado para o controller
    req.estimatedCredits = credits;

    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Middleware para debitar créditos após operação bem-sucedida
 */
export async function debitCreditsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Interceptar res.json para debitar após sucesso
  const originalJson = res.json.bind(res);

  res.json = (data: any) => {
    // Se a operação foi bem-sucedida e temos um ID de geração
    if (res.statusCode < 400 && data.generationId) {
      const { organizationId, userId } = req.user!;
      
      // Debitar em background (não bloqueia resposta)
      creditsService.debit({
        organizationId,
        userId,
        amount: req.estimatedCredits || 1,
        referenceType: 'generation',
        referenceId: data.generationId,
      }).catch(err => {
        console.error('Error debiting credits:', err);
      });
    }

    return originalJson(data);
  };

  next();
}
```

## 4.7 src/middleware/rateLimit.middleware.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { config } from '../config';
import { getRedisClient } from '../config/redis';

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

/**
 * Rate limiting por plano de assinatura
 */
export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const redis = getRedisClient();
    
    // Identificador (preferência: org > user > ip)
    const identifier = req.user?.organizationId 
      || req.user?.userId 
      || req.ip 
      || 'anonymous';

    const plan = req.user?.plan || 'free';
    const maxRequests = config.rateLimit.maxRequests[plan as keyof typeof config.rateLimit.maxRequests] || 10;

    const windowMs = config.rateLimit.windowMs;
    const windowKey = `rate:${identifier}:${Math.floor(Date.now() / windowMs)}`;

    // Incrementar contador
    const current = await redis.incr(windowKey);

    // Definir expiração na primeira requisição da janela
    if (current === 1) {
      await redis.expire(windowKey, Math.ceil(windowMs / 1000));
    }

    // Headers de rate limit
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
    res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / windowMs) * windowMs);

    // Verificar limite
    if (current > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    next();
  } catch (error) {
    // Se Redis falhar, permitir a requisição (fail open)
    console.error('Rate limit error:', error);
    next();
  }
}

/**
 * Rate limiting específico para endpoints
 */
export function createRateLimiter(options: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const redis = getRedisClient();
      const identifier = req.user?.organizationId || req.ip || 'anonymous';
      const endpoint = req.path;

      const windowKey = `rate:${identifier}:${endpoint}:${Math.floor(Date.now() / options.windowMs)}`;

      const current = await redis.incr(windowKey);

      if (current === 1) {
        await redis.expire(windowKey, Math.ceil(options.windowMs / 1000));
      }

      if (current > options.max) {
        return res.status(429).json({
          error: 'Too many requests to this endpoint',
          code: 'ENDPOINT_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(options.windowMs / 1000),
        });
      }

      next();
    } catch (error) {
      next();
    }
  };
}
```

## 4.8 src/services/ai/base.provider.ts

```typescript
export interface GenerateImageParams {
  prompt: string;
  negativePrompt?: string;
  style?: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
}

export interface GenerateImageResult {
  imageUrl: string;
  width: number;
  height: number;
  metadata: {
    provider: string;
    model: string;
    tokensUsed?: number;
    processingTimeMs?: number;
  };
}

export interface GenerateVideoParams {
  sourceImage: string;
  motionPrompt?: string;
  duration?: number;
  aspectRatio?: string;
}

export interface GenerateVideoResult {
  videoUrl: string;
  durationSeconds: number;
  metadata: {
    provider: string;
    model: string;
  };
}

export abstract class BaseAIProvider {
  protected apiKey: string;
  protected model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  abstract generateImage(params: GenerateImageParams): Promise<GenerateImageResult>;
  
  abstract generateVideo?(params: GenerateVideoParams): Promise<GenerateVideoResult>;
  
  abstract validateApiKey(): Promise<boolean>;
  
  abstract getAvailableModels(): Promise<string[]>;
}
```

---

# ═══════════════════════════════════════════════════════════════
# PARTE 5: PACKAGE.JSON E DEPENDÊNCIAS
# ═══════════════════════════════════════════════════════════════

## 5.1 server/package.json

```json
{
  "name": "base-agency-backend",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "worker": "tsx src/workers/index.ts",
    "lint": "eslint src --ext .ts",
    "test": "vitest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1",
    "axios": "^1.6.2",
    
    "@supabase/supabase-js": "^2.39.0",
    "ioredis": "^5.3.2",
    "bullmq": "^5.1.0",
    
    "uuid": "^9.0.1",
    "zod": "^3.22.4",
    "date-fns": "^2.30.0",
    
    "openai": "^4.20.0",
    "replicate": "^0.25.0",
    
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    
    "winston": "^3.11.0",
    "pino": "^8.16.2",
    "pino-pretty": "^10.2.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.16",
    "@types/compression": "^1.7.5",
    "@types/morgan": "^1.9.9",
    "@types/node": "^20.10.0",
    "@types/uuid": "^9.0.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/bcryptjs": "^2.4.6",
    "tsx": "^4.6.0",
    "typescript": "^5.3.2",
    "vitest": "^1.0.4",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.13.1",
    "@typescript-eslint/parser": "^6.13.1"
  }
}
```

## 5.2 server/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": ".",
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*", "server.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

# ═══════════════════════════════════════════════════════════════
# PARTE 6: WORKERS (PROCESSAMENTO ASSÍNCRONO)
# ═══════════════════════════════════════════════════════════════

## 6.1 src/workers/index.ts

```typescript
import { Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis';
import { imageWorker } from './image.worker';
import { videoWorker } from './video.worker';
import { logger } from '../utils/logger';

export async function startWorkers() {
  const connection = getRedisConnection();

  // Image Worker
  const imageWorkerInstance = new Worker('image-generation', imageWorker, {
    connection,
    concurrency: 5, // 5 jobs simultâneos
  });

  imageWorkerInstance.on('completed', (job) => {
    logger.info(`Image job ${job.id} completed`);
  });

  imageWorkerInstance.on('failed', (job, err) => {
    logger.error(`Image job ${job?.id} failed:`, err);
  });

  // Video Worker
  const videoWorkerInstance = new Worker('video-generation', videoWorker, {
    connection,
    concurrency: 2, // Vídeo consome mais recursos
  });

  videoWorkerInstance.on('completed', (job) => {
    logger.info(`Video job ${job.id} completed`);
  });

  videoWorkerInstance.on('failed', (job, err) => {
    logger.error(`Video job ${job?.id} failed:`, err);
  });

  logger.info('✅ Workers started');

  return { imageWorkerInstance, videoWorkerInstance };
}

// Se executar diretamente
if (process.argv[1].includes('workers')) {
  startWorkers().catch(console.error);
}
```

## 6.2 src/workers/image.worker.ts

```typescript
import { Job } from 'bullmq';
import { AIProviderFactory } from '../services/ai';
import { supabase } from '../config/database';
import { creditsService } from '../services/billing/credits.service';
import { pricingService } from '../services/billing/pricing.service';
import { logger } from '../utils/logger';

interface ImageJobData {
  organizationId: string;
  userId: string;
  prompt: string;
  negativePrompt?: string;
  provider: string;
  model: string;
  style?: string;
  aspectRatio?: string;
  apiKey?: string; // Chave do org (descriptografada pelo controller)
}

export async function imageWorker(job: Job<ImageJobData>) {
  const { 
    organizationId, 
    userId, 
    prompt, 
    negativePrompt,
    provider, 
    model, 
    style, 
    aspectRatio,
    apiKey 
  } = job.data;

  const startTime = Date.now();

  try {
    logger.info(`Processing image job ${job.id} for org ${organizationId}`);

    // Atualizar status para processing
    await job.updateProgress(10);

    // Obter provider
    const aiProvider = AIProviderFactory.create(provider, apiKey, model);

    await job.updateProgress(20);

    // Gerar imagem
    const result = await aiProvider.generateImage({
      prompt,
      negativePrompt,
      style,
      aspectRatio,
    });

    await job.updateProgress(80);

    // Calcular custo
    const { credits, costUsd } = await pricingService.calculateCost({
      provider,
      model,
      operation: 'generate',
      resolution: aspectRatio,
    });

    // Salvar no banco
    const { data: generation, error } = await supabase
      .from('generations')
      .insert({
        job_id: job.id,
        organization_id: organizationId,
        user_id: userId,
        type: 'image',
        provider,
        model,
        prompt,
        negative_prompt: negativePrompt,
        input_params: { style, aspectRatio },
        output_url: result.imageUrl,
        output_metadata: result.metadata,
        width: result.width,
        height: result.height,
        credits_used: credits,
        cost_usd: costUsd,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error saving generation: ${error.message}`);
    }

    // Debitar créditos
    await creditsService.debit({
      organizationId,
      userId,
      amount: credits,
      referenceType: 'generation',
      referenceId: generation.id,
      description: `Image generation: ${model}`,
    });

    await job.updateProgress(100);

    const processingTime = Date.now() - startTime;

    // Atualizar job no banco
    await supabase
      .from('ai_jobs')
      .update({
        status: 'completed',
        output: result,
        output_url: result.imageUrl,
        credits_used: credits,
        cost_usd: costUsd,
        completed_at: new Date().toISOString(),
        processing_time_ms: processingTime,
      })
      .eq('id', job.id);

    logger.info(`Image job ${job.id} completed in ${processingTime}ms`);

    return {
      success: true,
      generationId: generation.id,
      imageUrl: result.imageUrl,
      creditsUsed: credits,
    };

  } catch (error: any) {
    logger.error(`Image job ${job.id} failed:`, error);

    // Atualizar job como falho
    await supabase
      .from('ai_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    throw error;
  }
}
```

---

# ═══════════════════════════════════════════════════════════════
# PARTE 7: DEPLOY E CONFIGURAÇÃO
# ═══════════════════════════════════════════════════════════════

## 7.1 render.yaml

```yaml
services:
  # API Principal
  - type: web
    name: base-agency-api
    env: node
    region: oregon
    plan: starter # $7/mês - auto-scale
    buildCommand: cd server && npm install && npm run build
    startCommand: cd server && npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
      - key: REDIS_URL
        sync: false
      - key: ENCRYPTION_KEY
        sync: false
      - key: JWT_SECRET
        sync: false
    autoDeploy: true
    
  # Workers (processamento assíncrono)
  - type: worker
    name: base-agency-workers
    env: node
    region: oregon
    plan: starter
    buildCommand: cd server && npm install && npm run build
    startCommand: cd server && node dist/workers/index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
      - key: REDIS_URL
        sync: false
      - key: ENCRYPTION_KEY
        sync: false
    autoDeploy: true

# Redis (Upstash) - Configurar separadamente
```

## 7.2 .env.example

```env
# ═══════════════════════════════════════════
# SERVER
# ═══════════════════════════════════════════
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:3001

# ═══════════════════════════════════════════
# DATABASE (SUPABASE)
# ═══════════════════════════════════════════
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# ═══════════════════════════════════════════
# CACHE & QUEUE (REDIS)
# ═══════════════════════════════════════════
REDIS_URL=redis://localhost:6379
# Para Upstash:
# REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379

# ═══════════════════════════════════════════
# SECURITY
# ═══════════════════════════════════════════
# Gerar com: openssl rand -hex 32
ENCRYPTION_KEY=your-32-byte-hex-key
JWT_SECRET=your-jwt-secret

# ═══════════════════════════════════════════
# AI PROVIDERS (Chaves da plataforma - fallback)
# ═══════════════════════════════════════════
FREEPIK_API_KEY=your-freepik-key
REPLICATE_API_TOKEN=your-replicate-token
OPENAI_API_KEY=your-openai-key
ELEVENLABS_API_KEY=your-elevenlabs-key

# ═══════════════════════════════════════════
# MONITORING (Opcional)
# ═══════════════════════════════════════════
SENTRY_DSN=
```

---

# ═══════════════════════════════════════════════════════════════
# CHECKLIST DE EXECUÇÃO
# ═══════════════════════════════════════════════════════════════

```
FASE 1: BANCO DE DADOS
[ ] Executar SQL completo no Supabase
[ ] Verificar tabelas criadas
[ ] Verificar funções criadas
[ ] Verificar triggers criados
[ ] Inserir planos padrão
[ ] Inserir pricing padrão

FASE 2: ESTRUTURA BACKEND
[ ] Criar estrutura de pastas
[ ] Criar package.json
[ ] Criar tsconfig.json
[ ] Instalar dependências

FASE 3: CONFIGURAÇÃO
[ ] Criar config/index.ts
[ ] Criar config/database.ts
[ ] Criar config/redis.ts
[ ] Criar .env com variáveis

FASE 4: UTILS E MIDDLEWARE
[ ] Criar utils/encryption.ts
[ ] Criar utils/logger.ts
[ ] Criar middleware/auth.middleware.ts
[ ] Criar middleware/billing.middleware.ts
[ ] Criar middleware/rateLimit.middleware.ts
[ ] Criar middleware/audit.middleware.ts

FASE 5: SERVICES
[ ] Criar services/ai/base.provider.ts
[ ] Criar services/ai/freepik.provider.ts
[ ] Criar services/ai/replicate.provider.ts
[ ] Criar services/ai/openai.provider.ts
[ ] Criar services/billing/credits.service.ts
[ ] Criar services/billing/pricing.service.ts
[ ] Criar services/queue/queue.service.ts

FASE 6: CONTROLLERS E ROUTES
[ ] Criar controllers/ai.controller.ts
[ ] Criar controllers/billing.controller.ts
[ ] Criar controllers/analytics.controller.ts
[ ] Criar routes/index.ts
[ ] Criar routes/ai.routes.ts
[ ] Criar routes/billing.routes.ts

FASE 7: WORKERS
[ ] Criar workers/index.ts
[ ] Criar workers/image.worker.ts
[ ] Criar workers/video.worker.ts

FASE 8: TESTES
[ ] Testar localmente
[ ] Verificar conexão Supabase
[ ] Verificar conexão Redis
[ ] Testar geração de imagem
[ ] Testar débito de créditos

FASE 9: DEPLOY
[ ] Configurar Upstash Redis
[ ] Configurar variáveis no Render
[ ] Deploy API
[ ] Deploy Workers
[ ] Testar em produção
```

---

# 🚀 EXECUTE AGORA!
