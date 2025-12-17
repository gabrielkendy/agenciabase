import { useState, useEffect, useMemo } from 'react';
import { Icons } from '../../components/Icons';
import { tokenTracker } from '../../lib/tokenTracker';
import clsx from 'clsx';

type TimeRange = 'today' | 'week' | 'month' | 'all';
type ViewMode = 'overview' | 'providers' | 'users' | 'performance' | 'history';

const PROVIDER_INFO: Record<string, { name: string; color: string; icon: React.ReactNode }> = {
  gemini: { name: 'Google Gemini', color: 'bg-blue-500', icon: <Icons.Sparkles size={18} /> },
  openrouter: { name: 'OpenRouter', color: 'bg-purple-500', icon: <Icons.Globe size={18} /> },
  openai: { name: 'OpenAI', color: 'bg-green-500', icon: <Icons.Bot size={18} /> },
  freepik: { name: 'Freepik', color: 'bg-cyan-500', icon: <Icons.Image size={18} /> },
  elevenlabs: { name: 'ElevenLabs', color: 'bg-yellow-500', icon: <Icons.Mic size={18} /> },
  falai: { name: 'FAL.ai', color: 'bg-orange-500', icon: <Icons.Video size={18} /> },
};

export const UsageAnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  // Dados
  const summary = useMemo(() => tokenTracker.getSummary(), [refreshKey]);
  const history = useMemo(() => tokenTracker.getDailyHistory(30), [refreshKey]);
  const topUsers = useMemo(() => tokenTracker.getTopUsers(10), [refreshKey]);
  const performance = useMemo(() => tokenTracker.getPerformanceMetrics(), [refreshKey]);
  const allEntries = useMemo(() => tokenTracker.getAll(), [refreshKey]);

  // Dados baseados no periodo selecionado
  const currentData = useMemo(() => {
    switch (timeRange) {
      case 'today': return summary.today;
      case 'week': return summary.thisWeek;
      case 'month': return summary.thisMonth;
      case 'all': return summary.allTime;
    }
  }, [summary, timeRange]);

  // Refresh automatico
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const formatTime = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.round(ms)}ms`;
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-950">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <Icons.BarChart size={24} className="text-purple-400" />
              </div>
              Analytics de Consumo
            </h1>
            <p className="text-gray-500 mt-1">
              Monitore o uso de tokens, custos e performance das APIs
            </p>
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition"
          >
            <Icons.RefreshCw size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'today', label: 'Hoje' },
            { id: 'week', label: 'Semana' },
            { id: 'month', label: 'Mes' },
            { id: 'all', label: 'Total' },
          ].map(range => (
            <button
              key={range.id}
              onClick={() => setTimeRange(range.id as TimeRange)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition',
                timeRange === range.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Icons.Zap size={18} className="text-blue-400" />
              </div>
              <span className="text-gray-400 text-sm">Total Tokens</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatNumber(currentData.totalTokens)}</p>
            <p className="text-xs text-gray-500 mt-1">{currentData.requestCount} requisicoes</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Icons.DollarSign size={18} className="text-green-400" />
              </div>
              <span className="text-gray-400 text-sm">Custo Total</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(currentData.totalCost)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {currentData.requestCount > 0
                ? formatCurrency(currentData.totalCost / currentData.requestCount) + '/req'
                : '-'}
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Icons.Clock size={18} className="text-yellow-400" />
              </div>
              <span className="text-gray-400 text-sm">Tempo Medio</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatTime(currentData.avgResponseTime)}</p>
            <p className="text-xs text-gray-500 mt-1">por requisicao</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Icons.CheckCircle size={18} className="text-purple-400" />
              </div>
              <span className="text-gray-400 text-sm">Taxa de Sucesso</span>
            </div>
            <p className="text-2xl font-bold text-white">{performance.successRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">das requisicoes</p>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Visao Geral', icon: <Icons.Grid size={18} /> },
            { id: 'providers', label: 'Por Provider', icon: <Icons.Layers size={18} /> },
            { id: 'users', label: 'Por Usuario', icon: <Icons.Users size={18} /> },
            { id: 'performance', label: 'Performance', icon: <Icons.TrendingUp size={18} /> },
            { id: 'history', label: 'Historico', icon: <Icons.Clock size={18} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as ViewMode)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition',
                viewMode === tab.id
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content based on view mode */}
        {viewMode === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* By Provider */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Icons.Layers size={20} className="text-purple-400" />
                Consumo por Provider
              </h3>
              <div className="space-y-3">
                {Object.entries(currentData.byProvider)
                  .sort((a, b) => b[1].cost - a[1].cost)
                  .map(([provider, data]) => {
                    const info = PROVIDER_INFO[provider] || { name: provider, color: 'bg-gray-500', icon: null };
                    const percentage = currentData.totalCost > 0
                      ? (data.cost / currentData.totalCost) * 100
                      : 0;
                    return (
                      <div key={provider} className="flex items-center gap-3">
                        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center text-white', info.color)}>
                          {info.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-medium">{info.name}</span>
                            <span className="text-gray-400 text-sm">{formatCurrency(data.cost)}</span>
                          </div>
                          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={clsx('h-full rounded-full', info.color)}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {Object.keys(currentData.byProvider).length === 0 && (
                  <p className="text-gray-500 text-center py-4">Nenhum dado disponivel</p>
                )}
              </div>
            </div>

            {/* Top Users */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Icons.Users size={20} className="text-blue-400" />
                Top Usuarios
              </h3>
              <div className="space-y-3">
                {Object.entries(currentData.byUser)
                  .sort((a, b) => b[1].cost - a[1].cost)
                  .slice(0, 5)
                  .map(([userId, data], index) => (
                    <div key={userId} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{data.userName || userId.slice(0, 8)}</p>
                        <p className="text-gray-500 text-sm">{data.requests} requisicoes</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">{formatCurrency(data.cost)}</p>
                        <p className="text-gray-500 text-sm">{formatNumber(data.tokens)} tokens</p>
                      </div>
                    </div>
                  ))}
                {Object.keys(currentData.byUser).length === 0 && (
                  <p className="text-gray-500 text-center py-4">Nenhum dado disponivel</p>
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'providers' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(PROVIDER_INFO).map(([providerId, info]) => {
              const data = currentData.byProvider[providerId] || { tokens: 0, cost: 0, requests: 0 };
              const perfData = performance.byProvider[providerId] || { avgTime: 0, successRate: 100 };
              return (
                <div key={providerId} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center text-white', info.color)}>
                      {info.icon}
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{info.name}</h4>
                      <p className="text-gray-500 text-sm">{data.requests} requisicoes</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Tokens</p>
                      <p className="text-white font-semibold">{formatNumber(data.tokens)}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Custo</p>
                      <p className="text-white font-semibold">{formatCurrency(data.cost)}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Tempo Medio</p>
                      <p className="text-white font-semibold">{formatTime(perfData.avgTime)}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Sucesso</p>
                      <p className={clsx('font-semibold', perfData.successRate >= 95 ? 'text-green-400' : perfData.successRate >= 80 ? 'text-yellow-400' : 'text-red-400')}>
                        {perfData.successRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'users' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">#</th>
                  <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Usuario</th>
                  <th className="text-right text-gray-400 text-sm font-medium px-6 py-4">Requisicoes</th>
                  <th className="text-right text-gray-400 text-sm font-medium px-6 py-4">Tokens</th>
                  <th className="text-right text-gray-400 text-sm font-medium px-6 py-4">Custo</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((user, index) => (
                  <tr key={user.userId} className="border-t border-gray-800 hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <span className={clsx(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        'bg-gray-700 text-gray-400'
                      )}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{user.userName || 'Usuario'}</p>
                      <p className="text-gray-500 text-xs">{user.userId.slice(0, 12)}...</p>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-300">{user.requests}</td>
                    <td className="px-6 py-4 text-right text-gray-300">{formatNumber(user.tokens)}</td>
                    <td className="px-6 py-4 text-right text-white font-medium">{formatCurrency(user.cost)}</td>
                  </tr>
                ))}
                {topUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Nenhum dado disponivel
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'performance' && (
          <div className="space-y-6">
            {/* Performance Overview */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Icons.Zap size={18} className="text-green-400" />
                  </div>
                  <span className="text-gray-400 text-sm">Mais Rapido</span>
                </div>
                <p className="text-xl font-bold text-white">
                  {PROVIDER_INFO[performance.fastestProvider]?.name || performance.fastestProvider || '-'}
                </p>
                <p className="text-sm text-gray-500">
                  {performance.byProvider[performance.fastestProvider]
                    ? formatTime(performance.byProvider[performance.fastestProvider].avgTime)
                    : '-'}
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <Icons.Clock size={18} className="text-red-400" />
                  </div>
                  <span className="text-gray-400 text-sm">Mais Lento</span>
                </div>
                <p className="text-xl font-bold text-white">
                  {PROVIDER_INFO[performance.slowestProvider]?.name || performance.slowestProvider || '-'}
                </p>
                <p className="text-sm text-gray-500">
                  {performance.byProvider[performance.slowestProvider]
                    ? formatTime(performance.byProvider[performance.slowestProvider].avgTime)
                    : '-'}
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Icons.Activity size={18} className="text-blue-400" />
                  </div>
                  <span className="text-gray-400 text-sm">Tempo Medio Global</span>
                </div>
                <p className="text-xl font-bold text-white">{formatTime(performance.avgResponseTime)}</p>
                <p className="text-sm text-gray-500">todas as APIs</p>
              </div>
            </div>

            {/* Performance by Provider */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Performance por Provider</h3>
              <div className="space-y-4">
                {Object.entries(performance.byProvider)
                  .sort((a, b) => a[1].avgTime - b[1].avgTime)
                  .map(([provider, data]) => {
                    const info = PROVIDER_INFO[provider] || { name: provider, color: 'bg-gray-500' };
                    const maxTime = Math.max(...Object.values(performance.byProvider).map(d => d.avgTime), 1);
                    const width = (data.avgTime / maxTime) * 100;
                    return (
                      <div key={provider}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">{info.name}</span>
                          <div className="flex items-center gap-4">
                            <span className={clsx(
                              'text-sm',
                              data.successRate >= 95 ? 'text-green-400' :
                              data.successRate >= 80 ? 'text-yellow-400' : 'text-red-400'
                            )}>
                              {data.successRate.toFixed(1)}% sucesso
                            </span>
                            <span className="text-gray-400">{formatTime(data.avgTime)}</span>
                          </div>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={clsx('h-full rounded-full', info.color)}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'history' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Historico dos Ultimos 30 Dias</h3>

            {/* Simple Bar Chart */}
            <div className="h-64 flex items-end gap-1">
              {history.map((day, index) => {
                const maxCost = Math.max(...history.map(d => d.cost), 0.01);
                const height = (day.cost / maxCost) * 100;
                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-sm hover:from-purple-500 hover:to-purple-300 transition cursor-pointer group relative"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                        <p className="text-white font-medium">{formatCurrency(day.cost)}</p>
                        <p className="text-gray-400">{day.requests} req</p>
                        <p className="text-gray-500">{day.date.slice(5)}</p>
                      </div>
                    </div>
                    {index % 5 === 0 && (
                      <span className="text-[10px] text-gray-600">{day.date.slice(5)}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Daily Stats Table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500">
                    <th className="text-left py-2">Data</th>
                    <th className="text-right py-2">Requisicoes</th>
                    <th className="text-right py-2">Tokens</th>
                    <th className="text-right py-2">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().slice(0, 10).map(day => (
                    <tr key={day.date} className="border-t border-gray-800">
                      <td className="py-2 text-gray-300">{day.date}</td>
                      <td className="py-2 text-right text-gray-400">{day.requests}</td>
                      <td className="py-2 text-right text-gray-400">{formatNumber(day.tokens)}</td>
                      <td className="py-2 text-right text-white">{formatCurrency(day.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="mt-8 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Icons.Activity size={20} className="text-green-400" />
            Atividade Recente
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {allEntries.slice(-20).reverse().map(entry => {
              const info = PROVIDER_INFO[entry.provider] || { name: entry.provider, color: 'bg-gray-500', icon: null };
              return (
                <div key={entry.id} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs', info.color)}>
                    {info.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">
                      {entry.userName || entry.userId.slice(0, 8)} - {entry.action}
                    </p>
                    <p className="text-gray-500 text-xs">{info.name} {entry.model ? `(${entry.model})` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className={clsx('text-sm', entry.success ? 'text-green-400' : 'text-red-400')}>
                      {entry.success ? formatTime(entry.responseTimeMs) : 'Erro'}
                    </p>
                    <p className="text-gray-500 text-xs">{formatCurrency(entry.cost)}</p>
                  </div>
                </div>
              );
            })}
            {allEntries.length === 0 && (
              <p className="text-gray-500 text-center py-8">Nenhuma atividade registrada</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
