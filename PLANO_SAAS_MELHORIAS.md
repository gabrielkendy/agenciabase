# PLANO DE MELHORIAS - BASE AGENCY SAAS

## VISÃO GERAL

Transformar a aplicação em uma solução SaaS escalável com:
- Multi-tenancy (múltiplas agências/empresas)
- Sistema de planos e limites
- Painel administrativo completo
- Controle de acesso por roles (RBAC)
- Integração com Supabase

---

## 1. ARQUITETURA DE USUÁRIOS E ROLES

### Hierarquia de Acesso:

```
SUPER_ADMIN (Dono da plataforma)
├── Acesso total ao sistema
├── Gerencia planos e preços
├── Gerencia todos os tenants (agências)
├── Configura integrações globais (APIs)
├── Dashboard de métricas da plataforma
└── Controle financeiro (MRR, churn, etc)

ADMIN (Dono da agência/tenant)
├── Gerencia sua agência
├── Gerencia usuários da sua agência
├── Configura integrações da agência
├── Vê métricas da sua agência
└── Gerencia clientes e demandas

MANAGER (Gerente)
├── Gerencia equipe
├── Gerencia clientes
├── Gerencia demandas
└── Relatórios

MEMBER (Membro da equipe)
├── Acessa demandas atribuídas
├── Chat com IA
├── Calendário
└── Perfil pessoal
```

---

## 2. ESTRUTURA DE TELAS

### 2.1 SUPER ADMIN (rota: /super-admin/*)

```
/super-admin
├── /dashboard          → Métricas da plataforma (MRR, usuários, churn)
├── /tenants            → Lista de agências/empresas
├── /tenants/:id        → Detalhes do tenant
├── /plans              → Gerenciar planos (Free, Starter, Pro, Enterprise)
├── /billing            → Faturamento e pagamentos
├── /integrations       → APIs globais (Gemini, OpenRouter, etc)
├── /users              → Todos os usuários da plataforma
└── /settings           → Configurações da plataforma
```

### 2.2 ADMIN DA AGÊNCIA (rota: /admin/*)

```
/admin
├── /dashboard          → Métricas da agência
├── /team               → Gerenciar equipe
├── /clients            → Gerenciar clientes
├── /integrations       → Integrações da agência (Late, Z-API)
├── /billing            → Plano atual, upgrade
└── /settings           → Configurações da agência
```

### 2.3 USUÁRIO COMUM (rota: /*)

```
/
├── /                   → Dashboard pessoal
├── /chat               → Chat com IA
├── /workflow           → Kanban de demandas
├── /calendar           → Calendário
├── /creator-studio     → Estúdio de criação
├── /clients            → Clientes (se tiver permissão)
├── /agents             → Agentes IA
└── /profile            → Perfil pessoal (nome, email, senha)
```

---

## 3. SCHEMA DO SUPABASE

### 3.1 Tabelas Principais

```sql
-- Planos disponíveis
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  features JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenants (Agências/Empresas)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  plan_id UUID REFERENCES plans(id),
  subscription_status VARCHAR(50) DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usuários (usando auth.users do Supabase)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrações por Tenant
CREATE TABLE tenant_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  credentials JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, provider)
);

-- Integrações Globais (Super Admin)
CREATE TABLE global_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(50) UNIQUE NOT NULL,
  credentials JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes do Tenant
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  cpf_cnpj VARCHAR(20),
  color VARCHAR(7) DEFAULT '#f97316',
  status VARCHAR(50) DEFAULT 'active',
  monthly_value DECIMAL(10,2) DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Demandas
CREATE TABLE demands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  title VARCHAR(255) NOT NULL,
  briefing TEXT,
  caption TEXT,
  hashtags TEXT,
  status VARCHAR(50) DEFAULT 'rascunho',
  content_type VARCHAR(50),
  channels TEXT[] DEFAULT '{}',
  media JSONB DEFAULT '[]',
  scheduled_date DATE,
  scheduled_time TIME,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agentes IA por Tenant
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(100),
  avatar VARCHAR(10),
  description TEXT,
  system_prompt TEXT,
  provider VARCHAR(50) DEFAULT 'gemini',
  model VARCHAR(100),
  temperature DECIMAL(2,1) DEFAULT 0.7,
  is_active BOOLEAN DEFAULT true,
  trained_knowledge TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversas
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id),
  title VARCHAR(255),
  project_id UUID,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mensagens
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uso/Métricas (para limites de plano)
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL,
  metric_value INTEGER DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Row Level Security (RLS)

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE demands ENABLE ROW LEVEL SECURITY;
-- ... etc

-- Política: Usuários só veem dados do seu tenant
CREATE POLICY "Users can view own tenant data" ON clients
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Super Admin vê tudo
CREATE POLICY "Super admin full access" ON tenants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
```

---

## 4. SISTEMA DE PLANOS

### 4.1 Planos Padrão

