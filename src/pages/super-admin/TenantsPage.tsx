import { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import { supabase } from '../../lib/supabase';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  subscription_status: string;
  trial_ends_at: string | null;
  created_at: string;
  plan?: { name: string; slug: string };
  _count?: { users: number; clients: number; demands: number };
}

export const TenantsPage = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    if (!supabase) {
      // Mock data
      setTenants([
        { id: '1', name: 'Agência Digital Pro', slug: 'agencia-digital-pro', logo_url: null, subscription_status: 'active', trial_ends_at: null, created_at: new Date().toISOString(), plan: { name: 'Pro', slug: 'pro' }, _count: { users: 8, clients: 24, demands: 156 } },
        { id: '2', name: 'Marketing Solutions', slug: 'marketing-solutions', logo_url: null, subscription_status: 'active', trial_ends_at: null, created_at: new Date().toISOString(), plan: { name: 'Starter', slug: 'starter' }, _count: { users: 3, clients: 10, demands: 45 } },
        { id: '3', name: 'Creative Studio', slug: 'creative-studio', logo_url: null, subscription_status: 'trial', trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString(), created_at: new Date().toISOString(), plan: { name: 'Free', slug: 'free' }, _count: { users: 1, clients: 2, demands: 5 } },
        { id: '4', name: 'Social Media Hub', slug: 'social-media-hub', logo_url: null, subscription_status: 'active', trial_ends_at: null, created_at: new Date().toISOString(), plan: { name: 'Starter', slug: 'starter' }, _count: { users: 4, clients: 15, demands: 89 } },
        { id: '5', name: 'Brand Agency', slug: 'brand-agency', logo_url: null, subscription_status: 'active', trial_ends_at: null, created_at: new Date().toISOString(), plan: { name: 'Enterprise', slug: 'enterprise' }, _count: { users: 15, clients: 50, demands: 320 } },
      ]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*, plans(*)')
        .order('created_at', { ascending: false }) as { data: any[] | null; error: any };

      if (error) throw error;

      // Mapear dados
      const mappedTenants = data?.map((t: any) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        logo_url: t.logo_url,
        subscription_status: t.subscription_status,
        trial_ends_at: t.trial_ends_at,
        created_at: t.created_at,
        plan: t.plans as any,
        _count: { users: 0, clients: 0, demands: 0 }
      })) || [];

      setTenants(mappedTenants);
    } catch (error) {
      console.error('Erro ao carregar tenants:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || t.subscription_status === filterStatus;
    const matchesPlan = filterPlan === 'all' || t.plan?.slug === filterPlan;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'trial': return 'bg-yellow-500/20 text-yellow-400';
      case 'past_due': return 'bg-red-500/20 text-red-400';
      case 'cancelled': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'trial': return 'Trial';
      case 'past_due': return 'Inadimplente';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getPlanColor = (slug?: string) => {
    switch (slug) {
      case 'enterprise': return 'bg-yellow-500/20 text-yellow-400';
      case 'pro': return 'bg-purple-500/20 text-purple-400';
      case 'starter': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Icons.Loader size={32} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Icons.Building size={28} className="text-orange-400" />
              Clientes / Tenants
            </h1>
            <p className="text-gray-400 mt-1">{tenants.length} clientes cadastrados</p>
          </div>
          <button
            onClick={() => toast.success('Em breve: Modal para criar novo tenant')}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition flex items-center gap-2"
          >
            <Icons.Plus size={18} />
            Novo Cliente
          </button>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Icons.Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:border-orange-500 focus:outline-none"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="trial">Em Trial</option>
              <option value="past_due">Inadimplentes</option>
              <option value="cancelled">Cancelados</option>
            </select>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="all">Todos os Planos</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Plano</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Usuários</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Clientes</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Demandas</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Cadastro</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-800/30 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold">
                          {tenant.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{tenant.name}</p>
                          <p className="text-xs text-gray-500">{tenant.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx('px-2 py-1 rounded-lg text-xs font-medium', getPlanColor(tenant.plan?.slug))}>
                        {tenant.plan?.name || 'Free'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(tenant.subscription_status))}>
                        {getStatusLabel(tenant.subscription_status)}
                      </span>
                      {tenant.subscription_status === 'trial' && tenant.trial_ends_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Expira em {Math.ceil((new Date(tenant.trial_ends_at).getTime() - Date.now()) / 86400000)} dias
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-300">{tenant._count?.users || 0}</td>
                    <td className="px-6 py-4 text-gray-300">{tenant._count?.clients || 0}</td>
                    <td className="px-6 py-4 text-gray-300">{tenant._count?.demands || 0}</td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {new Date(tenant.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedTenant(tenant)}
                          className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition"
                          title="Ver detalhes"
                        >
                          <Icons.Eye size={16} />
                        </button>
                        <button
                          className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition"
                          title="Editar"
                        >
                          <Icons.Edit size={16} />
                        </button>
                        <button
                          className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-400 transition"
                          title="Excluir"
                        >
                          <Icons.Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTenants.length === 0 && (
            <div className="text-center py-12">
              <Icons.Building size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">Nenhum cliente encontrado</p>
            </div>
          )}
        </div>

        {/* Tenant Details Sidebar */}
        {selectedTenant && (
          <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedTenant(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              className="relative w-full max-w-lg bg-gray-900 h-full shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900/95 backdrop-blur z-10">
                <h3 className="font-bold text-lg text-white">Detalhes do Cliente</h3>
                <button
                  onClick={() => setSelectedTenant(null)}
                  className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition"
                >
                  <Icons.X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                    {selectedTenant.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">{selectedTenant.name}</h4>
                    <p className="text-gray-400">{selectedTenant.slug}</p>
                  </div>
                </div>

                {/* Status & Plan */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <span className={clsx('px-2 py-1 rounded-full text-sm font-medium', getStatusColor(selectedTenant.subscription_status))}>
                      {getStatusLabel(selectedTenant.subscription_status)}
                    </span>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Plano</p>
                    <span className={clsx('px-2 py-1 rounded-lg text-sm font-medium', getPlanColor(selectedTenant.plan?.slug))}>
                      {selectedTenant.plan?.name || 'Free'}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">{selectedTenant._count?.users || 0}</p>
                    <p className="text-xs text-gray-500">Usuários</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">{selectedTenant._count?.clients || 0}</p>
                    <p className="text-xs text-gray-500">Clientes</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">{selectedTenant._count?.demands || 0}</p>
                    <p className="text-xs text-gray-500">Demandas</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button className="w-full py-3 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-xl transition flex items-center justify-center gap-2">
                    <Icons.ArrowUp size={16} />
                    Upgrade de Plano
                  </button>
                  <button className="w-full py-3 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl transition flex items-center justify-center gap-2">
                    <Icons.Mail size={16} />
                    Enviar Email
                  </button>
                  <button className="w-full py-3 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-xl transition flex items-center justify-center gap-2">
                    <Icons.ExternalLink size={16} />
                    Acessar como Admin
                  </button>
                </div>

                {/* Info */}
                <div className="pt-4 border-t border-gray-800">
                  <h5 className="text-sm font-medium text-gray-400 mb-3">Informações</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cadastro</span>
                      <span className="text-gray-300">{new Date(selectedTenant.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {selectedTenant.trial_ends_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Trial expira em</span>
                        <span className="text-yellow-400">{new Date(selectedTenant.trial_ends_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
