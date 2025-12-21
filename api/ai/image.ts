// API Route: AI Image Generation
// Runtime: Node.js (Vercel Serverless)
// Providers: FAL.ai, OpenAI, Google

import type { VercelRequest, VercelResponse } from '@vercel/node';

// FAL.ai models
const FALAI_MODELS: Record<string, string> = {
  'flux-schnell': 'fal-ai/flux/schnell',
  'flux-dev': 'fal-ai/flux/dev',
  'flux-pro': 'fal-ai/flux-pro/v1.1',
  'flux-realism': 'fal-ai/flux-realism',
  'sdxl': 'fal-ai/fast-sdxl',
  'ideogram': 'fal-ai/ideogram/v2',
  'recraft': 'fal-ai/recraft-v3',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { provider, model, prompt, negativePrompt, numImages = 1, size = '1:1', apiKey: bodyApiKey } = req.body;

    if (!provider || !prompt) {
      return res.status(400).json({ success: false, error: 'provider e prompt são obrigatórios' });
    }

    // Get API key: env > header > body
    const getApiKey = (prov: string): string => {
      const envKeys: Record<string, string | undefined> = {
        falai: process.env.FALAI_API_KEY,
        openai: process.env.OPENAI_API_KEY,
        google: process.env.GEMINI_API_KEY,
      };
      return envKeys[prov] || (req.headers['x-api-key'] as string) || bodyApiKey || '';
    };

    const apiKey = getApiKey(provider);
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        error: `API Key do ${provider} não configurada. Configure nas variáveis de ambiente do Vercel.` 
      });
    }

    let images: string[] = [];

    // ============ FAL.AI ============
    if (provider === 'falai') {
      const falModel = FALAI_MODELS[model] || FALAI_MODELS['flux-schnell'];
      
      const sizeMap: Record<string, string> = {
        '1:1': 'square', '16:9': 'landscape_16_9', '9:16': 'portrait_9_16',
        '4:3': 'landscape_4_3', '3:4': 'portrait_4_3',
      };

      const requestBody: Record<string, any> = {
        prompt,
        num_images: numImages,
        image_size: sizeMap[size] || 'square',
        enable_safety_checker: true,
        num_inference_steps: falModel.includes('schnell') ? 4 : 28,
      };

      if (negativePrompt) requestBody.negative_prompt = negativePrompt;

      const falRes = await fetch(`https://fal.run/${falModel}`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!falRes.ok) {
        const error = await falRes.json().catch(() => ({}));
        throw new Error(error.detail || error.message || `FAL.ai error ${falRes.status}`);
      }

      const falData = await falRes.json();
      images = falData.images?.map((img: any) => img.url) || [];
    }

    // ============ OPENAI DALL-E ============
    else if (provider === 'openai') {
      const isDalle3 = model === 'dall-e-3';
      const sizeMap: Record<string, string> = {
        '1:1': '1024x1024', '16:9': '1792x1024', '9:16': '1024x1792',
      };

      const oaiRes = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: isDalle3 ? 'dall-e-3' : 'dall-e-2',
          prompt,
          n: isDalle3 ? 1 : Math.min(numImages, 4),
          size: sizeMap[size] || '1024x1024',
          quality: 'standard',
        }),
      });

      if (!oaiRes.ok) {
        const error = await oaiRes.json().catch(() => ({}));
        throw new Error(error.error?.message || `OpenAI error ${oaiRes.status}`);
      }

      const oaiData = await oaiRes.json();
      images = oaiData.data?.map((img: any) => img.url) || [];
    }

    // ============ GOOGLE GEMINI ============
    else if (provider === 'google') {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
          }),
        }
      );

      if (!geminiRes.ok) {
        const error = await geminiRes.json().catch(() => ({}));
        throw new Error(error.error?.message || `Google error ${geminiRes.status}`);
      }

      const geminiData = await geminiRes.json();
      if (geminiData.candidates?.[0]?.content?.parts) {
        for (const part of geminiData.candidates[0].content.parts) {
          if (part.inlineData?.mimeType?.startsWith('image/')) {
            images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: { images, provider, model, count: images.length },
    });

  } catch (error: any) {
    console.error('[Image API Error]', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Erro interno' });
  }
}
