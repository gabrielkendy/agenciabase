import React, { useState, useRef } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { Task, TaskStatus, SocialChannel } from '../types';

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'backlog', title: 'Pauta / Ideias', color: 'border-gray-600' },
  { id: 'todo', title: 'Em Produção', color: 'border-blue-500' },
  { id: 'review', title: 'Aprovação Interna', color: 'border-yellow-500' },
  { id: 'scheduled', title: 'Aguardando Cliente', color: 'border-orange-500' },
  { id: 'done', title: 'Aprovado', color: 'border-green-500' },
];

const CHANNEL_ICONS: Record<SocialChannel, React.ReactNode> = {
  instagram: <Icons.Instagram size={14} />,
  linkedin: <Icons.Linkedin size={14} />,
  youtube: <Icons.Youtube size={14} />,
  facebook: <Icons.Facebook size={14} />,
  tiktok: <Icons.Video size={14} />,
  blog: <Icons.FileText size={14} />,
};

export const WorkflowPage: React.FC = () => {
  const { tasks, updateTask, addTask, deleteTask, agents, clients, addNotification } = useStore();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailTab, setDetailTab] = useState<'internal' | 'client'>('internal');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    caption: '',
    channel: 'instagram' as SocialChannel,
    priority: 'medium' as 'low' | 'medium' | 'high',
    clientId: '',
    assignedAgentId: '',
  });

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggedTaskId) {
      updateTask(draggedTaskId, { status });
      addNotification({
        id: Date.now().toString(),
        title: 'Status Atualizado',
        message: `Demanda movida para ${COLUMNS.find(c => c.id === status)?.title}`,
        type: 'info',
        read: false,
        timestamp: new Date()
      });
    }
    setDraggedTaskId(null);
  };

  const handleCreateTask = () => {
    if (!newTask.title) return;
    const client = clients.find(c => c.id === newTask.clientId);
    
    addTask({
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      caption: newTask.caption,
      status: 'backlog',
      priority: newTask.priority,
      channel: newTask.channel,
      assignedAgentId: newTask.assignedAgentId,
      clientId: newTask.clientId,
      clientName: client?.name || 'Cliente',
      clientEmail: client?.email,
      createdAt: new Date(),
      mediaUrls: [],
    });

    addNotification({
      id: Date.now().toString(),
      title: 'Demanda Criada',
      message: `"${newTask.title}" adicionada ao backlog`,
      type: 'success',
      read: false,
      timestamp: new Date()
    });

    setNewTask({ title: '', description: '', caption: '', channel: 'instagram', priority: 'medium', clientId: '', assignedAgentId: '' });
    setShowCreateModal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedTask) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const currentUrls = selectedTask.mediaUrls || [];
          updateTask(selectedTask.id, { mediaUrls: [...currentUrls, event.target.result as string] });
          setSelectedTask(prev => prev ? { ...prev, mediaUrls: [...currentUrls, event.target!.result as string] } : null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const generateApprovalLink = () => {
    if (!selectedTask) return;
    const token = Math.random().toString(36).substring(2, 15);
    updateTask(selectedTask.id, { externalLinkToken: token, status: 'scheduled' });
    
    addNotification({
      id: Date.now().toString(),
      title: 'Link de Aprovação Gerado',
      message: `Email de aprovação enviado para ${selectedTask.clientEmail}`,
      type: 'success',
      read: false,
      timestamp: new Date()
    });
    
    alert(`Link de aprovação: ${window.location.origin}/approve/${token}\n\n(Em produção, isso seria enviado por email)`);
  };

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Icons.Board size={24} className="text-orange-400" />
            Workflow
          </h1>
          <p className="text-xs text-gray-500">Gerencie demandas e aprovações</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl font-medium transition-colors"
        >
          <Icons.Plus size={18} />
          Nova Demanda
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full min-w-max">
          {COLUMNS.map(column => {
            const columnTasks = tasks.filter(t => t.status === column.id);
            
            return (
              <div
                key={column.id}
                className="w-80 flex flex-col bg-gray-900/50 rounded-xl border border-gray-800"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column Header */}
                <div className={`p-4 border-b-2 ${column.color} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{column.title}</span>
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                {/* Tasks */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {columnTasks.map(task => {
                    const agent = agents.find(a => a.id === task.assignedAgentId);
                    
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => { setSelectedTask(task); setDetailTab('internal'); }}
                        className={`p-4 bg-gray-800 rounded-xl border border-gray-700 cursor-pointer hover:border-orange-500/50 transition-all ${
                          draggedTaskId === task.id ? 'opacity-50 scale-95' : ''
                        }`}
                      >
                        {/* Media Preview */}
                        {task.mediaUrls && task.mediaUrls[0] && (
                          <div className="aspect-video bg-gray-900 rounded-lg mb-3 overflow-hidden">
                            <img src={task.mediaUrls[0]} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}

                        {/* Title */}
                        <h3 className="font-medium text-white mb-2 line-clamp-2">{task.title}</h3>

                        {/* Meta */}
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          {task.channel && (
                            <span className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded">
                              {CHANNEL_ICONS[task.channel]}
                              {task.channel}
                            </span>
                          )}
                          {task.clientName && (
                            <span className="bg-gray-700 px-2 py-1 rounded">{task.clientName}</span>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                          {agent && (
                            <div className="flex items-center gap-2">
                              <img src={agent.avatar} className="w-6 h-6 rounded-full" alt={agent.name} />
                              <span className="text-xs text-gray-400">{agent.name}</span>
                            </div>
                          )}
                          <span className={`text-[10px] px-2 py-1 rounded font-bold ${
                            task.priority === 'high' ? 'bg-red-900/30 text-red-400' :
                            task.priority === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                            'bg-green-900/30 text-green-400'
                          }`}>
                            {task.priority.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-800">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white">Nova Demanda</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white">
                <Icons.Close size={20} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <input
                type="text"
                placeholder="Título da demanda"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
              />
              
              <textarea
                placeholder="Briefing / Descrição"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none resize-none"
              />

              <div className="grid grid-cols-2 gap-4">
                <select
                  value={newTask.channel}
                  onChange={(e) => setNewTask({ ...newTask, channel: e.target.value as SocialChannel })}
                  className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="facebook">Facebook</option>
                </select>

                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                  className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>

              <select
                value={newTask.clientId}
                onChange={(e) => setNewTask({ ...newTask, clientId: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
              >
                <option value="">Selecione o cliente</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={newTask.assignedAgentId}
                onChange={(e) => setNewTask({ ...newTask, assignedAgentId: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
              >
                <option value="">Atribuir a um agente</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                ))}
              </select>
            </div>

            <div className="p-4 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-xl font-medium hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!newTask.title}
                className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Criar Demanda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-4xl h-[90vh] border border-gray-800 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex gap-2">
                <button
                  onClick={() => setDetailTab('internal')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    detailTab === 'internal' ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30' : 'text-gray-500 hover:bg-gray-800'
                  }`}
                >
                  <Icons.Eye size={16} /> Visão Interna
                </button>
                <button
                  onClick={() => setDetailTab('client')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    detailTab === 'client' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-500 hover:bg-gray-800'
                  }`}
                >
                  <Icons.External size={16} /> Visão do Cliente
                </button>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-gray-500 hover:text-white">
                <Icons.Close size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {detailTab === 'internal' ? (
                <div className="flex gap-8">
                  {/* Media */}
                  <div className="w-1/3 space-y-4">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-[9/16] bg-gray-800 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center cursor-pointer hover:border-orange-500 transition-colors overflow-hidden group"
                    >
                      {selectedTask.mediaUrls && selectedTask.mediaUrls[0] ? (
                        <div className="relative w-full h-full">
                          <img src={selectedTask.mediaUrls[0]} className="w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Icons.Upload size={24} className="text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500">
                          <Icons.Upload size={32} className="mx-auto mb-2" />
                          <p className="text-sm">Adicionar Mídia</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 space-y-6">
                    <div>
                      <h1 className="text-2xl font-bold text-white mb-2">{selectedTask.title}</h1>
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Icons.Users size={14} /> {selectedTask.clientName}
                        </span>
                        <span className="capitalize">{selectedTask.channel}</span>
                      </div>
                    </div>

                    <div className="bg-gray-800 p-4 rounded-xl">
                      <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Briefing</h3>
                      <p className="text-sm text-gray-300">{selectedTask.description}</p>
                    </div>

                    <div className="bg-gray-800 p-4 rounded-xl">
                      <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Legenda / Copy</h3>
                      <textarea
                        value={selectedTask.caption || ''}
                        onChange={(e) => {
                          updateTask(selectedTask.id, { caption: e.target.value });
                          setSelectedTask(prev => prev ? { ...prev, caption: e.target.value } : null);
                        }}
                        placeholder="Digite a legenda aqui..."
                        rows={4}
                        className="w-full bg-transparent text-white focus:outline-none resize-none"
                      />
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1 bg-gray-800 p-4 rounded-xl">
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Status</h3>
                        <span className="px-3 py-1 bg-blue-900/30 text-blue-400 rounded-full text-xs font-bold">
                          {COLUMNS.find(c => c.id === selectedTask.status)?.title}
                        </span>
                      </div>
                      <div className="flex-1 bg-gray-800 p-4 rounded-xl">
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Responsável</h3>
                        <div className="flex items-center gap-2">
                          {agents.find(a => a.id === selectedTask.assignedAgentId) && (
                            <>
                              <img src={agents.find(a => a.id === selectedTask.assignedAgentId)?.avatar} className="w-6 h-6 rounded-full" alt="" />
                              <span className="text-sm text-white">{agents.find(a => a.id === selectedTask.assignedAgentId)?.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={generateApprovalLink}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                      <Icons.Send size={18} /> Enviar para Aprovação Externa
                    </button>
                  </div>
                </div>
              ) : (
                /* Client Preview */
                <div className="flex items-center justify-center h-full">
                  <div className="bg-white text-gray-900 w-full max-w-3xl rounded-xl overflow-hidden flex shadow-2xl">
                    <div className="w-1/2 bg-gray-100 flex items-center justify-center p-4">
                      {selectedTask.mediaUrls?.[0] ? (
                        <img src={selectedTask.mediaUrls[0]} className="max-h-[400px] rounded shadow-lg" alt="" />
                      ) : (
                        <div className="text-gray-400">Mídia não carregada</div>
                      )}
                    </div>
                    <div className="w-1/2 p-8 flex flex-col">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 bg-orange-500 rounded-full" />
                          <div>
                            <h3 className="font-bold text-sm">BASE Agency</h3>
                            <p className="text-xs text-gray-500">Solicitação de Aprovação</p>
                          </div>
                        </div>
                        <h2 className="text-xl font-bold mb-4">{selectedTask.title}</h2>
                        <div className="bg-gray-50 p-4 rounded border text-sm text-gray-600 max-h-40 overflow-y-auto mb-4">
                          {selectedTask.caption || selectedTask.description}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                        <button className="py-3 bg-red-50 text-red-600 font-bold rounded hover:bg-red-100">
                          Solicitar Ajuste
                        </button>
                        <button className="py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700">
                          Aprovar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
