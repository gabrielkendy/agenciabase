// Creator Studio Types

export interface StudioProject {
  id: string;
  name: string;
  description?: string;
  nodes: StudioNode[];
  edges: StudioEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface StudioNode {
  id: string;
  type: StudioNodeType;
  position: { x: number; y: number };
  data: NodeData;
}

export interface StudioEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export type StudioNodeType =
  | 'agent'
  | 'script'
  | 'narration'
  | 'imagePrompts'
  | 'imageGenerator'
  | 'videoGenerator'
  | 'export';

export interface NodeData {
  label: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  approved: boolean;
  [key: string]: any;
}

// Agent Node
export interface AgentNodeData extends NodeData {
  agentId?: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  generatedScript?: string;
}

// Script Node
export interface ScriptNodeData extends NodeData {
  script: string;
  editedScript?: string;
}

// Narration Node
export interface NarrationNodeData extends NodeData {
  voiceId: string;
  speed: number;
  audioUrl?: string;
  audioDuration?: number;
}

// Image Prompts Node
export interface ImagePromptsNodeData extends NodeData {
  prompts: ImagePrompt[];
}

export interface ImagePrompt {
  id: string;
  text: string;
  approved: boolean;
}

// Image Generator Node
export interface ImageGeneratorNodeData extends NodeData {
  model: 'fal-ai/flux-pro' | 'fal-ai/flux/dev' | 'fal-ai/flux-lora';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  images: GeneratedImage[];
}

export interface GeneratedImage {
  id: string;
  promptId: string;
  prompt: string;
  url?: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  approved: boolean;
  error?: string;
}

// Video Generator Node
export interface VideoGeneratorNodeData extends NodeData {
  model: 'fal-ai/kling-video/v1.5/pro/image-to-video' | 'fal-ai/minimax-video/image-to-video' | 'fal-ai/luma-dream-machine';
  duration: '5' | '10';
  videos: GeneratedVideo[];
}

export interface GeneratedVideo {
  id: string;
  imageId: string;
  imageUrl: string;
  motionPrompt: string;
  url?: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  approved: boolean;
  error?: string;
}

// Export Node
export interface ExportNodeData extends NodeData {
  includeNarration: boolean;
  format: 'individual' | 'zip';
}

// ElevenLabs Voice
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
}

// FAL.ai Response
export interface FalImageResponse {
  images: { url: string; content_type: string }[];
  seed: number;
  prompt: string;
}

export interface FalVideoResponse {
  video: { url: string };
  seed?: number;
}

// Node Colors
export const NODE_COLORS: Record<StudioNodeType, { bg: string; border: string; icon: string }> = {
  agent: { bg: 'bg-orange-500/20', border: 'border-orange-500', icon: '#f97316' },
  script: { bg: 'bg-blue-500/20', border: 'border-blue-500', icon: '#3b82f6' },
  narration: { bg: 'bg-green-500/20', border: 'border-green-500', icon: '#22c55e' },
  imagePrompts: { bg: 'bg-cyan-500/20', border: 'border-cyan-500', icon: '#06b6d4' },
  imageGenerator: { bg: 'bg-pink-500/20', border: 'border-pink-500', icon: '#ec4899' },
  videoGenerator: { bg: 'bg-purple-500/20', border: 'border-purple-500', icon: '#8b5cf6' },
  export: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', icon: '#eab308' },
};

// Node Labels
export const NODE_LABELS: Record<StudioNodeType, { title: string; icon: string; description: string }> = {
  agent: { title: 'Agente IA', icon: '🤖', description: 'Conversa com agente para criar roteiro' },
  script: { title: 'Roteiro', icon: '📝', description: 'Visualize e edite o roteiro gerado' },
  narration: { title: 'Narração', icon: '🎙️', description: 'Gere áudio com ElevenLabs' },
  imagePrompts: { title: 'Prompts de Imagens', icon: '💡', description: '12 prompts para cada cena' },
  imageGenerator: { title: 'Gerar Imagens', icon: '🖼️', description: 'Gere imagens com Flux AI' },
  videoGenerator: { title: 'Gerar Vídeos', icon: '🎬', description: 'Transforme imagens em vídeos' },
  export: { title: 'Exportar', icon: '📦', description: 'Baixe tudo ou exporte' },
};
