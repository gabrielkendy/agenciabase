import { useState } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import type { Client } from '../types';
import clsx from 'clsx';
import { v4 as uuid } from 'uuid';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'];

export const ClientsPage: React.FC = () => {
  const { clients, tasks, addClient, updateClient, deleteClient, addNotification } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '', cnpj: '', instagram: '', website: '', color: COLORS[0], status: 'prospect' as Client['status'], monthly_value: 0, notes: '' });

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.company.toLowerCase().includes(searchTerm.toLowerCase()));

  const openNewClient = () => { setEditingClient(null); setFormData({ name: '', email: '', phone: '', company: '', cnpj: '', instagram: '', website: '', color: COLORS[Math.floor(Math.random() * COLORS.length)], status: 'prospect', monthly_value: 0, notes: '' }); setShowModal(true); };
  const openEditClient = (client: Client) => { setEditingClient(client); setFormData({ name: client.name, email: client.email, phone: client.phone || '', company: client.company, cnpj: client.cnpj || '', instagram: client.instagram || '', website: client.website || '', color: client.color, status: client.status, monthly_value: client.monthly_value || 0, notes: client.notes || '' }); setShowModal(true); };

  const handleSave = () => {
    if (!formData.name || !formData.email) { addNotification({ id: uuid(), title: 'Erro', message: 'Nome e email obrigatórios', type: 'error', read: false, timestamp: new Date().toISOString() }); return; }
    const clientData: Client = { id: editingClient?.id || uuid(), user_id: '', name: formData.name, email: formData.email, phone: formData.phone, company: formData.company, cnpj: formData.cnpj, instagram: formData.instagram, website: formData.website, color: formData.color, status: formData.status, monthly_value: formData.monthly_value, notes: formData.notes, created_at: editingClient?.created_at || new Date().toISOString() };
    if (editingClient) updateClient(editingClient.id, clientData); else addClient(clientData);
    addNotification({ id: uuid(), title: editingClient ? 'Atualizado' : 'Cadastrado', message: formData.name, type: 'success', read: false, timestamp: new Date().toISOString() });
    setShowModal(false);
  };

  const handleDelete = (client: Client) => { if (confirm(`Excluir "${client.name}"?`)) { deleteClient(client.id); addNotification({ id: uuid(), title: 'Excluído', message: client.name, type: 'warning', read: false, timestamp: new Date().toISOString() }); } };
  const getClientStats = (id: string) => ({ tasks: tasks.filter(t => t.client_id === id).length, published: tasks.filter(t => t.client_id === id && t.status === 'published').length });

  return (
    <div className="h-full bg-gray-950 flex flex-col">
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
        <div><h1 className="text-xl font-bold text-white flex items-center gap-2"><Icons.Clients size={24} className="text-orange-400" />Clientes</h1><p className="text-xs text-gray-500">{clients.length} cadastrados</p></div>
        <button onClick={openNewClient} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-lg font-medium"><Icons.Plus size={18} />Novo</button>
      </div>
      <div className="p-4 border-b border-gray-800"><div className="relative max-w-md"><Icons.Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div></div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map(client => { const stats = getClientStats(client.id); return (
            <div key={client.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700">
              <div className="h-2" style={{ backgroundColor: client.color }} />
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: client.color }}>{client.name.charAt(0)}</div><div><h3 className="font-bold text-white">{client.name}</h3><p className="text-xs text-gray-500">{client.company}</p></div></div>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', client.status === 'active' ? 'bg-green-500/20 text-green-400' : client.status === 'inactive' ? 'bg-gray-500/20 text-gray-400' : 'bg-yellow-500/20 text-yellow-400')}>{client.status === 'active' ? 'Ativo' : client.status === 'inactive' ? 'Inativo' : 'Prospect'}</span>
                </div>
                <div className="space-y-1.5 mb-3 text-xs text-gray-400"><p className="flex items-center gap-2"><Icons.Mail size={12} />{client.email}</p>{client.phone && <p className="flex items-center gap-2"><Icons.Phone size={12} />{client.phone}</p>}{client.instagram && <p className="flex items-center gap-2"><Icons.Instagram size={12} />{client.instagram}</p>}</div>
                {client.monthly_value > 0 && <div className="bg-gray-800/50 rounded-lg p-2 mb-3 text-center"><span className="text-sm font-bold text-green-400">R$ {client.monthly_value.toLocaleString('pt-BR')}/mês</span></div>}
                <div className="grid grid-cols-2 gap-2 mb-3"><div className="bg-gray-800/50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-white">{stats.tasks}</p><p className="text-[10px] text-gray-500">Tarefas</p></div><div className="bg-gray-800/50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-green-400">{stats.published}</p><p className="text-[10px] text-gray-500">Publicados</p></div></div>
                <div className="flex gap-2"><button onClick={() => openEditClient(client)} className="flex-1 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 text-sm flex items-center justify-center gap-1"><Icons.Edit size={14} />Editar</button><button onClick={() => handleDelete(client)} className="py-2 px-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"><Icons.Delete size={14} /></button></div>
              </div>
            </div>
          ); })}
        </div>
        {filteredClients.length === 0 && <div className="text-center py-16 text-gray-500"><Icons.Clients size={48} className="mx-auto mb-4 opacity-30" /><p>Nenhum cliente</p><button onClick={openNewClient} className="mt-4 text-orange-400">+ Cadastrar</button></div>}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-800">
            <div className="flex items-center justify-between p-4 border-b border-gray-800"><h2 className="text-lg font-bold text-white">{editingClient ? 'Editar' : 'Novo'} Cliente</h2><button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><Icons.Close size={20} /></button></div>
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Nome *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Email *</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Telefone</label><input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Empresa</label><input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Instagram</label><input type="text" value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Valor Mensal</label><input type="number" value={formData.monthly_value || ''} onChange={(e) => setFormData({ ...formData, monthly_value: parseFloat(e.target.value) || 0 })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Status</label><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none"><option value="prospect">Prospect</option><option value="active">Ativo</option><option value="inactive">Inativo</option></select></div>
                <div><label className="block text-xs text-gray-500 mb-1">Cor</label><div className="flex gap-2 flex-wrap">{COLORS.map(c => <button key={c} onClick={() => setFormData({ ...formData, color: c })} className={clsx('w-8 h-8 rounded-lg', formData.color === c && 'ring-2 ring-white ring-offset-2 ring-offset-gray-900')} style={{ backgroundColor: c }} />)}</div></div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-800 flex justify-end gap-3"><button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button><button onClick={handleSave} className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-medium">{editingClient ? 'Salvar' : 'Cadastrar'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
