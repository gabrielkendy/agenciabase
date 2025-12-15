# 🚀 PLANO DE IMPLEMENTAÇÃO: WORKFLOW IGUAL MLABS

## 📋 VISÃO GERAL

**Objetivo:** Implementar sistema de Workflow completo igual ao mLabs com aprovações, links dinâmicos, histórico e comunicação integrada.

**Baseado nas imagens analisadas:**
- Dashboard mLabs com conexão de redes sociais
- Workflow Kanban com colunas de status
- Modal de criação de demanda com 2 steps
- Link de aprovação dinâmico público
- Página de aprovação do cliente com prévia do post
- Sistema de "Aprovar todas" para múltiplas demandas

---

## 📦 FASE 1: PÁGINA PÚBLICA DE APROVAÇÃO (Link Dinâmico)

### Task 1.1: Criar ApprovalPublicPage.tsx
**Prioridade:** ALTA
**Arquivos:** `src/pages/ApprovalPublicPage.tsx`
**Detalhes:**
- Página pública acessível via `/aprovacao/:token`
- SEM necessidade de login (igual mLabs)
- Header com logo e identificação do aprovador
- Badge "X demanda(s) com aprovação pendente"
- Navegação entre demandas (1/3, 2/3, etc)
- Filtros por status
- Prévia do post completa (imagem, legenda, data)
- Botões: "Aprovar todas", "Aprovar", "Ajustar"

### Task 1.2: Componente de Preview do Post
**Arquivos:** `src/components/PostPreview.tsx`
**Detalhes:**
- Simular visualização do post nas redes
- Mostrar cliente/perfil
- Data de publicação
- Mídia (imagem/vídeo/carrossel)
- Legenda completa
- Hashtags
- Link "Ver mídia" em nova aba

### Task 1.3: Modal de Solicitar Ajuste
**Arquivos:** `src/components/AdjustmentModal.tsx`
**Detalhes:**
- Textarea para descrever ajuste necessário
- Opções: ajuste de texto, ajuste de imagem, ambos
- Upload de referência (opcional)
- Botão enviar

### Task 1.4: API/Store de Aprovação Pública
**Arquivos:** `src/store/index.ts`
**Detalhes:**
- Função `getDemandsByToken(token)` - buscar demandas pelo token
- Função `approveDemand(id, approverInfo)`
- Função `requestAdjustment(id, feedback)`
- Função `approveAllDemands(token)`

---

## 📦 FASE 2: MELHORIAS NO WORKFLOW PRINCIPAL

### Task 2.1: Botão "Link de aprovação" melhorado
**Arquivos:** `src/pages/WorkflowPage.tsx`
**Detalhes:**
- Modal igual mLabs (já existe, melhorar)
- Mostrar nome e email do aprovador
- Status "Aguardando aprovação" com badge amarelo
- Campo com link copiável
- Botão "Copiar link" azul
- Botão WhatsApp verde

### Task 2.2: Notificações por Email (simulado)
**Arquivos:** `src/services/emailService.ts`
**Detalhes:**
- Função `sendApprovalEmail(approver, demand, link)`
- Função `sendAdjustmentNotification(team, demand, feedback)`
- Função `sendApprovedNotification(team, demand)`
- Console.log + Toast como simulação

### Task 2.3: Sistema de Histórico Completo
**Arquivos:** Atualizar types + WorkflowPage
**Detalhes:**
- Cada ação gera entrada no histórico
- Mostrar timeline no preview lateral
- Tipos: criado, status alterado, aprovado, ajuste solicitado, comentário
- Nome de quem fez a ação + data/hora

### Task 2.4: Comentários no Workflow
**Arquivos:** `src/components/DemandComments.tsx`
**Detalhes:**
- Lista de comentários na demanda
- Input para novo comentário
- Identificar tipo: equipe, aprovador interno, aprovador externo
- Real-time update (simulado)

---

## 📦 FASE 3: INTEGRAÇÃO COM REDES SOCIAIS (Simulado)

