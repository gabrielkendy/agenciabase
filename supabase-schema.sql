-- ============================================
-- BASE AGENCY - SUPABASE DATABASE SCHEMA
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- =====================
-- 1. TABELA DE AGÊNCIAS (multi-tenant)
-- =====================
CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#f97316',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 2. TABELA DE USUÁRIOS/EQUIPE
-- =====================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'manager', 'editor', 'viewer')),
  permissions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, email)
);

-- =====================
-- 3. TABELA DE CLIENTES
-- =====================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  cpf_cnpj TEXT,
  company TEXT,
  address JSONB DEFAULT '{}',
  logo_url TEXT,
  contract_value DECIMAL(10,2) DEFAULT 0,
  contract_start DATE,
  contract_end DATE,
  billing_day INTEGER DEFAULT 10,
  payment_method TEXT DEFAULT 'pix',
  asaas_customer_id TEXT,
  social_media JSONB DEFAULT '{}',
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 4. TABELA DE DEMANDAS/CONTEÚDOS
-- =====================
CREATE TABLE IF NOT EXISTS demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'post' CHECK (type IN ('post', 'story', 'reels', 'video', 'carrossel', 'arte', 'copy', 'outro')),
  platform TEXT[] DEFAULT '{"instagram"}',
  status TEXT DEFAULT 'briefing' CHECK (status IN ('briefing', 'producao', 'revisao', 'aprovacao', 'aprovado', 'agendado', 'publicado', 'cancelado')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
  assigned_to UUID REFERENCES team_members(id),
  due_date DATE,
  publish_date TIMESTAMPTZ,
  
  -- Conteúdo
  content_text TEXT,
  media_urls TEXT[] DEFAULT '{}',
  hashtags TEXT[] DEFAULT '{}',
  
  -- Aprovação
  approval_token TEXT UNIQUE,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  rejection_reason TEXT,
  
  -- Publicação
  published_at TIMESTAMPTZ,
  published_urls JSONB DEFAULT '{}',
  late_post_id TEXT,
  
  -- Histórico
  history JSONB DEFAULT '[]',
  
  created_by UUID REFERENCES team_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 5. TABELA DE COMENTÁRIOS/FEEDBACK
-- =====================
CREATE TABLE IF NOT EXISTS demand_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID REFERENCES demands(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('team', 'client', 'system')),
  author_name TEXT NOT NULL,
  author_email TEXT,
  content TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 6. TABELA DE AGENTES IA
-- =====================
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  avatar TEXT,
  color TEXT DEFAULT '#f97316',
  model TEXT DEFAULT 'gemini-2.0-flash',
  provider TEXT DEFAULT 'google' CHECK (provider IN ('google', 'openrouter', 'openai')),
  system_prompt TEXT,
  temperature DECIMAL(2,1) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2048,
  tools TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 7. TABELA DE CONVERSAS DO CHAT
-- =====================
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  user_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  title TEXT,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 8. TABELA DE MENSAGENS
-- =====================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 9. TABELA DE EVENTOS/CALENDÁRIO
-- =====================
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  demand_id UUID REFERENCES demands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'publicacao' CHECK (type IN ('publicacao', 'reuniao', 'entrega', 'lembrete', 'outro')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 10. TABELA DE CONTRATOS
-- =====================
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  signed_at TIMESTAMPTZ,
  signed_by TEXT,
  signature_ip TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 11. TABELA DE COBRANÇAS
-- =====================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  asaas_id TEXT,
  description TEXT,
  value DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_date DATE,
  invoice_url TEXT,
  pix_code TEXT,
  boleto_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 12. TABELA DE NOTIFICAÇÕES
-- =====================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 13. TABELA DE LOGS/AUDITORIA
-- =====================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES team_members(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 14. TABELA DE TEMPLATES DE NOTIFICAÇÃO
-- =====================
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'push')),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ÍNDICES PARA PERFORMANCE
-- =====================
CREATE INDEX IF NOT EXISTS idx_team_members_agency ON team_members(agency_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_clients_agency ON clients(agency_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_demands_agency ON demands(agency_id);
CREATE INDEX IF NOT EXISTS idx_demands_client ON demands(client_id);
CREATE INDEX IF NOT EXISTS idx_demands_status ON demands(status);
CREATE INDEX IF NOT EXISTS idx_demands_assigned ON demands(assigned_to);
CREATE INDEX IF NOT EXISTS idx_demands_approval_token ON demands(approval_token);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_agency ON calendar_events(agency_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_invoices_agency ON invoices(agency_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_agency ON activity_logs(agency_id);

-- =====================
-- ROW LEVEL SECURITY (RLS)
-- =====================

-- Habilitar RLS em todas as tabelas
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (usuário só vê dados da sua agência)
CREATE POLICY "Users can view own agency" ON agencies
  FOR ALL USING (
    id IN (SELECT agency_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view team members of own agency" ON team_members
  FOR ALL USING (
    agency_id IN (SELECT agency_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view clients of own agency" ON clients
  FOR ALL USING (
    agency_id IN (SELECT agency_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view demands of own agency" ON demands
  FOR ALL USING (
    agency_id IN (SELECT agency_id FROM team_members WHERE user_id = auth.uid())
  );

-- =====================
-- FUNÇÕES ÚTEIS
-- =====================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_demands_updated_at BEFORE UPDATE ON demands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON ai_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON chat_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Função para gerar token de aprovação
CREATE OR REPLACE FUNCTION generate_approval_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_token IS NULL THEN
    NEW.approval_token = encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_demand_approval_token BEFORE INSERT ON demands
  FOR EACH ROW EXECUTE FUNCTION generate_approval_token();

-- =====================
-- DADOS INICIAIS (SEED)
-- =====================

-- Inserir agência padrão (você pode modificar depois)
-- INSERT INTO agencies (name, slug) VALUES ('Minha Agência', 'minha-agencia');
