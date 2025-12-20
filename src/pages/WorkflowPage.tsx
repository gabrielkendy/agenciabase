import { useState, useMemo, useRef } from 'react';
import { useStore } from '../store';
import { Icons } from '../components/Icons';
import { PublishModal } from '../components/PublishModal';
import { Demand, DemandStatus, ContentType, SocialChannel, WORKFLOW_COLUMNS, SOCIAL_CHANNELS, ApproverAssignment, MediaFile, PublishResult } from '../types';
import { notificationManager, NotificationTrigger } from '../services/zapiService';
import clsx from 'clsx';
import toast from 'react-hot-toast';

type ModalStep = 'content' | 'team';

// Componente de Carrossel de Mídia com suporte a imagem e vídeo
const MediaCarousel = ({ media }: { media: MediaFile[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentMedia = media[currentIndex];

  const goToPrev = () => setCurrentIndex(Math.max(0, currentIndex - 1));
  const goToNext = () => setCurrentIndex(Math.min(media.length - 1, currentIndex + 1));

  return (
    <div className="relative">
      {/* Mídia Principal */}
      <div className="aspect-square bg-gray-800 rounded-xl overflow-hidden relative">
        {currentMedia.type === 'video' ? (
          <video
            src={currentMedia.url}
            className="w-full h-full object-cover"
            controls
            playsInline
          />
        ) : (
          <img src={currentMedia.url} alt="" className="w-full h-full object-cover" />
        )}

        {/* Indicador de tipo */}
        {currentMedia.type === 'video' && (
          <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <Icons.Play size={12} /> Vídeo
          </div>
        )}
      </div>

      {/* Navegação do Carrossel */}
      {media.length > 1 && (
        <>
          {/* Botões de navegação */}
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center disabled:opacity-30 transition"
          >
            <Icons.ChevronLeft size={18} />
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex === media.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center disabled:opacity-30 transition"
          >
            <Icons.ChevronRight size={18} />
          </button>

          {/* Indicadores (dots) */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {media.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={clsx(
                  'w-2 h-2 rounded-full transition',
                  idx === currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
                )}
              />
            ))}
          </div>

          {/* Contador */}
          <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {currentIndex + 1} / {media.length}
          </div>
        </>
      )}

      {/* Thumbnails */}
      {media.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {media.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => setCurrentIndex(idx)}
              className={clsx(
                'flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition',
                idx === currentIndex ? 'border-orange-500' : 'border-transparent hover:border-gray-600'
              )}
            >
              {m.type === 'video' ? (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center relative">
                  <video src={m.url} className="w-full h-full object-cover" muted />
                  <Icons.Play size={16} className="absolute text-white" />
                </div>
              ) : (
                <img src={m.url} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const WorkflowPage = () => {
  const {
    demands, clients, teamMembers, addDemand, updateDemand, deleteDemand, moveDemand,
    demandFilters, setDemandFilters, clearFilters, addContentHistory, currentUser
  } = useStore();

  // Verificar se usuário pode aprovar internamente (apenas Admin/Gerente)
  const canApproveInternal = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'Gerente' || currentUser?.role === 'Admin';
  
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>('content');
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<Demand | null>(null);
  const [showPublishModal, setShowPublishModal] = useState<Demand | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [draggedDemand, setDraggedDemand] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state - Step 1: Content
  const [form, setForm] = useState({
    title: '',
    briefing: '',
    caption: '',
    hashtags: '',
    client_id: '',
    content_type: 'post' as ContentType,
    channels: [] as SocialChannel[],
    tags: '',
    scheduled_date: '',
    scheduled_time: '',
    auto_schedule: false,
    media: [] as MediaFile[],
  });

  // Form state - Step 2: Team (simplificado)
  // skip_internal_approval e skip_external_approval sempre false = fluxo completo
  const [teamForm, setTeamForm] = useState({
    team_redator_id: '',
    team_designer_id: '',
    skip_internal_approval: false,  // Sempre vai para aprovação interna
    internal_approvers: [] as ApproverAssignment[],
    skip_external_approval: false,  // Sempre vai para aprovação cliente
    external_approvers: [] as ApproverAssignment[],
  });

  const resetForm = () => {
    console.log('[Workflow] resetForm chamado');
    setForm({ title: '', briefing: '', caption: '', hashtags: '', client_id: '', content_type: 'post', channels: [], tags: '', scheduled_date: '', scheduled_time: '', auto_schedule: false, media: [] });
    setTeamForm({ team_redator_id: '', team_designer_id: '', skip_internal_approval: false, internal_approvers: [], skip_external_approval: false, external_approvers: [] });
    setEditingDemand(null);
    setModalStep('content');
  };

  const filteredDemands = useMemo(() => {
    return demands.filter((d) => {
      if (demandFilters.clientId && d.client_id !== demandFilters.clientId) return false;
      if (demandFilters.status && d.status !== demandFilters.status) return false;
      if (demandFilters.channel && !d.channels.includes(demandFilters.channel as SocialChannel)) return false;
      if (demandFilters.search && !d.title.toLowerCase().includes(demandFilters.search.toLowerCase())) return false;
      return true;
    });
  }, [demands, demandFilters]);

  const demandsByStatus = useMemo(() => {
    const grouped: Record<DemandStatus, Demand[]> = {} as any;
    WORKFLOW_COLUMNS.forEach((col) => { grouped[col.id] = []; });
    filteredDemands.forEach((d) => { if (grouped[d.status]) grouped[d.status].push(d); });
    return grouped;
  }, [filteredDemands]);

  const getClient = (id: string) => clients.find((c) => c.id === id);
  const getTeamMember = (id: string) => teamMembers.find((m) => m.id === id);

  const openNewDemand = () => { resetForm(); setShowModal(true); };
  
  const openEditDemand = (demand: Demand) => {
    setEditingDemand(demand);
    setForm({
      title: demand.title, 
      briefing: demand.briefing, 
      caption: demand.caption || '', 
      hashtags: demand.hashtags || '',
      client_id: demand.client_id, 
      content_type: demand.content_type, 
      channels: demand.channels,
      tags: demand.tags.join(', '), 
      scheduled_date: demand.scheduled_date || '', 
      scheduled_time: demand.scheduled_time || '',
      auto_schedule: demand.auto_schedule,
      media: demand.media || [],
    });
    setTeamForm({
      team_redator_id: demand.team_redator_id || '',
      team_designer_id: demand.team_designer_id || '',
      skip_internal_approval: demand.skip_internal_approval,
      internal_approvers: demand.internal_approvers,
      skip_external_approval: demand.skip_external_approval,
      external_approvers: demand.external_approvers,
    });
    setShowModal(true);
  };

  const handleNextStep = () => {
    console.log('[Workflow] handleNextStep chamado', { title: form.title, client_id: form.client_id, modalStep });
    if (!form.title || !form.client_id) {
      toast.error('Preencha título e cliente');
      return;
    }
    console.log('[Workflow] Avançando para team...');

    // Auto-selecionar primeiro membro como Designer se nenhum estiver selecionado
    if (!teamForm.team_designer_id && teamMembers.length > 0) {
      const firstActive = teamMembers.find(m => m.is_active);
      if (firstActive) {
        setTeamForm(prev => ({ ...prev, team_designer_id: firstActive.id }));
      }
    }

    setModalStep('team');
  };

  const handlePrevStep = () => {
    setModalStep('content');
  };

  const handleSaveDraft = () => {
    if (!form.title || !form.client_id) { 
      toast.error('Preencha título e cliente'); 
      return; 
    }
    saveDemand(true);
  };

  const handleFinalize = () => {
    console.log('[Workflow] handleFinalize - Iniciando finalização');

    // Validação básica
    if (!form.title || !form.client_id) {
      toast.error('Preencha título e cliente');
      return;
    }

    saveDemand(false);
  };

  const saveDemand = (isDraft: boolean) => {
    console.log('[Workflow] saveDemand chamado', { isDraft, teamForm });

    const redator = getTeamMember(teamForm.team_redator_id);
    const designer = getTeamMember(teamForm.team_designer_id);

    // Lógica de status inicial simplificada:
    // - Se é rascunho: fica em "rascunho"
    // - Se tem redator: vai para "conteudo" (redator trabalha primeiro)
    // - Se não tem redator mas tem designer: vai para "design"
    // - Se não tem nenhum: fica em "rascunho"
    let initialStatus: DemandStatus = 'rascunho';
    if (!isDraft) {
      if (teamForm.team_redator_id) {
        initialStatus = 'conteudo';
      } else if (teamForm.team_designer_id) {
        initialStatus = 'design';
      }
    }

    console.log('[Workflow] Status inicial:', initialStatus);

    const demandData = {
      user_id: '1',
      client_id: form.client_id,
      title: form.title,
      briefing: form.briefing,
      caption: form.caption || undefined,
      hashtags: form.hashtags || undefined,
      status: initialStatus,
      content_type: form.content_type,
      channels: form.channels,
      media: form.media,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      scheduled_date: form.scheduled_date || undefined,
      scheduled_time: form.scheduled_time || undefined,

      // Team
      team_redator_id: teamForm.team_redator_id || undefined,
      team_redator_name: redator?.name,
      team_designer_id: teamForm.team_designer_id || undefined,
      team_designer_name: designer?.name,

      // Approvers - Sempre segue fluxo completo
      internal_approvers: [],  // Gerenciado automaticamente
      skip_internal_approval: false,  // Sempre passa por aprovação interna
      external_approvers: [],  // Gerenciado automaticamente
      skip_external_approval: false,  // Sempre passa por aprovação cliente

      approval_status: 'pending' as const,
      approval_link_sent: false,
      approval_link_views: 0,
      approval_link_view_history: [],
      auto_schedule: form.auto_schedule,
      created_by_ai: false,
      is_draft: isDraft,
      comments: [],
    };

    try {
      if (editingDemand) {
        updateDemand(editingDemand.id, demandData);
        toast.success('Demanda atualizada!');
      } else {
        addDemand(demandData);
        const statusMsg = initialStatus === 'conteudo' ? 'enviada para Redator' :
                         initialStatus === 'design' ? 'enviada para Designer' :
                         isDraft ? 'salva como rascunho' : 'criada';
        toast.success(`Demanda ${statusMsg}!`);
      }

      console.log('[Workflow] Demanda salva com sucesso');
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('[Workflow] Erro ao salvar demanda:', error);
      toast.error('Erro ao salvar demanda');
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[Workflow] handleFileUpload chamado');
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
        console.log('[Workflow] Adicionando mídia:', file.name);
        setForm((prev) => ({ ...prev, media: [...prev.media, newMedia] }));
      };
      reader.readAsDataURL(file);
    });

    // Limpar o input para permitir re-upload do mesmo arquivo
    e.target.value = '';
  };

  // Remove media
  const removeMedia = (id: string) => {
    setForm((prev) => ({ ...prev, media: prev.media.filter((m) => m.id !== id) }));
  };

  const handleDragStart = (id: string) => setDraggedDemand(id);
  const handleDragEnd = () => setDraggedDemand(null);
  const handleDrop = (status: DemandStatus) => { 
    if (draggedDemand) { 
      const demand = demands.find(d => d.id === draggedDemand);
      moveDemand(draggedDemand, status); 
      toast.success('Demanda movida!'); 
      setDraggedDemand(null);
      
      // Disparar notificações automáticas baseadas na nova coluna
      if (demand) {
        const triggerMap: Record<DemandStatus, NotificationTrigger | null> = {
          'rascunho': null,
          'conteudo': 'demand_to_content',
          'design': 'demand_to_design',
          'aprovacao_interna': 'internal_approval_pending',
          'aprovacao_cliente': 'client_approval_pending',
          'ajustes': 'client_adjustment_requested',
          'aguardando_agendamento': 'demand_scheduled',
          'aprovado_agendado': 'demand_scheduled',
          'concluido': 'demand_published',
        };
        const trigger = triggerMap[status];
        if (trigger) {
          sendNotification(trigger, { ...demand, status });
        }
      }
    } 
  };

  const sendTo = (id: string, status: DemandStatus, msg: string) => { 
    const demand = demands.find(d => d.id === id);
    moveDemand(id, status); 
    toast.success(msg);
    
    // Disparar notificações automáticas
    if (demand) {
      const triggerMap: Record<DemandStatus, NotificationTrigger | null> = {
        'rascunho': null,
        'conteudo': 'demand_to_content',
        'design': 'demand_to_design',
        'aprovacao_interna': 'internal_approval_pending',
        'aprovacao_cliente': 'client_approval_pending',
        'ajustes': 'client_adjustment_requested',
        'aguardando_agendamento': 'demand_scheduled',
        'aprovado_agendado': 'demand_scheduled',
        'concluido': 'demand_published',
      };
      const trigger = triggerMap[status];
      if (trigger) {
        sendNotification(trigger, { ...demand, status });
      }
    }
  };
  
  const generateApprovalLink = (demand: Demand) => `${window.location.origin}/aprovacao/${demand.approval_token}`;
  
  const copyApprovalLink = (demand: Demand) => { 
    navigator.clipboard.writeText(generateApprovalLink(demand)); 
    toast.success('Link copiado!'); 
  };
  
  const sendWhatsApp = (demand: Demand) => { 
    const client = getClient(demand.client_id); 
    const phone = demand.external_approvers[0]?.approver_phone || client?.phone;
    const msg = `Olá! Sua demanda "${demand.title}" está pronta para aprovação: ${generateApprovalLink(demand)}`; 
    window.open(`https://wa.me/${phone?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`); 
  };

  // Handle publish result
  const handlePublished = (result: PublishResult) => {
    if (result.success) {
      // Move demand to "concluido" if published successfully
      moveDemand(result.demandId, 'concluido', 'Sistema');
      // Update demand with published date
      updateDemand(result.demandId, {
        published_date: result.publishedAt || result.scheduledFor,
      });
      
      // Save to client's content history
      const demand = demands.find(d => d.id === result.demandId);
      const client = demand ? clients.find(c => c.id === demand.client_id) : null;
      if (demand && client) {
        // SALVAR NO HISTÓRICO DE CONTEÚDOS DO CLIENTE
        addContentHistory(client.id, {
          demand_id: demand.id,
          title: demand.title,
          content_type: demand.content_type,
          channels: demand.channels,
          caption: demand.caption || '',
          media_urls: demand.media?.map(m => m.url) || [],
          published_at: result.publishedAt || result.scheduledFor || new Date().toISOString(),
          status: 'published',
        });
        
        // Send notification to client
        sendNotification('demand_published', demand, client);
        toast.success('Conteúdo salvo no histórico do cliente!');
      }
    }
    setShowPublishModal(null);
    setShowPreviewModal(null);
  };

  // Send notifications via WhatsApp
  const sendNotification = async (trigger: NotificationTrigger, demand: Demand, client?: any) => {
    const clientData = client || clients.find(c => c.id === demand.client_id);
    if (!clientData) return;

    const variables = {
      cliente_nome: clientData.name,
      cliente_empresa: clientData.company || '',
      cliente_telefone: clientData.phone || '',
      demanda_titulo: demand.title,
      demanda_tipo: demand.content_type,
      demanda_status: demand.status,
      link_aprovacao: demand.approval_token ? `${window.location.origin}/aprovacao/${demand.approval_token}` : '',
      agencia_nome: 'BASE Agency',
    };

    try {
      // Try WhatsApp via Z-API
      if (clientData.phone) {
        await notificationManager.sendNotification(trigger, variables, clientData.phone);
      }
    } catch (err) {
      console.error('Notification error:', err);
    }
  };



  // Demand Card Component
  const DemandCard = ({ demand }: { demand: Demand }) => {
    const client = getClient(demand.client_id);
    const redator = demand.team_redator_name;
    const designer = demand.team_designer_name;
    
    return (
      <div 
        draggable 
        onDragStart={() => handleDragStart(demand.id)} 
        onDragEnd={handleDragEnd}
        onClick={() => setShowPreviewModal(demand)}
        className="bg-gray-800 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-orange-500/30 transition group"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: client?.color || '#666' }}>
              {client?.name.charAt(0)}
            </div>
            <div>
              <h4 className="font-medium text-white text-sm line-clamp-1">{demand.title}</h4>
              <p className="text-xs text-gray-500">{client?.name}</p>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
            <button onClick={(e) => { e.stopPropagation(); openEditDemand(demand); }} className="p-1.5 hover:bg-gray-700 rounded-lg">
              <Icons.Edit size={14} className="text-gray-400" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); deleteDemand(demand.id); toast.success('Demanda excluída!'); }} className="p-1.5 hover:bg-gray-700 rounded-lg">
              <Icons.Trash size={14} className="text-red-400" />
            </button>
          </div>
        </div>
        
        {/* Media Preview - Suporta Imagem e Vídeo */}
        {demand.media.length > 0 && (
          <div className="mb-3 rounded-lg overflow-hidden bg-gray-900 aspect-video relative">
            {demand.media[0].type === 'video' ? (
              <video
                src={demand.media[0].url}
                className="w-full h-full object-cover"
                muted
                playsInline
                onMouseEnter={(e) => e.currentTarget.play()}
                onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
              />
            ) : (
              <img src={demand.media[0].url} alt="" className="w-full h-full object-cover" />
            )}
            {/* Indicador de tipo de mídia */}
            {demand.media[0].type === 'video' && (
              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Icons.Play size={10} /> Vídeo
              </div>
            )}
            {/* Contador de mídias */}
            {demand.media.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Icons.Image size={10} /> {demand.media.length}
              </div>
            )}
          </div>
        )}
        
        {/* Channels */}
        <div className="flex gap-1 mb-3 flex-wrap">
          {demand.channels.map((ch) => { 
            const channel = SOCIAL_CHANNELS.find((c) => c.id === ch); 
            return channel ? (
              <span key={ch} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${channel.color}20`, color: channel.color }}>
                {channel.icon}
              </span>
            ) : null; 
          })}
        </div>
        
        {/* Schedule Date */}
        {demand.scheduled_date && (
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <Icons.Calendar size={12} />
            <span>{new Date(demand.scheduled_date).toLocaleDateString('pt-BR')} {demand.scheduled_time && `às ${demand.scheduled_time}`}</span>
          </div>
        )}
        
        {/* Team */}
        {(redator || designer) && (
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
            {redator && <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">✍️ {redator.split(' ')[0]}</span>}
            {designer && <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">🎨 {designer.split(' ')[0]}</span>}
          </div>
        )}
        
        {/* Tags */}
        {demand.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-3">
            {demand.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs bg-gray-700/50 text-gray-400 px-2 py-0.5 rounded">{tag}</span>
            ))}
          </div>
        )}
        
        {/* Action Buttons - FLUXO CORRETO */}
        <div className="flex gap-1 pt-2 border-t border-gray-700/50">
          {/* RASCUNHO → Enviar para Redator ou Designer */}
          {demand.status === 'rascunho' && (
            <>
              {demand.team_redator_id && (
                <button onClick={(e) => { e.stopPropagation(); sendTo(demand.id, 'conteudo', 'Enviado para Redator!'); }} className="flex-1 text-xs bg-blue-500/20 text-blue-400 py-1.5 rounded-lg hover:bg-blue-500/30">
                  ✍️ Redator
                </button>
              )}
              {!demand.team_redator_id && demand.team_designer_id && (
                <button onClick={(e) => { e.stopPropagation(); sendTo(demand.id, 'design', 'Enviado para Designer!'); }} className="flex-1 text-xs bg-purple-500/20 text-purple-400 py-1.5 rounded-lg hover:bg-purple-500/30">
                  🎨 Designer
                </button>
              )}
              {!demand.team_redator_id && !demand.team_designer_id && (
                <button onClick={(e) => { e.stopPropagation(); openEditDemand(demand); }} className="flex-1 text-xs bg-gray-500/20 text-gray-400 py-1.5 rounded-lg hover:bg-gray-500/30">
                  ⚙️ Configurar
                </button>
              )}
            </>
          )}

          {/* CONTEÚDO → Enviar para Designer */}
          {demand.status === 'conteudo' && (
            <button onClick={(e) => { e.stopPropagation(); sendTo(demand.id, 'design', 'Enviado para Designer!'); }} className="flex-1 text-xs bg-purple-500/20 text-purple-400 py-1.5 rounded-lg hover:bg-purple-500/30">
              🎨 Designer
            </button>
          )}

          {/* DESIGN → Enviar para Aprovação (Interna ou Cliente) */}
          {demand.status === 'design' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextStatus = demand.skip_internal_approval
                  ? (demand.skip_external_approval ? 'aprovado_agendado' : 'aprovacao_cliente')
                  : 'aprovacao_interna';
                const msg = demand.skip_internal_approval
                  ? (demand.skip_external_approval ? 'Aprovado! Pronto para agendar.' : 'Enviado para Aprovação do Cliente!')
                  : 'Enviado para Aprovação Interna!';
                sendTo(demand.id, nextStatus, msg);
              }}
              className="flex-1 text-xs bg-yellow-500/20 text-yellow-400 py-1.5 rounded-lg hover:bg-yellow-500/30"
            >
              👀 Enviar p/ Aprovação
            </button>
          )}

          {/* APROVAÇÃO INTERNA → Aprovar (vai para Cliente) ou Ajustes - APENAS ADMIN/GERENTE */}
          {demand.status === 'aprovacao_interna' && (
            canApproveInternal ? (
              <>
                <button onClick={(e) => { e.stopPropagation(); sendTo(demand.id, 'ajustes', 'Solicitado ajustes!'); }} className="flex-1 text-xs bg-red-500/20 text-red-400 py-1.5 rounded-lg hover:bg-red-500/30">
                  🔄 Ajustes
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextStatus = demand.skip_external_approval ? 'aprovado_agendado' : 'aprovacao_cliente';
                    const msg = demand.skip_external_approval ? 'Aprovado internamente! Pronto para agendar.' : 'Aprovado internamente! Enviado para Cliente.';
                    sendTo(demand.id, nextStatus, msg);
                  }}
                  className="flex-1 text-xs bg-green-500/20 text-green-400 py-1.5 rounded-lg hover:bg-green-500/30"
                >
                  ✅ Aprovar
                </button>
              </>
            ) : (
              <div className="flex-1 text-xs text-center text-yellow-400 py-1.5">
                🔒 Aguardando Admin/Gerente
              </div>
            )
          )}

          {/* APROVAÇÃO CLIENTE → Link + Aprovar ou Ajustes */}
          {demand.status === 'aprovacao_cliente' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setShowApprovalModal(demand.id); }} className="flex-1 text-xs bg-blue-500/20 text-blue-400 py-1.5 rounded-lg hover:bg-blue-500/30">
                🔗 Link
              </button>
              <button onClick={(e) => { e.stopPropagation(); sendTo(demand.id, demand.auto_schedule ? 'aprovado_agendado' : 'aguardando_agendamento', 'Cliente aprovou! ✅'); }} className="flex-1 text-xs bg-green-500/20 text-green-400 py-1.5 rounded-lg hover:bg-green-500/30">
                ✅ Aprovar
              </button>
            </>
          )}

          {/* AJUSTES → Voltar para Conteúdo ou Design */}
          {demand.status === 'ajustes' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); sendTo(demand.id, 'conteudo', 'Voltou para Redator!'); }} className="flex-1 text-xs bg-blue-500/20 text-blue-400 py-1.5 rounded-lg hover:bg-blue-500/30">
                ✍️ Redator
              </button>
              <button onClick={(e) => { e.stopPropagation(); sendTo(demand.id, 'design', 'Voltou para Designer!'); }} className="flex-1 text-xs bg-purple-500/20 text-purple-400 py-1.5 rounded-lg hover:bg-purple-500/30">
                🎨 Designer
              </button>
            </>
          )}

          {/* AGUARDANDO AGENDAMENTO → Agendar */}
          {demand.status === 'aguardando_agendamento' && (
            <button onClick={(e) => { e.stopPropagation(); sendTo(demand.id, 'aprovado_agendado', 'Agendado!'); }} className="flex-1 text-xs bg-emerald-500/20 text-emerald-400 py-1.5 rounded-lg hover:bg-emerald-500/30">
              📅 Agendar
            </button>
          )}

          {/* APROVADO/AGENDADO → Publicar */}
          {demand.status === 'aprovado_agendado' && (
            <button onClick={(e) => { e.stopPropagation(); setShowPublishModal(demand); }} className="flex-1 text-xs bg-green-500/20 text-green-400 py-1.5 rounded-lg hover:bg-green-500/30">
              🚀 Publicar
            </button>
          )}

          {/* CONCLUÍDO → Ver no histórico */}
          {demand.status === 'concluido' && (
            <button onClick={(e) => { e.stopPropagation(); setShowPreviewModal(demand); }} className="flex-1 text-xs bg-gray-500/20 text-gray-400 py-1.5 rounded-lg hover:bg-gray-500/30">
              📋 Ver Detalhes
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-3 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2 md:gap-3">
            <span className="text-2xl md:text-3xl">📋</span> Workflow
          </h1>
          <p className="text-gray-400 text-xs md:text-sm mt-1 hidden md:block">Gerencie demandas de conteúdo</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('kanban')} 
              className={clsx('px-2 md:px-3 py-1.5 rounded-md text-xs md:text-sm transition', viewMode === 'kanban' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white')}
            >
              📊 <span className="hidden sm:inline">Kanban</span>
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={clsx('px-2 md:px-3 py-1.5 rounded-md text-xs md:text-sm transition', viewMode === 'list' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white')}
            >
              📋 <span className="hidden sm:inline">Lista</span>
            </button>
          </div>
          <button 
            onClick={openNewDemand} 
            className="flex items-center gap-1 md:gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3 md:px-4 py-2 rounded-xl transition font-medium text-sm"
          >
            <Icons.Plus size={16} /> <span className="hidden sm:inline">Adicionar</span>
          </button>
        </div>
      </div>

      {/* Filters Bar - Mobile Optimized */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-4 md:mb-6 bg-gray-800/50 rounded-xl p-3 md:p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <select 
            value={demandFilters.clientId || ''} 
            onChange={(e) => setDemandFilters({ clientId: e.target.value || null })} 
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 md:px-3 py-1.5 text-xs md:text-sm text-white focus:border-orange-500 focus:outline-none flex-1 md:flex-none"
          >
            <option value="">Todos Clientes</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          
          <select 
            value={demandFilters.status || ''} 
            onChange={(e) => setDemandFilters({ status: e.target.value as DemandStatus || null })} 
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 md:px-3 py-1.5 text-xs md:text-sm text-white focus:border-orange-500 focus:outline-none flex-1 md:flex-none"
          >
            <option value="">Todos Status</option>
            {WORKFLOW_COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
        </div>
        
        <div className="relative flex-1">
          <Icons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Buscar..." 
            value={demandFilters.search} 
            onChange={(e) => setDemandFilters({ search: e.target.value })} 
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 md:pl-10 pr-3 py-1.5 text-xs md:text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none" 
          />
        </div>
        
        {(demandFilters.clientId || demandFilters.status || demandFilters.search) && (
          <button onClick={clearFilters} className="text-xs text-orange-400 hover:text-orange-300 underline whitespace-nowrap">
            Limpar
          </button>
        )}
        
        <div className="text-xs text-gray-500 whitespace-nowrap">
          {filteredDemands.length} demanda{filteredDemands.length !== 1 ? 's' : ''}
        </div>
      </div>


      {/* List View */}
      {viewMode === 'list' && (
        <div className="flex-1 overflow-y-auto bg-gray-800/30 rounded-2xl">
          <table className="w-full">
            <thead className="bg-gray-800/50 sticky top-0">
              <tr className="text-left text-gray-400 text-sm">
                <th className="p-4 font-medium">Título</th>
                <th className="p-4 font-medium">Cliente</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Canais</th>
                <th className="p-4 font-medium">Data</th>
                <th className="p-4 font-medium">Equipe</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredDemands.map((demand) => {
                const client = getClient(demand.client_id);
                const column = WORKFLOW_COLUMNS.find(c => c.id === demand.status);
                return (
                  <tr key={demand.id} className="hover:bg-gray-800/30 transition cursor-pointer" onClick={() => setShowPreviewModal(demand)}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {demand.media[0] && (
                          <img src={demand.media[0].url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        )}
                        <div>
                          <p className="text-white font-medium">{demand.title}</p>
                          <p className="text-xs text-gray-500">{demand.content_type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded text-xs flex items-center justify-center text-white font-bold" style={{ backgroundColor: client?.color || '#666' }}>
                          {client?.name.charAt(0)}
                        </div>
                        <span className="text-gray-300 text-sm">{client?.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ backgroundColor: `${column?.color}20`, color: column?.color }}>
                        {column?.icon} {column?.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        {demand.channels.slice(0, 3).map((ch) => {
                          const channel = SOCIAL_CHANNELS.find((c) => c.id === ch);
                          return channel ? <span key={ch} className="text-sm">{channel.icon}</span> : null;
                        })}
                        {demand.channels.length > 3 && <span className="text-xs text-gray-500">+{demand.channels.length - 3}</span>}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      {demand.scheduled_date ? new Date(demand.scheduled_date).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex -space-x-2">
                        {demand.team_redator_name && <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white" title={demand.team_redator_name}>✍️</div>}
                        {demand.team_designer_name && <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs text-white" title={demand.team_designer_name}>🎨</div>}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={(e) => { e.stopPropagation(); openEditDemand(demand); }} className="p-1.5 hover:bg-gray-700 rounded-lg">
                          <Icons.Edit size={14} className="text-gray-400" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteDemand(demand.id); toast.success('Demanda excluída!'); }} className="p-1.5 hover:bg-gray-700 rounded-lg">
                          <Icons.Trash size={14} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredDemands.length === 0 && (
            <div className="text-center py-12 text-gray-500">Nenhuma demanda encontrada</div>
          )}
        </div>
      )}

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
      <div className="flex-1 overflow-x-auto -mx-3 md:mx-0 px-3 md:px-0">
        <div className="flex gap-3 md:gap-4 h-full min-w-max pb-4">
          {WORKFLOW_COLUMNS.map((column) => (
            <div 
              key={column.id} 
              onDragOver={(e) => e.preventDefault()} 
              onDrop={() => handleDrop(column.id)} 
              className={clsx(
                'w-64 md:w-72 flex-shrink-0 bg-gray-800/50 rounded-xl md:rounded-2xl flex flex-col', 
                draggedDemand && 'ring-2 ring-orange-500/30'
              )}
            >
              <div className="p-3 md:p-4 border-b border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{column.icon}</span>
                    <h3 className="font-semibold text-white text-sm">{column.label}</h3>
                  </div>
                  <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                    {demandsByStatus[column.id]?.length || 0}
                  </span>
                </div>
              </div>
              <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-350px)]">
                {demandsByStatus[column.id]?.length === 0 ? (
                  <div className="text-center py-8 text-gray-600 text-sm">
                    Esse status está sem demandas.
                  </div>
                ) : (
                  demandsByStatus[column.id]?.map((demand) => (
                    <DemandCard key={demand.id} demand={demand} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Modal: Nova/Editar Demanda - Estilo mLabs */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">📝</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {editingDemand ? 'Editar Demanda' : 'Nova Demanda'}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {modalStep === 'content' ? 'Preencha os campos para criar uma demanda' : 'Selecione a equipe que trabalhará nesta demanda'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-white">
                <Icons.X size={24} />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="px-6 py-4 bg-gray-800/50 flex items-center justify-center gap-8">
              <div className={clsx('flex items-center gap-2', modalStep === 'content' ? 'text-orange-400' : 'text-gray-500')}>
                <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold', modalStep === 'content' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400')}>
                  1
                </div>
                <span className="text-sm font-medium">Conteúdo</span>
              </div>
              <div className="w-12 h-0.5 bg-gray-700"></div>
              <div className={clsx('flex items-center gap-2', modalStep === 'team' ? 'text-orange-400' : 'text-gray-500')}>
                <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold', modalStep === 'team' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400')}>
                  2
                </div>
                <span className="text-sm font-medium">Equipe</span>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Step 1: Content */}
              {modalStep === 'content' && (
                <div className="space-y-5">
                  {/* 1. Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="bg-gray-700 text-gray-400 w-5 h-5 rounded-full inline-flex items-center justify-center text-xs mr-2">1</span>
                      Título da demanda
                    </label>
                    <input 
                      type="text" 
                      value={form.title} 
                      onChange={(e) => setForm({ ...form, title: e.target.value })} 
                      placeholder="Ex: Post sobre lançamento" 
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none" 
                    />
                  </div>

                  {/* 2. Client/Profile */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="bg-gray-700 text-gray-400 w-5 h-5 rounded-full inline-flex items-center justify-center text-xs mr-2">2</span>
                      Perfil 
                      <span className="text-gray-500 ml-1 text-xs">(Cliente/Marca)</span>
                    </label>
                    <select 
                      value={form.client_id} 
                      onChange={(e) => setForm({ ...form, client_id: e.target.value })} 
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                    >
                      <option value="">Buscar perfil...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Channels */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="bg-gray-700 text-gray-400 w-5 h-5 rounded-full inline-flex items-center justify-center text-xs mr-2">3</span>
                      Em quais canais será publicado?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SOCIAL_CHANNELS.map((ch) => (
                        <button 
                          key={ch.id} 
                          type="button" 
                          onClick={() => setForm({ 
                            ...form, 
                            channels: form.channels.includes(ch.id) 
                              ? form.channels.filter((c) => c !== ch.id) 
                              : [...form.channels, ch.id] 
                          })} 
                          className={clsx(
                            'w-10 h-10 rounded-xl flex items-center justify-center text-lg transition border-2',
                            form.channels.includes(ch.id) 
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

                  {/* 4. Date & Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="bg-gray-700 text-gray-400 w-5 h-5 rounded-full inline-flex items-center justify-center text-xs mr-2">4</span>
                      Data prevista para publicação
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <Icons.Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input 
                          type="date" 
                          value={form.scheduled_date} 
                          onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} 
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white focus:border-orange-500 focus:outline-none" 
                        />
                      </div>
                      <div className="relative">
                        <Icons.Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input 
                          type="time" 
                          value={form.scheduled_time} 
                          onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} 
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white focus:border-orange-500 focus:outline-none" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. Auto Schedule */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="bg-gray-700 text-gray-400 w-5 h-5 rounded-full inline-flex items-center justify-center text-xs mr-2">5</span>
                      Agendamento automático
                    </label>
                    <label className="flex items-center gap-3 p-4 bg-gray-800 border border-gray-700 rounded-xl cursor-pointer hover:border-gray-600">
                      <div className={clsx(
                        'w-12 h-6 rounded-full transition relative',
                        form.auto_schedule ? 'bg-orange-500' : 'bg-gray-600'
                      )}>
                        <div className={clsx(
                          'w-5 h-5 bg-white rounded-full absolute top-0.5 transition',
                          form.auto_schedule ? 'left-6' : 'left-0.5'
                        )}></div>
                      </div>
                      <div>
                        <div className="text-white text-sm">Demanda será agendada automaticamente após aprovação</div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={form.auto_schedule} 
                        onChange={(e) => setForm({ ...form, auto_schedule: e.target.checked })} 
                        className="hidden" 
                      />
                    </label>
                  </div>

                  {/* 6. Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="bg-gray-700 text-gray-400 w-5 h-5 rounded-full inline-flex items-center justify-center text-xs mr-2">6</span>
                      Tags
                    </label>
                    <input 
                      type="text" 
                      value={form.tags} 
                      onChange={(e) => setForm({ ...form, tags: e.target.value })} 
                      placeholder="promo, urgente, campanha (separadas por vírgula)" 
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none" 
                    />
                  </div>

                  {/* 7. Briefing */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="bg-gray-700 text-gray-400 w-5 h-5 rounded-full inline-flex items-center justify-center text-xs mr-2">7</span>
                      Briefing
                    </label>
                    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-1 p-2 border-b border-gray-700">
                        <button className="p-1.5 hover:bg-gray-700 rounded"><span className="text-gray-400 font-bold">B</span></button>
                        <button className="p-1.5 hover:bg-gray-700 rounded"><span className="text-gray-400 italic">I</span></button>
                        <button className="p-1.5 hover:bg-gray-700 rounded"><span className="text-gray-400 underline">U</span></button>
                        <div className="w-px h-4 bg-gray-700 mx-1"></div>
                        <button className="p-1.5 hover:bg-gray-700 rounded"><Icons.List size={14} className="text-gray-400" /></button>
                      </div>
                      <textarea 
                        value={form.briefing} 
                        onChange={(e) => setForm({ ...form, briefing: e.target.value })} 
                        placeholder="Descreva a demanda em detalhes..." 
                        rows={4} 
                        className="w-full bg-transparent px-4 py-3 text-white placeholder-gray-500 focus:outline-none resize-none" 
                      />
                    </div>
                  </div>

                  {/* 8. File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="bg-gray-700 text-gray-400 w-5 h-5 rounded-full inline-flex items-center justify-center text-xs mr-2">8</span>
                      Anexos
                    </label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-orange-500/50 transition"
                    >
                      <div className="text-gray-400 mb-2">
                        <Icons.Upload size={32} className="mx-auto" />
                      </div>
                      <p className="text-gray-400 text-sm">Selecione um arquivo ou arraste o arquivo aqui.</p>
                      <p className="text-gray-600 text-xs mt-1">Formatos: DOCX, PDF, GIF, PNG ou JPG</p>
                      <p className="text-gray-600 text-xs">Tamanho: até 50mb</p>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        multiple 
                        accept="image/*,video/*,.pdf,.doc,.docx" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </div>
                    {form.media.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {form.media.map((m) => (
                          <div key={m.id} className="relative group">
                            <img src={m.url} alt={m.name} className="w-20 h-20 object-cover rounded-lg" />
                            <button 
                              onClick={() => removeMedia(m.id)}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                            >
                              <Icons.X size={12} className="text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* Step 2: Team - Simplificado */}
              {modalStep === 'team' && (
                <div className="space-y-6">
                  {/* Equipe de Criação */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      <span className="bg-gray-700 text-gray-400 w-5 h-5 rounded-full inline-flex items-center justify-center text-xs mr-2">1</span>
                      Selecione a equipe de criação:
                    </label>
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                      <div className="divide-y divide-gray-700">
                        {teamMembers.filter((m) => m.is_active).map((member) => {
                          const isRedator = teamForm.team_redator_id === member.id;
                          const isDesigner = teamForm.team_designer_id === member.id;
                          return (
                            <div key={member.id} className="flex items-center justify-between p-3 hover:bg-gray-700/30">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm">
                                  {member.name.charAt(0)}
                                </div>
                                <div>
                                  <span className="text-white text-sm">{member.name}</span>
                                  <span className="text-gray-500 text-xs ml-2">
                                    {member.role === 'manager' ? '(Gerente)' : member.role === 'admin' ? '(Admin)' : ''}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTeamForm({ ...teamForm, team_redator_id: isRedator ? '' : member.id });
                                  }}
                                  className={clsx(
                                    'px-3 py-1 rounded-lg text-xs transition',
                                    isRedator
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                  )}
                                >
                                  ✍️ Redator
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTeamForm({ ...teamForm, team_designer_id: isDesigner ? '' : member.id });
                                  }}
                                  className={clsx(
                                    'px-3 py-1 rounded-lg text-xs transition',
                                    isDesigner
                                      ? 'bg-purple-500 text-white'
                                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                  )}
                                >
                                  🎨 Designer
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Resumo da seleção */}
                    <div className="mt-4 p-4 bg-gray-800 rounded-xl">
                      <div className="text-sm text-gray-400 mb-2">Resumo da equipe:</div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-400">✍️</span>
                          <span className="text-white text-sm">
                            {teamForm.team_redator_id
                              ? teamMembers.find(m => m.id === teamForm.team_redator_id)?.name
                              : <span className="text-gray-500">Nenhum redator</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-purple-400">🎨</span>
                          <span className="text-white text-sm">
                            {teamForm.team_designer_id
                              ? teamMembers.find(m => m.id === teamForm.team_designer_id)?.name
                              : <span className="text-gray-500">Nenhum designer</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info sobre fluxo de aprovação */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-blue-400 text-xl">ℹ️</span>
                      <div>
                        <h4 className="text-blue-400 font-medium mb-1">Fluxo de aprovação</h4>
                        <p className="text-sm text-gray-400">
                          Após o design, a demanda vai para <strong className="text-white">Aprovação Interna</strong> (Admin/Gerente),
                          depois para <strong className="text-white">Aprovação do Cliente</strong> via link.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-gray-400 hover:text-white flex items-center gap-2"
              >
                ← Cancelar
              </button>
              <div className="flex gap-3">
                {modalStep === 'content' && (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="px-6 py-2 border border-gray-600 text-gray-300 rounded-xl hover:border-gray-500 transition flex items-center gap-2"
                    >
                      <Icons.Save size={16} /> Salvar como rascunho
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition flex items-center gap-2"
                    >
                      Avançar <Icons.ChevronRight size={16} />
                    </button>
                  </>
                )}
                {modalStep === 'team' && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-6 py-2 border border-gray-600 text-gray-300 rounded-xl hover:border-gray-500 transition flex items-center gap-2"
                    >
                      <Icons.ChevronLeft size={16} /> Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Finalizando demanda...');
                        handleFinalize();
                      }}
                      className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition flex items-center gap-2"
                    >
                      Finalizar <Icons.Check size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Modal: Link de Aprovação - Estilo mLabs */}
      {showApprovalModal && (() => {
        const demand = demands.find((d) => d.id === showApprovalModal);
        const client = demand ? getClient(demand.client_id) : null;
        const approver = demand?.external_approvers[0];
        const viewCount = demand?.approval_link_views || 0;
        const viewHistory = demand?.approval_link_view_history || [];
        const lastViewed = demand?.approval_link_last_viewed;

        return demand ? (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-white font-medium">Link de Aprovação</h3>
                <button onClick={() => setShowApprovalModal(null)} className="text-gray-400 hover:text-white">
                  Fechar ✕
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Icon */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🔗</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">Link de aprovação</h2>
                  <p className="text-gray-400 text-sm mt-2">
                    Qualquer pessoa na internet com o link pode realizar a aprovação.
                    <br />
                    Compartilhe-o apenas com o <span className="text-orange-400 font-medium">aprovador da demanda</span>:
                  </p>
                </div>

                {/* Approver Info */}
                <div className="bg-gray-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{approver?.approver_name || client?.name || 'Cliente'}</div>
                    <div className="text-sm text-gray-500">{approver?.approver_email || client?.email}</div>
                  </div>
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-full flex items-center gap-1">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                    Aguardando aprovação
                  </span>
                </div>

                {/* Link Copy */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-3 flex items-center gap-2">
                    <span className="text-blue-400">🔗</span>
                    <span className="text-sm text-gray-300 truncate flex-1">{generateApprovalLink(demand)}</span>
                  </div>
                  <button
                    onClick={() => copyApprovalLink(demand)}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-xl text-sm transition font-medium"
                  >
                    📋 Copiar link
                  </button>
                  <button
                    onClick={() => sendWhatsApp(demand)}
                    className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition"
                    title="Enviar por WhatsApp"
                  >
                    💬
                  </button>
                </div>

                {/* Histórico de Visualização */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <span>👁️</span> Histórico de Visualização
                    </h4>
                    <span className={clsx(
                      'text-xs px-2 py-1 rounded-full',
                      viewCount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
                    )}>
                      {viewCount} visualização{viewCount !== 1 ? 'ões' : ''}
                    </span>
                  </div>

                  {viewCount > 0 ? (
                    <div className="space-y-2">
                      {lastViewed && (
                        <div className="text-xs text-gray-400 flex items-center gap-2 mb-3">
                          <span>🕐</span>
                          Última visualização: {new Date(lastViewed).toLocaleString('pt-BR')}
                        </div>
                      )}

                      <div className="max-h-32 overflow-y-auto space-y-2">
                        {viewHistory.slice(-5).reverse().map((view, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs bg-gray-700/50 rounded-lg p-2">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                            <span className="text-gray-300">
                              {new Date(view.viewed_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        ))}
                      </div>

                      {viewHistory.length > 5 && (
                        <p className="text-xs text-gray-500 text-center pt-2">
                          +{viewHistory.length - 5} visualizações anteriores
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <span className="text-gray-500 text-sm">Link ainda não foi visualizado</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {/* Modal: Preview da Demanda */}
      {showPreviewModal && (() => {
        const demand = showPreviewModal;
        const client = getClient(demand.client_id);
        
        return (
          <div className="fixed inset-0 bg-black/70 flex items-start justify-end z-50">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={() => setShowPreviewModal(null)}></div>
            
            {/* Sidebar Preview */}
            <div className="relative w-full max-w-md h-full bg-gray-900 shadow-2xl flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {demand.scheduled_date && `${new Date(demand.scheduled_date).toLocaleDateString('pt-BR')} às ${demand.scheduled_time || '00:00'}`}
                </div>
                <button onClick={() => setShowPreviewModal(null)} className="text-gray-400 hover:text-white">
                  <Icons.X size={20} />
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Preview Header */}
                <div className="text-sm font-medium text-gray-400">Preview</div>
                
                {/* Client Selector */}
                <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
                  <Icons.ChevronLeft size={16} className="text-gray-500" />
                  <div className="flex-1 text-center text-white text-sm">{client?.name}</div>
                  <Icons.ChevronRight size={16} className="text-gray-500" />
                </div>
                
                {/* Channel & Date */}
                <div className="flex items-center gap-2">
                  {demand.channels.slice(0, 1).map((ch) => {
                    const channel = SOCIAL_CHANNELS.find((c) => c.id === ch);
                    return channel ? (
                      <div key={ch} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
                        <span>{channel.icon}</span>
                        <span className="text-sm text-white">{channel.label}</span>
                      </div>
                    ) : null;
                  })}
                </div>
                
                {demand.scheduled_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Icons.Calendar size={14} />
                    <span>{new Date(demand.scheduled_date).toLocaleDateString('pt-BR')} às {demand.scheduled_time || '00:00'}</span>
                  </div>
                )}
                
                {/* Media - Carrossel com suporte a vídeo */}
                {demand.media.length > 0 ? (
                  <MediaCarousel media={demand.media} />
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <span className="text-4xl">🖼️</span>
                      <p className="text-sm mt-2">Sem mídia</p>
                    </div>
                  </div>
                )}
                
                {/* Caption */}
                <div>
                  <h3 className="font-bold text-white mb-2">{demand.title}</h3>
                  {demand.caption && (
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{demand.caption}</p>
                  )}
                  {demand.hashtags && (
                    <p className="text-sm text-blue-400 mt-2">{demand.hashtags}</p>
                  )}
                </div>
                
                {/* Briefing */}
                {demand.briefing && (
                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="text-xs text-gray-500 mb-2">Briefing:</div>
                    <p className="text-sm text-gray-300">{demand.briefing}</p>
                  </div>
                )}
                
                {/* Team Info */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-400">Equipe de criação</div>
                  <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                    <span className="text-white text-sm">{demand.team_redator_name || 'Não definido'}</span>
                    <div className="flex gap-2">
                      <span className={clsx('px-2 py-0.5 rounded text-xs', demand.team_redator_id ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-500')}>Redator</span>
                      <span className={clsx('px-2 py-0.5 rounded text-xs', demand.team_designer_id ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-gray-500')}>Designer</span>
                    </div>
                  </div>
                  
                  {demand.external_approvers.length > 0 && (
                    <>
                      <div className="text-sm font-medium text-gray-400 mt-4">Aprovadores externos</div>
                      <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                        <span className="text-white text-sm">{demand.external_approvers[0].approver_name}</span>
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                          Acesso total
                        </span>
                      </div>
                    </>
                  )}
                </div>
                
                {/* History */}
                {demand.history && demand.history.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-400">Histórico</div>
                    <div className="space-y-2">
                      {demand.history.slice(-5).map((entry) => (
                        <div key={entry.id} className="flex items-start gap-2 text-xs">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5"></div>
                          <div>
                            <span className="text-gray-300">{entry.description}</span>
                            <span className="text-gray-600 ml-2">
                              {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Footer - Ações Contextuais por Fase */}
              <div className="p-4 border-t border-gray-800 space-y-2">
                {/* RASCUNHO */}
                {demand.status === 'rascunho' && (
                  <button
                    onClick={() => { openEditDemand(demand); setShowPreviewModal(null); }}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition font-medium"
                  >
                    Configurar Demanda
                  </button>
                )}

                {/* CONTEÚDO - Redator trabalhando */}
                {demand.status === 'conteudo' && (
                  <>
                    <button
                      onClick={() => { openEditDemand(demand); setShowPreviewModal(null); }}
                      className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition font-medium"
                    >
                      Criar conteúdo
                    </button>
                    <button
                      onClick={() => { sendTo(demand.id, 'design', 'Enviado para Designer!'); setShowPreviewModal(null); }}
                      className="w-full py-3 bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 rounded-xl transition font-medium"
                    >
                      Enviar para Designer 🎨
                    </button>
                  </>
                )}

                {/* DESIGN - Designer trabalhando */}
                {demand.status === 'design' && (
                  <>
                    <button
                      onClick={() => { openEditDemand(demand); setShowPreviewModal(null); }}
                      className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition font-medium"
                    >
                      Editar Design
                    </button>
                    <button
                      onClick={() => {
                        const nextStatus = demand.skip_internal_approval
                          ? (demand.skip_external_approval ? 'aprovado_agendado' : 'aprovacao_cliente')
                          : 'aprovacao_interna';
                        const msg = demand.skip_internal_approval
                          ? (demand.skip_external_approval ? 'Aprovado! Pronto para agendar.' : 'Enviado para Aprovação do Cliente!')
                          : 'Enviado para Aprovação Interna!';
                        sendTo(demand.id, nextStatus, msg);
                        setShowPreviewModal(null);
                      }}
                      className="w-full py-3 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 rounded-xl transition font-medium"
                    >
                      Enviar para Aprovação 👀
                    </button>
                  </>
                )}

                {/* APROVAÇÃO INTERNA */}
                {demand.status === 'aprovacao_interna' && (
                  <>
                    <button
                      onClick={() => {
                        const nextStatus = demand.skip_external_approval ? 'aprovado_agendado' : 'aprovacao_cliente';
                        const msg = demand.skip_external_approval ? 'Aprovado! Pronto para agendar.' : 'Aprovado internamente! Enviado para Cliente.';
                        sendTo(demand.id, nextStatus, msg);
                        setShowPreviewModal(null);
                      }}
                      className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition font-medium flex items-center justify-center gap-2"
                    >
                      ✅ Aprovar Internamente
                    </button>
                    <button
                      onClick={() => { sendTo(demand.id, 'ajustes', 'Solicitado ajustes!'); setShowPreviewModal(null); }}
                      className="w-full py-3 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 rounded-xl transition font-medium"
                    >
                      Solicitar Ajustes 🔄
                    </button>
                  </>
                )}

                {/* APROVAÇÃO CLIENTE */}
                {demand.status === 'aprovacao_cliente' && (
                  <>
                    <button
                      onClick={() => { sendTo(demand.id, demand.auto_schedule ? 'aprovado_agendado' : 'aguardando_agendamento', 'Cliente aprovou! ✅'); setShowPreviewModal(null); }}
                      className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition font-medium flex items-center justify-center gap-2"
                    >
                      ✅ Cliente Aprovou
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setShowApprovalModal(demand.id); setShowPreviewModal(null); }}
                        className="py-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 rounded-xl transition font-medium text-sm"
                      >
                        🔗 Enviar Link
                      </button>
                      <button
                        onClick={() => { sendTo(demand.id, 'ajustes', 'Cliente solicitou ajustes!'); setShowPreviewModal(null); }}
                        className="py-3 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 rounded-xl transition font-medium text-sm"
                      >
                        🔄 Ajustes
                      </button>
                    </div>
                  </>
                )}

                {/* AJUSTES */}
                {demand.status === 'ajustes' && (
                  <>
                    <button
                      onClick={() => { openEditDemand(demand); setShowPreviewModal(null); }}
                      className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition font-medium"
                    >
                      Editar Demanda
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { sendTo(demand.id, 'conteudo', 'Voltou para Redator!'); setShowPreviewModal(null); }}
                        className="py-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 rounded-xl transition font-medium text-sm"
                      >
                        ✍️ Redator
                      </button>
                      <button
                        onClick={() => { sendTo(demand.id, 'design', 'Voltou para Designer!'); setShowPreviewModal(null); }}
                        className="py-3 bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 rounded-xl transition font-medium text-sm"
                      >
                        🎨 Designer
                      </button>
                    </div>
                  </>
                )}

                {/* AGUARDANDO AGENDAMENTO */}
                {demand.status === 'aguardando_agendamento' && (
                  <>
                    <button
                      onClick={() => { sendTo(demand.id, 'aprovado_agendado', 'Agendado!'); setShowPreviewModal(null); }}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition font-medium flex items-center justify-center gap-2"
                    >
                      📅 Confirmar Agendamento
                    </button>
                    <button
                      onClick={() => { openEditDemand(demand); setShowPreviewModal(null); }}
                      className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition font-medium"
                    >
                      Editar Data/Hora
                    </button>
                  </>
                )}

                {/* APROVADO/AGENDADO */}
                {demand.status === 'aprovado_agendado' && (
                  <>
                    <button
                      onClick={() => { setShowPublishModal(demand); }}
                      className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-xl transition font-medium flex items-center justify-center gap-2"
                    >
                      <Icons.Rocket size={18} />
                      Publicar nas Redes
                    </button>
                    <button
                      onClick={() => { openEditDemand(demand); setShowPreviewModal(null); }}
                      className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition font-medium"
                    >
                      Editar Antes de Publicar
                    </button>
                  </>
                )}

                {/* CONCLUÍDO */}
                {demand.status === 'concluido' && (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-2xl">✅</span>
                    </div>
                    <p className="text-green-400 font-medium">Publicado com sucesso!</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {demand.published_date && new Date(demand.published_date).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Publicar */}
      {showPublishModal && (
        <PublishModal
          demand={showPublishModal}
          onClose={() => setShowPublishModal(null)}
          onPublished={handlePublished}
        />
      )}
    </div>
  );
};
