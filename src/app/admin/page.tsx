'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, updateDoc, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ticket, User, PRIORITY_CONFIG } from '@/types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { LogOut, User as UserIcon, Briefcase, Calendar, Bug, Sparkles, Wrench, Eye, MessageSquare, Clock, Filter, X, Plus, UserCog, Archive, ArchiveRestore, AlertCircle, Mail } from 'lucide-react';
import { autoArchiveOldTickets, unarchiveTicket } from '@/lib/archiveTickets';
import { format, formatDistanceToNow, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import TicketModal from '@/components/TicketModal';
import CreateTicketModal from '@/components/CreateTicketModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { AdminSkeleton } from '@/components/LoadingSkeleton';
import { toast } from 'sonner';
import { notifyTicketStatusChanged } from '@/lib/notifications';
import NotificationCenter from '@/components/NotificationCenter';
import SendMessageModal from '@/components/SendMessageModal';
import MessagesInbox from '@/components/MessagesInbox';

// Função para calcular tempo em aberto
const getTimeOpen = (createdAt: Date): string => {
  return formatDistanceToNow(createdAt, { locale: ptBR, addSuffix: false });
};

// Função para calcular tempo de resolução
const getResolutionTime = (createdAt: Date, closedAt: Date): string => {
  const minutes = differenceInMinutes(closedAt, createdAt);
  const hours = differenceInHours(closedAt, createdAt);
  const days = differenceInDays(closedAt, createdAt);

  if (minutes < 60) return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  if (hours < 24) return `${hours} hora${hours !== 1 ? 's' : ''}`;
  return `${days} dia${days !== 1 ? 's' : ''}`;
};

// Função para calcular status do prazo baseado na prioridade
const getDeadlineStatus = (ticket: Ticket): { status: 'vencido' | 'proximo' | 'dentro', message: string, color: string } => {
  // Se o ticket já foi fechado, não mostra prazo
  if (ticket.status === 'fechado') {
    return { status: 'dentro', message: '', color: '' };
  }

  const priority = ticket.priority || 'media';
  const deadlineDays = PRIORITY_CONFIG[priority].days;
  const createdAt = ticket.createdAt;
  const now = new Date();
  const daysPassed = differenceInDays(now, createdAt);
  const daysRemaining = deadlineDays - daysPassed;

  if (daysRemaining < 0) {
    // Vencido
    const daysOverdue = Math.abs(daysRemaining);
    return {
      status: 'vencido',
      message: `Vencido há ${daysOverdue} ${daysOverdue === 1 ? 'dia' : 'dias'}`,
      color: 'bg-red-100 text-red-700 border-red-300'
    };
  } else if (daysRemaining === 0) {
    // Vence hoje
    return {
      status: 'proximo',
      message: 'Vence hoje!',
      color: 'bg-orange-100 text-orange-700 border-orange-300'
    };
  } else if (daysRemaining === 1) {
    // Vence amanhã
    return {
      status: 'proximo',
      message: 'Vence amanhã',
      color: 'bg-yellow-100 text-yellow-700 border-yellow-300'
    };
  } else if (daysRemaining <= 2) {
    // Próximo do vencimento (2 dias ou menos)
    return {
      status: 'proximo',
      message: `${daysRemaining} dias restantes`,
      color: 'bg-yellow-100 text-yellow-700 border-yellow-300'
    };
  } else {
    // Dentro do prazo
    return {
      status: 'dentro',
      message: `${daysRemaining} dias restantes`,
      color: 'bg-blue-100 text-blue-700 border-blue-300'
    };
  }
};

const columns = [
  { id: 'aberto', title: 'Aberto', color: 'bg-blue-50 border-blue-300', headerColor: 'bg-blue-500', icon: '\ud83d\udd35' },
  { id: 'em-andamento', title: 'Em Andamento', color: 'bg-yellow-50 border-yellow-300', headerColor: 'bg-yellow-500', icon: '\u23f3' },
  { id: 'resolvido', title: 'Resolvido', color: 'bg-green-50 border-green-300', headerColor: 'bg-green-500', icon: '\u2705' },
  { id: 'fechado', title: 'Fechado', color: 'bg-gray-50 border-gray-300', headerColor: 'bg-gray-500', icon: '\ud83d\udd12' },
];

export default function AdminPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [admins, setAdmins] = useState<User[]>([]); // Lista de admins
  const [loading, setLoading] = useState(true);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [showMessagesInbox, setShowMessagesInbox] = useState(false);
  const [openConversationWith, setOpenConversationWith] = useState<{ userId: string; userName: string } | undefined>();
  const [mounted, setMounted] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  // Estados de filtros
  const [filterSistema, setFilterSistema] = useState<string>('all');
  const [filterSetor, setFilterSetor] = useState<string>('all');
  const [filterPeriodo, setFilterPeriodo] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [filterDataInicio, setFilterDataInicio] = useState<string>('');
  const [filterDataFim, setFilterDataFim] = useState<string>('');
  const [filterResponsavel, setFilterResponsavel] = useState<string>('all'); // Novo filtro
  const [filterTicketId, setFilterTicketId] = useState<string>(''); // Filtro por ID
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active'); // Modo de visualização

  useEffect(() => {
    setMounted(true);
  }, []);

  // Arquivamento automático ao carregar a página
  useEffect(() => {
    const archiveOld = async () => {
      try {
        const count = await autoArchiveOldTickets();
        if (count > 0) {
          toast.success(`${count} chamado(s) arquivado(s) automaticamente`);
        }
      } catch (error) {
        console.error('Erro no arquivamento automático:', error);
      }
    };

    // Executa o arquivamento após 2 segundos
    const timer = setTimeout(archiveOld, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Executa arquivamento automático a cada 1 hora
  useEffect(() => {
    const archiveInterval = setInterval(async () => {
      try {
        const count = await autoArchiveOldTickets();
        if (count > 0) {
          console.log(`${count} chamado(s) arquivado(s) automaticamente (execução periódica)`);
        }
      } catch (error) {
        console.error('Erro no arquivamento automático periódico:', error);
      }
    }, 3600000); // 1 hora em milissegundos

    return () => clearInterval(archiveInterval);
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    // Escuta mudanças em todos os chamados em tempo real
    const ticketsRef = collection(db, 'tickets');
    const q = query(ticketsRef, orderBy('createdAt', 'desc'));

    try {
      unsubscribe = onSnapshot(
        q, 
        (snapshot) => {
          const ticketsData = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              closedAt: data.closedAt?.toDate() || undefined,
              archivedAt: data.archivedAt?.toDate() || undefined,
            } as Ticket;
          });
          
          setTickets(ticketsData);
          setLoading(false);
        },
        (error) => {
          console.error('Erro ao buscar chamados:', error);
          if (error.code === 'unavailable') {
            toast.error('Você está offline. Tentando reconectar...');
          } else if (error.code !== 'cancelled') {
            toast.error('Erro ao carregar chamados');
          }
          setLoading(false);
        }
      );
    } catch (error) {
      console.error('Erro ao configurar listener:', error);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Erro ao cancelar listener:', error);
        }
      }
    };
  }, []);

  // Carrega lista de admins
  useEffect(() => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'admin'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adminsData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as User;
      });
      setAdmins(adminsData);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const handleOpenConversation = (senderId: string, senderName: string) => {
    setOpenConversationWith({ userId: senderId, userName: senderName });
    setShowMessagesInbox(true);
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    setDraggedCard(null);

    // Se não houver destino ou se o item foi solto na mesma posição
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }

    // Atualiza o status do ticket no Firestore
    const newStatus = destination.droppableId as Ticket['status'];
    
    try {
      const ticketRef = doc(db, 'tickets', draggableId);
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
      };
      
      // Se está fechando o ticket, registra a data de fechamento
      if (newStatus === 'fechado') {
        updateData.closedAt = new Date();
      }
      
      await updateDoc(ticketRef, updateData);
      
      // Envia notificação para o criador do ticket sobre a mudança de status
      const ticket = tickets.find(t => t.id === draggableId);
      if (ticket && user) {
        try {
          await notifyTicketStatusChanged(
            ticket.id,
            ticket.ticketId,
            ticket.titulo,
            newStatus,
            ticket.userId,
            user.uid,
            user.nome
          );
        } catch (error) {
          console.error('Erro ao enviar notificação:', error);
        }
      }
      
      // Mostra mensagem de sucesso com toast
      if (newStatus === 'fechado') {
        toast.success('🎉 Parabéns campeão, continue assim!', {
          duration: 5000,
          style: {
            background: '#10b981',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 'bold',
            padding: '16px',
          },
        });
      } else {
        toast.success(`Chamado movido para "${columns.find(c => c.id === newStatus)?.title}" com sucesso!`);
      }
    } catch (error) {
      console.error('Erro ao atualizar status do ticket:', error);
      toast.error('Erro ao mover o chamado. Tente novamente.');
    }
  };

  const handleDragStart = (result: any) => {
    setDraggedCard(result.draggableId);
  };

  const getTicketsByStatus = (status: string) => {
    const filtered = filteredTickets.filter(ticket => ticket.status === status);
    
    // Ordena 'aberto' do mais antigo para o mais recente
    if (status === 'aberto') {
      return filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
    
    // Mantém a ordem padrão para outros status (mais recente primeiro)
    return filtered;
  };

  const handleOpenTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTicket(null);
  };

  const clearFilters = () => {
    setFilterSistema('all');
    setFilterSetor('all');
    setFilterPeriodo('all');
    setFilterDataInicio('');
    setFilterDataFim('');
    setFilterResponsavel('all');
    setFilterTicketId('');
  };

  const copyTicketId = (ticketId: string) => {
    navigator.clipboard.writeText(ticketId);
    toast.success('ID copiado!');
  };

  const handleUnarchiveTicket = async (ticketId: string) => {
    try {
      await unarchiveTicket(ticketId);
      toast.success('Chamado desarquivado com sucesso!');
    } catch (error) {
      console.error('Erro ao desarquivar:', error);
      toast.error('Erro ao desarquivar chamado');
    }
  };

  // Lógica de filtros
  const filteredTickets = tickets.filter((ticket) => {
    // Filtro por modo de visualização (ativos/arquivados)
    if (viewMode === 'active' && ticket.archived === true) {
      return false;
    }
    if (viewMode === 'archived' && ticket.archived !== true) {
      return false;
    }

    // Filtro por ID
    if (filterTicketId && !ticket.ticketId.toLowerCase().includes(filterTicketId.toLowerCase())) {
      return false;
    }

    // Filtro por sistema
    if (filterSistema !== 'all' && ticket.sistema !== filterSistema) {
      return false;
    }

    // Filtro por setor
    if (filterSetor !== 'all' && ticket.setor !== filterSetor) {
      return false;
    }

    // Filtro por responsável
    if (filterResponsavel === 'mine' && ticket.assignedTo !== user?.uid) {
      return false;
    } else if (filterResponsavel !== 'all' && filterResponsavel !== 'mine' && ticket.assignedTo !== filterResponsavel) {
      return false;
    }

    // Filtro por período
    const ticketDate = ticket.createdAt;
    const now = new Date();

    if (filterPeriodo === 'today') {
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      if (ticketDate < todayStart || ticketDate > todayEnd) {
        return false;
      }
    } else if (filterPeriodo === 'week') {
      const weekStart = startOfWeek(now, { locale: ptBR });
      const weekEnd = endOfWeek(now, { locale: ptBR });
      if (ticketDate < weekStart || ticketDate > weekEnd) {
        return false;
      }
    } else if (filterPeriodo === 'month') {
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      if (ticketDate < monthStart || ticketDate > monthEnd) {
        return false;
      }
    }

    // Filtro por data customizada
    if (filterDataInicio && filterDataFim) {
      const dataInicio = new Date(filterDataInicio + 'T00:00:00');
      const dataFim = new Date(filterDataFim + 'T23:59:59');
      if (ticketDate < dataInicio || ticketDate > dataFim) {
        return false;
      }
    }

    return true;
  });

  const stats = {
    total: filteredTickets.length,
    abertos: filteredTickets.filter(t => t.status === 'aberto').length,
    emAndamento: filteredTickets.filter(t => t.status === 'em-andamento').length,
    resolvidos: filteredTickets.filter(t => t.status === 'resolvido').length,
    fechados: filteredTickets.filter(t => t.status === 'fechado').length,
  };

  const setores = ['Financeiro', 'TI', 'RH', 'Marketing', 'Comercial', 'Sucesso do Aluno', 'Diretoria', 'Pedagógico', 'Outros'];
  const sistemas = ['BIPE', 'Área do Aluno', 'Ecommerce'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="relative w-32 h-10">
                <Image
                  src="/logomeucurso.png"
                  alt="MeuCurso"
                  fill
                  sizes="128px"
                  className="object-contain"
                  priority
                />
              </div>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Gerenciamento de Chamados - Kanban
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.nome}</p>
                <p className="text-xs text-primary-600 font-semibold">Administrador</p>
              </div>
              <button
                onClick={() => router.push('/admin/usuarios')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                aria-label="Gerenciar usuários"
              >
                <UserCog className="h-4 w-4" />
                <span className="hidden md:inline">Usuários</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label="Criar novo chamado"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden md:inline">Novo Chamado</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Sair da conta"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-3">
              {/* Notificações */}
              {user && (
                <NotificationCenter 
                  userId={user.uid} 
                  onOpenConversation={handleOpenConversation}
                />
              )}
              
              {/* Botão Ver Mensagens */}
              <button
                onClick={() => {
                  setOpenConversationWith(undefined);
                  setShowMessagesInbox(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                aria-label="Ver mensagens"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden md:inline">Mensagens</span>
              </button>
              
              {/* Botão Enviar Mensagem */}
              <button
                onClick={() => setShowSendMessageModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Enviar mensagem"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden md:inline">Enviar Mensagem</span>
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-expanded={showFilters}
                aria-controls="admin-filters"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              </button>
              
              {/* Switch Ativos/Arquivados */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('active')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition text-sm font-medium ${
                    viewMode === 'active' 
                      ? 'bg-white text-primary-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-pressed={viewMode === 'active'}
                >
                  <Eye className="h-4 w-4" />
                  Ativos
                </button>
                <button
                  onClick={() => setViewMode('archived')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition text-sm font-medium ${
                    viewMode === 'archived' 
                      ? 'bg-white text-primary-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-pressed={viewMode === 'archived'}
                >
                  <Archive className="h-4 w-4" />
                  Arquivados
                </button>
              </div>
            </div>
            {(filterSistema !== 'all' || filterSetor !== 'all' || filterPeriodo !== 'all' || filterDataInicio || filterDataFim || filterResponsavel !== 'all' || filterTicketId) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Limpar todos os filtros"
              >
                <X className="h-4 w-4" />
                Limpar Filtros
              </button>
            )}
          </div>

          {showFilters && (
            <div id="admin-filters" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg" role="region" aria-label="Filtros de chamados">
              {/* Filtro por ID */}
              <div>
                <label htmlFor="filter-ticket-id" className="block text-xs font-medium text-gray-700 mb-1">ID do Chamado</label>
                <input
                  id="filter-ticket-id"
                  type="text"
                  value={filterTicketId}
                  onChange={(e) => setFilterTicketId(e.target.value)}
                  placeholder="Ex: CHM-2026-0001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Filtrar por ID do chamado"
                />
              </div>

              {/* Filtro de Sistema */}
              <div>
                <label htmlFor="filter-sistema" className="block text-xs font-medium text-gray-700 mb-1">Sistema</label>
                <select
                  id="filter-sistema"
                  value={filterSistema}
                  onChange={(e) => setFilterSistema(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Filtrar por sistema"
                >
                  <option value="all">Todos</option>
                  {sistemas.map((sistema) => (
                    <option key={sistema} value={sistema}>{sistema}</option>
                  ))}
                </select>
              </div>

              {/* Filtro de Setor */}
              <div>
                <label htmlFor="filter-setor" className="block text-xs font-medium text-gray-700 mb-1">Setor</label>
                <select
                  id="filter-setor"
                  value={filterSetor}
                  onChange={(e) => setFilterSetor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Filtrar por setor"
                >
                  <option value="all">Todos</option>
                  {setores.map((setor) => (
                    <option key={setor} value={setor}>{setor}</option>
                  ))}
                </select>
              </div>

              {/* Filtro de Responsável */}
              <div>
                <label htmlFor="filter-responsavel" className="block text-xs font-medium text-gray-700 mb-1">Responsável</label>
                <select
                  id="filter-responsavel"
                  value={filterResponsavel}
                  onChange={(e) => setFilterResponsavel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Filtrar por responsável"
                >
                  <option value="all">Todos</option>
                  <option value="mine">Meus Chamados</option>
                  {admins.map((admin) => (
                    <option key={admin.uid} value={admin.uid}>{admin.nome}</option>
                  ))}
                </select>
              </div>

              {/* Filtro de Período */}
              <div>
                <label htmlFor="filter-periodo" className="block text-xs font-medium text-gray-700 mb-1">Período</label>
                <select
                  id="filter-periodo"
                  value={filterPeriodo}
                  onChange={(e) => {
                    setFilterPeriodo(e.target.value as any);
                    if (e.target.value !== 'all') {
                      setFilterDataInicio('');
                      setFilterDataFim('');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Filtrar por período"
                >
                  <option value="all">Todos</option>
                  <option value="today">Hoje</option>
                  <option value="week">Esta Semana</option>
                  <option value="month">Este Mês</option>
                </select>
              </div>

              {/* Filtro Data Início */}
              <div>
                <label htmlFor="filter-data-inicio" className="block text-xs font-medium text-gray-700 mb-1">Data Início</label>
                <input
                  id="filter-data-inicio"
                  type="date"
                  value={filterDataInicio}
                  onChange={(e) => {
                    setFilterDataInicio(e.target.value);
                    setFilterPeriodo('all');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Data de início do filtro"
                />
              </div>

              {/* Filtro Data Fim */}
              <div>
                <label htmlFor="filter-data-fim" className="block text-xs font-medium text-gray-700 mb-1">Data Fim</label>
                <input
                  id="filter-data-fim"
                  type="date"
                  value={filterDataFim}
                  onChange={(e) => {
                    setFilterDataFim(e.target.value);
                    setFilterPeriodo('all');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Data final do filtro"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AdminSkeleton />
        </div>
      ) : viewMode === 'archived' ? (
        /* Visualização de Arquivados */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Chamados Arquivados
                <span className="ml-2 text-sm font-normal text-gray-600">
                  ({filteredTickets.length} {filteredTickets.length === 1 ? 'chamado' : 'chamados'})
                </span>
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredTickets.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Archive className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum chamado arquivado encontrado</p>
                </div>
              ) : (
                filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <button
                            onClick={() => copyTicketId(ticket.ticketId)}
                            className="text-sm font-mono font-semibold text-primary-600 hover:text-primary-700 hover:underline cursor-pointer"
                            title="Clique para copiar o ID"
                          >
                            {ticket.ticketId}
                          </button>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            ticket.status === 'fechado' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {ticket.status === 'aberto' && 'Aberto'}
                            {ticket.status === 'em-andamento' && 'Em Andamento'}
                            {ticket.status === 'resolvido' && 'Resolvido'}
                            {ticket.status === 'fechado' && 'Fechado'}
                          </span>
                          <span className="text-xs text-gray-500">
                            Arquivado em {format(ticket.archivedAt || new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <h3 className="text-base font-medium text-gray-900 mb-1 truncate">
                          {ticket.titulo}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {ticket.descricao}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {ticket.sistema}
                          </span>
                          <span className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {ticket.setor}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(ticket.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenTicket(ticket)}
                          className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleUnarchiveTicket(ticket.id)}
                          className="px-3 py-1.5 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition flex items-center gap-1"
                          title="Desarquivar chamado"
                        >
                          <ArchiveRestore className="h-4 w-4" />
                          Desarquivar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" role="region" aria-label="Estatísticas de chamados">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-600 uppercase">Total</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-4">
                <p className="text-xs font-medium text-blue-600 uppercase">Abertos</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.abertos}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-4">
                <p className="text-xs font-medium text-yellow-600 uppercase">Em Andamento</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.emAndamento}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-green-200 p-4">
                <p className="text-xs font-medium text-green-600 uppercase">Resolvidos</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.resolvidos}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-400 p-4">
                <p className="text-xs font-medium text-gray-700 uppercase">Fechados</p>
                <p className="text-3xl font-bold text-gray-700 mt-1">{stats.fechados}</p>
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            {!mounted ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {columns.map((column) => (
                <div key={column.id} className="flex flex-col h-full">
                  <div className={`${column.headerColor} text-white rounded-t-lg px-4 py-3 shadow-md`}>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <span>{column.icon}</span>
                      {column.title}
                      <span className="ml-auto bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-sm">
                        {getTicketsByStatus(column.id).length}
                      </span>
                    </h3>
                  </div>
                  
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 ${column.color} border-2 border-t-0 rounded-b-lg p-3 min-h-[500px] transition-all duration-200 ${
                          snapshot.isDraggingOver 
                            ? 'bg-opacity-70 ring-4 ring-primary-300 scale-[1.02]' 
                            : ''
                        }`}
                      >
                        {getTicketsByStatus(column.id).length === 0 && (
                          <div className="flex items-center justify-center h-32 text-gray-400 text-sm border-2 border-dashed border-gray-300 rounded-lg">
                            Arraste os cards aqui
                          </div>
                        )}
                        <div className="space-y-3">
                          {getTicketsByStatus(column.id).map((ticket, index) => (
                            <Draggable
                              key={ticket.id}
                              draggableId={ticket.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white rounded-lg shadow-md border-l-4 ${
                                    ticket.tipo === 'bug' ? 'border-l-red-500' : ticket.tipo === 'melhoria' ? 'border-l-blue-500' : 'border-l-purple-500'
                                  } p-4 cursor-grab active:cursor-grabbing transition-all duration-200 ${
                                    snapshot.isDragging 
                                      ? 'shadow-2xl ring-4 ring-primary-400 rotate-2 scale-105' 
                                      : 'hover:shadow-lg hover:scale-[1.02]'
                                  } ${draggedCard === ticket.id ? 'opacity-50' : ''}`}
                                >
                                  {/* Ticket ID */}
                                  <div className="flex items-center justify-between mb-3">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyTicketId(ticket.ticketId);
                                      }}
                                      className="font-mono text-sm font-bold text-primary-600 hover:text-primary-700 hover:underline cursor-pointer transition"
                                      title="Clique para copiar o ID"
                                    >
                                      {ticket.ticketId}
                                    </button>
                                    <div className="text-gray-400 text-xs flex items-center gap-1">
                                      <span className="text-lg">☰</span>
                                      <span className="hidden sm:inline">Arraste</span>
                                    </div>
                                  </div>

                                  {/* Badge de Tipo */}
                                  <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                                      ticket.tipo === 'bug' 
                                        ? 'bg-red-100 text-red-700' 
                                        : ticket.tipo === 'melhoria'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-purple-100 text-purple-700'
                                    }`}>
                                      {ticket.tipo === 'bug' ? (
                                        <Bug className="h-3 w-3" />
                                      ) : ticket.tipo === 'melhoria' ? (
                                        <Sparkles className="h-3 w-3" />
                                      ) : (
                                        <Wrench className="h-3 w-3" />
                                      )}
                                      {ticket.tipo === 'bug' ? 'Bug' : ticket.tipo === 'melhoria' ? 'Melhoria' : 'Infra'}
                                    </span>
                                    {/* Badge de Prioridade */}
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${PRIORITY_CONFIG[ticket.priority || 'media'].color}`}>
                                      <AlertCircle className="h-3 w-3" />
                                      {PRIORITY_CONFIG[ticket.priority || 'media'].label}
                                    </span>
                                  </div>

                                  {/* Título */}
                                  <h4 className="font-semibold text-gray-900 mb-3 line-clamp-2">
                                    {ticket.titulo}
                                  </h4>

                                  {/* Nome do Usuário */}
                                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                    <UserIcon className="h-4 w-4" />
                                    <span>{ticket.userName}</span>
                                  </div>

                                  {/* Responsável */}
                                  {ticket.assignedToName && (
                                    <div className="flex items-center gap-2 text-xs text-indigo-600 mb-2 bg-indigo-50 px-2 py-1 rounded">
                                      <UserCog className="h-3 w-3" />
                                      <span className="font-medium">Responsável: {ticket.assignedToName}</span>
                                    </div>
                                  )}

                                  {/* Indicador de Prazo */}
                                  {ticket.status !== 'fechado' && (() => {
                                    const deadline = getDeadlineStatus(ticket);
                                    if (deadline.message) {
                                      return (
                                        <div className={`flex items-center gap-2 text-xs font-medium mb-2 px-2 py-1 rounded border ${deadline.color}`}>
                                          <Clock className="h-3 w-3" />
                                          <span>{deadline.message}</span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}

                                  {/* Contador de Tempo em Aberto ou Tempo de Resolução */}
                                  {ticket.status === 'fechado' && ticket.closedAt ? (
                                    <div className="space-y-2 mb-3 pb-3 border-b border-gray-200">
                                      <div className="flex items-center gap-2 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                                        <Clock className="h-3 w-3" />
                                        <span>Resolvido em {getResolutionTime(ticket.createdAt, ticket.closedAt)}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-gray-600 px-2">
                                        <Calendar className="h-3 w-3" />
                                        <span>Finalizado em {format(ticket.closedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-xs text-orange-600 font-medium mb-3 pb-3 border-b border-gray-200 bg-orange-50 px-2 py-1 rounded">
                                      <Clock className="h-3 w-3" />
                                      <span>Aberto há {getTimeOpen(ticket.createdAt)}</span>
                                    </div>
                                  )}

                                  {/* Botão Visualizar */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenTicket(ticket);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-md transition-colors"
                                  >
                                    <Eye className="h-4 w-4" />
                                    Visualizar e Chat
                                  </button>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>
        </>
      )}

      {/* Modal de Visualização e Chat */}
      {showModal && selectedTicket && (
        <TicketModal ticket={selectedTicket} onClose={handleCloseModal} admins={admins} />
      )}

      {/* Modal de Criação de Chamado */}
      {user && (
        <CreateTicketModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          userId={user.uid}
          userEmail={user.email || ''}
          userName={user.nome || ''}
          admins={admins}
        />
      )}

      {/* Modal de Enviar Mensagem */}
      {user && (
        <SendMessageModal
          isOpen={showSendMessageModal}
          onClose={() => setShowSendMessageModal(false)}
          currentUser={user}
        />
      )}

      {/* Modal de Caixa de Entrada de Mensagens */}
      {user && (
        <MessagesInbox
          isOpen={showMessagesInbox}
          onClose={() => {
            setShowMessagesInbox(false);
            setOpenConversationWith(undefined);
          }}
          userId={user.uid}
          userName={user.nome}
          openConversationWith={openConversationWith}
        />
      )}

      {/* Diálogo de Confirmação de Logout */}
      <ConfirmDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={confirmLogout}
        title="Confirmar saída"
        message="Tem certeza que deseja sair da sua conta de administrador?"
        confirmText="Sim, sair"
        cancelText="Cancelar"
        variant="warning"
      />
    </div>
  );
}
