import React, { useState, useRef } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import type { KnowledgeFile } from '../types';

export const KnowledgePage: React.FC = () => {
  const { globalKnowledge, addGlobalKnowledge, removeGlobalKnowledge, addNotification } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [newFile, setNewFile] = useState({ name: '', content: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => { const content = event.target?.result as string; setNewFile({ name: file.name, content }); };
    reader.readAsText(file);
  };

  const handleSave = () => {
    if (!newFile.name || !newFile.content) { addNotification({ id: `notif-${Date.now()}`, title: 'Erro', message: 'Nome e conteúdo são obrigatórios', type: 'error', read: false, timestamp: new Date().toISOString() }); return; }
    const file: KnowledgeFile = { id: `knowledge-${Date.now()}`, name: newFile.name, content: newFile.content, type: newFile.name.split('.').pop() || 'txt', uploadedAt: new Date().toISOString() };
    addGlobalKnowledge(file); addNotification({ id: `notif-${Date.now()}`, title: 'Conhecimento Adicionado', message: newFile.name, type: 'success', read: false, timestamp: new Date().toISOString() });
    setNewFile({ name: '', content: '' }); setShowModal(false);
  };

  const handleDelete = (file: KnowledgeFile) => { if (confirm(`Excluir "${file.name}"?`)) { removeGlobalKnowledge(file.id); addNotification({ id: `notif-${Date.now()}`, title: 'Arquivo Excluído', message: file.name, type: 'warning', read: false, timestamp: new Date().toISOString() }); } };

  return (
    <div className="h-full bg-gray-950 flex flex-col">
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
        <div><h1 className="text-xl font-bold text-white flex items-center gap-2"><Icons.Knowledge size={24} className="text-orange-400" />Base de Conhecimento</h1><p className="text-xs text-gray-500">{globalKnowledge.length} arquivos globais</p></div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium"><Icons.Plus size={18} /> Adicionar</button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 mb-6"><p className="text-sm text-gray-400"><Icons.Info size={16} className="inline mr-2 text-blue-400" />Arquivos adicionados aqui estarão disponíveis para <strong>todos</strong> os agentes IA como contexto global.</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {globalKnowledge.map(file => (
            <div key={file.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4 hover:border-gray-700 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center"><Icons.Document size={20} className="text-orange-400" /></div><div><h3 className="font-medium text-white text-sm">{file.name}</h3><p className="text-xs text-gray-500">{(file.content.length / 1024).toFixed(1)} KB</p></div></div>
                <button onClick={() => handleDelete(file)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"><Icons.Delete size={16} /></button>
              </div>
              <p className="text-xs text-gray-500 line-clamp-3">{file.content.substring(0, 200)}...</p>
            </div>
          ))}
          {globalKnowledge.length === 0 && (<div className="col-span-full text-center py-12"><Icons.Knowledge size={48} className="mx-auto text-gray-700 mb-4" /><p className="text-gray-500">Nenhum arquivo de conhecimento</p><p className="text-xs text-gray-600 mt-1">Adicione documentos para enriquecer o contexto dos agentes</p></div>)}
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between"><h2 className="text-lg font-bold text-white">Adicionar Conhecimento</h2><button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><Icons.Close size={20} /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Upload de Arquivo</label><input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.md,.json,.csv" className="hidden" /><button onClick={() => fileInputRef.current?.click()} className="w-full py-8 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 hover:border-orange-500 hover:text-orange-400 transition-colors flex flex-col items-center gap-2"><Icons.Upload size={24} /><span className="text-sm">Clique para fazer upload</span><span className="text-xs text-gray-600">.txt, .md, .json, .csv</span></button></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Nome</label><input type="text" value={newFile.name} onChange={(e) => setNewFile({ ...newFile, name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" placeholder="nome-arquivo.txt" /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Conteúdo</label><textarea value={newFile.content} onChange={(e) => setNewFile({ ...newFile, content: e.target.value })} rows={8} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none resize-none font-mono text-sm" placeholder="Cole ou digite o conteúdo..." /></div>
            </div>
            <div className="p-5 border-t border-gray-800 flex gap-3"><button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700">Cancelar</button><button onClick={handleSave} className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-500 font-bold">Adicionar</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
