import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import type { Task, TaskStatus, TaskPriority, SocialChannel } from '../types';
import clsx from 'clsx';

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'backlog', title: 'Backlog', color: 'bg-gray-500' },
  { id: 'todo', title: 'A Fazer', color: 'bg-blue-500' },
  { id: 'in_progress', title: 'Em Andamento', color: 'bg-yellow-500' },
  { id: 'review', title: 'Revisão', color: 'bg-purple-500' },
  { id: 'approved', title: 'Aprovado', color: 'bg-green-500' },
  { id: 'published', title: 'Publicado', color: 'bg-emerald-600' },
];

const PRIORITIES: { id: TaskPriority; label: string; color: string }[] = [
  { id: 'low', label: 'Baixa', color: 'bg-green-500/20 text-green-400' },
  { id: 'medium', label: 'Média', color: 'bg-yellow-500/20 text-yellow-400' },
  { id: 'high', label: 'Alta', color: 'bg-red-500/20 text-red-400' },
  { id: 'urgent', label: 'Urgente', color: 'bg-red-600/30 text-red-300' },
];

const CHANNELS: SocialChannel[] = ['instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'twitter'];

export const WorkflowPage: React.FC = () => {
  const { tasks, clients, addTask, updateTask, deleteTask, addNotification, selectedClientId } = useStore();
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' as TaskPriority, channel: 'instagram' as SocialChannel, clientId: '' });
  
  const filteredTasks = selectedClientId ? tasks.filter(t => t.clientId === selectedClientId) : tasks;
  
  const handleDragStart = (task: Task) => setDraggedTask(task);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  
  const handleDrop = (status: TaskStatus) => {
    if (draggedTask && draggedTask.status !== status) {
      updateTask(draggedTask.id, { status });
      addNotification({ id: `notif-${Date.now()}`, title: 'Tarefa Movida', message: `${draggedTask.title} → ${COLUMNS.find(c => c.id === status)?.title}`, type: 'info', read: false, timestamp: new Date().toISOString() });
    }
    setDraggedTask(null);
  };
  
  const handleCreateTask = () => {
    if (!newTask.title) return;
    const task: Task = { id: `task-${Date.now()}`, clientId: newTask.clientId || clients[0]?.id || 'client-demo', title: newTask.title, description: newTask.description, status: 'backlog', priority: newTask.priority, channel: newTask.channel, mediaUrls: [], approvalToken: `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, approvalStatus: 'pending', createdAt: new Date().toISOString() };
    addTask(task);
    addNotification({ id: `notif-${Date.now()}`, title: 'Nova Demanda! 📋', message: task.title, type: 'success', read: false, timestamp: new Date().toISOString() });
    setNewTask({ title: '', description: '', priority: 'medium', channel: 'instagram', clientId: '' });
    setShowNewTask(false);
  };
  
  const getApprovalLink = (task: Task) => `${window.location.origin}/approval/${task.approvalToken}`;
  const copyApprovalLink = (task: Task) => { navigator.clipboard.writeText(getApprovalLink(task)); addNotification({ id: `notif-${Date.now()}`, title: 'Link Copiado! 📋', message: 'Link de aprovação copiado', type: 'success', read: false, timestamp: new Date().toISOString() }); };
  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || 'Sem cliente';
  
  return (
    <div className="h-full bg-gray-950 flex flex-col">
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
        <div><h1 className="text-xl font-bold text-white flex items-center gap-2"><Icons.Kanban size={24} className="text-orange-400" />Workflow de Demandas</h1><p className="text-xs text-gray-500">{filteredTasks.length} demandas {selectedClientId ? 'deste cliente' : 'no total'}</p></div>
        <button onClick={() => setShowNewTask(true)} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"><Icons.Plus size={18} /> Nova Demanda</button>
      </div>
      
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 min-w-max h-full">
          {COLUMNS.map(column => {
            const columnTasks = filteredTasks.filter(t => t.status === column.id);
            return (
              <div key={column.id} className="w-72 flex flex-col bg-gray-900/50 rounded-xl border border-gray-800" onDragOver={handleDragOver} onDrop={() => handleDrop(column.id)}>
                <div className="p-3 border-b border-gray-800"><div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${column.color}`} /><h3 className="font-bold text-white text-sm">{column.title}</h3><span className="ml-auto text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{columnTasks.length}</span></div></div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {columnTasks.map(task => {
                    const priority = PRIORITIES.find(p => p.id === task.priority);
                    return (
                      <div key={task.id} draggable onDragStart={() => handleDragStart(task)} onClick={() => setSelectedTask(task)} className={clsx('bg-gray-800 rounded-lg p-3 cursor-pointer border border-gray-700 hover:border-orange-500/50 transition-all group', draggedTask?.id === task.id && 'opacity-50')}>
                        <div className="flex items-start justify-between mb-2"><h4 className="font-medium text-white text-sm line-clamp-2 flex-1">{task.title}</h4><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-2 ${priority?.color}`}>{priority?.label}</span></div>
                        {task.description && (<p className="text-xs text-gray-500 line-clamp-2 mb-2">{task.description}</p>)}
                        <div className="flex items-center justify-between"><div className="flex items-center gap-1.5 flex-wrap"><span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">{task.channel}</span><span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">{getClientName(task.clientId)}</span></div><button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"><Icons.Delete size={14} /></button></div>
                      </div>
                    );
                  })}
                  {columnTasks.length === 0 && (<div className="text-center py-8 text-gray-600"><Icons.Kanban size={24} className="mx-auto mb-2 opacity-30" /><p className="text-xs">Nenhuma tarefa</p></div>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {showNewTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between"><h2 className="text-lg font-bold text-white">Nova Demanda</h2><button onClick={() => setShowNewTask(false)} className="text-gray-500 hover:text-white"><Icons.Close size={20} /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Título</label><input type="text" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" placeholder="Ex: Carrossel sobre produtividade" /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Descrição</label><textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none resize-none" placeholder="Detalhes da demanda..." /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Cliente</label><select value={newTask.clientId} onChange={(e) => setNewTask({ ...newTask, clientId: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none"><option value="">Selecione</option>{clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Prioridade</label><select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none">{PRIORITIES.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}</select></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Canal</label><select value={newTask.channel} onChange={(e) => setNewTask({ ...newTask, channel: e.target.value as SocialChannel })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none">{CHANNELS.map(c => (<option key={c} value={c}>{c}</option>))}</select></div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-800 flex gap-3"><button onClick={() => setShowNewTask(false)} className="flex-1 py-2.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700">Cancelar</button><button onClick={handleCreateTask} className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-500 font-bold">Criar Demanda</button></div>
          </div>
        </div>
      )}
      
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between"><h2 className="text-lg font-bold text-white">{selectedTask.title}</h2><button onClick={() => setSelectedTask(null)} className="text-gray-500 hover:text-white"><Icons.Close size={20} /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Descrição</label><p className="text-gray-300 text-sm">{selectedTask.description || 'Sem descrição'}</p></div>
              <div className="grid grid-cols-3 gap-4"><div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Status</label><p className="text-white text-sm">{COLUMNS.find(c => c.id === selectedTask.status)?.title}</p></div><div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Canal</label><p className="text-white text-sm capitalize">{selectedTask.channel}</p></div><div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Cliente</label><p className="text-white text-sm">{getClientName(selectedTask.clientId)}</p></div></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-2">Link de Aprovação Externa</label><div className="flex gap-2"><input type="text" readOnly value={getApprovalLink(selectedTask)} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-400 text-sm" /><button onClick={() => copyApprovalLink(selectedTask)} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500"><Icons.Copy size={18} /></button></div><p className="text-xs text-gray-600 mt-1">Envie este link para o cliente aprovar ou pedir ajustes</p></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-2">Status Aprovação</label><span className={clsx('text-xs px-3 py-1 rounded-full font-bold', selectedTask.approvalStatus === 'approved' ? 'bg-green-500/20 text-green-400' : selectedTask.approvalStatus === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400')}>{selectedTask.approvalStatus === 'approved' ? '✅ Aprovado' : selectedTask.approvalStatus === 'rejected' ? '❌ Ajustes Solicitados' : '⏳ Pendente'}</span></div>
            </div>
            <div className="p-5 border-t border-gray-800 flex gap-3"><button onClick={() => { deleteTask(selectedTask.id); setSelectedTask(null); }} className="py-2.5 px-4 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30">Excluir</button><button onClick={() => setSelectedTask(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700">Fechar</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
