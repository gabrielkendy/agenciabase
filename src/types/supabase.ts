// Tipos gerados para o Supabase Database

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'member';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';
export type PlanSlug = 'free' | 'starter' | 'pro' | 'enterprise';

export interface Database {
  public: {
    Tables: {
      plans: {
        Row: {
          id: string;
          name: string;
          slug: PlanSlug;
          description: string | null;
          price_monthly: number;
          price_yearly: number;
          features: PlanFeatures;
          limits: PlanLimits;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['plans']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['plans']['Insert']>;
      };
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          plan_id: string | null;
          subscription_status: SubscriptionStatus;
          trial_ends_at: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          settings: TenantSettings;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          tenant_id: string | null;
          name: string;
          email: string;
          avatar_url: string | null;
          role: UserRole;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      tenant_integrations: {
        Row: {
          id: string;
          tenant_id: string;
          provider: string;
          credentials: Record<string, unknown>;
          is_active: boolean;
          last_tested_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tenant_integrations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['tenant_integrations']['Insert']>;
      };
      global_integrations: {
        Row: {
          id: string;
          provider: string;
          credentials: Record<string, unknown>;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['global_integrations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['global_integrations']['Insert']>;
      };
      clients: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          company: string | null;
          cpf_cnpj: string | null;
          color: string;
          status: string;
          monthly_value: number;
          settings: Record<string, unknown>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
      };
      demands: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string;
          created_by: string | null;
          assigned_to: string | null;
          title: string;
          briefing: string | null;
          caption: string | null;
          hashtags: string | null;
          status: string;
          content_type: string | null;
          channels: string[];
          media: unknown[];
          scheduled_date: string | null;
          scheduled_time: string | null;
          settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['demands']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['demands']['Insert']>;
      };
      agents: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          role: string | null;
          avatar: string | null;
          description: string | null;
          system_prompt: string | null;
          provider: string;
          model: string | null;
          temperature: number;
          is_active: boolean;
          trained_knowledge: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agents']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['agents']['Insert']>;
      };
      conversations: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          agent_id: string | null;
          title: string | null;
          project_id: string | null;
          is_pinned: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          attachments: unknown[];
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      usage_metrics: {
        Row: {
          id: string;
          tenant_id: string;
          metric_type: string;
          metric_value: number;
          period_start: string;
          period_end: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['usage_metrics']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['usage_metrics']['Insert']>;
      };
    };
  };
}

// Tipos auxiliares
export interface PlanFeatures {
  workflow: boolean;
  calendar: boolean;
  chat_ia: boolean;
  creator_studio: boolean;
  approval_links: boolean;
  whatsapp: boolean;
  analytics: boolean;
  white_label?: boolean;
  api_access?: boolean;
  dedicated_support?: boolean;
}

export interface PlanLimits {
  users: number; // -1 = ilimitado
  clients: number;
  demands_per_month: number;
  ai_messages_per_month: number;
  storage_mb: number;
  agents: number;
}

export interface TenantSettings {
  branding?: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
  notifications?: {
    email_enabled?: boolean;
    whatsapp_enabled?: boolean;
  };
  defaults?: {
    timezone?: string;
    language?: string;
  };
}

// Tipo para o usuário autenticado com perfil
export interface AuthUser {
  id: string;
  email: string;
  profile: Database['public']['Tables']['profiles']['Row'] | null;
  tenant: Database['public']['Tables']['tenants']['Row'] | null;
  plan: Database['public']['Tables']['plans']['Row'] | null;
}

// Tipos de tabela simplificados para uso
export type Plan = Database['public']['Tables']['plans']['Row'];
export type Tenant = Database['public']['Tables']['tenants']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type TenantIntegration = Database['public']['Tables']['tenant_integrations']['Row'];
export type GlobalIntegration = Database['public']['Tables']['global_integrations']['Row'];
export type DBClient = Database['public']['Tables']['clients']['Row'];
export type DBDemand = Database['public']['Tables']['demands']['Row'];
export type DBAgent = Database['public']['Tables']['agents']['Row'];
export type DBConversation = Database['public']['Tables']['conversations']['Row'];
export type DBMessage = Database['public']['Tables']['messages']['Row'];
export type UsageMetric = Database['public']['Tables']['usage_metrics']['Row'];
