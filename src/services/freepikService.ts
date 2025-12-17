// Freepik Mystic API Service
// Documentation: https://docs.freepik.com/mystic

import { tokenTracker } from '../lib/tokenTracker';

export interface FreepikGenerationRequest {
  prompt: string;
  negative_prompt?: string;
  guidance_scale?: number; // 1-20, default 7.5
  seed?: number;
  num_images?: number; // 1-4
  image?: {
    size?: 'square_1_1' | 'classic_4_3' | 'traditional_3_4' | 'widescreen_16_9' | 'portrait_9_16';
  };
  styling?: {
    style?: 'anime' | 'photo' | 'digital-art' | '3d' | 'fine-art' | 'surrealist' | 'dark' | 'vector' | 'mockup';
    color?: 'vibrant' | 'pastel' | 'warm' | 'cold' | 'black_white' | 'dark' | 'colorful';
    lightning?: 'studio' | 'warm' | 'cinematic' | 'low-light' | 'epic' | 'golden-hour' | 'dramatic' | 'hard-flash';
    framing?: 'portrait' | 'close-up' | 'full-body' | 'headshot' | 'cinematic' | 'landscape-photo' | 'product-shot' | 'abstract';
  };
  // Mystic v2 features
  resolution?: '2k' | '4k';
  realism?: boolean; // Enable realistic style boost
  engine?: 'automatic' | 'magnific_illusio' | 'magnific_sharpy' | 'magnific_sparkle';
  creative_detailing?: number; // 0-100
}

export interface FreepikGenerationResponse {
  data: {
    id: string;
    status: 'CREATED' | 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    generated?: {
      url: string;
      content_type: string;
    }[];
  };
  meta: {
    credits_used: number;
    credits_remaining: number;
  };
}

export interface FreepikUpscaleRequest {
  image: string; // base64 or URL
  scale?: 2 | 4;
  creativity?: number; // 0-1
}

export interface FreepikReimaginedRequest {
  image: string; // base64 or URL
  prompt?: string;
  mode?: 'realistic' | 'creative';
  strength?: number; // 0-1
}

export interface FreepikRecolorRequest {
  image: string;
  prompt: string;
}

export interface FreepikSketchToImageRequest {
  image: string;
  prompt: string;
  style?: 'realistic' | 'artistic';
}

class FreepikService {
  private apiKey: string = '';
  private baseUrl = 'https://api.freepik.com/v1';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  private async request<T>(endpoint: string, method: 'GET' | 'POST', body?: any): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Freepik API key não configurada');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-freepik-api-key': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `Freepik API error: ${response.status}`);
    }

    return response.json();
  }

  // Generate image using Mystic model
  async generateImage(request: FreepikGenerationRequest): Promise<FreepikGenerationResponse> {
    return this.request('/ai/mystic', 'POST', request);
  }

  // Get generation status
  async getGenerationStatus(generationId: string): Promise<FreepikGenerationResponse> {
    return this.request(`/ai/mystic/${generationId}`, 'GET');
  }

  // Wait for generation to complete (polling)
  async waitForGeneration(generationId: string, maxAttempts = 30, interval = 2000): Promise<FreepikGenerationResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.getGenerationStatus(generationId);

      if (result.data.status === 'COMPLETED') {
        return result;
      }

      if (result.data.status === 'FAILED') {
        throw new Error('Geração falhou');
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error('Timeout aguardando geração');
  }

  // High-level method to generate and wait with tracking
  async generateAndWait(
    request: FreepikGenerationRequest,
    userId: string = 'anonymous',
    userName?: string
  ): Promise<string[]> {
    const startTime = performance.now();
    const imageCount = request.num_images || 1;

    try {
      const initial = await this.generateImage(request);
      const result = await this.waitForGeneration(initial.data.id);
      const responseTimeMs = Math.round(performance.now() - startTime);

      tokenTracker.trackImage({
        userId,
        userName,
        provider: 'freepik',
        model: 'mystic',
        imageCount,
        responseTimeMs,
        success: true
      });

      return result.data.generated?.map(g => g.url) || [];
    } catch (error) {
      const responseTimeMs = Math.round(performance.now() - startTime);
      tokenTracker.trackImage({
        userId,
        userName,
        provider: 'freepik',
        model: 'mystic',
        imageCount,
        responseTimeMs,
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw error;
    }
  }

  // Upscale image
  async upscaleImage(request: FreepikUpscaleRequest): Promise<FreepikGenerationResponse> {
    return this.request('/ai/upscaler', 'POST', request);
  }

  // Reimagine image
  async reimagineImage(request: FreepikReimaginedRequest): Promise<FreepikGenerationResponse> {
    return this.request('/ai/reimagine', 'POST', request);
  }

  // Recolor image
  async recolorImage(request: FreepikRecolorRequest): Promise<FreepikGenerationResponse> {
    return this.request('/ai/recolor', 'POST', request);
  }

  // Sketch to image
  async sketchToImage(request: FreepikSketchToImageRequest): Promise<FreepikGenerationResponse> {
    return this.request('/ai/sketch-to-image', 'POST', request);
  }

  // Remove background
  async removeBackground(image: string): Promise<FreepikGenerationResponse> {
    return this.request('/ai/remove-background', 'POST', { image });
  }

  // Relight image - change lighting conditions
  async relightImage(image: string, light_source: string = 'left'): Promise<FreepikGenerationResponse> {
    return this.request('/ai/relight', 'POST', { image, light_source });
  }

  // Style transfer
  async styleTransfer(image: string, style_image: string): Promise<FreepikGenerationResponse> {
    return this.request('/ai/style-transfer', 'POST', { image, style_image });
  }

  // Get available LoRAs for Mystic
  async getLoRAs(): Promise<any> {
    return this.request('/ai/mystic/loras', 'GET');
  }

  // Helper to convert file to base64
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/xxx;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }
}

