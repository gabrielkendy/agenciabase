# PLANO DE ACAO - ESCALA 10.000+ USUARIOS
## Arquitetura Profissional com Vercel Edge Functions

---

## 1. ARQUITETURA DE ESCALA

### 1.1 Stack Tecnologica
```
Frontend: React + Vite (SPA otimizado)
Hosting: Vercel Edge Network (300+ PoPs globais)
API: Vercel Edge Functions (baixa latencia)
Database: Supabase (PostgreSQL escalavel)
Cache: Vercel Edge Cache + KV Store
CDN: Vercel Edge Network (automatico)
Monitoramento: Vercel Analytics + Sentry
```

### 1.2 Metricas de Escala Alvo
| Metrica | Valor Alvo |
|---------|------------|
| Usuarios Simultaneos | 10.000+ |
| Requests/segundo | 50.000+ |
| Latencia P95 | < 100ms |
| Uptime | 99.9% |
| Cold Start | < 50ms |

---

## 2. EDGE FUNCTIONS - IMPLEMENTACAO

### 2.1 Estrutura de Arquivos
```
/api
  /ai
    /chat.ts          - Chat com IAs (Gemini, OpenRouter, OpenAI)
    /image.ts         - Geracao de imagens (Freepik, DALL-E, FAL.ai)
    /video.ts         - Geracao de videos (Kling, Seedance, PixVerse)
    /voice.ts         - Sintese de voz (ElevenLabs)
    /tools.ts         - Ferramentas IA (Upscale, Remove BG, etc)
  /auth
    /login.ts         - Autenticacao
    /register.ts      - Registro
    /refresh.ts       - Refresh token
  /webhook
    /asaas.ts         - Webhooks de pagamento
    /zapi.ts          - Webhooks WhatsApp
  /health.ts          - Health check
```

### 2.2 Edge Functions - Caracteristicas
- **Cold Start**: < 50ms (vs 200-500ms em Lambda)
- **Localizacao**: Executado no PoP mais proximo do usuario
- **Timeout**: Ate 30s (Edge) ou 5min (Serverless)
- **Memoria**: Ate 1GB
- **Runtime**: V8 Isolates (mesmo do Cloudflare Workers)

### 2.3 Configuracao Edge Runtime
```typescript
export const config = {
  runtime: 'edge',
  regions: ['gru1', 'iad1', 'sfo1', 'fra1'], // Brasil, EUA, Europa
};
```

---

## 3. PROTECAO E SEGURANCA

### 3.1 Rate Limiting por Camadas
```
Camada 1 - Vercel: DDoS Protection automatico
Camada 2 - Edge: Rate limit por IP (100 req/min)
Camada 3 - API: Rate limit por usuario (60 req/min por endpoint)
Camada 4 - Provider: Rate limit por API (Freepik: 450/dia, etc)
```

### 3.2 Validacao de Requests
- JWT com expiracao curta (15min)
- Refresh tokens com rotacao
- CORS restrito por dominio
- Validacao de payload com Zod
- Sanitizacao de inputs

### 3.3 Protecao contra Abusos
- Bloqueio de IPs maliciosos
- Deteccao de bots (User-Agent, fingerprint)
- Captcha em endpoints sensiveis
- Alertas automaticos para anomalias

---

## 4. OTIMIZACAO DE PERFORMANCE

### 4.1 Code Splitting
```typescript
// Lazy loading de paginas
const CreatorStudio = lazy(() => import('./pages/CreatorStudioPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
```

### 4.2 Bundle Optimization
```javascript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor': ['react', 'react-dom'],
        'ui': ['lucide-react', 'clsx', 'react-hot-toast'],
        'ai-services': ['./src/services/geminiService', './src/services/openrouterService'],
        'studio': ['./src/pages/CreatorStudioPage'],
      }
    }
  }
}
```

### 4.3 Caching Strategy
```
Static Assets: Cache 1 ano (hash no nome)
API Responses: Cache 5-60s (stale-while-revalidate)
Images Geradas: Cache 24h no Edge
HTML: No-cache (sempre fresh)
```

---

## 5. MONITORAMENTO E OBSERVABILIDADE

### 5.1 Metricas Coletadas
- Requests por segundo
- Latencia por endpoint
- Taxa de erro
- Tokens consumidos por usuario
- Custo estimado por provider

### 5.2 Alertas Configurados
- Erro rate > 5%
- Latencia P95 > 500ms
- Custo diario > threshold
- Rate limit atingido

### 5.3 Dashboards
- Uso em tempo real
- Custos por provider
- Top usuarios
- Erros por tipo

---

## 6. CUSTOS ESTIMADOS (10K usuarios)

### 6.1 Vercel
| Recurso | Limite Free | Pro ($20/mes) |
|---------|-------------|---------------|
| Bandwidth | 100GB | 1TB |
| Serverless Exec | 100GB-hrs | 1000GB-hrs |
| Edge Functions | Ilimitado | Ilimitado |
| Analytics | Basico | Avancado |

### 6.2 APIs de IA (estimativa 10K usuarios)
| Provider | Custo Estimado/mes |
|----------|-------------------|
| Freepik | $99-299 (Premium+) |
| OpenRouter | $50-200 |
| ElevenLabs | $22-99 |
| FAL.ai | Pay-per-use |
| **Total** | **~$300-600/mes** |

---

## 7. CHECKLIST DE IMPLEMENTACAO

### Fase 1 - Infraestrutura (Hoje)
- [x] Backup do projeto
- [ ] Criar vercel.json otimizado
- [ ] Criar Edge Functions para APIs
- [ ] Configurar variaveis de ambiente
- [ ] Deploy inicial

### Fase 2 - Otimizacao (Hoje)
- [ ] Implementar code splitting
- [ ] Configurar caching headers
- [ ] Otimizar bundle size
- [ ] Testar performance

### Fase 3 - Seguranca (Hoje)
- [ ] Rate limiting em Edge
- [ ] Validacao com Zod
- [ ] Logs de auditoria
- [ ] Protecao de endpoints

### Fase 4 - Monitoramento (Hoje)
- [ ] Vercel Analytics
- [ ] Error tracking
- [ ] Alertas
- [ ] Dashboard de custos

---

## 8. ARQUIVOS A CRIAR/MODIFICAR

```
CRIAR:
  /api/ai/chat.ts
  /api/ai/image.ts
  /api/ai/video.ts
  /api/ai/voice.ts
  /api/ai/tools.ts
  /api/health.ts
  /src/lib/apiClient.ts
  /src/lib/rateLimit.ts

MODIFICAR:
  /vercel.json
  /vite.config.ts
  /package.json
  /src/services/*.ts (apontar para Edge Functions)
```

---

## 9. COMANDOS DE DEPLOY

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy preview
vercel

# Deploy producao
vercel --prod

# Configurar dominio
vercel domains add agenciabase.tech
```

---

**Backup Criado:** backup_agenciabase_YYYYMMDD_HHMMSS.tar.gz
**Autor:** Claude Code
**Data:** 2025-12-17
