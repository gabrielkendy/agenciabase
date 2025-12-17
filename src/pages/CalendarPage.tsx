import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Icons } from '../components/Icons';
import { Demand, SOCIAL_CHANNELS, CONTENT_TYPES, Client } from '../types';
import clsx from 'clsx';

// Status configuration
const STATUS_CONFIG = {
  aprovado_agendado: { label: 'Aprovado', color: 'bg-green-500', textColor: 'text-green-400', bgColor: 'bg-green-500/20', icon: '✅' },
  concluido: { label: 'Publicado', color: 'bg-blue-500', textColor: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: '🚀' },
  pendente: { label: 'Pendente', color: 'bg-yellow-500', textColor: 'text-yellow-400', bgColor: 'bg-yellow-500/20', icon: '⏳' },
  em_progresso: { label: 'Em Progresso', color: 'bg-orange-500', textColor: 'text-orange-400', bgColor: 'bg-orange-500/20', icon: '🔄' },
  revisao: { label: 'Em Revisão', color: 'bg-purple-500', textColor: 'text-purple-400', bgColor: 'bg-purple-500/20', icon: '👀' },
  rejeitado: { label: 'Rejeitado', color: 'bg-red-500', textColor: 'text-red-400', bgColor: 'bg-red-500/20', icon: '❌' },
};

