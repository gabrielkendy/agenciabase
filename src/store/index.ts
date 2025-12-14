import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Agent, AgentRole, Task, Client, TeamMessage, DirectMessage, KnowledgeFile, Notification, User, GeneratedMedia } from '../types';

// Default Agents
const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'agent-1',
    name: 'Sofia',
    role: AgentRole.MANAGER,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia&backgroundColor=b6e3f4',
    model: 'gemini-2.0-flash',
    systemInstruction: 'Você é Sofia, a Gestora de Conteúdo. Sua função é coordenar a equipe de agentes, analisar as solicitações do usuário e delegar tarefas ou sintetizar as respostas. Mantenha um tom profissional, estratégico e organizado. Sempre verifique se o conteúdo está alinhado com os objetivos da marca.',
    description: 'Coordena o time, define prioridades e garante a qualidade final.',
    files: [],
    isOnline: true
  },
  {
    id: 'agent-2',
    name: 'Lucas',
    role: AgentRole.PLANNER,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas&backgroundColor=c0aede',
    model: 'gemini-2.0-flash',
    systemInstruction: 'Você é Lucas, o Planejador de Conteúdo. Crie calendários editoriais, defina pilares de conteúdo, sugira temas baseados em tendências e datas comemorativas. Seja estratégico e pense no funil de marketing.',
    description: 'Cria calendários editoriais e estratégias de conteúdo.',
    files: [],
    isOnline: true
  },
  {
    id: 'agent-3',
    name: 'Clara',
    role: AgentRole.CAROUSEL,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Clara&backgroundColor=ffd5dc',
    model: 'gemini-2.0-flash',
    systemInstruction: 'Você é Clara, especialista em criar carrosséis para Instagram. Estruture conteúdos em slides atrativos, com ganchos fortes no primeiro slide e CTAs no último. Use linguagem visual e copywriting persuasivo.',
    description: 'Especialista em carrosséis e conteúdo visual.',
    files: [],
    isOnline: true
  },
  {
    id: 'agent-4',
    name: 'Leo',
    role: AgentRole.SCRIPT,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo&backgroundColor=d1d4f9',
    model: 'gemini-2.0-flash',
    systemInstruction: 'Você é Leo, o Roteirista. Crie roteiros para Reels, TikTok e YouTube Shorts. Use técnicas de storytelling, ganchos de atenção nos primeiros 3 segundos e linguagem dinâmica. Sempre inclua indicações de ação e cortes.',
    description: 'Roteirista para vídeos curtos e Reels.',
    files: [],
    isOnline: true
  },
  {
    id: 'agent-5',
    name: 'Bia',
    role: AgentRole.POST,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bia&backgroundColor=ffdfbf',
    model: 'gemini-2.0-flash',
    systemInstruction: 'Você é Bia, criadora de posts estáticos. Desenvolva conceitos visuais e textos curtos para posts de feed. Foque em clareza, impacto visual e alinhamento com a identidade da marca.',
    description: 'Criadora de posts estáticos e conceitos visuais.',
    files: [],
    isOnline: true
  },
  {
    id: 'agent-6',
    name: 'Davi',
    role: AgentRole.CAPTION,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Davi&backgroundColor=c1f0c1',
    model: 'gemini-2.0-flash',
    systemInstruction: 'Você é Davi, especialista em legendas. Crie legendas envolventes com ganchos, storytelling, emojis estratégicos e CTAs. Adapte o tom conforme a rede social e objetivo do post.',
    description: 'Especialista em legendas e copywriting.',
    files: [],
    isOnline: true
  },
  {
    id: 'agent-7',
    name: 'Ana',
    role: AgentRole.SPREADSHEET,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana&backgroundColor=f0e68c',
    model: 'gemini-2.0-flash',
    systemInstruction: 'Você é Ana, a editora de planilhas. Organize dados, crie relatórios, analise métricas de redes sociais e gere insights a partir de dados de performance.',
    description: 'Organiza dados e cria relatórios de métricas.',
    files: [],
    isOnline: true
  }
];

