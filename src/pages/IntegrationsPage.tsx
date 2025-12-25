import { useState, useEffect } from 'react';
import { 
  Settings, Zap, MessageSquare, CheckCircle2, XCircle, Loader2,
  ExternalLink, Copy, Save, TestTube, Webhook, Bot, Key, Image,
  Video, Mic, Search, Share2, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiInitializer, APIKeys, APIStatus, autoInitializeAPIs } from '../services/apiInitializer';
import { evolutionAPI } from '../services/evolutionAPIService';

export const IntegrationsPage = () => {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [apiStatuses, setApiStatuses] = useState<APIStatus[]>([]);

  // API Keys
  const [apiKeys, setApiKeys] = useState<APIKeys>({
    openRouter: '',
    openai: '',
    falAI: '',
    elevenLabs: '',
    freepik: '',
    lateAPI: '',
    gemini: '',
  });

  // Evolution API Config
  const [evolutionConfig, setEvolutionConfig] = useState({
    baseUrl: '',
    apiKey: '',
    instanceName: '',
  });

  // n8n Config
  const [n8nConfig, setN8nConfig] = useState({
    baseUrl: 'https://agenciabase.app.n8n.cloud',
    webhookPath: '/webhook',
  });

  // Carregar configurações salvas
  useEffect(() => {
    const savedKeys = localStorage.getItem('api_keys');
    const savedEvolution = localStorage.getItem('evolution_config');
    const savedN8n = localStorage.getItem('n8n_config');

    if (savedKeys) {
      setApiKeys(JSON.parse(savedKeys));
    }
    if (savedEvolution) {
      setEvolutionConfig(JSON.parse(savedEvolution));
    }
    if (savedN8n) {
      setN8nConfig(JSON.parse(savedN8n));
    }

    // Carregar status das APIs
    loadApiStatuses();
  }, []);

  const loadApiStatuses = async () => {
    try {
      const statuses = await apiInitializer.checkAllStatus();
      setApiStatuses(statuses);
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    }
  };

  // Salvar todas as configurações
  const saveAllConfig = () => {
    setLoading(true);

    try {
      // Salvar no localStorage
      localStorage.setItem('api_keys', JSON.stringify(apiKeys));
      localStorage.setItem('evolution_config', JSON.stringify(evolutionConfig));
      localStorage.setItem('n8n_config', JSON.stringify(n8nConfig));

      // Inicializar todas as APIs
      apiInitializer.initializeAll(apiKeys, evolutionConfig.baseUrl ? evolutionConfig : undefined);

      // Recarregar status
      loadApiStatuses();

      toast.success('Todas as configurações salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Testar conexão específica
  const testConnection = async (apiName: string) => {
    setTesting(apiName);
    
    try {
      await loadApiStatuses();
      const status = apiStatuses.find(s => s.name === apiName);
      
      if (status?.status === 'connected') {
        toast.success(`${apiName} conectado!`);
      } else {
        toast.error(`${apiName} não conectado`);
      }
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setTesting(null);
    }
  };

  // Obter QR Code do WhatsApp
  const getWhatsAppQR = async () => {
    if (!evolutionConfig.baseUrl || !evolutionConfig.instanceName) {
      toast.error('Configure a Evolution API primeiro');
      return;
    }

    setTesting('whatsapp');
    
    try {
      evolutionAPI.setConfig(evolutionConfig);
      const qr = await evolutionAPI.getQRCode();
      
      if (qr.base64) {
        // Abrir modal com QR code
        const win = window.open('', 'QR Code WhatsApp', 'width=400,height=450');
        if (win) {
          win.document.write(`
            <html>
              <head><title>QR Code WhatsApp</title></head>
              <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background:#1f2937;font-family:sans-serif;">
                <h2 style="color:#f97316;margin-bottom:20px;">Escaneie o QR Code</h2>
                <img src="${qr.base64}" style="max-width:300px;border-radius:8px;"/>
                <p style="color:#9ca3af;margin-top:20px;">Abra o WhatsApp no celular</p>
              </body>
            </html>
          `);
        }
      } else {
        toast.success('WhatsApp já está conectado!');
      }
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setTesting(null);
    }
  };

  // Copiar webhook URL
  const copyWebhookUrl = (endpoint: string) => {
    const url = `${n8nConfig.baseUrl}${n8nConfig.webhookPath}/${endpoint}`;
    navigator.clipboard.writeText(url);
    toast.success('URL copiada!');
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'connected') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (status === 'error') return <XCircle className="w-5 h-5 text-red-500" />;
    return <div className="w-4 h-4 rounded-full bg-gray-500" />;
  };

  const ApiCard = ({ 
    icon: Icon, 
    title, 
    description, 
    children, 
    color 
  }: { 
    icon: any; 
    title: string; 
    description: string; 
    children: React.ReactNode;
    color: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border p-6 mb-4">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        {apiStatuses.find(s => s.name.includes(title.split(' ')[0]))?.status && (
          <StatusIcon status={apiStatuses.find(s => s.name.includes(title.split(' ')[0]))?.status || 'disconnected'} />
        )}
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-xl">
              <Settings className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Integrações</h1>
              <p className="text-gray-500">Configure todas as APIs do sistema</p>
            </div>
          </div>
          <button
            onClick={loadApiStatuses}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Atualizar status"
          >
            <RefreshCw className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Status Overview */}
        <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl p-4 mb-6 text-white">
          <h3 className="font-semibold mb-2">Status das Integrações</h3>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {apiStatuses.map((api) => (
              <div key={api.name} className="flex flex-col items-center">
                <StatusIcon status={api.status} />
                <span className="text-xs mt-1 text-center">{api.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* OpenRouter - Multi-Model AI */}
        <ApiCard 
          icon={Bot} 
          title="OpenRouter - Multi-Model AI" 
          description="GPT-4, Claude, Gemini, Llama e mais"
          color="bg-purple-500"
        >
          <input
            type="password"
            value={apiKeys.openRouter}
            onChange={e => setApiKeys(prev => ({ ...prev, openRouter: e.target.value }))}
            className="w-full p-2 border rounded-lg mb-2"
            placeholder="sk-or-v1-..."
          />
          <p className="text-xs text-gray-500">
            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">
              Obter API Key <ExternalLink className="w-3 h-3 inline" />
            </a>
          </p>
        </ApiCard>

        {/* OpenAI Assistants */}
        <ApiCard 
          icon={Bot} 
          title="OpenAI Assistants" 
          description="Assistentes com memória persistente"
          color="bg-green-500"
        >
          <input
            type="password"
            value={apiKeys.openai}
            onChange={e => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
            className="w-full p-2 border rounded-lg mb-2"
            placeholder="sk-proj-..."
          />
          <p className="text-xs text-gray-500">
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline">
              Obter API Key <ExternalLink className="w-3 h-3 inline" />
            </a>
          </p>
        </ApiCard>

        {/* FAL.AI - Image/Video Generation */}
        <ApiCard 
          icon={Image} 
          title="FAL.AI - Geração de Imagens" 
          description="Flux, Stable Diffusion, Video Generation"
          color="bg-pink-500"
        >
          <input
            type="password"
            value={apiKeys.falAI}
            onChange={e => setApiKeys(prev => ({ ...prev, falAI: e.target.value }))}
            className="w-full p-2 border rounded-lg mb-2"
            placeholder="key:secret"
          />
          <p className="text-xs text-gray-500">
            <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline">
              Obter API Key <ExternalLink className="w-3 h-3 inline" />
            </a>
          </p>
        </ApiCard>

        {/* ElevenLabs - Text to Speech */}
        <ApiCard 
          icon={Mic} 
          title="ElevenLabs - Text to Speech" 
          description="Vozes realistas e clonagem de voz"
          color="bg-blue-500"
        >
          <input
            type="password"
            value={apiKeys.elevenLabs}
            onChange={e => setApiKeys(prev => ({ ...prev, elevenLabs: e.target.value }))}
            className="w-full p-2 border rounded-lg mb-2"
            placeholder="sk_..."
          />
          <p className="text-xs text-gray-500">
            <a href="https://elevenlabs.io/settings/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              Obter API Key <ExternalLink className="w-3 h-3 inline" />
            </a>
          </p>
        </ApiCard>

        {/* Freepik + Pikaso */}
        <ApiCard 
          icon={Search} 
          title="Freepik + Pikaso AI" 
          description="Banco de imagens e geração com IA"
          color="bg-cyan-500"
        >
          <input
            type="password"
            value={apiKeys.freepik}
            onChange={e => setApiKeys(prev => ({ ...prev, freepik: e.target.value }))}
            className="w-full p-2 border rounded-lg mb-2"
            placeholder="FPSX..."
          />
          <p className="text-xs text-gray-500">
            <a href="https://www.freepik.com/api" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">
              Obter API Key <ExternalLink className="w-3 h-3 inline" />
            </a>
          </p>
        </ApiCard>

        {/* Late API - Social Media */}
        <ApiCard 
          icon={Share2} 
          title="Late API - Redes Sociais" 
          description="Publicação em Instagram, TikTok, YouTube"
          color="bg-red-500"
        >
          <input
            type="password"
            value={apiKeys.lateAPI}
            onChange={e => setApiKeys(prev => ({ ...prev, lateAPI: e.target.value }))}
            className="w-full p-2 border rounded-lg mb-2"
            placeholder="sk_..."
          />
          <p className="text-xs text-gray-500">
            <a href="https://late.so/dashboard" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">
              Obter API Key <ExternalLink className="w-3 h-3 inline" />
            </a>
          </p>
        </ApiCard>

        {/* Evolution API - WhatsApp */}
        <ApiCard 
          icon={MessageSquare} 
          title="Evolution API - WhatsApp" 
          description="Envio de mensagens e notificações"
          color="bg-green-600"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              value={evolutionConfig.baseUrl}
              onChange={e => setEvolutionConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
              className="p-2 border rounded-lg"
              placeholder="https://sua-evolution.com"
            />
            <input
              type="password"
              value={evolutionConfig.apiKey}
              onChange={e => setEvolutionConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              className="p-2 border rounded-lg"
              placeholder="API Key"
            />
            <input
              type="text"
              value={evolutionConfig.instanceName}
              onChange={e => setEvolutionConfig(prev => ({ ...prev, instanceName: e.target.value }))}
              className="p-2 border rounded-lg"
              placeholder="Nome da Instância"
            />
          </div>
          <button
            onClick={getWhatsAppQR}
            disabled={testing === 'whatsapp'}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
          >
            {testing === 'whatsapp' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            Conectar WhatsApp
          </button>
          <p className="text-xs text-gray-500 mt-2">
            <a href="https://github.com/EvolutionAPI/evolution-api" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline">
              Documentação Evolution API <ExternalLink className="w-3 h-3 inline" />
            </a>
          </p>
        </ApiCard>

        {/* n8n - Automações */}
        <ApiCard 
          icon={Zap} 
          title="n8n - Automações" 
          description="Workflows e webhooks automáticos"
          color="bg-orange-500"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              value={n8nConfig.baseUrl}
              onChange={e => setN8nConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
              className="p-2 border rounded-lg"
              placeholder="https://seu-n8n.app.n8n.cloud"
            />
            <input
              type="text"
              value={n8nConfig.webhookPath}
              onChange={e => setN8nConfig(prev => ({ ...prev, webhookPath: e.target.value }))}
              className="p-2 border rounded-lg"
              placeholder="/webhook"
            />
          </div>
          
          {/* Webhooks disponíveis */}
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Webhook className="w-4 h-4" /> Webhooks Disponíveis
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {['demanda-criada', 'notificar-whatsapp', 'notificar-email', 'aprovacao-cliente', 'status-changed', 'agendar-publicacao'].map(endpoint => (
                <button
                  key={endpoint}
                  onClick={() => copyWebhookUrl(endpoint)}
                  className="flex items-center justify-between bg-white p-2 rounded border text-xs hover:bg-gray-50"
                >
                  <code className="text-gray-600 truncate">{endpoint}</code>
                  <Copy className="w-3 h-3 text-gray-400 ml-1" />
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500">
            <a href="https://agenciabase.app.n8n.cloud" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">
              Abrir n8n Dashboard <ExternalLink className="w-3 h-3 inline" />
            </a>
          </p>
        </ApiCard>

        {/* Save Button */}
        <button
          onClick={saveAllConfig}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 shadow-lg"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Salvar Todas as Configurações
        </button>
      </div>
    </div>
  );
};

export default IntegrationsPage;
