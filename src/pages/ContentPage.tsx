import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import type { Content, SocialChannel } from '../types';
import clsx from 'clsx';

const CHANNELS: SocialChannel[] = ['instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'twitter'];
const CONTENT_TYPES = ['post', 'carousel', 'reels', 'stories', 'video'];

export const ContentPage: React.FC = () => {
  const { contents, clients, addContent, deleteContent, addNotification, selectedClientId } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [formData, setFormData] = useState({ clientId: '', title: '', content: '', channel: 'instagram' as SocialChannel, contentType: 'post', mediaUrl: '', hashtags: '', scheduledAt: '', status: 'draft' as 'draft' | 'scheduled' | 'published' });

  const filteredContents = contents.filter(c => (selectedClientId ? c.clientId === selectedClientId : true) && (filter === 'all' ? true : c.channel === filter));

  const handleSave = () => {
    if (!formData.title || !formData.content) { addNotification({ id: `notif-${Date.now()}`, title: 'Erro', message: 'Título e conteúdo são obrigatórios', type: 'error', read: false, timestamp: new Date().toISOString() }); return; }
    const content: Content = { id: `content-${Date.now()}`, clientId: formData.clientId || clients[0]?.id || '', title: formData.title, content: formData.content, channel: formData.channel, contentType: formData.contentType, mediaUrls: formData.mediaUrl ? [formData.mediaUrl] : [], hashtags: formData.hashtags.split(' ').filter(h => h), status: formData.status, scheduledAt: formData.scheduledAt || undefined, createdAt: new Date().toISOString() };
    addContent(content); addNotification({ id: `notif-${Date.now()}`, title: 'Conteúdo Criado', message: content.title, type: 'success', read: false, timestamp: new Date().toISOString() });
    setShowModal(false); setFormData({ clientId: '', title: '', content: '', channel: 'instagram', contentType: 'post', mediaUrl: '', hashtags: '', scheduledAt: '', status: 'draft' });
  };

  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || '-';

  return (
    <div className="h-full bg-gray-950 flex flex-col">
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
        <div><h1 className="text-xl font-bold text-white flex items-center gap-2"><Icons.Folder size={24} className="text-orange-400" />Biblioteca de Conteúdos</h1><p className="text-xs text-gray-500">{filteredContents.length} conteúdos</p></div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium"><Icons.Plus size={18} /> Novo Conteúdo</button>
      </div>
      <div className="flex items-center gap-2 p-4 border-b border-gray-800 overflow-x-auto"><button onClick={() => setFilter('all')} className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap', filter === 'all' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>Todos</button>{CHANNELS.map(ch => (<button key={ch} onClick={() => setFilter(ch)} className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize whitespace-nowrap', filter === ch ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>{ch}</button>))}</div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContents.map(content => (
            <div key={content.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-colors group">
              {content.mediaUrls[0] && (<div className="aspect-video bg-gray-800"><img src={content.mediaUrls[0]} alt="" className="w-full h-full object-cover" /></div>)}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2"><h3 className="font-medium text-white text-sm line-clamp-1">{content.title}</h3><span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-bold', content.status === 'published' ? 'bg-green-500/20 text-green-400' : content.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400')}>{content.status === 'published' ? 'Publicado' : content.status === 'scheduled' ? 'Agendado' : 'Rascunho'}</span></div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{content.content}</p>
                <div className="flex items-center justify-between"><div className="flex items-center gap-1"><span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded capitalize">{content.channel}</span><span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">{content.contentType}</span></div><button onClick={() => { deleteContent(content.id); addNotification({ id: `notif-${Date.now()}`, title: 'Conteúdo Excluído', message: content.title, type: 'warning', read: false, timestamp: new Date().toISOString() }); }} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"><Icons.Delete size={14} /></button></div>
              </div>
            </div>
          ))}
          {filteredContents.length === 0 && (<div className="col-span-full text-center py-12"><Icons.Folder size={48} className="mx-auto text-gray-700 mb-4" /><p className="text-gray-500">Nenhum conteúdo encontrado</p></div>)}
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between"><h2 className="text-lg font-bold text-white">Novo Conteúdo</h2><button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><Icons.Close size={20} /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Título *</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" placeholder="Título do conteúdo" /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Conteúdo *</label><textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={4} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none resize-none" placeholder="Texto da publicação..." /></div>
              <div className="grid grid-cols-3 gap-4"><div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Cliente</label><select value={formData.clientId} onChange={(e) => setFormData({ ...formData, clientId: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none">{clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div><div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Canal</label><select value={formData.channel} onChange={(e) => setFormData({ ...formData, channel: e.target.value as SocialChannel })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none">{CHANNELS.map(ch => (<option key={ch} value={ch}>{ch}</option>))}</select></div><div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Tipo</label><select value={formData.contentType} onChange={(e) => setFormData({ ...formData, contentType: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none">{CONTENT_TYPES.map(t => (<option key={t} value={t}>{t}</option>))}</select></div></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Hashtags</label><input type="text" value={formData.hashtags} onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" placeholder="#marketing #digital #socialmedia" /></div>
            </div>
            <div className="p-5 border-t border-gray-800 flex gap-3"><button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700">Cancelar</button><button onClick={handleSave} className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-500 font-bold">Criar</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
