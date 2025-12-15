import { useState } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import toast from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
  const { apiConfig, setApiConfig } = useStore();
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [testingOpenAI, setTestingOpenAI] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [openaiStatus, setOpenaiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleTestOpenAI = async () => {
    if (!apiConfig.openai_key) return;
    setTestingOpenAI(true); setOpenaiStatus('idle');
    try {
      const response = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiConfig.openai_key}` } });
      const success = response.ok;
      setOpenaiStatus(success ? 'success' : 'error');
      toast[success ? 'success' : 'error'](success ? '✅ OpenAI OK!' : '❌ Erro OpenAI');
    } catch { setOpenaiStatus('error'); toast.error('❌ Erro OpenAI'); }
    setTestingOpenAI(false);
  };

  const handleTestGemini = async () => {
    if (!apiConfig.gemini_key) return;
    setTestingGemini(true); setGeminiStatus('idle');
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiConfig.gemini_key}`);
      const success = response.ok;
      setGeminiStatus(success ? 'success' : 'error');
      toast[success ? 'success' : 'error'](success ? '✅ Gemini OK!' : '❌ Erro Gemini');
    } catch { setGeminiStatus('error'); toast.error('❌ Erro Gemini'); }
    setTestingGemini(false);
  };

  return (
    <div className="h-full bg-gray-950 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-8"><h1 className="text-2xl font-bold text-white flex items-center gap-2"><Icons.Settings size={28} className="text-orange-400" />Configurações</h1><p className="text-gray-500">Configure suas integrações</p></div>
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-5 border-b border-gray-800"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400 font-bold">AI</div><div><h3 className="font-bold text-white">OpenAI</h3><p className="text-xs text-gray-500">GPT-4o, GPT-4o Mini</p></div></div><div className="flex items-center gap-2">{openaiStatus === 'success' && <Icons.CheckCircle size={20} className="text-green-400" />}{openaiStatus === 'error' && <Icons.AlertCircle size={20} className="text-red-400" />}{apiConfig.openai_key && <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">Configurada</span>}</div></div></div>
            <div className="p-5"><label className="block text-xs text-gray-500 mb-2">API Key</label><div className="flex gap-3"><div className="flex-1 relative"><input type={showOpenAI ? 'text' : 'password'} value={apiConfig.openai_key || ''} onChange={(e) => setApiConfig({ openai_key: e.target.value })} placeholder="sk-..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white pr-10 focus:border-orange-500 focus:outline-none font-mono text-sm" /><button onClick={() => setShowOpenAI(!showOpenAI)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showOpenAI ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}</button></div><button onClick={handleTestOpenAI} disabled={!apiConfig.openai_key || testingOpenAI} className="px-4 py-2.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 disabled:opacity-50 flex items-center gap-2">{testingOpenAI ? <Icons.Loader size={18} className="animate-spin" /> : <Icons.Zap size={18} />}Testar</button></div><p className="text-xs text-gray-600 mt-2">Obtenha em <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-orange-400 hover:underline">platform.openai.com</a></p></div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-5 border-b border-gray-800"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 font-bold">G</div><div><h3 className="font-bold text-white">Google Gemini</h3><p className="text-xs text-gray-500">Gemini 2.0 Flash, 1.5 Pro</p></div></div><div className="flex items-center gap-2">{geminiStatus === 'success' && <Icons.CheckCircle size={20} className="text-green-400" />}{geminiStatus === 'error' && <Icons.AlertCircle size={20} className="text-red-400" />}{apiConfig.gemini_key && <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">Configurada</span>}</div></div></div>
            <div className="p-5"><label className="block text-xs text-gray-500 mb-2">API Key</label><div className="flex gap-3"><div className="flex-1 relative"><input type={showGemini ? 'text' : 'password'} value={apiConfig.gemini_key || ''} onChange={(e) => setApiConfig({ gemini_key: e.target.value })} placeholder="AIza..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white pr-10 focus:border-orange-500 focus:outline-none font-mono text-sm" /><button onClick={() => setShowGemini(!showGemini)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showGemini ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}</button></div><button onClick={handleTestGemini} disabled={!apiConfig.gemini_key || testingGemini} className="px-4 py-2.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 disabled:opacity-50 flex items-center gap-2">{testingGemini ? <Icons.Loader size={18} className="animate-spin" /> : <Icons.Zap size={18} />}Testar</button></div><p className="text-xs text-gray-600 mt-2">Obtenha em <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-orange-400 hover:underline">aistudio.google.com</a></p></div>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-5"><div className="flex items-start gap-3"><Icons.Info size={20} className="text-orange-400 flex-shrink-0 mt-0.5" /><div><h4 className="font-medium text-white mb-1">Sobre as API Keys</h4><p className="text-sm text-gray-400">Suas chaves são armazenadas localmente no navegador. Recomendamos começar com o Gemini (tier gratuito generoso).</p></div></div></div>
        </div>
      </div>
    </div>
  );
};
