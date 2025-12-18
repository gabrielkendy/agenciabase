import { useState, useEffect } from 'react';
import { Coins, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { enterpriseApi } from '../lib/enterpriseApi';

interface CreditBalanceProps {
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

interface CreditsData {
  balance: number;
  usage: {
    today: number;
    thisMonth: number;
  };
}

export function CreditBalance({ showDetails = false, compact = false, className = '' }: CreditBalanceProps) {
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = async () => {
    setLoading(true);
    setError(null);

    const response = await enterpriseApi.credits.getBalance();

    if (response.success && response.data) {
      setCredits(response.data);
    } else {
      setError(response.error || 'Failed to load credits');
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCredits();

    // Refresh every 30 seconds
    const interval = setInterval(fetchCredits, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !credits) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        <span>{error}</span>
        <button onClick={fetchCredits} className="ml-2 hover:text-red-400">
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (!credits) return null;

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <Coins className="h-4 w-4 text-yellow-500" />
        <span className="font-medium">{credits.balance.toLocaleString()}</span>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Saldo de Créditos
        </h3>
        <button
          onClick={fetchCredits}
          disabled={loading}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Coins className="h-6 w-6 text-yellow-500" />
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {credits.balance.toLocaleString()}
        </span>
      </div>

      {showDetails && (
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <TrendingDown className="h-3 w-3" />
              Hoje
            </div>
            <div className="font-medium text-gray-900 dark:text-white">
              -{credits.usage.today.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <TrendingUp className="h-3 w-3" />
              Este Mês
            </div>
            <div className="font-medium text-gray-900 dark:text-white">
              -{credits.usage.thisMonth.toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreditBalance;
