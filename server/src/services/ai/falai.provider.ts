import axios from 'axios';
import {
  BaseAIProvider,
  GenerateImageParams,
  GenerateImageResult,
  GenerateVideoParams,
  GenerateVideoResult,
} from './base.provider.js';

// FAL.ai models mapping
const FALAI_IMAGE_MODELS: Record<string, string> = {
  'flux-schnell': 'fal-ai/flux/schnell',
  'flux-dev': 'fal-ai/flux/dev',
  'flux-pro': 'fal-ai/flux-pro/v1.1',
  'flux-realism': 'fal-ai/flux-realism',
  'sdxl': 'fal-ai/fast-sdxl',
  'ideogram': 'fal-ai/ideogram/v2',
  'recraft': 'fal-ai/recraft-v3',
};

const FALAI_VIDEO_MODELS: Record<string, string> = {
  'kling-pro': 'fal-ai/kling-video/v1.6/pro/image-to-video',
  'kling-standard': 'fal-ai/kling-video/v1.6/standard/image-to-video',
  'minimax': 'fal-ai/minimax/video-01/image-to-video',
  'luma-ray2': 'fal-ai/luma-dream-machine/ray-2',
  'fast-svd': 'fal-ai/fast-svd-lcm',
  'stable-video': 'fal-ai/stable-video',
};

export class FalAIProvider extends BaseAIProvider {
  private baseUrl = 'https://fal.run';

  constructor(apiKey: string, model: string = 'flux-schnell') {
    super(apiKey, model);
  }

  async generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
    const { prompt, negativePrompt, aspectRatio = '1:1', numImages = 1 } = params;

    const falModel = FALAI_IMAGE_MODELS[this.model] || FALAI_IMAGE_MODELS['flux-schnell'];

    // Map size to FAL.ai format
    const sizeMap: Record<string, string> = {
      '1:1': 'square',
      '16:9': 'landscape_16_9',
      '9:16': 'portrait_9_16',
      '4:3': 'landscape_4_3',
      '3:4': 'portrait_4_3',
    };

    const requestBody: Record<string, unknown> = {
      prompt,
      num_images: numImages,
      image_size: sizeMap[aspectRatio] || 'square',
      enable_safety_checker: true,
    };

    // Model-specific settings
    if (falModel.includes('schnell')) {
      requestBody.num_inference_steps = 4;
    } else if (falModel.includes('dev')) {
      requestBody.num_inference_steps = 28;
      requestBody.guidance_scale = 3.5;
    } else if (falModel.includes('pro')) {
      requestBody.num_inference_steps = 25;
      requestBody.guidance_scale = 3.0;
    } else if (falModel.includes('ideogram')) {
      requestBody.style = 'auto';
      requestBody.magic_prompt_option = 'auto';
    } else if (falModel.includes('recraft')) {
      requestBody.style = 'realistic_image';
    }

    if (negativePrompt) {
      requestBody.negative_prompt = negativePrompt;
    }

    const startTime = Date.now();

    const response = await axios.post(
      `${this.baseUrl}/${falModel}`,
      requestBody,
      {
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000, // 2 minutos
      }
    );

    const processingTime = Date.now() - startTime;
    const images = response.data.images?.map((img: any) => img.url) || [];

    // Get dimensions from first image or default
    const firstImage = response.data.images?.[0];
    const width = firstImage?.width || 1024;
    const height = firstImage?.height || 1024;

    return {
      images,
      width,
      height,
      metadata: {
        provider: 'falai',
        model: this.model,
        processingTimeMs: processingTime,
      },
    };
  }

  async generateVideo(params: GenerateVideoParams): Promise<GenerateVideoResult> {
    const { sourceImage, motionPrompt = 'Smooth natural motion', duration = 5 } = params;

    const falModel = FALAI_VIDEO_MODELS[this.model] || FALAI_VIDEO_MODELS['fast-svd'];

    let requestBody: Record<string, unknown>;

    if (falModel.includes('kling')) {
      requestBody = {
        image_url: sourceImage,
        prompt: motionPrompt,
        duration: String(duration),
        aspect_ratio: '16:9',
      };
    } else if (falModel.includes('minimax') || falModel.includes('luma')) {
      requestBody = {
        image_url: sourceImage,
        prompt: motionPrompt,
      };
    } else {
      // SVD and other models
      requestBody = {
        image_url: sourceImage,
        motion_bucket_id: 127,
        fps: 7,
        cond_aug: 0.02,
      };
    }

    const response = await axios.post(
      `${this.baseUrl}/${falModel}`,
      requestBody,
      {
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 300000, // 5 minutos
      }
    );

    const videoUrl = response.data.video?.url || response.data.video_url || response.data.output?.video || '';

    return {
      videoUrl,
      durationSeconds: duration,
      metadata: {
        provider: 'falai',
        model: this.model,
      },
    };
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Try a minimal request to validate the key
      const response = await axios.get('https://fal.ai/api/user', {
        headers: {
          'Authorization': `Key ${this.apiKey}`,
        },
        timeout: 10000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return [
      ...Object.keys(FALAI_IMAGE_MODELS),
      ...Object.keys(FALAI_VIDEO_MODELS),
    ];
  }
}

export default FalAIProvider;
