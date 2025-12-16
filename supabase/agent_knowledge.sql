-- =====================================================
-- BASE AGENCY - Tabela de Conhecimento dos Agentes
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- Criar tabela de conhecimento dos agentes
CREATE TABLE IF NOT EXISTS agent_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'url', 'text', 'video')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  file_name TEXT,
  status TEXT DEFAULT 'ready' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_agent_id ON agent_knowledge(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_status ON agent_knowledge(status);

-- Habilitar RLS (Row Level Security)
ALTER TABLE agent_knowledge ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas operações
CREATE POLICY "Allow all operations on agent_knowledge" ON agent_knowledge
  FOR ALL USING (true) WITH CHECK (true);
