import React, { useState, useRef } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { Agent, GeminiModelType, KnowledgeFile } from '../types';
import { trainAgentWithKnowledge } from '../services/geminiService';

const MODELS: { id: GeminiModelType; name: string }[] = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Recomendado)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite-latest', name: 'Gemini 2.5 Flash Lite' },
];

export const AgentsPage: React.FC = () => {
  const { agents, updateAgent, addAgentFile, removeAgentFile, globalFiles, addNotification } = useStore();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingPrompt, setEditingPrompt] = useState('');
  const [editingModel, setEditingModel] = useState<GeminiModelType>('gemini-2.0-flash');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingSummary, setTrainingSummary] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setEditingName(agent.name);
    setEditingPrompt(agent.systemInstruction);
    setEditingModel(agent.model);
    setTrainingSummary('');
  };

  const handleSave = () => {
    if (!selectedAgent) return;
    updateAgent(selectedAgent.id, {
      name: editingName,
      systemInstruction: editingPrompt,
      model: editingModel,
    });
    setSelectedAgent({ ...selectedAgent, name: editingName, systemInstruction: editingPrompt, model: editingModel });
    
    addNotification({
      id: Date.now().toString(),
      title: 'Agente Atualizado',
      message: `${editingName} foi atualizado com sucesso!`,
      type: 'success',
      read: false,
      timestamp: new Date()
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !selectedAgent) return;
    
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const newFile: KnowledgeFile = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          content,
          type: file.name.endsWith('.json') ? 'json' : file.name.endsWith('.csv') ? 'csv' : 'text',
          source: 'upload',
          lastModified: new Date(),
        };
        addAgentFile(selectedAgent.id, newFile);
        setSelectedAgent(prev => prev ? { ...prev, files: [...prev.files, newFile] } : null);
        
        addNotification({
          id: Date.now().toString(),
          title: 'Arquivo Adicionado',
          message: `${file.name} foi adicionado à base de conhecimento de ${selectedAgent.name}`,
          type: 'success',
          read: false,
          timestamp: new Date()
        });
      };
      reader.readAsText(file);
    });
  };

  const handleTrainAgent = async () => {
    if (!selectedAgent) return;
    
    const allFiles = [...globalFiles, ...selectedAgent.files];
    if (allFiles.length === 0) {
      addNotification({
        id: Date.now().toString(),
        title: 'Sem Conhecimento',
        message: 'Adicione arquivos antes de treinar o agente',
        type: 'warning',
        read: false,
        timestamp: new Date()
      });
      return;
    }

    setIsTraining(true);
    setTrainingSummary('');

    try {
      const summary = await trainAgentWithKnowledge(selectedAgent, allFiles);
      setTrainingSummary(summary);
      
      // Append training summary to agent's system instruction
      const enhancedPrompt = `${editingPrompt}

=== CONHECIMENTO TREINADO ===
${summary}
=== FIM DO CONHECIMENTO ===`;
      
      setEditingPrompt(enhancedPrompt);
      updateAgent(selectedAgent.id, { systemInstruction: enhancedPrompt });
      
      addNotification({
        id: Date.now().toString(),
        title: 'Treinamento Concluído! 🎉',
        message: `${selectedAgent.name} absorveu ${allFiles.length} arquivo(s) de conhecimento`,
        type: 'success',
        read: false,
        timestamp: new Date()
      });
    } catch (error) {
      addNotification({
        id: Date.now().toString(),
        title: 'Erro no Treinamento',
        message: 'Falha ao processar os arquivos',
        type: 'error',
        read: false,
        timestamp: new Date()
      });
    } finally {
      setIsTraining(false);
    }
  };

  const handleDownloadBackup = () => {
    const data = JSON.stringify(agents, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agents-backup.json';
    a.click();
  };

  const handleResetFactory = () => {
    if (confirm('Tem certeza? Isso irá resetar todos os agentes para o padrão.')) {
      localStorage.removeItem('base-agency-storage');
      window.location.reload();
    }
  };

  return (
    <div className="flex h-full bg-gray-950">
      {/* Agent List */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Icons.Agents size={20} className="text-orange-400" />
            Time de Agentes
          </h2>
          <p className="text-xs text-gray-500 mt-1">Configure comportamento e treine com conhecimento</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => handleSelectAgent(agent)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                selectedAgent?.id === agent.id
                  ? 'bg-orange-500/10 border border-orange-500/30'
                  : 'hover:bg-gray-800'
              }`}
            >
              <div className="relative">
                <img src={agent.avatar} className="w-10 h-10 rounded-full" alt={agent.name} />
                {agent.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
                )}
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-white">{agent.name}</p>
                <p className="text-xs text-gray-500">{agent.role}</p>
              </div>
              {agent.files.length > 0 && (
                <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                  {agent.files.length} 📚
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-800 space-y-2">
          <button onClick={handleDownloadBackup} className="w-full flex items-center justify-center gap-2 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 text-sm">
            <Icons.Download size={16} /> Backup JSON
          </button>
          <button onClick={handleResetFactory} className="w-full flex items-center justify-center gap-2 py-2 bg-red-900/20 text-red-400 rounded-lg hover:bg-red-900/30 text-sm">
            <Icons.Refresh size={16} /> Resetar Fábrica
          </button>
        </div>
      </div>

      {/* Agent Detail */}
      <div className="flex-1 overflow-y-auto">
        {selectedAgent ? (
          <div className="max-w-3xl mx-auto p-8">
            {/* Header */}
            <div className="flex items-start gap-6 mb-8">
              <div className="relative">
                <img src={selectedAgent.avatar} className="w-20 h-20 rounded-2xl border-2 border-orange-500" alt={selectedAgent.name} />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-gray-950" />
              </div>
              <div className="flex-1">
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full font-medium">{selectedAgent.role}</span>
                <h2 className="text-2xl font-bold text-white mt-2">{selectedAgent.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedAgent.description}</p>
              </div>
            </div>

            {/* Knowledge Injection - PRINCIPAL */}
            <div className="bg-gradient-to-r from-orange-900/20 to-purple-900/20 rounded-2xl border border-orange-500/30 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-orange-400 flex items-center gap-2 text-lg">
                    <Icons.Sparkles size={20} /> Injeção de Conhecimento
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Arquivos aqui treinam ESTE agente especificamente
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Icons.Upload size={16} /> Upload
                  </button>
                  <button 
                    onClick={handleTrainAgent}
                    disabled={isTraining}
                    className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-500 hover:to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {isTraining ? (
                      <>
                        <Icons.Loader size={16} className="animate-spin" /> Treinando...
                      </>
                    ) : (
                      <>
                        <Icons.Zap size={16} /> Treinar Agente
                      </>
                    )}
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept=".txt,.md,.json,.csv,.pdf" multiple className="hidden" onChange={handleFileUpload} />
              </div>
              
              {/* Files List */}
              {selectedAgent.files.length === 0 && globalFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-700 rounded-xl">
                  <Icons.File size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Nenhum conhecimento injetado</p>
                  <p className="text-xs mt-1">Faça upload de arquivos para treinar este agente</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {/* Agent-specific files */}
                  {selectedAgent.files.map(file => (
                    <div key={file.id} className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                          <Icons.File size={16} className="text-orange-400" />
                        </div>
                        <div>
                          <span className="text-sm text-white font-medium">{file.name}</span>
                          <span className="text-[10px] text-orange-400 ml-2">ESPECÍFICO</span>
                        </div>
                      </div>
                      <button onClick={() => { removeAgentFile(selectedAgent.id, file.id); setSelectedAgent(prev => prev ? { ...prev, files: prev.files.filter(f => f.id !== file.id) } : null); }} className="text-gray-500 hover:text-red-400 transition-colors">
                        <Icons.Delete size={16} />
                      </button>
                    </div>
                  ))}
                  {/* Global files */}
                  {globalFiles.map(file => (
                    <div key={file.id} className="flex items-center justify-between bg-gray-800/30 p-3 rounded-lg border border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <Icons.File size={16} className="text-blue-400" />
                        </div>
                        <div>
                          <span className="text-sm text-white">{file.name}</span>
                          <span className="text-[10px] text-blue-400 ml-2">GLOBAL</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Training Summary */}
              {trainingSummary && (
                <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
                  <h4 className="text-sm font-bold text-green-400 mb-2 flex items-center gap-2">
                    <Icons.Success size={16} /> Conhecimento Absorvido
                  </h4>
                  <p className="text-xs text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">{trainingSummary}</p>
                </div>
              )}
            </div>

            {/* Model & Name */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Nome do Agente</label>
                  <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Modelo de IA</label>
                  <select value={editingModel} onChange={(e) => setEditingModel(e.target.value as GeminiModelType)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none">
                    {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* System Prompt */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Prompt do Sistema (Persona)</label>
                <span className="text-[10px] text-gray-600">{editingPrompt.length} caracteres</span>
              </div>
              <textarea 
                value={editingPrompt} 
                onChange={(e) => setEditingPrompt(e.target.value)} 
                rows={12} 
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:border-orange-500 focus:outline-none resize-none font-mono"
                placeholder="Defina a personalidade, tom de voz e comportamento deste agente..."
              />
            </div>

            {/* Save Button */}
            <button onClick={handleSave} className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20">
              <Icons.Save size={18} /> Salvar Alterações
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <Icons.Agents size={64} className="mb-4 opacity-30" />
            <p>Selecione um agente para configurar</p>
          </div>
        )}
      </div>
    </div>
  );
};
