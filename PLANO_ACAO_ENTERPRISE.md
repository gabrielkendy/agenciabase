# 📋 PLANO DE AÇÃO - BASE AGENCY ENTERPRISE

## 🎯 VISÃO GERAL

| Item | Descrição |
|------|-----------|
| **Projeto** | BASE Agency - Arquitetura Enterprise |
| **Escala** | +10.000 usuários simultâneos |
| **Fases** | 9 fases principais |
| **Estimativa** | 4-6 horas de execução |

---

# ═══════════════════════════════════════════════════════════════
# FASE 1: BANCO DE DADOS (SUPABASE)
# ═══════════════════════════════════════════════════════════════

## ⏱️ Tempo estimado: 30 minutos

### Tasks:

| # | Task | Status | Verificação |
|---|------|--------|-------------|
| 1.1 | Criar ENUMs (user_role, subscription_plan, job_status, etc) | ⬜ | `SELECT * FROM pg_type WHERE typtype = 'e'` |
| 1.2 | Criar tabela `organizations` | ⬜ | Verificar no Supabase Dashboard |
| 1.3 | Criar tabela `users` com RLS | ⬜ | Verificar no Supabase Dashboard |
| 1.4 | Criar tabela `plans` + inserir 5 planos | ⬜ | `SELECT * FROM plans` |
| 1.5 | Criar tabela `subscriptions` | ⬜ | Verificar no Supabase Dashboard |
| 1.6 | Criar tabela `credit_balances` | ⬜ | Verificar no Supabase Dashboard |
| 1.7 | Criar tabela `credit_transactions` | ⬜ | Verificar no Supabase Dashboard |
| 1.8 | Criar tabela `api_keys` (criptografadas) | ⬜ | Verificar no Supabase Dashboard |
| 1.9 | Criar tabela `provider_api_keys` | ⬜ | Verificar no Supabase Dashboard |
| 1.10 | Criar tabela `ai_jobs` | ⬜ | Verificar no Supabase Dashboard |
| 1.11 | Criar tabela `generations` | ⬜ | Verificar no Supabase Dashboard |
| 1.12 | Criar tabela `usage_daily` | ⬜ | Verificar no Supabase Dashboard |
| 1.13 | Criar tabela `usage_by_user` | ⬜ | Verificar no Supabase Dashboard |
| 1.14 | Criar tabela `rate_limits` | ⬜ | Verificar no Supabase Dashboard |
| 1.15 | Criar tabela `audit_logs` | ⬜ | Verificar no Supabase Dashboard |
| 1.16 | Criar tabela `webhooks` | ⬜ | Verificar no Supabase Dashboard |
| 1.17 | Criar tabela `webhook_deliveries` | ⬜ | Verificar no Supabase Dashboard |
| 1.18 | Criar tabela `pricing` + inserir preços | ⬜ | `SELECT * FROM pricing` |
| 1.19 | Criar função `debit_credits()` | ⬜ | Testar com SELECT |
| 1.20 | Criar função `credit_credits()` | ⬜ | Testar com SELECT |
| 1.21 | Criar função `check_rate_limit()` | ⬜ | Testar com SELECT |
| 1.22 | Criar triggers de updated_at | ⬜ | Verificar triggers |
| 1.23 | Criar trigger de usage analytics | ⬜ | Verificar triggers |
| 1.24 | Criar VIEWs úteis | ⬜ | `SELECT * FROM v_organization_usage` |
| 1.25 | Habilitar RLS em todas tabelas | ⬜ | Verificar policies |
| 1.26 | Criar índices de performance | ⬜ | `\di` no SQL Editor |

### ✅ Critério de Conclusão Fase 1:
- [ ] Todas as 18+ tabelas criadas
- [ ] 3 funções PL/pgSQL funcionando
- [ ] Triggers ativos
- [ ] RLS habilitado
- [ ] Planos e preços inseridos

---

# ═══════════════════════════════════════════════════════════════
# FASE 2: ESTRUTURA DO BACKEND
# ═══════════════════════════════════════════════════════════════

## ⏱️ Tempo estimado: 20 minutos

### Tasks:

