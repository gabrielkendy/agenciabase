export type UserRole = 'admin' | 'manager' | 'redator' | 'designer' | 'member';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
}

// ========== TEAM MEMBER (Equipe de Criação) ==========
export type TeamMemberRole = 'admin' | 'manager' | 'redator' | 'designer' | 'editor' | 'viewer' | 'both';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: TeamMemberRole;
  phone?: string;
  password?: string;
  is_active: boolean;
  permissions?: {
    canManageTeam: boolean;
    canManageClients: boolean;
    canCreateDemands: boolean;
    canEditDemands: boolean;
    canApproveDemands: boolean;
    canPublish: boolean;
    canViewReports: boolean;
    canManageSettings: boolean;
  };
  created_at: string;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<TeamMemberRole, TeamMember['permissions']> = {
  admin: { canManageTeam: true, canManageClients: true, canCreateDemands: true, canEditDemands: true, canApproveDemands: true, canPublish: true, canViewReports: true, canManageSettings: true },
  manager: { canManageTeam: true, canManageClients: true, canCreateDemands: true, canEditDemands: true, canApproveDemands: true, canPublish: true, canViewReports: true, canManageSettings: false },
  redator: { canManageTeam: false, canManageClients: false, canCreateDemands: true, canEditDemands: true, canApproveDemands: false, canPublish: false, canViewReports: false, canManageSettings: false },
  designer: { canManageTeam: false, canManageClients: false, canCreateDemands: true, canEditDemands: true, canApproveDemands: false, canPublish: false, canViewReports: false, canManageSettings: false },
  editor: { canManageTeam: false, canManageClients: false, canCreateDemands: true, canEditDemands: true, canApproveDemands: false, canPublish: false, canViewReports: false, canManageSettings: false },
  viewer: { canManageTeam: false, canManageClients: false, canCreateDemands: false, canEditDemands: false, canApproveDemands: false, canPublish: false, canViewReports: true, canManageSettings: false },
  both: { canManageTeam: false, canManageClients: false, canCreateDemands: true, canEditDemands: true, canApproveDemands: false, canPublish: false, canViewReports: false, canManageSettings: false },
};

// ========== APPROVER (Aprovadores) ==========
export interface Approver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type: 'internal' | 'external';
  avatar?: string;
}

export interface ApproverAssignment {
  approver_id: string;
  approver_name: string;
  approver_email: string;
  approver_phone?: string;
  type: 'internal' | 'external';
  order: number; // 1 = primeiro, 2 = segundo (cadeia)
  status: 'pending' | 'approved' | 'adjustment_requested';
  feedback?: string;
  approved_at?: string;
}

// ========== CLIENT ==========
export interface Client {
  id: string;
  user_id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  cpf_cnpj?: string; // CPF ou CNPJ com validação
  cnpj?: string; // Deprecated, usar cpf_cnpj
  instagram?: string;
  website?: string;
  color: string;
  status: 'active' | 'inactive' | 'prospect';
  notes?: string;
  monthly_value?: number;
  channels: SocialChannel[];
  approvers: Approver[];
  created_at: string;
  
  // Dados Financeiros (Asaas)
  asaas_customer_id?: string;
  billing_type?: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  payment_day?: number; // Dia do vencimento (1-28)
  contract_start?: string;
  contract_end?: string;
  
  // Endereço (para NF e Asaas)
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  
  // Histórico de conteúdos (backup)
  content_history?: ContentHistoryEntry[];
}

// ========== AI AGENT ==========
export type AIProvider = 'openai' | 'gemini' | 'openrouter';

// Modelos disponíveis por provider
export type OpenAIModel = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo';
export type GeminiModel = 'gemini-2.0-flash-exp' | 'gemini-1.5-pro' | 'gemini-1.5-flash';
export type OpenRouterModel = 
  // Gratuitos (DESTAQUE)
  | 'google/gemma-2-9b-it:free'
  | 'meta-llama/llama-3.2-3b-instruct:free'
  | 'mistralai/mistral-7b-instruct:free'
  | 'microsoft/phi-3-mini-128k-instruct:free'
  | 'qwen/qwen-2-7b-instruct:free'
  | 'huggingfaceh4/zephyr-7b-beta:free'
  // Premium populares
  | 'openai/gpt-4o'
  | 'openai/gpt-4o-mini'
  | 'anthropic/claude-3.5-sonnet'
  | 'anthropic/claude-3-haiku'
  | 'google/gemini-pro-1.5'
  | 'google/gemini-flash-1.5'
  | 'meta-llama/llama-3.1-70b-instruct'
  | 'meta-llama/llama-3.1-8b-instruct'
  | 'mistralai/mixtral-8x7b-instruct'
  | 'deepseek/deepseek-chat'
  | 'qwen/qwen-2.5-72b-instruct';

