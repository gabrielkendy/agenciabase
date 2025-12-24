// =============================================================================
// AI ROUTES - Todas as rotas de IA
// =============================================================================

import { Router, Request, Response } from 'express';
import { 
  generateImage, 
  generateVideo, 
  chatWithAI, 
  synthesizeVoice, 
  processAITool 
} from '../services/index.js';

const router = Router();

// =============================================================================
// POST /api/ai/image - Geração de Imagem
// Providers: FAL.ai, OpenAI, Google
// =============================================================================
router.post('/image', async (req: Request, res: Response) => {
  try {
    const { provider, model, prompt, negativePrompt, numImages, size } = req.body;

    if (!provider || !prompt) {
      return res.status(400).json({ 
        success: false, 
        error: 'provider e prompt são obrigatórios' 
      });
    }

    const result = await generateImage({
      provider,
      model,
      prompt,
      negativePrompt,
      numImages: numImages || 1,
      size: size || '1:1'
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[/api/ai/image ERROR]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


// =============================================================================
// POST /api/ai/video - Geração de Vídeo
// Provider: FAL.ai
// =============================================================================
router.post('/video', async (req: Request, res: Response) => {
  try {
    const { model, image, prompt, duration } = req.body;

    if (!image) {
      return res.status(400).json({ 
        success: false, 
        error: 'image é obrigatório' 
      });
    }

    const result = await generateVideo({
      model: model || 'kling-standard',
      image,
      prompt,
      duration: duration || 5
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[/api/ai/video ERROR]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================================================
// POST /api/ai/chat - Chat com IA
// Providers: Gemini, OpenRouter, OpenAI
// =============================================================================
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { provider, message, systemPrompt, history, model, temperature } = req.body;

    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'message é obrigatório' 
      });
    }

    const result = await chatWithAI({
      provider: provider || 'gemini',
      message,
      systemPrompt,
      history: history || [],
      model,
      temperature: temperature || 0.7
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[/api/ai/chat ERROR]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


// =============================================================================
// POST /api/ai/voice - Síntese de Voz
// Provider: ElevenLabs
// =============================================================================
router.post('/voice', async (req: Request, res: Response) => {
  try {
    const { text, voice, voiceId, stability, similarityBoost } = req.body;

    if (!text) {
      return res.status(400).json({ 
        success: false, 
        error: 'text é obrigatório' 
      });
    }

    const result = await synthesizeVoice({
      text,
      voice,
      voiceId,
      stability: stability || 0.5,
      similarityBoost: similarityBoost || 0.75
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[/api/ai/voice ERROR]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================================================
// POST /api/ai/tools - Ferramentas de IA (Freepik)
// Tools: upscale, remove-bg, relight, style-transfer, reimagine, recolor
// =============================================================================
router.post('/tools', async (req: Request, res: Response) => {
  try {
    const { tool, image, prompt, options } = req.body;

    if (!tool) {
      return res.status(400).json({ 
        success: false, 
        error: 'tool é obrigatório' 
      });
    }

    const result = await processAITool({
      tool,
      image,
      prompt,
      options: options || {}
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[/api/ai/tools ERROR]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
