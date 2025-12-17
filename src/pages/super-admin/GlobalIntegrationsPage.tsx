import { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import { useStore } from '../../store';
import { auditLog, maskSensitiveData, rateLimit } from '../../lib/security';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface Integration {
  id: string;
  provider: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  credentials: Record<string, string>;
  is_active: boolean;
  fields: { key: string; label: string; placeholder: string; type: string }[];
  category: 'ai' | 'media' | 'payment' | 'communication';
}

const INTEGRATIONS_CONFIG: Omit<Integration, 'id' | 'credentials' | 'is_active'>[] = [
  // IA & Chat
  {
    provider: 'gemini',
    name: 'Google Gemini',
    description: 'IA generativa para chat e criacao de conteudo',
    icon: <Icons.Sparkles size={24} />,
    color: 'text-blue-400',
    bgColor: 'from-blue-600 to-cyan-600',
    category: 'ai',
    fields: [{ key: 'api_key', label: 'API Key', placeholder: 'AIza...', type: 'password' }]
  },
  {
    provider: 'openrouter',
    name: 'OpenRouter',
    description: 'Acesso a multiplos modelos (GPT-4, Claude, Llama)',
    icon: <Icons.Globe size={24} />,
    color: 'text-purple-400',
    bgColor: 'from-purple-600 to-pink-600',
    category: 'ai',
    fields: [{ key: 'api_key', label: 'API Key', placeholder: 'sk-or-...', type: 'password' }]
  },
  {
    provider: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o e GPT-4o Mini',
    icon: <Icons.Bot size={24} />,
    color: 'text-green-400',
    bgColor: 'from-green-600 to-emerald-600',
    category: 'ai',
    fields: [{ key: 'api_key', label: 'API Key', placeholder: 'sk-...', type: 'password' }]
  },
  // Media Generation
  {
    provider: 'freepik',
    name: 'Freepik Mystic',
    description: 'Geracao de imagens com IA',
    icon: <Icons.Image size={24} />,
    color: 'text-cyan-400',
    bgColor: 'from-cyan-600 to-blue-600',
    category: 'media',
    fields: [{ key: 'api_key', label: 'API Key', placeholder: 'fpk_...', type: 'password' }]
  },
  {
    provider: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'Geracao de voz e narracao',
    icon: <Icons.Mic size={24} />,
    color: 'text-yellow-400',
    bgColor: 'from-yellow-600 to-orange-600',
    category: 'media',
    fields: [{ key: 'api_key', label: 'API Key', placeholder: 'xi_...', type: 'password' }]
  },
  {
    provider: 'falai',
    name: 'FAL.ai',
    description: 'Geracao de videos e imagens avancadas',
    icon: <Icons.Video size={24} />,
    color: 'text-orange-400',
    bgColor: 'from-orange-600 to-red-600',
    category: 'media',
    fields: [{ key: 'api_key', label: 'API Key', placeholder: 'fal_...', type: 'password' }]
  },
  // Payments
  {
    provider: 'asaas',
    name: 'Asaas',
    description: 'Gateway de pagamentos e cobrancas',
    icon: <Icons.CreditCard size={24} />,
    color: 'text-emerald-400',
    bgColor: 'from-emerald-600 to-green-600',
    category: 'payment',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: '$aact_...', type: 'password' },
      { key: 'environment', label: 'Ambiente', placeholder: 'production', type: 'text' }
    ]
  },
  // Communication
  {
    provider: 'zapi',
    name: 'Z-API (WhatsApp)',
    description: 'Envio de mensagens via WhatsApp',
    icon: <Icons.MessageSquare size={24} />,
    color: 'text-green-400',
    bgColor: 'from-green-600 to-green-700',
    category: 'communication',
    fields: [
      { key: 'instance_id', label: 'Instance ID', placeholder: 'Seu instance ID', type: 'text' },
      { key: 'token', label: 'Token', placeholder: 'Seu token', type: 'password' },
      { key: 'client_token', label: 'Client Token', placeholder: 'Seu client token', type: 'password' }
    ]
  }
];

