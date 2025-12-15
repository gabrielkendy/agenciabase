import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import type { TeamMember, UserRole } from '../types';
import clsx from 'clsx';

const ROLES: { id: UserRole; label: string; color: string }[] = [{ id: 'admin', label: 'Admin', color: 'bg-red-500/20 text-red-400' }, { id: 'manager', label: 'Gerente', color: 'bg-orange-500/20 text-orange-400' }, { id: 'member', label: 'Membro', color: 'bg-blue-500/20 text-blue-400' }];

export const TeamPage: React.FC = () => {
  const { teamMembers, addTeamMember, updateTeamMember, deleteTeamMember, addNotification } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'member' as UserRole, avatar: '', permissions: { clients: true, contracts: true, financial: false, team: false, settings: false } });

  const openNewMember = () => { setEditingMember(null); setFormData({ name: '', email: '', role: 'member', avatar: '', permissions: { clients: true, contracts: true, financial: false, team: false, settings: false } }); setShowModal(true); };
  const openEditMember = (member: TeamMember) => { setEditingMember(member); setFormData({ name: member.name, email: member.email, role: member.role, avatar: member.avatar || '', permissions: member.permissions }); setShowModal(true); };

  const handleSave = () => {
    if (!formData.name || !formData.email) { addNotification({ id: `notif-${Date.now()}`, title: 'Erro', message: 'Nome e email são obrigatórios', type: 'error', read: false, timestamp: new Date().toISOString() }); return; }
    if (editingMember) { updateTeamMember(editingMember.id, formData); addNotification({ id: `notif-${Date.now()}`, title: 'Membro Atualizado', message: formData.name, type: 'success', read: false, timestamp: new Date().toISOString() }); }
    else { const member: TeamMember = { id: `member-${Date.now()}`, ...formData, createdAt: new Date().toISOString() }; addTeamMember(member); addNotification({ id: `notif-${Date.now()}`, title: 'Membro Adicionado', message: formData.name, type: 'success', read: false, timestamp: new Date().toISOString() }); }
    setShowModal(false);
  };

  const togglePermission = (key: keyof typeof formData.permissions) => { setFormData(prev => ({ ...prev, permissions: { ...prev.permissions, [key]: !prev.permissions[key] } })); };

  return (
    <div className="h-full bg-gray-950 flex flex-col">
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
        <div><h1 className="text-xl font-bold text-white flex items-center gap-2"><Icons.Users size={24} className="text-orange-400" />Equipe</h1><p className="text-xs text-gray-500">{teamMembers.length} membros</p></div>
        <button onClick={openNewMember} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium"><Icons.Plus size={18} /> Novo Membro</button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map(member => { const role = ROLES.find(r => r.id === member.role); return (
            <div key={member.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5 hover:border-gray-700 transition-colors">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">{member.name.charAt(0)}</div>
                <div className="flex-1 min-w-0"><h3 className="font-bold text-white truncate">{member.name}</h3><p className="text-xs text-gray-500 truncate">{member.email}</p></div>
                <span className={clsx('text-xs px-2 py-1 rounded-full font-bold', role?.color)}>{role?.label}</span>
              </div>
              <div className="mb-4"><p className="text-xs font-bold text-gray-500 uppercase mb-2">Permissões</p><div className="flex flex-wrap gap-1">{member.permissions.clients && (<span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Clientes</span>)}{member.permissions.contracts && (<span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Contratos</span>)}{member.permissions.financial && (<span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Financeiro</span>)}{member.permissions.team && (<span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Equipe</span>)}{member.permissions.settings && (<span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Configurações</span>)}</div></div>
              <div className="flex gap-2"><button onClick={() => openEditMember(member)} className="flex-1 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 text-sm flex items-center justify-center gap-1"><Icons.Edit size={14} /> Editar</button><button onClick={() => { deleteTeamMember(member.id); addNotification({ id: `notif-${Date.now()}`, title: 'Membro Removido', message: member.name, type: 'warning', read: false, timestamp: new Date().toISOString() }); }} className="py-2 px-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"><Icons.Delete size={14} /></button></div>
            </div>
          ); })}
          {teamMembers.length === 0 && (<div className="col-span-full text-center py-12"><Icons.Users size={48} className="mx-auto text-gray-700 mb-4" /><p className="text-gray-500">Nenhum membro na equipe</p></div>)}
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between"><h2 className="text-lg font-bold text-white">{editingMember ? 'Editar Membro' : 'Novo Membro'}</h2><button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><Icons.Close size={20} /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Nome *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" placeholder="Nome completo" /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Email *</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" placeholder="email@exemplo.com" /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Função</label><select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none">{ROLES.map(r => (<option key={r.id} value={r.id}>{r.label}</option>))}</select></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Permissões</label><div className="space-y-2">{Object.entries({ clients: 'Clientes', contracts: 'Contratos', financial: 'Financeiro', team: 'Equipe', settings: 'Configurações' }).map(([key, label]) => (<label key={key} className="flex items-center gap-3 p-2 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800"><input type="checkbox" checked={formData.permissions[key as keyof typeof formData.permissions]} onChange={() => togglePermission(key as keyof typeof formData.permissions)} className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-orange-500 focus:ring-orange-500" /><span className="text-sm text-gray-300">{label}</span></label>))}</div></div>
            </div>
            <div className="p-5 border-t border-gray-800 flex gap-3"><button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700">Cancelar</button><button onClick={handleSave} className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-500 font-bold">{editingMember ? 'Salvar' : 'Adicionar'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
