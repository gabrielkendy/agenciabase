import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Agent, Task, Client, Contract, Transaction, KnowledgeFile, Notification, Content, TeamMember, DashboardMetrics } from '../types';

const DEFAULT_USER: User = { id: 'user-1', name: 'Admin', email: 'admin@base.agency', role: 'admin', permissions: ['all'], createdAt: new Date().toISOString() };

const DEFAULT_AGENTS: Agent[] = [
  { id: 'agent-sofia', name: 'Sofia', role: 'Gestora de Projetos', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia&backgroundColor=ffdfbf', systemInstruction: 'Você é Sofia, Gestora de Projetos da BASE Agency. Coordena demandas, analisa solicitações e cria tarefas no Kanban. Quando o usuário pedir para criar conteúdo, identifique e estruture a demanda. Sempre em português brasileiro.', description: 'Coordena o time, analisa demandas e cria tarefas automaticamente', model: 'gemini-2.0-flash', isOnline: true, knowledgeFiles: [] },
  { id: 'agent-lucas', name: 'Lucas', role: 'Planejador de Conteúdo', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas&backgroundColor=c0aede', systemInstruction: 'Você é Lucas, Planejador de Conteúdo. Crie calendários editoriais, estratégias e planejamentos para redes sociais. Sempre em português.', description: 'Cria calendários editoriais e estratégias de conteúdo', model: 'gemini-2.0-flash', isOnline: true, knowledgeFiles: [] },
  { id: 'agent-clara', name: 'Clara', role: 'Designer de Carrosséis', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Clara&backgroundColor=ffd5dc', systemInstruction: 'Você é Clara, Designer de Carrosséis. Crie roteiros visuais com ganchos fortes e CTAs. Estruture em slides numerados. Sempre em português.', description: 'Especialista em carrosséis e conteúdo visual', model: 'gemini-2.0-flash', isOnline: true, knowledgeFiles: [] },
  { id: 'agent-leo', name: 'Leo', role: 'Roteirista de Vídeos', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo&backgroundColor=d1d4f9', systemInstruction: 'Você é Leo, Roteirista de Vídeos. Crie roteiros para Reels e TikTok com ganchos nos primeiros 3 segundos. Inclua indicações de corte e ação. Sempre em português.', description: 'Roteirista para vídeos curtos e Reels', model: 'gemini-2.0-flash', isOnline: true, knowledgeFiles: [] },
  { id: 'agent-bia', name: 'Bia', role: 'Criadora de Posts', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bia&backgroundColor=ffcab0', systemInstruction: 'Você é Bia, Criadora de Posts. Desenvolva conceitos visuais e textos curtos para posts de feed. Foque em clareza e impacto. Sempre em português.', description: 'Criadora de posts estáticos e conceitos visuais', model: 'gemini-2.0-flash', isOnline: true, knowledgeFiles: [] },
  { id: 'agent-davi', name: 'Davi', role: 'Redator de Legendas', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Davi&backgroundColor=b6e3f4', systemInstruction: 'Você é Davi, Redator de Legendas. Escreva legendas com ganchos, storytelling, emojis e CTAs. Adapte ao canal. Sempre em português.', description: 'Especialista em legendas e copywriting', model: 'gemini-2.0-flash', isOnline: true, knowledgeFiles: [] },
];

const DEFAULT_CLIENTS: Client[] = [{ id: 'client-demo', name: 'Cliente Demo', email: 'demo@empresa.com', phone: '(11) 99999-9999', company: 'Empresa Demo LTDA', cnpj: '12.345.678/0001-90', color: '#f97316', status: 'active', notes: 'Cliente de demonstração', createdAt: new Date().toISOString() }];

interface AppState {
  user: User; updateUser: (data: Partial<User>) => void;
  agents: Agent[]; activeAgentId: string; setActiveAgentId: (id: string) => void; updateAgent: (id: string, data: Partial<Agent>) => void;
  globalKnowledge: KnowledgeFile[]; addGlobalKnowledge: (file: KnowledgeFile) => void; removeGlobalKnowledge: (id: string) => void;
  clients: Client[]; selectedClientId: string | null; setSelectedClientId: (id: string | null) => void; addClient: (client: Client) => void; updateClient: (id: string, data: Partial<Client>) => void; deleteClient: (id: string) => void;
  contracts: Contract[]; addContract: (contract: Contract) => void; updateContract: (id: string, data: Partial<Contract>) => void; deleteContract: (id: string) => void;
  transactions: Transaction[]; addTransaction: (transaction: Transaction) => void; updateTransaction: (id: string, data: Partial<Transaction>) => void; deleteTransaction: (id: string) => void;
  tasks: Task[]; addTask: (task: Task) => void; updateTask: (id: string, data: Partial<Task>) => void; deleteTask: (id: string) => void;
  contents: Content[]; addContent: (content: Content) => void; updateContent: (id: string, data: Partial<Content>) => void; deleteContent: (id: string) => void;
  notifications: Notification[]; addNotification: (notification: Notification) => void; markNotificationRead: (id: string) => void; clearNotifications: () => void;
  teamMembers: TeamMember[]; addTeamMember: (member: TeamMember) => void; updateTeamMember: (id: string, data: Partial<TeamMember>) => void; deleteTeamMember: (id: string) => void;
  getMetrics: () => DashboardMetrics;
}

export const useStore = create<AppState>()(persist((set, get) => ({
  user: DEFAULT_USER,
  updateUser: (data) => set((state) => ({ user: { ...state.user, ...data } })),
  
  agents: DEFAULT_AGENTS,
  activeAgentId: 'agent-sofia',
  setActiveAgentId: (id) => set({ activeAgentId: id }),
  updateAgent: (id, data) => set((state) => ({ agents: state.agents.map(a => a.id === id ? { ...a, ...data } : a) })),
  
  globalKnowledge: [],
  addGlobalKnowledge: (file) => set((state) => ({ globalKnowledge: [...state.globalKnowledge, file] })),
  removeGlobalKnowledge: (id) => set((state) => ({ globalKnowledge: state.globalKnowledge.filter(f => f.id !== id) })),
  
  clients: DEFAULT_CLIENTS,
  selectedClientId: null,
  setSelectedClientId: (id) => set({ selectedClientId: id }),
  addClient: (client) => set((state) => ({ clients: [...state.clients, client] })),
  updateClient: (id, data) => set((state) => ({ clients: state.clients.map(c => c.id === id ? { ...c, ...data } : c) })),
  deleteClient: (id) => set((state) => ({ clients: state.clients.filter(c => c.id !== id) })),
  
  contracts: [],
  addContract: (contract) => set((state) => ({ contracts: [...state.contracts, contract] })),
  updateContract: (id, data) => set((state) => ({ contracts: state.contracts.map(c => c.id === id ? { ...c, ...data } : c) })),
  deleteContract: (id) => set((state) => ({ contracts: state.contracts.filter(c => c.id !== id) })),
  
  transactions: [],
  addTransaction: (transaction) => set((state) => ({ transactions: [transaction, ...state.transactions] })),
  updateTransaction: (id, data) => set((state) => ({ transactions: state.transactions.map(t => t.id === id ? { ...t, ...data } : t) })),
  deleteTransaction: (id) => set((state) => ({ transactions: state.transactions.filter(t => t.id !== id) })),
  
  tasks: [],
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, data) => set((state) => ({ tasks: state.tasks.map(t => t.id === id ? { ...t, ...data } : t) })),
  deleteTask: (id) => set((state) => ({ tasks: state.tasks.filter(t => t.id !== id) })),
  
  contents: [],
  addContent: (content) => set((state) => ({ contents: [...state.contents, content] })),
  updateContent: (id, data) => set((state) => ({ contents: state.contents.map(c => c.id === id ? { ...c, ...data } : c) })),
  deleteContent: (id) => set((state) => ({ contents: state.contents.filter(c => c.id !== id) })),
  
  notifications: [],
  addNotification: (notification) => set((state) => ({ notifications: [notification, ...state.notifications].slice(0, 50) })),
  markNotificationRead: (id) => set((state) => ({ notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n) })),
  clearNotifications: () => set({ notifications: [] }),
  
  teamMembers: [],
  addTeamMember: (member) => set((state) => ({ teamMembers: [...state.teamMembers, member] })),
  updateTeamMember: (id, data) => set((state) => ({ teamMembers: state.teamMembers.map(m => m.id === id ? { ...m, ...data } : m) })),
  deleteTeamMember: (id) => set((state) => ({ teamMembers: state.teamMembers.filter(m => m.id !== id) })),
  
  getMetrics: () => {
    const state = get();
    const activeContracts = state.contracts.filter(c => c.status === 'active');
    const monthlyRevenue = activeContracts.reduce((sum, c) => sum + c.value, 0);
    const pendingPayments = state.transactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((sum, t) => sum + t.value, 0);
    const overduePayments = state.transactions.filter(t => t.status === 'overdue').reduce((sum, t) => sum + t.value, 0);
    return {
      totalClients: state.clients.filter(c => c.status === 'active').length,
      activeContracts: activeContracts.length,
      monthlyRevenue,
      pendingTasks: state.tasks.filter(t => !['approved', 'published'].includes(t.status)).length,
      completedTasks: state.tasks.filter(t => ['approved', 'published'].includes(t.status)).length,
      pendingPayments,
      overduePayments,
      contentPublished: state.contents.filter(c => c.status === 'published').length
    };
  }
}), { name: 'base-agency-storage' }));
