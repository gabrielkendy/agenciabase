// =============================================================================
// HEALTH CHECK ROUTE
// =============================================================================

import { Router } from 'express';

const router = Router();

// GET /api/health - Verificação de saúde do servidor
router.get('/health', (req, res) => {
  const healthData = {
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '5.0.0',
    services: {
      gemini: !!process.env.GEMINI_API_KEY,
      openrouter: !!process.env.OPENROUTER_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      falai: !!process.env.FALAI_API_KEY,
      elevenlabs: !!process.env.ELEVENLABS_API_KEY,
      freepik: !!process.env.FREEPIK_API_KEY,
      late: !!process.env.LATE_API_KEY,
    }
  };

  res.json(healthData);
});

export default router;
