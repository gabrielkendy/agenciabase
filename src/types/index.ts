// Agent Types
export enum AgentRole {
  MANAGER = 'Gestor',
  PLANNER = 'Planejador',
  CAROUSEL = 'Criador de Carrossel',
  SCRIPT = 'Roteirista',
  POST = 'Criador de Post',
  CAPTION = 'Criador de Legenda',
  SPREADSHEET = 'Editor de Planilha',
}

export type GeminiModelType = 'gemini-2.5-flash' | 'gemini-2.5-flash-lite-latest' | 'gemini-2.0-flash';

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  avatar: string;
  model: GeminiModelType;
  systemInstruction: string;
  description: string;
  files: KnowledgeFile[];
  isOnline?: boolean;
}

// Knowledge Files
export type FileSource = 'upload' | 'gdrive' | 'gmail' | 'sheets';

export interface KnowledgeFile {
  id: string;
  name: string;
  content: string;
  type: 'text' | 'csv' | 'json' | 'pdf' | 'doc';
  source: FileSource;
  lastModified: Date;
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  senderName?: string;
  senderAvatar?: string;
  isThinking?: boolean;
}

export interface TeamMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: Date;
  read: boolean;
  channel?: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  text: string;
  timestamp: Date;
  read: boolean;
}

// Task / Demand Types
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'scheduled' | 'approved' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type SocialChannel = 'instagram' | 'linkedin' | 'tiktok' | 'youtube' | 'blog' | 'facebook';

export interface Task {
  id: string;
  title: string;
  description: string;
  caption?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgentId?: string;
  channel?: SocialChannel;
  mediaUrls?: string[];
  scheduledDate?: Date;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  externalLinkToken?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Client Types
export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  color: string;
  logo?: string;
  createdAt: Date;
}

// Media Types
export type MediaType = 'image' | 'video';

export interface GeneratedMedia {
  id: string;
  type: MediaType;
  url: string;
  prompt: string;
  timestamp: Date;
  aspectRatio?: string;
  modelUsed: string;
}

// Notification Types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: Date;
}

// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'member';
  avatar?: string;
}
