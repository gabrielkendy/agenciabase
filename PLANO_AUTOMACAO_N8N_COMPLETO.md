# 🚀 PLANO DE AÇÃO COMPLETO - AUTOMAÇÕES N8N BASE AGENCY

## 📋 VISÃO GERAL

Este documento contém o plano completo para configurar TODAS as automações do BASE Agency usando n8n.
O Claude Chrome Extension será responsável por executar cada fase.

---

## 🔧 CONFIGURAÇÕES NECESSÁRIAS

### URLs e Credenciais Base

```yaml
N8N_INSTANCE: https://agenciabase.app.n8n.cloud
N8N_WEBHOOK_BASE: https://agenciabase.app.n8n.cloud/webhook

SAAS_URL: https://agenciabase.tech
SAAS_API: https://agenciabase.tech/api

# APIs Externas
GEMINI_API_KEY: AIzaSyDQuaiWaBwgfFbvZ0LkntIl3__YuaM3JDU
LATE_API_KEY: [configurar]
EVOLUTION_API_URL: [configurar]
EVOLUTION_API_KEY: [configurar]
EVOLUTION_INSTANCE: [configurar]
ASAAS_API_KEY: [configurar]
```

---

## 📦 FASE 1: CONFIGURAÇÃO INICIAL N8N

### Task 1.1: Criar Credenciais no n8n

**Ação Claude Chrome:**
1. Acessar: https://agenciabase.app.n8n.cloud
2. Ir em: Settings → Credentials
3. Criar as seguintes credenciais:

| Nome Credencial | Tipo | Campos |
|-----------------|------|--------|
| `Gemini API` | Header Auth | Authorization: Bearer {GEMINI_API_KEY} |
| `Late API` | Header Auth | X-API-Key: {LATE_API_KEY} |
| `Evolution API` | Header Auth | apikey: {EVOLUTION_API_KEY} |
| `Asaas API` | Header Auth | access_token: {ASAAS_API_KEY} |
| `SMTP Gmail` | SMTP | host: smtp.gmail.com, port: 587, user: [email], pass: [app_password] |

### Task 1.2: Configurar Variáveis Globais

**Ação Claude Chrome:**
1. Ir em: Settings → Variables
2. Criar variáveis:

```
SAAS_URL = https://agenciabase.tech
WEBHOOK_SECRET = [gerar_uuid]
AGENCY_NAME = BASE Agency
AGENCY_EMAIL = contato@agenciabase.tech
```

---

## 📦 FASE 2: WORKFLOWS DE NOTIFICAÇÃO

### Task 2.1: Workflow - Notificação por Email

**Arquivo:** `n8n-workflows/01-notificacao-email-status.json`

**Triggers que ativam:**
- Demanda criada
- Status alterado
- Aprovação pendente
- Demanda publicada

**Configuração Claude Chrome:**
1. Importar workflow no n8n
2. Configurar credencial SMTP
3. Editar templates de email
4. Ativar workflow

### Task 2.2: Workflow - WhatsApp Evolution API

**Arquivo:** `n8n-workflows/02-notificacao-whatsapp-evolution.json`

**Triggers que ativam:**
- Aprovação do cliente pendente
- Cliente aprovou
- Cliente pediu ajustes
- Pagamento confirmado

**Configuração Claude Chrome:**
1. Importar workflow
2. Configurar Evolution API credentials
3. Testar envio de mensagem
4. Ativar workflow

---

## 📦 FASE 3: WORKFLOWS DE APROVAÇÃO

### Task 3.1: Webhook de Aprovação do Cliente

**Arquivo:** `n8n-workflows/03-webhook-aprovacao-cliente.json`

**Endpoint:** `POST /webhook/aprovacao`

**Payload esperado:**
```json
{
  "action": "approve" | "request_adjustment",
  "demand_id": "uuid",
  "client_name": "string",
  "feedback": "string (opcional)"
}
```

**Configuração Claude Chrome:**
1. Importar workflow
2. Copiar URL do webhook
3. Atualizar no SaaS: `src/pages/ApprovalPage.tsx`
4. Testar fluxo completo

