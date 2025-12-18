import axios from 'axios';
import {
  BaseAIProvider,
  GenerateImageParams,
  GenerateImageResult,
} from './base.provider.js';

export class OpenAIProvider extends BaseAIProvider {
  private baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey: string, model: string = 'dall-e-3') {
    super(apiKey, model);
  }

  async generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
    const { prompt, aspectRatio = '1:1', numImages = 1 } = params;

    const isDalle3 = this.model === 'dall-e-3' || this.model === 'dall-e-3-hd';

    const sizeMap: Record<string, string> = {
      '1:1': '1024x1024',
      '16:9': '1792x1024',
      '9:16': '1024x1792',
      '4:3': '1024x1024',
      '3:4': '1024x1024',
    };

    const size = isDalle3 ? (sizeMap[aspectRatio] || '1024x1024') : '1024x1024';
    const [width, height] = size.split('x').map(Number);

    const startTime = Date.now();

    const response = await axios.post(
      `${this.baseUrl}/images/generations`,
      {
        model: isDalle3 ? 'dall-e-3' : 'dall-e-2',
        prompt,
        n: isDalle3 ? 1 : Math.min(numImages, 4),
        size,
        quality: this.model === 'dall-e-3-hd' ? 'hd' : 'standard',
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      }
    );

    const processingTime = Date.now() - startTime;
    const images = response.data.data?.map((img: any) => img.url) || [];

    return {
      images,
      width,
      height,
      metadata: {
        provider: 'openai',
        model: this.model,
        processingTimeMs: processingTime,
      },
    };
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        timeout: 10000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return ['dall-e-2', 'dall-e-3', 'dall-e-3-hd'];
  }
}

export default OpenAIProvider;
