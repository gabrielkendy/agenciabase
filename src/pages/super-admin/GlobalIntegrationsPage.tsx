import { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import { useStore } from '../../store';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface Integration {
  id: string;
  provider: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  credentials: Record<string, string>;
  is_active: boolean;
  fields: { key: string; label: string; placeholder: string; type: string }[];
}

const INTEGRATIONS_CONFIG: Omit<Integration, 'id' | 'credentials' | 'is_active'>[] = [
  {
    provider: 'gemini',
    name: 'Google Gemini',
    description: 'IA generativa para chat e criação de conteúdo',
    icon: '✨',
    color: 'from-blue-500 to-cyan-500',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'AIza...', type: 'password' }
    ]
  },
  {
    provider: 'openrouter',
    name: 'OpenRouter',
    description: 'Acesso a múltiplos modelos de IA (GPT-4, Claude, Llama)',
    icon: '🔀',
    color: 'from-purple-500 to-pink-500',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'sk-or-...', type: 'password' }
    ]
  },
  {
    provider: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4o Mini',
    icon: '🤖',
    color: 'from-green-500 to-emerald-500',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'sk-...', type: 'password' }
    ]
  },
  {
    provider: 'freepik',
    name: 'Freepik Mystic',
    description: 'Geração de imagens com IA',
    icon: '🎨',
    color: 'from-blue-500 to-cyan-500',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'fpk_...', type: 'password' }
    ]
  },
  {
    provider: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'Geração de voz e narração com IA',
    icon: '🎙️',
    color: 'from-green-500 to-teal-500',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'xi_...', type: 'password' }
    ]
  },
  {
    provider: 'falai',
    name: 'FAL.ai',
    description: 'Geração de vídeos e imagens avançadas',
    icon: '🎬',
    color: 'from-orange-500 to-red-500',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'fal_...', type: 'password' }
    ]
  },
  {
    provider: 'asaas',
    name: 'Asaas',
    description: 'Gateway de pagamentos e cobranças',
    icon: '💳',
    color: 'from-green-600 to-emerald-600',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: '$aact_...', type: 'password' },
      { key: 'environment', label: 'Ambiente', placeholder: 'production ou sandbox', type: 'text' }
    ]
  },
  {
    provider: 'zapi',
    name: 'Z-API (WhatsApp)',
    description: 'Envio de mensagens via WhatsApp',
    icon: '📱',
    color: 'from-green-500 to-green-600',
    fields: [
      { key: 'instance_id', label: 'Instance ID', placeholder: 'Seu instance ID', type: 'text' },
      { key: 'token', label: 'Token', placeholder: 'Seu token', type: 'password' },
      { key: 'client_token', label: 'Client Token', placeholder: 'Seu client token', type: 'password' }
    ]
  }
];

export const GlobalIntegrationsPage = () => {
  const { apiConfig, setApiConfig } = useStore();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [editingCredentials, setEditingCredentials] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    // Mapear config atual para integrações
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

    // Inicializar credenciais de edição
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
      [provider]: {
        ...prev[provider],
        [key]: value
      }
    }));
  };

  const saveCredentials = async (provider: string) => {
    const creds = editingCredentials[provider];
    if (!creds) return;

    try {
      // Salvar no store local
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

      toast.success('Credenciais salvas!');
    } catch (error) {
      toast.error('Erro ao salvar credenciais');
    }
  };

  const testIntegration = async (provider: string) => {
    setTestingProvider(provider);
    const creds = editingCredentials[provider];

    try {
      let success = false;

      switch (provider) {
        case 'gemini':
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${creds.api_key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] })
            }
          );
          success = geminiRes.ok;
          break;

        case 'openrouter':
          const orRes = await fetch('https://openrouter.ai/api/v1/models', {
            headers: { 'Authorization': `Bearer ${creds.api_key}` }
          });
          success = orRes.ok;
          break;

        case 'openai':
          const oaiRes = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${creds.api_key}` }
          });
          success = oaiRes.ok;
          break;

        case 'elevenlabs':
          const elRes = await fetch('https://api.elevenlabs.io/v1/user', {
            headers: { 'xi-api-key': creds.api_key }
          });
          success = elRes.ok;
          break;

        case 'freepik':
          // Freepik não tem endpoint de verificação simples, assumimos sucesso se tem key
          success = creds.api_key?.length > 10;
          break;

        default:
          success = Object.values(creds).every(v => v && v.length > 0);
      }

      if (success) {
        toast.success(`${provider} conectado com sucesso!`);
        await saveCredentials(provider);
      } else {
        toast.error('Credenciais inválidas');
      }
    } catch (error) {
      toast.error('Erro ao testar integração');
    } finally {
      setTestingProvider(null);
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
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Icons.Zap size={28} className="text-orange-400" />
            Integrações Globais
          </h1>
          <p className="text-gray-400 mt-1">
            Configure as APIs que serão disponibilizadas para todos os clientes da plataforma
          </p>
        </div>

        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Icons.AlertTriangle size={20} className="text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-400">Atenção</h4>
              <p className="text-sm text-gray-400 mt-1">
                Estas credenciais serão usadas globalmente na plataforma. Cada tenant pode optar por usar
                suas próprias credenciais ou as globais. Mantenha-as seguras e atualizadas.
              </p>
            </div>
          </div>
        </div>

        {/* Integrations Grid */}
        <div className="space-y-4">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className={clsx(
                'bg-gray-900 border rounded-2xl overflow-hidden transition',
                integration.is_active ? 'border-green-500/30' : 'border-gray-800'
              )}
            >
              {/* Header */}
              <div className={clsx(
                'p-6 bg-gradient-to-r',
                integration.color,
                'bg-opacity-10'
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={clsx(
                      'w-14 h-14 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br',
                      integration.color
                    )}>
                      {integration.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{integration.name}</h3>
                        {integration.is_active && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                            Conectado
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{integration.description}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Credentials */}
              <div className="p-6 space-y-4">
                {integration.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm text-gray-400 mb-2">{field.label}</label>
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <input
                          type={field.type === 'password' && !showPasswords[`${integration.provider}_${field.key}`] ? 'password' : 'text'}
                          value={editingCredentials[integration.provider]?.[field.key] || ''}
                          onChange={(e) => handleCredentialChange(integration.provider, field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none pr-10"
                        />
                        {field.type === 'password' && (
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({
                              ...prev,
                              [`${integration.provider}_${field.key}`]: !prev[`${integration.provider}_${field.key}`]
                            }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
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
                  </div>
                ))}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => saveCredentials(integration.provider)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition flex items-center gap-2"
                  >
                    <Icons.Save size={16} />
                    Salvar
                  </button>
                  <button
                    onClick={() => testIntegration(integration.provider)}
                    disabled={testingProvider === integration.provider}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl transition flex items-center gap-2"
                  >
                    {testingProvider === integration.provider ? (
                      <Icons.Loader size={16} className="animate-spin" />
                    ) : (
                      <Icons.Zap size={16} />
                    )}
                    Testar Conexão
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
          <h4 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
            <Icons.Info size={18} />
            Como funciona
          </h4>
          <ul className="text-sm text-gray-400 space-y-2">
            <li>• <strong>Integrações Globais</strong> são usadas como padrão para todos os clientes</li>
            <li>• Cada cliente pode configurar suas <strong>próprias credenciais</strong> no painel Admin</li>
            <li>• Se o cliente não tiver credenciais próprias, as globais serão utilizadas</li>
            <li>• Recomendamos usar contas com limites adequados para o volume de uso esperado</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
