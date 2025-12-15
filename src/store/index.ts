import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Client, Agent, Task, Conversation, ChatMessage, KnowledgeItem, Notification, APIConfig } from '../types';

const DEFAULT_AGENTS: Omit<Agent, 'user_id'>[] = [
  {
    id: 'agent-sofia',
    name: 'Sofia',
    role: 'Gestora de Projetos',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia&backgroundColor=ffdfbf',
    description: 'Coordena demandas, analisa solicitações e cria tarefas no Kanban automaticamente.',
    system_prompt: `Você é Sofia, Gestora de Projetos da agência. Sua função é:
- Analisar solicitações de conteúdo
- Estruturar demandas de forma clara
- Criar tarefas organizadas para o time
- Coordenar prazos e prioridades

Sempre responda em português brasileiro de forma profissional e objetiva. Quando o usuário pedir para criar conteúdo, identifique: cliente, canal (instagram/facebook/etc), tipo (post/carrossel/reels/stories) e prioridade.`,
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    temperature: 0.7,
    is_active: true,
    trained_knowledge: '',
    created_at: new Date().toISOString()
  },
  {
    id: 'agent-lucas',
    name: 'Lucas',
    role: 'Planejador de Conteúdo',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas&backgroundColor=c0aede',
    description: 'Cria calendários editoriais e estratégias de conteúdo para redes sociais.',
    system_prompt: `Você é Lucas, Planejador de Conteúdo da agência. Sua função é:
- Criar calendários editoriais mensais
- Definir estratégias de conteúdo
- Planejar campanhas e datas importantes
- Sugerir pautas e temas

Estruture suas respostas de forma organizada com datas, temas e canais. Sempre em português brasileiro.`,
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    temperature: 0.8,
    is_active: true,
    trained_knowledge: '',
    created_at: new Date().toISOString()
  },
  {
    id: 'agent-clara',
    name: 'Clara',
    role: 'Especialista em Carrosséis',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Clara&backgroundColor=ffd5dc',
    description: 'Cria roteiros de carrosséis com ganchos fortes e CTAs que convertem.',
    system_prompt: `Você é Clara, Especialista em Carrosséis da agência. Sua função é:
- Criar roteiros de carrosséis (5-10 slides)
- Desenvolver ganchos fortes no primeiro slide
- Estruturar conteúdo educativo ou storytelling
- Criar CTAs que convertem no último slide

Estruture em slides numerados (Slide 1, Slide 2...). Descreva texto e sugestão visual de cada slide. Sempre em português brasileiro.`,
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    temperature: 0.9,
    is_active: true,
    trained_knowledge: '',
    created_at: new Date().toISOString()
  },
  {
    id: 'agent-leo',
    name: 'Leo',
    role: 'Roteirista de Vídeos',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo&backgroundColor=d1d4f9',
    description: 'Cria roteiros para Reels e TikTok com ganchos nos primeiros 3 segundos.',
    system_prompt: `Você é Leo, Roteirista de Vídeos da agência. Sua função é:
- Criar roteiros para Reels e TikTok
- Desenvolver ganchos impactantes nos primeiros 3 segundos
- Estruturar em cenas com indicações de corte
- Incluir sugestões de áudio/música

Estruture: GANCHO (0-3s), DESENVOLVIMENTO, CTA. Indique ações, falas e cortes. Sempre em português brasileiro.`,
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    temperature: 0.85,
    is_active: true,
    trained_knowledge: '',
    created_at: new Date().toISOString()
  },
  {
    id: 'agent-davi',
    name: 'Davi',
    role: 'Copywriter',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Davi&backgroundColor=b6e3f4',
    description: 'Especialista em legendas, copies e textos persuasivos para redes sociais.',
    system_prompt: `Você é Davi, Copywriter da agência. Sua função é:
- Escrever legendas persuasivas
- Criar copies que engajam e convertem
- Desenvolver ganchos textuais
- Adaptar tom de voz ao cliente

Use técnicas: AIDA, PAS, storytelling. Inclua emojis estratégicos e CTAs. Sempre em português brasileiro.`,
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    temperature: 0.75,
    is_active: true,
    trained_knowledge: '',
    created_at: new Date().toISOString()
  }
];

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  apiConfig: APIConfig;
  setApiConfig: (config: Partial<APIConfig>) => void;
  clients: Client[];
  setClients: (clients: Client[]) => void;
  addClient: (client: Client) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
  agents: Agent[];
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, data: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  knowledgeItems: KnowledgeItem[];
  setKnowledgeItems: (items: KnowledgeItem[]) => void;
  addKnowledgeItem: (item: KnowledgeItem) => void;
  deleteKnowledgeItem: (id: string) => void;
  updateKnowledgeItem: (id: string, data: Partial<KnowledgeItem>) => void;
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: ChatMessage[];
  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversationId: (id: string | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, data: Partial<ChatMessage>) => void;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      apiConfig: { openai_key: '', gemini_key: '', google_drive_connected: false },
      setApiConfig: (config) => set((state) => ({ apiConfig: { ...state.apiConfig, ...config } })),
      clients: [],
      setClients: (clients) => set({ clients }),
      addClient: (client) => set((state) => ({ clients: [...state.clients, client] })),
      updateClient: (id, data) => set((state) => ({
        clients: state.clients.map(c => c.id === id ? { ...c, ...data } : c)
      })),
      deleteClient: (id) => set((state) => ({ clients: state.clients.filter(c => c.id !== id) })),
      selectedClientId: null,
      setSelectedClientId: (id) => set({ selectedClientId: id }),
      agents: DEFAULT_AGENTS.map(a => ({ ...a, user_id: '' })) as Agent[],
      setAgents: (agents) => set({ agents }),
      addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent] })),
      updateAgent: (id, data) => set((state) => ({
        agents: state.agents.map(a => a.id === id ? { ...a, ...data } : a)
      })),
      deleteAgent: (id) => set((state) => ({ agents: state.agents.filter(a => a.id !== id) })),
      knowledgeItems: [],
      setKnowledgeItems: (items) => set({ knowledgeItems: items }),
      addKnowledgeItem: (item) => set((state) => ({ knowledgeItems: [...state.knowledgeItems, item] })),
      deleteKnowledgeItem: (id) => set((state) => ({
        knowledgeItems: state.knowledgeItems.filter(k => k.id !== id)
      })),
      updateKnowledgeItem: (id, data) => set((state) => ({
        knowledgeItems: state.knowledgeItems.map(k => k.id === id ? { ...k, ...data } : k)
      })),
      conversations: [],
      currentConversationId: null,
      messages: [],
      setConversations: (conversations) => set({ conversations }),
      setCurrentConversationId: (id) => set({ currentConversationId: id }),
      setMessages: (messages) => set({ messages }),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      updateMessage: (id, data) => set((state) => ({
        messages: state.messages.map(m => m.id === id ? { ...m, ...data } : m)
      })),
      tasks: [],
      setTasks: (tasks) => set({ tasks }),
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (id, data) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...data } : t)
      })),
      deleteTask: (id) => set((state) => ({ tasks: state.tasks.filter(t => t.id !== id) })),
      notifications: [],
      addNotification: (notification) => set((state) => ({
        notifications: [notification, ...state.notifications].slice(0, 50)
      })),
      markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
      })),
      clearNotifications: () => set({ notifications: [] }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed })
    }),
    {
      name: 'base-agency-v5-storage',
      partialize: (state) => ({
        apiConfig: state.apiConfig,
        clients: state.clients,
        agents: state.agents,
        knowledgeItems: state.knowledgeItems,
        tasks: state.tasks,
        sidebarCollapsed: state.sidebarCollapsed
      })
    }
  )
);
