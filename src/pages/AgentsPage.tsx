import { useState } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { trainAgentKnowledge } from '../services/ai';
import type { Agent, KnowledgeItem, AIProvider, AIModel } from '../types';
import clsx from 'clsx';
import { v4 as uuid } from 'uuid';

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
  const { agents, updateAgent, knowledgeItems, addKnowledgeItem, deleteKnowledgeItem, updateKnowledgeItem, apiConfig, addNotification } = useStore();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(agents[0] || null);
  const [activeTab, setActiveTab] = useState<'config' | 'knowledge' | 'test'>('config');
  const [isTraining, setIsTraining] = useState(false);
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

  const agentKnowledge = knowledgeItems.filter(k => k.agent_id === selectedAgent?.id);
  const untrainedCount = agentKnowledge.filter(k => !k.trained).length;

  const handleSaveAgent = () => {
    if (!selectedAgent) return;
    updateAgent(selectedAgent.id, editForm);
    addNotification({ id: uuid(), title: 'Agente atualizado', message: editForm.name || selectedAgent.name, type: 'success', read: false, timestamp: new Date().toISOString() });
  };

  const handleAddKnowledge = async (type: 'file' | 'url' | 'text') => {
    if (!selectedAgent) return;
    if (type === 'file') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.md,.pdf,.doc,.docx';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const item: KnowledgeItem = { id: uuid(), agent_id: selectedAgent.id, type: 'file', name: file.name, content: reader.result as string, trained: false, created_at: new Date().toISOString() };
          addKnowledgeItem(item);
        };
        reader.readAsText(file);
      };
      input.click();
    } else if (type === 'url') {
      const url = prompt('Digite a URL do conteúdo:');
      if (url) addKnowledgeItem({ id: uuid(), agent_id: selectedAgent.id, type: 'url', name: url, url, content: `[URL: ${url}]`, trained: false, created_at: new Date().toISOString() });
    } else {
      const text = prompt('Digite o texto:');
      if (text) addKnowledgeItem({ id: uuid(), agent_id: selectedAgent.id, type: 'text', name: `Texto ${new Date().toLocaleDateString()}`, content: text, trained: false, created_at: new Date().toISOString() });
    }
  };

  const handleTrainKnowledge = async () => {
    if (!selectedAgent || agentKnowledge.length === 0) return;
    setIsTraining(true);
    try {
      const trainedContent = await trainAgentKnowledge(selectedAgent, agentKnowledge.map(k => ({ content: k.content, name: k.name })));
      updateAgent(selectedAgent.id, { trained_knowledge: trainedContent });
      agentKnowledge.forEach(k => updateKnowledgeItem(k.id, { trained: true }));
      addNotification({ id: uuid(), title: '🧠 Treinamento concluído!', message: `${selectedAgent.name} absorveu ${agentKnowledge.length} conhecimentos`, type: 'success', read: false, timestamp: new Date().toISOString() });
    } catch (error: any) {
      addNotification({ id: uuid(), title: 'Erro', message: error.message, type: 'error', read: false, timestamp: new Date().toISOString() });
    } finally { setIsTraining(false); }
  };

  const handleTestAgent = async () => {
    if (!selectedAgent || !testMessage.trim()) return;
    setIsTesting(true);
    setTestResponse('');
    try {
      const { chat } = await import('../services/ai');
      const response = await chat({ agent: { ...selectedAgent, ...editForm } as Agent, messages: [{ role: 'user', content: testMessage }], apiKeys: { openai: apiConfig.openai_key, gemini: apiConfig.gemini_key } });
      setTestResponse(response);
    } catch (error: any) { setTestResponse(`Erro: ${error.message}`); }
    finally { setIsTesting(false); }
  };

  const getProviderModels = (provider: AIProvider) => AI_MODELS.find(p => p.provider === provider)?.models || [];

  return (
    <div className="h-full flex bg-gray-950">
      <div className="w-80 border-r border-gray-800 flex flex-col bg-gray-900/50">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Icons.Agents size={20} className="text-orange-400" />Agentes IA</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {agents.map(agent => (
            <button key={agent.id} onClick={() => selectAgent(agent)} className={clsx('w-full p-3 rounded-xl border transition-all text-left', selectedAgent?.id === agent.id ? 'bg-orange-500/10 border-orange-500/50' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600')}>
              <div className="flex items-center gap-3">
                <img src={agent.avatar} className="w-12 h-12 rounded-xl" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><p className="font-medium text-white truncate">{agent.name}</p>{agent.trained_knowledge && <Icons.Brain size={12} className="text-purple-400" />}</div>
                  <p className="text-xs text-gray-400 truncate">{agent.role}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded', agent.provider === 'openai' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400')}>{agent.provider === 'openai' ? 'OpenAI' : 'Gemini'}</span>
                    <span className={clsx('w-1.5 h-1.5 rounded-full', agent.is_active ? 'bg-green-400' : 'bg-gray-600')} />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedAgent ? (
        <div className="flex-1 flex flex-col">
          <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
            <div className="flex items-center gap-4"><img src={selectedAgent.avatar} className="w-10 h-10 rounded-xl" /><div><h1 className="font-bold text-white">{selectedAgent.name}</h1><p className="text-xs text-gray-500">{selectedAgent.role}</p></div></div>
            <button onClick={handleSaveAgent} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-lg font-medium"><Icons.Save size={18} />Salvar</button>
          </div>
          <div className="border-b border-gray-800 flex">
            {[{ id: 'config', label: 'Configuração', icon: Icons.Settings }, { id: 'knowledge', label: 'Conhecimento', icon: Icons.Brain, badge: untrainedCount }, { id: 'test', label: 'Testar', icon: Icons.MessageCircle }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={clsx('flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative', activeTab === tab.id ? 'text-orange-400 border-b-2 border-orange-400 bg-orange-500/5' : 'text-gray-500 hover:text-white')}>
                <tab.icon size={16} />{tab.label}{tab.badge && tab.badge > 0 && <span className="absolute top-2 right-1/4 w-4 h-4 bg-orange-500 rounded-full text-[10px] text-white flex items-center justify-center">{tab.badge}</span>}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'config' && (
              <div className="max-w-2xl space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-500 mb-1">Nome</label><input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Função</label><input type="text" value={editForm.role || ''} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Prompt do Sistema</label><textarea value={editForm.system_prompt || ''} onChange={(e) => setEditForm({ ...editForm, system_prompt: e.target.value })} rows={8} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none resize-none font-mono text-sm" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-500 mb-1">Provedor</label><select value={editForm.provider || 'gemini'} onChange={(e) => { const p = e.target.value as AIProvider; setEditForm({ ...editForm, provider: p, model: getProviderModels(p)[0]?.id }); }} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none"><option value="gemini">Google Gemini</option><option value="openai">OpenAI</option></select></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Modelo</label><select value={editForm.model || ''} onChange={(e) => setEditForm({ ...editForm, model: e.target.value as AIModel })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none">{getProviderModels(editForm.provider || 'gemini').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Temperatura: {editForm.temperature?.toFixed(1) || '0.7'}</label><input type="range" min="0" max="1" step="0.1" value={editForm.temperature || 0.7} onChange={(e) => setEditForm({ ...editForm, temperature: parseFloat(e.target.value) })} className="w-full" /></div>
              </div>
            )}
            {activeTab === 'knowledge' && (
              <div className="max-w-2xl">
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div><h3 className="font-bold text-white flex items-center gap-2"><Icons.Brain size={20} className="text-purple-400" />Treinar Conhecimento</h3><p className="text-sm text-gray-400 mt-1">{agentKnowledge.length} arquivos • {untrainedCount} não treinados</p></div>
                    <button onClick={handleTrainKnowledge} disabled={isTraining || agentKnowledge.length === 0} className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg font-medium', agentKnowledge.length > 0 ? 'bg-purple-500 hover:bg-purple-400 text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed')}>{isTraining ? <><Icons.Loader size={18} className="animate-spin" />Treinando...</> : <><Icons.Wand size={18} />Treinar</>}</button>
                  </div>
                </div>
                <div className="mb-6"><h3 className="text-sm font-medium text-white mb-3">Adicionar</h3><div className="grid grid-cols-3 gap-3">{[{ t: 'file', icon: Icons.FileUp, label: 'Arquivo', color: 'orange' }, { t: 'url', icon: Icons.Link, label: 'URL', color: 'blue' }, { t: 'text', icon: Icons.File, label: 'Texto', color: 'green' }].map(k => <button key={k.t} onClick={() => handleAddKnowledge(k.t as any)} className="p-4 bg-gray-800 border border-gray-700 rounded-xl hover:border-orange-500 text-center"><k.icon size={24} className={`mx-auto mb-2 text-${k.color}-400`} /><p className="text-sm text-white">{k.label}</p></button>)}</div></div>
                <div className="space-y-2">{agentKnowledge.map(item => <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg"><div className="flex-1 min-w-0"><p className="text-sm text-white truncate">{item.name}</p></div>{item.trained ? <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">Treinado</span> : <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">Pendente</span>}<button onClick={() => deleteKnowledgeItem(item.id)} className="p-1 text-gray-500 hover:text-red-400"><Icons.Delete size={16} /></button></div>)}</div>
              </div>
            )}
            {activeTab === 'test' && (
              <div className="max-w-2xl"><div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden"><div className="p-4 border-b border-gray-800"><h3 className="font-medium text-white">Testar {selectedAgent.name}</h3></div>{testResponse && <div className="p-4 bg-gray-800/50 border-b border-gray-800"><div className="flex gap-3"><img src={selectedAgent.avatar} className="w-8 h-8 rounded-lg" /><div className="flex-1"><p className="text-xs text-orange-400 font-medium mb-1">{selectedAgent.name}</p><p className="text-sm text-gray-200 whitespace-pre-wrap">{testResponse}</p></div></div></div>}<div className="p-4"><div className="flex gap-3"><input type="text" value={testMessage} onChange={(e) => setTestMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTestAgent()} placeholder="Digite uma mensagem..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" /><button onClick={handleTestAgent} disabled={!testMessage.trim() || isTesting} className="px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2">{isTesting ? <Icons.Loader size={18} className="animate-spin" /> : <Icons.Send size={18} />}</button></div></div></div></div>
            )}
          </div>
        </div>
      ) : <div className="flex-1 flex items-center justify-center text-gray-500">Selecione um agente</div>}
    </div>
  );
};
