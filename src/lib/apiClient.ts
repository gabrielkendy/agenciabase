// API Client para Edge Functions
// Centraliza chamadas para as APIs serverless

const API_BASE = import.meta.env.PROD ? '' : '';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Rate limit local (complementar ao do servidor)
const localRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkLocalRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = localRateLimits.get(key);
  if (!record || now > record.resetAt) {
    localRateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= limit) return false;
  record.count++;
  return true;
}

// Generic fetch wrapper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Error ${response.status}`,
      };
    }

    return data;
  } catch (error: any) {
    console.error(`API Error [${endpoint}]:`, error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

// ============ CHAT API ============

export interface ChatRequest {
  provider: 'gemini' | 'openrouter' | 'openai';
  message: string;
  systemPrompt?: string;
  history?: { role: string; content: string }[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  response: string;
  provider: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    responseTimeMs: number;
  };
}

export async function sendChat(request: ChatRequest): Promise<ApiResponse<ChatResponse>> {
  if (!checkLocalRateLimit('chat', 30, 60000)) {
    return { success: false, error: 'Rate limit local. Aguarde 1 minuto.' };
  }

  return apiFetch<ChatResponse>('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============ IMAGE API ============

export interface ImageRequest {
  provider: 'freepik' | 'falai' | 'openai';
  model: string;
  prompt: string;
  negativePrompt?: string;
  numImages?: number;
  size?: string;
  quality?: string;
}

export interface ImageResponse {
  images: string[];
  provider: string;
  model: string;
  count: number;
  responseTimeMs: number;
}

export async function generateImage(request: ImageRequest): Promise<ApiResponse<ImageResponse>> {
  if (!checkLocalRateLimit('image', 15, 60000)) {
    return { success: false, error: 'Rate limit local. Aguarde 1 minuto.' };
  }

  return apiFetch<ImageResponse>('/api/ai/image', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============ VIDEO API ============

export interface VideoRequest {
  provider: 'freepik' | 'falai';
  model: string;
  image: string;
  prompt?: string;
  duration?: string;
}

export interface VideoResponse {
  videoUrl: string;
  provider: string;
  model: string;
  responseTimeMs: number;
}

export async function generateVideo(request: VideoRequest): Promise<ApiResponse<VideoResponse>> {
  if (!checkLocalRateLimit('video', 5, 60000)) {
    return { success: false, error: 'Rate limit local. Aguarde 1 minuto.' };
  }

  return apiFetch<VideoResponse>('/api/ai/video', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============ VOICE API ============

export interface VoiceRequest {
  text: string;
  voice?: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
}

export interface VoiceResponse {
  audio: string; // data URL
  format: string;
  voiceId: string;
  textLength: number;
  responseTimeMs: number;
}

export async function generateVoice(request: VoiceRequest): Promise<ApiResponse<VoiceResponse>> {
  if (!checkLocalRateLimit('voice', 10, 60000)) {
    return { success: false, error: 'Rate limit local. Aguarde 1 minuto.' };
  }

  return apiFetch<VoiceResponse>('/api/ai/voice', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============ TOOLS API ============

export interface ToolRequest {
  tool: string;
  image?: string;
  prompt?: string;
  options?: Record<string, any>;
}

export interface ToolResponse {
  tool: string;
  output: any;
  responseTimeMs: number;
}

export async function runTool(request: ToolRequest): Promise<ApiResponse<ToolResponse>> {
  if (!checkLocalRateLimit('tools', 15, 60000)) {
    return { success: false, error: 'Rate limit local. Aguarde 1 minuto.' };
  }

  return apiFetch<ToolResponse>('/api/ai/tools', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============ HEALTH CHECK ============

export interface HealthResponse {
  status: string;
  timestamp: string;
  region: string;
  environment: string;
  version: string;
  integrations: Record<string, boolean>;
  responseTimeMs: number;
}

export async function checkHealth(): Promise<ApiResponse<HealthResponse>> {
  return apiFetch<HealthResponse>('/api/health', { method: 'GET' });
}

// ============ EXPORTS ============

export const apiClient = {
  chat: sendChat,
  image: generateImage,
  video: generateVideo,
  voice: generateVoice,
  tool: runTool,
  health: checkHealth,
};

export default apiClient;
