import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store';
import { Icons } from '../components/Icons';
import { SOCIAL_CHANNELS, MediaFile, SocialChannel } from '../types';
import toast from 'react-hot-toast';

// Componente de Carrossel de Mídia para Aprovação
const ApprovalMediaCarousel = ({ media }: { media: MediaFile[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (media.length === 0) {
    return (
      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <span className="text-5xl">🖼️</span>
          <p className="text-sm mt-2">Sem mídia</p>
        </div>
      </div>
    );
  }

  const currentMedia = media[currentIndex];
  const isVideo = currentMedia.type === 'video' ||
    currentMedia.url?.match(/\.(mp4|webm|mov|avi)$/i) ||
    currentMedia.name?.match(/\.(mp4|webm|mov|avi)$/i);

  const goToPrev = () => {
    if (videoRef.current) videoRef.current.pause();
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const goToNext = () => {
    if (videoRef.current) videoRef.current.pause();
    setCurrentIndex(Math.min(media.length - 1, currentIndex + 1));
  };

  return (
    <div className="relative">
      {/* Mídia Principal */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {isVideo ? (
          <video
            ref={videoRef}
            src={currentMedia.url}
            className="w-full h-full object-contain bg-black"
            controls
            playsInline
            poster={currentMedia.thumbnail}
          />
        ) : (
          <img
            src={currentMedia.url}
            alt={currentMedia.name || 'Mídia'}
            className="w-full h-full object-cover"
          />
        )}

        {/* Badge de Vídeo */}
        {isVideo && (
          <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Icons.Play size={12} />
            Vídeo
          </div>
        )}

        {/* Contador */}
        {media.length > 1 && (
          <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
            {currentIndex + 1}/{media.length}
          </div>
        )}

        {/* Navegação */}
        {media.length > 1 && (
          <>
            <button
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Icons.ChevronLeft size={20} className="text-gray-700" />
            </button>
            <button
              onClick={goToNext}
              disabled={currentIndex === media.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Icons.ChevronRight size={20} className="text-gray-700" />
            </button>
          </>
        )}
      </div>

      {/* Dots Indicadores */}
      {media.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {media.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (videoRef.current) videoRef.current.pause();
                setCurrentIndex(idx);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex
                  ? 'bg-white w-4'
                  : 'bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}

      {/* Thumbnails */}
      {media.length > 1 && (
        <div className="flex gap-2 p-3 bg-gray-50 overflow-x-auto">
          {media.map((m, idx) => {
            const isThumbVideo = m.type === 'video' ||
              m.url?.match(/\.(mp4|webm|mov|avi)$/i) ||
              m.name?.match(/\.(mp4|webm|mov|avi)$/i);

            return (
              <button
                key={m.id}
                onClick={() => {
                  if (videoRef.current) videoRef.current.pause();
                  setCurrentIndex(idx);
                }}
                className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === currentIndex
                    ? 'border-orange-500 ring-2 ring-orange-500/30'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                {isThumbVideo ? (
                  <>
                    <video
                      src={m.url}
                      className="w-full h-full object-cover"
                      muted
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Icons.Play size={16} className="text-white" />
                    </div>
                  </>
                ) : (
                  <img
                    src={m.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Mapeamento de ícones de canais sociais
const ChannelIcon = ({ channel, size = 20 }: { channel: SocialChannel; size?: number }) => {
  const iconMap: Record<SocialChannel, React.ReactNode> = {
    instagram: <Icons.Instagram size={size} className="text-[#E4405F]" />,
    facebook: <Icons.Facebook size={size} className="text-[#1877F2]" />,
    tiktok: <Icons.TikTok size={size} />,
    youtube: <Icons.YouTube size={size} className="text-[#FF0000]" />,
    linkedin: <Icons.LinkedIn size={size} className="text-[#0A66C2]" />,
    twitter: <Icons.Twitter size={size} />,
    pinterest: <Icons.Pinterest size={size} className="text-[#E60023]" />,
    threads: <Icons.Threads size={size} />,
    google_business: <Icons.Google size={size} className="text-[#4285F4]" />,
  };

  return iconMap[channel] || null;
};

export const ApprovalPage = () => {
  const { token } = useParams<{ token: string }>();
  const { demands, clients, approveByExternal, requestAdjustmentByExternal, approveAllPendingByToken, recordApprovalLinkView } = useStore();

  // Registrar visualização apenas uma vez por sessão
  const hasRecordedView = useRef(false);
  useEffect(() => {
    if (token && !hasRecordedView.current) {
      recordApprovalLinkView(token);
      hasRecordedView.current = true;
    }
  }, [token, recordApprovalLinkView]);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Find demands for this approval token
  const pendingDemands = useMemo(() => {
    return demands.filter(
      (d) => d.approval_token === token && d.status === 'aprovacao_cliente'
    );
  }, [demands, token]);

  const currentDemand = pendingDemands[currentIndex];
  const client = currentDemand ? clients.find((c) => c.id === currentDemand.client_id) : null;
  
  // Get approver info from first demand
  const approver = pendingDemands[0]?.external_approvers[0];
  const approverName = approver?.approver_name || client?.name || 'Aprovador';
  const approverEmail = approver?.approver_email || client?.email || '';

  if (!currentDemand) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-xl">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Todas aprovadas!</h1>
          <p className="text-gray-500">Todas as demandas já foram aprovadas ou o link é inválido.</p>
        </div>
      </div>
    );
  }

  const handleApprove = () => {
    const approverId = currentDemand.external_approvers[0]?.approver_id;
    if (approverId) {
      approveByExternal(currentDemand.id, approverId, approverName);
    }
    toast.success('Demanda aprovada!');
    
    if (currentIndex < pendingDemands.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleApproveAll = () => {
    approveAllPendingByToken(token!, approverName);
    toast.success('Todas as demandas aprovadas!');
  };

  const handleRequestAdjustment = () => {
    if (!feedback.trim()) {
      toast.error('Por favor, descreva os ajustes necessários');
      return;
    }
    const approverId = currentDemand.external_approvers[0]?.approver_id;
    if (approverId) {
      requestAdjustmentByExternal(currentDemand.id, approverId, feedback, approverName);
    }
    toast.success('Solicitação de ajuste enviada!');
    setShowFeedbackModal(false);
    setFeedback('');
    
    if (currentIndex < pendingDemands.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrev = () => setCurrentIndex(Math.max(0, currentIndex - 1));
  const goToNext = () => setCurrentIndex(Math.min(pendingDemands.length - 1, currentIndex + 1));

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header - mLabs Style */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="font-bold text-xl text-gray-900">BASE Agency</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Online
          </div>
        </div>
      </header>

      {/* Info Banner */}
      <div className="bg-orange-50 border-b border-orange-100 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-2 text-orange-700 text-sm">
          <span>🔗</span>
          <span>Este link é de uso pessoal do aprovador da demanda.</span>
        </div>
      </div>

      {/* Approver Info Card */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {approverName.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{approverName}</div>
              <div className="text-sm text-gray-500">{approverEmail}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-medium">
            <span>⚠️</span>
            <span>{pendingDemands.length} demanda(s) com aprovação pendente</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Title Bar */}
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <span className="text-xl">📋</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Aprovação</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Pagination */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5">
                <span className="text-sm text-gray-600">
                  {currentIndex + 1} / {pendingDemands.length}
                </span>
              </div>
              {/* Filters */}
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
              >
                <Icons.Filter size={18} />
                <span className="text-sm">Filtros</span>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-8 flex items-center justify-center">
            <div className="w-full max-w-md">
              {/* Navigation Arrows */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={goToPrev}
                  disabled={currentIndex === 0}
                  className="p-3 rounded-full bg-gray-100 text-gray-600 disabled:opacity-30 hover:bg-gray-200 transition"
                >
                  <Icons.ChevronLeft size={24} />
                </button>
                <button
                  onClick={goToNext}
                  disabled={currentIndex === pendingDemands.length - 1}
                  className="p-3 rounded-full bg-gray-100 text-gray-600 disabled:opacity-30 hover:bg-gray-200 transition"
                >
                  <Icons.ChevronRight size={24} />
                </button>
              </div>

              {/* Card Preview - mLabs Style */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
                {/* Card Header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{currentDemand.title}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icons.ChevronLeft size={16} className="text-gray-400" />
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: client?.color || '#666' }}>
                          {client?.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{client?.name}</span>
                      </div>
                      <Icons.ChevronRight size={16} className="text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Date Info */}
                <div className="px-4 py-2 flex items-center gap-2 text-xs text-gray-500 border-b border-gray-100">
                  <Icons.Calendar size={12} />
                  <span>Data da publicação:</span>
                </div>
                <div className="px-4 py-2 flex items-center gap-2 text-xs border-b border-gray-200">
                  <span className="text-orange-500">📅</span>
                  <span className="text-orange-600 font-medium">
                    {currentDemand.scheduled_date 
                      ? `${new Date(currentDemand.scheduled_date).toLocaleDateString('pt-BR')} às ${currentDemand.scheduled_time || '00:00'}`
                      : 'Data não definida'}
                  </span>
                </div>

                {/* Media Preview - Carrossel com Vídeo */}
                <ApprovalMediaCarousel media={currentDemand.media} />

                {/* Caption Section */}
                <div className="p-4">
                  {/* Channels - Ícones SVG */}
                  <div className="flex gap-2 mb-3">
                    {currentDemand.channels.map((ch) => (
                      <div
                        key={ch}
                        className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"
                        title={SOCIAL_CHANNELS.find((c) => c.id === ch)?.label}
                      >
                        <ChannelIcon channel={ch} size={18} />
                      </div>
                    ))}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span>✨</span> {currentDemand.title}
                  </h3>

                  {/* Caption Text */}
                  {currentDemand.caption && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {currentDemand.caption}
                    </p>
                  )}

                  {/* Hashtags */}
                  {currentDemand.hashtags && (
                    <p className="text-sm text-blue-500 mt-3">{currentDemand.hashtags}</p>
                  )}

                  {/* Call to Action */}
                  {currentDemand.briefing && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500">{currentDemand.briefing}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Fixed Bottom - mLabs Style */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-4">
          {/* Approve All */}
          <button
            onClick={handleApproveAll}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium px-4 py-2"
          >
            <span>✓✓</span> Aprovar todas
          </button>
          
          {/* Approve */}
          <button
            onClick={handleApprove}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-xl font-medium transition shadow-lg shadow-green-500/30"
          >
            <span>👍</span> Aprovar
          </button>
          
          {/* Request Adjustment */}
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-xl font-medium transition shadow-lg shadow-red-500/30"
          >
            <span>✏️</span> Ajustar
          </button>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>✏️</span> Solicitar Ajustes
              </h2>
              <p className="text-sm text-gray-500 mt-1">Descreva o que precisa ser ajustado nesta demanda</p>
            </div>
            
            <div className="p-6">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Ex: A imagem precisa ter mais destaque para o logo. O texto está muito longo para o formato Stories..."
                rows={5}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none resize-none"
                autoFocus
              />
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => { setShowFeedbackModal(false); setFeedback(''); }}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-900 transition font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleRequestAdjustment}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition font-medium"
              >
                Enviar Ajustes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed bottom bar */}
      <div className="h-24"></div>
    </div>
  );
};
