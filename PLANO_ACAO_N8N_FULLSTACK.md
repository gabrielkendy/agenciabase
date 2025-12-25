# 🚀 PLANO DE AÇÃO - BASE AGENCY v3 (n8n + OpenAI + Full Stack)

## 📅 Data: 25/12/2024
## 🎯 Objetivo: Sistema profissional com automações completas via n8n

---

## 🔐 CREDENCIAIS

As chaves de API estão configuradas no arquivo `.env` (não commitado) e no localStorage do navegador.

Configure suas chaves na página de **Integrações** (/integrations).

---

## 📋 TASKS DETALHADAS

### FASE 1: WORKFLOWS n8n (Prioridade: CRÍTICA)

| ID | Task | Descrição | Status |
|----|------|-----------|--------|
| 1.1 | Workflow: Notificação Email | Trigger por webhook → Email para cliente/equipe | ✅ |
| 1.2 | Workflow: Notificação WhatsApp | Trigger por webhook → Evolution API → WhatsApp | ✅ |
| 1.3 | Workflow: Aprovação Externa | Cliente clica link → Webhook → Atualiza status | ✅ |
| 1.4 | Workflow: Lembrete de Atraso | Cron diário → Verifica demandas atrasadas | ⏳ |
| 1.5 | Workflow: Publicação Agendada | Cron → Verifica agendamentos → Late API | ⏳ |

### FASE 2: SERVIÇOS DE API (Prioridade: ALTA)

| ID | Task | Descrição | Status |
|----|------|-----------|--------|
| 2.1 | OpenRouter Service | Multi-modelo AI (GPT-4, Claude, Gemini, Llama) | ✅ |
| 2.2 | OpenAI Assistants v2 | Assistentes com memória persistente | ✅ |
| 2.3 | Evolution API | WhatsApp via Evolution API | ✅ |
| 2.4 | FAL.AI Service | Geração de imagens e vídeos | ✅ |
| 2.5 | ElevenLabs Service | Text to Speech | ✅ |
| 2.6 | Freepik Service | Stock images + Pikaso AI | ✅ |
| 2.7 | Late API Service | Publicação em redes sociais | ✅ |
| 2.8 | n8n Service | Integração com webhooks | ✅ |

### FASE 3: INTEGRAÇÕES FRONTEND (Prioridade: ALTA)

| ID | Task | Descrição | Status |
|----|------|-----------|--------|
| 3.1 | Página de Integrações | UI para configurar todas as APIs | ✅ |
| 3.2 | Auto-inicialização | APIs carregam automaticamente | ✅ |
| 3.3 | AI Unificado | Serviço que usa OpenRouter | ✅ |
| 3.4 | Workflow Automation | Dispara webhooks automaticamente | ✅ |

### FASE 4: DEPLOY (Prioridade: CRÍTICA)

| ID | Task | Descrição | Status |
|----|------|-----------|--------|
| 4.1 | Commit e Push | Enviar código para GitHub | ✅ |
| 4.2 | Deploy Render | Auto-deploy via GitHub | ⏳ |
| 4.3 | Testes em produção | Verificar funcionamento | ⏳ |

---

## 🔄 FLUXOS DE AUTOMAÇÃO

### Fluxo 1: Demanda Criada → Notificação
```
[Frontend] Cria demanda
    ↓
[Webhook n8n] POST /webhook/demanda-criada
    ↓
[n8n] Busca dados do cliente
    ↓
[n8n] Envia WhatsApp + Email para equipe
```

### Fluxo 2: Aprovação do Cliente
```
[Cliente] Clica no link de aprovação
    ↓
[Frontend] Página /aprovar/:token
    ↓
[Frontend] Botão "Aprovar"
    ↓
[Webhook n8n] POST /webhook/aprovacao
    ↓
[n8n] Atualiza status
    ↓
[n8n] Notifica equipe
```

---

## 🏗️ ARQUITETURA FINAL

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                            │
│  [Dashboard] [Kanban] [Chat] [Clientes] [Integrações]          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVIÇOS DE API                            │
│  [OpenRouter] [FAL.AI] [ElevenLabs] [Freepik] [Late]           │
│  [Evolution API] [n8n Webhooks] [OpenAI Assistants]            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      n8n Cloud                                  │
│  [Webhooks] [Cron Jobs] [Integrações]                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 COMO CONFIGURAR

1. Acesse `/integrations` no app
2. Configure as API keys de cada serviço
3. Clique em "Salvar Todas as Configurações"
4. As APIs serão inicializadas automaticamente

---

**URL de Produção:** https://agenciabase.onrender.com
