# PLANO DE TESTES E REVISAO COMPLETA
## AgenciaBase SaaS - Auditoria Tecnica

---

## FASE 1: AUDITORIA DE LAYOUT E UI

### 1.1 Paginas a Verificar
| Pagina | Arquivo | Itens a Checar |
|--------|---------|----------------|
| Login | LoginPage.tsx | Formulario, validacao, responsivo |
| Dashboard | DashboardPage.tsx | Cards, metricas, graficos |
| Chat | ChatPage.tsx | Envio mensagens, historico, projetos |
| Creator Studio | CreatorStudioPage.tsx | Tabs, modelos, geracao, galeria |
| Agentes | AgentsPage.tsx | Lista, criacao, configuracao |
| Clientes | ClientsPage.tsx | CRUD, busca, filtros |
| Workflow | WorkflowPage.tsx | Kanban, drag-drop, status |
| Admin | AdminPage.tsx | Configuracoes, usuarios |
| Super Admin | SuperAdminDashboard.tsx | Tenants, planos, analytics |

### 1.2 Componentes Criticos
- [ ] Sidebar navegacao
- [ ] Header responsivo
- [ ] Modais funcionando
- [ ] Botoes com estados (hover, disabled, loading)
- [ ] Formularios com validacao
- [ ] Toasts de feedback

---

## FASE 2: MODELOS DISPONIVEIS

### 2.1 Imagem (Freepik API)
| Modelo | Endpoint | Status |
|--------|----------|--------|
| Mystic | /ai/mystic | A testar |
| Gemini 2.5 Flash | /ai/gemini-2-5-flash-image-preview | A testar |
| Seedream 4 Edit | /ai/text-to-image/seedream-v4-edit | A testar |
| Seedream 4 | /ai/text-to-image/seedream-v4 | A testar |
| Seedream | /ai/text-to-image/seedream | A testar |
| Flux Pro 1.1 | /ai/text-to-image/flux-pro-v1-1 | A testar |
| Flux Dev | /ai/text-to-image/flux-dev | A testar |
| HyperFlux | /ai/text-to-image/hyperflux | A testar |
| Classic Fast | /ai/text-to-image | A testar |

### 2.2 Video (Freepik API)
| Modelo | Endpoint | Status |
|--------|----------|--------|
| Kling 2.5 Pro | /ai/image-to-video/kling-v2-5-pro | A testar |
| Kling 2.1 Pro | /ai/image-to-video/kling-v2-1-pro | A testar |
| Seedance Pro | /ai/image-to-video/seedance-pro-1080p | A testar |
| PixVerse V5 | /ai/image-to-video/pixverse-v5 | A testar |
| MiniMax Hailuo | /ai/image-to-video/minimax-hailuo-02-1080p | A testar |

### 2.3 Chat (Multi-provider)
| Provider | Modelo | Status |
|----------|--------|--------|
| Gemini | gemini-2.0-flash-exp | A testar |
| OpenRouter | google/gemini-2.0-flash-exp:free | A testar |
| OpenAI | gpt-4o-mini | A testar |

### 2.4 Voz (ElevenLabs)
| Voz | ID | Status |
|-----|-----|--------|
| Daniel PT-BR | onwK4e9ZLuTAKqWW03F9 | A testar |
| Sarah EN | EXAVITQu4vr4xnSDxMaL | A testar |

### 2.5 Ferramentas IA
| Ferramenta | Endpoint | Status |
|------------|----------|--------|
| Upscale Magnific | /ai/image-upscaler | A testar |
| Upscale Precision | /ai/image-upscaler-precision-v2 | A testar |
| Remove Background | /ai/beta/remove-background | A testar |
| Relight | /ai/image-relight | A testar |
| Style Transfer | /ai/image-style-transfer | A testar |
| Expand Image | /ai/image-expand/flux-pro | A testar |
| Image to Prompt | /ai/image-to-prompt | A testar |
| Improve Prompt | /ai/improve-prompt | A testar |
| Skin Enhancer | /ai/skin-enhancer/flexible | A testar |
| Icon Generator | /ai/text-to-icon/preview | A testar |
| Sound Effects | /ai/sound-effects | A testar |

---

## FASE 3: TOKEN TRACKING

### 3.1 Metricas a Rastrear
- [ ] Input tokens por request
- [ ] Output tokens por request
- [ ] Tempo de resposta (ms)
- [ ] Taxa de sucesso/erro
- [ ] Custo estimado por provider
- [ ] Uso por usuario
- [ ] Uso por tenant

### 3.2 Validacoes
- [ ] TokenTracker registrando todas chamadas
- [ ] UsageAnalyticsPage exibindo dados corretos
- [ ] Alertas de limite de uso
- [ ] Logs de auditoria

---

## FASE 4: ANTI-FRAUDE

### 4.1 Deteccao de Abuso
- [ ] Rate limiting por IP
- [ ] Rate limiting por usuario
- [ ] Rate limiting por tenant
- [ ] Deteccao de bots (User-Agent)
- [ ] Fingerprinting de dispositivo
- [ ] Bloqueio de IPs maliciosos
- [ ] Deteccao de prompts maliciosos

### 4.2 Validacao de Pagamentos
- [ ] Verificacao de assinatura webhook Asaas
- [ ] Dupla verificacao de status pagamento
- [ ] Log de todas transacoes
- [ ] Alerta de chargebacks

---

## FASE 5: ANTI-HACK / SEGURANCA

### 5.1 Autenticacao
- [ ] JWT com expiracao curta (15min)
- [ ] Refresh tokens com rotacao
- [ ] Logout em todas sessoes
- [ ] 2FA (futuro)

### 5.2 Autorizacao
- [ ] Verificacao de roles (user, admin, super_admin)
- [ ] Isolamento de tenant (multi-tenancy)
- [ ] Protecao de rotas admin
- [ ] Audit log de acoes criticas

### 5.3 Input Validation
- [ ] Sanitizacao de inputs
- [ ] Validacao com Zod
- [ ] Protecao XSS
- [ ] Protecao CSRF
- [ ] Protecao SQL Injection (via Supabase RLS)

### 5.4 API Security
- [ ] CORS restrito
- [ ] Headers de seguranca
- [ ] Rate limiting
- [ ] API keys encriptadas
- [ ] Secrets em env vars

---

## FASE 6: EDGE FUNCTIONS AVANCADAS

### 6.1 Melhorias
- [ ] Retry com backoff exponencial
- [ ] Circuit breaker para APIs externas
- [ ] Cache de respostas (quando aplicavel)
- [ ] Compressao de payloads
- [ ] Streaming de respostas longas

### 6.2 Monitoramento
- [ ] Logging estruturado
- [ ] Metricas de latencia
- [ ] Alertas de erro
- [ ] Dashboard de status

---

## FASE 7: TESTES

### 7.1 Testes Unitarios
- [ ] Validadores
- [ ] Utilitarios
- [ ] Services

### 7.2 Testes de Integracao
- [ ] APIs externas (mock)
- [ ] Edge Functions
- [ ] Banco de dados

### 7.3 Testes E2E
- [ ] Fluxo de login
- [ ] Fluxo de geracao de imagem
- [ ] Fluxo de pagamento

---

## FASE 8: RELATORIO

### 8.1 Metricas Coletadas
- Total de arquivos auditados
- Bugs encontrados e corrigidos
- Melhorias implementadas
- Cobertura de testes
- Score de seguranca

---

**Data:** 2025-12-17
**Autor:** Claude Code
