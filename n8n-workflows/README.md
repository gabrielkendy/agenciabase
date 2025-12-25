# 📦 Workflows n8n - BASE Agency (FASE 1 COMPLETA)

## 🚀 Como Importar

1. Acesse seu n8n: https://agenciabase.app.n8n.cloud
2. Clique em "Add Workflow" → "Import from File"
3. Selecione o arquivo JSON desejado
4. Configure as credenciais necessárias
5. Ative o workflow

---

## 📋 Workflows Disponíveis (FASE 1)

### 1. Notificação Email Status (`01-notificacao-email-status.json`)
**Trigger:** Webhook POST `/webhook/status-changed-email`

**Funcionalidades:**
- Envia emails bonitos com template HTML
- Diferencia mensagens por status
- Inclui botão de aprovação quando necessário
- Log de envios

**Payload:**
```json
{
  "demand_id": "uuid",
  "demand_title": "Título da demanda",
  "client_name": "Nome do cliente",
  "client_email": "cliente@email.com",
  "team_email": "equipe@agencia.com",
  "new_status": "aprovacao_cliente",
  "updated_by": "Maria",
  "approval_link": "https://..."
}
```

---

### 2. Notificação WhatsApp Evolution API (`02-notificacao-whatsapp-evolution.json`)
**Trigger:** Webhook POST `/webhook/whatsapp-notify`

**Funcionalidades:**
- Integração com Evolution API
- Formatação automática de número BR
- Templates por tipo de notificação
- Log de sucesso/erro

**Payload:**
```json
{
  "phone": "5511999999999",
  "message": "Sua mensagem",
  "type": "status_update",
  "demand_id": "uuid",
  "link": "https://..."
}
```

**Tipos disponíveis:**
- `status_update` - Atualização de status
- `approval_request` - Solicitação de aprovação
- `deadline_reminder` - Lembrete de prazo
- `published` - Conteúdo publicado
- `feedback` - Novo feedback

---

### 3. Webhook Aprovação Cliente (`03-webhook-aprovacao-cliente.json`)
**Trigger:** Webhook POST `/webhook/client-approval`

**Funcionalidades:**
- Validação de token de aprovação
- Atualiza status da demanda automaticamente
- Notifica equipe via WhatsApp
- Resposta JSON para o frontend

**Payload:**
```json
{
  "demand_id": "uuid",
  "token": "apr_token_here",
  "action": "approve",
  "approved_by": "João Cliente",
  "feedback": "Ficou ótimo!"
}
```

**Ações:**
- `approve` - Aprova e muda status para "aprovado"
- `request_adjustment` - Solicita ajustes

---

### 4. Sistema de Autenticação (`04-autenticacao-login.json`)
**Endpoints:**
- POST `/webhook/auth/login` - Login
- POST `/webhook/auth/verify-token` - Verificar token
- POST `/webhook/auth/logout` - Logout

**Funcionalidades:**
- Geração de token JWT
- Verificação de credenciais
- Log de acessos
- Controle de sessão

**Login Payload:**
```json
{
  "email": "usuario@email.com",
  "password": "senha123"
}
```

**Resposta Login:**
```json
{
  "success": true,
  "token": "eyJ...",
  "user": {
    "id": "uuid",
    "name": "Nome",
    "email": "email@email.com",
    "role": "admin"
  }
}
```

---

### 5. Agendamento e Publicação (`05-agendamento-publicacao.json`)
**Triggers:**
- Cron a cada 5 minutos (verificar agendamentos)
- Webhook POST `/webhook/schedule-publish`

**Funcionalidades:**
- Verifica demandas agendadas automaticamente
- Publica via Late API
- Atualiza status após publicação
- Notifica cliente e equipe
- Trata erros de publicação

**Agendar Payload:**
```json
{
  "demand_id": "uuid",
  "scheduled_date": "2024-12-26T15:00:00Z",
  "scheduled_by": "Maria"
}
```

---

## ⚙️ Variáveis de Ambiente (Configurar no n8n)

```
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-api-key
EVOLUTION_INSTANCE=nome-da-instancia
TEAM_WHATSAPP=5511999999999
LATE_API_KEY=sk_sua_chave
JWT_SECRET=sua-chave-secreta-jwt
```

---

## 🔗 URLs dos Webhooks

Após importar e ativar, seus webhooks estarão em:

| Workflow | URL |
|----------|-----|
| Email Status | `https://agenciabase.app.n8n.cloud/webhook/status-changed-email` |
| WhatsApp | `https://agenciabase.app.n8n.cloud/webhook/whatsapp-notify` |
| Aprovação | `https://agenciabase.app.n8n.cloud/webhook/client-approval` |
| Login | `https://agenciabase.app.n8n.cloud/webhook/auth/login` |
| Verify Token | `https://agenciabase.app.n8n.cloud/webhook/auth/verify-token` |
| Logout | `https://agenciabase.app.n8n.cloud/webhook/auth/logout` |
| Agendar | `https://agenciabase.app.n8n.cloud/webhook/schedule-publish` |

---

## 🧪 Testando

### Via cURL:

```bash
# Testar WhatsApp
curl -X POST https://agenciabase.app.n8n.cloud/webhook/whatsapp-notify \
  -H "Content-Type: application/json" \
  -d '{"phone":"5511999999999","message":"Teste BASE Agency","type":"status_update"}'

# Testar Login
curl -X POST https://agenciabase.app.n8n.cloud/webhook/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@agencia.com","password":"senha123"}'

# Testar Agendamento
curl -X POST https://agenciabase.app.n8n.cloud/webhook/schedule-publish \
  -H "Content-Type: application/json" \
  -d '{"demand_id":"123","scheduled_date":"2024-12-26T15:00:00Z"}'
```

---

## 📊 Integração com Frontend

O frontend usa o serviço `n8nMCPService.ts` para chamar todos os webhooks automaticamente:

```typescript
import { n8nMCPService } from './services/n8nMCPService';

// Enviar WhatsApp
await n8nMCPService.sendWhatsAppNotification({
  phone: '5511999999999',
  message: 'Olá!',
  type: 'status_update'
});

// Login
const { token, user } = await n8nMCPService.login('email', 'senha');

// Agendar publicação
await n8nMCPService.schedulePublication({
  demand_id: '123',
  scheduled_date: '2024-12-26T15:00:00Z'
});
```

---

## ✅ Status da Fase 1

| Task | Status |
|------|--------|
| 1.1 Workflow Email | ✅ Completo |
| 1.2 Workflow WhatsApp | ✅ Completo |
| 1.3 Webhook Aprovação | ✅ Completo |
| 1.4 Sistema Login | ✅ Completo |
| 1.5 Agendamento | ✅ Completo |
| 1.6 MCP Service | ✅ Completo |

**FASE 1: 100% COMPLETA** 🎉
