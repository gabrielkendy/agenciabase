# 🚀 GUIA DE CONFIGURAÇÃO - SUPABASE + BASE AGENCY

## 📋 PASSO 1: Criar Projeto no Supabase

1. Acesse: **https://supabase.com**
2. Faça login ou crie uma conta
3. Clique em **New Project**
4. Preencha:
   - **Name:** BASE Agency
   - **Database Password:** (guarde essa senha!)
   - **Region:** South America (São Paulo)
5. Clique em **Create new project**
6. Aguarde ~2 minutos para o projeto ser criado

---

## 📋 PASSO 2: Executar o Schema do Banco

1. No painel do Supabase, vá em **SQL Editor** (menu lateral)
2. Clique em **New Query**
3. Copie TODO o conteúdo do arquivo `supabase-schema.sql`
4. Cole no editor SQL
5. Clique em **Run** (ou Ctrl+Enter)
6. Aguarde a execução (deve mostrar "Success")

---

## 📋 PASSO 3: Configurar Autenticação

1. Vá em **Authentication** → **Providers**
2. **Email** já vem habilitado por padrão
3. Configure se quiser:
   - **Google:** Adicione Client ID e Secret do Google Cloud
   - **GitHub:** Adicione Client ID e Secret do GitHub

### Configurar Redirect URLs:
1. Vá em **Authentication** → **URL Configuration**
2. Em **Site URL**, coloque: `https://agenciabase.tech`
3. Em **Redirect URLs**, adicione:
   - `https://agenciabase.tech`
   - `https://agenciabase.tech/login`
   - `https://agenciabase.onrender.com`
   - `https://agenciabase.onrender.com/login`
   - `http://localhost:5173` (para desenvolvimento)

---

## 📋 PASSO 4: Pegar as Chaves de API

1. Vá em **Settings** → **API**
2. Copie:
   - **Project URL:** (ex: https://xxxxx.supabase.co)
   - **anon public key:** (começa com eyJ...)

---

## 📋 PASSO 5: Configurar Variáveis no Render

1. Acesse: **https://dashboard.render.com**
2. Clique no serviço **agenciabase**
3. Vá em **Environment** (menu lateral)
4. Adicione as variáveis:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

5. Clique em **Save Changes**
6. O Render vai fazer redeploy automático

---

## 📋 PASSO 6: Criar Primeiro Admin

### Opção A - Via Supabase Dashboard:
1. Vá em **Authentication** → **Users**
2. Clique em **Add User** → **Create New User**
3. Preencha:
   - Email: seu@email.com
   - Password: sua-senha-segura
4. Clique em **Create User**

### Opção B - Via SQL (recomendado):
1. Vá em **SQL Editor**
2. Execute:

```sql
-- Criar usuário admin (substitua os valores)
INSERT INTO team_members (
  name, 
  email, 
  role, 
  is_active,
  agency_id
) VALUES (
  'Seu Nome',
  'seu@email.com',
  'admin',
  true,
  (SELECT id FROM agencies LIMIT 1)
);
```

---

## 📋 PASSO 7: Testar

1. Acesse: **https://agenciabase.tech/login**
2. Faça login com o email/senha que você criou
3. Se funcionar, o Supabase está configurado! 🎉

---

## 🔒 SEGURANÇA IMPORTANTE

### Depois de configurar, remova o modo local:
- O aviso "Modo local" desaparece automaticamente quando o Supabase está configurado
- Senhas locais (localStorage) serão ignoradas

### Backup dos dados locais:
- Antes de migrar, exporte seus dados do localStorage
- Use o console do navegador: `localStorage.getItem('base-agency-store')`

---

## 📊 ESTRUTURA DO BANCO

### Tabelas principais:
- **agencies** - Multi-tenant (uma por agência)
- **team_members** - Equipe da agência
- **clients** - Clientes da agência
- **demands** - Demandas/conteúdos
- **demand_comments** - Comentários/feedback
- **ai_agents** - Agentes de IA configurados
- **chat_conversations** - Conversas do chat
- **chat_messages** - Mensagens
- **calendar_events** - Eventos do calendário
- **contracts** - Contratos
- **invoices** - Cobranças
- **notifications** - Notificações
- **activity_logs** - Auditoria

### Row Level Security (RLS):
- Cada usuário só vê dados da sua agência
- Proteção automática contra vazamento de dados

---

## 🆘 PROBLEMAS COMUNS

### "Invalid API key"
- Verifique se a ANON_KEY está correta
- Certifique-se que não tem espaços extras

### "Failed to fetch"
- Verifique se a URL do projeto está correta
- Certifique-se que o projeto Supabase está ativo

### "User not found"
- Crie o usuário no Supabase Authentication
- Vincule o auth.user com team_members

### RLS bloqueando dados
- Verifique se o usuário está vinculado a uma agency
- Execute: `SELECT * FROM team_members WHERE user_id = auth.uid()`

---

## 📞 SUPORTE

- Documentação Supabase: https://supabase.com/docs
- Discord Supabase: https://discord.supabase.com
