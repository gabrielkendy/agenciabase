// API Route: AI Voice Synthesis
// Runtime: Node.js (Vercel Serverless)
// Provider: ElevenLabs

import type { VercelRequest, VercelResponse } from '@vercel/node';

const VOICES: Record<string, string> = {
  'daniel-pt': 'onwK4e9ZLuTAKqWW03F9',
  'sarah-en': 'EXAVITQu4vr4xnSDxMaL',
  'rachel-en': '21m00Tcm4TlvDq8ikWAM',
  'adam-en': 'pNInz6obpgDQGcFmaJgB',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { text, voice, voiceId, stability = 0.5, similarityBoost = 0.75, apiKey: bodyApiKey } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: 'text é obrigatório' });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY || (req.headers['x-api-key'] as string) || bodyApiKey;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'ElevenLabs API key não configurada.' });
    }

    const resolvedVoiceId = voiceId || VOICES[voice] || VOICES['daniel-pt'];

    const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability, similarity_boost: similarityBoost },
      }),
    });

    if (!elRes.ok) {
      const error = await elRes.json().catch(() => ({}));
      throw new Error(error.detail?.message || `ElevenLabs error ${elRes.status}`);
    }

    const audioBuffer = await elRes.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    return res.status(200).json({
      success: true,
      data: {
        audio: `data:audio/mpeg;base64,${base64Audio}`,
        format: 'mp3',
        voiceId: resolvedVoiceId,
      },
    });

  } catch (error: any) {
    console.error('[Voice API Error]', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Erro interno' });
  }
}
