import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Client, Agent, Demand, Notification, APIConfig, DemandStatus, Conversation, ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface StoreState {
  // User
  currentUser: { id: string; name: string; email: string; role: string } | null;
  
  // Clients
  clients: Client[];
  addClient: (client: Omit<Client, 'id' | 'created_at'>) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  
  // Agents
  agents: Agent[];
  addAgent: (agent: Omit<Agent, 'id' | 'created_at'>) => void;
  updateAgent: (id: string, agent: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  
  // Demands (novo sistema de workflow)
  demands: Demand[];
  addDemand: (demand: Omit<Demand, 'id' | 'created_at' | 'approval_token'>) => string;
  updateDemand: (id: string, demand: Partial<Demand>) => void;
  deleteDemand: (id: string) => void;
  moveDemand: (id: string, status: DemandStatus) => void;
  
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
  addMessage: (msg: Omit<ChatMessage, 'id' | 'created_at'>) => void;
  
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
  
  // API Config
  apiConfig: APIConfig;
  setApiConfig: (config: Partial<APIConfig>) => void;
}

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
    (set) => ({
      // User
      currentUser: { id: '1', name: 'Admin', email: 'admin@base.ai', role: 'admin' },
      
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
        set((state) => ({
          demands: [...state.demands, {
            ...demand,
            id,
            created_at: new Date().toISOString(),
            approval_token: token,
          }]
        }));
        return id;
      },
      updateDemand: (id, updates) => set((state) => ({
        demands: state.demands.map((d) => d.id === id ? { ...d, ...updates } : d)
      })),
      deleteDemand: (id) => set((state) => ({
        demands: state.demands.filter((d) => d.id !== id)
      })),
      moveDemand: (id, status) => set((state) => ({
        demands: state.demands.map((d) => d.id === id ? { ...d, status } : d)
      })),

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
          conversations: [...state.conversations, { ...conv, id, created_at: new Date().toISOString() }]
        }));
        return id;
      },
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
      
      // API Config
      apiConfig: {
        gemini_key: 'AIzaSyDQuaiWaBwgfFbvZ0LkntIl3__YuaM3JDU',
        google_drive_connected: false,
      },
      setApiConfig: (config) => set((state) => ({
        apiConfig: { ...state.apiConfig, ...config }
      })),
    }),
    { name: 'base-agency-store' }
  )
);
