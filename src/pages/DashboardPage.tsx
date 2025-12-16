import { useStore } from '../store';
import { Icons } from '../components/Icons';
import { WORKFLOW_COLUMNS, SOCIAL_CHANNELS } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const DashboardPage = () => {
  const { clients, demands, agents } = useStore();

  // Stats (sem dados financeiros para todos verem)
  const totalDemands = demands.length;
  const completedDemands = demands.filter((d) => d.status === 'concluido').length;
  const pendingApproval = demands.filter((d) => d.status === 'aprovacao_cliente').length;
  const inProgress = demands.filter((d) => ['conteudo', 'design', 'aprovacao_interna'].includes(d.status)).length;
  const activeClients = clients.filter((c) => c.status === 'active').length;

  // Chart data - demands by status
  const statusData = WORKFLOW_COLUMNS.map((col) => ({
    name: col.label.split(' ')[0],
    value: demands.filter((d) => d.status === col.id).length,
    color: col.id === 'concluido' ? '#22c55e' : col.id.includes('aprovacao') ? '#f59e0b' : '#3b82f6',
  }));

  // Channel distribution
  const channelData = SOCIAL_CHANNELS.slice(0, 6).map((ch) => ({
    name: ch.label,
    value: demands.filter((d) => d.channels.includes(ch.id)).length,
  }));
  const COLORS = ['#E4405F', '#1877F2', '#000000', '#FF0000', '#0A66C2', '#1DA1F2'];

  // Recent demands
  const recentDemands = [...demands].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  const getClient = (id: string) => clients.find((c) => c.id === id);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-500 text-sm">Visão geral da sua agência</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/chat" className="px-3 md:px-4 py-2 bg-orange-500 hover:bg-orange-400 rounded-xl text-sm text-white transition flex items-center gap-2">
              <Icons.MessageSquare size={16} /> Chat IA
            </a>
          </div>
        </div>

        {/* Stats Cards - SEM FINANCEIRO */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl md:rounded-2xl p-3 md:p-5">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="p-1.5 md:p-2 bg-blue-500/20 rounded-lg md:rounded-xl">
                <Icons.Users className="text-blue-400" size={20} />
              </div>
              <span className="text-xs text-blue-400 hidden md:inline">Ativos</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">{activeClients}</p>
            <p className="text-xs md:text-sm text-gray-500 mt-1">de {clients.length} clientes</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500/20 to-yellow-600/10 border border-orange-500/30 rounded-xl md:rounded-2xl p-3 md:p-5">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="p-1.5 md:p-2 bg-orange-500/20 rounded-lg md:rounded-xl">
                <Icons.Kanban className="text-orange-400" size={20} />
              </div>
              <span className="text-xs text-orange-400 hidden md:inline">Total</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">{totalDemands}</p>
            <p className="text-xs md:text-sm text-gray-500 mt-1">{inProgress} em andamento</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500/20 to-amber-600/10 border border-yellow-500/30 rounded-xl md:rounded-2xl p-3 md:p-5">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="p-1.5 md:p-2 bg-yellow-500/20 rounded-lg md:rounded-xl">
                <Icons.Clock className="text-yellow-400" size={20} />
              </div>
              <span className="text-xs text-yellow-400 hidden md:inline">Pendentes</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">{pendingApproval}</p>
            <p className="text-xs md:text-sm text-gray-500 mt-1">aprovação cliente</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/10 border border-green-500/30 rounded-xl md:rounded-2xl p-3 md:p-5">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="p-1.5 md:p-2 bg-green-500/20 rounded-lg md:rounded-xl">
                <Icons.Check className="text-green-400" size={20} />
              </div>
              <span className="text-xs text-green-400 hidden md:inline">Concluídas</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">{completedDemands}</p>
            <p className="text-xs md:text-sm text-gray-500 mt-1">entregas realizadas</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Demands by Status */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl md:rounded-2xl p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-white mb-4">Demandas por Status</h3>
            <div className="h-48 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Channel Distribution */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl md:rounded-2xl p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-white mb-4">Distribuição por Canal</h3>
            <div className="h-48 md:h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channelData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" label={({ name, value }) => value > 0 ? name : ''} labelLine={false}>
                    {channelData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Recent Demands */}
          <div className="lg:col-span-2 bg-gray-800/50 border border-gray-700/50 rounded-xl md:rounded-2xl p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-white">Demandas Recentes</h3>
              <a href="/workflow" className="text-sm text-orange-400 hover:text-orange-300">Ver todas →</a>
            </div>
            <div className="space-y-2 md:space-y-3">
              {recentDemands.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Nenhuma demanda criada ainda</div>
              ) : (
                recentDemands.map((demand) => {
                  const client = getClient(demand.client_id);
                  const status = WORKFLOW_COLUMNS.find((c) => c.id === demand.status);
                  return (
                    <div key={demand.id} className="flex items-center gap-3 md:gap-4 p-2 md:p-3 bg-gray-900/50 rounded-xl hover:bg-gray-900 transition">
                      {client && (
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: client.color }}>
                          {client.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{demand.title}</p>
                        <p className="text-xs text-gray-500">{client?.name} • {demand.content_type}</p>
                      </div>
                      <span className="px-2 md:px-3 py-1 rounded-full text-xs whitespace-nowrap" style={{ 
                        backgroundColor: status?.color === 'green' ? '#22c55e20' : status?.color === 'orange' ? '#f59e0b20' : '#3b82f620', 
                        color: status?.color === 'green' ? '#22c55e' : status?.color === 'orange' ? '#f59e0b' : '#3b82f6' 
                      }}>
                        {status?.icon}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* AI Agents */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl md:rounded-2xl p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-white">Agentes IA</h3>
              <a href="/agents" className="text-sm text-orange-400 hover:text-orange-300">Gerenciar →</a>
            </div>
            <div className="space-y-2 md:space-y-3">
              {agents.filter((a) => a.is_active).slice(0, 4).map((agent) => (
                <div key={agent.id} className="flex items-center gap-3 p-2 md:p-3 bg-gray-900/50 rounded-xl">
                  <span className="text-xl md:text-2xl">{agent.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{agent.name}</p>
                    <p className="text-xs text-gray-500 truncate">{agent.role}</p>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              ))}
            </div>
            <a href="/chat" className="mt-4 w-full py-2.5 md:py-3 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-xl text-orange-400 text-sm font-medium flex items-center justify-center gap-2 transition">
              <Icons.MessageSquare size={16} /> Iniciar conversa
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
