import { useState } from 'react';
import { Icons } from '../../components/Icons';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  is_active: boolean;
  is_popular?: boolean;
}

const DEFAULT_PLANS: Plan[] = [
  {
    id: '1',
    name: 'Free',
    slug: 'free',
    description: 'Para começar a explorar',
    price_monthly: 0,
    price_yearly: 0,
    features: {
      workflow: true,
      calendar: true,
      chat_ia: true,
      creator_studio: false,
      approval_links: false,
      whatsapp: false,
      analytics: false,
    },
    limits: {
      users: 1,
      clients: 3,
      demands_per_month: 10,
      ai_messages_per_month: 50,
      storage_mb: 100,
      agents: 1,
    },
    is_active: true,
  },
  {
    id: '2',
    name: 'Starter',
    slug: 'starter',
    description: 'Ideal para pequenas agências',
    price_monthly: 97,
    price_yearly: 970,
    features: {
      workflow: true,
      calendar: true,
      chat_ia: true,
      creator_studio: true,
      approval_links: true,
      whatsapp: false,
      analytics: true,
    },
    limits: {
      users: 3,
      clients: 10,
      demands_per_month: 100,
      ai_messages_per_month: 500,
      storage_mb: 1000,
      agents: 3,
    },
    is_active: true,
  },
  {
    id: '3',
    name: 'Pro',
    slug: 'pro',
    description: 'Para agências em crescimento',
    price_monthly: 197,
    price_yearly: 1970,
    features: {
      workflow: true,
      calendar: true,
      chat_ia: true,
      creator_studio: true,
      approval_links: true,
      whatsapp: true,
      analytics: true,
    },
    limits: {
      users: 10,
      clients: 50,
      demands_per_month: -1,
      ai_messages_per_month: 2000,
      storage_mb: 10000,
      agents: 10,
    },
    is_active: true,
    is_popular: true,
  },
  {
    id: '4',
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'Para grandes operações',
    price_monthly: 497,
    price_yearly: 4970,
    features: {
      workflow: true,
      calendar: true,
      chat_ia: true,
      creator_studio: true,
      approval_links: true,
      whatsapp: true,
      analytics: true,
      white_label: true,
      api_access: true,
      dedicated_support: true,
    },
    limits: {
      users: -1,
      clients: -1,
      demands_per_month: -1,
      ai_messages_per_month: -1,
      storage_mb: -1,
      agents: -1,
    },
    is_active: true,
  },
];

const FEATURE_LABELS: Record<string, string> = {
  workflow: 'Kanban / Workflow',
  calendar: 'Calendário',
  chat_ia: 'Chat com IA',
  creator_studio: 'Creator Studio',
  approval_links: 'Links de Aprovação',
  whatsapp: 'Integração WhatsApp',
  analytics: 'Analytics',
  white_label: 'White Label',
  api_access: 'Acesso à API',
  dedicated_support: 'Suporte Dedicado',
};

const LIMIT_LABELS: Record<string, string> = {
  users: 'Usuários',
  clients: 'Clientes',
  demands_per_month: 'Demandas/mês',
  ai_messages_per_month: 'Mensagens IA/mês',
  storage_mb: 'Armazenamento',
  agents: 'Agentes IA',
};