### Task 3.2: Criar Workflow - Aprovação Interna

**NOVO WORKFLOW - Criar:**

```json
{
  "name": "06-aprovacao-interna",
  "nodes": [
    {
      "type": "n8n-nodes-base.webhook",
      "name": "Webhook Aprovação Interna",
      "webhookPath": "aprovacao-interna"
    },
    {
      "type": "n8n-nodes-base.switch",
      "name": "Verificar Ação",
      "conditions": ["approve", "reject", "request_changes"]
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "Atualizar Status SaaS"
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "Notificar Equipe"
    }
  ]
}
```

---

## 📦 FASE 4: WORKFLOWS DE PUBLICAÇÃO

### Task 4.1: Agendamento e Publicação

**Arquivo:** `n8n-workflows/05-agendamento-publicacao.json`

**Funcionalidades:**
- Verificar posts agendados a cada 5 minutos
- Publicar via Late API
- Atualizar status no SaaS
- Notificar equipe

**Configuração Claude Chrome:**
1. Importar workflow
2. Configurar Late API credentials
3. Ajustar cron schedule
4. Testar publicação

### Task 4.2: Criar Workflow - Publicação Multi-Plataforma

**NOVO WORKFLOW - Criar:**

```json
{
  "name": "07-publicacao-multi-plataforma",
  "triggers": ["webhook"],
  "nodes": [
    "Receber Demanda",
    "Preparar Conteúdo por Plataforma",
    "Switch por Canal (Instagram/TikTok/YouTube/etc)",
    "Publicar em cada plataforma",
    "Consolidar resultados",
    "Atualizar SaaS",
    "Notificar sucesso/erro"
  ]
}
```

---

## 📦 FASE 5: WORKFLOWS FINANCEIROS

### Task 5.1: Criar Workflow - Geração de Cobrança Asaas

**NOVO WORKFLOW - Criar:**

```json
{
  "name": "08-cobranca-asaas",
  "description": "Gera cobranças automáticas para clientes",
  "trigger": "Cron - Dia 1 de cada mês",
  "nodes": [
    {
      "type": "cron",
      "schedule": "0 9 1 * *"
    },
    {
      "type": "httpRequest",
      "name": "Buscar Clientes Ativos",
      "url": "{{$vars.SAAS_URL}}/api/clients?active=true"
    },
    {
      "type": "splitInBatches",
      "name": "Processar cada cliente"
    },
    {
      "type": "httpRequest",
      "name": "Criar Cobrança Asaas",
      "url": "https://api.asaas.com/v3/payments",
      "method": "POST",
      "body": {
        "customer": "{{$json.asaas_customer_id}}",
        "value": "{{$json.monthly_value}}",
        "dueDate": "{{$today.plus(10, 'days').format('yyyy-MM-dd')}}",
        "description": "Mensalidade {{$json.name}}"
      }
    },
    {
      "type": "httpRequest",
      "name": "Notificar Cliente WhatsApp"
    }
  ]
}
```

### Task 5.2: Criar Workflow - Webhook Pagamento Asaas

**NOVO WORKFLOW - Criar:**

```json
{
  "name": "09-webhook-pagamento-asaas",
  "description": "Recebe confirmação de pagamento",
  "trigger": "Webhook POST /webhook/asaas",
  "nodes": [
    {
      "type": "webhook",
      "path": "asaas-payment"
    },
    {
      "type": "switch",
      "conditions": {
        "PAYMENT_CONFIRMED": "Pagamento Confirmado",
        "PAYMENT_OVERDUE": "Pagamento Atrasado",
        "PAYMENT_REFUNDED": "Pagamento Estornado"
      }
    },
    {
      "type": "httpRequest",
      "name": "Atualizar Cliente SaaS"
    },
    {
      "type": "httpRequest",
      "name": "Notificar por WhatsApp"
    }
  ]
}
```

---

## 📦 FASE 6: WORKFLOWS DE IA

