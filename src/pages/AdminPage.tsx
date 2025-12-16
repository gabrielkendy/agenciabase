import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { Icons } from '../components/Icons';
import { asaasService, AsaasPayment, AsaasFinancialSummary } from '../services/asaasService';
import { zapiService, NOTIFICATION_TRIGGERS, MESSAGE_VARIABLES, NotificationTemplate } from '../services/zapiService';
import { NotificationTemplateEditor } from '../components/NotificationTemplateEditor';
import { ContractTemplateBuilder } from '../components/ContractTemplateBuilder';
import { ChatbotBuilder } from '../components/ChatbotBuilder';
import { WORKFLOW_COLUMNS, ChatbotConfig, ContractTemplate } from '../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

type AdminTab = 'overview' | 'financial' | 'team' | 'notifications' | 'contracts' | 'chatbot' | 'settings';

export const AdminPage = () => {
  const { demands, clients, teamMembers, apiConfig, setApiConfig } = useStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isLoading, setIsLoading] = useState(false);
  
  // Financial
  const [financialSummary, setFinancialSummary] = useState<AsaasFinancialSummary | null>(null);
  const [payments, setPayments] = useState<AsaasPayment[]>([]);
  
  // Modals
  const [showNotificationEditor, setShowNotificationEditor] = useState(false);
  const [showContractBuilder, setShowContractBuilder] = useState(false);
  const [showChatbotBuilder, setShowChatbotBuilder] = useState(false);
  
  // Editing
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [editingContract, setEditingContract] = useState<ContractTemplate | null>(null);
  const [editingChatbot, setEditingChatbot] = useState<ChatbotConfig | null>(null);
  
  // Data (persisted in localStorage)
  const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplate[]>(() => {
    const saved = localStorage.getItem('notification_templates');
    return saved ? JSON.parse(saved) : [];
  });
  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>(() => {
    const saved = localStorage.getItem('contract_templates');
    return saved ? JSON.parse(saved) : [];
  });
  const [chatbotConfigs, setChatbotConfigs] = useState<ChatbotConfig[]>(() => {
    const saved = localStorage.getItem('chatbot_configs');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Z-API
  const [zapiConfig, setZapiConfig] = useState({ instanceId: apiConfig.zapi_instance_id || '', token: apiConfig.zapi_token || '' });
  const [zapiConnected, setZapiConnected] = useState(false);

  // Save to localStorage
  useEffect(() => { localStorage.setItem('notification_templates', JSON.stringify(notificationTemplates)); }, [notificationTemplates]);
  useEffect(() => { localStorage.setItem('contract_templates', JSON.stringify(contractTemplates)); }, [contractTemplates]);
  useEffect(() => { localStorage.setItem('chatbot_configs', JSON.stringify(chatbotConfigs)); }, [chatbotConfigs]);

  // Metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const thisMonthDemands = demands.filter(d => {
      const created = new Date(d.created_at);
      return created.getMonth() === thisMonth && created.getFullYear() === thisYear;
    });
    const completedThisMonth = thisMonthDemands.filter(d => d.status === 'concluido').length;
    const pendingApproval = demands.filter(d => d.status === 'aprovacao_cliente').length;
    const teamPerformance = teamMembers.map(member => {
      const memberDemands = demands.filter(d => d.team_designer_id === member.id || d.team_redator_id === member.id);
      return {
        id: member.id, name: member.name, role: member.role,
        total: memberDemands.length,
        completed: memberDemands.filter(d => d.status === 'concluido').length,
        inProgress: memberDemands.filter(d => !['concluido', 'rascunho'].includes(d.status)).length
      };
    });
    const monthlyRevenue = clients.filter(c => c.status === 'active').reduce((sum, c) => sum + (c.monthly_value || 0), 0);
    return { completedThisMonth, pendingApproval, teamPerformance, monthlyRevenue, totalDemands: demands.length, activeClients: clients.filter(c => c.status === 'active').length };
  }, [demands, clients, teamMembers]);

  // Load financial data
  const loadFinancialData = async () => {
    if (!apiConfig.asaas_key) return;
    setIsLoading(true);
    try {
      asaasService.setApiKey(apiConfig.asaas_key);
      const [summary, paymentsData] = await Promise.all([asaasService.getFinancialSummary(), asaasService.listPayments()]);
      setFinancialSummary(summary);
      setPayments(paymentsData.data || []);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  // Check Z-API connection
  const checkZapiConnection = async () => {
    if (!zapiConfig.instanceId || !zapiConfig.token) return;
    try {
      zapiService.setConfig({ instanceId: zapiConfig.instanceId, token: zapiConfig.token });
      const connected = await zapiService.isConnected();
      setZapiConnected(connected);
      toast.success(connected ? 'WhatsApp conectado!' : 'WhatsApp desconectado');
    } catch { setZapiConnected(false); toast.error('Erro ao verificar conexão'); }
  };

  // Save handlers
  const saveNotificationTemplate = (template: NotificationTemplate) => {
    setNotificationTemplates(prev => {
      const exists = prev.find(t => t.id === template.id);
      return exists ? prev.map(t => t.id === template.id ? template : t) : [...prev, template];
    });
    setShowNotificationEditor(false);
    setEditingTemplate(null);
  };

  const saveContractTemplate = (template: ContractTemplate) => {
    setContractTemplates(prev => {
      const exists = prev.find(t => t.id === template.id);
      return exists ? prev.map(t => t.id === template.id ? template : t) : [...prev, template];
    });
    setShowContractBuilder(false);
    setEditingContract(null);
  };

  const saveChatbotConfig = (config: ChatbotConfig) => {
    setChatbotConfigs(prev => {
      const exists = prev.find(c => c.id === config.id);
      return exists ? prev.map(c => c.id === config.id ? config : c) : [...prev, config];
    });
    setShowChatbotBuilder(false);
    setEditingChatbot(null);
  };

  const tabs: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Visão Geral', icon: Icons.Chart },
    { id: 'financial', label: 'Financeiro', icon: Icons.DollarSign },
    { id: 'team', label: 'Equipe', icon: Icons.Users },
    { id: 'notifications', label: 'Notificações', icon: Icons.Bell },
    { id: 'contracts', label: 'Contratos', icon: Icons.FileText },
    { id: 'chatbot', label: 'Chatbot', icon: Icons.Bot },
    { id: 'settings', label: 'Config', icon: Icons.Settings },
  ];

  return (
    <div className="h-full bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4 md:px-6 bg-gray-900/50">
        <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
          <Icons.Shield size={20} className="text-purple-400" /> Painel Admin
        </h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 overflow-x-auto">
        <div className="flex px-4 min-w-max">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={clsx('px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition whitespace-nowrap',
                activeTab === tab.id ? 'text-purple-400 border-purple-400' : 'text-gray-400 border-transparent hover:text-white'
              )}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Icons.Kanban} label="Demandas" value={metrics.totalDemands} color="orange" />
              <StatCard icon={Icons.Check} label="Concluídas (mês)" value={metrics.completedThisMonth} color="green" />
              <StatCard icon={Icons.Clock} label="Aguardando Aprovação" value={metrics.pendingApproval} color="yellow" />
              <StatCard icon={Icons.Users} label="Clientes Ativos" value={metrics.activeClients} color="blue" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Demandas por Status</h3>
                <div className="grid grid-cols-3 gap-3">
                  {WORKFLOW_COLUMNS.map(col => (
                    <div key={col.id} className="bg-gray-900/50 rounded-lg p-3 text-center">
                      <span className="text-2xl">{col.icon}</span>
                      <p className="text-xl font-bold text-white mt-1">{demands.filter(d => d.status === col.id).length}</p>
                      <p className="text-xs text-gray-500 truncate">{col.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Receita Mensal Prevista</h3>
                <p className="text-4xl font-bold text-green-400">R$ {metrics.monthlyRevenue.toLocaleString('pt-BR')}</p>
                <p className="text-sm text-gray-500 mt-2">Baseado em {metrics.activeClients} clientes ativos</p>
              </div>
            </div>
          </div>
        )}

        {/* Financial */}
        {activeTab === 'financial' && (
          <div className="space-y-6">
            {!apiConfig.asaas_key ? (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
                <Icons.Warning size={48} className="mx-auto mb-4 text-yellow-500" />
                <p className="text-yellow-400 font-medium">Configure sua API Key do Asaas</p>
                <p className="text-sm text-gray-500 mt-1">Vá em Configurações para adicionar sua chave de API</p>
              </div>
            ) : (
              <>
                <div className="flex justify-end">
                  <button onClick={loadFinancialData} disabled={isLoading} className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white text-sm flex items-center gap-2">
                    <Icons.Refresh size={16} className={isLoading ? 'animate-spin' : ''} /> Atualizar
                  </button>
                </div>
                {financialSummary && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Icons.DollarSign} label="Saldo" value={`R$ ${financialSummary.balance.toLocaleString('pt-BR')}`} color="green" />
                    <StatCard icon={Icons.Check} label="Recebido" value={`R$ ${financialSummary.totalReceived.toLocaleString('pt-BR')}`} color="blue" />
                    <StatCard icon={Icons.Clock} label="Pendente" value={`R$ ${financialSummary.totalPending.toLocaleString('pt-BR')}`} color="yellow" />
                    <StatCard icon={Icons.Warning} label="Vencido" value={`R$ ${financialSummary.totalOverdue.toLocaleString('pt-BR')}`} color="red" />
                  </div>
                )}
                {payments.length > 0 && (
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Últimos Pagamentos</h3>
                    <div className="space-y-2">
                      {payments.slice(0, 10).map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                          <div>
                            <p className="text-white font-medium">R$ {p.value.toLocaleString('pt-BR')}</p>
                            <p className="text-xs text-gray-500">{new Date(p.dueDate).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <span className={clsx('text-xs px-2 py-1 rounded-full', p.status === 'RECEIVED' ? 'bg-green-500/20 text-green-400' : p.status === 'OVERDUE' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400')}>{p.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Team */}
        {activeTab === 'team' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.teamPerformance.map(member => (
              <div key={member.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold">{member.name.charAt(0)}</div>
                  <div>
                    <p className="text-white font-medium">{member.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-white">{member.total}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-green-400">{member.completed}</p>
                    <p className="text-xs text-gray-500">Concluídas</p>
                  </div>
                  <div className="bg-yellow-500/10 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-yellow-400">{member.inProgress}</p>
                    <p className="text-xs text-gray-500">Em Progresso</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Configuração Z-API (WhatsApp)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Instance ID</label>
                  <input type="text" value={zapiConfig.instanceId} onChange={(e) => setZapiConfig({ ...zapiConfig, instanceId: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Token</label>
                  <input type="password" value={zapiConfig.token} onChange={(e) => setZapiConfig({ ...zapiConfig, token: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <button onClick={() => { setApiConfig({ zapi_instance_id: zapiConfig.instanceId, zapi_token: zapiConfig.token }); toast.success('Salvo!'); }} className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white text-sm">Salvar</button>
                <button onClick={checkZapiConnection} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm">Testar Conexão</button>
                {zapiConnected && <span className="text-green-400 text-sm flex items-center gap-1"><Icons.Check size={16} /> Conectado</span>}
              </div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Templates de Notificação</h3>
                <button onClick={() => { setEditingTemplate(null); setShowNotificationEditor(true); }} className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white text-sm flex items-center gap-2">
                  <Icons.Plus size={16} /> Novo Template
                </button>
              </div>
              <div className="space-y-3">
                {notificationTemplates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Icons.Bell size={48} className="mx-auto mb-4 opacity-30" />
                    <p>Nenhum template criado ainda</p>
                    <p className="text-sm">Crie templates para automatizar notificações</p>
                  </div>
                ) : notificationTemplates.map(template => (
                  <div key={template.id} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl">
                    <div>
                      <p className="text-white font-medium">{template.name}</p>
                      <p className="text-xs text-gray-500">{NOTIFICATION_TRIGGERS.find(t => t.id === template.trigger)?.label} • {template.channel}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={clsx('text-xs px-2 py-1 rounded-full', template.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400')}>{template.isActive ? 'Ativo' : 'Inativo'}</span>
                      <button onClick={() => { setEditingTemplate(template); setShowNotificationEditor(true); }} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"><Icons.Edit size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Variáveis Disponíveis</h3>
              <div className="flex flex-wrap gap-2">
                {MESSAGE_VARIABLES.map(v => (
                  <span key={v.key} className="px-3 py-1.5 bg-gray-900 rounded-lg text-xs text-gray-300" title={v.description}>{`{{${v.key}}}`}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Contracts */}
        {activeTab === 'contracts' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button onClick={() => { setEditingContract(null); setShowContractBuilder(true); }} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm flex items-center gap-2">
                <Icons.Plus size={16} /> Novo Contrato
              </button>
            </div>
            {contractTemplates.length === 0 ? (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-12 text-center">
                <Icons.FileText size={48} className="mx-auto mb-4 text-gray-600" />
                <h3 className="text-white font-medium mb-2">Nenhum modelo de contrato</h3>
                <p className="text-gray-500 text-sm">Crie modelos de contrato com variáveis dinâmicas para seus clientes</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contractTemplates.map(contract => (
                  <div key={contract.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center"><Icons.FileText size={20} className="text-blue-400" /></div>
                        <div>
                          <p className="text-white font-medium">{contract.name}</p>
                          <p className="text-xs text-gray-500">{contract.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className={clsx('text-xs px-2 py-1 rounded-full', contract.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400')}>{contract.is_active ? 'Ativo' : 'Inativo'}</span>
                      <button onClick={() => { setEditingContract(contract); setShowContractBuilder(true); }} className="text-sm text-blue-400 hover:text-blue-300">Editar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chatbot */}
        {activeTab === 'chatbot' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button onClick={() => { setEditingChatbot(null); setShowChatbotBuilder(true); }} className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white text-sm flex items-center gap-2">
                <Icons.Plus size={16} /> Novo Chatbot
              </button>
            </div>
            {chatbotConfigs.length === 0 ? (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-12 text-center">
                <Icons.Bot size={48} className="mx-auto mb-4 text-gray-600" />
                <h3 className="text-white font-medium mb-2">Nenhum chatbot configurado</h3>
                <p className="text-gray-500 text-sm">Crie chatbots para capturar leads automaticamente</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chatbotConfigs.map(bot => (
                  <div key={bot.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{bot.avatar}</span>
                      <div>
                        <p className="text-white font-medium">{bot.name}</p>
                        <p className="text-xs text-gray-500">{bot.fields_to_collect.length} campos</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2 mb-4">{bot.greeting}</p>
                    <div className="flex items-center justify-between">
                      <span className={clsx('text-xs px-2 py-1 rounded-full', bot.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400')}>{bot.is_active ? 'Ativo' : 'Inativo'}</span>
                      <button onClick={() => { setEditingChatbot(bot); setShowChatbotBuilder(true); }} className="text-sm text-green-400 hover:text-green-300">Editar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">API Key Asaas</h3>
              <input type="password" value={apiConfig.asaas_key || ''} onChange={(e) => setApiConfig({ asaas_key: e.target.value })} placeholder="Sua API Key do Asaas" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none" />
              <p className="text-xs text-gray-500 mt-2">Obtenha sua chave em app.asaas.com → Integrações → API</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-4">Zona de Perigo</h3>
              <button onClick={() => { if (confirm('Tem certeza? Isso apagará TODOS os dados!')) { localStorage.clear(); window.location.reload(); } }} className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm">Limpar Todos os Dados</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showNotificationEditor && <NotificationTemplateEditor template={editingTemplate} onSave={saveNotificationTemplate} onClose={() => { setShowNotificationEditor(false); setEditingTemplate(null); }} />}
      {showContractBuilder && <ContractTemplateBuilder template={editingContract} onSave={saveContractTemplate} onClose={() => { setShowContractBuilder(false); setEditingContract(null); }} />}
      {showChatbotBuilder && <ChatbotBuilder config={editingChatbot} onSave={saveChatbotConfig} onClose={() => { setShowChatbotBuilder(false); setEditingChatbot(null); }} />}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => {
  const colors: Record<string, string> = {
    orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
    yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon size={20} className={colors[color].split(' ').pop()} />
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
};