```json
{
  "free": {
    "name": "Free",
    "price_monthly": 0,
    "limits": {
      "users": 1,
      "clients": 3,
      "demands_per_month": 10,
      "ai_messages_per_month": 50,
      "storage_mb": 100,
      "agents": 1
    },
    "features": {
      "workflow": true,
      "calendar": true,
      "chat_ia": true,
      "creator_studio": false,
      "approval_links": false,
      "whatsapp": false,
      "analytics": false
    }
  },
  "starter": {
    "name": "Starter",
    "price_monthly": 97,
    "limits": {
      "users": 3,
      "clients": 10,
      "demands_per_month": 100,
      "ai_messages_per_month": 500,
      "storage_mb": 1000,
      "agents": 3
    },
    "features": {
      "workflow": true,
      "calendar": true,
      "chat_ia": true,
      "creator_studio": true,
      "approval_links": true,
      "whatsapp": false,
      "analytics": true
    }
  },
  "pro": {
    "name": "Pro",
    "price_monthly": 197,
    "limits": {
      "users": 10,
      "clients": 50,
      "demands_per_month": -1,
      "ai_messages_per_month": 2000,
      "storage_mb": 10000,
      "agents": 10
    },
    "features": {
      "workflow": true,
      "calendar": true,
      "chat_ia": true,
      "creator_studio": true,
      "approval_links": true,
      "whatsapp": true,
      "analytics": true
    }
  },
  "enterprise": {
    "name": "Enterprise",
    "price_monthly": 497,
    "limits": {
      "users": -1,
      "clients": -1,
      "demands_per_month": -1,
      "ai_messages_per_month": -1,
      "storage_mb": -1,
      "agents": -1
    },
    "features": {
      "all": true,
      "white_label": true,
      "api_access": true,
      "dedicated_support": true
    }
  }
}
```

---

## 5. DASHBOARD SUPER ADMIN

### Métricas Principais:
- **MRR** (Monthly Recurring Revenue)
- **Total de Tenants** (Agências)
- **Total de Usuários**
- **Churn Rate**
- **Novos cadastros (últimos 30 dias)**
- **Tenants por plano**
- **Uso de recursos (API calls, storage)**

### Gráficos:
- Crescimento de MRR (linha)
- Novos tenants por mês (barra)
- Distribuição por plano (pizza)
- Uso de API por tenant (barra horizontal)

---

## 6. FLUXO DE IMPLEMENTAÇÃO

### Fase 1: Supabase Setup
1. Criar projeto no Supabase
2. Executar migrations (schema)
3. Configurar RLS policies
4. Configurar Auth (email + social)

### Fase 2: Autenticação
1. Criar contexto de auth
2. Páginas de login/registro
3. Middleware de proteção de rotas
4. Sistema de roles

### Fase 3: Multi-tenancy
1. Criar tenant na criação de conta
2. Associar usuários ao tenant
3. Filtrar dados por tenant

### Fase 4: Painel Super Admin
1. Dashboard com métricas
2. CRUD de tenants
3. CRUD de planos
4. Configuração de integrações globais

### Fase 5: Painel Admin (Tenant)
1. Dashboard da agência
2. Gerenciar equipe
3. Integrações do tenant

### Fase 6: Sistema de Limites
1. Verificar limites antes de ações
2. Mostrar uso atual
3. Bloquear quando atingir limite
4. Sugerir upgrade

### Fase 7: Página de Perfil do Usuário
1. Editar nome, avatar
2. Alterar senha
3. Preferências

---

## 7. ARQUIVOS A CRIAR/MODIFICAR

### Novos Arquivos:
```
src/
├── lib/
│   └── supabase.ts              # Cliente Supabase
├── contexts/
│   ├── AuthContext.tsx          # Contexto de autenticação
│   └── TenantContext.tsx        # Contexto do tenant
├── hooks/
│   ├── useAuth.ts
│   ├── useTenant.ts
│   └── usePlan.ts
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── ForgotPasswordPage.tsx
│   ├── super-admin/
│   │   ├── SuperAdminDashboard.tsx
│   │   ├── TenantsPage.tsx
│   │   ├── PlansPage.tsx
│   │   ├── GlobalIntegrationsPage.tsx
│   │   └── PlatformSettingsPage.tsx
│   ├── admin/
│   │   ├── AdminDashboard.tsx
│   │   ├── TeamPage.tsx
│   │   ├── TenantIntegrationsPage.tsx
│   │   └── TenantSettingsPage.tsx
│   └── ProfilePage.tsx           # Perfil do usuário
├── components/
│   ├── auth/
│   │   ├── ProtectedRoute.tsx
│   │   └── RoleGuard.tsx
│   └── admin/
│       ├── StatsCard.tsx
│       └── UsageChart.tsx
└── services/
    └── supabaseService.ts
```

### Arquivos a Modificar:
- `App.tsx` - Adicionar rotas protegidas
- `SettingsPage.tsx` - Remover integrações (mover para admin)
- `store/index.ts` - Adaptar para Supabase

---

## 8. VARIÁVEIS DE AMBIENTE

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_APP_NAME="Base Agency"
VITE_APP_URL=https://agenciabase.com
```

---

## PRÓXIMOS PASSOS

1. Criar projeto no Supabase (você pode fazer isso)
2. Eu implemento o schema e RLS
3. Implemento autenticação
4. Crio os painéis Admin e Super Admin
5. Implemento sistema de planos
6. Reorganizo as configurações
7. Deploy final

**Aguardo sua confirmação para iniciar a implementação!**