### Task 6.1: Criar Workflow - Geração de Conteúdo com Gemini

**NOVO WORKFLOW - Criar:**

```json
{
  "name": "10-geracao-conteudo-ia",
  "description": "Gera conteúdo automaticamente com IA",
  "trigger": "Webhook POST /webhook/gerar-conteudo",
  "nodes": [
    {
      "type": "webhook",
      "path": "gerar-conteudo"
    },
    {
      "type": "httpRequest",
      "name": "Chamar Gemini API",
      "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent",
      "method": "POST",
      "headers": {
        "Content-Type": "application/json"
      },
      "queryParameters": {
        "key": "{{$credentials.geminiApi.apiKey}}"
      },
      "body": {
        "contents": [{"parts": [{"text": "{{$json.prompt}}"}]}],
        "generationConfig": {"temperature": 0.7}
      }
    },
    {
      "type": "set",
      "name": "Extrair Resposta"
    },
    {
      "type": "httpRequest",
      "name": "Salvar no SaaS"
    }
  ]
}
```

### Task 6.2: Criar Workflow - Análise de Sentimento

**NOVO WORKFLOW - Criar:**

```json
{
  "name": "11-analise-sentimento",
  "description": "Analisa comentários e feedback dos clientes",
  "nodes": [
    "Webhook recebe texto",
    "Chamar Gemini para análise",
    "Classificar sentimento",
    "Salvar resultado",
    "Alertar se negativo"
  ]
}
```

---

## 📦 FASE 7: WORKFLOWS DE BACKUP E RELATÓRIOS

### Task 7.1: Criar Workflow - Backup Diário

**NOVO WORKFLOW - Criar:**

```json
{
  "name": "12-backup-diario",
  "trigger": "Cron 03:00 diariamente",
  "nodes": [
    {
      "type": "cron",
      "schedule": "0 3 * * *"
    },
    {
      "type": "httpRequest",
      "name": "Exportar Dados SaaS"
    },
    {
      "type": "googleDrive",
      "name": "Salvar no Google Drive"
    },
    {
      "type": "email",
      "name": "Notificar Admin"
    }
  ]
}
```

### Task 7.2: Criar Workflow - Relatório Semanal

**NOVO WORKFLOW - Criar:**

```json
{
  "name": "13-relatorio-semanal",
  "trigger": "Cron Segunda 08:00",
  "nodes": [
    "Buscar métricas da semana",
    "Gerar relatório com Gemini",
    "Criar PDF",
    "Enviar por email para admin"
  ]
}
```

---

## 📦 FASE 8: INTEGRAÇÃO COM SAAS

### Task 8.1: Atualizar Frontend para Usar Webhooks

**Arquivos a modificar:**

1. **`src/pages/ApprovalPage.tsx`**
   - Adicionar chamada ao webhook quando cliente aprova/rejeita

2. **`src/pages/WorkflowPage.tsx`**
   - Adicionar chamada ao webhook quando status muda

3. **`src/store/index.ts`**
   - Criar função `triggerWebhook()` genérica

**Código a adicionar:**

```typescript
// src/lib/webhooks.ts
const N8N_WEBHOOK_BASE = 'https://agenciabase.app.n8n.cloud/webhook';

export const triggerWebhook = async (
  path: string,
  data: Record<string, any>
) => {
  try {
    await fetch(`${N8N_WEBHOOK_BASE}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.error('Webhook error:', error);
  }
};

export const webhooks = {
  demandCreated: (demand: any) => triggerWebhook('demanda-criada', demand),
  demandStatusChanged: (demand: any) => triggerWebhook('status-alterado', demand),
  clientApproved: (data: any) => triggerWebhook('aprovacao', data),
  paymentReceived: (data: any) => triggerWebhook('pagamento', data),
  generateContent: (prompt: string) => triggerWebhook('gerar-conteudo', { prompt }),
};
```

### Task 8.2: Criar API Endpoints no Backend

**Adicionar em `server/routes/webhooks.ts`:**

```typescript
import { Router } from 'express';

const router = Router();

