// =============================================================================
// BASE AGENCY - SERVIDOR EXPRESS
// =============================================================================
// Serve: Frontend React (dist/) + APIs seguras (/api/*)
// Runtime: Node.js
// Deploy: Render
// =============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Importar rotas
import aiRoutes from './routes/ai.js';
import healthRoutes from './routes/health.js';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração de diretórios
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIST_PATH = join(__dirname, '..', 'dist');

// Criar aplicação Express
const app = express();
const PORT = process.env.PORT || 3001;

// =============================================================================
// MIDDLEWARES
// =============================================================================

// CORS - Permitir requisições do frontend
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://agenciabase.tech', 'https://www.agenciabase.tech']
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true
}));

// Segurança
app.use(helmet({
  contentSecurityPolicy: false, // Desabilitar para permitir inline scripts do React
  crossOriginEmbedderPolicy: false
}));

// Compressão GZIP
app.use(compression());

// Parse JSON (limite maior para uploads base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Log de requisições (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// =============================================================================
// ROTAS DA API
// =============================================================================

// API Routes
app.use('/api/ai', aiRoutes);
app.use('/api', healthRoutes);

// =============================================================================
// SERVIR FRONTEND (Arquivos estáticos)
// =============================================================================

// Servir arquivos estáticos do build do React
app.use(express.static(DIST_PATH, {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true
}));

// Fallback para SPA - todas as rotas não-API vão para index.html
app.get('*', (req, res) => {
  // Se for uma rota de API que não existe, retornar 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      success: false, 
      error: 'Endpoint não encontrado' 
    });
  }
  
  // Para todas as outras rotas, servir o index.html (SPA)
  res.sendFile(join(DIST_PATH, 'index.html'));
});

// =============================================================================
// TRATAMENTO DE ERROS
// =============================================================================

// Handler de erros global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor' 
      : err.message
  });
});

// =============================================================================
// INICIAR SERVIDOR
// =============================================================================

app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🚀 BASE AGENCY - Servidor iniciado');
  console.log('='.repeat(60));
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Frontend: ${DIST_PATH}`);
  console.log('='.repeat(60));
  console.log('');
  console.log('📡 APIs disponíveis:');
  console.log('   POST /api/ai/image   - Geração de imagem');
  console.log('   POST /api/ai/video   - Geração de vídeo');
  console.log('   POST /api/ai/chat    - Chat com IA');
  console.log('   POST /api/ai/voice   - Síntese de voz');
  console.log('   POST /api/ai/tools   - Ferramentas de edição');
  console.log('   GET  /api/health     - Health check');
  console.log('='.repeat(60));
});

export default app;
