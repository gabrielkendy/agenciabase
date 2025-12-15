import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import type { Client } from '../types';
import clsx from 'clsx';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'];

export const ClientsPage: React.FC = () => {
  const { clients, contracts, tasks, addClient, updateClient, deleteClient, addNotification } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '', cnpj: '', address: '', color: COLORS[0], notes: '', status: 'active' as 'active' | 'inactive' | 'prospect' });

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.company.toLowerCase().includes(searchTerm.toLowerCase()));

  const openNewClient = () => { setEditingClient(null); setFormData({ name: '', email: '', phone: '', company: '', cnpj: '', address: '', color: COLORS[Math.floor(Math.random() * COLORS.length)], notes: '', status: 'prospect' }); setShowModal(true); };
  const openEditClient = (client: Client) => { setEditingClient(client); setFormData({ name: client.name, email: client.email, phone: client.phone, company: client.company, cnpj: client.cnpj || '', address: client.address || '', color: client.color, notes: client.notes || '', status: client.status }); setShowModal(true); };

  const handleSave = () => {
    if (!formData.name || !formData.email) { addNotification({ id: `notif-${Date.now()}`, title: 'Erro', message: 'Nome e email são obrigatórios', type: 'error', read: false, timestamp: new Date().toISOString() }); return; }
    if (editingClient) { updateClient(editingClient.id, formData); addNotification({ id: `notif-${Date.now()}`, title: 'Cliente Atualizado', message: formData.name, type: 'success', read: false, timestamp: new Date().toISOString() }); }
    else { const newClient: Client = { id: `client-${Date.now()}`, ...formData, createdAt: new Date().toISOString() }; addClient(newClient); addNotification({ id: `notif-${Date.now()}`, title: 'Cliente Cadastrado', message: formData.name, type: 'success', read: false, timestamp: new Date().toISOString() }); }
    setShowModal(false);
  };

  const handleDelete = (client: Client) => { if (confirm(`Excluir cliente "${client.name}"?`)) { deleteClient(client.id); addNotification({ id: `notif-${Date.now()}`, title: 'Cliente Excluído', message: client.name, type: 'warning', read: false, timestamp: new Date().toISOString() }); } };
  const getClientStats = (clientId: string) => ({ contracts: contracts.filter(c => c.clientId === clientId && c.status === 'active').length, tasks: tasks.filter(t => t.clientId === clientId).length, revenue: contracts.filter(c => c.clientId === clientId).reduce((sum, c) => sum + c.value, 0) });

  return (
    <div className="h-full bg-gray-950 flex flex-col">
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
        <div><h1 className="text-xl font-bold text-white flex items-center gap-2"><Icons.Client size={24} className="text-orange-400" />Clientes</h1><p className="text-xs text-gray-500">{clients.length} clientes cadastrados</p></div>
        <button onClick={openNewClient} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium"><Icons.Plus size={18} /> Novo Cliente</button>
      </div>
      <div className="p-4 border-b border-gray-800"><div className="relative max-w-md"><Icons.Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder="Buscar clientes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div></div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map(client => { const stats = getClientStats(client.id); return (
            <div key={client.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-colors">
              <div className="h-2" style={{ backgroundColor: client.color }} />
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: client.color }}>{client.name.charAt(0)}</div><div><h3 className="font-bold text-white">{client.name}</h3><p className="text-xs text-gray-500">{client.company}</p></div></div>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-bold', client.status === 'active' ? 'bg-green-500/20 text-green-400' : client.status === 'inactive' ? 'bg-gray-500/20 text-gray-400' : 'bg-yellow-500/20 text-yellow-400')}>{client.status === 'active' ? 'Ativo' : client.status === 'inactive' ? 'Inativo' : 'Prospect'}</span>
                </div>
                <div className="space-y-1.5 mb-4"><p className="text-xs text-gray-400 flex items-center gap-2"><Icons.Mail size={12} /> {client.email}</p><p className="text-xs text-gray-400 flex items-center gap-2"><Icons.Phone size={12} /> {client.phone}</p></div>
                <div className="grid grid-cols-3 gap-2 mb-4"><div className="bg-gray-800/50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-white">{stats.contracts}</p><p className="text-[10px] text-gray-500">Contratos</p></div><div className="bg-gray-800/50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-white">{stats.tasks}</p><p className="text-[10px] text-gray-500">Tarefas</p></div><div className="bg-gray-800/50 rounded-lg p-2 text-center"><p className="text-xs font-bold text-green-400">R$ {(stats.revenue / 1000).toFixed(1)}k</p><p className="text-[10px] text-gray-500">Receita</p></div></div>
                <div className="flex gap-2"><button onClick={() => openEditClient(client)} className="flex-1 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 text-sm flex items-center justify-center gap-1"><Icons.Edit size={14} /> Editar</button><button onClick={() => handleDelete(client)} className="py-2 px-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"><Icons.Delete size={14} /></button></div>
              </div>
            </div>
          ); })}
          {filteredClients.length === 0 && (<div className="col-span-full text-center py-12"><Icons.Client size={48} className="mx-auto text-gray-700 mb-4" /><p className="text-gray-500">Nenhum cliente encontrado</p></div>)}
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900"><h2 className="text-lg font-bold text-white">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2><button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><Icons.Close size={20} /></button></div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Nome *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" placeholder="Nome do cliente" /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Email *</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" placeholder="email@exemplo.com" /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Telefone</label><input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" placeholder="(00) 00000-0000" /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Empresa</label><input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" placeholder="Nome da empresa" /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Status</label><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none"><option value="prospect">Prospect</option><option value="active">Ativo</option><option value="inactive">Inativo</option></select></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Cor</label><div className="flex gap-2 flex-wrap">{COLORS.map(color => (<button key={color} type="button" onClick={() => setFormData({ ...formData, color })} className={clsx('w-8 h-8 rounded-lg transition-transform', formData.color === color && 'ring-2 ring-white scale-110')} style={{ backgroundColor: color }} />))}</div></div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-800 flex gap-3"><button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700">Cancelar</button><button onClick={handleSave} className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-500 font-bold">{editingClient ? 'Salvar' : 'Cadastrar'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
