// Late API Service - Social Media Publishing
// Publicação automática em Instagram, TikTok, YouTube, Facebook, LinkedIn, Twitter, Pinterest

export interface LateConfig {
  apiKey: string;
}

export interface SocialAccount {
  id: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'linkedin' | 'twitter' | 'pinterest';
  username: string;
  profilePicture?: string;
  isConnected: boolean;
}

export interface SchedulePostParams {
  accountId: string;
  content: {
    text?: string;
    mediaUrls?: string[];
    mediaType?: 'image' | 'video' | 'carousel';
  };
  scheduledTime?: string; // ISO date string
  platform: string;
}

export interface PostResult {
  id: string;
  status: 'scheduled' | 'published' | 'failed';
  postUrl?: string;
  error?: string;
}

class LateAPIService {
  private apiKey: string = '';
  private baseUrl = 'https://api.late.so/v1';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  private async request<T>(endpoint: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', body?: unknown): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Late API key não configurada');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ============================================
  // ACCOUNTS
  // ============================================

  async getAccounts(): Promise<SocialAccount[]> {
    return this.request('/accounts');
  }

  async getAccount(accountId: string): Promise<SocialAccount> {
    return this.request(`/accounts/${accountId}`);
  }

  // ============================================
  // POSTS
  // ============================================

  async createPost(params: SchedulePostParams): Promise<PostResult> {
    return this.request('/posts', 'POST', {
      account_id: params.accountId,
      content: params.content,
      scheduled_at: params.scheduledTime || new Date().toISOString(),
    });
  }

  async schedulePost(params: SchedulePostParams): Promise<PostResult> {
    return this.createPost(params);
  }

  async publishNow(params: Omit<SchedulePostParams, 'scheduledTime'>): Promise<PostResult> {
    return this.request('/posts', 'POST', {
      account_id: params.accountId,
      content: params.content,
      publish_now: true,
    });
  }

  async getPost(postId: string): Promise<PostResult & { content: unknown }> {
    return this.request(`/posts/${postId}`);
  }

  async deletePost(postId: string): Promise<{ success: boolean }> {
    return this.request(`/posts/${postId}`, 'DELETE');
  }

  async getScheduledPosts(): Promise<Array<PostResult & { scheduledAt: string }>> {
    return this.request('/posts?status=scheduled');
  }

  // ============================================
  // MEDIA UPLOAD
  // ============================================

  async uploadMedia(file: File): Promise<{ url: string; id: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Erro ao fazer upload');
    }

    return response.json();
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async getPostAnalytics(postId: string): Promise<{
    likes: number;
    comments: number;
    shares: number;
    views: number;
    engagement: number;
  }> {
    return this.request(`/posts/${postId}/analytics`);
  }

  // ============================================
  // HELPERS
  // ============================================

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const lateAPI = new LateAPIService();
export default lateAPI;
