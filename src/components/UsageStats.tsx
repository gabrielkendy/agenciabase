import { useState, useEffect } from 'react';
import {
  BarChart3,
  Image,
  Video,
  Mic,
  TrendingUp,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { enterpriseApi } from '../lib/enterpriseApi';

interface UsageStatsProps {
  detailed?: boolean;
  className?: string;
}

interface UsageData {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  creditsUsed: number;
  byType: Record<string, number>;
  byProvider: Record<string, number>;
}

export function UsageStats({ detailed = false, className = '' }: UsageStatsProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month');

  const fetchUsage = async () => {
    setLoading(true);
    setError(null);

    const response = await enterpriseApi.analytics.getSummary();

    if (response.success && response.data) {
      setUsage({
        totalJobs: response.data.totalJobs || 0,
        completedJobs: response.data.completedJobs || 0,
        failedJobs: response.data.failedJobs || 0,
        creditsUsed: response.data.creditsUsed || 0,
        byType: response.data.byType || {},
        byProvider: response.data.byProvider || {},
      });
    } else {
      setError(response.error || 'Failed to load usage');
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchUsage();
  }, [period]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Mic className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  if (loading && !usage) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 rounded-lg p-4 ${className}`}>
        <div className="text-red-600 dark:text-red-400 flex items-center gap-2">
          <XCircle className="h-5 w-5" />
          <span>{error}</span>
          <button onClick={fetchUsage} className="ml-auto hover:text-red-500">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!usage) return null;

  const successRate = usage.totalJobs > 0
    ? ((usage.completedJobs / usage.totalJobs) * 100).toFixed(1)
    : '0';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Uso e Estatísticas
        </h3>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['today', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                period === p
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <BarChart3 className="h-4 w-4" />
            Total de Jobs
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {usage.totalJobs.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Taxa de Sucesso
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {successRate}%
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <TrendingUp className="h-4 w-4" />
            Créditos Usados
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {usage.creditsUsed.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <XCircle className="h-4 w-4 text-red-500" />
            Falhas
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {usage.failedJobs.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      {detailed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* By Type */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Por Tipo
            </h4>
            <div className="space-y-2">
              {Object.entries(usage.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    {getTypeIcon(type)}
                    <span className="capitalize">{type}</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {count.toLocaleString()}
                  </span>
                </div>
              ))}
              {Object.keys(usage.byType).length === 0 && (
                <div className="text-gray-400 text-sm">Nenhum dado</div>
              )}
            </div>
          </div>

          {/* By Provider */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Por Provedor
            </h4>
            <div className="space-y-2">
              {Object.entries(usage.byProvider).map(([provider, count]) => (
                <div key={provider} className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400 capitalize">
                    {provider}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {count.toLocaleString()}
                  </span>
                </div>
              ))}
              {Object.keys(usage.byProvider).length === 0 && (
                <div className="text-gray-400 text-sm">Nenhum dado</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsageStats;
