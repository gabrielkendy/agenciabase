
---

## 📍 SESSÃO 5: VERIFICAÇÃO FINAL (10 minutos)

### Checklist de Validação

| Item | Status | Ação se Falhar |
|------|--------|----------------|
| Credencial Gemini | ⬜ | Verificar API key |
| Credencial Late API | ⬜ | Solicitar key ao usuário |
| Credencial Evolution | ⬜ | Verificar URL e key |
| Credencial Asaas | ⬜ | Verificar token |
| Credencial SMTP | ⬜ | Testar envio |
| Workflow 01 ativo | ⬜ | Ativar toggle |
| Workflow 02 ativo | ⬜ | Ativar toggle |
| Workflow 03 ativo | ⬜ | Ativar toggle |
| Workflow 04 ativo | ⬜ | Ativar toggle |
| Workflow 05 ativo | ⬜ | Ativar toggle |
| Workflow 06 ativo | ⬜ | Ativar toggle |
| Workflow 07 ativo | ⬜ | Ativar toggle |
| Workflow 08 ativo | ⬜ | Ativar toggle |
| Workflow 09 ativo | ⬜ | Ativar toggle |
| Workflow 10 ativo | ⬜ | Ativar toggle |
| Workflow 11 ativo | ⬜ | Ativar toggle |
| Workflow 12 ativo | ⬜ | Ativar toggle |
| Workflow 13 ativo | ⬜ | Ativar toggle |
| Webhook Asaas configurado | ⬜ | Acessar painel Asaas |
| Teste email OK | ⬜ | Verificar SMTP |
| Teste WhatsApp OK | ⬜ | Verificar Evolution |
| Teste IA OK | ⬜ | Verificar Gemini key |

---

## 📍 SESSÃO 6: ATUALIZAR SAAS (15 minutos)

### Passo 6.1: Atualizar URLs no Frontend

O arquivo `src/lib/webhooks.ts` já foi criado com todas as funções.
Verificar se está sendo usado nos componentes corretos.

### Passo 6.2: Integrar Webhooks no Store

Adicionar chamadas de webhook em `src/store/index.ts`:

```typescript
// Importar no topo do arquivo
import webhooks from '../lib/webhooks';

// Dentro das actions relevantes:

// Em addDemand:
webhooks.demand.created(newDemand, client);

// Em moveDemand:
webhooks.demand.statusChanged(demand, oldStatus, newStatus, userName);

// Em approveByExternal:
webhooks.approval.clientApproved(demand, client);
```

### Passo 6.3: Atualizar ApprovalPage

Em `src/pages/ApprovalPage.tsx`, após aprovar/rejeitar:

```typescript
// Após aprovar
await webhooks.approval.clientApproved(demand, clientData);

// Após pedir ajustes
await webhooks.approval.clientRequestedAdjustment(demand, clientData, feedback);
```

---

## 🔄 MANUTENÇÃO CONTÍNUA

### Monitoramento Diário
1. Verificar execuções em n8n → Executions
2. Checar erros e falhas
3. Verificar logs de cada workflow

### Backup dos Workflows
1. Periodicamente exportar workflows
2. Salvar no repositório Git
3. Documentar alterações

### Atualização de Credenciais
1. Quando API keys expirarem, atualizar
2. Testar após atualização
3. Verificar todos os workflows afetados

---

## 🆘 TROUBLESHOOTING

### Erro: "Credential not found"
```
Solução:
1. Abrir o workflow
2. Clicar no node com erro
3. Selecionar a credencial correta
4. Salvar e reativar
```

### Erro: "Connection refused"
```
Solução:
1. Verificar se a URL está correta
2. Verificar se o serviço externo está online
3. Testar a URL manualmente
```

### Erro: "Invalid API key"
```
Solução:
1. Verificar se a key está correta
2. Verificar se não expirou
3. Gerar nova key se necessário
```

### Erro: "Timeout"
```
Solução:
1. Aumentar timeout do node
2. Verificar se o serviço está lento
3. Considerar retry automático
```

---

## 📊 MÉTRICAS DE SUCESSO

Após configuração completa, verificar:

- ✅ Emails sendo enviados automaticamente
- ✅ WhatsApp notificando clientes
- ✅ Aprovações atualizando o SaaS
- ✅ Publicações acontecendo no horário
- ✅ Cobranças sendo geradas mensalmente
- ✅ Pagamentos sendo registrados
- ✅ IA gerando conteúdo sob demanda
- ✅ Backups diários funcionando
- ✅ Relatórios semanais sendo enviados

---

## 📞 DADOS DE CONTATO PARA CONFIGURAÇÃO

### APIs Necessárias (solicitar ao usuário):

```yaml
Late API:
  - URL: https://api.late.io
  - API Key: [SOLICITAR]

Evolution API:
  - URL: [SOLICITAR]
  - Instance: [SOLICITAR]
  - API Key: [SOLICITAR]

Asaas:
  - URL: https://api.asaas.com/v3
  - Token: [SOLICITAR]

SMTP (Gmail):
  - Email: [SOLICITAR]
  - App Password: [SOLICITAR]
  (Gerar em: Google Account → Security → App Passwords)

Google Drive (opcional):
  - Folder ID para backups: [CRIAR/SOLICITAR]
```

---

**FIM DO GUIA CLAUDE CHROME**

Documento criado: 25/12/2024
Versão: 1.0