export const PlansPage = () => {
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const formatLimit = (key: string, value: number) => {
    if (value === -1) return 'Ilimitado';
    if (key === 'storage_mb') return `${value >= 1000 ? `${value / 1000} GB` : `${value} MB`}`;
    return value.toString();
  };

  const getPlanColor = (slug: string) => {
    switch (slug) {
      case 'enterprise': return 'from-yellow-500 to-orange-500';
      case 'pro': return 'from-purple-500 to-pink-500';
      case 'starter': return 'from-orange-500 to-red-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setShowModal(true);
  };

  const handleSavePlan = () => {
    if (!editingPlan) return;

    setPlans(prev => prev.map(p => p.id === editingPlan.id ? editingPlan : p));
    toast.success('Plano atualizado!');
    setShowModal(false);
    setEditingPlan(null);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Icons.Tag size={28} className="text-orange-400" />
              Planos e Preços
            </h1>
            <p className="text-gray-400 mt-1">Configure os planos disponíveis para seus clientes</p>
          </div>
          <button
            onClick={() => {
              setEditingPlan(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition flex items-center gap-2"
          >
            <Icons.Plus size={18} />
            Novo Plano
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={clsx(
                'bg-gray-900 border rounded-2xl overflow-hidden relative',
                plan.is_popular ? 'border-orange-500' : 'border-gray-800'
              )}
            >
              {plan.is_popular && (
                <div className="absolute top-4 right-4">
                  <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded-full font-medium">
                    Popular
                  </span>
                </div>
              )}

              {/* Header */}
              <div className={clsx('p-6 bg-gradient-to-br', getPlanColor(plan.slug))}>
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-white/80 text-sm mt-1">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-white">
                    R$ {plan.price_monthly}
                  </span>
                  <span className="text-white/60 text-sm">/mês</span>
                </div>
                {plan.price_yearly > 0 && (
                  <p className="text-white/60 text-xs mt-1">
                    ou R$ {plan.price_yearly}/ano (2 meses grátis)
                  </p>
                )}
              </div>

              {/* Features */}
              <div className="p-6">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Recursos</h4>
                <div className="space-y-2">
                  {Object.entries(plan.features).map(([key, enabled]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      {enabled ? (
                        <Icons.Check size={16} className="text-green-400" />
                      ) : (
                        <Icons.X size={16} className="text-gray-600" />
                      )}
                      <span className={enabled ? 'text-gray-300' : 'text-gray-600'}>
                        {FEATURE_LABELS[key] || key}
                      </span>
                    </div>
                  ))}
                </div>

                <h4 className="text-sm font-medium text-gray-400 mt-4 mb-3">Limites</h4>
                <div className="space-y-2">
                  {Object.entries(plan.limits).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{LIMIT_LABELS[key] || key}</span>
                      <span className="text-white font-medium">{formatLimit(key, value)}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => handleEditPlan(plan)}
                    className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition flex items-center justify-center gap-2 text-sm"
                  >
                    <Icons.Edit size={14} />
                    Editar
                  </button>
                  <button
                    onClick={() => setPlans(prev => prev.map(p =>
                      p.id === plan.id ? { ...p, is_active: !p.is_active } : p
                    ))}
                    className={clsx(
                      'px-3 py-2 rounded-lg transition',
                      plan.is_active
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    )}
                  >
                    {plan.is_active ? <Icons.Eye size={14} /> : <Icons.EyeOff size={14} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Icons.Users size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">47</p>
                <p className="text-sm text-gray-400">Clientes ativos</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Icons.DollarSign size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">R$ 4.573</p>
                <p className="text-sm text-gray-400">MRR atual</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Icons.TrendingUp size={20} className="text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">R$ 187</p>
                <p className="text-sm text-gray-400">Ticket médio</p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  {editingPlan ? 'Editar Plano' : 'Novo Plano'}
                </h2>
                <button
                  onClick={() => { setShowModal(false); setEditingPlan(null); }}
                  className="text-gray-400 hover:text-white"
                >
                  <Icons.X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Nome</label>
                    <input
                      type="text"
                      value={editingPlan?.name || ''}
                      onChange={(e) => setEditingPlan(prev => prev ? { ...prev, name: e.target.value } : null)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Slug</label>
                    <input
                      type="text"
                      value={editingPlan?.slug || ''}
                      onChange={(e) => setEditingPlan(prev => prev ? { ...prev, slug: e.target.value } : null)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Descrição</label>
                  <input
                    type="text"
                    value={editingPlan?.description || ''}
                    onChange={(e) => setEditingPlan(prev => prev ? { ...prev, description: e.target.value } : null)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Preço Mensal (R$)</label>
                    <input
                      type="number"
                      value={editingPlan?.price_monthly || 0}
                      onChange={(e) => setEditingPlan(prev => prev ? { ...prev, price_monthly: Number(e.target.value) } : null)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Preço Anual (R$)</label>
                    <input
                      type="number"
                      value={editingPlan?.price_yearly || 0}
                      onChange={(e) => setEditingPlan(prev => prev ? { ...prev, price_yearly: Number(e.target.value) } : null)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Limits */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Limites (-1 = ilimitado)</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {editingPlan && Object.entries(editingPlan.limits).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-xs text-gray-500 mb-1">{LIMIT_LABELS[key] || key}</label>
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => setEditingPlan(prev => prev ? {
                            ...prev,
                            limits: { ...prev.limits, [key]: Number(e.target.value) }
                          } : null)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Recursos</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {editingPlan && Object.entries(editingPlan.features).map(([key, enabled]) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => setEditingPlan(prev => prev ? {
                            ...prev,
                            features: { ...prev.features, [key]: e.target.checked }
                          } : null)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-300">{FEATURE_LABELS[key] || key}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
                <button
                  onClick={() => { setShowModal(false); setEditingPlan(null); }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePlan}
                  className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
