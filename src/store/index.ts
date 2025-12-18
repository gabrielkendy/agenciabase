import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Client, Agent, Demand, Notification, APIConfig, DemandStatus, Conversation, ChatMessage, TeamMember, DemandHistoryEntry, DemandComment, ContractTemplate, ChatbotConfig, ContentHistoryEntry } from '../types';
import { NotificationTemplate } from '../services/zapiService';
import { v4 as uuidv4 } from 'uuid';

interface StoreState {
  // User
  currentUser: { id: string; name: string; email: string; role: string } | null;
  setCurrentUser: (user: { id: string; name: string; email: string; role: string } | null) => void;
  logout: () => void;
  
  // Team Members (Equipe de Criação)
  teamMembers: TeamMember[];
  addTeamMember: (member: Omit<TeamMember, 'id' | 'created_at'>) => void;
  updateTeamMember: (id: string, member: Partial<TeamMember>) => void;
  deleteTeamMember: (id: string) => void;
  
  // Clients
  clients: Client[];
  addClient: (client: Omit<Client, 'id' | 'created_at'>) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addContentHistory: (clientId: string, entry: Omit<ContentHistoryEntry, 'id' | 'created_at'>) => void;
  
  // Agents
  agents: Agent[];
  addAgent: (agent: Omit<Agent, 'id' | 'created_at'>) => void;
  updateAgent: (id: string, agent: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  
  // Demands (Workflow completo estilo mLabs)
  demands: Demand[];
  addDemand: (demand: Omit<Demand, 'id' | 'created_at' | 'updated_at' | 'approval_token' | 'history'>) => string;
  updateDemand: (id: string, demand: Partial<Demand>) => void;
  deleteDemand: (id: string) => void;
  moveDemand: (id: string, status: DemandStatus, userName?: string) => void;
  publishDemand: (id: string, userName?: string) => void;
  
  // Demand History
  addDemandHistory: (demandId: string, entry: Omit<DemandHistoryEntry, 'id' | 'demand_id' | 'created_at'>) => void;
  
  // Demand Comments
  addDemandComment: (demandId: string, comment: Omit<DemandComment, 'id' | 'demand_id' | 'created_at'>) => void;
  
  // Approval Actions
  approveByInternal: (demandId: string, approverId: string, userName: string) => void;
  requestAdjustmentByInternal: (demandId: string, approverId: string, feedback: string, userName: string) => void;
  approveByExternal: (demandId: string, approverId: string, userName: string) => void;
  requestAdjustmentByExternal: (demandId: string, approverId: string, feedback: string, userName: string) => void;
  approveAllPendingByToken: (token: string, userName: string) => void;
  
  // Filters
  demandFilters: {
    clientId: string | null;
    status: DemandStatus | null;
    channel: string | null;
    dateRange: { start: string | null; end: string | null };
    search: string;
  };
  setDemandFilters: (filters: Partial<StoreState['demandFilters']>) => void;
  clearFilters: () => void;

  // Conversations & Messages
  conversations: Conversation[];
  messages: ChatMessage[];
  addConversation: (conv: Omit<Conversation, 'id' | 'created_at'>) => string;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'created_at'>) => void;
  
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
  
  // API Config
  apiConfig: APIConfig;
  setApiConfig: (config: Partial<APIConfig>) => void;
  
  // Notification Templates
  notificationTemplates: NotificationTemplate[];
  addNotificationTemplate: (template: NotificationTemplate) => void;
  updateNotificationTemplate: (id: string, template: Partial<NotificationTemplate>) => void;
  deleteNotificationTemplate: (id: string) => void;
  
  // Contract Templates
  contractTemplates: ContractTemplate[];
  addContractTemplate: (template: ContractTemplate) => void;
  updateContractTemplate: (id: string, template: Partial<ContractTemplate>) => void;
  deleteContractTemplate: (id: string) => void;
  
  // Chatbots
  chatbots: ChatbotConfig[];
  addChatbot: (chatbot: ChatbotConfig) => void;
  updateChatbot: (id: string, chatbot: Partial<ChatbotConfig>) => void;
  deleteChatbot: (id: string) => void;
}

