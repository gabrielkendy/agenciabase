import React from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#8b5cf6'];

export const DashboardPage: React.FC = () => {
  const { getMetrics, tasks, contracts } = useStore();
  const metrics = getMetrics();
  
  const tasksByStatus = [
    { name: 'Backlog', value: tasks.filter(t => t.status === 'backlog').length },
    { name: 'A Fazer', value: tasks.filter(t => t.status === 'todo').length },
    { name: 'Andamento', value: tasks.filter(t => t.status === 'in_progress').length },
    { name: 'Revisão', value: tasks.filter(t => t.status === 'review').length },
    { name: 'Aprovado', value: tasks.filter(t => t.status === 'approved').length },
  ];
  
  const revenueByMonth = [
    { month: 'Jan', value: 12000 },
    { month: 'Fev', value: 15000 },
    { month: 'Mar', value: 13500 },
    { month: 'Abr', value: 18000 },
    { month: 'Mai', value: 16500 },
    { month: 'Jun', value: 21000 },
  ];
  
  const MetricCard: React.FC<{ title: string; value: string | number; subtitle?: string; icon: React.ElementType; color: string; trend?: { value: number; up: boolean } }> = ({ title, value, subtitle, icon: Icon, color, trend }) => (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}><Icon size={22} className="text-white" /></div>
        {trend && (<div className={`flex items-center gap-1 text-xs font-bold ${trend.up ? 'text-green-400' : 'text-red-400'}`}>{trend.up ? <Icons.ArrowUp size={14} /> : <Icons.ArrowDown size={14} />}{trend.value}%</div>)}
      </div>
      <p className="text-gray-500 text-sm mb-1">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
    </div>
  );
  
  return (
    <div className="h-full overflow-y-auto bg-gray-950 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Icons.Dashboard size={28} className="text-orange-400" />Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral da sua agência</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Clientes Ativos" value={metrics.totalClients} icon={Icons.Client} color="bg-blue-500" trend={{ value: 12, up: true }} />
        <MetricCard title="Contratos Ativos" value={metrics.activeContracts} icon={Icons.Contract} color="bg-green-500" subtitle={`${contracts.length} total`} />
        <MetricCard title="Receita Mensal" value={`R$ ${metrics.monthlyRevenue.toLocaleString('pt-BR')}`} icon={Icons.Money} color="bg-orange-500" trend={{ value: 8, up: true }} />
        <MetricCard title="Tarefas Pendentes" value={metrics.pendingTasks} icon={Icons.Kanban} color="bg-purple-500" subtitle={`${metrics.completedTasks} concluídas`} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-4"><Icons.TrendingUp size={18} className="text-green-400" /><h3 className="font-bold text-white">A Receber</h3></div>
          <p className="text-3xl font-bold text-green-400">R$ {metrics.pendingPayments.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-gray-500 mt-1">Pagamentos pendentes</p>
        </div>
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-4"><Icons.Alert size={18} className="text-red-400" /><h3 className="font-bold text-white">Em Atraso</h3></div>
          <p className="text-3xl font-bold text-red-400">R$ {metrics.overduePayments.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-gray-500 mt-1">Pagamentos vencidos</p>
        </div>
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-4"><Icons.Image size={18} className="text-blue-400" /><h3 className="font-bold text-white">Conteúdos</h3></div>
          <p className="text-3xl font-bold text-blue-400">{metrics.contentPublished}</p>
          <p className="text-xs text-gray-500 mt-1">Publicados este mês</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Icons.PieChart size={18} className="text-orange-400" />Tarefas por Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={tasksByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}>
                {tasksByStatus.map((_, index) => (<Cell key={index} fill={COLORS[index % COLORS.length]} />))}</Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} /></PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Icons.BarChart size={18} className="text-green-400" />Receita Mensal</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByMonth}><XAxis dataKey="month" stroke="#6b7280" /><YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']} />
                <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="mt-6 bg-gray-900 rounded-2xl border border-gray-800 p-5">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Icons.Clock size={18} className="text-blue-400" />Atividade Recente</h3>
        <div className="space-y-3">
          {tasks.slice(0, 5).map(task => (
            <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${task.status === 'approved' ? 'bg-green-400' : task.status === 'review' ? 'bg-purple-400' : task.status === 'in_progress' ? 'bg-yellow-400' : 'bg-gray-400'}`} />
              <div className="flex-1 min-w-0"><p className="text-sm text-white truncate">{task.title}</p><p className="text-xs text-gray-500">{task.channel} • {task.priority}</p></div>
              <span className={`text-xs px-2 py-1 rounded-full ${task.status === 'approved' ? 'bg-green-500/20 text-green-400' : task.status === 'review' ? 'bg-purple-500/20 text-purple-400' : task.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>{task.status.replace('_', ' ')}</span>
            </div>
          ))}
          {tasks.length === 0 && (<p className="text-gray-500 text-sm text-center py-8">Nenhuma tarefa ainda. Use o Chat IA para criar demandas!</p>)}
        </div>
      </div>
    </div>
  );
};
