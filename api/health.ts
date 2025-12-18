// Edge Function: Health Check
// Usado para monitoramento e load balancers
// Features: Structured Logging, Security Headers

import {
  structuredLog,
  successResponse,
  securityHeaders,
  generateRequestId,
} from './lib/edgeUtils';

export const config = {
  runtime: 'edge',
  regions: ['gru1', 'iad1', 'sfo1', 'fra1'],
};

export default async function handler(req: Request): Promise<Response> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Basic health info
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    region: process.env.VERCEL_REGION || 'unknown',
    environment: process.env.VERCEL_ENV || 'development',
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
  };

  // Check API keys availability (not values)
  const integrations = {
    gemini: !!process.env.GEMINI_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    freepik: !!process.env.FREEPIK_API_KEY,
    falai: !!process.env.FALAI_API_KEY,
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
    supabase: !!process.env.VITE_SUPABASE_URL,
  };

  const responseTime = Date.now() - startTime;

  structuredLog.info('health', 'check_complete', {
    region: health.region,
    environment: health.environment,
    integrationsConfigured: Object.values(integrations).filter(Boolean).length,
    requestId,
  });

  return successResponse(
    {
      ...health,
      integrations,
      responseTimeMs: responseTime,
    },
    {
      ...securityHeaders,
      'X-Request-ID': requestId,
      'Cache-Control': 'no-store',
    }
  );
}
