export type UserRole = 'admin' | 'manager' | 'redator' | 'designer' | 'member';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  cnpj?: string;
  instagram?: string;
  website?: string;
  color: string;
  status: 'active' | 'inactive' | 'prospect';
  notes?: string;
  monthly_value?: number;
  channels: SocialChannel[];
  approvers: Approver[];
  created_at: string;
}

export interface Approver {
  id: string;
  name: string;
  email: string;
  type: 'internal' | 'external';
}

export type AIProvider = 'openai' | 'gemini';
export type AIModel = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo' | 'gemini-2.0-flash-exp' | 'gemini-1.5-pro';

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  role: string;
  avatar: string;
  description: string;
  system_prompt: string;
  provider: AIProvider;
  model: AIModel;
  temperature: number;
  is_active: boolean;
  trained_knowledge: string;
  openai_assistant_id?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  agent_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  agent_ids: string[];
  is_team_chat: boolean;
  created_at: string;
}

// ========== WORKFLOW TYPES ==========
export type DemandStatus = 
  | 'rascunho'
  | 'conteudo' 
  | 'design'
  | 'aprovacao_interna'
  | 'aprovacao_cliente'
  | 'ajustes'
  | 'aguardando_agendamento'
  | 'aprovado_agendado'
  | 'concluido';

export type ContentType = 'post' | 'carrossel' | 'reels' | 'stories' | 'video' | 'blog' | 'anuncio';
export type SocialChannel = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | 'twitter' | 'pinterest' | 'threads';

export interface MediaFile {
  id: string;
  url: string;
  type: 'image' | 'video' | 'document';
  name: string;
  caption?: string;
}

export interface Demand {
  id: string;
  user_id: string;
  client_id: string;
  title: string;
  briefing: string;
  caption?: string;
  hashtags?: string;
  status: DemandStatus;
  content_type: ContentType;
  channels: SocialChannel[];
  media: MediaFile[];
  tags: string[];
  
  // Datas
  scheduled_date?: string;
  scheduled_time?: string;
  published_date?: string;
  created_at: string;
  
  // Equipe
  redator_id?: string;
  designer_id?: string;
  assigned_agent_id?: string;
  
  // Aprovação
  internal_approvers: string[];
  external_approvers: string[];
  approval_token?: string;
  approval_status: 'pending' | 'approved' | 'needs_adjustment';
  approval_notes?: string;
  
  // Flags
  auto_schedule: boolean;
  created_by_ai: boolean;
  ai_suggestions?: string;
}

export interface ApprovalLink {
  id: string;
  demand_id: string;
  token: string;
  approver_name: string;
  approver_email: string;
  status: 'pending' | 'approved' | 'adjustment_requested';
  feedback?: string;
  expires_at: string;
  created_at: string;
}

// ========== CALENDAR & NOTIFICATIONS ==========
export interface CalendarEvent {
  id: string;
  demand_id: string;
  date: string;
  time?: string;
  client: Client;
  demand: Demand;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  timestamp: string;
}

export interface APIConfig {
  openai_key?: string;
  gemini_key?: string;
  google_drive_connected: boolean;
}

// ========== WORKFLOW COLUMNS CONFIG ==========
export const WORKFLOW_COLUMNS: { id: DemandStatus; label: string; color: string; icon: string }[] = [
  { id: 'rascunho', label: 'Rascunho', color: 'gray', icon: '📝' },
  { id: 'conteudo', label: 'Conteúdo', color: 'blue', icon: '✍️' },
  { id: 'design', label: 'Design', color: 'purple', icon: '🎨' },
  { id: 'aprovacao_interna', label: 'Aprovação Interna', color: 'yellow', icon: '👀' },
  { id: 'aprovacao_cliente', label: 'Aprovação Cliente', color: 'orange', icon: '🤝' },
  { id: 'ajustes', label: 'Ajustes', color: 'red', icon: '🔧' },
  { id: 'aguardando_agendamento', label: 'Aguardando Agendamento', color: 'cyan', icon: '⏳' },
  { id: 'aprovado_agendado', label: 'Aprovado e Agendado', color: 'emerald', icon: '📅' },
  { id: 'concluido', label: 'Concluídos', color: 'green', icon: '✅' },
];

export const SOCIAL_CHANNELS: { id: SocialChannel; label: string; icon: string; color: string }[] = [
  { id: 'instagram', label: 'Instagram', icon: '📸', color: '#E4405F' },
  { id: 'facebook', label: 'Facebook', icon: '📘', color: '#1877F2' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵', color: '#000000' },
  { id: 'youtube', label: 'YouTube', icon: '▶️', color: '#FF0000' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', color: '#0A66C2' },
  { id: 'twitter', label: 'X/Twitter', icon: '🐦', color: '#1DA1F2' },
  { id: 'pinterest', label: 'Pinterest', icon: '📌', color: '#E60023' },
  { id: 'threads', label: 'Threads', icon: '🧵', color: '#000000' },
];

export const CONTENT_TYPES: { id: ContentType; label: string; icon: string }[] = [
  { id: 'post', label: 'Post', icon: '🖼️' },
  { id: 'carrossel', label: 'Carrossel', icon: '📚' },
  { id: 'reels', label: 'Reels', icon: '🎬' },
  { id: 'stories', label: 'Stories', icon: '⭕' },
  { id: 'video', label: 'Vídeo', icon: '📹' },
  { id: 'blog', label: 'Blog', icon: '📝' },
  { id: 'anuncio', label: 'Anúncio', icon: '📢' },
];
