# RELATÓRIO: Arquitetura de Integrações IA - Creator Studio

## Data: 18/12/2025

---

## 1. SITUAÇÃO ATUAL

### 1.1 Infraestrutura Existente

Você já possui **DUAS** camadas de backend para APIs de IA:

| Camada | Localização | Tecnologia | Status |
|--------|-------------|------------|--------|
| **Vercel Edge Functions** | `/api/ai/*.ts` | Vercel Edge Runtime | Completo |
| **Supabase Edge Functions** | `/supabase/functions/ai-*` | Deno | Completo |

### 1.2 Edge Functions Vercel (Recomendada)

```
api/
├── lib/edgeUtils.ts      # Utilitários (retry, circuit breaker, rate limit)
├── ai/
│   ├── chat.ts           # Chat com LLMs
│   ├── image.ts          # Geração de imagens
│   ├── video.ts          # Geração de vídeos
│   ├── voice.ts          # Text-to-Speech
│   └── tools.ts          # Ferramentas AI
├── health.ts             # Health check
├── generate-image.ts     # Freepik proxy (legacy)
└── check-generation.ts   # Polling status (legacy)
```

**Features Implementadas:**
- Retry com exponential backoff
- Circuit breaker (proteção contra cascata de falhas)
- Rate limiting por IP
- Validação de requests
- Structured logging
- CORS configurado
- Security headers

### 1.3 Supabase Edge Functions

```
supabase/functions/
├── ai-chat/index.ts      # Chat
├── ai-image/index.ts     # Imagens
├── ai-video/index.ts     # Vídeos
├── ai-voice/index.ts     # Voz
└── ai-router/index.ts    # Router inteligente
```

**Features:**
- Autenticação via Supabase Auth
- Busca de API keys do banco de dados
- Logging de gerações para analytics
- Suporte multi-tenant

---

## 2. PROBLEMA IDENTIFICADO

O **CreatorStudioPage.tsx** está fazendo chamadas **DIRETAS** às APIs externas:

```typescript
// PROBLEMA: Chamada direta do frontend
const response = await fetch(`https://fal.run/${falModel}`, {
  headers: {
    'Authorization': `Key ${apiConfig.falai_key}`, // API KEY EXPOSTA!
  },
});
```

### Riscos:

| Risco | Gravidade | Impacto |
|-------|-----------|---------|
| API Keys expostas no browser | **CRÍTICO** | Qualquer usuário pode roubar as chaves |
| CORS bloqueado | **ALTO** | Freepik/algumas APIs não permitem browser |
| Sem rate limiting | **ALTO** | Usuários podem abusar |
| Sem logging | **MÉDIO** | Não consegue rastrear uso |
| Sem autenticação | **ALTO** | Qualquer pessoa pode usar |

---

## 3. RECOMENDAÇÃO: VERCEL EDGE FUNCTIONS

### Por que Vercel Edge e não Supabase Edge?

| Critério | Vercel Edge | Supabase Edge |
|----------|-------------|---------------|
| **Latência** | ~5ms (global edge) | ~20-50ms |
| **Cold start** | ~0ms | ~100-500ms |
| **Limite de tempo** | 30s | 5min |
| **Deploy** | Automático com Vercel | Manual `supabase functions deploy` |
| **Custo** | Incluído no Vercel | $2/milhão de invocações |
| **CORS** | Simples | Mais config |

### Decisão: **USE VERCEL EDGE FUNCTIONS**

Motivos:
1. Você já usa Vercel para hosting
2. Deploy automático a cada push
3. Menor latência
4. Já está implementado em `/api/ai/`

---

## 4. ARQUITETURA RECOMENDADA

```
┌─────────────────────┐
│    Frontend         │
│  CreatorStudioPage  │
└──────────┬──────────┘
           │
           │ POST /api/ai/image
           │ POST /api/ai/video
           │ POST /api/ai/voice
           │
           ▼
┌─────────────────────┐
│  Vercel Edge        │
│  /api/ai/*.ts       │
├─────────────────────┤
│ • Rate Limiting     │
│ • Circuit Breaker   │
│ • Retry Logic       │
│ • API Key Storage   │
│ • Logging           │
│ • Validation        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   External APIs     │
├─────────────────────┤
│ • FAL.ai            │
│ • OpenAI            │
│ • Freepik           │
│ • ElevenLabs        │
│ • Google Gemini     │
└─────────────────────┘
```

---

## 5. PLANO DE AÇÃO

### Fase 1: Configurar Environment Variables (IMEDIATO)

No Vercel Dashboard, adicionar:

```env
FREEPIK_API_KEY=FPSX...
FALAI_API_KEY=...
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
GEMINI_API_KEY=AIza...
```

### Fase 2: Atualizar Edge Functions

Os arquivos em `/api/ai/` já estão prontos! Apenas precisam:
1. Suportar mais modelos FAL.ai
2. Adicionar Google Gemini

### Fase 3: Atualizar Frontend

Mudar de chamadas diretas para usar as Edge Functions:

**ANTES (inseguro):**
```typescript
await fetch('https://fal.run/fal-ai/flux/schnell', {
  headers: { 'Authorization': `Key ${apiConfig.falai_key}` }
});
```

**DEPOIS (seguro):**
```typescript
await fetch('/api/ai/image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'falai',
    model: 'flux-schnell',
    prompt: imagePrompt,
    numImages: numImages,
    size: imageSize,
  }),
});
```

---

## 6. BENEFÍCIOS

| Benefício | Descrição |
|-----------|-----------|
| **Segurança** | API keys nunca expostas ao cliente |
| **Escalabilidade** | Edge global, rate limiting automático |
| **Resiliência** | Circuit breaker protege contra falhas |
| **Monitoramento** | Logs estruturados para debug |
| **Flexibilidade** | Fácil trocar providers sem mudar frontend |
| **Compliance** | Pronto para LGPD (logs de uso) |

---

## 7. ESTIMATIVA DE CUSTOS

### FAL.ai (Recomendado para imagens)
- Flux Schnell: $0.003/imagem
- Flux Dev: $0.025/imagem
- Flux Pro: $0.05/imagem

### OpenAI
- DALL-E 3: $0.04/imagem (1024x1024)
- DALL-E 2: $0.02/imagem

### Vercel Edge
- Incluído no plano (até 100K req/mês grátis)

---

## 8. PRÓXIMOS PASSOS

1. [ ] Configurar env vars no Vercel
2. [ ] Atualizar `/api/ai/image.ts` com modelos FAL.ai
3. [ ] Refatorar `CreatorStudioPage.tsx` para usar Edge Functions
4. [ ] Testar em desenvolvimento
5. [ ] Deploy e monitorar logs

---

## CONCLUSÃO

**A infraestrutura já existe e está bem feita.** O problema é que o frontend está bypassando ela e fazendo chamadas diretas.

A solução é simples: **fazer o frontend usar as Edge Functions que já existem**.

Isso resolve:
- Segurança (API keys no servidor)
- CORS (servidor pode chamar qualquer API)
- Escalabilidade (rate limiting, circuit breaker)
- Monitoramento (logs estruturados)