export const freepikService = new FreepikService();

// Predefined styles for easy access
export const FREEPIK_STYLES = [
  { id: 'photo', label: 'Fotografia', icon: '📷' },
  { id: 'digital-art', label: 'Arte Digital', icon: '🎨' },
  { id: 'anime', label: 'Anime', icon: '🎌' },
  { id: '3d', label: '3D Render', icon: '🧊' },
  { id: 'fine-art', label: 'Arte Clássica', icon: '🖼️' },
  { id: 'surrealist', label: 'Surrealista', icon: '🌀' },
  { id: 'dark', label: 'Dark/Gothic', icon: '🌑' },
  { id: 'vector', label: 'Vetor/Flat', icon: '📐' },
  { id: 'mockup', label: 'Mockup', icon: '📱' },
];

export const FREEPIK_SIZES = [
  { id: 'square_1_1', label: '1:1 (Quadrado)', icon: '⬜' },
  { id: 'widescreen_16_9', label: '16:9 (Landscape)', icon: '🖥️' },
  { id: 'portrait_9_16', label: '9:16 (Stories)', icon: '📱' },
  { id: 'classic_4_3', label: '4:3 (Clássico)', icon: '📺' },
  { id: 'traditional_3_4', label: '3:4 (Retrato)', icon: '🖼️' },
];

export const FREEPIK_COLORS = [
  { id: 'vibrant', label: 'Vibrante', color: '#ff6b6b' },
  { id: 'pastel', label: 'Pastel', color: '#ffc9de' },
  { id: 'warm', label: 'Quente', color: '#f59e0b' },
  { id: 'cold', label: 'Frio', color: '#60a5fa' },
  { id: 'black_white', label: 'P&B', color: '#6b7280' },
  { id: 'dark', label: 'Escuro', color: '#1f2937' },
  { id: 'colorful', label: 'Colorido', color: 'linear-gradient(45deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff)' },
];

export const FREEPIK_LIGHTNINGS = [
  { id: 'studio', label: 'Estúdio' },
  { id: 'warm', label: 'Quente' },
  { id: 'cinematic', label: 'Cinematográfica' },
  { id: 'low-light', label: 'Baixa Luz' },
  { id: 'epic', label: 'Épica' },
  { id: 'golden-hour', label: 'Golden Hour' },
  { id: 'dramatic', label: 'Dramática' },
  { id: 'hard-flash', label: 'Flash Forte' },
];
