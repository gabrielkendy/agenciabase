import axios from 'axios';
import {
  BaseAIProvider,
  GenerateImageParams,
  GenerateImageResult,
} from './base.provider.js';

export class GoogleProvider extends BaseAIProvider {
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string, model: string = 'imagen-3') {
    super(apiKey, model);
  }

  async generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
    const { prompt, aspectRatio = '1:1', numImages = 1 } = params;

    const aspectRatioMap: Record<string, string> = {
      '1:1': '1:1',
      '16:9': '16:9',
      '9:16': '9:16',
      '4:3': '4:3',
      '3:4': '3:4',
    };

    const startTime = Date.now();

    const response = await axios.post(
      `${this.baseUrl}/models/imagen-3.0-generate-001:predict?key=${this.apiKey}`,
      {
        instances: [{ prompt }],
        parameters: {
          sampleCount: numImages,
          aspectRatio: aspectRatioMap[aspectRatio] || '1:1',
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      }
    );

    const processingTime = Date.now() - startTime;

    // Gemini returns images as base64
    const images: string[] = [];
    if (response.data.predictions) {
      for (const prediction of response.data.predictions) {
        if (prediction.bytesBase64Encoded) {
          images.push(`data:image/png;base64,${prediction.bytesBase64Encoded}`);
        }
      }
    }

    // Calculate dimensions based on aspect ratio
    const dimensions: Record<string, { width: number; height: number }> = {
      '1:1': { width: 1024, height: 1024 },
      '16:9': { width: 1792, height: 1024 },
      '9:16': { width: 1024, height: 1792 },
      '4:3': { width: 1024, height: 768 },
      '3:4': { width: 768, height: 1024 },
    };

    const { width, height } = dimensions[aspectRatio] || dimensions['1:1'];

    return {
      images,
      width,
      height,
      metadata: {
        provider: 'google',
        model: this.model,
        processingTimeMs: processingTime,
      },
    };
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/models?key=${this.apiKey}`,
        { timeout: 10000 }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return ['imagen-3'];
  }
}

export default GoogleProvider;
