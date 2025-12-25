# 📦 Workflows n8n - BASE Agency

## 🚀 Como Importar

1. Acesse seu n8n: https://agenciabase.app.n8n.cloud
2. Clique em "Add Workflow" → "Import from File"
3. Selecione o arquivo JSON desejado
4. Configure as credenciais necessárias

## 📋 Workflows Disponíveis

### 1. Notificação WhatsApp (`01-notificacao-whatsapp.json`)
**Trigger:** Webhook POST `/webhook/notificar-whatsapp`

**Payload esperado:**
```json
{
  "phone": "5511999999999",
  "message": "Sua mensagem aqui",
  "zapi_instance": "sua-instancia",
  "zapi_token": "seu-token"
}
```

---

### 2. Notificação Email (`02-notificacao-email.json`)
**Trigger:** Webhook POST `/webhook/notificar-email`

**Payload esperado:**
```json
{
  "to_email": "cliente@email.com",
  "subject": "Assunto do email",
  "html_content": "<h1>Conteúdo HTML</h1>"
}
```

**Requer:** Configurar credencial SMTP no n8n

---

### 3. Webhook Aprovação (`03-webhook-aprovacao.json`)
**Trigger:** Webhook POST `/webhook/aprovacao-cliente`

**Payload esperado:**
```json
{
  "demand_id": "uuid-da-demanda",
  "token": "token-de-aprovacao",
  "action": "approve", // ou "request_adjustment"
  "approved_by": "Nome do cliente",
  "feedback": "Feedback se for ajuste"
}
```

---

### 4. Demanda Criada (`04-demanda-criada.json`)
**Trigger:** Webhook POST `/webhook/demanda-criada`

**Payload esperado:**
```json
{
  "demand_title": "Título da demanda",
  "client_name": "Nome do cliente",
  "client_email": "cliente@email.com",
  "client_phone": "5511999999999",
  "content_type": "post",
  "approval_link": "https://app.com/aprovar/token"
}
```

---

### 5. Lembrete de Atraso (`05-lembrete-atraso.json`)
**Trigger:** Cron - Diariamente às 9h

**Funcionamento:**
1. Busca demandas atrasadas na API
2. Para cada demanda, notifica o responsável via WhatsApp
3. Envia lembrete com detalhes da demanda

---

### 6. Publicação Agendada (`06-publicacao-agendada.json`)
**Trigger:** Cron - A cada 15 minutos

**Funcionamento:**
1. Busca demandas agendadas para o momento atual
2. Publica via Late API nas redes sociais configuradas
3. Atualiza status para "Publicado"
4. Notifica cliente via WhatsApp

---

## ⚙️ Configurações Necessárias

### Credenciais no n8n:

1. **SMTP** (para emails)
   - Host: smtp.gmail.com (ou seu provedor)
   - Port: 587
   - User: seu-email@gmail.com
   - Password: sua-senha-de-app

2. **Z-API / Evolution API** (para WhatsApp)
   - Instance ID
   - Token
   - Client Token (opcional)

3. **Late API** (para publicação)
   - API Key

### Variáveis de Ambiente:

Configure no n8n em Settings → Variables:
- `ZAPI_INSTANCE`: ID da sua instância Z-API
- `ZAPI_TOKEN`: Token da Z-API
- `LATE_API_KEY`: Chave da Late API
- `APP_URL`: https://agenciabase.onrender.com

---

## 🔗 URLs dos Webhooks

Após importar, seus webhooks estarão em:

- `https://agenciabase.app.n8n.cloud/webhook/notificar-whatsapp`
- `https://agenciabase.app.n8n.cloud/webhook/notificar-email`
- `https://agenciabase.app.n8n.cloud/webhook/aprovacao-cliente`
- `https://agenciabase.app.n8n.cloud/webhook/demanda-criada`

---

## 🧪 Testando

Use o n8n para testar:
1. Abra o workflow
2. Clique em "Execute Workflow"
3. Use o painel de teste do webhook para enviar dados

Ou teste via curl:
```bash
curl -X POST https://agenciabase.app.n8n.cloud/webhook/notificar-whatsapp \
  -H "Content-Type: application/json" \
  -d '{"phone":"5511999999999","message":"Teste"}'
```
