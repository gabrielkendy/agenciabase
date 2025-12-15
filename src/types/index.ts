export type UserRole = 'admin' | 'manager' | 'member';

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
  created_at: string;
}

export type AIProvider = 'openai' | 'gemini';
export type AIModel = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo' | 'gemini-2.0-flash-exp' | 'gemini-1.5-pro';

export interface KnowledgeItem {
  id: string;
  agent_id: string;
  type: 'file' | 'url' | 'text';
  name: string;
  content: string;
  url?: string;
  trained: boolean;
  created_at: string;
}

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

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'approved' | 'published';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ContentType = 'post' | 'carrossel' | 'reels' | 'stories' | 'video' | 'blog';
export type SocialChannel = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | 'twitter';

export interface Task {
  id: string;
  user_id: string;
  client_id: string;
  title: string;
  description: string;
  content?: string;
  caption?: string;
  status: TaskStatus;
  priority: TaskPriority;
  content_type: ContentType;
  channel: SocialChannel;
  assigned_agent_id?: string;
  media_urls: string[];
  scheduled_date?: string;
  published_date?: string;
  created_by_ai: boolean;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  task_id: string;
  date: string;
  client: Client;
  task: Task;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  timestamp: string;
}

export interface APIConfig {
  openai_key?: string;
  gemini_key?: string;
  google_drive_connected: boolean;
}
