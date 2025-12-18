export interface GenerateImageParams {
  prompt: string;
  negativePrompt?: string;
  style?: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
  numImages?: number;
}

export interface GenerateImageResult {
  images: string[];
  width: number;
  height: number;
  metadata: {
    provider: string;
    model: string;
    tokensUsed?: number;
    processingTimeMs?: number;
  };
}

export interface GenerateVideoParams {
  sourceImage?: string;
  imageUrl?: string;
  motionPrompt?: string;
  duration?: number;
  aspectRatio?: string;
}

export interface GenerateVideoResult {
  videoUrl: string;
  durationSeconds: number;
  metadata: {
    provider: string;
    model: string;
  };
}

export interface GenerateAudioParams {
  text: string;
  voiceId?: string;
  language?: string;
}

export interface GenerateAudioResult {
  audioUrl: string;
  durationSeconds: number;
  metadata: {
    provider: string;
    model: string;
  };
}

export abstract class BaseAIProvider {
  protected apiKey: string;
  protected model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  abstract generateImage(params: GenerateImageParams): Promise<GenerateImageResult>;

  generateVideo?(params: GenerateVideoParams): Promise<GenerateVideoResult>;

  generateAudio?(params: GenerateAudioParams): Promise<GenerateAudioResult>;

  abstract validateApiKey(): Promise<boolean>;

  abstract getAvailableModels(): Promise<string[]>;

  protected getProviderName(): string {
    return this.constructor.name.replace('Provider', '').toLowerCase();
  }
}

export default BaseAIProvider;
