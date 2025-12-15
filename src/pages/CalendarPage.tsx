import { useState, useMemo } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import clsx from 'clsx';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const CalendarPage: React.FC = () => {
  const { tasks, clients, selectedClientId } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const filteredTasks = useMemo(() => tasks.filter(t => {
    if (selectedClientId && t.client_id !== selectedClientId) return false;
    return t.scheduled_date;
  }), [tasks, selectedClientId]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOffset = monthStart.getDay();
  const paddingDays = Array(firstDayOffset).fill(null);

  const getTasksForDay = (date: Date) => filteredTasks.filter(t => t.scheduled_date && isSameDay(new Date(t.scheduled_date), date));
  const selectedDateTasks = selectedDate ? getTasksForDay(selectedDate) : [];
  const getClient = (clientId: string) => clients.find(c => c.id === clientId);

  const CHANNELS_ICONS: Record<string, string> = { instagram: '📸', facebook: '👤', tiktok: '🎵', youtube: '▶️', linkedin: '💼', twitter: '🐦' };

  return (
    <div className="h-full flex bg-gray-950">
      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
          <div><h1 className="text-xl font-bold text-white flex items-center gap-2"><Icons.CalendarDays size={24} className="text-orange-400" />Calendário</h1><p className="text-xs text-gray-500">{filteredTasks.length} conteúdos agendados</p></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"><Icons.ChevronLeft size={20} /></button>
            <h2 className="text-lg font-bold text-white min-w-[180px] text-center">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</h2>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"><Icons.ChevronRight size={20} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="ml-4 px-3 py-1.5 text-sm text-orange-400 hover:bg-orange-500/10 rounded-lg">Hoje</button>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-7 gap-1 mb-2">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (<div key={day} className="text-center text-xs font-medium text-gray-500 py-2">{day}</div>))}</div>
          <div className="grid grid-cols-7 gap-1">
            {paddingDays.map((_, i) => (<div key={`pad-${i}`} className="h-28 bg-gray-900/30 rounded-lg" />))}
            {monthDays.map(day => {
              const dayTasks = getTasksForDay(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              return (
                <button key={day.toISOString()} onClick={() => setSelectedDate(day)} className={clsx('h-28 p-2 rounded-lg border transition-all text-left flex flex-col', isToday(day) && 'border-orange-500', isSelected && 'bg-orange-500/10 border-orange-500', !isSelected && !isToday(day) && 'border-gray-800 hover:border-gray-700 bg-gray-900/50')}>
                  <span className={clsx('text-sm font-medium mb-1', isToday(day) ? 'text-orange-400' : 'text-white')}>{format(day, 'd')}</span>
                  <div className="flex-1 overflow-hidden space-y-1">
                    {dayTasks.slice(0, 3).map(task => { const client = getClient(task.client_id); return (<div key={task.id} className="text-xs px-1.5 py-0.5 rounded truncate" style={{ backgroundColor: `${client?.color}20`, color: client?.color || '#fff' }} title={task.title}>{CHANNELS_ICONS[task.channel]} {task.title}</div>); })}
                    {dayTasks.length > 3 && (<span className="text-xs text-gray-500">+{dayTasks.length - 3} mais</span>)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="w-80 border-l border-gray-800 flex flex-col bg-gray-900/50">
        <div className="p-4 border-b border-gray-800"><h3 className="font-bold text-white">{selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}</h3><p className="text-xs text-gray-500">{selectedDateTasks.length} conteúdos</p></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedDateTasks.length === 0 ? (<div className="text-center py-8 text-gray-500"><Icons.Calendar size={32} className="mx-auto mb-2 opacity-50" /><p className="text-sm">Nenhum conteúdo agendado</p></div>) : (
            selectedDateTasks.map(task => { const client = getClient(task.client_id); return (
              <div key={task.id} className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                <div className="flex items-start gap-3">{client && (<div className="w-2 h-full rounded-full flex-shrink-0" style={{ backgroundColor: client.color }} />)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1"><span className="text-lg">{CHANNELS_ICONS[task.channel]}</span><span className="text-xs text-gray-500">{task.channel}</span><span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">{task.content_type}</span></div>
                    <h4 className="text-sm font-medium text-white truncate">{task.title}</h4><p className="text-xs text-gray-500 mt-1">{client?.name || 'Sem cliente'}</p>
                    <div className="flex items-center gap-2 mt-2"><span className={clsx('text-xs px-2 py-0.5 rounded-full', task.status === 'published' && 'bg-green-500/20 text-green-400', task.status === 'approved' && 'bg-blue-500/20 text-blue-400', task.status === 'review' && 'bg-purple-500/20 text-purple-400', !['published', 'approved', 'review'].includes(task.status) && 'bg-gray-700 text-gray-400')}>{task.status === 'published' ? 'Publicado' : task.status === 'approved' ? 'Aprovado' : task.status === 'review' ? 'Revisão' : task.status}</span>{task.created_by_ai && (<span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full flex items-center gap-1"><Icons.Sparkles size={10} /> IA</span>)}</div>
                  </div>
                </div>
              </div>
            ); })
          )}
        </div>
      </div>
    </div>
  );
};
