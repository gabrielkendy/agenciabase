import { useState, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import type { Agent, AIProvider, AIModel } from '../types';
import { AI_MODELS } from '../types';
import { knowledgeService, KnowledgeItem, TrainingStatus } from '../services/knowledgeService';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const getModelsForProvider = (provider: AIProvider) => {
  return AI_MODELS.filter(m => m.provider === provider);
};

const AGENT_AVATARS = ['🤖', '👩‍💼', '👨‍💻', '🧠', '💡', '🎨', '📊', '✍️', '🎯', '🚀', '💬', '📱'];

export const AgentsPage: React.FC = () => {
  const { agents, addAgent, updateAgent, deleteAgent, apiConfig, currentUser } = useStore();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(agents[0] || null);
  const [activeTab, setActiveTab] = useState<'config' | 'test' | 'knowledge'>('config');
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Agent>>({});
  const [showNewAgentModal, setShowNewAgentModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Knowledge states
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus | null>(null);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const [newAgentForm, setNewAgentForm] = useState({
    name: '',
    role: '',
    description: '',
    avatar: '🤖',
    provider: 'gemini' as AIProvider,
    model: 'gemini-2.0-flash-exp' as AIModel,
  });

  // Carregar conhecimentos quando seleciona agente
  useEffect(() => {
    if (selectedAgent) {
      loadKnowledge(selectedAgent.id);
    }
  }, [selectedAgent?.id]);

  const loadKnowledge = async (agentId: string) => {
    setLoadingKnowledge(true);
    try {
      const items = await knowledgeService.getAgentKnowledge(agentId);
      setKnowledgeItems(items);
      setTrainingStatus(knowledgeService.getTrainingStatus(items));
    } catch (error) {
      console.error('Erro ao carregar conhecimentos:', error);
    }
    setLoadingKnowledge(false);
  };

  const selectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setEditForm({ 
      name: agent.name, 
      role: agent.role, 
      description: agent.description, 
      system_prompt: agent.system_prompt, 
      provider: agent.provider, 
      model: agent.model, 
      temperature: agent.temperature, 
      is_active: agent.is_active,
      avatar: agent.avatar,
      trained_knowledge: agent.trained_knowledge
    });
    setActiveTab('config');
    setTestResponse('');
  };

  const handleCreateAgent = () => {
    if (!newAgentForm.name.trim()) return toast.error('Nome é obrigatório');
    if (!newAgentForm.role.trim()) return toast.error('Função é obrigatória');

    addAgent({
      name: newAgentForm.name,
      role: newAgentForm.role,
      description: newAgentForm.description || `Agente ${newAgentForm.name}`,
      avatar: newAgentForm.avatar,
      provider: newAgentForm.provider,
      model: newAgentForm.model,
      system_prompt: `Você é ${newAgentForm.name}, ${newAgentForm.role}. ${newAgentForm.description}`,
      temperature: 0.7,
      is_active: true,
      trained_knowledge: '',
      user_id: currentUser?.id || '',
    });

    toast.success('Agente criado!');
    setShowNewAgentModal(false);
    setNewAgentForm({ name: '', role: '', description: '', avatar: '🤖', provider: 'gemini', model: 'gemini-2.0-flash-exp' });
  };

  const handleDeleteAgent = () => {
    if (!selectedAgent) return;
    deleteAgent(selectedAgent.id);
    toast.success('Agente removido');
    setSelectedAgent(agents.filter(a => a.id !== selectedAgent.id)[0] || null);
    setShowDeleteConfirm(false);
  };

  const handleSaveAgent = () => {
    if (!selectedAgent) return;
    updateAgent(selectedAgent.id, editForm);
    toast.success('Agente atualizado!');
  };

  // TREINAR AGENTE - Injeta conhecimento no system prompt
  const handleTrainAgent = async () => {
    if (!selectedAgent || knowledgeItems.length === 0) return;
    
    const knowledgePrompt = knowledgeService.generateKnowledgePrompt(knowledgeItems);
    const basePrompt = editForm.system_prompt?.split('\n\n═══════════════════════════════════════')[0] || editForm.system_prompt || '';
    const newPrompt = basePrompt + knowledgePrompt;
    
    updateAgent(selectedAgent.id, { 
      ...editForm, 
      system_prompt: newPrompt,
      trained_knowledge: JSON.stringify({ 
        items: knowledgeItems.length, 
        trained_at: new Date().toISOString() 
      })
    });
    
    setEditForm({ ...editForm, system_prompt: newPrompt });
    toast.success(`🧠 Agente treinado com ${knowledgeItems.length} fontes de conhecimento!`);
  };

  const handleTestAgent = async () => {
    if (!selectedAgent || !testMessage.trim()) return;
    setIsTesting(true);
    setTestResponse('');
    
    try {
      const provider = editForm.provider || selectedAgent.provider;
      const model = editForm.model || selectedAgent.model;
      const systemPrompt = editForm.system_prompt || selectedAgent.system_prompt;
      
      if (provider === 'openrouter') {
        const { openrouterService } = await import('../services/openrouterService');
        if (!apiConfig.openrouter_key) throw new Error('Configure OpenRouter em Configurações');
        openrouterService.setApiKey(apiConfig.openrouter_key);
        const response = await openrouterService.chat(model, [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: testMessage }
        ], { temperature: editForm.temperature || 0.7 });
        setTestResponse(response);
      } else if (provider === 'gemini') {
        const { sendMessageToGemini } = await import('../services/geminiService');
        const response = await sendMessageToGemini(testMessage, systemPrompt, apiConfig.gemini_key || '');
        setTestResponse(response);
      } else if (provider === 'openai') {
        if (!apiConfig.openai_key) throw new Error('Configure OpenAI em Configurações');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiConfig.openai_key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: testMessage }],
            temperature: editForm.temperature || 0.7,
          }),
        });
        const data = await response.json();
        setTestResponse(data.choices?.[0]?.message?.content || 'Sem resposta');
      }
    } catch (error: any) { 
      setTestResponse(`Erro: ${error.message}`); 
    } finally { 
      setIsTesting(false); 
    }
  };

  const isProviderConfigured = (provider: AIProvider): boolean => {
    if (provider === 'openrouter') return !!apiConfig.openrouter_key;
    if (provider === 'gemini') return !!apiConfig.gemini_key;
    if (provider === 'openai') return !!apiConfig.openai_key;
    return false;
  };

  // Verificar se agente está treinado
  const isAgentTrained = (agent: Agent): boolean => {
    try {
      const data = JSON.parse(agent.trained_knowledge || '{}');
      return data.items > 0;
    } catch { return false; }
  };

  return (
    <div className="h-full bg-gray-950 flex">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Icons.Bot size={20} className="text-orange-400" />
                Agentes IA
              </h2>
              <p className="text-xs text-gray-500 mt-1">{agents.length} agentes</p>
            </div>
            {isAdmin && (
              <button onClick={() => setShowNewAgentModal(true)} className="p-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg">
                <Icons.Plus size={18} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {agents.map(agent => (
            <button 
              key={agent.id} 
              onClick={() => selectAgent(agent)} 
              className={clsx(
                'w-full p-3 rounded-xl text-left transition flex items-center gap-3', 
                selectedAgent?.id === agent.id 
                  ? 'bg-orange-500/20 border border-orange-500' 
                  : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
              )}
            >
              <span className="text-2xl">{agent.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white text-sm truncate">{agent.name}</p>
                  {isAgentTrained(agent) && (
                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded font-medium">
                      🧠 TREINADO
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{agent.role}</p>
              </div>
              <div className={clsx('w-2 h-2 rounded-full', agent.is_active ? 'bg-green-500' : 'bg-gray-500')} />
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedAgent ? (
          <>
            {/* Agent Header */}
            <div className="p-6 border-b border-gray-800 bg-gray-900/50">
              <div className="flex items-center gap-4">
                <div className="text-5xl">{selectedAgent.avatar}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white">{selectedAgent.name}</h1>
                    {isAgentTrained(selectedAgent) && (
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full font-medium flex items-center gap-1">
                        🧠 Conhecimento Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400">{selectedAgent.role}</p>
                  <p className="text-sm text-gray-500 mt-1">{selectedAgent.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', selectedAgent.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400')}>
                    {selectedAgent.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                  {isAdmin && (
                    <button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg">
                      <Icons.Trash size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800">
              <button onClick={() => setActiveTab('config')} className={clsx('px-6 py-3 text-sm font-medium transition', activeTab === 'config' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-white')}>
                <Icons.Settings size={16} className="inline mr-2" />Configuração
              </button>
              <button onClick={() => setActiveTab('knowledge')} className={clsx('px-6 py-3 text-sm font-medium transition flex items-center gap-2', activeTab === 'knowledge' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-white')}>
                <Icons.Database size={16} />Conhecimento
                {trainingStatus?.is_trained && <span className="w-2 h-2 bg-purple-500 rounded-full" />}
              </button>
              <button onClick={() => setActiveTab('test')} className={clsx('px-6 py-3 text-sm font-medium transition', activeTab === 'test' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-white')}>
                <Icons.MessageSquare size={16} className="inline mr-2" />Testar
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'config' && (
                <ConfigTab editForm={editForm} setEditForm={setEditForm} handleSaveAgent={handleSaveAgent} isProviderConfigured={isProviderConfigured} />
              )}
              {activeTab === 'knowledge' && (
                <KnowledgeTab 
                  agentId={selectedAgent.id}
                  knowledgeItems={knowledgeItems}
                  setKnowledgeItems={setKnowledgeItems}
                  trainingStatus={trainingStatus}
                  loadingKnowledge={loadingKnowledge}
                  onTrain={handleTrainAgent}
                  onReload={() => loadKnowledge(selectedAgent.id)}
                />
              )}
              {activeTab === 'test' && (
                <TestTab 
                  editForm={editForm} 
                  selectedAgent={selectedAgent} 
                  testMessage={testMessage}
                  setTestMessage={setTestMessage}
                  testResponse={testResponse}
                  isTesting={isTesting}
                  handleTestAgent={handleTestAgent}
                  isProviderConfigured={isProviderConfigured}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Icons.Bot size={64} className="mx-auto mb-4 opacity-30" />
              <p>Selecione um agente</p>
              {isAdmin && (
                <button onClick={() => setShowNewAgentModal(true)} className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-medium flex items-center gap-2 mx-auto">
                  <Icons.Plus size={18} />Criar novo agente
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Novo Agente */}
      {showNewAgentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Icons.Plus size={20} className="text-orange-400" />Novo Agente
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Avatar</label>
                <div className="flex flex-wrap gap-2">
                  {AGENT_AVATARS.map(avatar => (
                    <button key={avatar} onClick={() => setNewAgentForm({ ...newAgentForm, avatar })}
                      className={clsx('w-10 h-10 text-2xl rounded-lg border transition flex items-center justify-center',
                        newAgentForm.avatar === avatar ? 'bg-orange-500/20 border-orange-500' : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                      )}>{avatar}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Nome *</label>
                <input type="text" value={newAgentForm.name} onChange={(e) => setNewAgentForm({ ...newAgentForm, name: e.target.value })}
                  placeholder="Ex: Marcos" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Função *</label>
                <input type="text" value={newAgentForm.role} onChange={(e) => setNewAgentForm({ ...newAgentForm, role: e.target.value })}
                  placeholder="Ex: Especialista em SEO" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Descrição</label>
                <textarea value={newAgentForm.description} onChange={(e) => setNewAgentForm({ ...newAgentForm, description: e.target.value })}
                  placeholder="Descreva o que este agente faz..." rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none resize-none" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-800 flex gap-3 justify-end">
              <button onClick={() => setShowNewAgentModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
              <button onClick={handleCreateAgent} className="px-6 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-medium flex items-center gap-2">
                <Icons.Plus size={18} />Criar Agente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icons.Trash size={32} className="text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Excluir agente?</h2>
            <p className="text-gray-400 mb-6">Tem certeza que deseja excluir <strong className="text-white">{selectedAgent?.name}</strong>?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Cancelar</button>
              <button onClick={handleDeleteAgent} className="px-6 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg font-medium flex items-center gap-2">
                <Icons.Trash size={18} />Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ============================================
// CONFIG TAB COMPONENT
// ============================================
interface ConfigTabProps {
  editForm: Partial<Agent>;
  setEditForm: (form: Partial<Agent>) => void;
  handleSaveAgent: () => void;
  isProviderConfigured: (provider: AIProvider) => boolean;
}

const ConfigTab: React.FC<ConfigTabProps> = ({ editForm, setEditForm, handleSaveAgent, isProviderConfigured }) => {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <label className="text-sm text-gray-400 mb-2 block">Avatar</label>
        <div className="flex flex-wrap gap-2">
          {AGENT_AVATARS.map(avatar => (
            <button key={avatar} onClick={() => setEditForm({ ...editForm, avatar })}
              className={clsx('w-10 h-10 text-2xl rounded-lg border transition flex items-center justify-center',
                editForm.avatar === avatar ? 'bg-orange-500/20 border-orange-500' : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              )}>{avatar}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Nome</label>
          <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Função</label>
          <input type="text" value={editForm.role || ''} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none" />
        </div>
      </div>
      
      <div>
        <label className="text-sm text-gray-400 mb-1 block">Descrição</label>
        <input type="text" value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none" />
      </div>
      
      <div>
        <label className="text-sm text-gray-400 mb-1 block">System Prompt</label>
        <textarea value={editForm.system_prompt || ''} onChange={(e) => setEditForm({ ...editForm, system_prompt: e.target.value })}
          rows={8} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none resize-none font-mono text-sm"
          placeholder="Defina a personalidade e instruções do agente..." />
        <p className="text-xs text-gray-500 mt-1">💡 O conhecimento treinado será adicionado automaticamente ao final.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Provider de IA</label>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => setEditForm({ ...editForm, provider: 'openrouter', model: 'google/gemma-2-9b-it:free' })}
              className={clsx('p-3 rounded-xl border transition text-left', editForm.provider === 'openrouter' ? 'bg-purple-500/20 border-purple-500' : 'bg-gray-800 border-gray-700 hover:border-gray-600')}>
              <div className="flex items-center gap-2 mb-1"><span className="text-lg">🌐</span><span className="font-medium text-white text-sm">OpenRouter</span></div>
              <p className="text-xs text-green-400">6 modelos GRATUITOS!</p>
              {!isProviderConfigured('openrouter') && <p className="text-xs text-red-400 mt-1">⚠️ Não configurado</p>}
            </button>
            <button onClick={() => setEditForm({ ...editForm, provider: 'openai', model: 'gpt-4o-mini' })}
              className={clsx('p-3 rounded-xl border transition text-left', editForm.provider === 'openai' ? 'bg-green-500/20 border-green-500' : 'bg-gray-800 border-gray-700 hover:border-gray-600')}>
              <div className="flex items-center gap-2 mb-1"><span className="text-lg">🤖</span><span className="font-medium text-white text-sm">OpenAI</span></div>
              <p className="text-xs text-gray-500">GPT-4o, 4o-mini</p>
              {!isProviderConfigured('openai') && <p className="text-xs text-red-400 mt-1">⚠️ Não configurado</p>}
            </button>
            <button onClick={() => setEditForm({ ...editForm, provider: 'gemini', model: 'gemini-2.0-flash-exp' })}
              className={clsx('p-3 rounded-xl border transition text-left', editForm.provider === 'gemini' ? 'bg-blue-500/20 border-blue-500' : 'bg-gray-800 border-gray-700 hover:border-gray-600')}>
              <div className="flex items-center gap-2 mb-1"><span className="text-lg">✨</span><span className="font-medium text-white text-sm">Gemini</span></div>
              <p className="text-xs text-gray-500">2.0 Flash, 1.5 Pro</p>
              {!isProviderConfigured('gemini') && <p className="text-xs text-red-400 mt-1">⚠️ Não configurado</p>}
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-2 block">Modelo</label>
          <select value={editForm.model || ''} onChange={(e) => setEditForm({ ...editForm, model: e.target.value as AIModel })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none">
            {getModelsForProvider(editForm.provider || 'gemini').map(m => (
              <option key={m.id} value={m.id}>{m.isFree ? '🆓 ' : ''}{m.name}{m.description ? ` - ${m.description}` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-1 block">
          Temperatura: {editForm.temperature?.toFixed(1)} 
          <span className="text-gray-600 ml-2">({(editForm.temperature || 0.7) < 0.3 ? 'Focado' : (editForm.temperature || 0.7) > 0.7 ? 'Criativo' : 'Balanceado'})</span>
        </label>
        <input type="range" min="0" max="1" step="0.1" value={editForm.temperature || 0.7}
          onChange={(e) => setEditForm({ ...editForm, temperature: parseFloat(e.target.value) })} className="w-full accent-orange-500" />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
          className={clsx('relative w-12 h-6 rounded-full transition', editForm.is_active ? 'bg-green-500' : 'bg-gray-700')}>
          <div className={clsx('absolute top-1 w-4 h-4 rounded-full bg-white transition', editForm.is_active ? 'right-1' : 'left-1')} />
        </button>
        <span className="text-sm text-gray-400">Agente ativo</span>
      </div>

      <button onClick={handleSaveAgent} className="px-6 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-medium flex items-center gap-2">
        <Icons.Save size={16} />Salvar Alterações
      </button>
    </div>
  );
};

// ============================================
// TEST TAB COMPONENT
// ============================================
interface TestTabProps {
  editForm: Partial<Agent>;
  selectedAgent: Agent;
  testMessage: string;
  setTestMessage: (msg: string) => void;
  testResponse: string;
  isTesting: boolean;
  handleTestAgent: () => void;
  isProviderConfigured: (provider: AIProvider) => boolean;
}

const TestTab: React.FC<TestTabProps> = ({ editForm, selectedAgent, testMessage, setTestMessage, testResponse, isTesting, handleTestAgent, isProviderConfigured }) => {
  return (
    <div className="max-w-2xl">
      {!isProviderConfigured(editForm.provider || selectedAgent.provider) && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm">⚠️ Provider não configurado. Configure em Configurações.</p>
        </div>
      )}

      <div className="bg-gray-800/50 rounded-xl p-4 mb-4 min-h-[300px] max-h-[400px] overflow-y-auto">
        {testResponse ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <p className="text-gray-300 whitespace-pre-wrap">{testResponse}</p>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">
            <Icons.MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
            <p>Teste o agente enviando uma mensagem</p>
            <p className="text-xs mt-2">Modelo: {AI_MODELS.find(m => m.id === (editForm.model || selectedAgent.model))?.name || editForm.model}</p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input type="text" value={testMessage} onChange={(e) => setTestMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleTestAgent()}
          placeholder="Digite uma mensagem para testar..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none" />
        <button onClick={handleTestAgent} disabled={isTesting || !isProviderConfigured(editForm.provider || selectedAgent.provider)}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2">
          {isTesting ? <Icons.Loader size={18} className="animate-spin" /> : <Icons.Send size={18} />}
        </button>
      </div>
    </div>
  );
};


// ============================================
// KNOWLEDGE TAB COMPONENT - Sistema de Treinamento
// ============================================
interface KnowledgeTabProps {
  agentId: string;
  knowledgeItems: KnowledgeItem[];
  setKnowledgeItems: (items: KnowledgeItem[]) => void;
  trainingStatus: TrainingStatus | null;
  loadingKnowledge: boolean;
  onTrain: () => void;
  onReload: () => void;
}

const KnowledgeTab: React.FC<KnowledgeTabProps> = ({ 
  agentId, knowledgeItems, setKnowledgeItems, trainingStatus, loadingKnowledge, onTrain, onReload 
}) => {
  const [processing, setProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [textTitle, setTextTitle] = useState('');

  // Upload PDF
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setProcessing(true);
    toast.loading('Processando PDF...', { id: 'pdf-upload' });
    
    try {
      let content = '';
      
      // Tentar extrair texto do PDF
      try {
        content = await knowledgeService.extractPDFText(file);
      } catch {
        // Fallback: usar nome do arquivo como referência
        content = `[Documento PDF: ${file.name}]\n\nEste documento foi anexado para referência. O conteúdo deve ser considerado durante as respostas.`;
      }
      
      const item = await knowledgeService.saveKnowledge(agentId, {
        type: 'pdf',
        title: file.name,
        content: content,
        file_name: file.name,
        status: 'ready',
      });
      
      setKnowledgeItems([item, ...knowledgeItems]);
      toast.success('PDF adicionado!', { id: 'pdf-upload' });
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`, { id: 'pdf-upload' });
    }
    
    setProcessing(false);
    e.target.value = '';
  };

  // Adicionar URL
  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    
    setProcessing(true);
    toast.loading('Processando URL...', { id: 'url-add' });
    
    try {
      const { title, content } = await knowledgeService.extractURLContent(urlInput);
      
      const item = await knowledgeService.saveKnowledge(agentId, {
        type: 'url',
        title: title,
        content: content,
        source_url: urlInput,
        status: 'ready',
      });
      
      setKnowledgeItems([item, ...knowledgeItems]);
      toast.success('URL adicionada!', { id: 'url-add' });
      setUrlInput('');
    } catch (error: any) {
      // Fallback: salvar URL mesmo sem conteúdo extraído
      const item = await knowledgeService.saveKnowledge(agentId, {
        type: 'url',
        title: new URL(urlInput).hostname,
        content: `Fonte: ${urlInput}\n\nConsidere o conteúdo desta URL ao responder.`,
        source_url: urlInput,
        status: 'ready',
      });
      
      setKnowledgeItems([item, ...knowledgeItems]);
      toast.success('URL adicionada (conteúdo limitado)', { id: 'url-add' });
      setUrlInput('');
    }
    
    setProcessing(false);
  };

  // Adicionar Texto Manual
  const handleAddText = async () => {
    if (!textInput.trim()) return;
    
    const item = await knowledgeService.saveKnowledge(agentId, {
      type: 'text',
      title: textTitle.trim() || `Texto ${new Date().toLocaleDateString('pt-BR')}`,
      content: textInput,
      status: 'ready',
    });
    
    setKnowledgeItems([item, ...knowledgeItems]);
    toast.success('Texto adicionado!');
    setTextInput('');
    setTextTitle('');
  };

  // Deletar item
  const handleDelete = async (itemId: string) => {
    await knowledgeService.deleteKnowledge(agentId, itemId);
    setKnowledgeItems(knowledgeItems.filter(i => i.id !== itemId));
    toast.success('Conhecimento removido');
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' chars';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'K chars';
    return (bytes / (1024 * 1024)).toFixed(1) + 'M chars';
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header com Status */}
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              🧠 Base de Conhecimento
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Adicione documentos, links e textos para treinar este agente
            </p>
          </div>
          {trainingStatus && trainingStatus.ready_items > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{trainingStatus.ready_items}</div>
              <div className="text-xs text-gray-400">fontes • {formatBytes(trainingStatus.total_chars)}</div>
            </div>
          )}
        </div>
        
        {/* Botão Treinar */}
        {knowledgeItems.length > 0 && (
          <button 
            onClick={onTrain}
            className="mt-4 w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
          >
            <span className="text-xl">🚀</span>
            TREINAR AGENTE
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full ml-2">
              {knowledgeItems.length} {knowledgeItems.length === 1 ? 'fonte' : 'fontes'}
            </span>
          </button>
        )}
        
        {trainingStatus?.is_trained && (
          <div className="mt-3 flex items-center gap-2 text-green-400 text-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Conhecimento ativo • Última atualização: {new Date(trainingStatus.last_trained || '').toLocaleString('pt-BR')}
          </div>
        )}
      </div>

      {/* Adicionar Conhecimento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PDF */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-red-500/50 transition">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
              <Icons.FileText size={18} className="text-red-400" />
            </div>
            <span className="font-medium text-white">PDF / Documento</span>
          </div>
          <label className="cursor-pointer block">
            <input type="file" accept=".pdf,.txt,.doc,.docx" onChange={handlePdfUpload} className="hidden" disabled={processing} />
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-red-500 transition">
              <Icons.Upload size={28} className="mx-auto text-gray-500 mb-2" />
              <p className="text-sm text-gray-400">Arraste ou clique</p>
              <p className="text-xs text-gray-600 mt-1">PDF, TXT, DOC</p>
            </div>
          </label>
        </div>

        {/* URL */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-blue-500/50 transition">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Icons.Link size={18} className="text-blue-400" />
            </div>
            <span className="font-medium text-white">Website / URL</span>
          </div>
          <div className="space-y-2">
            <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://exemplo.com/pagina"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none" />
            <button onClick={handleAddUrl} disabled={!urlInput.trim() || processing}
              className="w-full py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 disabled:opacity-50 font-medium">
              {processing ? 'Processando...' : 'Adicionar URL'}
            </button>
          </div>
        </div>

        {/* Texto */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-yellow-500/50 transition">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Icons.Edit size={18} className="text-yellow-400" />
            </div>
            <span className="font-medium text-white">Texto Manual</span>
          </div>
          <div className="space-y-2">
            <input type="text" value={textTitle} onChange={(e) => setTextTitle(e.target.value)}
              placeholder="Título (opcional)"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:border-yellow-500 focus:outline-none" />
            <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)}
              placeholder="Cole informações importantes..."
              rows={2}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-500 focus:outline-none resize-none" />
            <button onClick={handleAddText} disabled={!textInput.trim()}
              className="w-full py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/30 disabled:opacity-50 font-medium">
              Adicionar Texto
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {(loadingKnowledge || processing) && (
        <div className="flex items-center justify-center py-4">
          <Icons.Loader size={24} className="animate-spin text-orange-400" />
          <span className="ml-2 text-gray-400">Processando...</span>
        </div>
      )}

      {/* Lista de Conhecimentos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-400">
            Conhecimentos ({knowledgeItems.length})
          </h4>
          {knowledgeItems.length > 0 && (
            <button onClick={onReload} className="text-xs text-gray-500 hover:text-white flex items-center gap-1">
              <Icons.RefreshCw size={12} /> Atualizar
            </button>
          )}
        </div>
        
        {knowledgeItems.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-gray-400 font-medium">Nenhum conhecimento adicionado</p>
            <p className="text-gray-600 text-sm mt-1">Adicione PDFs, links ou textos acima</p>
          </div>
        ) : (
          <div className="space-y-2">
            {knowledgeItems.map((item) => (
              <div key={item.id} className="bg-gray-800 rounded-lg p-4 flex items-center gap-4 group hover:bg-gray-750 transition">
                <div className={clsx(
                  'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                  item.type === 'pdf' ? 'bg-red-500/20 text-red-400' :
                  item.type === 'url' ? 'bg-blue-500/20 text-blue-400' :
                  item.type === 'video' ? 'bg-green-500/20 text-green-400' :
                  'bg-yellow-500/20 text-yellow-400'
                )}>
                  {item.type === 'pdf' ? <Icons.FileText size={24} /> :
                   item.type === 'url' ? <Icons.Link size={24} /> :
                   item.type === 'video' ? <Icons.Video size={24} /> :
                   <Icons.Edit size={24} />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{item.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      item.status === 'ready' ? 'bg-green-500/20 text-green-400' :
                      item.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                      item.status === 'error' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    )}>
                      {item.status === 'ready' ? '✓ Pronto' : 
                       item.status === 'processing' ? '⏳ Processando' :
                       item.status === 'error' ? '✗ Erro' : 'Pendente'}
                    </span>
                    <span className="text-xs text-gray-500">{formatBytes(item.content.length)}</span>
                    <span className="text-xs text-gray-600">{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <button onClick={() => handleDelete(item.id)}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition">
                  <Icons.Trash size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
          <Icons.Info size={16} className="text-blue-400" /> Como funciona
        </h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Adicione documentos, links ou textos com informações relevantes</li>
          <li>• Clique em <strong className="text-purple-400">"Treinar Agente"</strong> para injetar o conhecimento</li>
          <li>• O agente usará essas informações para responder com mais precisão</li>
          <li>• Você pode adicionar/remover conhecimentos a qualquer momento</li>
        </ul>
      </div>
    </div>
  );
};
