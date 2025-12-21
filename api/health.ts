// API Route: Health Check
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const envStatus = {
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    FALAI_API_KEY: !!process.env.FALAI_API_KEY,
    ELEVENLABS_API_KEY: !!process.env.ELEVENLABS_API_KEY,
    FREEPIK_API_KEY: !!process.env.FREEPIK_API_KEY,
    LATE_API_KEY: !!process.env.LATE_API_KEY,
  };

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: envStatus,
    allConfigured: Object.values(envStatus).every(v => v),
  });
}
