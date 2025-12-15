// ==================== USER & AUTH ====================
export type UserRole = 'admin' | 'manager' | 'member';

export interface User { id: string; name: string; email: string; role: UserRole; avatar?: string; permissions: string[]; createdAt: string; }

// ==================== AGENTS ====================
export interface KnowledgeFile { id: string; name: string; content: string; type: string; uploadedAt: string; }

export interface Agent { id: string; name: string; role: string; avatar: string; systemInstruction: string; description: string; model: string; isOnline: boolean; knowledgeFiles: KnowledgeFile[]; }

// ==================== CLIENTS ====================
export interface Client { id: string; name: string; email: string; phone: string; company: string; cnpj?: string; address?: string; color: string; logo?: string; notes?: string; status: 'active' | 'inactive' | 'prospect'; createdAt: string; }

// ==================== CONTRACTS ====================
export interface Contract { id: string; clientId: string; title: string; description?: string; value: number; billingCycle: 'monthly' | 'quarterly' | 'yearly' | 'once'; services: string[]; startDate: string; endDate?: string; status: 'active' | 'paused' | 'cancelled' | 'completed'; createdAt: string; }

// ==================== FINANCIAL ====================
export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type TransactionCategory = 'contract' | 'service' | 'tool' | 'salary' | 'tax' | 'other';

export interface Transaction { id: string; clientId?: string; contractId?: string; type: TransactionType; category: TransactionCategory; description: string; value: number; dueDate: string; paidDate?: string; status: TransactionStatus; recurrent: boolean; createdAt: string; }

// ==================== TASKS ====================
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'approved' | 'published';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type SocialChannel = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | 'twitter';

export interface Task { id: string; clientId: string; title: string; description: string; caption?: string; status: TaskStatus; priority: TaskPriority; channel: SocialChannel; assignedAgentId?: string; assignedUserId?: string; mediaUrls: string[]; scheduledDate?: string; publishedDate?: string; approvalToken: string; approvalStatus: 'pending' | 'approved' | 'rejected'; approvalFeedback?: string; createdAt: string; }

// ==================== CONTENT LIBRARY ====================
export interface Content { id: string; clientId: string; taskId?: string; title: string; contentType: string; channel: SocialChannel; content: string; mediaUrls: string[]; hashtags: string[]; status: 'draft' | 'scheduled' | 'published'; scheduledAt?: string; publishedAt?: string; createdAt: string; }

// ==================== CHAT ====================
export interface ChatMessage { id: string; role: 'user' | 'model'; text: string; timestamp: string; agentId?: string; agentName?: string; agentAvatar?: string; createdTask?: Task; }

// ==================== NOTIFICATIONS ====================
export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export interface Notification { id: string; title: string; message: string; type: NotificationType; read: boolean; link?: string; timestamp: string; }

// ==================== TEAM ====================
export interface TeamMember { id: string; name: string; email: string; role: UserRole; avatar?: string; permissions: { clients: boolean; contracts: boolean; financial: boolean; team: boolean; settings: boolean; }; createdAt: string; }

// ==================== DASHBOARD ====================
export interface DashboardMetrics { totalClients: number; activeContracts: number; monthlyRevenue: number; pendingTasks: number; completedTasks: number; pendingPayments: number; overduePayments: number; contentPublished: number; }
