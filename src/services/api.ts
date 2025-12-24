// =============================================================================
// API SERVICE - CLIENTE PARA O BACKEND
// =============================================================================
// Este serviço centraliza TODAS as chamadas de IA
// Chama o backend Express em /api/* que protege as API keys
// =============================================================================

// Em produção, mesmo domínio. Em dev, servidor separado
const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:3001';

// =============================================================================
// TIPOS
// =============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================================================
// GERAÇÃO DE IMAGEM
// =============================================================================

export interface ImageParams {
  provider: 'falai' | 'openai' | 'google';
  model: string;
  prompt: string;
  negativePrompt?: string;
  numImages?: number;
  size?: string;
}

export interface ImageResult {
  images: string[];
  provider: string;
  model: string;
  count: number;
}

export async function generateImage(params: ImageParams): Promise<ImageResult> {
  const response = await fetch(`${API_BASE}/api/ai/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data: ApiResponse<ImageResult> = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Erro ao gerar imagem');
  }
  
  return data.data!;
}

// =============================================================================
// GERAÇÃO DE VÍDEO
// =============================================================================

export interface VideoParams {
  model?: string;
  image: string;
  prompt?: string;
  duration?: number;
}

export interface VideoResult {
  videoUrl: string;
  model: string;
  duration: number;
}

export async function generateVideo(params: VideoParams): Promise<VideoResult> {
  const response = await fetch(`${API_BASE}/api/ai/video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data: ApiResponse<VideoResult> = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Erro ao gerar vídeo');
  }
  
  return data.data!;
}

// =============================================================================
// CHAT COM IA
// =============================================================================

export interface ChatParams {
  provider?: 'gemini' | 'openrouter' | 'openai';
  message: string;
  systemPrompt?: string;
  history?: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
}

export interface ChatResult {
  response: string;
  provider: string;
  model: string;
}

export async function chat(params: ChatParams): Promise<ChatResult> {
  const response = await fetch(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data: ApiResponse<ChatResult> = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Erro no chat');
  }
  
  return data.data!;
}

// =============================================================================
// SÍNTESE DE VOZ
// =============================================================================

export interface VoiceParams {
  text: string;
  voice?: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
}

export interface VoiceResult {
  audio: string;
  format: string;
  voiceId: string;
}

export async function generateVoice(params: VoiceParams): Promise<VoiceResult> {
  const response = await fetch(`${API_BASE}/api/ai/voice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data: ApiResponse<VoiceResult> = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Erro ao gerar áudio');
  }
  
  return data.data!;
}

// =============================================================================
// FERRAMENTAS DE EDIÇÃO (Freepik)
// =============================================================================

export interface ToolsParams {
  tool: 'upscale' | 'remove-bg' | 'relight' | 'style-transfer' | 'reimagine' | 'recolor';
  image?: string;
  prompt?: string;
  options?: Record<string, any>;
}

export interface ToolsResult {
  url: string;
  result: string;
  tool: string;
}

export async function processTools(params: ToolsParams): Promise<ToolsResult> {
  const response = await fetch(`${API_BASE}/api/ai/tools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data: ApiResponse<ToolsResult> = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Erro ao processar ferramenta');
  }
  
  return data.data!;
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

export interface HealthResult {
  status: string;
  services: Record<string, boolean>;
}

export async function healthCheck(): Promise<HealthResult> {
  const response = await fetch(`${API_BASE}/api/health`);
  const data = await response.json();
  return data;
}
