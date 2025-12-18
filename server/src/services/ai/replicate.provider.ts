import { BaseAIProvider, GenerateImageParams, GenerateImageResult, GenerateVideoParams, GenerateVideoResult } from './base.provider.js';

export class ReplicateProvider extends BaseAIProvider {
  private baseUrl = 'https://api.replicate.com/v1';

  constructor(apiKey: string, model: string = 'sdxl') {
    super(apiKey, model);
  }

  async generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
    const startTime = Date.now();

    // Create prediction
    const createResponse = await fetch(`${this.baseUrl}/predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${this.apiKey}`,
      },
      body: JSON.stringify({
        version: this.getModelVersion(),
        input: {
          prompt: params.prompt,
          negative_prompt: params.negativePrompt || '',
          width: params.width || 1024,
          height: params.height || 1024,
          num_outputs: params.numImages || 1,
          guidance_scale: 7.5,
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json().catch(() => ({}));
      throw new Error((error as any).detail || `Replicate API error: ${createResponse.status}`);
    }

    const prediction = await createResponse.json() as any;

    // Poll for completion
    const result = await this.pollPrediction(prediction.id);
    const processingTime = Date.now() - startTime;

    return {
      images: Array.isArray(result.output) ? result.output : [result.output],
      width: params.width || 1024,
      height: params.height || 1024,
      metadata: {
        provider: 'replicate',
        model: this.model,
        processingTimeMs: processingTime,
      },
    };
  }

  async generateVideo(params: GenerateVideoParams): Promise<GenerateVideoResult> {
    const startTime = Date.now();

    const createResponse = await fetch(`${this.baseUrl}/predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${this.apiKey}`,
      },
      body: JSON.stringify({
        version: this.getVideoModelVersion(),
        input: {
          image: params.sourceImage || params.imageUrl,
          prompt: params.motionPrompt || '',
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json().catch(() => ({}));
      throw new Error((error as any).detail || `Replicate API error: ${createResponse.status}`);
    }

    const prediction = await createResponse.json() as any;
    const result = await this.pollPrediction(prediction.id);
    const processingTime = Date.now() - startTime;

    return {
      videoUrl: Array.isArray(result.output) ? result.output[0] : result.output,
      durationSeconds: params.duration || 4,
      metadata: {
        provider: 'replicate',
        model: this.model,
      },
    };
  }

  private async pollPrediction(id: string, maxAttempts = 60): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`${this.baseUrl}/predictions/${id}`, {
        headers: { 'Authorization': `Token ${this.apiKey}` },
      });

      const prediction = await response.json() as any;

      if (prediction.status === 'succeeded') {
        return prediction;
      }

      if (prediction.status === 'failed') {
        throw new Error(prediction.error || 'Prediction failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Prediction timeout');
  }

  private getModelVersion(): string {
    const versions: Record<string, string> = {
      'sdxl': 'stability-ai/sdxl:c221b2b8ef527988fb59bf24a8b97c4561f1c671f73bd389f866bfb27c061316',
      'flux-schnell': 'black-forest-labs/flux-schnell',
      'flux-dev': 'black-forest-labs/flux-dev',
    };
    return versions[this.model] || versions['sdxl'];
  }

  private getVideoModelVersion(): string {
    return 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438';
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/account`, {
        headers: { 'Authorization': `Token ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return ['sdxl', 'flux-schnell', 'flux-dev', 'stable-video-diffusion'];
  }
}

export default ReplicateProvider;
