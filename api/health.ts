// API Route: Health Check
// Test endpoint to verify API is working

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  return res.status(200).json({ 
    success: true, 
    message: 'API funcionando!',
    timestamp: new Date().toISOString(),
    env: {
      hasGemini: !!process.env.GEMINI_API_KEY,
      hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasFalAI: !!process.env.FALAI_API_KEY,
      hasElevenLabs: !!process.env.ELEVENLABS_API_KEY,
      hasFreepik: !!process.env.FREEPIK_API_KEY,
      hasLate: !!process.env.LATE_API_KEY,
    }
  });
}
