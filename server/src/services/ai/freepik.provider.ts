import { BaseAIProvider, GenerateImageParams, GenerateImageResult } from './base.provider.js';

export class FreepikProvider extends BaseAIProvider {
  private baseUrl = 'https://api.freepik.com/v1';

  constructor(apiKey: string, model: string = 'mystic') {
    super(apiKey, model);
  }

  async generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
    const startTime = Date.now();

    const response = await fetch(`${this.baseUrl}/ai/text-to-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-freepik-api-key': this.apiKey,
      },
      body: JSON.stringify({
        prompt: params.prompt,
        negative_prompt: params.negativePrompt,
        guidance_scale: 7.5,
        seed: Math.floor(Math.random() * 1000000),
        num_images: params.numImages || 1,
        image: {
          size: this.getSize(params.aspectRatio),
        },
        styling: {
          style: params.style || 'photo',
          color: 'vibrant',
          lightning: 'natural',
          framing: 'portrait',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error((error as any).message || `Freepik API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const processingTime = Date.now() - startTime;

    return {
      images: data.data?.map((img: any) => img.base64) || [],
      width: params.width || 1024,
      height: params.height || 1024,
      metadata: {
        provider: 'freepik',
        model: this.model,
        processingTimeMs: processingTime,
      },
    };
  }

  private getSize(aspectRatio?: string): string {
    const sizes: Record<string, string> = {
      '1:1': 'square_1_1',
      '16:9': 'widescreen_16_9',
      '9:16': 'portrait_9_16',
      '4:3': 'landscape_4_3',
      '3:4': 'portrait_3_4',
    };
    return sizes[aspectRatio || '1:1'] || 'square_1_1';
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: { 'x-freepik-api-key': this.apiKey },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return ['mystic', 'flux-dev', 'flux-schnell', 'seedream'];
  }
}

export default FreepikProvider;
