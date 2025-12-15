import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Icons } from '../components/Icons';
import { Demand, SOCIAL_CHANNELS, CONTENT_TYPES } from '../types';
import clsx from 'clsx';

export const CalendarPage = () => {
  const { demands, clients } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [filterClient, setFilterClient] = useState<string | null>(null);
  const [filterChannel, setFilterChannel] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Filter demands
  const filteredDemands = useMemo(() => {
    return demands.filter((d) => {
      if (!d.scheduled_date) return false;
      if (filterClient && d.client_id !== filterClient) return false;
      if (filterChannel && !d.channels.includes(filterChannel as any)) return false;
      return true;
    });
  }, [demands, filterClient, filterChannel]);

  // Group demands by date
  const demandsByDate = useMemo(() => {
    const grouped: Record<string, Demand[]> = {};
    filteredDemands.forEach((d) => {
      if (d.scheduled_date) {
        const dateKey = d.scheduled_date.split('T')[0];
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(d);
      }
    });
    return grouped;
  }, [filteredDemands]);

  const getClient = (id: string) => clients.find((c) => c.id === id);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getDemandColor = (demand: Demand) => {
    const client = getClient(demand.client_id);
    return client?.color || '#666';
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalSlots = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalSlots; i++) {
      const dayNumber = i - firstDayOfMonth + 1;
      const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
      const dateStr = isCurrentMonth ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}` : '';
      const dayDemands = dateStr ? demandsByDate[dateStr] || [] : [];
      const isToday = isCurrentMonth && new Date().toDateString() === new Date(year, month, dayNumber).toDateString();

      days.push(
        <div
          key={i}
          className={clsx(
            'min-h-[120px] border border-gray-800 p-2',
            !isCurrentMonth && 'bg-gray-900/50',
            isToday && 'bg-orange-500/10 border-orange-500/30'
          )}
        >
          {isCurrentMonth && (
            <>
              <div className={clsx('text-sm mb-2', isToday ? 'text-orange-400 font-bold' : 'text-gray-400')}>
                {dayNumber}
              </div>
              <div className="space-y-1">
                {dayDemands.slice(0, 4).map((demand) => (
                  <button
                    key={demand.id}
                    onClick={() => setSelectedDemand(demand)}
                    className="w-full text-left text-xs p-1.5 rounded truncate transition hover:scale-105"
                    style={{ backgroundColor: `${getDemandColor(demand)}30`, color: getDemandColor(demand), borderLeft: `3px solid ${getDemandColor(demand)}` }}
                  >
                    <span className="mr-1">{getClient(demand.client_id)?.name.substring(0, 10)}</span>
                    <span className="text-gray-400">{demand.scheduled_time || ''}</span>
                  </button>
                ))}
                {dayDemands.length > 4 && (
                  <div className="text-xs text-gray-500 pl-1">+{dayDemands.length - 4} mais</div>
                )}
              </div>
            </>
          )}
        </div>
      );
    }
    return days;
  };


  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">📅</span> Calendário
          </h1>
          <p className="text-gray-400 text-sm mt-1">Visualize suas publicações agendadas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button onClick={() => setViewMode('calendar')} className={clsx('px-3 py-1.5 rounded-md text-sm transition', viewMode === 'calendar' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white')}>
              📅 Calendário
            </button>
            <button onClick={() => setViewMode('list')} className={clsx('px-3 py-1.5 rounded-md text-sm transition', viewMode === 'list' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white')}>
              📋 Lista
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          value={filterClient || ''}
          onChange={(e) => setFilterClient(e.target.value || null)}
          className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
        >
          <option value="">👤 Todos os Clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={filterChannel || ''}
          onChange={(e) => setFilterChannel(e.target.value || null)}
          className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
        >
          <option value="">📱 Todos os Canais</option>
          {SOCIAL_CHANNELS.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
          ))}
        </select>

        {(filterClient || filterChannel) && (
          <button onClick={() => { setFilterClient(null); setFilterChannel(null); }} className="text-sm text-orange-400 hover:text-orange-300">
            Limpar filtros
          </button>
        )}

        <div className="ml-auto flex items-center gap-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-800 rounded-lg transition">
            <Icons.ChevronLeft size={20} className="text-gray-400" />
          </button>
          <span className="text-white font-medium min-w-[150px] text-center">
            {monthNames[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-800 rounded-lg transition">
            <Icons.ChevronRight size={20} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 bg-gray-900/50 rounded-2xl overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-800">
          {dayNames.map((day) => (
            <div key={day} className="text-center py-3 text-sm font-medium text-gray-400 border-b border-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {renderCalendarDays()}
        </div>
      </div>


      {/* Demand Preview Sidebar */}
      {selectedDemand && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedDemand(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-96 bg-gray-900 h-full shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900">
              <h3 className="font-semibold text-white">Preview</h3>
              <button onClick={() => setSelectedDemand(null)} className="text-gray-400 hover:text-white">
                <Icons.X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Date & Time */}
              <div className="flex items-center gap-2 text-sm">
                <Icons.Calendar size={16} className="text-orange-400" />
                <span className="text-gray-300">
                  {selectedDemand.scheduled_date && new Date(selectedDemand.scheduled_date).toLocaleDateString('pt-BR')}
                  {selectedDemand.scheduled_time && ` às ${selectedDemand.scheduled_time}`}
                </span>
              </div>

              {/* Client */}
              {(() => {
                const client = getClient(selectedDemand.client_id);
                return client && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: client.color }}>
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-white">{client.name}</div>
                      <div className="text-sm text-gray-500">{client.company}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Channels */}
              <div className="flex gap-2 flex-wrap">
                {selectedDemand.channels.map((ch) => {
                  const channel = SOCIAL_CHANNELS.find((c) => c.id === ch);
                  return channel ? (
                    <span key={ch} className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${channel.color}20`, color: channel.color }}>
                      {channel.icon} {channel.label}
                    </span>
                  ) : null;
                })}
              </div>

              {/* Content Type */}
              {(() => {
                const type = CONTENT_TYPES.find((t) => t.id === selectedDemand.content_type);
                return type && (
                  <div className="text-sm text-gray-400">
                    Tipo: <span className="text-white">{type.icon} {type.label}</span>
                  </div>
                );
              })()}

              {/* Media Preview */}
              {selectedDemand.media.length > 0 && (
                <div className="aspect-square rounded-xl overflow-hidden bg-gray-800">
                  <img src={selectedDemand.media[0].url} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Title */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Título</div>
                <div className="text-white font-medium">{selectedDemand.title}</div>
              </div>

              {/* Caption */}
              {selectedDemand.caption && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Legenda</div>
                  <div className="text-gray-300 text-sm whitespace-pre-wrap">{selectedDemand.caption}</div>
                </div>
              )}

              {/* Hashtags */}
              {selectedDemand.hashtags && (
                <div className="text-sm text-blue-400">{selectedDemand.hashtags}</div>
              )}

              {/* Status Badge */}
              <div className="pt-4 border-t border-gray-800">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-green-500/20 text-green-400">
                  ✅ {selectedDemand.status === 'concluido' ? 'Publicado' : selectedDemand.status === 'aprovado_agendado' ? 'Agendado' : 'Em andamento'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