export const CalendarPage = () => {
  const { demands, clients } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [filterClient, setFilterClient] = useState<string | null>(null);
  const [filterChannel, setFilterChannel] = useState<string | null>(null);
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'week' | 'month' | 'today'>('month');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getClient = (id: string): Client | undefined => clients.find((c) => c.id === id);

  // Filter and sort demands
  const filteredDemands = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return demands
      .filter((d) => {
        if (!d.scheduled_date) return false;
        if (filterClient && d.client_id !== filterClient) return false;
        if (filterChannel && !d.channels.includes(filterChannel as any)) return false;

        const demandDate = new Date(d.scheduled_date);

        if (filterDateRange === 'today') {
          return demandDate.toDateString() === now.toDateString();
        }
        if (filterDateRange === 'week') {
          return demandDate >= startOfWeek && demandDate <= endOfWeek;
        }
        if (filterDateRange === 'month') {
          return demandDate.getMonth() === month && demandDate.getFullYear() === year;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.scheduled_date!).getTime();
        const dateB = new Date(b.scheduled_date!).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
  }, [demands, filterClient, filterChannel, filterDateRange, month, year, sortOrder]);

  // Group demands by date for list view
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

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getDemandColor = (demand: Demand) => {
    const client = getClient(demand.client_id);
    return client?.color || '#666';
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendente;
  };

  const isApproved = (demand: Demand) => {
    return demand.status === 'aprovado_agendado' || demand.status === 'concluido';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Hoje';
    if (date.toDateString() === tomorrow.toDateString()) return 'Amanhã';

    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    return time;
  };

  // Calendar view render
  const renderCalendarDays = () => {
    const days = [];
    const totalSlots = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;
    const calendarDemands = demands.filter((d) => {
      if (!d.scheduled_date) return false;
      if (filterClient && d.client_id !== filterClient) return false;
      if (filterChannel && !d.channels.includes(filterChannel as any)) return false;
      return true;
    });

    const calendarByDate: Record<string, Demand[]> = {};
    calendarDemands.forEach((d) => {
      if (d.scheduled_date) {
        const dateKey = d.scheduled_date.split('T')[0];
        if (!calendarByDate[dateKey]) calendarByDate[dateKey] = [];
        calendarByDate[dateKey].push(d);
      }
    });

    for (let i = 0; i < totalSlots; i++) {
      const dayNumber = i - firstDayOfMonth + 1;
      const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
      const dateStr = isCurrentMonth ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}` : '';
      const dayDemands = dateStr ? calendarByDate[dateStr] || [] : [];
      const isToday = isCurrentMonth && new Date().toDateString() === new Date(year, month, dayNumber).toDateString();

      days.push(
        <div
          key={i}
          className={clsx(
            'min-h-[120px] border border-gray-800 p-2 transition-colors',
            !isCurrentMonth && 'bg-gray-900/50',
            isToday && 'bg-orange-500/10 border-orange-500/50'
          )}
        >
          {isCurrentMonth && (
            <>
              <div className={clsx('text-sm mb-2 font-medium', isToday ? 'text-orange-400' : 'text-gray-400')}>
                {dayNumber}
              </div>
              <div className="space-y-1">
                {dayDemands.slice(0, 3).map((demand) => (
                  <button
                    key={demand.id}
                    onClick={() => setSelectedDemand(demand)}
                    className="w-full text-left text-xs p-1.5 rounded truncate transition hover:scale-[1.02] hover:shadow-lg"
                    style={{ backgroundColor: `${getDemandColor(demand)}30`, color: getDemandColor(demand), borderLeft: `3px solid ${getDemandColor(demand)}` }}
                  >
                    <span className="mr-1 font-medium">{getClient(demand.client_id)?.name.substring(0, 8)}</span>
                    <span className="text-gray-400">{demand.scheduled_time || ''}</span>
                  </button>
                ))}
                {dayDemands.length > 3 && (
                  <div className="text-xs text-gray-500 pl-1 font-medium">+{dayDemands.length - 3} mais</div>
                )}
              </div>
            </>
          )}
        </div>
      );
    }
    return days;
  };

  // List item component
  const ListItem = ({ demand }: { demand: Demand }) => {
    const client = getClient(demand.client_id);
    const statusConfig = getStatusConfig(demand.status);
    const approved = isApproved(demand);

    return (
      <div
        onClick={() => setSelectedDemand(demand)}
        className="group bg-gray-900/80 hover:bg-gray-800/90 border border-gray-800 hover:border-gray-700 rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5"
      >
        <div className="flex gap-4">
          {/* Left: Media Preview */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden bg-gray-800 border border-gray-700 relative group-hover:border-gray-600 transition">
              {demand.media.length > 0 ? (
                <img src={demand.media[0].url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-gray-600">
                  {(() => {
                    const type = CONTENT_TYPES.find((t) => t.id === demand.content_type);
                    return type?.icon || '📝';
                  })()}
                </div>
              )}
              {/* Overlay with count */}
              {demand.media.length > 1 && (
                <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full">
                  +{demand.media.length - 1}
                </div>
              )}
            </div>
          </div>

          {/* Right: Content */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Top Row: Client + Status */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                {client && (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: client.color }}
                  >
                    {client.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-sm font-medium text-white truncate block">{client?.name || 'Sem cliente'}</span>
                  <span className="text-xs text-gray-500 truncate block">{client?.company}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className={clsx('flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5', statusConfig.bgColor, statusConfig.textColor)}>
                <span>{statusConfig.icon}</span>
                <span>{statusConfig.label}</span>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-white font-semibold text-base mb-1 truncate group-hover:text-orange-400 transition">
              {demand.title}
            </h3>

            {/* Description */}
            <p className="text-gray-400 text-sm line-clamp-2 mb-3">
              {demand.caption || demand.briefing || 'Sem descrição'}
            </p>

            {/* Bottom Row: Date, Time, Channels, Approval Link */}
            <div className="flex items-center justify-between gap-4 mt-auto">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Date & Time */}
                <div className="flex items-center gap-1.5 text-sm">
                  <Icons.Calendar size={14} className="text-orange-400" />
                  <span className="text-gray-300">
                    {demand.scheduled_date && new Date(demand.scheduled_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                  {demand.scheduled_time && (
                    <>
                      <Icons.Clock size={14} className="text-gray-500 ml-2" />
                      <span className="text-gray-400">{formatTime(demand.scheduled_time)}</span>
                    </>
                  )}
                </div>

                {/* Channels */}
                <div className="flex items-center gap-1">
                  {demand.channels.slice(0, 4).map((ch) => {
                    const channel = SOCIAL_CHANNELS.find((c) => c.id === ch);
                    return channel ? (
                      <span
                        key={ch}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                        style={{ backgroundColor: `${channel.color}20` }}
                        title={channel.label}
                      >
                        {channel.icon}
                      </span>
                    ) : null;
                  })}
                  {demand.channels.length > 4 && (
                    <span className="text-xs text-gray-500">+{demand.channels.length - 4}</span>
                  )}
                </div>
              </div>

              {/* Approval Link */}
              <div className="flex-shrink-0">
                {approved ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-gray-500 rounded-lg text-xs cursor-not-allowed">
                    <Icons.Check size={14} />
                    <span>Aprovado</span>
                  </span>
                ) : (
                  <a
                    href={`/approval/${demand.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Icons.ExternalLink size={14} />
                    <span>Aprovar</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Stats
  const stats = useMemo(() => {
    const total = filteredDemands.length;
    const approved = filteredDemands.filter((d) => isApproved(d)).length;
    const pending = filteredDemands.filter((d) => !isApproved(d)).length;
    return { total, approved, pending };
  }, [filteredDemands]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">📅</span> Calendário de Publicações
          </h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie e acompanhe todas as suas publicações agendadas</p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2',
                viewMode === 'list' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              <Icons.List size={16} />
              Lista
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2',
                viewMode === 'calendar' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              <Icons.Calendar size={16} />
              Calendário
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-4">
          <div className="text-3xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-gray-400">Total de Posts</div>
        </div>
        <div className="bg-gradient-to-br from-green-900/30 to-gray-900 border border-green-800/30 rounded-2xl p-4">
          <div className="text-3xl font-bold text-green-400">{stats.approved}</div>
          <div className="text-sm text-gray-400">Aprovados</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-900/30 to-gray-900 border border-yellow-800/30 rounded-2xl p-4">
          <div className="text-3xl font-bold text-yellow-400">{stats.pending}</div>
          <div className="text-sm text-gray-400">Pendentes</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Client Filter */}
          <div className="relative">
            <select
              value={filterClient || ''}
              onChange={(e) => setFilterClient(e.target.value || null)}
              className="appearance-none bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-white focus:border-orange-500 focus:outline-none cursor-pointer hover:border-gray-600 transition"
            >
              <option value="">👤 Todos os Clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Icons.ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Channel Filter */}
          <div className="relative">
            <select
              value={filterChannel || ''}
              onChange={(e) => setFilterChannel(e.target.value || null)}
              className="appearance-none bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-white focus:border-orange-500 focus:outline-none cursor-pointer hover:border-gray-600 transition"
            >
              <option value="">📱 Todos os Canais</option>
              {SOCIAL_CHANNELS.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
              ))}
            </select>
            <Icons.ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Date Range Filter */}
          <div className="flex bg-gray-800 rounded-xl p-1">
            {[
              { value: 'today', label: 'Hoje' },
              { value: 'week', label: 'Semana' },
              { value: 'month', label: 'Mês' },
              { value: 'all', label: 'Todos' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilterDateRange(option.value as typeof filterDateRange)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition',
                  filterDateRange === option.value ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-300 hover:border-gray-600 transition"
          >
            {sortOrder === 'asc' ? <Icons.ArrowUp size={16} /> : <Icons.ArrowDown size={16} />}
            {sortOrder === 'asc' ? 'Mais antigos' : 'Mais recentes'}
          </button>

          {/* Clear Filters */}
          {(filterClient || filterChannel || filterDateRange !== 'month') && (
            <button
              onClick={() => {
                setFilterClient(null);
                setFilterChannel(null);
                setFilterDateRange('month');
              }}
              className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1"
            >
              <Icons.X size={14} />
              Limpar filtros
            </button>
          )}

          {/* Month Navigation (for calendar) */}
          {viewMode === 'calendar' && (
            <div className="ml-auto flex items-center gap-2">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-800 rounded-lg transition">
                <Icons.ChevronLeft size={20} className="text-gray-400" />
              </button>
              <span className="text-white font-medium min-w-[140px] text-center">
                {monthNames[month]} {year}
              </span>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-800 rounded-lg transition">
                <Icons.ChevronRight size={20} className="text-gray-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        /* List View */
        <div className="flex-1 overflow-y-auto">
          {filteredDemands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Icons.Calendar size={64} className="mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhuma publicação encontrada</p>
              <p className="text-sm">Ajuste os filtros ou agende novas publicações</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(demandsByDate)
                .sort((a, b) => sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a))
                .map((dateKey) => (
                  <div key={dateKey}>
                    {/* Date Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl">
                        <Icons.Calendar size={16} className="text-orange-400" />
                        <span className="text-white font-medium capitalize">{formatDate(dateKey)}</span>
                        <span className="text-gray-500 text-sm">({demandsByDate[dateKey].length} posts)</span>
                      </div>
                      <div className="flex-1 h-px bg-gray-800" />
                    </div>

                    {/* Posts for this date */}
                    <div className="space-y-3 pl-2">
                      {demandsByDate[dateKey]
                        .sort((a, b) => {
                          const timeA = a.scheduled_time || '00:00';
                          const timeB = b.scheduled_time || '00:00';
                          return timeA.localeCompare(timeB);
                        })
                        .map((demand) => (
                          <ListItem key={demand.id} demand={demand} />
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : (
        /* Calendar View */
        <div className="flex-1 bg-gray-900/50 rounded-2xl overflow-hidden border border-gray-800">
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
      )}

      {/* Demand Preview Sidebar */}
      {selectedDemand && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedDemand(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-gray-900 h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900/95 backdrop-blur z-10">
              <h3 className="font-bold text-lg text-white">Detalhes do Post</h3>
              <button
                onClick={() => setSelectedDemand(null)}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition"
              >
                <Icons.X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5">
              {/* Status */}
              {(() => {
                const statusConfig = getStatusConfig(selectedDemand.status);
                return (
                  <div className={clsx('inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium', statusConfig.bgColor, statusConfig.textColor)}>
                    <span className="text-lg">{statusConfig.icon}</span>
                    <span>{statusConfig.label}</span>
                  </div>
                );
              })()}

              {/* Date & Time */}
              <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <Icons.Calendar size={20} className="text-orange-400" />
                </div>
                <div>
                  <div className="text-white font-medium">
                    {selectedDemand.scheduled_date && new Date(selectedDemand.scheduled_date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  {selectedDemand.scheduled_time && (
                    <div className="text-gray-400 text-sm">às {selectedDemand.scheduled_time}</div>
                  )}
                </div>
              </div>

              {/* Client */}
              {(() => {
                const client = getClient(selectedDemand.client_id);
                return client && (
                  <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: client.color }}
                    >
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{client.name}</div>
                      <div className="text-sm text-gray-400">{client.company}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Channels */}
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">Plataformas</div>
                <div className="flex gap-2 flex-wrap">
                  {selectedDemand.channels.map((ch) => {
                    const channel = SOCIAL_CHANNELS.find((c) => c.id === ch);
                    return channel ? (
                      <span
                        key={ch}
                        className="text-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                        style={{ backgroundColor: `${channel.color}20`, color: channel.color }}
                      >
                        {channel.icon} {channel.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Media Preview */}
              {selectedDemand.media.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">Mídia</div>
                  <div className="aspect-square rounded-xl overflow-hidden bg-gray-800 border border-gray-700">
                    <img src={selectedDemand.media[0].url} alt="" className="w-full h-full object-cover" />
                  </div>
                  {selectedDemand.media.length > 1 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto">
                      {selectedDemand.media.slice(1, 5).map((m, i) => (
                        <div key={i} className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                          <img src={m.url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">Título</div>
                <div className="text-white font-semibold text-lg">{selectedDemand.title}</div>
              </div>

              {/* Caption */}
              {selectedDemand.caption && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">Legenda</div>
                  <div className="text-gray-300 text-sm whitespace-pre-wrap bg-gray-800/50 p-3 rounded-xl">
                    {selectedDemand.caption}
                  </div>
                </div>
              )}

              {/* Hashtags */}
              {selectedDemand.hashtags && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">Hashtags</div>
                  <div className="text-blue-400 text-sm">{selectedDemand.hashtags}</div>
                </div>
              )}

              {/* Approval Link */}
              <div className="pt-4 border-t border-gray-800">
                {isApproved(selectedDemand) ? (
                  <div className="flex items-center justify-center gap-2 py-3 bg-green-500/20 text-green-400 rounded-xl font-medium">
                    <Icons.CheckCircle size={20} />
                    Este post já foi aprovado
                  </div>
                ) : (
                  <a
                    href={`/approval/${selectedDemand.id}`}
                    className="flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition w-full"
                  >
                    <Icons.ExternalLink size={20} />
                    Abrir Link de Aprovação
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