const CATEGORIES = [
  { id: 'all', label: 'Todas', icon: <Icons.Grid size={18} /> },
  { id: 'ai', label: 'Inteligencia Artificial', icon: <Icons.Sparkles size={18} /> },
  { id: 'media', label: 'Geracao de Midia', icon: <Icons.Image size={18} /> },
  { id: 'payment', label: 'Pagamentos', icon: <Icons.CreditCard size={18} /> },
  { id: 'communication', label: 'Comunicacao', icon: <Icons.MessageSquare size={18} /> }
];

export const GlobalIntegrationsPage = () => {
  const { apiConfig, setApiConfig, currentUser } = useStore();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [editingCredentials, setEditingCredentials] = useState<Record<string, Record<string, string>>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
    // Log de acesso
    if (currentUser) {
      auditLog.log(currentUser.id, 'VIEW', 'global-integrations', 'Acessou pagina de integracoes globais');
    }
  }, [currentUser]);

  const loadIntegrations = async () => {
    const mappedIntegrations: Integration[] = INTEGRATIONS_CONFIG.map(config => {
      const credentials: Record<string, string> = {};

      // Mapear credenciais do store
      if (config.provider === 'gemini') credentials.api_key = apiConfig.gemini_key || '';
      if (config.provider === 'openrouter') credentials.api_key = apiConfig.openrouter_key || '';
      if (config.provider === 'openai') credentials.api_key = apiConfig.openai_key || '';
      if (config.provider === 'freepik') credentials.api_key = apiConfig.freepik_key || '';
      if (config.provider === 'elevenlabs') credentials.api_key = apiConfig.elevenlabs_key || '';
      if (config.provider === 'falai') credentials.api_key = apiConfig.falai_key || '';
      if (config.provider === 'asaas') credentials.api_key = apiConfig.asaas_key || '';
      if (config.provider === 'zapi') {
        credentials.instance_id = apiConfig.zapi_instance_id || '';
        credentials.token = apiConfig.zapi_token || '';
        credentials.client_token = apiConfig.zapi_client_token || '';
      }

      return {
        ...config,
        id: config.provider,
        credentials,
        is_active: Object.values(credentials).some(v => v && v.length > 0)
      };
    });

    setIntegrations(mappedIntegrations);

    const initialCredentials: Record<string, Record<string, string>> = {};
    mappedIntegrations.forEach(i => {
      initialCredentials[i.provider] = { ...i.credentials };
    });
    setEditingCredentials(initialCredentials);
    setLoading(false);
  };

  const handleCredentialChange = (provider: string, key: string, value: string) => {
    setEditingCredentials(prev => ({
      ...prev,
      [provider]: { ...prev[provider], [key]: value }
    }));
  };

  const saveCredentials = async (provider: string) => {
    // Rate limiting
    if (!rateLimit.check(`save_${provider}`, 5, 60000)) {
      toast.error('Muitas tentativas. Aguarde 1 minuto.');
      return;
    }

    const creds = editingCredentials[provider];
    if (!creds) return;

    try {
      switch (provider) {
        case 'gemini':
          setApiConfig({ gemini_key: creds.api_key });
          break;
        case 'openrouter':
          setApiConfig({ openrouter_key: creds.api_key });
          break;
        case 'openai':
          setApiConfig({ openai_key: creds.api_key });
          break;
        case 'freepik':
          setApiConfig({ freepik_key: creds.api_key });
          break;
        case 'elevenlabs':
          setApiConfig({ elevenlabs_key: creds.api_key });
          break;
        case 'falai':
          setApiConfig({ falai_key: creds.api_key });
          break;
        case 'asaas':
          setApiConfig({ asaas_key: creds.api_key });
          break;
        case 'zapi':
          setApiConfig({
            zapi_instance_id: creds.instance_id,
            zapi_token: creds.token,
            zapi_client_token: creds.client_token
          });
          break;
      }

      // Atualizar estado local
      setIntegrations(prev => prev.map(i =>
        i.provider === provider
          ? { ...i, credentials: creds, is_active: Object.values(creds).some(v => v && v.length > 0) }
          : i
      ));

      // Audit log
      if (currentUser) {
        auditLog.log(currentUser.id, 'UPDATE', `integration:${provider}`, `Credenciais atualizadas`);
      }

      toast.success('Credenciais salvas com seguranca!');
    } catch (error) {
      toast.error('Erro ao salvar credenciais');
    }
  };

  const testIntegration = async (provider: string) => {
    // Rate limiting
    if (!rateLimit.check(`test_${provider}`, 3, 60000)) {
      toast.error('Muitas tentativas. Aguarde 1 minuto.');
      return;
    }

    setTestingProvider(provider);
    const creds = editingCredentials[provider];

    // Verificar se a API key foi preenchida
    const apiKey = creds.api_key || '';
    if (provider !== 'zapi' && (!apiKey || apiKey.length < 10)) {
      toast.error('Insira uma API Key valida');
      setTestingProvider(null);
      return;
    }

    try {
      let success = false;

      switch (provider) {
        case 'gemini':
          // Gemini: testa gerando conteudo
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] })
            }
          );
          success = geminiRes.ok;
          if (!success) {
            const err = await geminiRes.json().catch(() => ({}));
            console.log('Gemini error:', err);
          }
          break;

        case 'openrouter':
          // OpenRouter: testa com endpoint de creditos que requer auth
          const orRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          success = orRes.ok;
          if (!success) {
            const err = await orRes.json().catch(() => ({}));
            console.log('OpenRouter error:', err);
          }
          break;

        case 'openai':
          // OpenAI: lista modelos (requer auth valida)
          const oaiRes = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          success = oaiRes.ok;
          break;

        case 'elevenlabs':
          // ElevenLabs: busca dados do usuario
          const elRes = await fetch('https://api.elevenlabs.io/v1/user', {
            headers: { 'xi-api-key': apiKey }
          });
          success = elRes.ok;
          break;

        case 'freepik':
          // Freepik: testa listando estilos
          const fpRes = await fetch('https://api.freepik.com/v1/ai/styles', {
            headers: {
              'Accept': 'application/json',
              'x-freepik-api-key': apiKey
            }
          });
          success = fpRes.ok;
          break;

        case 'falai':
          // FAL.ai: verifica formato da key (nao tem endpoint de teste simples)
          success = apiKey.length > 20 && (apiKey.includes('-') || apiKey.includes(':'));
          if (!success) {
            toast.error('Formato de API Key FAL.ai invalido');
          }
          break;

        case 'asaas':
          // Asaas: busca info da conta
          const env = creds.environment === 'sandbox' ? 'sandbox' : 'www';
          const asaasRes = await fetch(`https://${env}.asaas.com/api/v3/myAccount`, {
            headers: { 'access_token': apiKey }
          });
          success = asaasRes.ok;
          break;

        case 'zapi':
          // Z-API: verificar se preencheu os campos
          if (!creds.instance_id || !creds.token) {
            toast.error('Preencha Instance ID e Token');
            setTestingProvider(null);
            return;
          }
          // Testa status da instancia
          const zapiRes = await fetch(
            `https://api.z-api.io/instances/${creds.instance_id}/token/${creds.token}/status`,
            { method: 'GET' }
          );
          success = zapiRes.ok;
          break;

        default:
          success = Object.values(creds).every(v => v && v.length > 0);
      }

      if (success) {
        toast.success(`${provider} conectado com sucesso!`);
        await saveCredentials(provider);

        if (currentUser) {
          auditLog.log(currentUser.id, 'TEST_SUCCESS', `integration:${provider}`, 'Teste de conexao bem-sucedido');
        }
      } else {
        toast.error('Credenciais invalidas');
        if (currentUser) {
          auditLog.log(currentUser.id, 'TEST_FAILED', `integration:${provider}`, 'Teste de conexao falhou');
        }
      }
    } catch (error) {
      toast.error('Erro ao testar integracao');
    } finally {
      setTestingProvider(null);
    }
  };

  const filteredIntegrations = selectedCategory === 'all'
    ? integrations
    : integrations.filter(i => i.category === selectedCategory);

  const activeCount = integrations.filter(i => i.is_active).length;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Icons.Loader size={32} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-xl">
                <Icons.Shield size={24} className="text-orange-400" />
              </div>
              Integracoes Globais
            </h1>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-400">{activeCount} ativas</span>
            </div>
          </div>
          <p className="text-gray-500">
            Configure as APIs disponiveis para todos os tenants da plataforma
          </p>
        </div>

        {/* Security Alert */}
        <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-500/20 rounded-xl">
              <Icons.AlertTriangle size={24} className="text-red-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-400 mb-1">Area Restrita - Super Admin</h4>
              <p className="text-sm text-gray-400">
                Estas credenciais sao usadas globalmente. Todas as acoes sao registradas no log de auditoria.
                Mantenha suas chaves seguras e nunca compartilhe com terceiros.
              </p>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                selectedCategory === cat.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              )}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Integrations Grid */}
        <div className="grid gap-4">
          {filteredIntegrations.map((integration) => (
            <div
              key={integration.id}
              className={clsx(
                'bg-gray-900/80 backdrop-blur border rounded-2xl overflow-hidden transition-all duration-300',
                integration.is_active ? 'border-green-500/30' : 'border-gray-800',
                expandedCard === integration.id ? 'ring-2 ring-orange-500/50' : ''
              )}
            >
              {/* Header - Always Visible */}
              <button
                onClick={() => setExpandedCard(expandedCard === integration.id ? null : integration.id)}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-800/50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className={clsx(
                    'w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br text-white',
                    integration.bgColor
                  )}>
                    {integration.icon}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{integration.name}</h3>
                      {integration.is_active && (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                          Conectado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {integration.is_active && (
                    <span className="text-xs text-gray-500 hidden sm:block">
                      {maskSensitiveData.apiKey(integration.credentials.api_key || integration.credentials.token || '')}
                    </span>
                  )}
                  <Icons.ChevronDown
                    size={20}
                    className={clsx(
                      'text-gray-500 transition-transform',
                      expandedCard === integration.id ? 'rotate-180' : ''
                    )}
                  />
                </div>
              </button>

              {/* Expanded Content */}
              {expandedCard === integration.id && (
                <div className="border-t border-gray-800 p-5 space-y-4 bg-gray-900/50">
                  {integration.fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        {field.label}
                      </label>
                      <div className="relative">
                        <input
                          type={field.type === 'password' && !showPasswords[`${integration.provider}_${field.key}`] ? 'password' : 'text'}
                          value={editingCredentials[integration.provider]?.[field.key] || ''}
                          onChange={(e) => handleCredentialChange(integration.provider, field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition pr-12"
                        />
                        {field.type === 'password' && (
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({
                              ...prev,
                              [`${integration.provider}_${field.key}`]: !prev[`${integration.provider}_${field.key}`]
                            }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                          >
                            {showPasswords[`${integration.provider}_${field.key}`] ? (
                              <Icons.EyeOff size={18} />
                            ) : (
                              <Icons.Eye size={18} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => saveCredentials(integration.provider)}
                      className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition flex items-center justify-center gap-2 font-medium"
                    >
                      <Icons.Save size={18} />
                      Salvar
                    </button>
                    <button
                      onClick={() => testIntegration(integration.provider)}
                      disabled={testingProvider === integration.provider}
                      className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50 text-white rounded-xl transition flex items-center justify-center gap-2 font-medium"
                    >
                      {testingProvider === integration.provider ? (
                        <Icons.Loader size={18} className="animate-spin" />
                      ) : (
                        <Icons.Zap size={18} />
                      )}
                      Testar Conexao
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info Card */}
        <div className="mt-8 bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Icons.Info size={18} className="text-blue-400" />
            Informacoes de Seguranca
          </h4>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-green-500/20 rounded-lg mt-0.5">
                <Icons.Lock size={14} className="text-green-400" />
              </div>
              <div>
                <p className="text-gray-300 font-medium">Armazenamento Seguro</p>
                <p className="text-gray-500">API keys sao armazenadas de forma segura</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-blue-500/20 rounded-lg mt-0.5">
                <Icons.Eye size={14} className="text-blue-400" />
              </div>
              <div>
                <p className="text-gray-300 font-medium">Auditoria</p>
                <p className="text-gray-500">Todas as acoes sao registradas</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-orange-500/20 rounded-lg mt-0.5">
                <Icons.Shield size={14} className="text-orange-400" />
              </div>
              <div>
                <p className="text-gray-300 font-medium">Acesso Restrito</p>
                <p className="text-gray-500">Apenas Super Admin pode acessar</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-purple-500/20 rounded-lg mt-0.5">
                <Icons.Clock size={14} className="text-purple-400" />
              </div>
              <div>
                <p className="text-gray-300 font-medium">Rate Limiting</p>
                <p className="text-gray-500">Protecao contra tentativas excessivas</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
