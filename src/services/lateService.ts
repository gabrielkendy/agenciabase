// Late API Service - Integração para publicação em redes sociais
// Docs: https://getlate.dev/docs

import { SocialChannel, Demand } from '../types';

// Mapeamento de canais do nosso sistema para Late API
const CHANNEL_MAP: Record<SocialChannel, string> = {
  instagram: 'instagram',
  facebook: 'facebook',
  tiktok: 'tiktok',
  youtube: 'youtube',
  linkedin: 'linkedin',
  twitter: 'twitter',
  pinterest: 'pinterest',
  threads: 'threads',
  google_business: 'google', // Google Business Profile
};

// Plataformas suportadas pelo Late
export const LATE_SUPPORTED_PLATFORMS = [
  'instagram', 'facebook', 'tiktok', 'youtube', 
  'linkedin', 'twitter', 'threads', 'pinterest'
] as const;

export type LatePlatform = typeof LATE_SUPPORTED_PLATFORMS[number];

export interface LateAccount {
  id: string;
  platform: LatePlatform;
  name: string;
  username?: string;
  profilePicture?: string;
  isConnected: boolean;
}

export interface LatePostRequest {
  platforms: LatePlatform[];
  text: string;
  mediaUrls?: string[];
  scheduledTime?: string; // ISO 8601
  firstComment?: string;
}

export interface LatePostResponse {
  id: string;
  status: 'scheduled' | 'published' | 'failed';
  platforms: {
    platform: string;
    postId?: string;
    url?: string;
    error?: string;
  }[];
  scheduledTime?: string;
  createdAt: string;
}

export interface LateConfig {
  apiKey: string;
  profileId?: string;
}

class LateService {
  private baseUrl = 'https://api.getlate.dev/v1';
  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Late API key não configurada');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
      throw new Error(error.message || `Erro ${response.status}`);
    }

    return response.json();
  }

  // Verificar se a API key é válida
  async validateApiKey(): Promise<boolean> {
    try {
      await this.request('/me');
      return true;
    } catch {
      return false;
    }
  }

  // Obter contas conectadas
  async getAccounts(): Promise<LateAccount[]> {
    try {
      const response = await this.request<{ accounts: any[] }>('/accounts');
      return response.accounts.map((acc) => ({
        id: acc.id,
        platform: acc.platform,
        name: acc.name || acc.username,
        username: acc.username,
        profilePicture: acc.profilePicture,
        isConnected: true,
      }));
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      return [];
    }
  }

  // Publicar/Agendar post
  async createPost(data: LatePostRequest): Promise<LatePostResponse> {
    const body: any = {
      platforms: data.platforms,
      text: data.text,
    };

    if (data.mediaUrls && data.mediaUrls.length > 0) {
      body.mediaUrls = data.mediaUrls;
    }

    if (data.scheduledTime) {
      body.scheduledTime = data.scheduledTime;
    }

    if (data.firstComment) {
      body.firstComment = data.firstComment;
    }

    return this.request<LatePostResponse>('/posts', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Obter status de um post
  async getPostStatus(postId: string): Promise<LatePostResponse> {
    return this.request<LatePostResponse>(`/posts/${postId}`);
  }

  // Deletar post agendado
  async deletePost(postId: string): Promise<void> {
    await this.request(`/posts/${postId}`, { method: 'DELETE' });
  }

  // Converter demanda do nosso sistema para formato Late
  convertDemandToLatePost(demand: Demand): LatePostRequest {
    // Filtrar apenas canais suportados pelo Late
    const platforms = demand.channels
      .map((ch) => CHANNEL_MAP[ch])
      .filter((p): p is LatePlatform => 
        LATE_SUPPORTED_PLATFORMS.includes(p as LatePlatform)
      );

    // Montar texto (legenda + hashtags)
    let text = demand.caption || demand.title;
    if (demand.hashtags) {
      text += '\n\n' + demand.hashtags;
    }

    // Montar request
    const request: LatePostRequest = {
      platforms,
      text,
    };

    // Adicionar mídia se houver
    if (demand.media.length > 0) {
      request.mediaUrls = demand.media.map((m) => m.url);
    }

    // Adicionar agendamento se tiver data
    if (demand.scheduled_date) {
      const date = demand.scheduled_date;
      const time = demand.scheduled_time || '12:00';
      request.scheduledTime = new Date(`${date}T${time}:00`).toISOString();
    }

    return request;
  }

  // Publicar demanda diretamente
  async publishDemand(demand: Demand): Promise<LatePostResponse> {
    const postData = this.convertDemandToLatePost(demand);
    return this.createPost(postData);
  }

  // Agendar demanda
  async scheduleDemand(demand: Demand, scheduledTime: string): Promise<LatePostResponse> {
    const postData = this.convertDemandToLatePost(demand);
    postData.scheduledTime = scheduledTime;
    return this.createPost(postData);
  }

  // URL para conectar conta (abre dashboard Late)
  getConnectUrl(): string {
    return 'https://app.getlate.dev/settings/accounts';
  }

  // URL do dashboard Late
  getDashboardUrl(): string {
    return 'https://app.getlate.dev';
  }
}

// Singleton
export const lateService = new LateService();

// Hook helper para usar no React
export const useLateService = () => {
  return lateService;
};
