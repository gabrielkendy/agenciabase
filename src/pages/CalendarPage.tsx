import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Icons } from '../components/Icons';
import { Demand, SOCIAL_CHANNELS, Client, MediaFile } from '../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

// Componente de ícone das redes sociais
const SocialIcon = ({ channel, size = 20 }: { channel: string; size?: number }) => {
  const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
    instagram: { icon: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>, color: '#E4405F' },
    facebook: { icon: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, color: '#1877F2' },
    tiktok: { icon: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>, color: '#000000' },
    youtube: { icon: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>, color: '#FF0000' },
    linkedin: { icon: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>, color: '#0A66C2' },
    twitter: { icon: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, color: '#000000' },
    pinterest: { icon: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg>, color: '#E60023' },
    threads: { icon: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.33-3.022.812-.675 1.89-1.082 3.112-1.18-.004-.074-.006-.148-.008-.222-.01-.606.032-1.2.126-1.783.157-.976.454-1.873.883-2.67.387-.72.889-1.35 1.494-1.872.605-.523 1.315-.936 2.11-1.229a8.099 8.099 0 0 1 2.598-.502c.312-.01.618-.005.918.016 2.89.201 5.069 1.814 5.952 4.378l-1.966.695c-.56-1.63-2.038-3.076-4.236-3.23a5.937 5.937 0 0 0-.672-.012c-.694.024-1.343.138-1.929.337-.588.199-1.11.48-1.552.833a4.584 4.584 0 0 0-1.086 1.357c-.3.556-.522 1.203-.657 1.925a9.87 9.87 0 0 0-.094 1.556l.002.148c.017.351.049.696.097 1.033.086.596.213 1.168.383 1.71.295.94.713 1.772 1.248 2.476 1.168 1.536 2.858 2.425 4.73 2.425h.076c1.878-.048 3.442-.906 4.52-2.481.968-1.414 1.446-3.305 1.382-5.468l2.095.052c.079 2.645-.512 4.964-1.71 6.712-1.35 1.97-3.38 3.075-5.87 3.192l-.143.003z"/></svg>, color: '#000000' },
    google_business: { icon: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>, color: '#4285F4' },
  };
  const data = iconMap[channel];
  if (!data) return <span>?</span>;
  return <span style={{ color: data.color }}>{data.icon}</span>;
};

// Componente de ícone de tipo de conteúdo usando SVG
const ContentTypeIcon = ({ type, size = 20, className = '' }: { type: string; size?: number; className?: string }) => {
  const iconMap: Record<string, React.ReactNode> = {
    post: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z"/></svg>,
    carrossel: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>,
    reels: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>,
    stories: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/></svg>,
    video: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>,
    blog: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>,
    anuncio: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/></svg>,
  };
  const icon = iconMap[type];
  if (!icon) return <span className={className}>📝</span>;
  return <span className={className}>{icon}</span>;
};

