// Freepik API Service - Stock Images & Graphics
// https://www.freepik.com/api

export interface FreepikConfig {
  apiKey: string;
}

export interface SearchParams {
  query: string;
  page?: number;
  limit?: number;
  order?: 'latest' | 'popular';
  type?: 'photo' | 'vector' | 'psd' | 'icon';
  license?: 'free' | 'premium';
  color?: string;
  orientation?: 'horizontal' | 'vertical' | 'square';
}

export interface FreepikResource {
  id: string;
  title: string;
  description: string;
  url: string;
  preview: {
    url: string;
    width: number;
    height: number;
  };
  download: {
    url: string;
  };
  author: {
    name: string;
    avatar: string;
  };
  license: string;
  type: string;
  tags: string[];
}

export interface SearchResult {
  data: FreepikResource[];
  meta: {
    current_page: number;
    total_pages: number;
    total: number;
  };
}

// Pikaso AI - Image Generation
export interface PikasoParams {
  prompt: string;
  negative_prompt?: string;
  style?: string;
  aspect_ratio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  num_images?: number;
}

export interface PikasoResult {
  images: Array<{
    url: string;
    id: string;
  }>;
}

// Estilos Pikaso disponíveis
export const PIKASO_STYLES = {
  PHOTO: 'photo',
  DIGITAL_ART: 'digital-art',
  ANIME: 'anime',
  CINEMATIC: 'cinematic',
  FANTASY: 'fantasy',
  NEON: 'neon',
  WATERCOLOR: 'watercolor',
  SKETCH: 'sketch',
  '3D': '3d-render',
  MINIMALIST: 'minimalist',
} as const;

class FreepikService {
  private apiKey: string = '';
  private baseUrl = 'https://api.freepik.com/v1';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Freepik API key não configurada');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-freepik-api-key': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ============================================
  // SEARCH RESOURCES
  // ============================================

  async search(params: SearchParams): Promise<SearchResult> {
    const queryParams = new URLSearchParams({
      locale: 'pt-BR',
      page: String(params.page || 1),
      limit: String(params.limit || 20),
      order: params.order || 'popular',
    });

    if (params.type) queryParams.append('filters[content_type][' + params.type + ']', '1');
    if (params.license) queryParams.append('filters[license][' + params.license + ']', '1');
    if (params.color) queryParams.append('filters[color]', params.color);
    if (params.orientation) queryParams.append('filters[orientation][' + params.orientation + ']', '1');

    return this.request(`/resources?term=${encodeURIComponent(params.query)}&${queryParams}`);
  }

  async searchPhotos(query: string, options?: Partial<SearchParams>): Promise<SearchResult> {
    return this.search({ ...options, query, type: 'photo' });
  }

  async searchVectors(query: string, options?: Partial<SearchParams>): Promise<SearchResult> {
    return this.search({ ...options, query, type: 'vector' });
  }

  async searchIcons(query: string, options?: Partial<SearchParams>): Promise<SearchResult> {
    return this.search({ ...options, query, type: 'icon' });
  }

  // ============================================
  // RESOURCE DETAILS
  // ============================================

  async getResource(resourceId: string): Promise<FreepikResource> {
    return this.request(`/resources/${resourceId}`);
  }

  async downloadResource(resourceId: string): Promise<{ url: string }> {
    return this.request(`/resources/${resourceId}/download`);
  }

  // ============================================
  // PIKASO AI - IMAGE GENERATION
  // ============================================

  async generateImage(params: PikasoParams): Promise<PikasoResult> {
    return this.request('/ai/text-to-image', {
      method: 'POST',
      body: JSON.stringify({
        prompt: params.prompt,
        negative_prompt: params.negative_prompt || 'blurry, bad quality, distorted',
        styling: {
          style: params.style || PIKASO_STYLES.PHOTO,
        },
        image: {
          size: this.aspectRatioToSize(params.aspect_ratio || '1:1'),
        },
        num_images: params.num_images || 1,
      }),
    });
  }

  async generateWithStyle(
    prompt: string,
    style: keyof typeof PIKASO_STYLES,
    aspectRatio?: '1:1' | '16:9' | '9:16'
  ): Promise<PikasoResult> {
    return this.generateImage({
      prompt,
      style: PIKASO_STYLES[style],
      aspect_ratio: aspectRatio,
    });
  }

  // ============================================
  // HELPERS
  // ============================================

  private aspectRatioToSize(ratio: string): { width: number; height: number } {
    const sizes: Record<string, { width: number; height: number }> = {
      '1:1': { width: 1024, height: 1024 },
      '16:9': { width: 1344, height: 768 },
      '9:16': { width: 768, height: 1344 },
      '4:3': { width: 1152, height: 896 },
      '3:4': { width: 896, height: 1152 },
    };
    return sizes[ratio] || sizes['1:1'];
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getStyles() {
    return PIKASO_STYLES;
  }
}

export const freepikService = new FreepikService();
export default freepikService;
