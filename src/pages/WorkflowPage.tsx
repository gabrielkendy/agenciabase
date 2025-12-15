import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Icons } from '../components/Icons';
import { Demand, DemandStatus, ContentType, SocialChannel, WORKFLOW_COLUMNS, SOCIAL_CHANNELS, CONTENT_TYPES } from '../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export const WorkflowPage = () => {
  const { demands, clients, addDemand, updateDemand, deleteDemand, moveDemand, demandFilters, setDemandFilters, clearFilters } = useStore();
  
  const [showModal, setShowModal] = useState(false);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [draggedDemand, setDraggedDemand] = useState<string | null>(null);

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
  });

  const resetForm = () => {
    setForm({ title: '', briefing: '', caption: '', hashtags: '', client_id: '', content_type: 'post', channels: [], tags: '', scheduled_date: '', scheduled_time: '', auto_schedule: false });
    setEditingDemand(null);
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

  const openNewDemand = () => { resetForm(); setShowModal(true); };
  const openEditDemand = (demand: Demand) => {
    setEditingDemand(demand);
    setForm({
      title: demand.title, briefing: demand.briefing, caption: demand.caption || '', hashtags: demand.hashtags || '',
      client_id: demand.client_id, content_type: demand.content_type, channels: demand.channels,
      tags: demand.tags.join(', '), scheduled_date: demand.scheduled_date || '', scheduled_time: demand.scheduled_time || '',
      auto_schedule: demand.auto_schedule,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!form.title || !form.client_id) { toast.error('Preencha título e cliente'); return; }
    const demandData = {
      user_id: '1', client_id: form.client_id, title: form.title, briefing: form.briefing, caption: form.caption || undefined,
      hashtags: form.hashtags || undefined, status: 'rascunho' as DemandStatus, content_type: form.content_type, channels: form.channels,
      media: [], tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean), scheduled_date: form.scheduled_date || undefined,
      scheduled_time: form.scheduled_time || undefined, internal_approvers: [], external_approvers: [], approval_status: 'pending' as const,
      auto_schedule: form.auto_schedule, created_by_ai: false,
    };
    if (editingDemand) { updateDemand(editingDemand.id, demandData); toast.success('Demanda atualizada!'); }
    else { addDemand(demandData); toast.success('Demanda criada!'); }
    setShowModal(false); resetForm();
  };

  const handleDragStart = (id: string) => setDraggedDemand(id);
  const handleDragEnd = () => setDraggedDemand(null);
  const handleDrop = (status: DemandStatus) => { if (draggedDemand) { moveDemand(draggedDemand, status); toast.success('Demanda movida!'); setDraggedDemand(null); } };

  const sendTo = (id: string, status: DemandStatus, msg: string) => { moveDemand(id, status); toast.success(msg); };
  const generateApprovalLink = (demand: Demand) => `${window.location.origin}/aprovacao/${demand.approval_token}`;
  const copyApprovalLink = (demand: Demand) => { navigator.clipboard.writeText(generateApprovalLink(demand)); toast.success('Link copiado!'); };
  const sendWhatsApp = (demand: Demand) => { const client = getClient(demand.client_id); const msg = `Olá! Sua demanda "${demand.title}" está pronta para aprovação: ${generateApprovalLink(demand)}`; window.open(`https://wa.me/${client?.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`); };


  const DemandCard = ({ demand }: { demand: Demand }) => {
    const client = getClient(demand.client_id);
    return (
      <div draggable onDragStart={() => handleDragStart(demand.id)} onDragEnd={handleDragEnd}
        className="bg-gray-800 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-orange-500/30 transition group">
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
            <button onClick={() => openEditDemand(demand)} className="p-1.5 hover:bg-gray-700 rounded-lg"><Icons.Edit size={14} className="text-gray-400" /></button>
            <button onClick={() => { deleteDemand(demand.id); toast.success('Demanda excluída!'); }} className="p-1.5 hover:bg-gray-700 rounded-lg"><Icons.Trash size={14} className="text-red-400" /></button>
          </div>
        </div>
        {demand.media.length > 0 && <div className="mb-3 rounded-lg overflow-hidden bg-gray-900 aspect-video"><img src={demand.media[0].url} alt="" className="w-full h-full object-cover" /></div>}
        <div className="flex gap-1 mb-3 flex-wrap">
          {demand.channels.map((ch) => { const channel = SOCIAL_CHANNELS.find((c) => c.id === ch); return channel ? <span key={ch} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${channel.color}20`, color: channel.color }}>{channel.icon}</span> : null; })}
        </div>
        {demand.scheduled_date && <div className="flex items-center gap-2 text-xs text-gray-400 mb-3"><Icons.Calendar size={12} /><span>{new Date(demand.scheduled_date).toLocaleDateString('pt-BR')} {demand.scheduled_time && `às ${demand.scheduled_time}`}</span></div>}
        {demand.tags.length > 0 && <div className="flex gap-1 flex-wrap mb-3">{demand.tags.slice(0, 3).map((tag) => <span key={tag} className="text-xs bg-gray-700/50 text-gray-400 px-2 py-0.5 rounded">{tag}</span>)}</div>}
        <div className="flex gap-1 pt-2 border-t border-gray-700/50">
          {demand.status === 'rascunho' && <button onClick={() => sendTo(demand.id, 'conteudo', 'Enviado para Conteúdo!')} className="flex-1 text-xs bg-blue-500/20 text-blue-400 py-1.5 rounded-lg hover:bg-blue-500/30">✍️ Redator</button>}
          {demand.status === 'conteudo' && <button onClick={() => sendTo(demand.id, 'design', 'Enviado para Design!')} className="flex-1 text-xs bg-purple-500/20 text-purple-400 py-1.5 rounded-lg hover:bg-purple-500/30">🎨 Designer</button>}
          {demand.status === 'design' && <button onClick={() => sendTo(demand.id, 'aprovacao_interna', 'Enviado para Aprovação!')} className="flex-1 text-xs bg-yellow-500/20 text-yellow-400 py-1.5 rounded-lg hover:bg-yellow-500/30">👀 Aprovar</button>}
          {demand.status === 'aprovacao_interna' && <button onClick={() => sendTo(demand.id, 'aprovacao_cliente', 'Enviado para Cliente!')} className="flex-1 text-xs bg-orange-500/20 text-orange-400 py-1.5 rounded-lg hover:bg-orange-500/30">🤝 Cliente</button>}
          {demand.status === 'aprovacao_cliente' && (<><button onClick={() => setShowApprovalModal(demand.id)} className="flex-1 text-xs bg-blue-500/20 text-blue-400 py-1.5 rounded-lg hover:bg-blue-500/30">🔗 Link</button><button onClick={() => sendTo(demand.id, 'aprovado_agendado', 'Aprovado!')} className="flex-1 text-xs bg-green-500/20 text-green-400 py-1.5 rounded-lg hover:bg-green-500/30">✅ Aprovar</button></>)}
          {demand.status === 'ajustes' && <button onClick={() => sendTo(demand.id, 'conteudo', 'Voltou para ajustes!')} className="flex-1 text-xs bg-blue-500/20 text-blue-400 py-1.5 rounded-lg hover:bg-blue-500/30">🔄 Revisar</button>}
          {demand.status === 'aprovado_agendado' && <button onClick={() => sendTo(demand.id, 'concluido', 'Publicado!')} className="flex-1 text-xs bg-green-500/20 text-green-400 py-1.5 rounded-lg hover:bg-green-500/30">🚀 Publicar</button>}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><span className="text-3xl">📋</span> Workflow</h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie demandas de conteúdo</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button onClick={() => setViewMode('kanban')} className={clsx('px-3 py-1.5 rounded-md text-sm transition', viewMode === 'kanban' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white')}>Kanban</button>
            <button onClick={() => setViewMode('list')} className={clsx('px-3 py-1.5 rounded-md text-sm transition', viewMode === 'list' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white')}>Lista</button>
          </div>
          <button onClick={openNewDemand} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl transition font-medium"><Icons.Plus size={18} /> Nova Demanda</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative">
          <Icons.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" placeholder="Buscar demandas..." value={demandFilters.search} onChange={(e) => setDemandFilters({ search: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 w-64 focus:border-orange-500 focus:outline-none" />
        </div>
        <select value={demandFilters.clientId || ''} onChange={(e) => setDemandFilters({ clientId: e.target.value || null })} className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:border-orange-500 focus:outline-none">
          <option value="">Todos os Clientes</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={demandFilters.channel || ''} onChange={(e) => setDemandFilters({ channel: e.target.value || null })} className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:border-orange-500 focus:outline-none">
          <option value="">Todos os Canais</option>
          {SOCIAL_CHANNELS.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
        {(demandFilters.clientId || demandFilters.channel || demandFilters.search) && <button onClick={clearFilters} className="text-sm text-orange-400 hover:text-orange-300">Limpar filtros</button>}
        <div className="ml-auto text-sm text-gray-500">{filteredDemands.length} demanda{filteredDemands.length !== 1 ? 's' : ''}</div>
      </div>


      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-max pb-4">
          {WORKFLOW_COLUMNS.map((column) => (
            <div key={column.id} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(column.id)} className={clsx('w-72 flex-shrink-0 bg-gray-800/50 rounded-2xl flex flex-col', draggedDemand && 'ring-2 ring-orange-500/30')}>
              <div className="p-4 border-b border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="text-lg">{column.icon}</span><h3 className="font-semibold text-white text-sm">{column.label}</h3></div>
                  <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">{demandsByStatus[column.id]?.length || 0}</span>
                </div>
              </div>
              <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)]">
                {demandsByStatus[column.id]?.length === 0 ? <div className="text-center py-8 text-gray-600 text-sm">Nenhuma demanda</div> : demandsByStatus[column.id]?.map((demand) => <DemandCard key={demand.id} demand={demand} />)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Nova/Editar Demanda */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{editingDemand ? 'Editar Demanda' : 'Nova Demanda'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-white"><Icons.X size={24} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div><label className="block text-sm font-medium text-gray-300 mb-2">1. Título</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Post sobre lançamento" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">2. Cliente</label><select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"><option value="">Selecione...</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">3. Canais</label><div className="flex flex-wrap gap-2">{SOCIAL_CHANNELS.map((ch) => <button key={ch.id} type="button" onClick={() => setForm({ ...form, channels: form.channels.includes(ch.id) ? form.channels.filter((c) => c !== ch.id) : [...form.channels, ch.id] })} className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl border transition', form.channels.includes(ch.id) ? 'border-orange-500 bg-orange-500/20 text-white' : 'border-gray-700 bg-gray-800 text-gray-400')}><span>{ch.icon}</span><span className="text-sm">{ch.label}</span></button>)}</div></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">4. Tipo</label><div className="flex flex-wrap gap-2">{CONTENT_TYPES.map((t) => <button key={t.id} type="button" onClick={() => setForm({ ...form, content_type: t.id })} className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl border transition', form.content_type === t.id ? 'border-orange-500 bg-orange-500/20 text-white' : 'border-gray-700 bg-gray-800 text-gray-400')}><span>{t.icon}</span><span className="text-sm">{t.label}</span></button>)}</div></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">5. Data</label><input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Horário</label><input type="time" value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">6. Tags</label><input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="promo, urgente (vírgula)" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">7. Briefing</label><textarea value={form.briefing} onChange={(e) => setForm({ ...form, briefing: e.target.value })} placeholder="Descreva a demanda..." rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none" /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">8. Legenda</label><textarea value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} placeholder="Legenda do post..." rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none" /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">9. Hashtags</label><input type="text" value={form.hashtags} onChange={(e) => setForm({ ...form, hashtags: e.target.value })} placeholder="#marketing #digital" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none" /></div>
            </div>
            <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="px-6 py-2 text-gray-400 hover:text-white">Cancelar</button>
              <button onClick={handleSubmit} className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition">Salvar</button>
            </div>
          </div>
        </div>
      )}


      {/* Modal: Link de Aprovação */}
      {showApprovalModal && (() => {
        const demand = demands.find((d) => d.id === showApprovalModal);
        const client = demand ? getClient(demand.client_id) : null;
        return demand ? (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">🔗 Link de aprovação</h2>
                <button onClick={() => setShowApprovalModal(null)} className="text-gray-400 hover:text-white"><Icons.X size={24} /></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-gray-400 text-sm">Qualquer pessoa com o link pode realizar a aprovação. Compartilhe apenas com o <span className="text-orange-400 font-medium">aprovador da demanda</span>.</p>
                <div className="bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-medium">{client?.name}</span>
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">Aguardando</span>
                  </div>
                  <div className="text-sm text-gray-400">{client?.email}</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-2">
                  <div className="flex-1 text-sm text-gray-300 truncate">{generateApprovalLink(demand)}</div>
                  <button onClick={() => copyApprovalLink(demand)} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition">📋 Copiar</button>
                  <button onClick={() => sendWhatsApp(demand)} className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition">💬</button>
                </div>
              </div>
            </div>
          </div>
        ) : null;
      })()}
    </div>
  );
};
