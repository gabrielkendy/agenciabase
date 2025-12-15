import { useState, useMemo } from 'react';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../store';
import * as Icons from '../components/Icons';
import type { Task, TaskStatus, ContentType, SocialChannel, TaskPriority } from '../types';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'gray' },
  { id: 'todo', label: 'A Fazer', color: 'blue' },
  { id: 'in_progress', label: 'Em Produção', color: 'yellow' },
  { id: 'review', label: 'Revisão Interna', color: 'purple' },
  { id: 'approved', label: 'Aprovado', color: 'green' },
  { id: 'published', label: 'Publicado', color: 'emerald' }
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-gray-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
};

const CHANNEL_ICONS: Record<SocialChannel, React.ReactNode> = {
  instagram: <Icons.Instagram size={14} />,
  facebook: <Icons.Facebook size={14} />,
  tiktok: <Icons.Video size={14} />,
  youtube: <Icons.Youtube size={14} />,
  linkedin: <Icons.Linkedin size={14} />,
  twitter: <Icons.Twitter size={14} />
};

interface TaskCardProps {
  task: Task;
  client?: { name: string; color: string };
  onClick: () => void;
  isDragging?: boolean;
}

function TaskCard({ task, client, onClick, isDragging }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-gray-800/80 backdrop-blur border border-gray-700/50 rounded-xl p-4 cursor-pointer hover:border-orange-500/50 transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority]}`} />
          <span className="text-xs text-gray-400 capitalize">{task.content_type}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          {CHANNEL_ICONS[task.channel]}
        </div>
      </div>
      <h4 className="text-sm font-medium text-white mb-2 line-clamp-2">{task.title}</h4>
      {client && (
        <div className="flex items-center gap-2 mt-3">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: client.color }}>
            {client.name.charAt(0)}
          </div>
          <span className="text-xs text-gray-400">{client.name}</span>
        </div>
      )}
      {task.scheduled_date && (
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
          <Icons.Calendar size={12} />
          {new Date(task.scheduled_date).toLocaleDateString('pt-BR')}
        </div>
      )}
    </div>
  );
}

interface KanbanColumnProps {
  column: typeof COLUMNS[0];
  tasks: Task[];
  clients: Record<string, { name: string; color: string }>;
  onTaskClick: (task: Task) => void;
  activeId: string | null;
}

function KanbanColumn({ column, tasks, clients, onTaskClick, activeId }: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full bg-${column.color}-500`} />
          <h3 className="font-semibold text-white text-sm">{column.label}</h3>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{tasks.length}</span>
        </div>
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-[200px] p-2 rounded-xl bg-gray-900/30 border border-gray-800/50">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              client={clients[task.client_id]}
              onClick={() => onTaskClick(task)}
              isDragging={activeId === task.id}
            />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-8 text-gray-600 text-sm">
              <Icons.Inbox size={24} className="mx-auto mb-2 opacity-50" />
              Nenhuma tarefa
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function WorkflowPage() {
  const { tasks, updateTask, addTask, deleteTask, clients } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'backlog',
    priority: 'medium',
    content_type: 'post',
    channel: 'instagram',
    client_id: ''
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const clientsMap = useMemo(() => {
    const map: Record<string, { name: string; color: string }> = {};
    clients.forEach(c => { map[c.id] = { name: c.name, color: c.color }; });
    return map;
  }, [clients]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = { backlog: [], todo: [], in_progress: [], review: [], approved: [], published: [] };
    tasks.forEach(t => { if (grouped[t.status]) grouped[t.status].push(t); });
    return grouped;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const targetColumn = COLUMNS.find(c => c.id === overId);
    if (targetColumn) {
      updateTask(taskId, { status: targetColumn.id });
      toast.success(`Movido para ${targetColumn.label}`);
      return;
    }

    const overTask = tasks.find(t => t.id === overId);
    if (overTask && overTask.status !== task.status) {
      updateTask(taskId, { status: overTask.status });
      toast.success(`Movido para ${COLUMNS.find(c => c.id === overTask.status)?.label}`);
    }
  };

  const handleCreate = () => {
    if (!newTask.title || !newTask.client_id) {
      toast.error('Preencha título e cliente');
      return;
    }
    const task: Task = {
      id: uuidv4(),
      user_id: '',
      client_id: newTask.client_id!,
      title: newTask.title!,
      description: newTask.description || '',
      status: newTask.status as TaskStatus || 'backlog',
      priority: newTask.priority as TaskPriority || 'medium',
      content_type: newTask.content_type as ContentType || 'post',
      channel: newTask.channel as SocialChannel || 'instagram',
      media_urls: [],
      created_by_ai: false,
      created_at: new Date().toISOString()
    };
    addTask(task);
    toast.success('Tarefa criada!');
    setIsCreating(false);
    setNewTask({ title: '', description: '', status: 'backlog', priority: 'medium', content_type: 'post', channel: 'instagram', client_id: '' });
  };

  const handleDelete = (id: string) => {
    deleteTask(id);
    setSelectedTask(null);
    setShowModal(false);
    toast.success('Tarefa excluída');
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <div className="h-full flex flex-col bg-gray-950">
      <header className="flex-shrink-0 p-6 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl flex items-center justify-center">
                <Icons.Layout size={20} />
              </div>
              Workflow
            </h1>
            <p className="text-gray-400 mt-1">Gerencie demandas no Kanban</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            <Icons.Plus size={18} />
            Nova Tarefa
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto p-6">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full">
            {COLUMNS.map(column => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={tasksByStatus[column.id]}
                clients={clientsMap}
                onTaskClick={(task) => { setSelectedTask(task); setShowModal(true); }}
                activeId={activeId}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask && (
              <div className="bg-gray-800 border border-orange-500 rounded-xl p-4 shadow-xl">
                <h4 className="text-sm font-medium text-white">{activeTask.title}</h4>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modal Criar Tarefa */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Nova Tarefa</h2>
              <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-white"><Icons.X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Título *</label>
                <input value={newTask.title || ''} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none" placeholder="Ex: Post sobre lançamento" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Cliente *</label>
                <select value={newTask.client_id || ''} onChange={e => setNewTask({ ...newTask, client_id: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none">
                  <option value="">Selecione...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Tipo</label>
                  <select value={newTask.content_type || 'post'} onChange={e => setNewTask({ ...newTask, content_type: e.target.value as ContentType })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none">
                    <option value="post">Post</option>
                    <option value="carrossel">Carrossel</option>
                    <option value="reels">Reels</option>
                    <option value="stories">Stories</option>
                    <option value="video">Vídeo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Canal</label>
                  <select value={newTask.channel || 'instagram'} onChange={e => setNewTask({ ...newTask, channel: e.target.value as SocialChannel })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none">
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Prioridade</label>
                <select value={newTask.priority || 'medium'} onChange={e => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none">
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Descrição</label>
                <textarea value={newTask.description || ''} onChange={e => setNewTask({ ...newTask, description: e.target.value })} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none resize-none" placeholder="Detalhes da demanda..." />
              </div>
            </div>
            <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
              <button onClick={() => setIsCreating(false)} className="px-4 py-2.5 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700">Cancelar</button>
              <button onClick={handleCreate} className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-xl hover:opacity-90">Criar Tarefa</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualizar Tarefa */}
      {showModal && selectedTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${PRIORITY_COLORS[selectedTask.priority]}`} />
                <h2 className="text-xl font-bold text-white">{selectedTask.title}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><Icons.X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <span className="text-xs text-gray-500 block mb-1">Cliente</span>
                  <span className="text-white font-medium">{clientsMap[selectedTask.client_id]?.name || 'N/A'}</span>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <span className="text-xs text-gray-500 block mb-1">Status</span>
                  <span className="text-white font-medium capitalize">{COLUMNS.find(c => c.id === selectedTask.status)?.label}</span>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <span className="text-xs text-gray-500 block mb-1">Tipo</span>
                  <span className="text-white font-medium capitalize">{selectedTask.content_type}</span>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <span className="text-xs text-gray-500 block mb-1">Canal</span>
                  <div className="flex items-center gap-2 text-white">{CHANNEL_ICONS[selectedTask.channel]} <span className="capitalize">{selectedTask.channel}</span></div>
                </div>
              </div>
              {selectedTask.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Descrição</h3>
                  <p className="text-gray-300 bg-gray-800/50 rounded-xl p-4">{selectedTask.description}</p>
                </div>
              )}
              {selectedTask.caption && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Legenda</h3>
                  <p className="text-gray-300 bg-gray-800/50 rounded-xl p-4 whitespace-pre-wrap">{selectedTask.caption}</p>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Mover para</h3>
                <div className="flex flex-wrap gap-2">
                  {COLUMNS.map(col => (
                    <button
                      key={col.id}
                      onClick={() => { updateTask(selectedTask.id, { status: col.id }); setSelectedTask({ ...selectedTask, status: col.id }); toast.success(`Movido para ${col.label}`); }}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedTask.status === col.id ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-800 flex justify-between">
              <button onClick={() => handleDelete(selectedTask.id)} className="px-4 py-2.5 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 flex items-center gap-2">
                <Icons.Trash2 size={16} />
                Excluir
              </button>
              <button onClick={() => setShowModal(false)} className="px-6 py-2.5 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