| # | Task | Status | Verificação |
|---|------|--------|-------------|
| 2.1 | Criar estrutura de pastas `/server/src/` | ⬜ | `ls -la server/src/` |
| 2.2 | Criar `/server/src/config/` | ⬜ | Pasta existe |
| 2.3 | Criar `/server/src/api/routes/` | ⬜ | Pasta existe |
| 2.4 | Criar `/server/src/api/controllers/` | ⬜ | Pasta existe |
| 2.5 | Criar `/server/src/api/validators/` | ⬜ | Pasta existe |
| 2.6 | Criar `/server/src/services/` | ⬜ | Pasta existe |
| 2.7 | Criar `/server/src/middleware/` | ⬜ | Pasta existe |
| 2.8 | Criar `/server/src/models/` | ⬜ | Pasta existe |
| 2.9 | Criar `/server/src/utils/` | ⬜ | Pasta existe |
| 2.10 | Criar `/server/src/types/` | ⬜ | Pasta existe |
| 2.11 | Criar `/server/src/workers/` | ⬜ | Pasta existe |
| 2.12 | Atualizar `package.json` com dependências | ⬜ | `npm install` sem erros |
| 2.13 | Criar `tsconfig.json` | ⬜ | Arquivo existe |
| 2.14 | Criar `.env.example` | ⬜ | Arquivo existe |
| 2.15 | Instalar dependências | ⬜ | `npm install` OK |

### ✅ Critério de Conclusão Fase 2:
- [ ] 11 pastas criadas
- [ ] package.json com 25+ dependências
- [ ] npm install sem erros

---

# ═══════════════════════════════════════════════════════════════
# FASE 3: CONFIGURAÇÃO E UTILS
# ═══════════════════════════════════════════════════════════════

## ⏱️ Tempo estimado: 30 minutos

### Tasks:

| # | Task | Status | Verificação |
|---|------|--------|-------------|
| 3.1 | Criar `config/index.ts` | ⬜ | Import funciona |
| 3.2 | Criar `config/database.ts` (Supabase client) | ⬜ | Conexão OK |
| 3.3 | Criar `config/redis.ts` | ⬜ | Conexão OK |
| 3.4 | Criar `config/queue.ts` (BullMQ) | ⬜ | Queue criada |
| 3.5 | Criar `config/providers.ts` | ⬜ | Config carrega |
| 3.6 | Criar `utils/encryption.ts` | ⬜ | encrypt/decrypt funciona |
| 3.7 | Criar `utils/logger.ts` (Winston/Pino) | ⬜ | Logger funciona |
| 3.8 | Criar `utils/tokens.ts` (contagem) | ⬜ | Função existe |
| 3.9 | Criar `utils/cost.ts` (cálculo) | ⬜ | Função existe |
| 3.10 | Criar `utils/helpers.ts` | ⬜ | Funções existem |
| 3.11 | Criar `utils/constants.ts` | ⬜ | Constantes definidas |
| 3.12 | Criar `types/index.ts` | ⬜ | Types exportados |
| 3.13 | Criar `types/ai.types.ts` | ⬜ | Interfaces definidas |
| 3.14 | Criar `types/billing.types.ts` | ⬜ | Interfaces definidas |

### ✅ Critério de Conclusão Fase 3:
- [ ] 5 arquivos de config
- [ ] 6 arquivos de utils
- [ ] 3 arquivos de types
- [ ] Criptografia funcionando

---

# ═══════════════════════════════════════════════════════════════
# FASE 4: MIDDLEWARES
# ═══════════════════════════════════════════════════════════════

## ⏱️ Tempo estimado: 40 minutos

### Tasks:

| # | Task | Status | Verificação |
|---|------|--------|-------------|
| 4.1 | Criar `middleware/cors.middleware.ts` | ⬜ | CORS funcionando |
| 4.2 | Criar `middleware/auth.middleware.ts` | ⬜ | JWT validando |
| 4.3 | Criar `middleware/apiKey.middleware.ts` | ⬜ | API Key validando |
| 4.4 | Criar `middleware/organization.middleware.ts` | ⬜ | Org context OK |
| 4.5 | Criar `middleware/rateLimit.middleware.ts` | ⬜ | Rate limit por plano |
| 4.6 | Criar `middleware/billing.middleware.ts` | ⬜ | Verifica créditos |
| 4.7 | Criar `middleware/audit.middleware.ts` | ⬜ | Log de auditoria |
| 4.8 | Criar `middleware/error.middleware.ts` | ⬜ | Erros tratados |
| 4.9 | Criar `middleware/validation.middleware.ts` | ⬜ | Zod validando |

### ✅ Critério de Conclusão Fase 4:
- [ ] 9 middlewares criados
- [ ] Auth + API Key funcionando
- [ ] Rate limit por plano
- [ ] Billing middleware verificando créditos