interface AppState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Agents
  agents: Agent[];
  activeAgentId: string;
  setActiveAgentId: (id: string) => void;
  updateAgent: (id: string, data: Partial<Agent>) => void;
  addAgentFile: (agentId: string, file: KnowledgeFile) => void;
  removeAgentFile: (agentId: string, fileId: string) => void;
  
  // Tasks
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  // Clients
  clients: Client[];
  addClient: (client: Client) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  
  // Team Messages
  teamMessages: TeamMessage[];
  addTeamMessage: (message: TeamMessage) => void;
  
  // Direct Messages
  directMessages: DirectMessage[];
  addDirectMessage: (message: DirectMessage) => void;
  markDirectMessagesRead: (senderId: string) => void;
  
  // Knowledge Files (Global)
  globalFiles: KnowledgeFile[];
  addGlobalFile: (file: KnowledgeFile) => void;
  removeGlobalFile: (id: string) => void;
  
  // Media Gallery
  mediaGallery: GeneratedMedia[];
  addMedia: (media: GeneratedMedia) => void;
  
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  // API Key
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // User
      user: { id: '1', name: 'Usuário Pro', email: 'user@base.agency', role: 'admin' },
      setUser: (user) => set({ user }),
      
      // Agents
      agents: DEFAULT_AGENTS,
      activeAgentId: DEFAULT_AGENTS[0].id,
      setActiveAgentId: (id) => set({ activeAgentId: id }),
      updateAgent: (id, data) => set((state) => ({
        agents: state.agents.map((a) => a.id === id ? { ...a, ...data } : a)
      })),
      addAgentFile: (agentId, file) => set((state) => ({
        agents: state.agents.map((a) => 
          a.id === agentId ? { ...a, files: [...a.files, file] } : a
        )
      })),
      removeAgentFile: (agentId, fileId) => set((state) => ({
        agents: state.agents.map((a) => 
          a.id === agentId ? { ...a, files: a.files.filter(f => f.id !== fileId) } : a
        )
      })),
      
      // Tasks
      tasks: [
        {
          id: 'task-1',
          title: 'Reels: Tendências de IA 2025',
          description: 'Roteiro dinâmico mostrando 3 ferramentas novas.',
          caption: '🚀 IA em 2025: 3 ferramentas que vão mudar seu jogo!\n\nSalva esse vídeo e comenta qual você quer testar primeiro 👇',
          status: 'review',
          priority: 'high',
          assignedAgentId: 'agent-4',
          channel: 'instagram',
          mediaUrls: ['https://picsum.photos/seed/ai-reels/400/700'],
          clientName: 'TechStart',
          clientEmail: 'ceo@techstart.com',
          createdAt: new Date()
        }
      ],
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (id, data) => set((state) => ({
        tasks: state.tasks.map((t) => t.id === id ? { ...t, ...data, updatedAt: new Date() } : t)
      })),
      deleteTask: (id) => set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
      
      // Clients
      clients: [
        { id: 'client-1', name: 'TechStart', email: 'ceo@techstart.com', company: 'TechStart Inc', color: '#3b82f6', createdAt: new Date() },
        { id: 'client-2', name: 'FitLife Gym', email: 'marketing@fitlife.com', company: 'FitLife Academia', color: '#22c55e', createdAt: new Date() }
      ],
      addClient: (client) => set((state) => ({ clients: [...state.clients, client] })),
      updateClient: (id, data) => set((state) => ({
        clients: state.clients.map((c) => c.id === id ? { ...c, ...data } : c)
      })),
      deleteClient: (id) => set((state) => ({ clients: state.clients.filter((c) => c.id !== id) })),
      
      // Team Messages
      teamMessages: [
        { id: 'msg-1', senderId: 'agent-3', senderName: 'Clara (Designer)', text: 'Oi pessoal! Subi os assets da campanha de Natal no Drive.', timestamp: new Date(Date.now() - 3600000), read: true, channel: 'geral' },
        { id: 'msg-2', senderId: 'user', senderName: 'Você', text: 'Ótimo, Clara. Vou pedir para o Leo criar os roteiros.', timestamp: new Date(Date.now() - 3500000), read: true, channel: 'geral' }
      ],
      addTeamMessage: (message) => set((state) => ({ teamMessages: [...state.teamMessages, message] })),
      
      // Direct Messages
      directMessages: [],
      addDirectMessage: (message) => set((state) => ({ directMessages: [...state.directMessages, message] })),
      markDirectMessagesRead: (senderId) => set((state) => ({
        directMessages: state.directMessages.map((m) => 
          m.senderId === senderId ? { ...m, read: true } : m
        )
      })),
      
      // Global Files
      globalFiles: [
        { id: 'file-1', name: 'Tom_de_Voz_Marca.txt', content: 'A marca deve ter um tom inovador, otimista e acessível.', type: 'text', source: 'upload', lastModified: new Date() }
      ],
      addGlobalFile: (file) => set((state) => ({ globalFiles: [...state.globalFiles, file] })),
      removeGlobalFile: (id) => set((state) => ({ globalFiles: state.globalFiles.filter((f) => f.id !== id) })),
      
      // Media Gallery
      mediaGallery: [],
      addMedia: (media) => set((state) => ({ mediaGallery: [...state.mediaGallery, media] })),
      
      // Notifications
      notifications: [],
      addNotification: (notification) => set((state) => ({ notifications: [notification, ...state.notifications] })),
      markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true } : n)
      })),
      clearNotifications: () => set({ notifications: [] }),
      
      // API Key
      geminiApiKey: '',
      setGeminiApiKey: (key) => set({ geminiApiKey: key })
    }),
    { name: 'base-agency-storage' }
  )
);
