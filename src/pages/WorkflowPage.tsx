import React, { useState, useRef } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { Task, TaskStatus } from '../types';

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'backlog', title: 'Backlog', color: 'bg-gray-600' },
  { id: 'todo', title: 'A Fazer', color: 'bg-blue-600' },
  { id: 'in-progress', title: 'Em Andamento', color: 'bg-yellow-600' },
  { id: 'review', title: 'Revisão', color: 'bg-purple-600' },
  { id: 'approved', title: 'Aprovado', color: 'bg-green-600' },
];

export const WorkflowPage: React.FC = () => {
  const { tasks, addTask, updateTask, deleteTask, agents, clients, addNotification } = useStore();
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', channel: 'instagram', clientName: '' });
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: TaskStatus) => {
    if (draggedTask) {
      updateTask(draggedTask.id, { status });
      addNotification({
        id: Date.now().toString(),
        title: 'Tarefa Movida',
        message: `${draggedTask.title} → ${COLUMNS.find(c => c.id === status)?.title}`,
        type: 'info',
        read: false,
        timestamp: new Date()
      });
      setDraggedTask(null);
    }
  };

  const handleCreateTask = () => {
    if (!newTask.title) return;
    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      status: 'backlog',
      priority: newTask.priority as 'low' | 'medium' | 'high',
      channel: newTask.channel,
      clientName: newTask.clientName,
      createdAt: new Date(),
    };
    addTask(task);
    addNotification({
      id: Date.now().toString(),
      title: 'Nova Demanda! 📋',
      message: newTask.title,
      type: 'success',
      read: false,
      timestamp: new Date()
    });
    setNewTask({ title: '', description: '', priority: 'medium', channel: 'instagram', clientName: '' });
    setShowNewTask(false);
  };

  const getApprovalLink = (task: Task) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/approval/${task.id}`;
  };

  const copyApprovalLink = (task: Task) => {
    navigator.clipboard.writeText(getApprovalLink(task));
    addNotification({
      id: Date.now().toString(),
      title: 'Link Copiado! 📋',
      message: 'Link de aprovação copiado',
      type: 'success',
      read: false,
      timestamp: new Date()
    });
  };

  return (
    <div className="h-full bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Icons.Kanban size={24} className="text-orange-400" />
            Workflow de Demandas
          </h1>
          <p className="text-xs text-gray-500">{tasks.length} demandas no total</p>
        </div>
        <button onClick={() => setShowNewTask(true)} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium">
          <Icons.Plus size={18} /> Nova Demanda
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 min-w-max h-full">
          {COLUMNS.map(column => {
            const columnTasks = tasks.filter(t => t.status === column.id);
            return (
              <div key={column.id} className="w-80 flex flex-col bg-gray-900/50 rounded-xl border border-gray-800" onDragOver={handleDragOver} onDrop={() => handleDrop(column.id)}>
                <div className="p-4 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                    <h3 className="font-bold text-white">{column.title}</h3>
                    <span className="ml-auto text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">{columnTasks.length}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {columnTasks.map(task => (
                    <div key={task.id} draggable onDragStart={() => handleDragStart(task)} onClick={() => setSelectedTask(task)} className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-750 border border-gray-700 hover:border-orange-500/50 transition-all group">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-white text-sm line-clamp-2">{task.title}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${task.priority === 'high' ? 'bg-red-500/20 text-red-400' : task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                          {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                        </span>
                      </div>
                      {task.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{task.description}</p>}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {task.channel && <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">{task.channel}</span>}
                          {task.clientName && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">{task.clientName}</span>}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400">
                          <Icons.Delete size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Task Modal */}
      {showNewTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Nova Demanda</h2>
              <button onClick={() => setShowNewTask(false)} className="text-gray-500 hover:text-white">
                <Icons.Close size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Título</label>
                <input type="text" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none" placeholder="Ex: Carrossel sobre benefícios" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Descrição</label>
                <textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none resize-none" placeholder="Detalhes da demanda..." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Prioridade</label>
                  <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none">
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Canal</label>
                  <select value={newTask.channel} onChange={(e) => setNewTask({ ...newTask, channel: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none">
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Cliente</label>
                  <input type="text" value={newTask.clientName} onChange={(e) => setNewTask({ ...newTask, clientName: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none" placeholder="Nome" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button onClick={() => setShowNewTask(false)} className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700">Cancelar</button>
              <button onClick={handleCreateTask} className="flex-1 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-500 font-bold">Criar Demanda</button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{selectedTask.title}</h2>
              <button onClick={() => setSelectedTask(null)} className="text-gray-500 hover:text-white">
                <Icons.Close size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Descrição</label>
                <p className="text-gray-300 text-sm">{selectedTask.description || 'Sem descrição'}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Status</label>
                  <p className="text-white">{COLUMNS.find(c => c.id === selectedTask.status)?.title}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Canal</label>
                  <p className="text-white">{selectedTask.channel || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Cliente</label>
                  <p className="text-white">{selectedTask.clientName || '-'}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Link de Aprovação</label>
                <div className="flex gap-2">
                  <input type="text" readOnly value={getApprovalLink(selectedTask)} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-400 text-sm" />
                  <button onClick={() => copyApprovalLink(selectedTask)} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500">
                    <Icons.Copy size={18} />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button onClick={() => { deleteTask(selectedTask.id); setSelectedTask(null); }} className="py-3 px-6 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30">Excluir</button>
              <button onClick={() => setSelectedTask(null)} className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
