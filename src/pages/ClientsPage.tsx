import { useState } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import type { Client, ContentHistoryEntry } from '../types';
import { validateCPFCNPJ, validatePhone, validateEmail, masks, fetchAddressByCEP } from '../utils/validators';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'];

type ClientTab = 'info' | 'history' | 'financial';

export const ClientsPage = () => {
  const { clients, demands, addClient, updateClient, deleteClient } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<ClientTab>('info');
  const [showHistory, setShowHistory] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', company: '', cpf_cnpj: '', instagram: '', website: '',
    color: COLORS[0], status: 'prospect' as Client['status'], monthly_value: 0, notes: '',
    billing_type: 'PIX' as 'BOLETO' | 'CREDIT_CARD' | 'PIX', payment_day: 10,
    address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' }
  });

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // CEP loading state
  const [loadingCEP, setLoadingCEP] = useState(false);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openNewClient = () => {
    setEditingClient(null);
    setActiveTab('info');
    setFormData({
      name: '', email: '', phone: '', company: '', cpf_cnpj: '', instagram: '', website: '',
      color: COLORS[Math.floor(Math.random() * COLORS.length)], status: 'prospect', monthly_value: 0, notes: '',
      billing_type: 'PIX', payment_day: 10,
      address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' }
    });
    setErrors({});
    setShowModal(true);
  };

  const openEditClient = (client: Client) => {
    setEditingClient(client);
    setActiveTab('info');
    const addr = client.address || { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' };
    setFormData({
      name: client.name, email: client.email, phone: client.phone || '', company: client.company,
      cpf_cnpj: client.cpf_cnpj || client.cnpj || '', instagram: client.instagram || '', website: client.website || '',
      color: client.color, status: client.status, monthly_value: client.monthly_value || 0, notes: client.notes || '',
      billing_type: client.billing_type || 'PIX', payment_day: client.payment_day || 10,
      address: { ...addr, complement: addr.complement || '' }
    });
    setErrors({});
    setShowModal(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Nome obrigatório';
    if (!formData.email.trim()) newErrors.email = 'Email obrigatório';
    else if (!validateEmail(formData.email)) newErrors.email = 'Email inválido';
    
    if (formData.phone) {
      if (!validatePhone(formData.phone)) newErrors.phone = 'Telefone inválido';
    }
    
    if (formData.cpf_cnpj) {
      const result = validateCPFCNPJ(formData.cpf_cnpj);
      if (!result.valid) newErrors.cpf_cnpj = result.type === 'cpf' ? 'CPF inválido' : result.type === 'cnpj' ? 'CNPJ inválido' : 'CPF/CNPJ inválido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCEPChange = async (cep: string) => {
    const formatted = masks.cep(cep);
    setFormData({ ...formData, address: { ...formData.address, zipCode: formatted } });

    if (formatted.replace(/\D/g, '').length === 8) {
      setLoadingCEP(true);
      try {
        const address = await fetchAddressByCEP(formatted);
        if (address) {
          setFormData(prev => ({
            ...prev,
            address: {
              ...prev.address,
              street: address.street,
              neighborhood: address.neighborhood,
              city: address.city,
              state: address.state,
              zipCode: formatted
            }
          }));
          toast.success('Endereço encontrado!');
        } else {
          toast.error('CEP não encontrado');
        }
      } catch {
        toast.error('Erro ao buscar CEP');
      } finally {
        setLoadingCEP(false);
      }
    }
  };

  const handleSave = () => {
    if (!validateForm()) {
      toast.error('Corrija os erros antes de salvar');
      return;
    }
    
    const clientData = {
      user_id: '1', name: formData.name, email: formData.email, phone: formData.phone,
      company: formData.company, cpf_cnpj: formData.cpf_cnpj, instagram: formData.instagram,
      website: formData.website, color: formData.color, status: formData.status,
      monthly_value: formData.monthly_value, notes: formData.notes,
      billing_type: formData.billing_type, payment_day: formData.payment_day,
      address: formData.address, channels: [], approvers: []
    };
    
    if (editingClient) {
      updateClient(editingClient.id, clientData);
      toast.success('Cliente atualizado!');
    } else {
      addClient(clientData);
      toast.success('Cliente cadastrado!');
    }
    setShowModal(false);
  };

  const handleDelete = (client: Client) => {
    if (confirm(`Excluir "${client.name}"?`)) {
      deleteClient(client.id);
      toast.success('Cliente excluído!');
    }
  };

  const getClientStats = (id: string) => ({
    tasks: demands.filter(d => d.client_id === id).length,
    published: demands.filter(d => d.client_id === id && d.status === 'concluido').length
  });

  const getClientHistory = (clientId: string): ContentHistoryEntry[] => {
    return demands
      .filter(d => d.client_id === clientId && d.status === 'concluido')
      .map(d => ({
        id: d.id,
        demand_id: d.id,
        title: d.title,
        content_type: d.content_type,
        caption: d.caption,
        media_urls: d.media.map(m => m.url),
        channels: d.channels,
        published_at: d.published_date,
        status: 'published' as const,
        created_at: d.created_at
      }));
  };

  return (
    <div className="h-full bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="h-14 md:h-16 border-b border-gray-800 flex items-center justify-between px-4 md:px-6 bg-gray-900/50">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <Icons.Users size={20} className="text-orange-400" /> Clientes
          </h1>
          <p className="text-xs text-gray-500">{clients.length} cadastrados</p>
        </div>
        <button onClick={openNewClient} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white px-3 md:px-4 py-2 rounded-lg font-medium text-sm">
          <Icons.Plus size={18} /> <span className="hidden sm:inline">Novo</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-3 md:p-4 border-b border-gray-800">
        <div className="relative max-w-md">
          <Icons.Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-orange-500 focus:outline-none text-sm"
          />
        </div>
      </div>

      {/* Client Grid */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filteredClients.map(client => {
            const stats = getClientStats(client.id);
            return (
              <div key={client.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition">
                <div className="h-1.5" style={{ backgroundColor: client.color }} />
                <div className="p-3 md:p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white font-bold text-base md:text-lg" style={{ backgroundColor: client.color }}>
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm md:text-base">{client.name}</h3>
                        <p className="text-xs text-gray-500">{client.company}</p>
                      </div>
                    </div>
                    <span className={clsx(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      client.status === 'active' ? 'bg-green-500/20 text-green-400' : 
                      client.status === 'inactive' ? 'bg-gray-500/20 text-gray-400' : 
                      'bg-yellow-500/20 text-yellow-400'
                    )}>
                      {client.status === 'active' ? 'Ativo' : client.status === 'inactive' ? 'Inativo' : 'Prospect'}
                    </span>
                  </div>

                  <div className="space-y-1 mb-3 text-xs text-gray-400">
                    <p className="flex items-center gap-2 truncate"><Icons.Mail size={12} /> {client.email}</p>
                    {client.phone && <p className="flex items-center gap-2"><Icons.Phone size={12} /> {client.phone}</p>}
                    {client.cpf_cnpj && <p className="flex items-center gap-2">📋 {client.cpf_cnpj}</p>}
                  </div>

                  {(client.monthly_value ?? 0) > 0 && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 mb-3 text-center">
                      <span className="text-sm font-bold text-green-400">R$ {(client.monthly_value ?? 0).toLocaleString('pt-BR')}/mês</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-white">{stats.tasks}</p>
                      <p className="text-[10px] text-gray-500">Demandas</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-green-400">{stats.published}</p>
                      <p className="text-[10px] text-gray-500">Publicados</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setShowHistory(client.id)} className="flex-1 py-2 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 text-xs flex items-center justify-center gap-1">
                      <Icons.Clock size={12} /> Histórico
                    </button>
                    <button onClick={() => openEditClient(client)} className="flex-1 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 text-xs flex items-center justify-center gap-1">
                      <Icons.Edit size={12} /> Editar
                    </button>
                    <button onClick={() => handleDelete(client)} className="py-2 px-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20">
                      <Icons.Delete size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Icons.Users size={48} className="mx-auto mb-4 opacity-30" />
            <p>Nenhum cliente encontrado</p>
            <button onClick={openNewClient} className="mt-4 text-orange-400 hover:text-orange-300">+ Cadastrar cliente</button>
          </div>
        )}
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Icons.Clock size={20} className="text-purple-400" /> Histórico de Conteúdos
              </h2>
              <button onClick={() => setShowHistory(null)} className="text-gray-400 hover:text-white">
                <Icons.X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {getClientHistory(showHistory).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhum conteúdo publicado ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getClientHistory(showHistory).map(item => (
                    <div key={item.id} className="p-3 bg-gray-800/50 rounded-xl border border-gray-700">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-white">{item.title}</h4>
                          <p className="text-xs text-gray-500 mt-1">{item.content_type} • {item.channels.join(', ')}</p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {item.published_at ? new Date(item.published_at).toLocaleDateString('pt-BR') : 'N/A'}
                        </span>
                      </div>
                      {item.caption && <p className="text-sm text-gray-400 mt-2 line-clamp-2">{item.caption}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">{editingClient ? 'Editar' : 'Novo'} Cliente</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><Icons.X size={20} /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800">
              {(['info', 'financial'] as ClientTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'flex-1 py-3 text-sm font-medium transition',
                    activeTab === tab ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-400 hover:text-white'
                  )}
                >
                  {tab === 'info' ? 'Informações' : 'Financeiro'}
                </button>
              ))}
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {activeTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Nome *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={clsx('w-full bg-gray-800 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none', errors.name ? 'border-red-500' : 'border-gray-700 focus:border-orange-500')}
                      />
                      {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Email *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={clsx('w-full bg-gray-800 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none', errors.email ? 'border-red-500' : 'border-gray-700 focus:border-orange-500')}
                      />
                      {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Telefone</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: masks.phone(e.target.value) })}
                        placeholder="(00) 00000-0000"
                        className={clsx('w-full bg-gray-800 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none', errors.phone ? 'border-red-500' : 'border-gray-700 focus:border-orange-500')}
                      />
                      {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">CPF/CNPJ</label>
                      <input
                        type="text"
                        value={formData.cpf_cnpj}
                        onChange={(e) => setFormData({ ...formData, cpf_cnpj: masks.cpfCnpj(e.target.value) })}
                        placeholder="000.000.000-00 ou 00.000.000/0000-00"
                        className={clsx('w-full bg-gray-800 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none', errors.cpf_cnpj ? 'border-red-500' : 'border-gray-700 focus:border-orange-500')}
                      />
                      {errors.cpf_cnpj && <p className="text-xs text-red-400 mt-1">{errors.cpf_cnpj}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Empresa</label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Instagram</label>
                      <input
                        type="text"
                        value={formData.instagram}
                        onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                        placeholder="@usuario"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Website</label>
                      <input
                        type="text"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://www.exemplo.com.br"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Status and Color */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as Client['status'] })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                      >
                        <option value="prospect">Prospect</option>
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Cor</label>
                      <div className="flex gap-1.5">
                        {COLORS.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setFormData({ ...formData, color: c })}
                            className={clsx('w-7 h-7 rounded-lg transition', formData.color === c && 'ring-2 ring-white ring-offset-2 ring-offset-gray-900')}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Notas</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'financial' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Valor Mensal</label>
                      <input
                        type="number"
                        value={formData.monthly_value || ''}
                        onChange={(e) => setFormData({ ...formData, monthly_value: Number(e.target.value) })}
                        placeholder="0.00"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Forma de Pagamento</label>
                      <select
                        value={formData.billing_type}
                        onChange={(e) => setFormData({ ...formData, billing_type: e.target.value as any })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                      >
                        <option value="PIX">PIX</option>
                        <option value="BOLETO">Boleto</option>
                        <option value="CREDIT_CARD">Cartão de Crédito</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Dia de Vencimento</label>
                      <input
                        type="number"
                        min={1}
                        max={28}
                        value={formData.payment_day}
                        onChange={(e) => setFormData({ ...formData, payment_day: Number(e.target.value) })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">CEP</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.address.zipCode}
                          onChange={(e) => handleCEPChange(e.target.value)}
                          placeholder="00000-000"
                          className={clsx(
                            'w-full bg-gray-800 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none pr-10',
                            loadingCEP ? 'border-orange-500' : 'border-gray-700 focus:border-orange-500'
                          )}
                        />
                        {loadingCEP && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Icons.Loader size={16} className="animate-spin text-orange-400" />
                          </div>
                        )}
                        {!loadingCEP && formData.address.street && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Icons.Check size={16} className="text-green-400" />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">Digite o CEP para buscar o endereço automaticamente</p>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Rua</label>
                      <input
                        type="text"
                        value={formData.address.street}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Número</label>
                      <input
                        type="text"
                        value={formData.address.number}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, number: e.target.value } })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Complemento</label>
                      <input
                        type="text"
                        value={formData.address.complement}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, complement: e.target.value } })}
                        placeholder="Apto, Sala, Bloco..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Bairro</label>
                      <input
                        type="text"
                        value={formData.address.neighborhood}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, neighborhood: e.target.value } })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Cidade</label>
                      <input
                        type="text"
                        value={formData.address.city}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Estado</label>
                      <input
                        type="text"
                        value={formData.address.state}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                        maxLength={2}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-800 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-400 hover:text-white transition">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-medium transition">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