// Default Team Members
const defaultTeamMembers: Omit<TeamMember, 'id' | 'created_at'>[] = [
  { name: 'Agência Base', email: 'contato@agenciabase.com', role: 'manager', is_active: true },
  { name: 'Kendy Produções', email: 'kendy@producoes.com', role: 'both', is_active: true },
];

const defaultAgents: Omit<Agent, 'id' | 'created_at'>[] = [
  {
    user_id: 'system',
    name: 'Sofia',
    role: 'Gestora de Demandas',
    avatar: '👩‍💼',
    description: 'Especialista em criar e organizar demandas de conteúdo no Kanban',
    system_prompt: `Você é Sofia, Gestora de Demandas da agência. Sua função é:
- Analisar briefings e criar demandas estruturadas
- Organizar tarefas no Kanban com título, descrição, tipo de conteúdo e canais
- Sugerir hashtags e legendas otimizadas
- Definir prioridades e prazos realistas
Sempre retorne demandas em formato JSON quando solicitado.`,
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    temperature: 0.7,
    is_active: true,
    trained_knowledge: '',
  },
  {
    user_id: 'system',
    name: 'Ana',
    role: 'Redatora Criativa',
    avatar: '✍️',
    description: 'Cria legendas, copies e textos persuasivos',
    system_prompt: `Você é Ana, Redatora Criativa. Especialista em criar textos que engajam e convertem. Use técnicas de copywriting, storytelling e gatilhos mentais.`,
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    temperature: 0.8,
    is_active: true,
    trained_knowledge: '',
  },
  {
    user_id: 'system',
    name: 'Carlos',
    role: 'Estrategista Digital',
    avatar: '📊',
    description: 'Análise de dados e estratégias de marketing',
    system_prompt: `Você é Carlos, Estrategista Digital. Analisa métricas, sugere melhores horários de postagem, identifica tendências e otimiza resultados.`,
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    temperature: 0.6,
    is_active: true,
    trained_knowledge: '',
  },
];


