import { useState } from 'react';
import { Icons } from './Icons';
import { Demand, SOCIAL_CHANNELS, SocialChannel, PublishResult } from '../types';
import { lateService, LATE_SUPPORTED_PLATFORMS } from '../services/lateService';
import { useStore } from '../store';
import toast from 'react-hot-toast';

interface PublishModalProps {
  demand: Demand;
  onClose: () => void;
  onPublished: (result: PublishResult) => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({ demand, onClose, onPublished }) => {
  const { apiConfig } = useStore();
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<SocialChannel[]>(demand.channels);
  const [scheduleMode, setScheduleMode] = useState<'now' | 'scheduled'>('now');
  const [scheduleDate, setScheduleDate] = useState(demand.scheduled_date || '');
  const [scheduleTime, setScheduleTime] = useState(demand.scheduled_time || '12:00');

  // Check if Late is configured
  const isLateConfigured = !!apiConfig.late_api_key;
  const connectedAccounts = apiConfig.late_connected_accounts || [];

  // Filter only supported and connected channels
  const availableChannels = demand.channels.filter((ch) => {
    const lateId = ch === 'google_business' ? 'google' : ch;
    const isSupported = LATE_SUPPORTED_PLATFORMS.includes(lateId as any);
    const isConnected = connectedAccounts.some((acc) => acc.platform === ch);
    return isSupported && isConnected;
  });

  const toggleChannel = (channel: SocialChannel) => {
    if (selectedChannels.includes(channel)) {
      setSelectedChannels(selectedChannels.filter((c) => c !== channel));
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  const handlePublish = async () => {
    if (!isLateConfigured) {
      toast.error('Configure a Late API nas configurações primeiro!');
      return;
    }

    if (selectedChannels.length === 0) {
      toast.error('Selecione pelo menos um canal para publicar');
      return;
    }

    setPublishing(true);

    try {
      lateService.setApiKey(apiConfig.late_api_key!);

      // Prepare the post data
      const postData = lateService.convertDemandToLatePost({
        ...demand,
        channels: selectedChannels,
      });

      // Add schedule if needed
      if (scheduleMode === 'scheduled' && scheduleDate) {
        postData.scheduledTime = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
      }

      // Make the API call
      const response = await lateService.createPost(postData);

      // Build result
      const result: PublishResult = {
        demandId: demand.id,
        success: response.status !== 'failed',
        platforms: response.platforms.map((p) => ({
          platform: p.platform as SocialChannel,
          success: !p.error,
          postUrl: p.url,
          error: p.error,
        })),
        publishedAt: scheduleMode === 'now' ? new Date().toISOString() : undefined,
        scheduledFor: scheduleMode === 'scheduled' ? postData.scheduledTime : undefined,
      };

      setPublishResult(result);

      if (result.success) {
        toast.success(
          scheduleMode === 'now' 
            ? '🚀 Publicado com sucesso!' 
            : '📅 Agendado com sucesso!'
        );
        onPublished(result);
      } else {
        toast.error('Alguns canais falharam. Verifique os detalhes.');
      }
    } catch (error: any) {
      console.error('Publish error:', error);
      toast.error(error.message || 'Erro ao publicar');
      
      setPublishResult({
        demandId: demand.id,
        success: false,
        platforms: selectedChannels.map((ch) => ({
          platform: ch,
          success: false,
          error: error.message || 'Erro desconhecido',
        })),
      });
    }

    setPublishing(false);
  };

  // Not configured state
  if (!isLateConfigured) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl w-full max-w-md">
          <div className="p-6 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Publicar Conteúdo</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <Icons.X size={20} />
            </button>
          </div>
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icons.Settings size={32} className="text-orange-400" />
            </div>
            <h3 className="text-white font-bold mb-2">Configure a Late API</h3>
            <p className="text-gray-400 text-sm mb-6">
              Para publicar automaticamente, você precisa configurar sua API Key do Late nas configurações.
            </p>
            <button
              onClick={() => {
                onClose();
                window.location.href = '/configuracoes';
              }}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition font-medium"
            >
              Ir para Configurações
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No connected accounts for this demand's channels
  if (availableChannels.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl w-full max-w-md">
          <div className="p-6 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Publicar Conteúdo</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <Icons.X size={20} />
            </button>
          </div>
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icons.AlertCircle size={32} className="text-yellow-400" />
            </div>
            <h3 className="text-white font-bold mb-2">Nenhuma conta conectada</h3>
            <p className="text-gray-400 text-sm mb-4">
              Você precisa conectar suas contas de {demand.channels.map((ch) => {
                const channel = SOCIAL_CHANNELS.find((c) => c.id === ch);
                return channel?.label;
              }).join(', ')} no Late primeiro.
            </p>
            <button
              onClick={() => window.open(lateService.getConnectUrl(), '_blank')}
              className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition font-medium"
            >
              Conectar Contas no Late
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Result state
  if (publishResult) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl w-full max-w-md">
          <div className="p-6 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              {publishResult.success ? '✅ Sucesso!' : '⚠️ Resultado'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <Icons.X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {/* Status per platform */}
            {publishResult.platforms.map((p) => {
              const channel = SOCIAL_CHANNELS.find((c) => c.id === p.platform);
              return (
                <div
                  key={p.platform}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    p.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{channel?.icon}</span>
                    <span className="text-white font-medium">{channel?.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.success ? (
                      <>
                        <Icons.CheckCircle size={18} className="text-green-400" />
                        {p.postUrl && (
                          <a
                            href={p.postUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-400 hover:underline"
                          >
                            Ver post
                          </a>
                        )}
                      </>
                    ) : (
                      <>
                        <Icons.XCircle size={18} className="text-red-400" />
                        <span className="text-xs text-red-400">{p.error}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Info */}
            {publishResult.scheduledFor && (
              <div className="text-center text-sm text-gray-400">
                📅 Agendado para {new Date(publishResult.scheduledFor).toLocaleString('pt-BR')}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main publish form
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Icons.Rocket size={20} className="text-orange-400" />
              Publicar Conteúdo
            </h2>
            <p className="text-sm text-gray-500 mt-1">{demand.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <Icons.X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Preview */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              {demand.media.length > 0 ? (
                <img 
                  src={demand.media[0].url} 
                  alt="" 
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                  <Icons.Image size={24} className="text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 line-clamp-2">
                  {demand.caption || demand.briefing}
                </p>
                {demand.hashtags && (
                  <p className="text-xs text-blue-400 mt-1 truncate">{demand.hashtags}</p>
                )}
              </div>
            </div>
          </div>

          {/* Channel Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Publicar em:
            </label>
            <div className="flex flex-wrap gap-2">
              {availableChannels.map((ch) => {
                const channel = SOCIAL_CHANNELS.find((c) => c.id === ch);
                const isSelected = selectedChannels.includes(ch);
                return (
                  <button
                    key={ch}
                    onClick={() => toggleChannel(ch)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                      isSelected
                        ? 'bg-orange-500/20 border border-orange-500 text-orange-400'
                        : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <span>{channel?.icon}</span>
                    <span className="text-sm">{channel?.label}</span>
                    {isSelected && <Icons.Check size={14} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule Options */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Quando publicar:
            </label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setScheduleMode('now')}
                className={`flex-1 py-2 rounded-lg transition ${
                  scheduleMode === 'now'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                🚀 Agora
              </button>
              <button
                onClick={() => setScheduleMode('scheduled')}
                className={`flex-1 py-2 rounded-lg transition ${
                  scheduleMode === 'scheduled'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                📅 Agendar
              </button>
            </div>

            {scheduleMode === 'scheduled' && (
              <div className="flex gap-3">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || selectedChannels.length === 0}
            className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {publishing ? (
              <>
                <Icons.Loader size={18} className="animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <Icons.Rocket size={18} />
                {scheduleMode === 'now' ? 'Publicar Agora' : 'Agendar'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
