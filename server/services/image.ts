// =============================================================================
// IMAGE SERVICE - Geração de Imagens
// Providers: FAL.ai, OpenAI, Google Gemini
// =============================================================================

const FALAI_MODELS: Record<string, string> = {
  'flux-schnell': 'fal-ai/flux/schnell',
  'flux-dev': 'fal-ai/flux/dev',
  'flux-pro': 'fal-ai/flux-pro/v1.1',
  'flux-realism': 'fal-ai/flux-realism',
  'sdxl': 'fal-ai/fast-sdxl',
  'ideogram': 'fal-ai/ideogram/v2',
  'recraft': 'fal-ai/recraft-v3',
};

interface ImageParams {
  provider: 'falai' | 'openai' | 'google';
  model: string;
  prompt: string;
  negativePrompt?: string;
  numImages: number;
  size: string;
}

export async function generateImage(params: ImageParams) {
  const { provider, model, prompt, negativePrompt, numImages, size } = params;

  // Obter API key do ambiente
  const getApiKey = (prov: string): string => {
    const keys: Record<string, string | undefined> = {
      falai: process.env.FALAI_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      google: process.env.GEMINI_API_KEY,
    };
    return keys[prov] || '';
  };

  const apiKey = getApiKey(provider);
  if (!apiKey) {
    throw new Error(`API Key do ${provider} não configurada no servidor.`);
  }

  let images: string[] = [];

  // ============ FAL.AI ============
  if (provider === 'falai') {
    const falModel = FALAI_MODELS[model] || FALAI_MODELS['flux-schnell'];
    
    const sizeMap: Record<string, string> = {
      '1:1': 'square',
      '16:9': 'landscape_16_9',
      '9:16': 'portrait_9_16',
      '4:3': 'landscape_4_3',
      '3:4': 'portrait_4_3',
    };

    const requestBody: Record<string, any> = {
      prompt,
      num_images: numImages,
      image_size: sizeMap[size] || 'square',
      enable_safety_checker: true,
      num_inference_steps: falModel.includes('schnell') ? 4 : 28,
    };

    if (negativePrompt) {
      requestBody.negative_prompt = negativePrompt;
    }

    console.log(`[FAL.ai] Gerando imagem com ${falModel}`);

    const response = await fetch(`https://fal.run/${falModel}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || error.message || `FAL.ai error ${response.status}`);
    }

    const data = await response.json();
    images = data.images?.map((img: any) => img.url) || [];
  }


  // ============ OPENAI DALL-E ============
  else if (provider === 'openai') {
    const isDalle3 = model === 'dall-e-3';
    
    const sizeMap: Record<string, string> = {
      '1:1': '1024x1024',
      '16:9': '1792x1024',
      '9:16': '1024x1792',
    };

    console.log(`[OpenAI] Gerando imagem com ${isDalle3 ? 'DALL-E 3' : 'DALL-E 2'}`);

    const response = await fetch('https://api.openai.com/v1/images/generations', {
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

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenAI error ${response.status}`);
    }

    const data = await response.json();
    images = data.data?.map((img: any) => img.url) || [];
  }

  // ============ GOOGLE GEMINI ============
  else if (provider === 'google') {
    console.log('[Google] Gerando imagem com Gemini 2.0');

    const response = await fetch(
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

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Google error ${response.status}`);
    }

    const data = await response.json();
    if (data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        }
      }
    }

    if (images.length === 0) {
      throw new Error('Google Gemini não gerou imagem. Use FAL.ai (recomendado).');
    }
  }

  return { images, provider, model, count: images.length };
}
