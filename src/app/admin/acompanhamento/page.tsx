'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin, getAdminSetor, isAdminTI, canAccessGlobalManagement } from '@/lib/auth-helpers';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ticket } from '@/types';
import { format, formatDistanceToNow, startOfMonth, endOfMonth, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Clock, TrendingUp, Music, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AcompanhamentoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const saberSoundRef = useRef<HTMLAudioElement>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [showAudioControls, setShowAudioControls] = useState(false);
  const [filterResponsavel, setFilterResponsavel] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterUsuario, setFilterUsuario] = useState<string>('');
  const [filterSetor, setFilterSetor] = useState<string>('all');

  // Redireciona se não tem permissão
  useEffect(() => {
    if (user && !isAdmin(user)) {
      router.push('/dashboard');
    }
    if (user && !canAccessGlobalManagement(user)) {
      router.push('/admin');
    }
  }, [user, router]);

  // Busca os tickets finalizados (com filtro de mês no cliente)
  useEffect(() => {
    if (!user || !isAdmin(user) || !canAccessGlobalManagement(user)) return;

    const q = query(
      collection(db, 'tickets'),
      where('status', 'in', ['resolvido', 'fechado'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const startDate = startOfMonth(selectedMonth);
      const endDate = endOfMonth(selectedMonth);

      const ticketsData = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            closedAt: data.closedAt?.toDate() || new Date(),
            startedAt: data.startedAt?.toDate() || null,
          } as Ticket;
        })
        .filter((ticket) => {
          // Filtro automático de setor para admins de setor específico
          const userSetor = getAdminSetor(user);
          if (userSetor && !isAdminTI(user)) {
            if (ticket.setor !== userSetor) {
              return false;
            }
          }

          // Filtra por data de fechamento dentro do mês selecionado
          if (!ticket.closedAt) return false;
          return ticket.closedAt >= startDate && ticket.closedAt <= endDate;
        })
        .sort((a, b) => (b.closedAt?.getTime() || 0) - (a.closedAt?.getTime() || 0));

      setTickets(ticketsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, selectedMonth]);

  // Efeito para tocar a música ao carregar a página (apenas uma vez)
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      // Define as propriedades de autoplay
      audio.muted = false;
      audio.volume = audioVolume;
      
      // Tenta reproduzir
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsAudioPlaying(true);
          })
          .catch((error) => {
            console.log('Autoplay foi bloqueado. O usuário pode iniciar manualmente.', error);
            // Mostrar um hint visual para o usuário iniciar
          });
      }
    }
  }, [audioVolume]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isAudioPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsAudioPlaying(!isAudioPlaying);
  };

  const handleVolumeChange = (newVolume: number) => {
    setAudioVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  const handleToggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = audioVolume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  // Toca som do sabre de luz quando filtro muda
  const playSaberSound = () => {
    if (saberSoundRef.current && !isMuted) {
      saberSoundRef.current.currentTime = 0;
      saberSoundRef.current.play().catch(() => {
        // Som pode não tocar em alguns navegadores
      });
    }
  };

  // Calcula tempo levado (apenas do período em andamento)
  const calculateTimeSpent = (ticket: Ticket): string => {
    if (!ticket.startedAt || !ticket.closedAt) {
      return 'N/A';
    }

    const minutes = differenceInMinutes(ticket.closedAt, ticket.startedAt);
    const hours = differenceInHours(ticket.closedAt, ticket.startedAt);
    const days = differenceInDays(ticket.closedAt, ticket.startedAt);

    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  // Calcula tempo levado em horas decimais (apenas do período em andamento)
  const calculateHoursSpent = (ticket: Ticket): number => {
    if (!ticket.startedAt || !ticket.closedAt) return 0;
    const minutes = differenceInMinutes(ticket.closedAt, ticket.startedAt);
    return parseFloat((minutes / 60).toFixed(2));
  };

  // Formata a diferença entre estimado e real
  const getDifference = (ticket: Ticket): { value: number; type: 'menor' | 'maior' | 'igual' } => {
    const spent = calculateHoursSpent(ticket);
    if (!ticket.estimatedHours) return { value: 0, type: 'igual' };

    const diff = spent - ticket.estimatedHours;
    if (diff < 0) return { value: Math.abs(diff), type: 'menor' };
    if (diff > 0) return { value: diff, type: 'maior' };
    return { value: 0, type: 'igual' };
  };

  // Gera lista de meses para o select
  const generateMonthOptions = () => {
    const options = [];
    const today = new Date();
    
    // Últimos 12 meses
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      options.push(date);
    }
    
    return options;
  };

  const monthOptions = generateMonthOptions();
  const monthFormatted = format(selectedMonth, 'MMMM yyyy', { locale: ptBR });
  const monthCapitalized = monthFormatted.charAt(0).toUpperCase() + monthFormatted.slice(1);

  // Filtra tickets conforme os filtros aplicados
  const filteredTickets = tickets.filter(ticket => {
    if (filterResponsavel !== 'all' && ticket.assignedTo !== filterResponsavel) return false;
    if (filterTipo !== 'all' && ticket.tipo !== filterTipo) return false;
    if (filterUsuario && !ticket.userName.toLowerCase().includes(filterUsuario.toLowerCase())) return false;
    if (filterSetor !== 'all' && ticket.setor !== filterSetor) return false;
    return true;
  });

  // Cálculos agregados
  const totalTickets = filteredTickets.length;
  const ticketsComTempo = filteredTickets.filter(t => t.startedAt && t.closedAt);
  const totalHoursSpent = ticketsComTempo.reduce((sum, ticket) => sum + calculateHoursSpent(ticket), 0);
  const totalHoursEstimated = ticketsComTempo.reduce((sum, ticket) => sum + (ticket.estimatedHours || 0), 0);

  // Listas únicas para filtros
  const responsaveis = Array.from(new Set(tickets.filter(t => t.assignedToName).map(t => t.assignedTo)));
  const responsaveisList = responsaveis.map(r => tickets.find(t => t.assignedTo === r)).filter(Boolean);
  const setoresUnicos = Array.from(new Set(tickets.map(t => t.setor))).sort();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Audio do Star Wars - Tema Principal */}
      <audio
        ref={audioRef}
        loop
        onError={(e) => {
          console.error('Erro ao carregar áudio:', e);
          toast.error('Música não encontrada. Adicione o arquivo "starwars-theme.mp3" na pasta public/', {
            duration: 5000,
          });
        }}
      >
        <source src="/starwars-theme.mp3" type="audio/mpeg" />
        Seu navegador não suporta reprodução de áudio.
      </audio>

      {/* Som do Sabre de Luz */}
      <audio ref={saberSoundRef} preload="auto">
        <source src="/freesound_community-lightsaber-clash-88733.mp3" type="audio/mpeg" />
      </audio>

      {/* Botão voltar */}
      <div className="fixed top-4 left-4 z-40">
        <Link
          href="/admin"
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
        >
          <ArrowLeft className="h-5 w-5" />
          Voltar
        </Link>
      </div>

      {/* Controles de áudio */}
      <div className="fixed top-4 right-4 z-40 bg-gray-800 rounded-lg p-3 border border-gray-700">
        <button
          onClick={() => setShowAudioControls(!showAudioControls)}
          className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-700 transition"
        >
          <Music className="h-5 w-5 text-yellow-500" />
          <span className="text-sm font-medium">Tema Star Wars</span>
        </button>

        {showAudioControls && (
          <div className="mt-3 p-3 bg-gray-700 rounded space-y-3 min-w-[200px]">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayPause}
                className="p-1.5 bg-yellow-500 hover:bg-yellow-600 rounded text-black transition"
              >
                {isAudioPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <span className="text-xs text-gray-300">
                {isAudioPlaying ? 'Tocando' : 'Pausado'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>Volume</span>
                <button
                  onClick={handleToggleMute}
                  className="p-1 hover:bg-gray-600 rounded transition"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : audioVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Header com logo de Star Wars */}
      <div className="text-center py-12">
        <div className="text-6xl font-black text-yellow-400 tracking-wider mb-2" style={{ fontStyle: 'italic', textShadow: '3px 3px 0px rgba(0,0,0,0.8)' }}>
          ACOMPANHAMENTO DE CHAMADOS
        </div>
        <div className="text-lg text-yellow-500 tracking-widest">
          CONTROLADORIA MENSAL DO DESENVOLVIMENTO
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-12">
        {/* Seletor de mês */}
        <div className="mb-8 flex justify-center">
          <div className="bg-gray-800 border-2 border-yellow-500 rounded-lg p-4 w-full max-w-xs">
            <label className="block text-sm font-semibold text-yellow-400 mb-2">
              Selecione o Mês
            </label>
            <select
              value={selectedMonth.toISOString()}
              onChange={(e) => setSelectedMonth(new Date(e.target.value))}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white hover:border-yellow-500 transition focus:outline-none focus:border-yellow-500"
            >
              {monthOptions.map((date) => (
                <option key={date.toISOString()} value={date.toISOString()}>
                  {format(date, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-8 bg-gray-800 border-2 border-purple-500 rounded-lg p-6">
          <h3 className="text-lg font-bold text-purple-400 mb-4">⚡ FILTROS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro por Tipo */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">Tipo de Chamado</label>
              <select
                value={filterTipo}
                onChange={(e) => {
                  setFilterTipo(e.target.value);
                  playSaberSound();
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white hover:border-purple-400 transition focus:outline-none focus:border-purple-400"
              >
                <option value="all">Todos</option>
                <option value="bug">🐛 Bug</option>
                <option value="melhoria">✨ Melhoria</option>
                <option value="infra">🔧 Infra</option>
              </select>
            </div>

            {/* Filtro por Responsável */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">Responsável</label>
              <select
                value={filterResponsavel}
                onChange={(e) => {
                  setFilterResponsavel(e.target.value);
                  playSaberSound();
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white hover:border-purple-400 transition focus:outline-none focus:border-purple-400"
              >
                <option value="all">Todos</option>
                {responsaveisList.map((ticket) => (
                  <option key={ticket?.assignedTo} value={ticket?.assignedTo}>
                    {ticket?.assignedToName}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Setor */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">Setor que Abriu</label>
              <select
                value={filterSetor}
                onChange={(e) => {
                  setFilterSetor(e.target.value);
                  playSaberSound();
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white hover:border-purple-400 transition focus:outline-none focus:border-purple-400"
              >
                <option value="all">Todos</option>
                {setoresUnicos.map((setor) => (
                  <option key={setor} value={setor}>
                    {setor}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Usuário */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">Quem Abriu</label>
              <input
                type="text"
                placeholder="Digite o nome..."
                value={filterUsuario}
                onChange={(e) => {
                  setFilterUsuario(e.target.value);
                  if (e.target.value) playSaberSound();
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 hover:border-purple-400 transition focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          {/* Botão limpar filtros */}
          {(filterTipo !== 'all' || filterResponsavel !== 'all' || filterSetor !== 'all' || filterUsuario) && (
            <button
              onClick={() => {
                setFilterTipo('all');
                setFilterResponsavel('all');
                setFilterSetor('all');
                setFilterUsuario('');
                playSaberSound();
              }}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded transition"
            >
              🔄 Limpar Filtros
            </button>
          )}
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 border-2 border-blue-500 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">{totalTickets}</div>
            <div className="text-gray-400 text-sm">Chamados Resolvidos</div>
            <div className="text-xs text-gray-500 mt-2">
              {ticketsComTempo.length} com tempo registrado
            </div>
          </div>
          <div className="bg-gray-800 border-2 border-green-500 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">{totalHoursSpent.toFixed(1)}h</div>
            <div className="text-gray-400 text-sm">Total de Horas Gastas</div>
            <div className="text-xs text-gray-500 mt-2">
              Tempo real de desenvolvimento
            </div>
          </div>
          <div className="bg-gray-800 border-2 border-purple-500 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">{totalHoursEstimated.toFixed(1)}h</div>
            <div className="text-gray-400 text-sm">Total Estimado</div>
            <div className="text-xs text-gray-500 mt-2">
              Previsão dos desenvolvedores
            </div>
          </div>
        </div>

        {/* Lista de chamados ou mensagem vazia */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin h-12 w-12 border-4 border-yellow-500 border-t-transparent rounded-full"></div>
              <p className="mt-4 text-gray-300">Carregando dados...</p>
            </div>
          </div>
        ) : totalTickets === 0 ? (
          <div className="bg-gray-800 border-2 border-gray-700 rounded-lg p-12 text-center">
            <Clock className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-300 text-lg">Nenhum chamado resolvido neste mês</p>
            <p className="text-gray-500 text-sm mt-2">Selecione outro mês ou continue trabalhando 🚀</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Aviso sobre cálculo de tempo */}
            <div className="bg-blue-900 border-l-4 border-blue-500 text-blue-100 p-4 rounded-lg">
              <p className="text-sm">
                <strong>ℹ️ Cálculo de Tempo:</strong> O tempo gasto é calculado apenas do momento em que o chamado foi colocado em "Em Andamento" até ser finalizado.
              </p>
            </div>

            {/* Resultados do filtro */}
            {(filterTipo !== 'all' || filterResponsavel !== 'all' || filterSetor !== 'all' || filterUsuario) && (
              <div className="bg-purple-900 border-l-4 border-purple-500 text-purple-100 p-4 rounded-lg">
                <p className="text-sm">
                  <strong>🎯 Filtros ativos:</strong> Mostrando {totalTickets} de {tickets.length} chamado(s)
                </p>
              </div>
            )}

            {filteredTickets.map((ticket) => {
              const diff = getDifference(ticket);
              const spent = calculateHoursSpent(ticket);
              const hasTimeData = ticket.startedAt && ticket.closedAt;

              return (
                <div
                  key={ticket.id}
                  className={`rounded-lg p-4 hover:bg-gray-750 transition ${
                    hasTimeData
                      ? 'bg-gray-800 border-l-4 border-yellow-500'
                      : 'bg-gray-800 border-l-4 border-gray-600'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="bg-yellow-500 text-black px-3 py-1 rounded text-sm font-bold">
                          {ticket.ticketId}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white">{ticket.titulo}</h3>
                          <p className="text-gray-400 text-sm mt-1">
                            Tipo: <span className="text-yellow-400">{ticket.tipo.toUpperCase()}</span>
                            {!hasTimeData && (
                              <span className="ml-4 text-orange-400 text-xs">
                                ⚠️ Tempo não registrado (não foi marcado em "Em Andamento")
                              </span>
                            )}
                          </p>
                          {/* Informações de quem abriu */}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="bg-cyan-900 text-cyan-300 px-2 py-1 rounded">
                              👤 {ticket.userName}
                            </span>
                            <span className="bg-cyan-900 text-cyan-300 px-2 py-1 rounded">
                              🏢 {ticket.setor}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 md:gap-6 text-center">
                      <div className={`rounded-lg p-3 ${hasTimeData ? 'bg-gray-700' : 'bg-gray-700 opacity-60'}`}>
                        <div className="text-xs text-gray-400 mb-1">Tempo Real</div>
                        <div className={`text-xl font-bold ${hasTimeData ? 'text-green-400' : 'text-gray-500'}`}>
                          {hasTimeData ? `${spent.toFixed(1)}h` : '—'}
                        </div>
                      </div>

                      <div className="bg-gray-700 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Estimado</div>
                        <div className="text-xl font-bold text-blue-400">
                          {ticket.estimatedHours ? `${ticket.estimatedHours.toFixed(1)}h` : '—'}
                        </div>
                      </div>

                      <div className={`rounded-lg p-3 ${hasTimeData ? 'bg-gray-700' : 'bg-gray-700 opacity-60'}`}>
                        <div className="text-xs text-gray-400 mb-1">Diferença</div>
                        <div className={`text-lg font-bold ${
                          !hasTimeData
                            ? 'text-gray-500'
                            : diff.type === 'menor'
                            ? 'text-green-400'
                            : diff.type === 'maior'
                            ? 'text-red-400'
                            : 'text-gray-300'
                        }`}>
                          {!hasTimeData
                            ? '—'
                            : diff.value > 0
                            ? diff.type === 'menor'
                              ? `+${diff.value.toFixed(1)}h`
                              : `-${diff.value.toFixed(1)}h`
                            : '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
                    <span>
                      Criado: {format(ticket.createdAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                    {ticket.startedAt && (
                      <span>
                        Iniciado: {format(ticket.startedAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    )}
                    {ticket.closedAt && (
                      <span>
                        Finalizado: {format(ticket.closedAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rodapé temático */}
      <div className="text-center text-gray-500 text-sm py-8 border-t border-gray-700 mt-12">
        <p className="text-yellow-600 font-semibold mb-2">🌟 May The Force Be With You 🌟</p>
        <p>Sistema de Acompanhamento de Chamados - Força e Dedicação no Desenvolvimento</p>
      </div>
    </div>
  );
}