---

# ═══════════════════════════════════════════════════════════════
# FASE 5: SERVICES
# ═══════════════════════════════════════════════════════════════

## ⏱️ Tempo estimado: 60 minutos

### Tasks:

| # | Task | Status | Verificação |
|---|------|--------|-------------|
| **AI Services** |
| 5.1 | Criar `services/ai/base.provider.ts` | ⬜ | Classe abstrata |
| 5.2 | Criar `services/ai/freepik.provider.ts` | ⬜ | Herda de base |
| 5.3 | Criar `services/ai/replicate.provider.ts` | ⬜ | Herda de base |
| 5.4 | Criar `services/ai/openai.provider.ts` | ⬜ | Herda de base |
| 5.5 | Criar `services/ai/elevenlabs.provider.ts` | ⬜ | Herda de base |
| 5.6 | Criar `services/ai/index.ts` (Factory) | ⬜ | Factory pattern |
| **Billing Services** |
| 5.7 | Criar `services/billing/credits.service.ts` | ⬜ | Debitar/creditar |
| 5.8 | Criar `services/billing/usage.service.ts` | ⬜ | Tracking uso |
| 5.9 | Criar `services/billing/pricing.service.ts` | ⬜ | Cálculo preços |
| 5.10 | Criar `services/billing/invoice.service.ts` | ⬜ | Faturas |
| **Analytics Services** |
| 5.11 | Criar `services/analytics/metrics.service.ts` | ⬜ | Métricas gerais |
| 5.12 | Criar `services/analytics/usage.analytics.ts` | ⬜ | Analytics uso |
| 5.13 | Criar `services/analytics/cost.analytics.ts` | ⬜ | Analytics custo |
| **Outros Services** |
| 5.14 | Criar `services/cache/redis.service.ts` | ⬜ | Cache operations |
| 5.15 | Criar `services/queue/queue.service.ts` | ⬜ | Queue operations |
| 5.16 | Criar `services/storage/supabase.storage.ts` | ⬜ | Upload arquivos |
| 5.17 | Criar `services/notification/webhook.service.ts` | ⬜ | Disparar webhooks |
| 5.18 | Criar `services/notification/realtime.service.ts` | ⬜ | Supabase Realtime |

### ✅ Critério de Conclusão Fase 5:
- [ ] 6 AI providers
- [ ] 4 billing services
- [ ] 3 analytics services
- [ ] 5 outros services
- [ ] Factory pattern para AI

---

# ═══════════════════════════════════════════════════════════════
# FASE 6: CONTROLLERS E ROUTES
# ═══════════════════════════════════════════════════════════════

## ⏱️ Tempo estimado: 60 minutos

### Tasks:

