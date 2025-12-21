// API Route: AI Video Generation
// Runtime: Node.js (Vercel Serverless)
// Provider: FAL.ai

import type { VercelRequest, VercelResponse } from '@vercel/node';

const VIDEO_MODELS: Record<string, string> = {
  'kling-pro': 'fal-ai/kling-video/v1.6/pro/image-to-video',
  'kling-standard': 'fal-ai/kling-video/v1/standard/image-to-video',
  'minimax': 'fal-ai/minimax-video/image-to-video',
  'luma-ray2': 'fal-ai/luma-dream-machine/ray-2',
  'svd': 'fal-ai/stable-video',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { model, image, prompt, duration = 5, apiKey: bodyApiKey } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, error: 'image é obrigatório' });
    }

    // Get API key
    const apiKey = process.env.FALAI_API_KEY || (req.headers['x-api-key'] as string) || bodyApiKey;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'FAL.ai API key não configurada.' });
    }

    const falModel = VIDEO_MODELS[model] || VIDEO_MODELS['kling-standard'];

    const requestBody: Record<string, any> = {
      image_url: image,
      prompt: prompt || 'Smooth natural motion, cinematic',
      duration: String(duration),
    };

    // Start generation
    const submitRes = await fetch(`https://queue.fal.run/${falModel}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!submitRes.ok) {
      const error = await submitRes.json().catch(() => ({}));
      throw new Error(error.detail || `FAL.ai error ${submitRes.status}`);
    }

    const submitData = await submitRes.json();
    const requestId = submitData.request_id;

    if (!requestId) throw new Error('No request_id returned');

    // Poll for completion (max 120s)
    let videoUrl = '';
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000));

      const statusRes = await fetch(`https://queue.fal.run/${falModel}/requests/${requestId}/status`, {
        headers: { 'Authorization': `Key ${apiKey}` },
      });

      const statusData = await statusRes.json();

      if (statusData.status === 'COMPLETED') {
        const resultRes = await fetch(`https://queue.fal.run/${falModel}/requests/${requestId}`, {
          headers: { 'Authorization': `Key ${apiKey}` },
        });
        const resultData = await resultRes.json();
        videoUrl = resultData.video?.url || '';
        break;
      }

      if (statusData.status === 'FAILED') {
        throw new Error('Video generation failed');
      }
    }

    if (!videoUrl) throw new Error('Video generation timeout');

    return res.status(200).json({
      success: true,
      data: { videoUrl, model, duration },
    });

  } catch (error: any) {
    console.error('[Video API Error]', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Erro interno' });
  }
}
