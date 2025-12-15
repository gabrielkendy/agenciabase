import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import type { Contract } from '../types';
import clsx from 'clsx';

const SERVICES = ['Social Media', 'Tráfego Pago', 'Design', 'Vídeo', 'Consultoria', 'Website', 'SEO', 'Email Marketing'];

export const ContractsPage: React.FC = () => {
  const { contracts, clients, addContract, updateContract, deleteContract, addNotification } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState({ clientId: '', title: '', value: '', billingCycle: 'monthly' as 'monthly' | 'quarterly' | 'yearly' | 'once', services: [] as string[], startDate: '', endDate: '', status: 'active' as 'active' | 'paused' | 'cancelled' | 'completed' });

  const openNewContract = () => { setEditingContract(null); setFormData({ clientId: clients[0]?.id || '', title: '', value: '', billingCycle: 'monthly', services: [], startDate: new Date().toISOString().split('T')[0], endDate: '', status: 'active' }); setShowModal(true); };
  const openEditContract = (contract: Contract) => { setEditingContract(contract); setFormData({ clientId: contract.clientId, title: contract.title, value: contract.value.toString(), billingCycle: contract.billingCycle, services: contract.services, startDate: contract.startDate.split('T')[0], endDate: contract.endDate?.split('T')[0] || '', status: contract.status }); setShowModal(true); };

  const handleSave = () => {
    if (!formData.clientId || !formData.title || !formData.value) { addNotification({ id: `notif-${Date.now()}`, title: 'Erro', message: 'Preencha todos os campos obrigatórios', type: 'error', read: false, timestamp: new Date().toISOString() }); return; }
    const contract: Contract = { id: editingContract?.id || `contract-${Date.now()}`, clientId: formData.clientId, title: formData.title, value: parseFloat(formData.value), billingCycle: formData.billingCycle, services: formData.services, startDate: formData.startDate, endDate: formData.endDate || undefined, status: formData.status, createdAt: editingContract?.createdAt || new Date().toISOString() };
    if (editingContract) { updateContract(editingContract.id, contract); addNotification({ id: `notif-${Date.now()}`, title: 'Contrato Atualizado', message: formData.title, type: 'success', read: false, timestamp: new Date().toISOString() }); }
    else { addContract(contract); addNotification({ id: `notif-${Date.now()}`, title: 'Contrato Criado', message: formData.title, type: 'success', read: false, timestamp: new Date().toISOString() }); }
    setShowModal(false);
  };

  const toggleService = (service: string) => { setFormData(prev => ({ ...prev, services: prev.services.includes(service) ? prev.services.filter(s => s !== service) : [...prev.services, service] })); };
  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || '-';
  const totalValue = contracts.filter(c => c.status === 'active').reduce((sum, c) => sum + c.value, 0);

  return (
    <div className="h-full bg-gray-950 flex flex-col">
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
        <div><h1 className="text-xl font-bold text-white flex items-center gap-2"><Icons.Contract size={24} className="text-orange-400" />Contratos</h1><p className="text-xs text-gray-500">{contracts.length} contratos • R$ {totalValue.toLocaleString('pt-BR')}/mês ativos</p></div>
        <button onClick={openNewContract} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium"><Icons.Plus size={18} /> Novo Contrato</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contracts.map(contract => (
            <div key={contract.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div><h3 className="font-bold text-white">{contract.title}</h3><p className="text-xs text-gray-500">{getClientName(contract.clientId)}</p></div>
                <span className={clsx('text-xs px-2 py-0.5 rounded-full font-bold', contract.status === 'active' ? 'bg-green-500/20 text-green-400' : contract.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' : contract.status === 'completed' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400')}>{contract.status === 'active' ? 'Ativo' : contract.status === 'paused' ? 'Pausado' : contract.status === 'completed' ? 'Concluído' : 'Cancelado'}</span>
              </div>
              <p className="text-2xl font-bold text-orange-400 mb-2">R$ {contract.value.toLocaleString('pt-BR')}<span className="text-xs text-gray-500 font-normal">/{contract.billingCycle === 'monthly' ? 'mês' : contract.billingCycle === 'quarterly' ? 'trimestre' : contract.billingCycle === 'yearly' ? 'ano' : 'único'}</span></p>
              <div className="flex flex-wrap gap-1 mb-3">{contract.services.slice(0, 3).map(s => (<span key={s} className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{s}</span>))}{contract.services.length > 3 && (<span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">+{contract.services.length - 3}</span>)}</div>
              <div className="flex gap-2"><button onClick={() => openEditContract(contract)} className="flex-1 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 text-sm">Editar</button><button onClick={() => { deleteContract(contract.id); addNotification({ id: `notif-${Date.now()}`, title: 'Contrato Excluído', message: contract.title, type: 'warning', read: false, timestamp: new Date().toISOString() }); }} className="py-2 px-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"><Icons.Delete size={14} /></button></div>
            </div>
          ))}
          {contracts.length === 0 && (<div className="col-span-full text-center py-12"><Icons.Contract size={48} className="mx-auto text-gray-700 mb-4" /><p className="text-gray-500">Nenhum contrato encontrado</p></div>)}
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between"><h2 className="text-lg font-bold text-white">{editingContract ? 'Editar Contrato' : 'Novo Contrato'}</h2><button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><Icons.Close size={20} /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Cliente *</label><select value={formData.clientId} onChange={(e) => setFormData({ ...formData, clientId: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none">{clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Título *</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" placeholder="Ex: Gestão de Redes Sociais" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Valor *</label><input type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" placeholder="0,00" /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Ciclo</label><select value={formData.billingCycle} onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value as any })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none"><option value="monthly">Mensal</option><option value="quarterly">Trimestral</option><option value="yearly">Anual</option><option value="once">Único</option></select></div>
              </div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Serviços</label><div className="flex flex-wrap gap-2">{SERVICES.map(s => (<button key={s} type="button" onClick={() => toggleService(s)} className={clsx('text-xs px-3 py-1.5 rounded-lg transition-colors', formData.services.includes(s) ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>{s}</button>))}</div></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Início</label><input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Status</label><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none"><option value="active">Ativo</option><option value="paused">Pausado</option><option value="completed">Concluído</option><option value="cancelled">Cancelado</option></select></div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-800 flex gap-3"><button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700">Cancelar</button><button onClick={handleSave} className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-500 font-bold">{editingContract ? 'Salvar' : 'Criar Contrato'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
