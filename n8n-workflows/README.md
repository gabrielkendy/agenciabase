# 📦 n8n Workflows - BASE Agency

## 🔧 Configuração Inicial

### 1. Acesse o n8n
```
URL: https://agenciabase.app.n8n.cloud
```

### 2. Configure as Credenciais

| Nome | Tipo | Dados Necessários |
|------|------|-------------------|
| `Gemini API` | Header Auth | `Authorization: Bearer {API_KEY}` |
| `Late API` | Header Auth | `X-API-Key: {API_KEY}` |
| `Evolution API` | Header Auth | `apikey: {API_KEY}` |
| `Asaas API` | Header Auth | `access_token: {API_KEY}` |
| `SMTP Gmail` | SMTP | host, port, user, pass |
| `Google Drive` | OAuth2 | Client ID, Secret |

### 3. Configure as Variáveis Globais

```
SAAS_URL = https://agenciabase.tech
AGENCY_EMAIL = contato@agenciabase.tech
EVOLUTION_API_URL = https://api.evolution.com
EVOLUTION_INSTANCE = base-agency
```

---

## 📋 Lista de Workflows

| # | Arquivo | Descrição | Trigger |
|---|---------|-----------|---------|
| 01 | `01-notificacao-email-status.json` | Notificações por email | Webhook |
| 02 | `02-notificacao-whatsapp-evolution.json` | WhatsApp via Evolution | Webhook |
| 03 | `03-webhook-aprovacao-cliente.json` | Aprovação do cliente | Webhook |
| 04 | `04-autenticacao-login.json` | Eventos de login | Webhook |
| 05 | `05-agendamento-publicacao.json` | Publicação agendada | Cron 5min |
| 06 | `06-aprovacao-interna.json` | Aprovação interna | Webhook |
| 07 | `07-publicacao-multi-plataforma.json` | Publicar em múltiplas redes | Webhook |
| 08 | `08-cobranca-asaas-mensal.json` | Cobranças mensais | Cron Dia 1 |
| 09 | `09-webhook-pagamento-asaas.json` | Confirmação pagamento | Webhook |
| 10 | `10-geracao-conteudo-ia.json` | Geração de conteúdo IA | Webhook |
| 11 | `11-analise-sentimento.json` | Análise de sentimento | Webhook |
| 12 | `12-backup-diario.json` | Backup automático | Cron 03:00 |
| 13 | `13-relatorio-semanal.json` | Relatório semanal | Cron Segunda |

---

## 🔗 Endpoints dos Webhooks

```yaml
# Notificações
POST /webhook/notificar-email
POST /webhook/notificar-whatsapp

# Demandas
POST /webhook/demanda-criada
POST /webhook/status-alterado
POST /webhook/aprovacao-cliente

# Aprovação
POST /webhook/aprovacao-interna
POST /webhook/aprovacao

# Publicação
POST /webhook/publicar-multi
POST /webhook/publicado

# Financeiro
POST /webhook/cobranca-criada
POST /webhook/asaas-payment
POST /webhook/pagamento

# IA
POST /webhook/gerar-conteudo
POST /webhook/analisar-sentimento
```

---

## 📥 Como Importar

### Método 1: Import Manual
1. Acesse n8n → Workflows
2. Clique em "Import from File"
3. Selecione o arquivo JSON
4. Configure as credenciais
5. Ative o workflow

### Método 2: API n8n
```bash
curl -X POST "https://agenciabase.app.n8n.cloud/api/v1/workflows" \
  -H "X-N8N-API-KEY: {API_KEY}" \
  -H "Content-Type: application/json" \
  -d @01-notificacao-email-status.json
```

---

## 🧪 Como Testar

### Testar Webhook
```bash
# Email
curl -X POST "https://agenciabase.app.n8n.cloud/webhook/notificar-email" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@test.com","subject":"Teste","body":"Olá!"}'

# WhatsApp
curl -X POST "https://agenciabase.app.n8n.cloud/webhook/notificar-whatsapp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"5511999999999","message":"Teste de mensagem"}'

# IA
curl -X POST "https://agenciabase.app.n8n.cloud/webhook/gerar-conteudo" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Crie um post sobre café","platform":"instagram"}'
```

---

## ⚠️ Troubleshooting

### Erro de Credenciais
- Verifique se a credencial está configurada no workflow
- Teste a credencial clicando em "Test" no editor

### Webhook não responde
- Verifique se o workflow está ativo
- Confira se o path está correto
- Veja os logs em Executions

### Erro no Gemini
- Verifique se a API key está válida
- Confira o limite de requests

---

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs em n8n → Executions
2. Teste cada node individualmente
3. Verifique as credenciais
4. Consulte a documentação n8n

---

**Última atualização:** 25/12/2024
