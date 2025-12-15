import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import type { Transaction, TransactionType, TransactionCategory, TransactionStatus } from '../types';
import clsx from 'clsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CATEGORIES: { id: TransactionCategory; label: string }[] = [{ id: 'contract', label: 'Contrato' }, { id: 'service', label: 'Serviço Avulso' }, { id: 'tool', label: 'Ferramenta' }, { id: 'salary', label: 'Salário' }, { id: 'tax', label: 'Imposto' }, { id: 'other', label: 'Outro' }];
const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#eab308', '#ec4899', '#8b5cf6'];

export const FinancialPage: React.FC = () => {
  const { transactions, clients, addTransaction, updateTransaction, deleteTransaction, addNotification } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [formData, setFormData] = useState({ type: 'income' as TransactionType, category: 'contract' as TransactionCategory, clientId: '', description: '', value: '', dueDate: '', status: 'pending' as TransactionStatus, recurrent: false });

  const filteredTransactions = transactions.filter(t => filter === 'all' ? true : t.type === filter);
  const monthlyIncome = transactions.filter(t => t.type === 'income' && t.status === 'paid').reduce((sum, t) => sum + t.value, 0);
  const monthlyExpenses = transactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((sum, t) => sum + t.value, 0);
  const pendingIncome = transactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((sum, t) => sum + t.value, 0);
  const overdueAmount = transactions.filter(t => t.status === 'overdue').reduce((sum, t) => sum + t.value, 0);
  const incomeByCategory = CATEGORIES.map(cat => ({ name: cat.label, value: transactions.filter(t => t.type === 'income' && t.category === cat.id && t.status === 'paid').reduce((sum, t) => sum + t.value, 0) })).filter(d => d.value > 0);

  const getClientName = (clientId?: string) => clients.find(c => c.id === clientId)?.name || '-';
  const openNewTransaction = (type: TransactionType) => { setFormData({ type, category: type === 'income' ? 'contract' : 'tool', clientId: '', description: '', value: '', dueDate: new Date().toISOString().split('T')[0], status: 'pending', recurrent: false }); setShowModal(true); };

  const handleSave = () => {
    if (!formData.description || !formData.value) { addNotification({ id: `notif-${Date.now()}`, title: 'Erro', message: 'Preencha descrição e valor', type: 'error', read: false, timestamp: new Date().toISOString() }); return; }
    const transaction: Transaction = { id: `trans-${Date.now()}`, type: formData.type, category: formData.category, clientId: formData.clientId || undefined, description: formData.description, value: parseFloat(formData.value), dueDate: formData.dueDate, status: formData.status, recurrent: formData.recurrent, createdAt: new Date().toISOString() };
    addTransaction(transaction); addNotification({ id: `notif-${Date.now()}`, title: formData.type === 'income' ? 'Receita Adicionada' : 'Despesa Adicionada', message: `R$ ${parseFloat(formData.value).toLocaleString('pt-BR')}`, type: 'success', read: false, timestamp: new Date().toISOString() });
    setShowModal(false);
  };

  const markAsPaid = (t: Transaction) => { updateTransaction(t.id, { status: 'paid', paidDate: new Date().toISOString() }); addNotification({ id: `notif-${Date.now()}`, title: 'Pagamento Confirmado', message: t.description, type: 'success', read: false, timestamp: new Date().toISOString() }); };

  return (
    <div className="h-full bg-gray-950 flex flex-col">
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
        <div><h1 className="text-xl font-bold text-white flex items-center gap-2"><Icons.Money size={24} className="text-orange-400" />Financeiro</h1><p className="text-xs text-gray-500">{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p></div>
        <div className="flex items-center gap-3"><button onClick={() => openNewTransaction('expense')} className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30"><Icons.ArrowDown size={16} /> Despesa</button><button onClick={() => openNewTransaction('income')} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium"><Icons.ArrowUp size={16} /> Receita</button></div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5"><div className="flex items-center gap-2 mb-2"><Icons.TrendingUp size={18} className="text-green-400" /><span className="text-sm text-gray-400">Receita do Mês</span></div><p className="text-2xl font-bold text-green-400">R$ {monthlyIncome.toLocaleString('pt-BR')}</p></div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5"><div className="flex items-center gap-2 mb-2"><Icons.TrendingDown size={18} className="text-red-400" /><span className="text-sm text-gray-400">Despesas do Mês</span></div><p className="text-2xl font-bold text-red-400">R$ {monthlyExpenses.toLocaleString('pt-BR')}</p></div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5"><div className="flex items-center gap-2 mb-2"><Icons.Clock size={18} className="text-yellow-400" /><span className="text-sm text-gray-400">A Receber</span></div><p className="text-2xl font-bold text-yellow-400">R$ {pendingIncome.toLocaleString('pt-BR')}</p></div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5"><div className="flex items-center gap-2 mb-2"><Icons.Alert size={18} className="text-red-400" /><span className="text-sm text-gray-400">Em Atraso</span></div><p className="text-2xl font-bold text-red-400">R$ {overdueAmount.toLocaleString('pt-BR')}</p></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5"><h3 className="font-bold text-white mb-4 flex items-center gap-2"><Icons.BarChart size={18} className="text-blue-400" />Lucro Líquido</h3><div className="flex items-center justify-center h-32"><div className="text-center"><p className={clsx('text-4xl font-bold', monthlyIncome - monthlyExpenses >= 0 ? 'text-green-400' : 'text-red-400')}>R$ {(monthlyIncome - monthlyExpenses).toLocaleString('pt-BR')}</p><p className="text-sm text-gray-500 mt-2">Este mês</p></div></div></div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5"><h3 className="font-bold text-white mb-4 flex items-center gap-2"><Icons.PieChart size={18} className="text-orange-400" />Receita por Categoria</h3><div className="h-40">{incomeByCategory.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={incomeByCategory} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">{incomeByCategory.map((_, index) => (<Cell key={index} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor']} /></PieChart></ResponsiveContainer>) : (<div className="flex items-center justify-center h-full text-gray-500">Sem dados para exibir</div>)}</div></div>
        </div>
        <div className="flex items-center gap-2 mb-4"><button onClick={() => setFilter('all')} className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors', filter === 'all' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>Todos</button><button onClick={() => setFilter('income')} className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors', filter === 'income' ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>Receitas</button><button onClick={() => setFilter('expense')} className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors', filter === 'expense' ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>Despesas</button></div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-gray-800"><th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Data</th><th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Descrição</th><th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Cliente</th><th className="text-right p-4 text-xs font-bold text-gray-500 uppercase">Valor</th><th className="text-center p-4 text-xs font-bold text-gray-500 uppercase">Status</th><th className="text-center p-4 text-xs font-bold text-gray-500 uppercase">Ações</th></tr></thead>
          <tbody>{filteredTransactions.map(t => (<tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30"><td className="p-4 text-sm text-gray-400">{new Date(t.dueDate).toLocaleDateString('pt-BR')}</td><td className="p-4"><p className="text-sm text-white">{t.description}</p>{t.recurrent && (<span className="text-[10px] text-orange-400">🔄 Recorrente</span>)}</td><td className="p-4 text-sm text-gray-400">{getClientName(t.clientId)}</td><td className={clsx('p-4 text-right font-bold', t.type === 'income' ? 'text-green-400' : 'text-red-400')}>{t.type === 'income' ? '+' : '-'} R$ {t.value.toLocaleString('pt-BR')}</td><td className="p-4 text-center"><span className={clsx('text-xs px-2 py-1 rounded-full font-bold', t.status === 'paid' ? 'bg-green-500/20 text-green-400' : t.status === 'overdue' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400')}>{t.status === 'paid' ? 'Pago' : t.status === 'overdue' ? 'Vencido' : 'Pendente'}</span></td><td className="p-4 text-center"><div className="flex items-center justify-center gap-1">{t.status === 'pending' && (<button onClick={() => markAsPaid(t)} className="p-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30" title="Marcar como pago"><Icons.Check size={14} /></button>)}<button onClick={() => deleteTransaction(t.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20"><Icons.Delete size={14} /></button></div></td></tr>))}{filteredTransactions.length === 0 && (<tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhuma transação encontrada</td></tr>)}</tbody></table>
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between"><h2 className="text-lg font-bold text-white">{formData.type === 'income' ? '💰 Nova Receita' : '💸 Nova Despesa'}</h2><button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><Icons.Close size={20} /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Descrição *</label><input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" placeholder="Ex: Mensalidade Cliente X" /></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Valor *</label><input type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" placeholder="0,00" /></div><div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Vencimento</label><input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Categoria</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as any })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none">{CATEGORIES.map(c => (<option key={c.id} value={c.id}>{c.label}</option>))}</select></div><div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Cliente</label><select value={formData.clientId} onChange={(e) => setFormData({ ...formData, clientId: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none"><option value="">Nenhum</option>{clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div></div>
              <div className="flex items-center gap-3"><input type="checkbox" id="recurrent" checked={formData.recurrent} onChange={(e) => setFormData({ ...formData, recurrent: e.target.checked })} className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-orange-500 focus:ring-orange-500" /><label htmlFor="recurrent" className="text-sm text-gray-400">Transação recorrente (mensal)</label></div>
            </div>
            <div className="p-5 border-t border-gray-800 flex gap-3"><button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700">Cancelar</button><button onClick={handleSave} className={clsx('flex-1 py-2.5 text-white rounded-lg font-bold', formData.type === 'income' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500')}>Salvar</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
