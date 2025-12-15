# 🛣️ PLANO DE IMPLEMENTAÇÃO: REACT ROUTER

## 📋 VISÃO GERAL

**Objetivo:** Implementar React Router no projeto BASE Agency SaaS para navegação profissional com URLs amigáveis.

**Status:** AGUARDANDO (primeiro implementar Workflow igual mLabs)

---

## 📦 TASKS DO ROUTER

### Task R.1: Instalar React Router
```bash
npm install react-router-dom
```

### Task R.2: Configurar Routes em App.tsx
**Estrutura de rotas:**
```
/                       → Dashboard
/workflow               → WorkflowPage
/workflow/:demandId     → Detalhe da demanda
/chat                   → ChatPage  
/chat/:conversationId   → Conversa específica
/clientes               → ClientsPage
/clientes/:clientId     → Detalhe do cliente
/agentes                → AgentsPage
/agentes/:agentId       → Detalhe/config do agente
/calendario             → CalendarPage
/configuracoes          → SettingsPage
/aprovacao/:token       → ApprovalPublicPage (PÚBLICA)
```

### Task R.3: Criar Layout com Outlet
**Arquivo:** `src/layouts/MainLayout.tsx`
- Sidebar fixa
- Header com breadcrumbs
- Outlet para conteúdo
- Preservar estado da sidebar

### Task R.4: Implementar Navigation Guards
- Verificar se usuário está logado
- Redirecionar para login se não autenticado
- Rotas públicas (/aprovacao/*) sem verificação

### Task R.5: Deep Links nas Páginas
- Demanda abre em URL própria
- Compartilhar link de demanda
- Back button funcional

### Task R.6: Breadcrumbs Automáticos
**Arquivo:** `src/components/Breadcrumbs.tsx`
- Baseado na rota atual
- Clicáveis para navegação

### Task R.7: Loading States
- Skeleton enquanto carrega página
- Transition entre rotas

---

## ⏱️ ESTIMATIVA

| Task | Tempo |
|------|-------|
| R.1-R.2 | 1h |
| R.3 | 1h |
| R.4 | 30min |
| R.5 | 1h |
| R.6 | 30min |
| R.7 | 30min |
| **TOTAL** | **4-5h** |

---

## 📝 NOTAS

- Implementar APÓS workflow mLabs
- Manter estado global com Zustand
- URLs devem ser SEO-friendly
- Considerar lazy loading para performance

---

**STATUS: SALVO - IMPLEMENTAR DEPOIS DO WORKFLOW**
