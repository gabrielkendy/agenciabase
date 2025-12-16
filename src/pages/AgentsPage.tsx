import { useState } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import type { Agent, AIProvider, AIModel } from '../types';
import { AI_MODELS } from '../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

// Agrupar modelos por provider para exibição
const getModelsForProvider = (provider: AIProvider) => {
  return AI_MODELS.filter(m => m.provider === provider);
};

export const AgentsPage: React.FC = () => {
  const { agents, updateAgent, apiConfig } = useStore();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(agents[0] || null);
  const [activeTab, setActiveTab] = useState<'config' | 'test' | 'knowledge'>('config');
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Agent>>({});

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
      trained_knowledge: agent.trained_knowledge
    });
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
      const provider = editForm.provider || selectedAgent.provider;
      const model = editForm.model || selectedAgent.model;
      const systemPrompt = editForm.system_prompt || selectedAgent.system_prompt;
      
      if (provider === 'openrouter') {
        // Usar OpenRouter
        const { openrouterService } = await import('../services/openrouterService');
        if (!apiConfig.openrouter_key) {
          throw new Error('Configure sua API Key do OpenRouter em Configurações');
        }
        openrouterService.setApiKey(apiConfig.openrouter_key);
        const response = await openrouterService.chat(model, [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: testMessage }
        ], { temperature: editForm.temperature || 0.7 });
        setTestResponse(response);
      } else if (provider === 'gemini') {
        // Usar Gemini direto
        const { sendMessageToGemini } = await import('../services/geminiService');
        const response = await sendMessageToGemini(testMessage, systemPrompt, apiConfig.gemini_key || '');
        setTestResponse(response);
      } else if (provider === 'openai') {
        // Usar OpenAI direto
        if (!apiConfig.openai_key) {
          throw new Error('Configure sua API Key da OpenAI em Configurações');
        }
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiConfig.openai_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: testMessage }
            ],
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

  // Verificar se o provider está configurado
  const isProviderConfigured = (provider: AIProvider): boolean => {
    if (provider === 'openrouter') return !!apiConfig.openrouter_key;
    if (provider === 'gemini') return !!apiConfig.gemini_key;
    if (provider === 'openai') return !!apiConfig.openai_key;
    return false;
  };

  return (
    <div className="h-full bg-gray-950 flex">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Icons.Bot size={20} className="text-orange-400" />
            Agentes IA
          </h2>
          <p className="text-xs text-gray-500 mt-1">{agents.length} agentes configurados</p>
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
                  <span className={clsx(
                    'px-3 py-1 rounded-full text-xs font-medium', 
                    selectedAgent.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                  )}>
                    {selectedAgent.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800">
              <button 
                onClick={() => setActiveTab('config')} 
                className={clsx(
                  'px-6 py-3 text-sm font-medium transition', 
                  activeTab === 'config' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-white'
                )}
              >
                <Icons.Settings size={16} className="inline mr-2" />Configuração
              </button>
              <button 
                onClick={() => setActiveTab('knowledge')} 
                className={clsx(
                  'px-6 py-3 text-sm font-medium transition', 
                  activeTab === 'knowledge' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-white'
                )}
              >
                <Icons.Database size={16} className="inline mr-2" />Conhecimento
              </button>
              <button 
                onClick={() => setActiveTab('test')} 
                className={clsx(
                  'px-6 py-3 text-sm font-medium transition', 
                  activeTab === 'test' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-white'
                )}
              >
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
                      <input 
                        type="text" 
                        value={editForm.name || ''} 
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Função</label>
                      <input 
                        type="text" 
                        value={editForm.role || ''} 
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} 
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Descrição</label>
                    <input 
                      type="text" 
                      value={editForm.description || ''} 
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} 
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none" 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">System Prompt</label>
                    <textarea 
                      value={editForm.system_prompt || ''} 
                      onChange={(e) => setEditForm({ ...editForm, system_prompt: e.target.value })} 
                      rows={8} 
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none resize-none font-mono text-sm" 
                    />
                  </div>

                  {/* Provider & Model Selection */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">Provider de IA</label>
                      <div className="grid grid-cols-3 gap-3">
                        {/* OpenRouter - Destaque */}
                        <button
                          onClick={() => setEditForm({ 
                            ...editForm, 
                            provider: 'openrouter', 
                            model: 'google/gemma-2-9b-it:free' 
                          })}
                          className={clsx(
                            'p-3 rounded-xl border transition text-left',
                            editForm.provider === 'openrouter'
                              ? 'bg-purple-500/20 border-purple-500'
                              : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">🌐</span>
                            <span className="font-medium text-white text-sm">OpenRouter</span>
                          </div>
                          <p className="text-xs text-green-400">6 modelos GRATUITOS!</p>
                          {!isProviderConfigured('openrouter') && (
                            <p className="text-xs text-red-400 mt-1">⚠️ Não configurado</p>
                          )}
                        </button>

                        {/* OpenAI Direto */}
                        <button
                          onClick={() => setEditForm({ 
                            ...editForm, 
                            provider: 'openai', 
                            model: 'gpt-4o-mini' 
                          })}
                          className={clsx(
                            'p-3 rounded-xl border transition text-left',
                            editForm.provider === 'openai'
                              ? 'bg-green-500/20 border-green-500'
                              : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">🤖</span>
                            <span className="font-medium text-white text-sm">OpenAI</span>
                          </div>
                          <p className="text-xs text-gray-500">GPT-4o, 4o-mini</p>
                          {!isProviderConfigured('openai') && (
                            <p className="text-xs text-red-400 mt-1">⚠️ Não configurado</p>
                          )}
                        </button>

                        {/* Gemini Direto */}
                        <button
                          onClick={() => setEditForm({ 
                            ...editForm, 
                            provider: 'gemini', 
                            model: 'gemini-2.0-flash-exp' 
                          })}
                          className={clsx(
                            'p-3 rounded-xl border transition text-left',
                            editForm.provider === 'gemini'
                              ? 'bg-blue-500/20 border-blue-500'
                              : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">✨</span>
                            <span className="font-medium text-white text-sm">Gemini</span>
                          </div>
                          <p className="text-xs text-gray-500">2.0 Flash, 1.5 Pro</p>
                          {!isProviderConfigured('gemini') && (
                            <p className="text-xs text-red-400 mt-1">⚠️ Não configurado</p>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Model Selection */}
                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">Modelo</label>
                      <select 
                        value={editForm.model || ''} 
                        onChange={(e) => setEditForm({ ...editForm, model: e.target.value as AIModel })} 
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none"
                      >
                        {getModelsForProvider(editForm.provider || 'gemini').map(m => (
                          <option key={m.id} value={m.id}>
                            {m.isFree ? '🆓 ' : ''}{m.name}
                            {m.description ? ` - ${m.description}` : ''}
                          </option>
                        ))}
                      </select>
                      {editForm.provider === 'openrouter' && (
                        <p className="text-xs text-green-400 mt-1">
                          💡 Modelos com 🆓 são GRATUITOS!
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Temperature */}
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">
                      Temperatura: {editForm.temperature?.toFixed(1)} 
                      <span className="text-gray-600 ml-2">
                        ({(editForm.temperature || 0.7) < 0.3 ? 'Focado' : (editForm.temperature || 0.7) > 0.7 ? 'Criativo' : 'Balanceado'})
                      </span>
                    </label>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.1" 
                      value={editForm.temperature || 0.7} 
                      onChange={(e) => setEditForm({ ...editForm, temperature: parseFloat(e.target.value) })} 
                      className="w-full accent-orange-500" 
                    />
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })} 
                      className={clsx(
                        'relative w-12 h-6 rounded-full transition', 
                        editForm.is_active ? 'bg-green-500' : 'bg-gray-700'
                      )}
                    >
                      <div className={clsx(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition', 
                        editForm.is_active ? 'right-1' : 'left-1'
                      )} />
                    </button>
                    <span className="text-sm text-gray-400">Agente ativo</span>
                  </div>

                  {/* Save Button */}
                  <button 
                    onClick={handleSaveAgent} 
                    className="px-6 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-medium flex items-center gap-2"
                  >
                    <Icons.Save size={16} />
                    Salvar Alterações
                  </button>
                </div>
              )}

              {activeTab === 'knowledge' && (
                <KnowledgeTab 
                  knowledge={editForm.trained_knowledge || ''}
                  onUpdate={(knowledge) => setEditForm({ ...editForm, trained_knowledge: knowledge })}
                  onSave={handleSaveAgent}
                />
              )}

              {activeTab === 'test' && (
                <div className="max-w-2xl">
                  {/* Provider Status */}
                  {!isProviderConfigured(editForm.provider || selectedAgent.provider) && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                      <p className="text-red-400 text-sm">
                        ⚠️ {editForm.provider === 'openrouter' ? 'OpenRouter' : editForm.provider === 'openai' ? 'OpenAI' : 'Gemini'} não está configurado.
                        <a href="#" onClick={() => window.location.href = '/settings'} className="text-orange-400 hover:underline ml-1">
                          Configure nas Configurações →
                        </a>
                      </p>
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
                        <p className="text-xs mt-2">
                          Modelo: {AI_MODELS.find(m => m.id === (editForm.model || selectedAgent.model))?.name || editForm.model}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={testMessage} 
                      onChange={(e) => setTestMessage(e.target.value)} 
                      onKeyPress={(e) => e.key === 'Enter' && handleTestAgent()} 
                      placeholder="Digite uma mensagem para testar..." 
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none" 
                    />
                    <button 
                      onClick={handleTestAgent} 
                      disabled={isTesting || !isProviderConfigured(editForm.provider || selectedAgent.provider)} 
                      className="px-6 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2"
                    >
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

// Knowledge Tab Component
interface KnowledgeTabProps {
  knowledge: string;
  onUpdate: (knowledge: string) => void;
  onSave: () => void;
}

const KnowledgeTab: React.FC<KnowledgeTabProps> = ({ knowledge, onUpdate, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [videoInput, setVideoInput] = useState('');

  // Parse knowledge entries
  const parseKnowledge = (knowledgeStr: string): { type: string; content: string; date: string }[] => {
    if (!knowledgeStr) return [];
    try {
      return JSON.parse(knowledgeStr);
    } catch {
      return knowledgeStr ? [{ type: 'text', content: knowledgeStr, date: new Date().toISOString() }] : [];
    }
  };

  const entries = parseKnowledge(knowledge);

  const addEntry = (type: string, content: string) => {
    const newEntry = { type, content, date: new Date().toISOString() };
    const updated = [...entries, newEntry];
    onUpdate(JSON.stringify(updated));
    toast.success(`${type === 'pdf' ? 'PDF' : type === 'url' ? 'Link' : type === 'video' ? 'Vídeo' : 'Texto'} adicionado!`);
  };

  const removeEntry = (index: number) => {
    const updated = entries.filter((_, i) => i !== index);
    onUpdate(JSON.stringify(updated));
    toast.success('Conhecimento removido');
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    try {
      // Simular leitura do PDF (em produção, usar pdf.js ou backend)
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        addEntry('pdf', JSON.stringify({ name: file.name, size: file.size, data: base64.substring(0, 1000) + '...' }));
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Erro ao processar PDF');
      setLoading(false);
    }
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    setLoading(true);
    
    try {
      // Em produção, fazer scraping via backend
      addEntry('url', urlInput);
      setUrlInput('');
    } catch (error) {
      toast.error('Erro ao processar URL');
    }
    setLoading(false);
  };

  const handleAddVideo = async () => {
    if (!videoInput.trim()) return;
    setLoading(true);
    
    try {
      // Extrair ID do YouTube
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = videoInput.match(youtubeRegex);
      
      if (match) {
        addEntry('video', JSON.stringify({ 
          platform: 'youtube', 
          id: match[1], 
          url: videoInput 
        }));
      } else {
        addEntry('video', videoInput);
      }
      setVideoInput('');
    } catch (error) {
      toast.error('Erro ao processar vídeo');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
        <h3 className="font-medium text-white mb-2 flex items-center gap-2">
          <Icons.Database size={18} className="text-purple-400" />
          Base de Conhecimento
        </h3>
        <p className="text-sm text-gray-400">
          Adicione documentos, links e vídeos para treinar este agente com conhecimento específico.
        </p>
      </div>

      {/* Add Knowledge */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PDF Upload */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Icons.FileText size={18} className="text-red-400" />
            <span className="font-medium text-white text-sm">PDF</span>
          </div>
          <label className="cursor-pointer">
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handlePdfUpload} 
              className="hidden" 
              disabled={loading}
            />
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-orange-500 transition">
              <Icons.Upload size={24} className="mx-auto text-gray-500 mb-2" />
              <p className="text-xs text-gray-400">Clique para enviar</p>
            </div>
          </label>
        </div>

        {/* URL Input */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Icons.Link size={18} className="text-blue-400" />
            <span className="font-medium text-white text-sm">Link/URL</span>
          </div>
          <div className="space-y-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
            />
            <button
              onClick={handleAddUrl}
              disabled={!urlInput.trim() || loading}
              className="w-full py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 disabled:opacity-50"
            >
              Adicionar
            </button>
          </div>
        </div>

        {/* Video Input */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Icons.Video size={18} className="text-green-400" />
            <span className="font-medium text-white text-sm">Vídeo</span>
          </div>
          <div className="space-y-2">
            <input
              type="url"
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              placeholder="YouTube URL..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
            />
            <button
              onClick={handleAddVideo}
              disabled={!videoInput.trim() || loading}
              className="w-full py-2 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 disabled:opacity-50"
            >
              Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <Icons.Loader size={24} className="animate-spin text-orange-400" />
          <span className="ml-2 text-gray-400">Processando...</span>
        </div>
      )}

      {/* Knowledge Entries */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-400">
          Conhecimentos adicionados ({entries.length})
        </h4>
        
        {entries.length === 0 ? (
          <div className="text-center py-8 bg-gray-800/50 rounded-xl">
            <Icons.Database size={32} className="mx-auto text-gray-600 mb-2" />
            <p className="text-gray-500 text-sm">Nenhum conhecimento adicionado</p>
          </div>
        ) : (
          entries.map((entry, index) => (
            <div key={index} className="bg-gray-800 rounded-lg p-3 flex items-center gap-3">
              <div className={clsx(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                entry.type === 'pdf' ? 'bg-red-500/20 text-red-400' :
                entry.type === 'url' ? 'bg-blue-500/20 text-blue-400' :
                entry.type === 'video' ? 'bg-green-500/20 text-green-400' :
                'bg-gray-700 text-gray-400'
              )}>
                {entry.type === 'pdf' ? <Icons.FileText size={20} /> :
                 entry.type === 'url' ? <Icons.Link size={20} /> :
                 entry.type === 'video' ? <Icons.Video size={20} /> :
                 <Icons.File size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">
                  {entry.type === 'pdf' ? JSON.parse(entry.content).name :
                   entry.type === 'video' ? (JSON.parse(entry.content).url || entry.content) :
                   entry.content}
                </p>
                <p className="text-xs text-gray-500">
                  {entry.type.toUpperCase()} • {new Date(entry.date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => removeEntry(index)}
                className="text-gray-500 hover:text-red-400 transition"
              >
                <Icons.X size={18} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Save Button */}
      {entries.length > 0 && (
        <button 
          onClick={onSave}
          className="px-6 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <Icons.Save size={16} />
          Salvar Conhecimento
        </button>
      )}
    </div>
  );
};
