import { useState, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { SOCIAL_CHANNELS, SocialChannel, LateConnectedAccount } from '../types';
import { lateService, LATE_SUPPORTED_PLATFORMS } from '../services/lateService';
import { openrouterService } from '../services/openrouterService';
import toast from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
  const { apiConfig, setApiConfig } = useStore();
  
  // API States
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [showLate, setShowLate] = useState(false);
  const [showOpenRouter, setShowOpenRouter] = useState(false);
  const [testingOpenAI, setTestingOpenAI] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [testingLate, setTestingLate] = useState(false);
  const [testingOpenRouter, setTestingOpenRouter] = useState(false);
  const [openaiStatus, setOpenaiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lateStatus, setLateStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [openrouterStatus, setOpenrouterStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Late connected accounts
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'social'>('ai');

  // Initialize services with stored keys
  useEffect(() => {
    if (apiConfig.late_api_key) {
      lateService.setApiKey(apiConfig.late_api_key);
    }
    if (apiConfig.openrouter_key) {
      openrouterService.setApiKey(apiConfig.openrouter_key);
    }
  }, [apiConfig.late_api_key, apiConfig.openrouter_key]);

  const handleTestOpenAI = async () => {
    if (!apiConfig.openai_key) return;
    setTestingOpenAI(true); setOpenaiStatus('idle');
    try {
      const response = await fetch('https://api.openai.com/v1/models', { 
        headers: { Authorization: `Bearer ${apiConfig.openai_key}` } 
      });
      const success = response.ok;
      setOpenaiStatus(success ? 'success' : 'error');
      toast[success ? 'success' : 'error'](success ? '✅ OpenAI conectada!' : '❌ Erro na OpenAI');
    } catch { 
      setOpenaiStatus('error'); 
      toast.error('❌ Erro na OpenAI'); 
    }
    setTestingOpenAI(false);
  };

  const handleTestGemini = async () => {
    if (!apiConfig.gemini_key) return;
    setTestingGemini(true); setGeminiStatus('idle');
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiConfig.gemini_key}`
      );
      const success = response.ok;
      setGeminiStatus(success ? 'success' : 'error');
      toast[success ? 'success' : 'error'](success ? '✅ Gemini conectada!' : '❌ Erro no Gemini');
    } catch { 
      setGeminiStatus('error'); 
      toast.error('❌ Erro no Gemini'); 
    }
    setTestingGemini(false);
  };

  const handleTestOpenRouter = async () => {
    if (!apiConfig.openrouter_key) return;
    setTestingOpenRouter(true);
    setOpenrouterStatus('idle');
    
    try {
      openrouterService.setApiKey(apiConfig.openrouter_key);
      const isValid = await openrouterService.validateApiKey();
      
      if (isValid) {
        setOpenrouterStatus('success');
        toast.success('✅ OpenRouter conectado! Modelos gratuitos liberados!');
      } else {
        setOpenrouterStatus('error');
        toast.error('❌ API Key inválida');
      }
    } catch (error) {
      setOpenrouterStatus('error');
      toast.error('❌ Erro ao conectar OpenRouter');
    }
    setTestingOpenRouter(false);
  };

  const handleTestLate = async () => {
    if (!apiConfig.late_api_key) return;
    setTestingLate(true); 
    setLateStatus('idle');
    
    try {
      lateService.setApiKey(apiConfig.late_api_key);
      const isValid = await lateService.validateApiKey();
      
      if (isValid) {
        setLateStatus('success');
        toast.success('✅ Late API conectada!');
        await fetchConnectedAccounts();
      } else {
        setLateStatus('error');
        toast.error('❌ API Key inválida');
      }
    } catch (error) {
      setLateStatus('error');
      toast.error('❌ Erro ao conectar Late API');
    }
    setTestingLate(false);
  };

  const fetchConnectedAccounts = async () => {
    if (!apiConfig.late_api_key) return;
    
    setLoadingAccounts(true);
    try {
      lateService.setApiKey(apiConfig.late_api_key);
      const accounts = await lateService.getAccounts();
      
      const connectedAccounts: LateConnectedAccount[] = accounts.map((acc) => ({
        id: acc.id,
        platform: acc.platform as SocialChannel,
        name: acc.name,
        username: acc.username,
        profilePicture: acc.profilePicture,
        isConnected: true,
        connectedAt: new Date().toISOString(),
      }));
      
      setApiConfig({ late_connected_accounts: connectedAccounts });
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
    }
    setLoadingAccounts(false);
  };

  const handleConnectAccount = () => {
    window.open(lateService.getConnectUrl(), '_blank');
    toast.success('Conecte suas contas no Late e depois clique em "Atualizar"');
  };

  const isChannelConnected = (channelId: SocialChannel): boolean => {
    return apiConfig.late_connected_accounts?.some(
      (acc) => acc.platform === channelId && acc.isConnected
    ) || false;
  };

  const isChannelSupported = (channelId: SocialChannel): boolean => {
    const lateId = channelId === 'google_business' ? 'google' : channelId;
    return LATE_SUPPORTED_PLATFORMS.includes(lateId as any);
  };

  const getConnectedAccount = (channelId: SocialChannel): LateConnectedAccount | undefined => {
    return apiConfig.late_connected_accounts?.find((acc) => acc.platform === channelId);
  };

  return (
    <div className="h-full bg-gray-950 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Icons.Settings size={28} className="text-orange-400" />
            Configurações
          </h1>
          <p className="text-gray-500">Configure suas integrações de IA e redes sociais</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'ai' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🤖 Inteligência Artificial
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'social' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📱 Redes Sociais
          </button>
        </div>

        {/* AI Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            {/* OpenRouter - DESTAQUE */}
            <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl border border-purple-500/30 overflow-hidden">
              <div className="p-5 border-b border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold">
                      🌐
                    </div>
                    <div>
                      <h3 className="font-bold text-white flex items-center gap-2">
                        OpenRouter
                        <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">RECOMENDADO</span>
                      </h3>
                      <p className="text-xs text-gray-400">Acesso a +100 modelos incluindo 6 GRATUITOS!</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {openrouterStatus === 'success' && <Icons.CheckCircle size={20} className="text-green-400" />}
                    {openrouterStatus === 'error' && <Icons.AlertCircle size={20} className="text-red-400" />}
                    {apiConfig.openrouter_key && openrouterStatus === 'success' && (
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                        Conectado
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-5">
                <label className="block text-xs text-gray-400 mb-2">API Key</label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type={showOpenRouter ? 'text' : 'password'}
                      value={apiConfig.openrouter_key || ''}
                      onChange={(e) => setApiConfig({ openrouter_key: e.target.value })}
                      placeholder="sk-or-v1-..."
                      className="w-full bg-gray-800/50 border border-purple-500/30 rounded-lg px-4 py-2.5 text-white pr-10 focus:border-purple-500 focus:outline-none font-mono text-sm"
                    />
                    <button
                      onClick={() => setShowOpenRouter(!showOpenRouter)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showOpenRouter ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                    </button>
                  </div>
                  <button
                    onClick={handleTestOpenRouter}
                    disabled={!apiConfig.openrouter_key || testingOpenRouter}
                    className="px-4 py-2.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 disabled:opacity-50 flex items-center gap-2"
                  >
                    {testingOpenRouter ? <Icons.Loader size={18} className="animate-spin" /> : <Icons.Zap size={18} />}
                    Conectar
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Obtenha em{' '}
                    <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">
                      openrouter.ai/keys
                    </a>
                  </p>
                </div>
                {/* Modelos Gratuitos */}
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-xs text-green-400 font-medium mb-2">🆓 Modelos Gratuitos Incluídos:</p>
                  <div className="flex flex-wrap gap-1">
                    {['Gemma 2 9B', 'Llama 3.2', 'Mistral 7B', 'Phi-3 Mini', 'Qwen 2', 'Zephyr 7B'].map((model) => (
                      <span key={model} className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">
                        {model}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-800"></div>
              <span className="text-xs text-gray-600">Integrações Diretas (Opcional)</span>
              <div className="flex-1 h-px bg-gray-800"></div>
            </div>

            {/* OpenAI */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="p-5 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400 font-bold">
                      AI
                    </div>
                    <div>
                      <h3 className="font-bold text-white">OpenAI (Direto)</h3>
                      <p className="text-xs text-gray-500">GPT-4o, GPT-4o Mini</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {openaiStatus === 'success' && <Icons.CheckCircle size={20} className="text-green-400" />}
                    {openaiStatus === 'error' && <Icons.AlertCircle size={20} className="text-red-400" />}
                    {apiConfig.openai_key && (
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                        Configurada
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-5">
                <label className="block text-xs text-gray-500 mb-2">API Key</label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type={showOpenAI ? 'text' : 'password'}
                      value={apiConfig.openai_key || ''}
                      onChange={(e) => setApiConfig({ openai_key: e.target.value })}
                      placeholder="sk-..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white pr-10 focus:border-orange-500 focus:outline-none font-mono text-sm"
                    />
                    <button
                      onClick={() => setShowOpenAI(!showOpenAI)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showOpenAI ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                    </button>
                  </div>
                  <button
                    onClick={handleTestOpenAI}
                    disabled={!apiConfig.openai_key || testingOpenAI}
                    className="px-4 py-2.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 disabled:opacity-50 flex items-center gap-2"
                  >
                    {testingOpenAI ? <Icons.Loader size={18} className="animate-spin" /> : <Icons.Zap size={18} />}
                    Testar
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Obtenha em{' '}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-orange-400 hover:underline">
                    platform.openai.com
                  </a>
                </p>
              </div>
            </div>

            {/* Gemini */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="p-5 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 font-bold">
                      G
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Google Gemini (Direto)</h3>
                      <p className="text-xs text-gray-500">Gemini 2.0 Flash, 1.5 Pro</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {geminiStatus === 'success' && <Icons.CheckCircle size={20} className="text-green-400" />}
                    {geminiStatus === 'error' && <Icons.AlertCircle size={20} className="text-red-400" />}
                    {apiConfig.gemini_key && (
                      <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                        Configurada
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-5">
                <label className="block text-xs text-gray-500 mb-2">API Key</label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type={showGemini ? 'text' : 'password'}
                      value={apiConfig.gemini_key || ''}
                      onChange={(e) => setApiConfig({ gemini_key: e.target.value })}
                      placeholder="AIza..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white pr-10 focus:border-orange-500 focus:outline-none font-mono text-sm"
                    />
                    <button
                      onClick={() => setShowGemini(!showGemini)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showGemini ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                    </button>
                  </div>
                  <button
                    onClick={handleTestGemini}
                    disabled={!apiConfig.gemini_key || testingGemini}
                    className="px-4 py-2.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 disabled:opacity-50 flex items-center gap-2"
                  >
                    {testingGemini ? <Icons.Loader size={18} className="animate-spin" /> : <Icons.Zap size={18} />}
                    Testar
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Obtenha em{' '}
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-orange-400 hover:underline">
                    aistudio.google.com
                  </a>
                </p>
              </div>
            </div>

            {/* Info */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Icons.Info size={20} className="text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-white mb-1">💡 Dica: Use OpenRouter!</h4>
                  <p className="text-sm text-gray-400">
                    Com OpenRouter você acessa modelos gratuitos + todos os modelos premium (GPT-4, Claude, Gemini) 
                    com uma única chave. Ideal para testar e economizar!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Social Media Tab */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            {/* Late API Key Card */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="p-5 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold">
                      L
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Late API</h3>
                      <p className="text-xs text-gray-500">Publicação automática em redes sociais</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lateStatus === 'success' && <Icons.CheckCircle size={20} className="text-green-400" />}
                    {lateStatus === 'error' && <Icons.AlertCircle size={20} className="text-red-400" />}
                    {apiConfig.late_api_key && lateStatus === 'success' && (
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                        Conectada
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-5">
                <label className="block text-xs text-gray-500 mb-2">API Key</label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type={showLate ? 'text' : 'password'}
                      value={apiConfig.late_api_key || ''}
                      onChange={(e) => setApiConfig({ late_api_key: e.target.value })}
                      placeholder="Sua API Key do Late..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white pr-10 focus:border-orange-500 focus:outline-none font-mono text-sm"
                    />
                    <button
                      onClick={() => setShowLate(!showLate)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showLate ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                    </button>
                  </div>
                  <button
                    onClick={handleTestLate}
                    disabled={!apiConfig.late_api_key || testingLate}
                    className="px-4 py-2.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 disabled:opacity-50 flex items-center gap-2"
                  >
                    {testingLate ? (
                      <Icons.Loader size={18} className="animate-spin" />
                    ) : (
                      <Icons.Zap size={18} />
                    )}
                    Conectar
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-gray-600">
                    Crie sua conta grátis em{' '}
                    <a
                      href="https://getlate.dev"
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-400 hover:underline"
                    >
                      getlate.dev
                    </a>
                    {' '}(10 posts/mês grátis!)
                  </p>
                  {apiConfig.late_api_key && lateStatus === 'success' && (
                    <button
                      onClick={fetchConnectedAccounts}
                      disabled={loadingAccounts}
                      className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                    >
                      {loadingAccounts ? (
                        <Icons.Loader size={12} className="animate-spin" />
                      ) : (
                        <Icons.RefreshCw size={12} />
                      )}
                      Atualizar contas
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Connected Channels Grid */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="p-5 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white">Canais Conectados</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Conecte suas redes sociais para publicar automaticamente
                    </p>
                  </div>
                  {apiConfig.late_api_key && lateStatus === 'success' && (
                    <button
                      onClick={handleConnectAccount}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition"
                    >
                      <Icons.Plus size={16} />
                      Conectar Conta
                    </button>
                  )}
                </div>
              </div>
              
              <div className="p-5">
                {!apiConfig.late_api_key || lateStatus !== 'success' ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icons.Link size={32} className="text-gray-600" />
                    </div>
                    <p className="text-gray-400 mb-2">Configure sua API Key do Late primeiro</p>
                    <p className="text-xs text-gray-600">
                      Depois você poderá conectar suas redes sociais
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {SOCIAL_CHANNELS.map((channel) => {
                      const isConnected = isChannelConnected(channel.id);
                      const isSupported = isChannelSupported(channel.id);
                      const account = getConnectedAccount(channel.id);
                      
                      return (
                        <div
                          key={channel.id}
                          className={`relative p-4 rounded-xl border transition ${
                            isConnected
                              ? 'bg-gray-800/50 border-green-500/30'
                              : isSupported
                              ? 'bg-gray-800/30 border-gray-700 hover:border-gray-600'
                              : 'bg-gray-800/20 border-gray-800 opacity-50'
                          }`}
                        >
                          {channel.id === 'threads' && (
                            <span className="absolute -top-2 -right-2 text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold">
                              NOVO
                            </span>
                          )}
                          
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                              style={{ backgroundColor: `${channel.color}20` }}
                            >
                              {channel.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-white text-sm">{channel.label}</h4>
                              {isConnected && account && (
                                <p className="text-xs text-gray-500 truncate">
                                  @{account.username || account.name}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {isConnected ? (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                              <span className="text-xs text-green-400">Conectado</span>
                            </div>
                          ) : isSupported ? (
                            <button
                              onClick={handleConnectAccount}
                              className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-medium transition"
                            >
                              Conectar
                            </button>
                          ) : (
                            <span className="text-xs text-gray-600">Em breve</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
