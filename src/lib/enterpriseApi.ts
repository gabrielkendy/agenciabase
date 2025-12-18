// Enterprise API Client
// Integração com o Backend Node.js Enterprise

// Configuração
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Token storage
let accessToken: string | null = null;
let refreshToken: string | null = null;

// Inicializar tokens do localStorage
export function initializeAuth() {
  accessToken = localStorage.getItem('access_token');
  refreshToken = localStorage.getItem('refresh_token');
}

// Salvar tokens
export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

// Limpar tokens
export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

// Buscar com autenticação
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Adicionar token se disponível
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Se token expirado, tentar refresh
    if (response.status === 401 && refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        const retryResponse = await fetch(`${BACKEND_URL}${endpoint}`, {
          ...options,
          headers,
        });
        return retryResponse.json();
      }
    }

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Error ${response.status}`,
      };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error(`Enterprise API Error [${endpoint}]:`, error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

// Refresh do token
async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      setTokens(data.accessToken, data.refreshToken);
      return true;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }
  clearTokens();
  return false;
}

// ============ AUTH API ============

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
  organizationName: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string;
  };
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    const response = await fetchWithAuth<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (response.success && response.data) {
      setTokens(response.data.accessToken, response.data.refreshToken);
    }
    return response;
  },

  async register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    const response = await fetchWithAuth<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.success && response.data) {
      setTokens(response.data.accessToken, response.data.refreshToken);
    }
    return response;
  },

  async logout(): Promise<ApiResponse> {
    const response = await fetchWithAuth('/api/auth/logout', { method: 'POST' });
    clearTokens();
    return response;
  },

  async getProfile(): Promise<ApiResponse<AuthResponse['user']>> {
    return fetchWithAuth('/api/users/me');
  },
};

// ============ CREDITS API ============

export interface CreditsBalance {
  balance: number;
  usage: {
    today: number;
    thisMonth: number;
  };
}

export const creditsApi = {
  async getBalance(): Promise<ApiResponse<CreditsBalance>> {
    return fetchWithAuth('/api/billing/credits');
  },

  async getHistory(params?: { page?: number; limit?: number }): Promise<ApiResponse<any[]>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return fetchWithAuth(`/api/billing/transactions?${query}`);
  },
};

// ============ AI GENERATION API ============

export interface GenerateImageParams {
  prompt: string;
  negativePrompt?: string;
  provider?: string;
  model?: string;
  style?: string;
  aspectRatio?: string;
  numImages?: number;
}

export interface GenerateVideoParams {
  sourceImage: string;
  motionPrompt?: string;
  provider?: string;
  model?: string;
  duration?: number;
}

export interface GenerateAudioParams {
  text: string;
  voice?: string;
  provider?: string;
  model?: string;
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  creditsUsed?: number;
  createdAt: string;
  completedAt?: string;
}

export const aiApi = {
  async generateImage(params: GenerateImageParams): Promise<ApiResponse<JobStatus>> {
    return fetchWithAuth('/api/ai/generate/image', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async generateVideo(params: GenerateVideoParams): Promise<ApiResponse<JobStatus>> {
    return fetchWithAuth('/api/ai/generate/video', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async generateAudio(params: GenerateAudioParams): Promise<ApiResponse<JobStatus>> {
    return fetchWithAuth('/api/ai/generate/audio', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getJobStatus(jobId: string): Promise<ApiResponse<JobStatus>> {
    return fetchWithAuth(`/api/ai/jobs/${jobId}`);
  },

  async listJobs(params?: {
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ jobs: JobStatus[]; total: number }>> {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return fetchWithAuth(`/api/ai/jobs?${query}`);
  },

  async getProviders(): Promise<ApiResponse<any[]>> {
    return fetchWithAuth('/api/ai/providers');
  },

  async getModels(provider: string): Promise<ApiResponse<any[]>> {
    return fetchWithAuth(`/api/ai/models/${provider}`);
  },
};

// ============ STUDIO API ============

export const studioApi = {
  async listGenerations(params?: {
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return fetchWithAuth(`/api/studio/generations?${query}`);
  },

  async getGeneration(id: string): Promise<ApiResponse<any>> {
    return fetchWithAuth(`/api/studio/generations/${id}`);
  },

  async saveGeneration(data: {
    jobId: string;
    title?: string;
    description?: string;
    tags?: string[];
  }): Promise<ApiResponse<any>> {
    return fetchWithAuth('/api/studio/generations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteGeneration(id: string): Promise<ApiResponse<void>> {
    return fetchWithAuth(`/api/studio/generations/${id}`, { method: 'DELETE' });
  },

  async listFavorites(): Promise<ApiResponse<any[]>> {
    return fetchWithAuth('/api/studio/favorites');
  },

  async toggleFavorite(generationId: string): Promise<ApiResponse<any>> {
    return fetchWithAuth(`/api/studio/generations/${generationId}/favorite`, {
      method: 'POST',
    });
  },
};

// ============ ANALYTICS API ============

export const analyticsApi = {
  async getSummary(): Promise<ApiResponse<any>> {
    return fetchWithAuth('/api/analytics/summary');
  },

  async getDailyUsage(days?: number): Promise<ApiResponse<any[]>> {
    return fetchWithAuth(`/api/analytics/daily?days=${days || 30}`);
  },

  async getUserUsage(): Promise<ApiResponse<any[]>> {
    return fetchWithAuth('/api/analytics/users');
  },

  async getProviderUsage(): Promise<ApiResponse<any[]>> {
    return fetchWithAuth('/api/analytics/providers');
  },

  async exportData(format?: string): Promise<ApiResponse<any>> {
    return fetchWithAuth(`/api/analytics/export?format=${format || 'json'}`);
  },
};

// ============ ORGANIZATION API ============

export const organizationApi = {
  async get(): Promise<ApiResponse<any>> {
    return fetchWithAuth('/api/organizations/current');
  },

  async update(data: { name?: string; settings?: any }): Promise<ApiResponse<any>> {
    return fetchWithAuth('/api/organizations/current', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async listMembers(): Promise<ApiResponse<any[]>> {
    return fetchWithAuth('/api/organizations/current/members');
  },

  async inviteMember(email: string, role?: string): Promise<ApiResponse<any>> {
    return fetchWithAuth('/api/organizations/current/invites', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  },

  async removeMember(userId: string): Promise<ApiResponse<void>> {
    return fetchWithAuth(`/api/organizations/current/members/${userId}`, {
      method: 'DELETE',
    });
  },

  async updateMemberRole(userId: string, role: string): Promise<ApiResponse<any>> {
    return fetchWithAuth(`/api/organizations/current/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },
};

