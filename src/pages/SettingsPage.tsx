import { useState, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { TeamMemberRole, DEFAULT_ROLE_PERMISSIONS, TeamMember } from '../types';
import { lateService, LATE_SUPPORTED_PLATFORMS } from '../services/lateService';
import { openrouterService } from '../services/openrouterService';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface TeamMemberForm {
  name: string;
  email: string;
  phone?: string;
  role: TeamMemberRole;
  password: string;
}

const ROLE_LABELS: Record<TeamMemberRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  redator: 'Redator',
  designer: 'Designer',
  editor: 'Editor',
  viewer: 'Visualizador',
  both: 'Redator & Designer',
};

const PLATFORM_INFO: Record<string, { icon: string; label: string }> = {
  instagram: { icon: '📸', label: 'Instagram' },
  facebook: { icon: '👤', label: 'Facebook' },
  tiktok: { icon: '🎵', label: 'TikTok' },
  youtube: { icon: '▶️', label: 'YouTube' },
  linkedin: { icon: '💼', label: 'LinkedIn' },
  twitter: { icon: '🐦', label: 'Twitter/X' },
  threads: { icon: '🧵', label: 'Threads' },
  pinterest: { icon: '📌', label: 'Pinterest' },
};

export const SettingsPage: React.FC = () => {
  const { apiConfig, setApiConfig, teamMembers, addTeamMember, updateTeamMember, deleteTeamMember } = useStore();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'ai' | 'studio' | 'social' | 'team'>('ai');
  
  // API States
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [showLate, setShowLate] = useState(false);
  const [showOpenRouter, setShowOpenRouter] = useState(false);
  const [testingOpenAI, setTestingOpenAI] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [testingLate, setTestingLate] = useState(false);
  const [testingOpenRouter, setTestingOpenRouter] = useState(false);
  const [showFalAi, setShowFalAi] = useState(false);
  const [showElevenLabs, setShowElevenLabs] = useState(false);
  const [testingFalAi, setTestingFalAi] = useState(false);
  const [testingElevenLabs, setTestingElevenLabs] = useState(false);
  const [falaiStatus, setFalaiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [elevenlabsStatus, setElevenlabsStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [openaiStatus, setOpenaiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lateStatus, setLateStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [openrouterStatus, setOpenrouterStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Late connected accounts
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Team management
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [teamForm, setTeamForm] = useState<TeamMemberForm>({
    name: '',
    email: '',
    phone: '',
    role: 'editor',
    password: '',
  });

  // Initialize services with stored keys
  useEffect(() => {
    if (apiConfig.late_api_key) {
      lateService.setApiKey(apiConfig.late_api_key);
    }
    if (apiConfig.openrouter_key) {
      openrouterService.setApiKey(apiConfig.openrouter_key);
    }
  }, [apiConfig]);

  // Test OpenAI
  const testOpenAI = async () => {
    if (!apiConfig.openai_key) {
      toast.error('Insira a API Key primeiro');
      return;
    }
    setTestingOpenAI(true);
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiConfig.openai_key}` },
      });
      if (response.ok) {
        setOpenaiStatus('success');
        toast.success('OpenAI conectada com sucesso!');
      } else {
        throw new Error('Invalid key');
      }
    } catch {
      setOpenaiStatus('error');
      toast.error('API Key inválida');
    } finally {
      setTestingOpenAI(false);
    }
  };

  // Test Gemini
  const testGemini = async () => {
    if (!apiConfig.gemini_key) {
      toast.error('Insira a API Key primeiro');
      return;
    }
    setTestingGemini(true);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiConfig.gemini_key}`
      );
      if (response.ok) {
        setGeminiStatus('success');
        toast.success('Gemini conectado com sucesso!');
      } else {
        throw new Error('Invalid key');
      }
    } catch {
      setGeminiStatus('error');
      toast.error('API Key inválida');
    } finally {
      setTestingGemini(false);
    }
  };

  // Test OpenRouter
  const testOpenRouter = async () => {
    if (!apiConfig.openrouter_key) {
      toast.error('Insira a API Key primeiro');
      return;
    }
    setTestingOpenRouter(true);
    try {
      openrouterService.setApiKey(apiConfig.openrouter_key);
      const isValid = await openrouterService.validateApiKey();
      if (isValid) {
        setOpenrouterStatus('success');
        toast.success('OpenRouter conectado! Modelos gratuitos liberados!');
      } else {
        throw new Error('Invalid key');
      }
    } catch {
      setOpenrouterStatus('error');
      toast.error('API Key inválida');
    } finally {
      setTestingOpenRouter(false);
    }
  };

  // Test FAL.ai
  const testFalAi = async () => {
    if (!apiConfig.falai_key) {
      toast.error('Insira a API Key primeiro');
      return;
    }
    setTestingFalAi(true);
    try {
      const response = await fetch('https://fal.run/fal-ai/flux/dev', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiConfig.falai_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'test',
          image_size: 'square_hd',
          num_inference_steps: 1,
          num_images: 1,
        }),
      });
      // Even if it fails due to limits, a 401/403 means bad key, others are ok
      if (response.status !== 401 && response.status !== 403) {
        setFalaiStatus('success');
        toast.success('FAL.ai conectado com sucesso!');
      } else {
        throw new Error('Invalid key');
      }
    } catch {
      setFalaiStatus('error');
      toast.error('API Key inválida');
    } finally {
      setTestingFalAi(false);
    }
  };

  // Test ElevenLabs
  const testElevenLabs = async () => {
    if (!apiConfig.elevenlabs_key) {
      toast.error('Insira a API Key primeiro');
      return;
    }
    setTestingElevenLabs(true);
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': apiConfig.elevenlabs_key,
        },
      });
      if (response.ok) {
        setElevenlabsStatus('success');
        toast.success('ElevenLabs conectado com sucesso!');
      } else {
        throw new Error('Invalid key');
      }
    } catch {
      setElevenlabsStatus('error');
      toast.error('API Key inválida');
    } finally {
      setTestingElevenLabs(false);
    }
  };

  // Test Late API
  const testLate = async () => {
    if (!apiConfig.late_api_key) {
      toast.error('Insira a API Key primeiro');
      return;
    }
    setTestingLate(true);
    try {
      lateService.setApiKey(apiConfig.late_api_key);
      const isValid = await lateService.validateApiKey();
      if (isValid) {
        setLateStatus('success');
        toast.success('Late API conectada!');
        loadConnectedAccounts();
      } else {
        throw new Error('Invalid key');
      }
    } catch {
      setLateStatus('error');
      toast.error('API Key inválida');
    } finally {
      setTestingLate(false);
    }
  };

  // Load connected Late accounts
  const loadConnectedAccounts = async () => {
    if (!apiConfig.late_api_key) return;
    setLoadingAccounts(true);
    try {
      lateService.setApiKey(apiConfig.late_api_key);
      const accounts = await lateService.getAccounts();
      // Map to LateConnectedAccount format
      const connectedAccounts = accounts.map(acc => ({
        ...acc,
        platform: acc.platform as any,
        connectedAt: new Date().toISOString(),
      }));
      setApiConfig({ late_connected_accounts: connectedAccounts });
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Team Member Functions
  const resetTeamForm = () => {
    setTeamForm({ name: '', email: '', phone: '', role: 'editor', password: '' });
    setEditingMember(null);
  };

  const openEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setTeamForm({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      role: member.role as TeamMemberRole,
      password: '',
    });
    setShowTeamModal(true);
  };

  const handleSaveTeamMember = () => {
    if (!teamForm.name || !teamForm.email) {
      toast.error('Preencha nome e email');
      return;
    }
    
    const permissions = DEFAULT_ROLE_PERMISSIONS[teamForm.role];
    
    if (editingMember) {
      updateTeamMember(editingMember.id, {
        name: teamForm.name,
        email: teamForm.email,
        phone: teamForm.phone,
        role: teamForm.role,
        permissions,
      });
      toast.success('Membro atualizado!');
    } else {
      if (!teamForm.password) {
        toast.error('Defina uma senha para o novo membro');
        return;
      }
      addTeamMember({
        name: teamForm.name,
        email: teamForm.email,
        phone: teamForm.phone,
        role: teamForm.role,
        password: teamForm.password,
        permissions,
        is_active: true,
      });
      toast.success('Membro adicionado!');
    }
    
    setShowTeamModal(false);
    resetTeamForm();
  };

  const handleChangePassword = () => {
    if (!showPasswordModal || !newPassword) {
      toast.error('Digite a nova senha');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    updateTeamMember(showPasswordModal, { password: newPassword });
    toast.success('Senha alterada!');
    setShowPasswordModal(null);
    setNewPassword('');
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    updateTeamMember(id, { is_active: !currentActive });
    toast.success(currentActive ? 'Membro desativado' : 'Membro ativado');
  };

  const handleDeleteMember = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este membro?')) {
      deleteTeamMember(id);
      toast.success('Membro excluído');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-0">
      <h1 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">⚙️ Configurações</h1>

      {/* Tabs */}
      <div className="flex gap-1 md:gap-2 mb-4 md:mb-6 border-b border-gray-800 pb-3 md:pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ai')}
          className={clsx(
            'px-3 md:px-4 py-2 rounded-lg font-medium transition flex items-center gap-1 md:gap-2 text-sm md:text-base whitespace-nowrap',
            activeTab === 'ai' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          )}
        >
          <Icons.Bot size={16} /> <span className="hidden sm:inline">Inteligência</span> IA
        </button>
        <button
          onClick={() => setActiveTab('studio')}
          className={clsx(
            'px-3 md:px-4 py-2 rounded-lg font-medium transition flex items-center gap-1 md:gap-2 text-sm md:text-base whitespace-nowrap',
            activeTab === 'studio' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          )}
        >
          <Icons.Video size={16} /> Studio
        </button>
        <button
          onClick={() => setActiveTab('social')}
          className={clsx(
            'px-3 md:px-4 py-2 rounded-lg font-medium transition flex items-center gap-1 md:gap-2 text-sm md:text-base whitespace-nowrap',
            activeTab === 'social' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          )}
        >
          <Icons.Share size={16} /> <span className="hidden sm:inline">Redes</span> Social
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={clsx(
            'px-3 md:px-4 py-2 rounded-lg font-medium transition flex items-center gap-1 md:gap-2 text-sm md:text-base whitespace-nowrap',
            activeTab === 'team' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          )}
        >
          <Icons.Users size={16} /> Equipe
        </button>
      </div>

      {/* AI Tab */}
      {activeTab === 'ai' && (
        <div className="space-y-4 md:space-y-6">
          {/* OpenRouter - HIGHLIGHTED */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl md:rounded-2xl p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg md:rounded-xl flex items-center justify-center text-white text-lg md:text-xl">🌐</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">OpenRouter</h3>
                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-medium">RECOMENDADO</span>
                  </div>
                  <p className="text-sm text-gray-400">Acesse GPT-4, Claude, Gemini e modelos GRATUITOS</p>
                </div>
              </div>
              {openrouterStatus === 'success' && <span className="text-green-500 text-sm flex items-center gap-1"><Icons.Check size={16} /> Conectado</span>}
            </div>
            
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <input
                  type={showOpenRouter ? 'text' : 'password'}
                  value={apiConfig.openrouter_key || ''}
                  onChange={(e) => setApiConfig({ openrouter_key: e.target.value })}
                  placeholder="sk-or-v1-..."
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white pr-10 focus:border-purple-500 focus:outline-none"
                />
                <button onClick={() => setShowOpenRouter(!showOpenRouter)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {showOpenRouter ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                </button>
              </div>
              <button
                onClick={testOpenRouter}
                disabled={testingOpenRouter}
                className="px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 rounded-xl text-white font-medium transition"
              >
                {testingOpenRouter ? <Icons.Loader className="animate-spin" size={18} /> : 'Conectar'}
              </button>
            </div>

            <div className="bg-gray-900/50 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-2">🆓 Modelos Gratuitos Inclusos:</p>
              <div className="flex flex-wrap gap-2">
                {['Gemma 2 9B', 'Llama 3.2', 'Mistral 7B', 'Phi-3', 'Qwen 2', 'Zephyr'].map((model) => (
                  <span key={model} className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg">{model}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800"></div></div>
            <div className="relative flex justify-center"><span className="px-4 bg-gray-950 text-gray-500 text-sm">Integrações Diretas (Opcional)</span></div>
          </div>

          {/* OpenAI */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-xl">🤖</div>
                <div>
                  <h3 className="font-bold text-white">OpenAI</h3>
                  <p className="text-sm text-gray-500">GPT-4o, GPT-4o Mini</p>
                </div>
              </div>
              {openaiStatus === 'success' && <span className="text-green-500 text-sm flex items-center gap-1"><Icons.Check size={16} /> OK</span>}
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type={showOpenAI ? 'text' : 'password'}
                  value={apiConfig.openai_key || ''}
                  onChange={(e) => setApiConfig({ openai_key: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white pr-10 focus:border-orange-500 focus:outline-none"
                />
                <button onClick={() => setShowOpenAI(!showOpenAI)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {showOpenAI ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                </button>
              </div>
              <button onClick={testOpenAI} disabled={testingOpenAI} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-xl text-white transition">
                {testingOpenAI ? <Icons.Loader className="animate-spin" size={18} /> : 'Testar'}
              </button>
            </div>
          </div>

          {/* Gemini */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-xl">✨</div>
                <div>
                  <h3 className="font-bold text-white">Google Gemini</h3>
                  <p className="text-sm text-gray-500">Gemini 2.0 Flash, 1.5 Pro</p>
                </div>
              </div>
              {geminiStatus === 'success' && <span className="text-green-500 text-sm flex items-center gap-1"><Icons.Check size={16} /> OK</span>}
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type={showGemini ? 'text' : 'password'}
                  value={apiConfig.gemini_key || ''}
                  onChange={(e) => setApiConfig({ gemini_key: e.target.value })}
                  placeholder="AIza..."
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white pr-10 focus:border-orange-500 focus:outline-none"
                />
                <button onClick={() => setShowGemini(!showGemini)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {showGemini ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                </button>
              </div>
              <button onClick={testGemini} disabled={testingGemini} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-xl text-white transition">
                {testingGemini ? <Icons.Loader className="animate-spin" size={18} /> : 'Testar'}
              </button>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-sm text-blue-400">
              💡 <strong>Dica:</strong> Use OpenRouter! Com OpenRouter você acessa modelos gratuitos + todos os modelos premium (GPT-4, Claude, Gemini) com uma única chave.
            </p>
          </div>
        </div>
      )}

      {/* Studio Tab */}
      {activeTab === 'studio' && (
        <div className="space-y-4 md:space-y-6">
          {/* FAL.ai */}
          <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-xl md:rounded-2xl p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg md:rounded-xl flex items-center justify-center text-white text-lg md:text-xl">🖼️</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">FAL.ai</h3>
                    <span className="px-2 py-0.5 bg-pink-500 text-white text-xs rounded-full font-medium">IMAGENS + VÍDEOS</span>
                  </div>
                  <p className="text-sm text-gray-400">Gere imagens com Flux e vídeos com Kling/Minimax</p>
                </div>
              </div>
              {falaiStatus === 'success' && <span className="text-green-500 text-sm flex items-center gap-1"><Icons.Check size={16} /> Conectado</span>}
            </div>

            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <input
                  type={showFalAi ? 'text' : 'password'}
                  value={apiConfig.falai_key || ''}
                  onChange={(e) => setApiConfig({ falai_key: e.target.value })}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:xxxxxxxx..."
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white pr-10 focus:border-pink-500 focus:outline-none"
                />
                <button onClick={() => setShowFalAi(!showFalAi)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {showFalAi ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                </button>
              </div>
              <button
                onClick={testFalAi}
                disabled={testingFalAi}
                className="px-6 py-3 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 rounded-xl text-white font-medium transition"
              >
                {testingFalAi ? <Icons.Loader className="animate-spin" size={18} /> : 'Conectar'}
              </button>
            </div>

            <div className="bg-gray-900/50 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-2">🎨 Modelos Disponíveis:</p>
              <div className="flex flex-wrap gap-2">
                {['Flux Pro', 'Flux Dev', 'Kling Video', 'Minimax Video', 'Luma Dream Machine'].map((model) => (
                  <span key={model} className="px-2 py-1 bg-pink-500/20 text-pink-400 text-xs rounded-lg">{model}</span>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Obtenha sua chave em <a href="https://fal.ai" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">fal.ai</a> → Dashboard → API Keys
            </p>
          </div>

          {/* ElevenLabs */}
          <div className="bg-gradient-to-r from-green-500/20 to-teal-500/20 border border-green-500/30 rounded-xl md:rounded-2xl p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg md:rounded-xl flex items-center justify-center text-white text-lg md:text-xl">🎙️</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">ElevenLabs</h3>
                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-medium">NARRAÇÃO</span>
                  </div>
                  <p className="text-sm text-gray-400">Gere narrações com vozes realistas em português</p>
                </div>
              </div>
              {elevenlabsStatus === 'success' && <span className="text-green-500 text-sm flex items-center gap-1"><Icons.Check size={16} /> Conectado</span>}
            </div>

            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <input
                  type={showElevenLabs ? 'text' : 'password'}
                  value={apiConfig.elevenlabs_key || ''}
                  onChange={(e) => setApiConfig({ elevenlabs_key: e.target.value })}
                  placeholder="sk_..."
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white pr-10 focus:border-green-500 focus:outline-none"
                />
                <button onClick={() => setShowElevenLabs(!showElevenLabs)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {showElevenLabs ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                </button>
              </div>
              <button
                onClick={testElevenLabs}
                disabled={testingElevenLabs}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-xl text-white font-medium transition"
              >
                {testingElevenLabs ? <Icons.Loader className="animate-spin" size={18} /> : 'Conectar'}
              </button>
            </div>

            <div className="bg-gray-900/50 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-2">🗣️ Vozes em Português:</p>
              <div className="flex flex-wrap gap-2">
                {['Rodrigo', 'Giovanna', 'Antoni', 'Bella', 'Rachel', 'Thomas'].map((voice) => (
                  <span key={voice} className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg">{voice}</span>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Obtenha sua chave em <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">elevenlabs.io</a> → Profile Settings → API Keys
            </p>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
            <p className="text-sm text-purple-400">
              🎬 <strong>Creator Studio:</strong> Use o FAL.ai para gerar imagens e vídeos, e o ElevenLabs para criar narrações profissionais. Acesse o Creator Studio no menu lateral para criar vídeos completos com IA!
            </p>
          </div>
        </div>
      )}

      {/* Social Tab */}
      {activeTab === 'social' && (
        <div className="space-y-6">
          {/* Late API */}
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white text-xl">📱</div>
                <div>
                  <h3 className="text-lg font-bold text-white">Late API</h3>
                  <p className="text-sm text-gray-400">Publique em Instagram, TikTok, YouTube e mais</p>
                </div>
              </div>
              {lateStatus === 'success' && <span className="text-green-500 text-sm flex items-center gap-1"><Icons.Check size={16} /> Conectado</span>}
            </div>
            
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <input
                  type={showLate ? 'text' : 'password'}
                  value={apiConfig.late_api_key || ''}
                  onChange={(e) => setApiConfig({ late_api_key: e.target.value })}
                  placeholder="sk_..."
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white pr-10 focus:border-orange-500 focus:outline-none"
                />
                <button onClick={() => setShowLate(!showLate)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {showLate ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                </button>
              </div>
              <button
                onClick={testLate}
                disabled={testingLate}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl text-white font-medium transition"
              >
                {testingLate ? <Icons.Loader className="animate-spin" size={18} /> : 'Conectar'}
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Obtenha sua chave em <a href="https://late.chat" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">late.chat</a> → Settings → API Keys
            </p>

            {/* Connected Accounts */}
            {apiConfig.late_connected_accounts && apiConfig.late_connected_accounts.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-white">Contas Conectadas</h4>
                  <button 
                    onClick={loadConnectedAccounts} 
                    disabled={loadingAccounts}
                    className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                  >
                    <Icons.RefreshCw size={12} className={loadingAccounts ? 'animate-spin' : ''} /> Atualizar
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {apiConfig.late_connected_accounts.map((account) => (
                    <div key={account.id} className="flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm">
                        {account.platform === 'instagram' && '📸'}
                        {account.platform === 'tiktok' && '🎵'}
                        {account.platform === 'youtube' && '▶️'}
                        {account.platform === 'facebook' && '👤'}
                        {account.platform === 'linkedin' && '💼'}
                        {account.platform === 'twitter' && '🐦'}
                        {account.platform === 'threads' && '🧵'}
                        {account.platform === 'pinterest' && '📌'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{account.name || account.username}</p>
                        <p className="text-xs text-gray-500 capitalize">{account.platform}</p>
                      </div>
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <a 
                href="https://late.chat/profiles" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-sm text-center transition"
              >
                + Conectar Conta
              </a>
            </div>
          </div>

          {/* Supported Platforms */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4">Plataformas Suportadas</h3>
            <div className="grid grid-cols-3 gap-3">
              {LATE_SUPPORTED_PLATFORMS.map((platform) => (
                <div key={platform} className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
                  <span className="text-xl">{PLATFORM_INFO[platform]?.icon || '📱'}</span>
                  <span className="text-sm text-gray-300">{PLATFORM_INFO[platform]?.label || platform}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Gerenciar Equipe</h2>
              <p className="text-sm text-gray-500">Adicione membros e defina permissões</p>
            </div>
            <button
              onClick={() => { resetTeamForm(); setShowTeamModal(true); }}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-xl text-white font-medium transition flex items-center gap-2"
            >
              <Icons.Plus size={18} /> Adicionar Membro
            </button>
          </div>

          {/* Team Members List */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase">Membro</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase">Função</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {teamMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white font-medium">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">{member.name}</p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        'px-3 py-1 rounded-full text-xs font-medium',
                        member.role === 'admin' && 'bg-purple-500/20 text-purple-400',
                        member.role === 'manager' && 'bg-blue-500/20 text-blue-400',
                        member.role === 'redator' && 'bg-green-500/20 text-green-400',
                        member.role === 'designer' && 'bg-pink-500/20 text-pink-400',
                        member.role === 'editor' && 'bg-yellow-500/20 text-yellow-400',
                        member.role === 'viewer' && 'bg-gray-500/20 text-gray-400',
                      )}>
                        {ROLE_LABELS[member.role as TeamMemberRole] || member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        'px-3 py-1 rounded-full text-xs font-medium',
                        member.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      )}>
                        {member.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditMember(member)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                          title="Editar"
                        >
                          <Icons.Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setShowPasswordModal(member.id)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                          title="Alterar Senha"
                        >
                          <Icons.Key size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(member.id, member.is_active)}
                          className={clsx(
                            'p-2 rounded-lg transition',
                            member.is_active ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-green-400 hover:bg-green-500/20'
                          )}
                          title={member.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {member.is_active ? <Icons.UserMinus size={16} /> : <Icons.UserCheck size={16} />}
                        </button>
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                          title="Excluir"
                        >
                          <Icons.Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {teamMembers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      Nenhum membro cadastrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Permissions Info */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4">Níveis de Permissão</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(ROLE_LABELS).map(([role, label]) => {
                const perms = DEFAULT_ROLE_PERMISSIONS[role as TeamMemberRole];
                return (
                  <div key={role} className="p-4 bg-gray-800 rounded-xl">
                    <h4 className="font-medium text-white mb-2">{label}</h4>
                    <div className="space-y-1 text-xs">
                      {perms?.canManageTeam && <p className="text-green-400">✓ Gerenciar equipe</p>}
                      {perms?.canManageClients && <p className="text-green-400">✓ Gerenciar clientes</p>}
                      {perms?.canCreateDemands && <p className="text-green-400">✓ Criar demandas</p>}
                      {perms?.canEditDemands && <p className="text-green-400">✓ Editar demandas</p>}
                      {perms?.canApproveDemands && <p className="text-green-400">✓ Aprovar demandas</p>}
                      {perms?.canPublish && <p className="text-green-400">✓ Publicar</p>}
                      {perms?.canViewReports && <p className="text-green-400">✓ Ver relatórios</p>}
                      {perms?.canManageSettings && <p className="text-green-400">✓ Configurações</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Team Member Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTeamModal(false)}>
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">
              {editingMember ? 'Editar Membro' : 'Novo Membro'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome *</label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  placeholder="Nome completo"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email *</label>
                <input
                  type="email"
                  value={teamForm.email}
                  onChange={(e) => setTeamForm({ ...teamForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Telefone</label>
                <input
                  type="tel"
                  value={teamForm.phone}
                  onChange={(e) => setTeamForm({ ...teamForm, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Função *</label>
                <select
                  value={teamForm.role}
                  onChange={(e) => setTeamForm({ ...teamForm, role: e.target.value as TeamMemberRole })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              
              {!editingMember && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Senha *</label>
                  <input
                    type="password"
                    value={teamForm.password}
                    onChange={(e) => setTeamForm({ ...teamForm, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowTeamModal(false); resetTeamForm(); }}
                className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-xl hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTeamMember}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition"
              >
                {editingMember ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPasswordModal(null)}>
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Alterar Senha</h3>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nova Senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                autoFocus
              />
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowPasswordModal(null); setNewPassword(''); }}
                className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-xl hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePassword}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition"
              >
                Alterar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
