// API Route: AI Tools (Freepik)
// Runtime: Node.js (Vercel Serverless)

import type { VercelRequest, VercelResponse } from '@vercel/node';

const FREEPIK_TOOLS: Record<string, string> = {
  'upscale': '/ai/image-upscaler',
  'remove-bg': '/ai/beta/remove-background',
  'relight': '/ai/image-relight',
  'style-transfer': '/ai/image-style-transfer',
  'reimagine': '/ai/reimagine',
  'recolor': '/ai/recolor',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { tool, image, prompt, options = {}, apiKey: bodyApiKey } = req.body;

    if (!tool) {
      return res.status(400).json({ success: false, error: 'tool é obrigatório' });
    }

    const apiKey = process.env.FREEPIK_API_KEY || (req.headers['x-api-key'] as string) || bodyApiKey;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Freepik API key não configurada.' });
    }

    const endpoint = FREEPIK_TOOLS[tool];
    if (!endpoint) {
      return res.status(400).json({ success: false, error: `Tool ${tool} não suportada` });
    }

    // Build request body
    let requestBody: Record<string, any> = {};
    const imageBase64 = image?.startsWith('data:') ? image.split(',')[1] : image;

    switch (tool) {
      case 'upscale':
        requestBody = { image: imageBase64, scale: options.scale || 4, creativity: 0.3 };
        break;
      case 'remove-bg':
        requestBody = { image: imageBase64 };
        break;
      case 'relight':
        requestBody = { image: imageBase64, light_source: options.lightSource || 'left' };
        break;
      case 'style-transfer':
        const styleBase64 = options.styleImage?.startsWith('data:') ? options.styleImage.split(',')[1] : options.styleImage;
        requestBody = { image: imageBase64, style_image: styleBase64 };
        break;
      case 'reimagine':
        requestBody = { image: imageBase64, prompt: prompt || '', mode: 'creative', strength: 0.7 };
        break;
      case 'recolor':
        requestBody = { image: imageBase64, prompt: prompt || '' };
        break;
    }

    // Submit task
    const fpRes = await fetch(`https://api.freepik.com/v1${endpoint}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-freepik-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!fpRes.ok) {
      const error = await fpRes.json().catch(() => ({}));
      throw new Error(error.message || `Freepik error ${fpRes.status}`);
    }

    let result = await fpRes.json();

    // Poll for async tasks
    if (result.data?.id && result.data?.status !== 'COMPLETED') {
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        
        const statusRes = await fetch(`https://api.freepik.com/v1${endpoint}/${result.data.id}`, {
          headers: { 'Accept': 'application/json', 'x-freepik-api-key': apiKey },
        });
        
        const statusData = await statusRes.json();
        
        if (statusData.data?.status === 'COMPLETED') {
          result = statusData;
          break;
        }
        if (statusData.data?.status === 'FAILED') {
          throw new Error('Processing failed');
        }
      }
    }

    const resultUrl = result.data?.generated?.[0]?.url || result.data?.image?.url || '';

    return res.status(200).json({
      success: true,
      data: { url: resultUrl, result: resultUrl, tool },
    });

  } catch (error: any) {
    console.error('[Tools API Error]', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Erro interno' });
  }
}