export type AIModel = OpenAIModel | GeminiModel | OpenRouterModel;

// Configuração de modelos com metadados
export interface ModelConfig {
  id: AIModel;
  name: string;
  provider: AIProvider;
  isFree: boolean;
  contextWindow: number;
  description?: string;
}

export const AI_MODELS: ModelConfig[] = [
  // ===== MODELOS GRATUITOS (TOPO) =====
  { id: 'google/gemma-2-9b-it:free', name: '🆓 Gemma 2 9B (Google)', provider: 'openrouter', isFree: true, contextWindow: 8192, description: 'Modelo Google gratuito, excelente qualidade' },
  { id: 'meta-llama/llama-3.2-3b-instruct:free', name: '🆓 Llama 3.2 3B (Meta)', provider: 'openrouter', isFree: true, contextWindow: 131072, description: 'Modelo Meta leve e rápido' },
  { id: 'mistralai/mistral-7b-instruct:free', name: '🆓 Mistral 7B', provider: 'openrouter', isFree: true, contextWindow: 32768, description: 'Modelo europeu de alta qualidade' },
  { id: 'microsoft/phi-3-mini-128k-instruct:free', name: '🆓 Phi-3 Mini (Microsoft)', provider: 'openrouter', isFree: true, contextWindow: 128000, description: 'Modelo Microsoft compacto' },
  { id: 'qwen/qwen-2-7b-instruct:free', name: '🆓 Qwen 2 7B (Alibaba)', provider: 'openrouter', isFree: true, contextWindow: 32768, description: 'Modelo chinês muito capaz' },
  { id: 'huggingfaceh4/zephyr-7b-beta:free', name: '🆓 Zephyr 7B (HuggingFace)', provider: 'openrouter', isFree: true, contextWindow: 4096, description: 'Modelo open-source otimizado' },
  
  // ===== OPENAI DIRETO =====
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', isFree: false, contextWindow: 128000, description: 'Modelo mais avançado da OpenAI' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', isFree: false, contextWindow: 128000, description: 'Versão econômica do GPT-4o' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', isFree: false, contextWindow: 16385, description: 'Modelo clássico e rápido' },
  
  // ===== GEMINI DIRETO =====
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'gemini', isFree: false, contextWindow: 1000000, description: 'Modelo mais recente do Google' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini', isFree: false, contextWindow: 2000000, description: 'Contexto massivo de 2M tokens' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini', isFree: false, contextWindow: 1000000, description: 'Rápido e eficiente' },
  
  // ===== OPENROUTER PREMIUM =====
  { id: 'openai/gpt-4o', name: 'GPT-4o (via Router)', provider: 'openrouter', isFree: false, contextWindow: 128000 },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (via Router)', provider: 'openrouter', isFree: false, contextWindow: 128000 },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'openrouter', isFree: false, contextWindow: 200000, description: 'Melhor modelo da Anthropic' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'openrouter', isFree: false, contextWindow: 200000, description: 'Claude rápido e barato' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5 (via Router)', provider: 'openrouter', isFree: false, contextWindow: 2000000 },
  { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5 (via Router)', provider: 'openrouter', isFree: false, contextWindow: 1000000 },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'openrouter', isFree: false, contextWindow: 131072, description: 'Modelo grande da Meta' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'openrouter', isFree: false, contextWindow: 131072, description: 'Modelo médio da Meta' },
  { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B', provider: 'openrouter', isFree: false, contextWindow: 32768, description: 'Modelo MoE da Mistral' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', provider: 'openrouter', isFree: false, contextWindow: 64000, description: 'Excelente custo-benefício' },
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'openrouter', isFree: false, contextWindow: 131072, description: 'Modelo grande da Alibaba' },
];

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

export interface ChatAttachment {
  id: string;
  type: 'image' | 'video' | 'file';
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  agent_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: ChatAttachment[];
  mentions?: string[]; // IDs dos mencionados
  created_at: string;
}

// ========== CHAT PROJECT ==========
export interface ChatProject {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  project_id?: string;
  title: string;
  agent_ids: string[];
  is_team_chat: boolean;
  last_message?: string;
  updated_at: string;
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
export type SocialChannel = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | 'twitter' | 'pinterest' | 'threads' | 'google_business';

export interface MediaFile {
  id: string;
  url: string;
  type: 'image' | 'video' | 'document';
  name: string;
  caption?: string;
  thumbnail?: string;
}

// ========== DEMAND HISTORY (Histórico) ==========
export interface DemandHistoryEntry {
  id: string;
  demand_id: string;
  action: 'created' | 'status_changed' | 'content_updated' | 'media_added' | 'approved' | 'adjustment_requested' | 'comment' | 'assigned' | 'published';
  description: string;
  user_name: string;
  user_email?: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

// ========== DEMAND ==========
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
  updated_at: string;
  
