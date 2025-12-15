import { useState } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import type { Agent, AIProvider, AIModel } from '../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const AI_MODELS: { provider: AIProvider; models: { id: AIModel; name: string }[] }[] = [
  { provider: 'openai', models: [
    { id: 'gpt-4o', name: 'GPT-4o (mais inteligente)' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (rápido)' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (econômico)' },
  ]},
  { provider: 'gemini', models: [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (recomendado)' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (avançado)' },
  ]}
];

export const AgentsPage: React.FC = () => {
  const { agents, updateAgent, apiConfig } = useStore();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(agents[0] || null);
  const [activeTab, setActiveTab] = useState<'config' | 'test'>('config');
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Agent>>({});

  const selectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setEditForm({ name: agent.name, role: agent.role, description: agent.description, system_prompt: agent.system_prompt, provider: agent.provider, model: agent.model, temperature: agent.temperature, is_active: agent.is_active });
    setActiveTab('config');
    setTestResponse('');
  };

  const handleSaveAgent = () => {
    if (!selectedAgent) return;
    updateAgent(selectedAgent.id, editForm);
    toast.success('Agente atualizado!');
  };

  const handleTestAgent = async () => {
    if (!selectedAgent || !testMessage.trim()) return;
    setIsTesting(true);
    setTestResponse('');
    try {
      const { sendMessageToGemini } = await import('../services/geminiService');
      const response = await sendMessageToGemini(testMessage, editForm.system_prompt || selectedAgent.system_prompt, apiConfig.gemini_key || '');
      setTestResponse(response);
    } catch (error: any) { setTestResponse(`Erro: ${error.message}`); }
    finally { setIsTesting(false); }
  };

  const getProviderModels = (provider: AIProvider) => AI_MODELS.find(p => p.provider === provider)?.models || [];

  return (
    <div className="h-full bg-gray-950 flex">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Icons.Bot size={20} className="text-orange-400" />Agentes IA</h2>
          <p className="text-xs text-gray-500 mt-1">{agents.length} agentes configurados</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {agents.map(agent => (
            <button key={agent.id} onClick={() => selectAgent(agent)} className={clsx('w-full p-3 rounded-xl text-left transition flex items-center gap-3', selectedAgent?.id === agent.id ? 'bg-orange-500/20 border border-orange-500' : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600')}>
              <span className="text-2xl">{agent.avatar}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm truncate">{agent.name}</p>
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
                  <h1 className="text-2xl font-bold text-white">{selectedAgent.name}</h1>
                  <p className="text-gray-400">{selectedAgent.role}</p>
                  <p className="text-sm text-gray-500 mt-1">{selectedAgent.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', selectedAgent.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400')}>
                    {selectedAgent.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800">
              <button onClick={() => setActiveTab('config')} className={clsx('px-6 py-3 text-sm font-medium transition', activeTab === 'config' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-white')}>
                <Icons.Settings size={16} className="inline mr-2" />Configuração
              </button>
              <button onClick={() => setActiveTab('test')} className={clsx('px-6 py-3 text-sm font-medium transition', activeTab === 'test' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-white')}>
                <Icons.MessageSquare size={16} className="inline mr-2" />Testar
              </button>
            </div>


            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'config' && (
                <div className="max-w-2xl space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Nome</label>
                      <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Função</label>
                      <input type="text" value={editForm.role || ''} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Descrição</label>
                    <input type="text" value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">System Prompt</label>
                    <textarea value={editForm.system_prompt || ''} onChange={(e) => setEditForm({ ...editForm, system_prompt: e.target.value })} rows={8} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none resize-none font-mono text-sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Provider</label>
                      <select value={editForm.provider || 'gemini'} onChange={(e) => setEditForm({ ...editForm, provider: e.target.value as AIProvider, model: getProviderModels(e.target.value as AIProvider)[0]?.id })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none">
                        <option value="gemini">Google Gemini</option>
                        <option value="openai">OpenAI</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Modelo</label>
                      <select value={editForm.model || ''} onChange={(e) => setEditForm({ ...editForm, model: e.target.value as AIModel })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none">
                        {getProviderModels(editForm.provider || 'gemini').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Temperatura: {editForm.temperature?.toFixed(1)}</label>
                      <input type="range" min="0" max="1" step="0.1" value={editForm.temperature || 0.7} onChange={(e) => setEditForm({ ...editForm, temperature: parseFloat(e.target.value) })} className="w-full accent-orange-500" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })} className={clsx('relative w-12 h-6 rounded-full transition', editForm.is_active ? 'bg-green-500' : 'bg-gray-700')}>
                      <div className={clsx('absolute top-1 w-4 h-4 rounded-full bg-white transition', editForm.is_active ? 'right-1' : 'left-1')} />
                    </button>
                    <span className="text-sm text-gray-400">Agente ativo</span>
                  </div>
                  <button onClick={handleSaveAgent} className="px-6 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-medium flex items-center gap-2">
                    <Icons.Save size={16} />Salvar Alterações
                  </button>
                </div>
              )}

              {activeTab === 'test' && (
                <div className="max-w-2xl">
                  <div className="bg-gray-800/50 rounded-xl p-4 mb-4 min-h-[300px] max-h-[400px] overflow-y-auto">
                    {testResponse ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <p className="text-gray-300 whitespace-pre-wrap">{testResponse}</p>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-12">
                        <Icons.MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
                        <p>Teste o agente enviando uma mensagem</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={testMessage} onChange={(e) => setTestMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleTestAgent()} placeholder="Digite uma mensagem para testar..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none" />
                    <button onClick={handleTestAgent} disabled={isTesting} className="px-6 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2">
                      {isTesting ? <Icons.Loader size={18} className="animate-spin" /> : <Icons.Send size={18} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Icons.Bot size={64} className="mx-auto mb-4 opacity-30" />
              <p>Selecione um agente</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