// ============ WEBHOOKS API ============

export const webhooksApi = {
  async list(): Promise<ApiResponse<any[]>> {
    return fetchWithAuth('/api/webhooks');
  },

  async create(data: {
    url: string;
    events: string[];
    secret?: string;
  }): Promise<ApiResponse<any>> {
    return fetchWithAuth('/api/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: {
    url?: string;
    events?: string[];
    enabled?: boolean;
  }): Promise<ApiResponse<any>> {
    return fetchWithAuth(`/api/webhooks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return fetchWithAuth(`/api/webhooks/${id}`, { method: 'DELETE' });
  },

  async test(id: string): Promise<ApiResponse<any>> {
    return fetchWithAuth(`/api/webhooks/${id}/test`, { method: 'POST' });
  },
};

// ============ HEALTH API ============

export const healthApi = {
  async check(): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`);
      return response.json();
    } catch (error) {
      return { success: false, error: 'Backend unreachable' };
    }
  },
};

// ============ EXPORT ============

export const enterpriseApi = {
  auth: authApi,
  credits: creditsApi,
  ai: aiApi,
  studio: studioApi,
  analytics: analyticsApi,
  organization: organizationApi,
  webhooks: webhooksApi,
  health: healthApi,
  initializeAuth,
  setTokens,
  clearTokens,
};

export default enterpriseApi;
