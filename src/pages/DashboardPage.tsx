import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const DashboardPage: React.FC = () => {
  const { clients, tasks, agents } = useStore();
  const activeClients = clients.filter(c => c.status === 'active').length;
  const totalRevenue = clients.reduce((sum, c) => sum + (c.monthly_value || 0), 0);
  const pendingTasks = tasks.filter(t => !['approved', 'published'].includes(t.status)).length;
  const aiCreatedTasks = tasks.filter(t => t.created_by_ai).length;

  const tasksByStatus = [
    { name: 'Backlog', value: tasks.filter(t => t.status === 'backlog').length, color: '#6b7280' },
    { name: 'A Fazer', value: tasks.filter(t => t.status === 'todo').length, color: '#3b82f6' },
    { name: 'Em Produção', value: tasks.filter(t => t.status === 'in_progress').length, color: '#eab308' },
    { name: 'Revisão', value: tasks.filter(t => t.status === 'review').length, color: '#8b5cf6' },
    { name: 'Aprovado', value: tasks.filter(t => t.status === 'approved').length, color: '#22c55e' },
    { name: 'Publicado', value: tasks.filter(t => t.status === 'published').length, color: '#10b981' },
  ];

  const tasksByChannel = [
    { name: 'Instagram', value: tasks.filter(t => t.channel === 'instagram').length },
    { name: 'Facebook', value: tasks.filter(t => t.channel === 'facebook').length },
    { name: 'TikTok', value: tasks.filter(t => t.channel === 'tiktok').length },
    { name: 'YouTube', value: tasks.filter(t => t.channel === 'youtube').length },
    { name: 'LinkedIn', value: tasks.filter(t => t.channel === 'linkedin').length },
  ];

  const recentTasks = [...tasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return (
    <div className="h-full bg-gray-950 overflow-y-auto">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Icons.Dashboard size={28} className="text-orange-400" />Dashboard</h1>
          <p className="text-gray-500">Visão geral da sua agência</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <div className="flex items-center justify-between mb-3"><Icons.Clients size={24} className="text-blue-400" /><span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Ativos</span></div>
            <p className="text-3xl font-bold text-white">{activeClients}</p>
            <p className="text-sm text-gray-500">Clientes ativos</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <div className="flex items-center justify-between mb-3"><Icons.Target size={24} className="text-green-400" /></div>
            <p className="text-3xl font-bold text-green-400">R$ {(totalRevenue / 1000).toFixed(1)}k</p>
            <p className="text-sm text-gray-500">Receita mensal</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <div className="flex items-center justify-between mb-3"><Icons.Kanban size={24} className="text-yellow-400" /><span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">Pendentes</span></div>
            <p className="text-3xl font-bold text-white">{pendingTasks}</p>
            <p className="text-sm text-gray-500">Tarefas em andamento</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <div className="flex items-center justify-between mb-3"><Icons.Sparkles size={24} className="text-purple-400" /><span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">IA</span></div>
            <p className="text-3xl font-bold text-white">{aiCreatedTasks}</p>
            <p className="text-sm text-gray-500">Criados pela IA</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h3 className="text-lg font-bold text-white mb-4">Tarefas por Status</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart><Pie data={tasksByStatus.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{tasksByStatus.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h3 className="text-lg font-bold text-white mb-4">Tarefas por Canal</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tasksByChannel}><XAxis dataKey="name" stroke="#6b7280" fontSize={12} /><YAxis stroke="#6b7280" fontSize={12} /><Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} /><Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h3 className="text-lg font-bold text-white mb-4">Tarefas Recentes</h3>
            <div className="space-y-3">
              {recentTasks.length === 0 ? (<p className="text-gray-500 text-center py-4">Nenhuma tarefa criada</p>) : (
                recentTasks.map(task => {
                  const client = clients.find(c => c.id === task.client_id);
                  return (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                      {client && (<div className="w-2 h-8 rounded-full" style={{ backgroundColor: client.color }} />)}
                      <div className="flex-1 min-w-0"><p className="text-sm text-white truncate">{task.title}</p><p className="text-xs text-gray-500">{client?.name || 'Sem cliente'} • {task.channel}</p></div>
                      {task.created_by_ai && (<Icons.Sparkles size={14} className="text-purple-400" />)}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h3 className="text-lg font-bold text-white mb-4">Agentes IA</h3>
            <div className="space-y-3">
              {agents.map(agent => (
                <div key={agent.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                  <img src={agent.avatar} className="w-10 h-10 rounded-lg" />
                  <div className="flex-1"><p className="text-sm font-medium text-white">{agent.name}</p><p className="text-xs text-gray-500">{agent.role}</p></div>
                  <div className="flex items-center gap-2">{agent.trained_knowledge && (<Icons.Brain size={14} className="text-purple-400" />)}<span className={`w-2 h-2 rounded-full ${agent.is_active ? 'bg-green-400' : 'bg-gray-600'}`} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
