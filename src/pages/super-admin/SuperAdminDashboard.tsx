import { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import { supabase } from '../../lib/supabase';
import clsx from 'clsx';

interface DashboardStats {
  totalTenants: number;
  totalUsers: number;
  activeTenants: number;
  trialTenants: number;
  mrr: number;
  newTenantsThisMonth: number;
  churnRate: number;
  tenantsByPlan: { plan: string; count: number; color: string }[];
}

export const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalTenants: 0,
    totalUsers: 0,
    activeTenants: 0,
    trialTenants: 0,
    mrr: 0,
    newTenantsThisMonth: 0,
    churnRate: 0,
    tenantsByPlan: []
  });
  const [loading, setLoading] = useState(true);
  const [recentTenants, setRecentTenants] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    if (!supabase) {
      // Dados mock para demo
      setStats({
        totalTenants: 47,
        totalUsers: 156,
        activeTenants: 38,
        trialTenants: 9,
        mrr: 4573,
        newTenantsThisMonth: 12,
        churnRate: 2.3,
        tenantsByPlan: [
          { plan: 'Free', count: 15, color: '#6b7280' },
          { plan: 'Starter', count: 18, color: '#f97316' },
          { plan: 'Pro', count: 11, color: '#8b5cf6' },
          { plan: 'Enterprise', count: 3, color: '#eab308' },
        ]
      });
      setRecentTenants([
        { id: '1', name: 'Agência Digital Pro', plan: 'Pro', users: 8, status: 'active', created_at: new Date().toISOString() },
        { id: '2', name: 'Marketing Solutions', plan: 'Starter', users: 3, status: 'active', created_at: new Date(Date.now() - 86400000).toISOString() },
        { id: '3', name: 'Creative Studio', plan: 'Free', users: 1, status: 'trial', created_at: new Date(Date.now() - 172800000).toISOString() },
        { id: '4', name: 'Social Media Hub', plan: 'Starter', users: 4, status: 'active', created_at: new Date(Date.now() - 259200000).toISOString() },
        { id: '5', name: 'Brand Agency', plan: 'Enterprise', users: 15, status: 'active', created_at: new Date(Date.now() - 345600000).toISOString() },
      ]);
      setLoading(false);
      return;
    }

    try {
      // Carregar dados reais do Supabase
      const { data: tenants } = await supabase.from('tenants').select('*, plans(*)') as { data: any[] | null };
      const { data: profiles } = await supabase.from('profiles').select('id') as { data: any[] | null };

      // Calcular estatísticas
      const total = tenants?.length || 0;
      const active = tenants?.filter((t: any) => t.subscription_status === 'active').length || 0;
      const trial = tenants?.filter((t: any) => t.subscription_status === 'trial').length || 0;

      // MRR (simplificado)
      const mrr = tenants?.reduce((acc: number, t: any) => {
        return acc + (t.plans?.price_monthly || 0);
      }, 0) || 0;

      // Tenants por plano
      const planCounts: Record<string, number> = {};
      tenants?.forEach((t: any) => {
        const planName = t.plans?.name || 'Free';
        planCounts[planName] = (planCounts[planName] || 0) + 1;
      });

      const colors: Record<string, string> = {
        'Free': '#6b7280',
        'Starter': '#f97316',
        'Pro': '#8b5cf6',
        'Enterprise': '#eab308'
      };

      setStats({
        totalTenants: total,
        totalUsers: profiles?.length || 0,
        activeTenants: active,
        trialTenants: trial,
        mrr,
        newTenantsThisMonth: 0, // TODO: calcular
        churnRate: 0, // TODO: calcular
        tenantsByPlan: Object.entries(planCounts).map(([plan, count]) => ({
          plan,
          count,
          color: colors[plan] || '#6b7280'
        }))
      });

      setRecentTenants(tenants?.slice(0, 5) || []);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Icons.Loader size={32} className="animate-spin text-orange-500" />
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color, subtitle, change }: any) => (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition">
      <div className="flex items-start justify-between mb-4">
        <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
          <Icon size={24} className="text-white" />
        </div>
        {change && (
          <span className={clsx(
            'text-xs font-medium px-2 py-1 rounded-full',
            change > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          )}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-gray-400">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">🚀</span> Dashboard da Plataforma
            </h1>
            <p className="text-gray-400 mt-1">Visão geral do seu SaaS</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition flex items-center gap-2">
              <Icons.Download size={16} />
              Exportar
            </button>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition flex items-center gap-2"
            >
              <Icons.RefreshCw size={16} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total de Clientes"
            value={stats.totalTenants}
            icon={Icons.Building}
            color="bg-blue-500"
            change={8}
          />
          <StatCard
            title="Usuários Ativos"
            value={stats.totalUsers}
            icon={Icons.Users}
            color="bg-purple-500"
            change={12}
          />
          <StatCard
            title="MRR"
            value={`R$ ${stats.mrr.toLocaleString('pt-BR')}`}
            icon={Icons.DollarSign}
            color="bg-green-500"
            change={15}
          />
          <StatCard
            title="Em Trial"
            value={stats.trialTenants}
            icon={Icons.Clock}
            color="bg-yellow-500"
            subtitle={`${stats.activeTenants} ativos`}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* MRR Chart (placeholder) */}
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Icons.TrendingUp size={20} className="text-green-400" />
              Receita Mensal (MRR)
            </h3>
            <div className="h-64 flex items-center justify-center bg-gray-800/50 rounded-xl">
              <div className="text-center">
                <p className="text-4xl font-bold text-green-400 mb-2">R$ {stats.mrr.toLocaleString('pt-BR')}</p>
                <p className="text-gray-400">+15% vs mês anterior</p>
                <div className="flex items-center justify-center gap-4 mt-4">
                  {[
                    { month: 'Out', value: 3200 },
                    { month: 'Nov', value: 3850 },
                    { month: 'Dez', value: stats.mrr },
                  ].map((item, idx) => (
                    <div key={idx} className="text-center">
                      <div
                        className="w-16 bg-gradient-to-t from-green-600 to-green-400 rounded-t-lg mx-auto"
                        style={{ height: `${(item.value / stats.mrr) * 100}px` }}
                      />
                      <p className="text-xs text-gray-500 mt-2">{item.month}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Plan Distribution */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Icons.PieChart size={20} className="text-purple-400" />
              Distribuição por Plano
            </h3>
            <div className="space-y-4">
              {stats.tenantsByPlan.map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-400">{item.plan}</span>
                    <span className="text-sm font-medium text-white">{item.count}</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(item.count / stats.totalTenants) * 100}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total</span>
                <span className="text-xl font-bold text-white">{stats.totalTenants} clientes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tenants */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Icons.Users size={20} className="text-orange-400" />
              Clientes Recentes
            </h3>
            <a href="/super-admin/tenants" className="text-sm text-orange-400 hover:text-orange-300">
              Ver todos →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Plano</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Usuários</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cadastro</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {recentTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-800/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold">
                          {tenant.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{tenant.name}</p>
                          <p className="text-xs text-gray-500">{tenant.slug || tenant.id?.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        'px-2 py-1 rounded-lg text-xs font-medium',
                        tenant.plan === 'Enterprise' ? 'bg-yellow-500/20 text-yellow-400' :
                        tenant.plan === 'Pro' ? 'bg-purple-500/20 text-purple-400' :
                        tenant.plan === 'Starter' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-gray-500/20 text-gray-400'
                      )}>
                        {tenant.plan || tenant.plans?.name || 'Free'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{tenant.users || 1}</td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        tenant.status === 'active' || tenant.subscription_status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      )}>
                        {tenant.status === 'active' || tenant.subscription_status === 'active' ? 'Ativo' : 'Trial'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {new Date(tenant.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition">
                        <Icons.MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <a href="/super-admin/tenants" className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-orange-500/50 transition group">
            <Icons.Building size={24} className="text-orange-400 mb-3" />
            <h4 className="font-medium text-white group-hover:text-orange-400 transition">Gerenciar Clientes</h4>
            <p className="text-sm text-gray-500">Ver todos os tenants</p>
          </a>
          <a href="/super-admin/plans" className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-purple-500/50 transition group">
            <Icons.Tag size={24} className="text-purple-400 mb-3" />
            <h4 className="font-medium text-white group-hover:text-purple-400 transition">Planos</h4>
            <p className="text-sm text-gray-500">Configurar preços</p>
          </a>
          <a href="/super-admin/integrations" className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-blue-500/50 transition group">
            <Icons.Zap size={24} className="text-blue-400 mb-3" />
            <h4 className="font-medium text-white group-hover:text-blue-400 transition">Integrações</h4>
            <p className="text-sm text-gray-500">APIs globais</p>
          </a>
          <a href="/super-admin/settings" className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-green-500/50 transition group">
            <Icons.Settings size={24} className="text-green-400 mb-3" />
            <h4 className="font-medium text-white group-hover:text-green-400 transition">Configurações</h4>
            <p className="text-sm text-gray-500">Ajustes da plataforma</p>
          </a>
        </div>
      </div>
    </div>
  );
};