  // Equipe de Criação (igual mLabs)
  team_redator_id?: string;
  team_redator_name?: string;
  team_designer_id?: string;
  team_designer_name?: string;
  assigned_agent_id?: string;
  
  // Aprovadores Internos (até 2, em cadeia)
  internal_approvers: ApproverAssignment[];
  skip_internal_approval: boolean;
  
  // Aprovadores Externos (até 2, em cadeia)
  external_approvers: ApproverAssignment[];
  skip_external_approval: boolean;
  
  // Token de aprovação externa
  approval_token: string;
  approval_link_sent: boolean;
  approval_link_sent_at?: string;
  
  // Status geral de aprovação
  approval_status: 'pending' | 'internal_approved' | 'approved' | 'needs_adjustment';
  
  // Histórico de atividades
  history: DemandHistoryEntry[];
  
  // Comentários/Feedback
  comments: DemandComment[];
  
  // Flags
  auto_schedule: boolean;
  created_by_ai: boolean;
  ai_suggestions?: string;
  is_draft: boolean;
}

export interface DemandComment {
  id: string;
  demand_id: string;
  user_name: string;
  user_email?: string;
  user_type: 'team' | 'internal_approver' | 'external_approver';
  content: string;
  created_at: string;
}

// ========== APPROVAL LINK ==========
export interface ApprovalLink {
  id: string;
  demand_id: string;
  token: string;
  approver_name: string;
  approver_email: string;
  approver_phone?: string;
  status: 'pending' | 'approved' | 'adjustment_requested';
  feedback?: string;
  expires_at: string;
  created_at: string;
  viewed_at?: string;
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
  openrouter_key?: string;
  google_drive_connected: boolean;
  // Late API (Social Media Publishing)
  late_api_key?: string;
  late_connected_accounts: LateConnectedAccount[];
  // Asaas (Pagamentos)
  asaas_key?: string;
  // Z-API (WhatsApp)
  zapi_instance_id?: string;
  zapi_token?: string;
  zapi_client_token?: string;
}

export interface LateConnectedAccount {
  id: string;
  platform: SocialChannel;
  name: string;
  username?: string;
  profilePicture?: string;
  isConnected: boolean;
  connectedAt: string;
}

export interface PublishResult {
  demandId: string;
  success: boolean;
  platforms: {
    platform: SocialChannel;
    success: boolean;
    postUrl?: string;
    error?: string;
  }[];
  publishedAt?: string;
  scheduledFor?: string;
}

// ========== WORKFLOW COLUMNS CONFIG ==========
export const WORKFLOW_COLUMNS: { id: DemandStatus; label: string; color: string; icon: string }[] = [
  { id: 'rascunho', label: 'Rascunho', color: 'gray', icon: '📝' },
  { id: 'conteudo', label: 'Conteúdo', color: 'blue', icon: '✍️' },
  { id: 'design', label: 'Design', color: 'purple', icon: '🎨' },
  { id: 'aprovacao_interna', label: 'Aprovação Interna', color: 'yellow', icon: '👀' },
  { id: 'aprovacao_cliente', label: 'Aprovação Cliente', color: 'orange', icon: '🤝' },
  { id: 'ajustes', label: 'Ajustes', color: 'red', icon: '🔧' },
  { id: 'aguardando_agendamento', label: 'Aguardando', color: 'cyan', icon: '⏳' },
  { id: 'aprovado_agendado', label: 'Aprovado', color: 'emerald', icon: '📅' },
  { id: 'concluido', label: 'Concluídos', color: 'green', icon: '✅' },
];

export const SOCIAL_CHANNELS: { id: SocialChannel; label: string; icon: string; color: string }[] = [
  { id: 'instagram', label: 'Instagram', icon: '📸', color: '#E4405F' },
  { id: 'facebook', label: 'Facebook', icon: '📘', color: '#1877F2' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵', color: '#000000' },
  { id: 'youtube', label: 'YouTube', icon: '▶️', color: '#FF0000' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', color: '#0A66C2' },
  { id: 'twitter', label: 'X', icon: '✖️', color: '#000000' },
  { id: 'pinterest', label: 'Pinterest', icon: '📌', color: '#E60023' },
  { id: 'threads', label: 'Threads', icon: '🧵', color: '#000000' },
  { id: 'google_business', label: 'Google Meu Negócio', icon: '🏢', color: '#4285F4' },
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

// ========== CONTENT HISTORY (Backup) ==========
export interface ContentHistoryEntry {
  id: string;
  demand_id: string;
  title: string;
  content_type: ContentType;
  caption?: string;
  media_urls: string[];
  channels: SocialChannel[];
  published_at?: string;
  status: 'published' | 'archived';
  created_at: string;
}

// ========== CONTRACT TEMPLATE ==========
export interface ContractTemplate {
  id: string;
  name: string;
  description?: string;
  content: string; // HTML ou Markdown com variáveis
  variables: ContractVariable[];
  is_active: boolean;
  created_at: string;
}

export interface ContractVariable {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'client_field';
  options?: string[]; // Para type: 'select'
  clientField?: string; // Para type: 'client_field' - ex: 'name', 'company', 'cpf_cnpj'
  required: boolean;
}

export const CONTRACT_VARIABLES: ContractVariable[] = [
  { key: 'cliente_nome', label: 'Nome do Cliente', type: 'client_field', clientField: 'name', required: true },
  { key: 'cliente_empresa', label: 'Empresa', type: 'client_field', clientField: 'company', required: true },
  { key: 'cliente_cpf_cnpj', label: 'CPF/CNPJ', type: 'client_field', clientField: 'cpf_cnpj', required: true },
  { key: 'cliente_email', label: 'Email', type: 'client_field', clientField: 'email', required: true },
  { key: 'cliente_telefone', label: 'Telefone', type: 'client_field', clientField: 'phone', required: false },
  { key: 'cliente_endereco', label: 'Endereço Completo', type: 'client_field', clientField: 'address', required: false },
  { key: 'valor_mensal', label: 'Valor Mensal', type: 'number', required: true },
  { key: 'data_inicio', label: 'Data de Início', type: 'date', required: true },
  { key: 'data_fim', label: 'Data de Término', type: 'date', required: false },
  { key: 'servicos', label: 'Serviços Contratados', type: 'text', required: true },
  { key: 'posts_mes', label: 'Posts por Mês', type: 'number', required: false },
  { key: 'redes_sociais', label: 'Redes Sociais', type: 'text', required: false },
];

// ========== CHATBOT / LEAD BOT ==========
export interface ChatbotConfig {
  id: string;
  name: string;
  avatar: string;
  personality: string; // Descrição da personalidade
  greeting: string; // Mensagem inicial
  fields_to_collect: ChatbotField[];
  thank_you_message: string;
  webhook_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface ChatbotField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'number';
  question: string; // Pergunta humanizada
  validation_message?: string;
  options?: string[]; // Para select
  required: boolean;
  order: number;
}

// ========== NOTIFICATION TEMPLATE ==========
export interface NotificationTemplate {
  id: string;
  name: string;
  trigger: string;
  channel: 'whatsapp' | 'email' | 'both';
  message: string;
  isActive: boolean;
  variables: string[];
}

// ========== ADMIN METRICS ==========
export interface AdminMetrics {
  // Financeiro
  revenue: {
    total: number;
    pending: number;
    overdue: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  // Produção
  production: {
    totalDemands: number;
    completedThisMonth: number;
    averageDeliveryDays: number;
    pendingApproval: number;
  };
  // Equipe
  team: {
    memberId: string;
    memberName: string;
    completedDemands: number;
    pendingDemands: number;
    averageTime: number;
  }[];
  // Clientes
  clients: {
    total: number;
    active: number;
    churnRate: number;
    newThisMonth: number;
  };
}

// ========== USER PERMISSIONS ==========
export interface UserPermissions {
  canViewFinancial: boolean;
  canManageTeam: boolean;
  canManageClients: boolean;
  canManageSettings: boolean;
  canViewAdmin: boolean;
  canPublish: boolean;
  canApprove: boolean;
}

export const USER_ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  admin: { canViewFinancial: true, canManageTeam: true, canManageClients: true, canManageSettings: true, canViewAdmin: true, canPublish: true, canApprove: true },
  manager: { canViewFinancial: true, canManageTeam: true, canManageClients: true, canManageSettings: false, canViewAdmin: false, canPublish: true, canApprove: true },
  redator: { canViewFinancial: false, canManageTeam: false, canManageClients: false, canManageSettings: false, canViewAdmin: false, canPublish: false, canApprove: false },
  designer: { canViewFinancial: false, canManageTeam: false, canManageClients: false, canManageSettings: false, canViewAdmin: false, canPublish: false, canApprove: false },
  member: { canViewFinancial: false, canManageTeam: false, canManageClients: false, canManageSettings: false, canViewAdmin: false, canPublish: false, canApprove: false },
};
