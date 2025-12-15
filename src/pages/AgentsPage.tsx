import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import type { Agent } from '../types';
import clsx from 'clsx';

const MODELS = ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'];

export const AgentsPage: React.FC = () => {
  const { agents, updateAgent, addNotification } = useStore();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: '', description: '', systemInstruction: '', model: '' });

  const openAgent = (agent: Agent) => { setSelectedAgent(agent); setEditForm({ name: agent.name, role: agent.role, description: agent.description, systemInstruction: agent.systemInstruction, model: agent.model }); };

  const handleSave = () => {
    if (!selectedAgent) return;
    updateAgent(selectedAgent.id, editForm);
    addNotification({ id: `notif-${Date.now()}`, title: 'Agente Atualizado', message: editForm.name, type: 'success', read: false, timestamp: new Date().toISOString() });
    setSelectedAgent(null);
  };

  return (
    <div className="h-full bg-gray-950 flex flex-col">
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
        <div><h1 className="text-xl font-bold text-white flex items-center gap-2"><Icons.Agents size={24} className="text-orange-400" />Agentes IA</h1><p className="text-xs text-gray-500">{agents.length} agentes configurados</p></div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <div key={agent.id} onClick={() => openAgent(agent)} className="bg-gray-900 rounded-xl border border-gray-800 p-5 cursor-pointer hover:border-orange-500/50 transition-all group">
              <div className="flex items-center gap-4 mb-4">
                <img src={agent.avatar} alt={agent.name} className="w-16 h-16 rounded-xl border-2 border-gray-700 group-hover:border-orange-500/50 transition-colors" />
                <div><h3 className="font-bold text-white text-lg">{agent.name}</h3><p className="text-sm text-orange-400">{agent.role}</p></div>
              </div>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">{agent.description}</p>
              <div className="flex items-center justify-between"><span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">{agent.model}</span><span className="text-xs text-gray-500">{agent.knowledgeFiles.length} arquivos</span></div>
            </div>
          ))}
        </div>
      </div>
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900">
              <div className="flex items-center gap-4"><img src={selectedAgent.avatar} alt={selectedAgent.name} className="w-12 h-12 rounded-xl border-2 border-orange-500" /><div><h2 className="text-lg font-bold text-white">{editForm.name}</h2><p className="text-sm text-gray-500">{editForm.role}</p></div></div>
              <button onClick={() => setSelectedAgent(null)} className="text-gray-500 hover:text-white"><Icons.Close size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Nome</label><input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Função</label><input type="text" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div>
              </div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Descrição</label><input type="text" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Modelo</label><select value={editForm.model} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none">{MODELS.map(m => (<option key={m} value={m}>{m}</option>))}</select></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Instrução do Sistema (Prompt)</label><textarea value={editForm.systemInstruction} onChange={(e) => setEditForm({ ...editForm, systemInstruction: e.target.value })} rows={10} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none resize-none font-mono text-sm" placeholder="Defina a personalidade e comportamento do agente..." /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Arquivos de Conhecimento</label><div className="bg-gray-800/50 rounded-lg p-3">{selectedAgent.knowledgeFiles.length > 0 ? (<div className="space-y-2">{selectedAgent.knowledgeFiles.map(file => (<div key={file.id} className="flex items-center justify-between p-2 bg-gray-800 rounded-lg"><span className="text-sm text-gray-300">{file.name}</span><span className="text-xs text-gray-500">{(file.content.length / 1024).toFixed(1)} KB</span></div>))}</div>) : (<p className="text-sm text-gray-500 text-center py-4">Nenhum arquivo adicionado</p>)}</div></div>
            </div>
            <div className="p-5 border-t border-gray-800 flex gap-3"><button onClick={() => setSelectedAgent(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700">Cancelar</button><button onClick={handleSave} className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-500 font-bold">Salvar</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
