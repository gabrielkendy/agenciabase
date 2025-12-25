# 🚀 IMPORTAÇÃO RÁPIDA - n8n Workflows

## Opção 1: Via Script (precisa API Key)

1. Gere a API Key em: Settings > API > Create API Key
2. Edite o arquivo `n8n-create-workflows.cjs`
3. Cole a API Key na linha 10
4. Execute: `node n8n-create-workflows.cjs`

## Opção 2: Importação Manual (mais rápido)

### Passo 1: Acesse o n8n
https://agenciabase.app.n8n.cloud

### Passo 2: Para cada workflow, faça:

1. Clique em **"Add Workflow"** (botão laranja)
2. Clique nos **3 pontinhos** (canto superior direito)
3. Selecione **"Import from file..."**
4. Selecione o arquivo JSON correspondente
5. Clique em **"Save"**
6. Clique no toggle **"Inactive/Active"** para ativar

### Arquivos para importar (em ordem):

| # | Arquivo | Webhook URL |
|---|---------|-------------|
| 1 | `01-notificacao-email-status.json` | `/webhook/status-changed-email` |
| 2 | `02-notificacao-whatsapp-evolution.json` | `/webhook/whatsapp-notify` |
| 3 | `03-webhook-aprovacao-cliente.json` | `/webhook/client-approval` |
| 4 | `04-autenticacao-login.json` | `/webhook/auth/login` |
| 5 | `05-agendamento-publicacao.json` | `/webhook/schedule-publish` |

### Passo 3: Configurar Variáveis

1. Vá em **Settings** > **Variables**
2. Adicione cada variável:

```
EVOLUTION_API_URL = https://sua-evolution-api.com
EVOLUTION_API_KEY = sua-api-key
EVOLUTION_INSTANCE = agenciabase
TEAM_WHATSAPP = 5511999999999
LATE_API_KEY = sk_c97f6c3195c89bb4cb16548c2b0c2be269f97bbb4c3e594e08b1128152935aef
JWT_SECRET = base-agency-jwt-secret-2024
```

### Passo 4: Configurar Credencial SMTP

1. Vá em **Settings** > **Credentials**
2. Clique **"Add credential"**
3. Busque **"SMTP"**
4. Configure:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - User: seu email
   - Password: senha de app do Google

### Passo 5: Ativar Workflows

1. Volte para cada workflow
2. Clique no toggle para ativar

## ✅ Pronto!

Seus webhooks estarão em:
- `https://agenciabase.app.n8n.cloud/webhook/status-changed-email`
- `https://agenciabase.app.n8n.cloud/webhook/whatsapp-notify`
- `https://agenciabase.app.n8n.cloud/webhook/client-approval`
- `https://agenciabase.app.n8n.cloud/webhook/auth/login`
- `https://agenciabase.app.n8n.cloud/webhook/schedule-publish`