export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // User
      currentUser: null, // Será null até fazer login
      setCurrentUser: (user) => set({ currentUser: user }),
      logout: () => set({ currentUser: null }),
      
      // Team Members
      teamMembers: defaultTeamMembers.map((m) => ({ ...m, id: uuidv4(), created_at: new Date().toISOString() })),
      addTeamMember: (member) => set((state) => ({
        teamMembers: [...state.teamMembers, { ...member, id: uuidv4(), created_at: new Date().toISOString() }]
      })),
      updateTeamMember: (id, updates) => set((state) => ({
        teamMembers: state.teamMembers.map((m) => m.id === id ? { ...m, ...updates } : m)
      })),
      deleteTeamMember: (id) => set((state) => ({
        teamMembers: state.teamMembers.filter((m) => m.id !== id)
      })),
      
      // Clients
      clients: [],
      addClient: (client) => set((state) => ({
        clients: [...state.clients, { ...client, id: uuidv4(), created_at: new Date().toISOString(), channels: client.channels || [], approvers: client.approvers || [] }]
      })),
      updateClient: (id, updates) => set((state) => ({
        clients: state.clients.map((c) => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteClient: (id) => set((state) => ({
        clients: state.clients.filter((c) => c.id !== id),
        demands: state.demands.filter((d) => d.client_id !== id)
      })),
      addContentHistory: (clientId, entry) => set((state) => ({
        clients: state.clients.map((c) => c.id === clientId ? {
          ...c,
          content_history: [...(c.content_history || []), { ...entry, id: uuidv4(), created_at: new Date().toISOString() }]
        } : c)
      })),
      
      // Agents
      agents: defaultAgents.map((a) => ({ ...a, id: uuidv4(), created_at: new Date().toISOString() })),
      addAgent: (agent) => set((state) => ({
        agents: [...state.agents, { ...agent, id: uuidv4(), created_at: new Date().toISOString() }]
      })),
      updateAgent: (id, updates) => set((state) => ({
        agents: state.agents.map((a) => a.id === id ? { ...a, ...updates } : a)
      })),
      deleteAgent: (id) => set((state) => ({
        agents: state.agents.filter((a) => a.id !== id)
      })),
      
      // Demands
      demands: [],
      addDemand: (demand) => {
        const id = uuidv4();
        const token = uuidv4().replace(/-/g, '');
        const now = new Date().toISOString();
        const historyEntry: DemandHistoryEntry = {
          id: uuidv4(),
          demand_id: id,
          action: 'created',
          description: 'Demanda criada',
          user_name: get().currentUser?.name || 'Sistema',
          created_at: now,
        };
        set((state) => ({
          demands: [...state.demands, {
            ...demand,
            id,
            created_at: now,
            updated_at: now,
            approval_token: token,
            history: [historyEntry],
            comments: demand.comments || [],
            internal_approvers: demand.internal_approvers || [],
            external_approvers: demand.external_approvers || [],
            skip_internal_approval: demand.skip_internal_approval || false,
            skip_external_approval: demand.skip_external_approval || false,
            approval_link_sent: false,
            is_draft: demand.is_draft || false,
          }]
        }));
        return id;
      },
      updateDemand: (id, updates) => set((state) => ({
        demands: state.demands.map((d) => d.id === id ? { ...d, ...updates, updated_at: new Date().toISOString() } : d)
      })),
      deleteDemand: (id) => set((state) => ({
        demands: state.demands.filter((d) => d.id !== id)
      })),
      moveDemand: (id, status, userName) => {
        const demand = get().demands.find((d) => d.id === id);
        if (!demand) return;
        
        const historyEntry: DemandHistoryEntry = {
          id: uuidv4(),
          demand_id: id,
          action: 'status_changed',
          description: `Status alterado para ${status}`,
          user_name: userName || get().currentUser?.name || 'Sistema',
          old_value: demand.status,
          new_value: status,
          created_at: new Date().toISOString(),
        };
        
        set((state) => ({
          demands: state.demands.map((d) => d.id === id ? { 
            ...d, 
            status, 
            updated_at: new Date().toISOString(),
            history: [...d.history, historyEntry]
          } : d)
        }));
      },
      
      publishDemand: (id, userName) => {
        const demand = get().demands.find((d) => d.id === id);
        if (!demand) return;
        
        const now = new Date().toISOString();
        const historyEntry: DemandHistoryEntry = {
          id: uuidv4(),
          demand_id: id,
          action: 'published',
          description: 'Conteúdo publicado',
          user_name: userName || get().currentUser?.name || 'Sistema',
          created_at: now,
        };
        
        // Update demand status to concluido
        set((state) => ({
          demands: state.demands.map((d) => d.id === id ? { 
            ...d, 
            status: 'concluido' as DemandStatus,
            published_date: now,
            updated_at: now,
            history: [...d.history, historyEntry]
          } : d)
        }));
        
        // Save to client's content history
        const contentEntry: Omit<ContentHistoryEntry, 'id' | 'created_at'> = {
          demand_id: id,
          title: demand.title,
          content_type: demand.content_type,
          caption: demand.caption,
          media_urls: demand.media.map(m => m.url),
          channels: demand.channels,
          published_at: now,
          status: 'published'
        };
        get().addContentHistory(demand.client_id, contentEntry);
      },
      
      // Demand History
      addDemandHistory: (demandId, entry) => set((state) => ({
        demands: state.demands.map((d) => d.id === demandId ? {
          ...d,
          history: [...d.history, { ...entry, id: uuidv4(), demand_id: demandId, created_at: new Date().toISOString() }]
        } : d)
      })),
      
      // Demand Comments
      addDemandComment: (demandId, comment) => set((state) => ({
        demands: state.demands.map((d) => d.id === demandId ? {
          ...d,
          comments: [...d.comments, { ...comment, id: uuidv4(), demand_id: demandId, created_at: new Date().toISOString() }]
        } : d)
      })),
      
      // Approval Actions - Internal
      approveByInternal: (demandId, approverId, userName) => {
        const demand = get().demands.find((d) => d.id === demandId);
        if (!demand) return;
        
        const updatedApprovers = demand.internal_approvers.map((a) => 
          a.approver_id === approverId ? { ...a, status: 'approved' as const, approved_at: new Date().toISOString() } : a
        );
        
        // Check if all internal approvers approved
        const allInternalApproved = updatedApprovers.every((a) => a.status === 'approved');
        
        const historyEntry: DemandHistoryEntry = {
          id: uuidv4(),
          demand_id: demandId,
          action: 'approved',
          description: `Aprovado internamente por ${userName}`,
          user_name: userName,
          created_at: new Date().toISOString(),
        };
        
        set((state) => ({
          demands: state.demands.map((d) => d.id === demandId ? {
            ...d,
            internal_approvers: updatedApprovers,
            approval_status: allInternalApproved ? 'internal_approved' : d.approval_status,
            status: allInternalApproved ? 'aprovacao_cliente' : d.status,
            history: [...d.history, historyEntry],
            updated_at: new Date().toISOString(),
          } : d)
        }));
      },
      
      requestAdjustmentByInternal: (demandId, approverId, feedback, userName) => {
        const demand = get().demands.find((d) => d.id === demandId);
        if (!demand) return;
        
        const updatedApprovers = demand.internal_approvers.map((a) => 
          a.approver_id === approverId ? { ...a, status: 'adjustment_requested' as const, feedback } : a
        );
        
        const historyEntry: DemandHistoryEntry = {
          id: uuidv4(),
          demand_id: demandId,
          action: 'adjustment_requested',
          description: `Ajuste solicitado por ${userName}: ${feedback}`,
          user_name: userName,
          created_at: new Date().toISOString(),
        };
        
        set((state) => ({
          demands: state.demands.map((d) => d.id === demandId ? {
            ...d,
            internal_approvers: updatedApprovers,
            approval_status: 'needs_adjustment',
            status: 'ajustes',
            history: [...d.history, historyEntry],
            updated_at: new Date().toISOString(),
          } : d)
        }));
      },
      
      // Approval Actions - External
      approveByExternal: (demandId, approverId, userName) => {
        const demand = get().demands.find((d) => d.id === demandId);
        if (!demand) return;
        
        const updatedApprovers = demand.external_approvers.map((a) => 
          a.approver_id === approverId ? { ...a, status: 'approved' as const, approved_at: new Date().toISOString() } : a
        );
        
        // Check if all external approvers approved (in order)
        const allExternalApproved = updatedApprovers.every((a) => a.status === 'approved');
        
        const historyEntry: DemandHistoryEntry = {
          id: uuidv4(),
          demand_id: demandId,
          action: 'approved',
          description: `Aprovado pelo cliente ${userName}`,
          user_name: userName,
          created_at: new Date().toISOString(),
        };
        
        let newStatus: DemandStatus = demand.status;
        if (allExternalApproved) {
          newStatus = demand.auto_schedule ? 'aprovado_agendado' : 'aguardando_agendamento';
        }
        
        set((state) => ({
          demands: state.demands.map((d) => d.id === demandId ? {
            ...d,
            external_approvers: updatedApprovers,
            approval_status: allExternalApproved ? 'approved' : d.approval_status,
            status: newStatus,
            history: [...d.history, historyEntry],
            updated_at: new Date().toISOString(),
          } : d)
        }));
      },
      
      requestAdjustmentByExternal: (demandId, approverId, feedback, userName) => {
        const demand = get().demands.find((d) => d.id === demandId);
        if (!demand) return;
        
        const updatedApprovers = demand.external_approvers.map((a) => 
          a.approver_id === approverId ? { ...a, status: 'adjustment_requested' as const, feedback } : a
        );
        
        const historyEntry: DemandHistoryEntry = {
          id: uuidv4(),
          demand_id: demandId,
          action: 'adjustment_requested',
          description: `Ajuste solicitado pelo cliente ${userName}: ${feedback}`,
          user_name: userName,
          created_at: new Date().toISOString(),
        };
        
        set((state) => ({
          demands: state.demands.map((d) => d.id === demandId ? {
            ...d,
            external_approvers: updatedApprovers,
            approval_status: 'needs_adjustment',
            status: 'ajustes',
            history: [...d.history, historyEntry],
            updated_at: new Date().toISOString(),
          } : d)
        }));
      },
      
      // Approve all pending demands by token
      approveAllPendingByToken: (token, userName) => {
        const demandsToApprove = get().demands.filter(
          (d) => d.approval_token === token && d.status === 'aprovacao_cliente'
        );
        
        demandsToApprove.forEach((demand) => {
          const updatedApprovers = demand.external_approvers.map((a) => ({
            ...a,
            status: 'approved' as const,
            approved_at: new Date().toISOString()
          }));
          
          const historyEntry: DemandHistoryEntry = {
            id: uuidv4(),
            demand_id: demand.id,
            action: 'approved',
            description: `Aprovado em lote pelo cliente ${userName}`,
            user_name: userName,
            created_at: new Date().toISOString(),
          };
          
          set((state) => ({
            demands: state.demands.map((d) => d.id === demand.id ? {
              ...d,
              external_approvers: updatedApprovers,
              approval_status: 'approved',
              status: demand.auto_schedule ? 'aprovado_agendado' : 'aguardando_agendamento',
              history: [...d.history, historyEntry],
              updated_at: new Date().toISOString(),
            } : d)
          }));
        });
      },

      // Filters
      demandFilters: {
        clientId: null,
        status: null,
        channel: null,
        dateRange: { start: null, end: null },
        search: '',
      },
      setDemandFilters: (filters) => set((state) => ({
        demandFilters: { ...state.demandFilters, ...filters }
      })),
      clearFilters: () => set({
        demandFilters: { clientId: null, status: null, channel: null, dateRange: { start: null, end: null }, search: '' }
      }),
      
      // Conversations
      conversations: [],
      messages: [],
      addConversation: (conv) => {
        const id = uuidv4();
        set((state) => ({
          conversations: [...state.conversations, { ...conv, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]
        }));
        return id;
      },
      updateConversation: (id, updates) => set((state) => ({
        conversations: state.conversations.map((c) => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteConversation: (id) => set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        messages: state.messages.filter((m) => m.conversation_id !== id)
      })),
      addMessage: (msg) => set((state) => ({
        messages: [...state.messages, { ...msg, id: uuidv4(), created_at: new Date().toISOString() }]
      })),
      
      // Notifications
      notifications: [],
      addNotification: (notification) => set((state) => ({
        notifications: [{ ...notification, id: uuidv4(), timestamp: new Date().toISOString(), read: false }, ...state.notifications]
      })),
      markAsRead: (id) => set((state) => ({
        notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true } : n)
      })),
      clearNotifications: () => set({ notifications: [] }),
      
      // API Config - Keys são carregadas do localStorage ou configuradas pelo usuário
      // As Edge Functions usam variáveis de ambiente do servidor (seguro)
      apiConfig: {
        gemini_key: '',
        openrouter_key: '',
        openai_key: '',
        google_drive_connected: false,
        late_api_key: '',
        late_connected_accounts: [],
        asaas_key: '',
        zapi_instance_id: '',
        zapi_token: '',
        zapi_client_token: '',
        freepik_key: '',
        elevenlabs_key: '',
        falai_key: '',
      },
      setApiConfig: (config) => set((state) => ({
        apiConfig: { ...state.apiConfig, ...config }
      })),
      
      // Notification Templates
      notificationTemplates: [],
      addNotificationTemplate: (template) => set((state) => ({
        notificationTemplates: [...state.notificationTemplates, template]
      })),
      updateNotificationTemplate: (id, template) => set((state) => ({
        notificationTemplates: state.notificationTemplates.map((t) => t.id === id ? { ...t, ...template } : t)
      })),
      deleteNotificationTemplate: (id) => set((state) => ({
        notificationTemplates: state.notificationTemplates.filter((t) => t.id !== id)
      })),
      
      // Contract Templates
      contractTemplates: [],
      addContractTemplate: (template) => set((state) => ({
        contractTemplates: [...state.contractTemplates, template]
      })),
      updateContractTemplate: (id, template) => set((state) => ({
        contractTemplates: state.contractTemplates.map((t) => t.id === id ? { ...t, ...template } : t)
      })),
      deleteContractTemplate: (id) => set((state) => ({
        contractTemplates: state.contractTemplates.filter((t) => t.id !== id)
      })),
      
      // Chatbots
      chatbots: [],
      addChatbot: (chatbot) => set((state) => ({
        chatbots: [...state.chatbots, chatbot]
      })),
      updateChatbot: (id, chatbot) => set((state) => ({
        chatbots: state.chatbots.map((c) => c.id === id ? { ...c, ...chatbot } : c)
      })),
      deleteChatbot: (id) => set((state) => ({
        chatbots: state.chatbots.filter((c) => c.id !== id)
      })),
    }),
    { name: 'base-agency-store-v2' }
  )
);
