import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { Icons } from '../components/Icons';
import { SocialChannel, SOCIAL_CHANNELS, MediaFile } from '../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export const ContentCreatorPage = () => {
  const navigate = useNavigate();
  const { demandId } = useParams<{ demandId: string }>();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('from') || '/workflow';

  const {
    demands, clients, updateDemand, moveDemand, apiConfig
  } = useStore();

  const demand = demands.find(d => d.id === demandId);
  const client = demand ? clients.find(c => c.id === demand.client_id) : null;

  // Form state
  const [caption, setCaption] = useState(demand?.caption || '');
  const [hashtags, setHashtags] = useState(demand?.hashtags || '');
  const [firstComment, setFirstComment] = useState('');
  const [media, setMedia] = useState<MediaFile[]>(demand?.media || []);
  const [selectedChannels, setSelectedChannels] = useState<SocialChannel[]>(demand?.channels || []);
  const [scheduledDate, setScheduledDate] = useState(demand?.scheduled_date || '');
  const [scheduledTime, setScheduledTime] = useState(demand?.scheduled_time || '');

  // Advanced Settings
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [disableComments, setDisableComments] = useState(false);
  const [collaborator, setCollaborator] = useState('');
  const [location, setLocation] = useState('');
  const [altText, setAltText] = useState('');

  // Preview
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!demand) {
      toast.error('Demanda não encontrada');
      navigate('/workflow');
    }
  }, [demand, navigate]);

  if (!demand || !client) {
    return null;
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const newMedia: MediaFile = {
          id: `media_${Date.now()}_${Math.random()}`,
          url,
          type: file.type.startsWith('video') ? 'video' : file.type.startsWith('image') ? 'image' : 'document',
          name: file.name,
        };
        setMedia((prev) => [...prev, newMedia]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeMedia = (id: string) => {
    setMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const toggleChannel = (channel: SocialChannel) => {
    setSelectedChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const generateCaptionWithAI = async () => {
    if (!apiConfig.gemini_key && !apiConfig.openrouter_key) {
      toast.error('Configure uma API Key nas configurações');
      return;
    }

    setIsGeneratingCaption(true);
    try {
      const prompt = `Crie uma legenda criativa e engajadora para um post de ${demand.content_type} sobre: ${demand.title}.
Briefing: ${demand.briefing}
Tom: Profissional mas amigável
Inclua um CTA (call-to-action) no final.
Máximo 2200 caracteres.
Não inclua hashtags na resposta.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiConfig.gemini_key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      const generatedCaption = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      setCaption(generatedCaption.trim());
      toast.success('Legenda gerada com IA!');
    } catch (error) {
      toast.error('Erro ao gerar legenda');
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const saveDemand = () => {
    updateDemand(demand.id, {
      caption,
      hashtags,
      media,
      channels: selectedChannels,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
    });
    toast.success('Demanda salva!');
  };

  const sendToDesigner = () => {
    saveDemand();
    moveDemand(demand.id, 'design');
    toast.success('Enviado para Designer!');
    navigate(returnTo);
  };

  const sendToRedator = () => {
    saveDemand();
    moveDemand(demand.id, 'conteudo');
    toast.success('Enviado para Redator!');
    navigate(returnTo);
  };

  const sendToApproval = () => {
    if (!caption && media.length === 0) {
      toast.error('Adicione uma legenda ou mídia antes de enviar');
      return;
    }
    saveDemand();
    const nextStatus = demand.skip_internal_approval ? 'aprovacao_cliente' : 'aprovacao_interna';
    moveDemand(demand.id, nextStatus);
    toast.success('Enviado para aprovação!');
    navigate(returnTo);
  };

  const getCharCount = () => caption.length;
  const getHashtagCount = () => {
    const tags = hashtags.trim().split(/\s+/).filter(t => t.startsWith('#'));
    return tags.length;
  };

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(returnTo)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            <Icons.ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-white font-semibold">{demand.title}</h1>
            <p className="text-xs text-gray-500">{client.name}</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdvancedSettings(true)}
          className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition text-sm"
        >
          <Icons.Settings size={16} />
          Configs avançadas
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel - Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Profile & Channels */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  1. Selecione perfis
                </label>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: client.color }}
                  >
                    {client.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{client.name}</p>
                    <p className="text-xs text-gray-500">{client.company}</p>
                  </div>
                  <Icons.ChevronDown size={16} className="text-gray-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  2. Selecione canais
                </label>
                <div className="flex flex-wrap gap-2">
                  {SOCIAL_CHANNELS.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => toggleChannel(ch.id)}
                      className={clsx(
                        'w-10 h-10 rounded-lg flex items-center justify-center text-lg transition border-2',
                        selectedChannels.includes(ch.id)
                          ? 'border-orange-500 bg-orange-500/20'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      )}
                      title={ch.label}
                    >
                      {ch.icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: Text Content */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  3. Texto do post
                </label>
                <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-2 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Todos</span>
                      {selectedChannels.slice(0, 3).map(ch => {
                        const channel = SOCIAL_CHANNELS.find(c => c.id === ch);
                        return channel ? <span key={ch} className="text-sm">{channel.icon}</span> : null;
                      })}
                    </div>
                    <button className="p-1 text-gray-500 hover:text-red-400">
                      <Icons.Trash size={14} />
                    </button>
                  </div>

                  <button
                    onClick={generateCaptionWithAI}
                    disabled={isGeneratingCaption}
                    className="w-full p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 text-sm font-medium hover:from-purple-500/30 hover:to-pink-500/30 transition flex items-center justify-center gap-2 border-b border-gray-700"
                  >
                    {isGeneratingCaption ? (
                      <Icons.Loader size={16} className="animate-spin" />
                    ) : (
                      <Icons.Sparkles size={16} />
                    )}
                    Criar legenda - IA
                  </button>

                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Digite o seu texto..."
                    rows={6}
                    className="w-full bg-transparent px-4 py-3 text-white placeholder-gray-500 focus:outline-none resize-none text-sm"
                  />

                  <div className="flex items-center justify-between px-4 py-2 border-t border-gray-700">
                    <div className="flex items-center gap-2">
                      <button className="p-1 text-gray-500 hover:text-orange-400">●</button>
                      <button className="p-1 text-gray-500 hover:text-orange-400">
                        <Icons.Search size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-2 py-1">
                      <Icons.ChevronLeft size={14} className="text-gray-500" />
                      <span className="text-xs text-gray-400">{client.name}</span>
                      <Icons.ChevronRight size={14} className="text-gray-500" />
                    </div>
                  </div>

                  <div className="px-4 py-2 border-t border-gray-700">
                    <input
                      type="text"
                      value={hashtags}
                      onChange={(e) => setHashtags(e.target.value)}
                      placeholder="Digite hashtags... #exemplo #post"
                      className="w-full bg-transparent text-blue-400 placeholder-gray-600 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between px-4 py-2 border-t border-gray-700 text-xs text-gray-500">
                    <span>{getHashtagCount()} hashtags</span>
                    <span>{getCharCount()} / 2200</span>
                  </div>
                </div>

                {/* Formatting buttons */}
                <div className="flex items-center gap-1 mt-2">
                  <button className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg">
                    <Icons.Sparkles size={14} />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg">
                    <Icons.Link size={14} />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg">
                    <Icons.Hash size={14} />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg">
                    <Icons.File size={14} />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg">
                    <Icons.RefreshCw size={14} />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg">
                    <Icons.List size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Column 3: Media & Schedule */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  4. Mídias
                </label>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition"
                    >
                      <Icons.Image size={16} />
                      Editor
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-sm text-blue-400 transition">
                      🎨 Canva
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition"
                    >
                      <Icons.Upload size={16} />
                      Upload
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div className="text-xs text-gray-500 text-center py-2">
                    {media.length} imagens, 0 vídeos
                  </div>

                  {media.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {media.map((m) => (
                        <div key={m.id} className="relative aspect-square group">
                          {m.type === 'video' ? (
                            <video src={m.url} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <img src={m.url} alt={m.name} className="w-full h-full object-cover rounded-lg" />
                          )}
                          <button
                            onClick={() => removeMedia(m.id)}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                          >
                            <Icons.X size={12} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-orange-500/50 transition"
                    >
                      <Icons.Image size={32} className="mx-auto text-gray-600 mb-2" />
                      <p className="text-sm text-gray-500">Imagens, vídeos ou documentos</p>
                      <p className="text-xs text-gray-600">Envie arquivos...</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  5. Data e horário
                </label>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    {selectedChannels.slice(0, 1).map(ch => {
                      const channel = SOCIAL_CHANNELS.find(c => c.id === ch);
                      return channel ? <span key={ch}>{channel.icon}</span> : null;
                    })}
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="flex-1 bg-transparent text-white focus:outline-none"
                    />
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="bg-transparent text-white focus:outline-none"
                    />
                  </div>

                  <button className="w-full py-2 text-sm text-orange-400 hover:text-orange-300 flex items-center justify-center gap-2">
                    <Icons.Plus size={14} />
                    Incluir mais
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <p className="text-sm font-medium text-gray-300">Preview</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Phone mockup */}
            <div className="bg-white rounded-3xl p-2 shadow-xl max-w-xs mx-auto">
              <div className="bg-gray-100 rounded-2xl overflow-hidden">
                {/* Post header */}
                <div className="bg-white px-3 py-2 flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: client.color }}
                  >
                    {client.name.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-gray-900">{client.name}</span>
                </div>

                {/* Media */}
                <div className="aspect-square bg-gray-200 relative">
                  {media.length > 0 ? (
                    <img src={media[0].url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Icons.Image size={48} />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="bg-white px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icons.Heart size={20} className="text-gray-700" />
                    <Icons.MessageCircle size={20} className="text-gray-700" />
                    <Icons.Send size={20} className="text-gray-700" />
                  </div>
                  <Icons.Bookmark size={20} className="text-gray-700" />
                </div>

                {/* Caption */}
                <div className="bg-white px-3 pb-3">
                  <p className="text-xs text-gray-900 line-clamp-3">
                    <span className="font-medium">{client.name}</span>{' '}
                    {caption || 'Sua legenda aparecerá aqui...'}
                  </p>
                  {hashtags && (
                    <p className="text-xs text-blue-500 mt-1">{hashtags}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center">
              &lt;&lt; Ver todos
            </p>
          </div>
        </div>
      </div>

      {/* Footer - Action Buttons */}
      <footer className="h-16 bg-gray-900 border-t border-gray-800 flex items-center justify-between px-6">
        <button
          onClick={() => { saveDemand(); navigate(returnTo); }}
          className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition"
        >
          <Icons.Save size={16} />
          Salvar e continuar depois
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={sendToDesigner}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-xl transition"
          >
            🎨 Enviar p/ designer
          </button>
          <button
            onClick={sendToRedator}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl transition"
          >
            📝 Enviar p/ redator
          </button>
          <button
            onClick={sendToApproval}
            className="flex items-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition font-medium"
          >
            <Icons.Check size={16} />
            Enviar p/ aprovação
          </button>
        </div>
      </footer>

      {/* Advanced Settings Modal */}
      {showAdvancedSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowAdvancedSettings(false)} className="text-gray-400 hover:text-white">
                  <Icons.ArrowLeft size={20} />
                </button>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  📸 Instagram
                </h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <p className="text-sm text-gray-400">
                É necessário o envio de alguma mídia para marcar as pessoas.
              </p>

              {/* Disable Comments */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">💬</span>
                  <span className="text-white text-sm">Desativar comentários</span>
                </div>
                <button
                  onClick={() => setDisableComments(!disableComments)}
                  className={clsx(
                    'w-12 h-6 rounded-full transition relative',
                    disableComments ? 'bg-orange-500' : 'bg-gray-600'
                  )}
                >
                  <div className={clsx(
                    'w-5 h-5 bg-white rounded-full absolute top-0.5 transition',
                    disableComments ? 'left-6' : 'left-0.5'
                  )} />
                </button>
              </div>

              {/* Instagram Shop */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg">🛒</span>
                  <span className="text-white text-sm">Instagram shop</span>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-sm text-blue-400">
                    ℹ️ Se você já utiliza o Instagram Shopping, clique aqui para marcar seus produtos no post.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button className="text-xs text-gray-400 hover:text-white">Não exibir mais</button>
                    <button className="text-xs text-blue-400 hover:text-blue-300">Próximo</button>
                  </div>
                </div>
              </div>

              {/* First Comment */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg">💬</span>
                  <span className="text-white text-sm">Primeiro comentário</span>
                </div>
                <textarea
                  value={firstComment}
                  onChange={(e) => setFirstComment(e.target.value)}
                  placeholder="Digite o primeiro comentário..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none text-sm"
                />
              </div>

              {/* Collaborator */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg">👥</span>
                  <span className="text-white text-sm">Colaborador</span>
                </div>
                <input
                  type="text"
                  value={collaborator}
                  onChange={(e) => setCollaborator(e.target.value)}
                  placeholder="@username do colaborador"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none text-sm"
                />
              </div>

              {/* Location */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg">📍</span>
                  <span className="text-white text-sm">Localização</span>
                </div>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Buscar localização..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none text-sm"
                />
              </div>

              {/* Tagged Users */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg">👤</span>
                  <span className="text-white text-sm">Marcação de pessoas</span>
                </div>
                <input
                  type="text"
                  placeholder="@username1, @username2..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none text-sm"
                />
              </div>

              {/* Alt Text */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg">📝</span>
                  <span className="text-white text-sm">Texto alternativo</span>
                </div>
                <textarea
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Descrição da imagem para acessibilidade..."
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none text-sm"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-800">
              <button
                onClick={() => setShowAdvancedSettings(false)}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition font-medium flex items-center justify-center gap-2"
              >
                <Icons.ChevronLeft size={16} />
                Salvar e voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