| # | Task | Status | Verificação |
|---|------|--------|-------------|
| **Controllers** |
| 6.1 | Criar `controllers/auth.controller.ts` | ⬜ | Login/Register |
| 6.2 | Criar `controllers/users.controller.ts` | ⬜ | CRUD users |
| 6.3 | Criar `controllers/organizations.controller.ts` | ⬜ | CRUD orgs |
| 6.4 | Criar `controllers/ai.controller.ts` | ⬜ | Gerar imagem/vídeo |
| 6.5 | Criar `controllers/studio.controller.ts` | ⬜ | Creator Studio |
| 6.6 | Criar `controllers/billing.controller.ts` | ⬜ | Créditos/Faturas |
| 6.7 | Criar `controllers/analytics.controller.ts` | ⬜ | Métricas/Reports |
| 6.8 | Criar `controllers/webhook.controller.ts` | ⬜ | CRUD webhooks |
| 6.9 | Criar `controllers/admin.controller.ts` | ⬜ | Admin only |
| **Routes** |
| 6.10 | Criar `routes/index.ts` | ⬜ | Router principal |
| 6.11 | Criar `routes/auth.routes.ts` | ⬜ | /api/auth/* |
| 6.12 | Criar `routes/users.routes.ts` | ⬜ | /api/users/* |
| 6.13 | Criar `routes/organizations.routes.ts` | ⬜ | /api/organizations/* |
| 6.14 | Criar `routes/ai.routes.ts` | ⬜ | /api/ai/* |
| 6.15 | Criar `routes/studio.routes.ts` | ⬜ | /api/studio/* |
| 6.16 | Criar `routes/billing.routes.ts` | ⬜ | /api/billing/* |
| 6.17 | Criar `routes/analytics.routes.ts` | ⬜ | /api/analytics/* |
| 6.18 | Criar `routes/webhooks.routes.ts` | ⬜ | /api/webhooks/* |
| 6.19 | Criar `routes/admin.routes.ts` | ⬜ | /api/admin/* |
| 6.20 | Criar `routes/health.routes.ts` | ⬜ | /api/health |
| **Validators** |
| 6.21 | Criar `validators/auth.validator.ts` | ⬜ | Zod schemas |
| 6.22 | Criar `validators/ai.validator.ts` | ⬜ | Zod schemas |
| 6.23 | Criar `validators/billing.validator.ts` | ⬜ | Zod schemas |

### ✅ Critério de Conclusão Fase 6:
- [ ] 9 controllers
- [ ] 10 route files
- [ ] 3 validators
- [ ] Todas rotas registradas

---

# ═══════════════════════════════════════════════════════════════
# FASE 7: WORKERS (PROCESSAMENTO ASSÍNCRONO)
# ═══════════════════════════════════════════════════════════════

## ⏱️ Tempo estimado: 30 minutos

### Tasks:

| # | Task | Status | Verificação |
|---|------|--------|-------------|
| 7.1 | Criar `workers/index.ts` (entry point) | ⬜ | Workers iniciam |
| 7.2 | Criar `workers/image.worker.ts` | ⬜ | Processa imagens |
| 7.3 | Criar `workers/video.worker.ts` | ⬜ | Processa vídeos |
| 7.4 | Criar `workers/audio.worker.ts` | ⬜ | Processa áudio |
| 7.5 | Criar `workers/webhook.worker.ts` | ⬜ | Dispara webhooks |
| 7.6 | Configurar concurrency por tipo | ⬜ | Image: 5, Video: 2 |
| 7.7 | Implementar retry com backoff | ⬜ | 3 tentativas |
| 7.8 | Implementar dead letter queue | ⬜ | Jobs falhos salvos |

### ✅ Critério de Conclusão Fase 7:
- [ ] 4 workers criados
- [ ] Concurrency configurado
- [ ] Retry funcionando
- [ ] Logs de progresso

---

# ═══════════════════════════════════════════════════════════════
# FASE 8: SERVER PRINCIPAL E TESTES
# ═══════════════════════════════════════════════════════════════

## ⏱️ Tempo estimado: 30 minutos

### Tasks:

| # | Task | Status | Verificação |
|---|------|--------|-------------|
| 8.1 | Criar `server.ts` (entry point) | ⬜ | Server inicia |
| 8.2 | Configurar middleware chain | ⬜ | Ordem correta |
| 8.3 | Configurar graceful shutdown | ⬜ | SIGTERM handled |
| 8.4 | Rodar `npm run build` | ⬜ | Build sem erros |
| 8.5 | Rodar `npm run dev` | ⬜ | Server rodando |
| 8.6 | Testar `/api/health` | ⬜ | 200 OK |
| 8.7 | Testar conexão Supabase | ⬜ | Query funciona |
| 8.8 | Testar conexão Redis | ⬜ | PING PONG |
| 8.9 | Testar rate limiting | ⬜ | 429 após limite |
| 8.10 | Testar geração de imagem | ⬜ | Imagem retorna |
| 8.11 | Testar débito de créditos | ⬜ | Saldo atualiza |
| 8.12 | Testar analytics | ⬜ | Dados salvos |

### ✅ Critério de Conclusão Fase 8:
- [ ] Build sem erros
- [ ] Server rodando local
- [ ] Todos endpoints respondendo
- [ ] Créditos debitando
- [ ] Analytics salvando

---

# ═══════════════════════════════════════════════════════════════
# FASE 9: FRONTEND E DEPLOY
# ═══════════════════════════════════════════════════════════════

## ⏱️ Tempo estimado: 40 minutos

### Tasks:

| # | Task | Status | Verificação |
|---|------|--------|-------------|
| **Frontend** |
| 9.1 | Criar `services/api/backendApi.ts` | ⬜ | Todas funções |
| 9.2 | Criar `services/api/aiApi.ts` | ⬜ | AI específico |
| 9.3 | Criar `services/api/billingApi.ts` | ⬜ | Billing específico |
| 9.4 | Atualizar `CreatorStudioPage.tsx` | ⬜ | Usar novo backend |
| 9.5 | Criar componente `CreditBalance` | ⬜ | Mostra saldo |
| 9.6 | Criar componente `UsageStats` | ⬜ | Mostra uso |
| 9.7 | Atualizar `.env` com VITE_API_URL | ⬜ | URL configurada |
| 9.8 | Rodar `npm run build` frontend | ⬜ | Build OK |
| **Deploy** |
| 9.9 | Criar conta Upstash (Redis) | ⬜ | Redis URL obtida |
| 9.10 | Configurar variáveis Render (API) | ⬜ | Env vars setadas |
| 9.11 | Configurar variáveis Render (Workers) | ⬜ | Env vars setadas |
| 9.12 | Deploy API no Render | ⬜ | API online |
| 9.13 | Deploy Workers no Render | ⬜ | Workers online |
| 9.14 | Testar em produção | ⬜ | Tudo funcionando |
| 9.15 | Commit e push final | ⬜ | GitHub atualizado |

### ✅ Critério de Conclusão Fase 9:
- [ ] Frontend usando novo backend
- [ ] Redis Upstash configurado
- [ ] API deployada e respondendo
- [ ] Workers processando jobs
- [ ] Produção funcionando

---

# ═══════════════════════════════════════════════════════════════
# 📊 RESUMO GERAL
# ═══════════════════════════════════════════════════════════════

## Contagem de Tasks

| Fase | Tasks | Tempo Est. |
|------|-------|------------|
| 1. Banco de Dados | 26 | 30 min |
| 2. Estrutura Backend | 15 | 20 min |
| 3. Config e Utils | 14 | 30 min |
| 4. Middlewares | 9 | 40 min |
| 5. Services | 18 | 60 min |
| 6. Controllers/Routes | 23 | 60 min |
| 7. Workers | 8 | 30 min |
| 8. Server e Testes | 12 | 30 min |
| 9. Frontend e Deploy | 15 | 40 min |
| **TOTAL** | **140 tasks** | **~6 horas** |

---

## 📁 Arquivos a Serem Criados

### Backend (server/)
```
Total: ~50 arquivos TypeScript

config/          → 5 arquivos
middleware/      → 9 arquivos
services/ai/     → 6 arquivos
services/billing/→ 4 arquivos
services/analytics/→ 3 arquivos
services/outros/ → 5 arquivos
controllers/     → 9 arquivos
routes/          → 10 arquivos
validators/      → 3 arquivos
workers/         → 5 arquivos
utils/           → 6 arquivos
types/           → 3 arquivos
```

### Frontend (src/)
```
Total: ~5 arquivos novos/modificados

services/api/    → 3 arquivos
components/      → 2 componentes
pages/           → 1 modificação
```

### Banco de Dados
```
Total: 18+ tabelas

Organizações, Users, Plans, Subscriptions
Credit Balances, Credit Transactions
API Keys, Provider API Keys
AI Jobs, Generations
Usage Daily, Usage by User
Rate Limits, Audit Logs
Webhooks, Webhook Deliveries
Pricing
```

---

## 🎯 COMO ACOMPANHAR

### 1. Pergunte ao Claude Code:
```
"Qual fase você está executando agora?"
"Quais tasks da Fase X você já completou?"
"Mostre o checklist da Fase X atualizado"
```

### 2. Verifique no Supabase:
- Table Editor → Contar tabelas
- SQL Editor → Executar queries de verificação

### 3. Verifique no Terminal:
```bash
# Estrutura de pastas
ls -la server/src/

# Dependências instaladas
cd server && npm list

# Build funciona
npm run build

# Server roda
npm run dev
```

### 4. Verifique Endpoints:
```bash
# Health check
curl http://localhost:3001/api/health

# Listar modelos
curl http://localhost:3001/api/ai/models
```

---

## ⚠️ SE O CLAUDE CODE PARAR

Cole isso:
```
Continue da Fase [X] Task [Y]. 
Leia o arquivo ENTERPRISE_BACKEND_COMPLETO.md e continue de onde parou.
NÃO PARE. NÃO PEÇA CONFIRMAÇÃO.
```

---

## 🏁 CRITÉRIOS DE ACEITE FINAL

- [ ] 18+ tabelas no Supabase
- [ ] ~50 arquivos TypeScript no backend
- [ ] Build sem erros
- [ ] API respondendo em produção
- [ ] Workers processando jobs
- [ ] Créditos sendo debitados
- [ ] Analytics sendo salvos
- [ ] Rate limiting funcionando
- [ ] Chaves API criptografadas
- [ ] Audit log registrando ações
