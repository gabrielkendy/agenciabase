import { useState } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { TeamMemberRole, DEFAULT_ROLE_PERMISSIONS, TeamMember } from '../types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface TeamMemberForm {
  name: string;
  email: string;
  phone?: string;
  role: TeamMemberRole;
  password: string;
}

const ROLE_LABELS: Record<TeamMemberRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  redator: 'Redator',
  designer: 'Designer',
  editor: 'Editor',
  viewer: 'Visualizador',
  both: 'Redator & Designer',
};

export const SettingsPage: React.FC = () => {
  const { teamMembers, addTeamMember, updateTeamMember, deleteTeamMember, currentUser } = useStore();

  // Team management
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [teamForm, setTeamForm] = useState<TeamMemberForm>({
    name: '',
    email: '',
    phone: '',
    role: 'editor',
    password: '',
  });

  // Verificar se usuário pode gerenciar equipe
  const canManageTeam = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'manager';

  // Team Member Functions
  const resetTeamForm = () => {
    setTeamForm({ name: '', email: '', phone: '', role: 'editor', password: '' });
    setEditingMember(null);
  };

  const openEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setTeamForm({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      role: member.role as TeamMemberRole,
      password: '',
    });
    setShowTeamModal(true);
  };

  const handleSaveTeamMember = () => {
    if (!teamForm.name || !teamForm.email) {
      toast.error('Preencha nome e email');
      return;
    }

    const permissions = DEFAULT_ROLE_PERMISSIONS[teamForm.role];

    if (editingMember) {
      updateTeamMember(editingMember.id, {
        name: teamForm.name,
        email: teamForm.email,
        phone: teamForm.phone,
        role: teamForm.role,
        permissions,
      });
      toast.success('Membro atualizado!');
    } else {
      if (!teamForm.password) {
        toast.error('Defina uma senha para o novo membro');
        return;
      }
      addTeamMember({
        name: teamForm.name,
        email: teamForm.email,
        phone: teamForm.phone,
        role: teamForm.role,
        password: teamForm.password,
        permissions,
        is_active: true,
      });
      toast.success('Membro adicionado!');
    }

    setShowTeamModal(false);
    resetTeamForm();
  };

  const handleChangePassword = () => {
    if (!showPasswordModal || !newPassword) {
      toast.error('Digite a nova senha');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    updateTeamMember(showPasswordModal, { password: newPassword });
    toast.success('Senha alterada!');
    setShowPasswordModal(null);
    setNewPassword('');
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    updateTeamMember(id, { is_active: !currentActive });
    toast.success(currentActive ? 'Membro desativado' : 'Membro ativado');
  };

  const handleDeleteMember = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este membro?')) {
      deleteTeamMember(id);
      toast.success('Membro excluído');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Icons.Users size={28} className="text-orange-400" />
            Gerenciar Equipe
          </h1>
          <p className="text-gray-400 mt-1">Adicione membros e defina permissões de acesso</p>
        </div>

        {/* Add Member Button */}
        {canManageTeam && (
          <div className="flex justify-end mb-6">
            <button
              onClick={() => { resetTeamForm(); setShowTeamModal(true); }}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-xl text-white font-medium transition flex items-center gap-2"
            >
              <Icons.Plus size={18} /> Adicionar Membro
            </button>
          </div>
        )}

        {/* Team Members List */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase">Membro</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase">Função</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                  {canManageTeam && (
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {teamMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white font-medium">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">{member.name}</p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        'px-3 py-1 rounded-full text-xs font-medium',
                        member.role === 'admin' && 'bg-purple-500/20 text-purple-400',
                        member.role === 'manager' && 'bg-blue-500/20 text-blue-400',
                        member.role === 'redator' && 'bg-green-500/20 text-green-400',
                        member.role === 'designer' && 'bg-pink-500/20 text-pink-400',
                        member.role === 'editor' && 'bg-yellow-500/20 text-yellow-400',
                        member.role === 'viewer' && 'bg-gray-500/20 text-gray-400',
                      )}>
                        {ROLE_LABELS[member.role as TeamMemberRole] || member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        'px-3 py-1 rounded-full text-xs font-medium',
                        member.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      )}>
                        {member.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    {canManageTeam && (
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditMember(member)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                            title="Editar"
                          >
                            <Icons.Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setShowPasswordModal(member.id)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                            title="Alterar Senha"
                          >
                            <Icons.Key size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleActive(member.id, member.is_active)}
                            className={clsx(
                              'p-2 rounded-lg transition',
                              member.is_active ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-green-400 hover:bg-green-500/20'
                            )}
                            title={member.is_active ? 'Desativar' : 'Ativar'}
                          >
                            {member.is_active ? <Icons.UserMinus size={16} /> : <Icons.UserCheck size={16} />}
                          </button>
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                            title="Excluir"
                          >
                            <Icons.Trash size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {teamMembers.length === 0 && (
                  <tr>
                    <td colSpan={canManageTeam ? 4 : 3} className="px-6 py-12 text-center text-gray-500">
                      <Icons.Users size={48} className="mx-auto mb-3 opacity-50" />
                      <p>Nenhum membro cadastrado</p>
                      {canManageTeam && (
                        <button
                          onClick={() => { resetTeamForm(); setShowTeamModal(true); }}
                          className="mt-3 text-orange-400 hover:text-orange-300"
                        >
                          Adicionar primeiro membro
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Permissions Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Icons.Shield size={20} className="text-orange-400" />
            Níveis de Permissão
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(ROLE_LABELS).map(([role, label]) => {
              const perms = DEFAULT_ROLE_PERMISSIONS[role as TeamMemberRole];
              return (
                <div key={role} className="p-4 bg-gray-800 rounded-xl">
                  <h4 className="font-medium text-white mb-2">{label}</h4>
                  <div className="space-y-1 text-xs">
                    {perms?.canManageTeam && <p className="text-green-400">✓ Gerenciar equipe</p>}
                    {perms?.canManageClients && <p className="text-green-400">✓ Gerenciar clientes</p>}
                    {perms?.canCreateDemands && <p className="text-green-400">✓ Criar demandas</p>}
                    {perms?.canEditDemands && <p className="text-green-400">✓ Editar demandas</p>}
                    {perms?.canApproveDemands && <p className="text-green-400">✓ Aprovar demandas</p>}
                    {perms?.canPublish && <p className="text-green-400">✓ Publicar</p>}
                    {perms?.canViewReports && <p className="text-green-400">✓ Ver relatórios</p>}
                    {perms?.canManageSettings && <p className="text-green-400">✓ Configurações</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Alert */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-sm text-blue-400">
            <Icons.Info size={16} className="inline mr-2" />
            <strong>Dica:</strong> As integrações com APIs (IA, Studio, Redes Sociais) estão disponíveis no painel de Administração para usuários com permissão.
          </p>
        </div>
      </div>

      {/* Team Member Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTeamModal(false)}>
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">
              {editingMember ? 'Editar Membro' : 'Novo Membro'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome *</label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  placeholder="Nome completo"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Email *</label>
                <input
                  type="email"
                  value={teamForm.email}
                  onChange={(e) => setTeamForm({ ...teamForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Telefone</label>
                <input
                  type="tel"
                  value={teamForm.phone}
                  onChange={(e) => setTeamForm({ ...teamForm, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Função *</label>
                <select
                  value={teamForm.role}
                  onChange={(e) => setTeamForm({ ...teamForm, role: e.target.value as TeamMemberRole })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {!editingMember && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Senha *</label>
                  <input
                    type="password"
                    value={teamForm.password}
                    onChange={(e) => setTeamForm({ ...teamForm, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => { setShowTeamModal(false); resetTeamForm(); }}
                className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-xl hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTeamMember}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition"
              >
                {editingMember ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPasswordModal(null)}>
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Alterar Senha</h3>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Nova Senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => { setShowPasswordModal(null); setNewPassword(''); }}
                className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-xl hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleChangePassword}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition"
              >
                Alterar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