// Endpoint para n8n buscar dados
router.get('/clients', async (req, res) => {
  // Retornar lista de clientes
});

router.get('/demands', async (req, res) => {
  // Retornar demandas pendentes
});

router.post('/update-demand', async (req, res) => {
  // Atualizar status da demanda
});

export default router;
```

---

## 📦 FASE 9: TESTES E VALIDAÇÃO

### Task 9.1: Testar Cada Workflow

**Checklist de testes:**

| Workflow | Teste | Status |
|----------|-------|--------|
| 01 - Email | Enviar email de teste | ⬜ |
| 02 - WhatsApp | Enviar mensagem de teste | ⬜ |
| 03 - Aprovação | Simular aprovação cliente | ⬜ |
| 04 - Auth | Testar login/logout | ⬜ |
| 05 - Publicação | Agendar e publicar post | ⬜ |
| 06 - Aprovação Interna | Testar fluxo interno | ⬜ |
| 07 - Multi-plataforma | Publicar em 2+ canais | ⬜ |
| 08 - Cobrança | Gerar cobrança teste | ⬜ |
| 09 - Pagamento | Simular webhook Asaas | ⬜ |
| 10 - IA Conteúdo | Gerar texto com Gemini | ⬜ |
| 11 - Sentimento | Analisar texto de teste | ⬜ |
| 12 - Backup | Executar backup manual | ⬜ |
| 13 - Relatório | Gerar relatório teste | ⬜ |

### Task 9.2: Monitoramento

**Configurar no n8n:**
- Alertas de erro por email
- Logs de execução
- Retry automático em falhas

---

## 📋 RESUMO DE WORKFLOWS

| # | Nome | Trigger | Status |
|---|------|---------|--------|
| 01 | Notificação Email | Webhook | ✅ Criado |
| 02 | WhatsApp Evolution | Webhook | ✅ Criado |
| 03 | Aprovação Cliente | Webhook | ✅ Criado |
| 04 | Autenticação | Webhook | ✅ Criado |
| 05 | Agendamento Publicação | Cron | ✅ Criado |
| 06 | Aprovação Interna | Webhook | ⬜ Criar |
| 07 | Multi-plataforma | Webhook | ⬜ Criar |
| 08 | Cobrança Asaas | Cron | ⬜ Criar |
| 09 | Webhook Pagamento | Webhook | ⬜ Criar |
| 10 | Geração IA | Webhook | ⬜ Criar |
| 11 | Análise Sentimento | Webhook | ⬜ Criar |
| 12 | Backup Diário | Cron | ⬜ Criar |
| 13 | Relatório Semanal | Cron | ⬜ Criar |

---

## 🎯 ORDEM DE EXECUÇÃO PARA CLAUDE CHROME

### Sessão 1: Setup Inicial (15 min)
1. Acessar n8n
2. Criar todas as credenciais
3. Configurar variáveis globais

### Sessão 2: Importar Workflows Existentes (10 min)
1. Importar workflows 01-05
2. Configurar credenciais em cada um
3. Ativar workflows

### Sessão 3: Criar Novos Workflows (30 min)
1. Criar workflow 06 - Aprovação Interna
2. Criar workflow 07 - Multi-plataforma
3. Criar workflow 08 - Cobrança Asaas
4. Criar workflow 09 - Webhook Pagamento

### Sessão 4: Workflows de IA (20 min)
1. Criar workflow 10 - Geração IA
2. Criar workflow 11 - Análise Sentimento

### Sessão 5: Automações de Sistema (15 min)
1. Criar workflow 12 - Backup
2. Criar workflow 13 - Relatório

### Sessão 6: Integração SaaS (20 min)
1. Atualizar código frontend
2. Testar webhooks
3. Validar fluxos completos

---

## 📞 SUPORTE

Em caso de problemas:
- Verificar logs do n8n
- Testar webhooks com Postman
- Verificar credenciais
- Consultar documentação n8n

---

**Documento criado em:** 25/12/2024
**Última atualização:** 25/12/2024
**Versão:** 1.0
