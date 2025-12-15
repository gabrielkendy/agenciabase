import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store';
import { Icons } from '../components/Icons';
import { SOCIAL_CHANNELS } from '../types';
import toast from 'react-hot-toast';

export const ApprovalPage = () => {
  const { token } = useParams<{ token: string }>();
  const { demands, clients, updateDemand, moveDemand } = useStore();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Find demands for this approval token
  const pendingDemands = demands.filter(
    (d) => d.approval_token === token && d.status === 'aprovacao_cliente'
  );

  const currentDemand = pendingDemands[currentIndex];
  const client = currentDemand ? clients.find((c) => c.id === currentDemand.client_id) : null;

  if (!currentDemand) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-white mb-2">Nenhuma demanda pendente</h1>
          <p className="text-gray-400">Todas as demandas já foram aprovadas ou o link é inválido.</p>
        </div>
      </div>
    );
  }

  const handleApprove = () => {
    moveDemand(currentDemand.id, 'aprovado_agendado');
    updateDemand(currentDemand.id, { approval_status: 'approved' });
    toast.success('Demanda aprovada!');
    
    if (currentIndex < pendingDemands.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleApproveAll = () => {
    pendingDemands.forEach((d) => {
      moveDemand(d.id, 'aprovado_agendado');
      updateDemand(d.id, { approval_status: 'approved' });
    });
    toast.success('Todas as demandas aprovadas!');
  };

  const handleRequestAdjustment = () => {
    if (!feedback.trim()) {
      toast.error('Por favor, descreva os ajustes necessários');
      return;
    }
    moveDemand(currentDemand.id, 'ajustes');
    updateDemand(currentDemand.id, { 
      approval_status: 'needs_adjustment',
      approval_notes: feedback 
    });
    toast.success('Solicitação de ajuste enviada!');
    setShowFeedbackModal(false);
    setFeedback('');
    
    if (currentIndex < pendingDemands.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };


  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="font-bold text-xl text-gray-900">BASE Agency</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Online
          </div>
        </div>
      </header>

      {/* Info Banner */}
      <div className="bg-orange-50 border-b border-orange-100 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-2 text-orange-700 text-sm">
          <span>🔗</span>
          <span>Este link é de uso pessoal do aprovador da demanda.</span>
        </div>
      </div>

      {/* Approver Info */}
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="font-semibold text-gray-900">{client?.name || 'Aprovador'}</div>
            <div className="text-sm text-gray-500">{client?.email}</div>
          </div>
          <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full text-sm">
            <span>⚠️</span>
            <span>{pendingDemands.length} demanda(s) com aprovação pendente</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Title */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <h1 className="text-xl font-bold text-gray-900">Aprovação</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                {currentIndex + 1} / {pendingDemands.length}
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <Icons.Filter size={18} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="max-w-lg mx-auto">
              {/* Card Preview */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">{currentDemand.title}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: client?.color || '#666' }}>
                        {client?.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{client?.name}</span>
                    </div>
                  </div>
                </div>


                {/* Date */}
                <div className="px-4 py-2 flex items-center gap-2 text-xs text-gray-500 border-b border-gray-200">
                  <Icons.Calendar size={12} />
                  <span>Data da publicação:</span>
                </div>
                <div className="px-4 py-2 flex items-center gap-2 text-xs text-orange-500 border-b border-gray-200">
                  <span>📅</span>
                  <span>
                    {currentDemand.scheduled_date 
                      ? `${new Date(currentDemand.scheduled_date).toLocaleDateString('pt-BR')} às ${currentDemand.scheduled_time || '00:00'}`
                      : 'Data não definida'}
                  </span>
                </div>

                {/* Media Preview */}
                {currentDemand.media.length > 0 ? (
                  <div className="aspect-square bg-gray-200">
                    <img src={currentDemand.media[0].url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <span className="text-4xl">🖼️</span>
                      <p className="text-sm mt-2">Sem mídia</p>
                    </div>
                  </div>
                )}

                {/* Caption */}
                <div className="p-4">
                  {/* Channels */}
                  <div className="flex gap-1 mb-3">
                    {currentDemand.channels.map((ch) => {
                      const channel = SOCIAL_CHANNELS.find((c) => c.id === ch);
                      return channel ? (
                        <span key={ch} className="text-lg">{channel.icon}</span>
                      ) : null;
                    })}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-gray-900 mb-2">{currentDemand.title}</h3>

                  {/* Caption Text */}
                  {currentDemand.caption && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                      {currentDemand.caption}
                    </p>
                  )}

                  {/* Briefing */}
                  {currentDemand.briefing && (
                    <div className="bg-gray-100 rounded-lg p-3 mt-3">
                      <div className="text-xs text-gray-500 mb-1">Briefing:</div>
                      <p className="text-sm text-gray-700">{currentDemand.briefing}</p>
                    </div>
                  )}

                  {/* Hashtags */}
                  {currentDemand.hashtags && (
                    <p className="text-sm text-blue-500 mt-3">{currentDemand.hashtags}</p>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="p-2 rounded-full bg-gray-100 text-gray-600 disabled:opacity-30 hover:bg-gray-200 transition"
                >
                  <Icons.ChevronLeft size={24} />
                </button>
                <button
                  onClick={() => setCurrentIndex(Math.min(pendingDemands.length - 1, currentIndex + 1))}
                  disabled={currentIndex === pendingDemands.length - 1}
                  className="p-2 rounded-full bg-gray-100 text-gray-600 disabled:opacity-30 hover:bg-gray-200 transition"
                >
                  <Icons.ChevronRight size={24} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Action Buttons - Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
          <button
            onClick={handleApproveAll}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            ✓✓ Aprovar todas
          </button>
          
          <button
            onClick={handleApprove}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-xl font-medium transition"
          >
            👍 Aprovar
          </button>
          
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-xl font-medium transition"
          >
            ✏️ Ajustar
          </button>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Solicitar Ajustes</h2>
              <p className="text-sm text-gray-500 mt-1">Descreva o que precisa ser ajustado</p>
            </div>
            
            <div className="p-6">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Ex: A imagem precisa ter mais destaque para o logo. O texto está muito longo para o formato Stories..."
                rows={5}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none resize-none"
              />
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => { setShowFeedbackModal(false); setFeedback(''); }}
                className="px-6 py-2 text-gray-600 hover:text-gray-900 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleRequestAdjustment}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition"
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
