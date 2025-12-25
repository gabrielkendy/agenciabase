// FAL.AI Service - Image & Video Generation
// https://fal.ai

export interface FalConfig {
  apiKey: string;
}

export interface ImageGenerationParams {
  prompt: string;
  negative_prompt?: string;
  image_size?: 'square_hd' | 'square' | 'portrait_4_3' | 'portrait_16_9' | 'landscape_4_3' | 'landscape_16_9';
  num_inference_steps?: number;
  guidance_scale?: number;
  num_images?: number;
  seed?: number;
  model?: string;
}

export interface ImageResult {
  url: string;
  width: number;
  height: number;
  content_type: string;
}

export interface VideoGenerationParams {
  prompt: string;
  negative_prompt?: string;
  duration?: number;
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  seed?: number;
}

export interface VideoResult {
  url: string;
  duration: number;
  width: number;
  height: number;
}

// Modelos disponíveis
export const FAL_MODELS = {
  // Image Generation
  FLUX_PRO: 'fal-ai/flux-pro',
  FLUX_DEV: 'fal-ai/flux/dev',
  FLUX_SCHNELL: 'fal-ai/flux/schnell',
  STABLE_DIFFUSION_XL: 'fal-ai/stable-diffusion-xl',
  REALVIS_XL: 'fal-ai/realvisxl',
  
  // Image Enhancement
  UPSCALER: 'fal-ai/esrgan',
  FACE_RESTORE: 'fal-ai/gfpgan',
  REMOVE_BG: 'fal-ai/remove-background',
  
  // Video Generation
  RUNWAY_GEN3: 'fal-ai/runway-gen3/turbo',
  STABLE_VIDEO: 'fal-ai/stable-video-diffusion',
  
  // Image to Image
  IMG2IMG: 'fal-ai/flux/dev/image-to-image',
  CONTROLNET: 'fal-ai/controlnet-sdxl',
} as const;

class FalAIService {
  private apiKey: string = '';
  private baseUrl = 'https://fal.run';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  private async request<T>(
    model: string,
    input: Record<string, unknown>,
    options?: { sync?: boolean }
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('FAL.AI API key não configurada');
    }

    // Usar endpoint síncrono por padrão para simplicidade
    const endpoint = options?.sync !== false ? `${this.baseUrl}/${model}` : `https://queue.fal.run/${model}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ============================================
  // IMAGE GENERATION
  // ============================================

  async generateImage(params: ImageGenerationParams): Promise<{ images: ImageResult[] }> {
    const model = params.model || FAL_MODELS.FLUX_DEV;
    
    return this.request(model, {
      prompt: params.prompt,
      negative_prompt: params.negative_prompt,
      image_size: params.image_size || 'landscape_4_3',
      num_inference_steps: params.num_inference_steps || 28,
      guidance_scale: params.guidance_scale || 3.5,
      num_images: params.num_images || 1,
      seed: params.seed,
    });
  }

  async generateWithFluxPro(prompt: string, options?: Partial<ImageGenerationParams>): Promise<ImageResult[]> {
    const result = await this.generateImage({
      ...options,
      prompt,
      model: FAL_MODELS.FLUX_PRO,
    });
    return result.images;
  }

  async generateQuick(prompt: string): Promise<ImageResult[]> {
    const result = await this.generateImage({
      prompt,
      model: FAL_MODELS.FLUX_SCHNELL,
      num_inference_steps: 4,
    });
    return result.images;
  }

  // ============================================
  // IMAGE TO IMAGE
  // ============================================

  async imageToImage(
    imageUrl: string,
    prompt: string,
    strength?: number
  ): Promise<{ images: ImageResult[] }> {
    return this.request(FAL_MODELS.IMG2IMG, {
      image_url: imageUrl,
      prompt,
      strength: strength || 0.75,
    });
  }

  // ============================================
  // IMAGE ENHANCEMENT
  // ============================================

  async upscaleImage(imageUrl: string, scale?: number): Promise<{ image: ImageResult }> {
    return this.request(FAL_MODELS.UPSCALER, {
      image_url: imageUrl,
      scale: scale || 2,
    });
  }

  async removeBackground(imageUrl: string): Promise<{ image: ImageResult }> {
    return this.request(FAL_MODELS.REMOVE_BG, {
      image_url: imageUrl,
    });
  }

  async restoreFace(imageUrl: string): Promise<{ image: ImageResult }> {
    return this.request(FAL_MODELS.FACE_RESTORE, {
      image_url: imageUrl,
    });
  }

  // ============================================
  // VIDEO GENERATION
  // ============================================

  async generateVideo(params: VideoGenerationParams): Promise<{ video: VideoResult }> {
    return this.request(FAL_MODELS.RUNWAY_GEN3, {
      prompt: params.prompt,
      negative_prompt: params.negative_prompt,
      duration: params.duration || 5,
      aspect_ratio: params.aspect_ratio || '16:9',
      seed: params.seed,
    });
  }

  async imageToVideo(
    imageUrl: string,
    motion_bucket_id?: number
  ): Promise<{ video: VideoResult }> {
    return this.request(FAL_MODELS.STABLE_VIDEO, {
      image_url: imageUrl,
      motion_bucket_id: motion_bucket_id || 127,
    });
  }

  // ============================================
  // HELPERS
  // ============================================

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getAvailableModels() {
    return FAL_MODELS;
  }
}

export const falAI = new FalAIService();
export default falAI;