// Componente de Carrossel de Mídia com suporte a vídeo
const MediaCarousel = ({ media }: { media: MediaFile[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentMedia = media[currentIndex];
  if (!currentMedia) return null;

  const goToPrev = () => setCurrentIndex(Math.max(0, currentIndex - 1));
  const goToNext = () => setCurrentIndex(Math.min(media.length - 1, currentIndex + 1));

  return (
    <div className="relative">
      <div className="aspect-square bg-gray-800 rounded-xl overflow-hidden relative">
        {currentMedia.type === 'video' ? (
          <video src={currentMedia.url} className="w-full h-full object-cover" controls playsInline />
        ) : (
          <img src={currentMedia.url} alt="" className="w-full h-full object-cover" />
        )}
        {currentMedia.type === 'video' && (
          <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <Icons.Play size={12} /> Vídeo
          </div>
        )}
      </div>
      {media.length > 1 && (
        <>
          <button onClick={goToPrev} disabled={currentIndex === 0} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center disabled:opacity-30 transition">
            <Icons.ChevronLeft size={20} />
          </button>
          <button onClick={goToNext} disabled={currentIndex === media.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center disabled:opacity-30 transition">
            <Icons.ChevronRight size={20} />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {media.map((_, idx) => (
              <button key={idx} onClick={() => setCurrentIndex(idx)} className={clsx('w-2.5 h-2.5 rounded-full transition', idx === currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60')} />
            ))}
          </div>
          <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">{currentIndex + 1} / {media.length}</div>
        </>
      )}
      {media.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {media.map((m, idx) => (
            <button key={m.id} onClick={() => setCurrentIndex(idx)} className={clsx('flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition', idx === currentIndex ? 'border-orange-500' : 'border-transparent hover:border-gray-600')}>
              {m.type === 'video' ? (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center relative">
                  <video src={m.url} className="w-full h-full object-cover" muted />
                  <Icons.Play size={16} className="absolute text-white" />
                </div>
              ) : (
                <img src={m.url} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  <ContentTypeIcon type={demand.content_type} size={32} />
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

      {/* Modal Central de Preview - Melhorado */}
      {selectedDemand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDemand(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div
            className="relative bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/95 backdrop-blur">
              <div className="flex items-center gap-3">
                {(() => {
                  const statusConfig = getStatusConfig(selectedDemand.status);
                  return (
                    <span className={clsx('px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1.5', statusConfig.bgColor, statusConfig.textColor)}>
                      {statusConfig.icon} {statusConfig.label}
                    </span>
                  );
                })()}
                <span className="text-white font-semibold">{selectedDemand.title}</span>
              </div>
              <button onClick={() => setSelectedDemand(null)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition">
                <Icons.X size={24} />
              </button>
            </div>

            {/* Content - Grid Layout */}
            <div className="grid md:grid-cols-2 gap-0 max-h-[calc(90vh-80px)] overflow-y-auto">
              {/* Left: Media */}
              <div className="p-5 bg-gray-950">
                {selectedDemand.media.length > 0 ? (
                  <MediaCarousel media={selectedDemand.media} />
                ) : (
                  <div className="aspect-square bg-gray-800 rounded-xl flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Icons.Image size={48} className="mx-auto mb-2 opacity-50" />
                      <p>Sem mídia</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Info */}
              <div className="p-5 space-y-4 border-l border-gray-800">
                {/* Date & Time */}
                <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <Icons.Calendar size={20} className="text-orange-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {selectedDemand.scheduled_date && new Date(selectedDemand.scheduled_date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    {selectedDemand.scheduled_time && <div className="text-gray-400 text-sm">às {selectedDemand.scheduled_time}</div>}
                  </div>
                </div>

                {/* Client */}
                {(() => {
                  const client = getClient(selectedDemand.client_id);
                  return client && (
                    <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: client.color }}>
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-white">{client.name}</div>
                        <div className="text-sm text-gray-400">{client.company}</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Channels */}
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Plataformas</div>
                  <div className="flex gap-2 flex-wrap">
                    {selectedDemand.channels.map((ch) => {
                      const channel = SOCIAL_CHANNELS.find((c) => c.id === ch);
                      return channel ? (
                        <span key={ch} className="text-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5" style={{ backgroundColor: `${channel.color}20` }}>
                          <SocialIcon channel={ch} size={16} /> {channel.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* Caption */}
                {selectedDemand.caption && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Legenda</div>
                    <div className="text-gray-300 text-sm whitespace-pre-wrap bg-gray-800/50 p-3 rounded-xl max-h-32 overflow-y-auto">
                      {selectedDemand.caption}
                    </div>
                  </div>
                )}

                {/* Hashtags */}
                {selectedDemand.hashtags && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Hashtags</div>
                    <div className="text-blue-400 text-sm">{selectedDemand.hashtags}</div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 border-t border-gray-800 flex gap-3">
                  {isApproved(selectedDemand) ? (
                    <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500/20 text-green-400 rounded-xl font-medium">
                      <Icons.CheckCircle size={20} /> Aprovado
                    </div>
                  ) : (
                    <a href={`/approval/${selectedDemand.id}`} className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition">
                      <Icons.ExternalLink size={18} /> Abrir Aprovação
                    </a>
                  )}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/approval/${selectedDemand.id}`);
                      toast.success('Link copiado!');
                    }}
                    className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition"
                    title="Copiar link"
                  >
                    <Icons.Copy size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