### Task 3.1: Configuração de Canais Conectados
**Arquivos:** `src/pages/SettingsPage.tsx` seção Canais
**Detalhes:**
- Grid igual mLabs (Instagram, Facebook, TikTok, YouTube, etc)
- Card por rede com ícone e botão "Conectar"
- Simulação de conexão (botão muda para "Conectado")
- Badge "NOVO" em alguns canais

### Task 3.2: Publicação Automática (Simulado)
**Arquivos:** `src/services/publishService.ts`
**Detalhes:**
- Função `publishToChannel(demand, channel)`
- Quando demanda vai pra "Concluído", simula publicação
- Toast de sucesso com links das redes

---

## 📦 FASE 4: UX/UI FINAL

### Task 4.1: Design Responsivo da Aprovação
**Detalhes:**
- Mobile-first na página de aprovação pública
- Cards empilhados em mobile
- Botões grandes e touch-friendly

### Task 4.2: Animações e Transições
**Detalhes:**
- Drag-and-drop suave no Kanban
- Transições de modal
- Loading states
- Confetti ao aprovar todas (opcional)

### Task 4.3: Temas e Cores por Cliente
**Detalhes:**
- Na aprovação pública, usar cor do cliente
- Header colorido
- Botões com cor do cliente

---

## 📊 RESUMO DE ARQUIVOS

### Arquivos NOVOS:
| Arquivo | Descrição |
|---------|-----------|
| `src/pages/ApprovalPublicPage.tsx` | Página pública de aprovação |
| `src/components/PostPreview.tsx` | Preview do post |
| `src/components/AdjustmentModal.tsx` | Modal de solicitar ajuste |
| `src/components/DemandComments.tsx` | Sistema de comentários |
| `src/services/emailService.ts` | Serviço de notificações |
| `src/services/publishService.ts` | Serviço de publicação |

### Arquivos MODIFICADOS:
| Arquivo | Mudanças |
|---------|----------|
| `src/types/index.ts` | Novos types se necessário |
| `src/store/index.ts` | Funções de aprovação pública |
| `src/pages/WorkflowPage.tsx` | Melhorias UX |
| `src/pages/SettingsPage.tsx` | Seção de canais |
| `src/App.tsx` | Rota /aprovacao/:token |

---

## ⏱️ ESTIMATIVA DE TEMPO

| Fase | Tasks | Tempo Estimado |
|------|-------|----------------|
| Fase 1 | 4 tasks | 3-4h |
| Fase 2 | 4 tasks | 2-3h |
| Fase 3 | 2 tasks | 1-2h |
| Fase 4 | 3 tasks | 1-2h |
| **TOTAL** | **13 tasks** | **7-11h** |

---

## 🎯 ORDEM DE EXECUÇÃO RECOMENDADA

1. **Task 1.1** - ApprovalPublicPage (CRÍTICO)
2. **Task 1.2** - PostPreview
3. **Task 1.3** - AdjustmentModal
4. **Task 1.4** - Store funções
5. **Task 2.1** - Modal link melhorado
6. **Task 2.3** - Histórico
7. **Task 2.4** - Comentários
8. **Task 2.2** - Email (simulado)
9. **Task 3.1** - Canais conectados
10. **Task 3.2** - Publicação simulada
11. **Task 4.1-4.3** - UX/UI Final

---

## ✅ CRITÉRIOS DE ACEITE

- [ ] Página de aprovação pública funciona sem login
- [ ] Link dinâmico único por demanda/aprovador
- [ ] Cliente consegue aprovar ou pedir ajuste
- [ ] "Aprovar todas" funciona para múltiplas demandas
- [ ] Histórico registra todas as ações
- [ ] Comentários visíveis no workflow
- [ ] WhatsApp abre com link correto
- [ ] UI responsiva em mobile
- [ ] Igual ou melhor que mLabs

---

## 🔗 REFERÊNCIA VISUAL (mLabs)

Baseado nas imagens enviadas:
1. `screencapture-workflow-mlabs-io-external-approval-*` - Página de aprovação
2. `screencapture-workflow-mlabs-io-*` - Kanban e modal
3. `screencapture-appsocial-mlabs-io-*` - Dashboard com canais

---

**PRONTO PARA IMPLEMENTAR!**
Confirme para começar pela Fase 1 (Página Pública de Aprovação).
