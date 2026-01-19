'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, updateDoc, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ticket } from '@/types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { LogOut, User as UserIcon, Briefcase, Calendar, Bug, Sparkles, Eye, MessageSquare, Clock, Filter, X, Plus } from 'lucide-react';
import { format, formatDistanceToNow, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import TicketModal from '@/components/TicketModal';
import CreateTicketModal from '@/components/CreateTicketModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { AdminSkeleton } from '@/components/LoadingSkeleton';
import { toast } from 'sonner';

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
  const [loading, setLoading] = useState(true);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  // Estados de filtros
  const [filterSistema, setFilterSistema] = useState<string>('all');
  const [filterSetor, setFilterSetor] = useState<string>('all');
  const [filterPeriodo, setFilterPeriodo] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [filterDataInicio, setFilterDataInicio] = useState<string>('');
  const [filterDataFim, setFilterDataFim] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Escuta mudanças em todos os chamados em tempo real
    const ticketsRef = collection(db, 'tickets');
    const q = query(ticketsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const ticketsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Ticket;
        });
        
        setTickets(ticketsData);
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao buscar chamados:', error);
        if (error.code === 'unavailable') {
          toast.error('Você está offline. Tentando reconectar...');
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    await signOut();
    router.push('/login');
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
      
      // Mostra mensagem de sucesso com toast
      toast.success(`Chamado movido para "${columns.find(c => c.id === newStatus)?.title}" com sucesso!`);
    } catch (error) {
      console.error('Erro ao atualizar status do ticket:', error);
      toast.error('Erro ao mover o chamado. Tente novamente.');
    }
  };

  const handleDragStart = (result: any) => {
    setDraggedCard(result.draggableId);
  };

  const getTicketsByStatus = (status: string) => {
    return filteredTickets.filter(ticket => ticket.status === status);
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
  };

  // Lógica de filtros
  const filteredTickets = tickets.filter((ticket) => {
    // Filtro por sistema
    if (filterSistema !== 'all' && ticket.sistema !== filterSistema) {
      return false;
    }

    // Filtro por setor
    if (filterSetor !== 'all' && ticket.setor !== filterSetor) {
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

  const setores = ['Financeiro', 'TI', 'RH', 'Marketing', 'Comercial', 'Sucesso do Aluno', 'Diretoria', 'Outros'];
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
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label="Criar novo chamado"
              >
                <Plus className="h-4 w-4" />
                Novo Chamado
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Sair da conta"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-expanded={showFilters}
              aria-controls="admin-filters"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </button>
            {(filterSistema !== 'all' || filterSetor !== 'all' || filterPeriodo !== 'all' || filterDataInicio || filterDataFim) && (
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
            <div id="admin-filters" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg" role="region" aria-label="Filtros de chamados">
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
                                    ticket.tipo === 'bug' ? 'border-l-red-500' : 'border-l-blue-500'
                                  } p-4 cursor-grab active:cursor-grabbing transition-all duration-200 ${
                                    snapshot.isDragging 
                                      ? 'shadow-2xl ring-4 ring-primary-400 rotate-2 scale-105' 
                                      : 'hover:shadow-lg hover:scale-[1.02]'
                                  } ${draggedCard === ticket.id ? 'opacity-50' : ''}`}
                                >
                                  {/* Ticket ID */}
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="font-mono text-sm font-bold text-primary-600">
                                      {ticket.ticketId}
                                    </div>
                                    <div className="text-gray-400 text-xs flex items-center gap-1">
                                      <span className="text-lg">☰</span>
                                      <span className="hidden sm:inline">Arraste</span>
                                    </div>
                                  </div>

                                  {/* Badge de Tipo */}
                                  <div className="mb-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                                      ticket.tipo === 'bug' 
                                        ? 'bg-red-100 text-red-700' 
                                        : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {ticket.tipo === 'bug' ? <Bug className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                                      {ticket.tipo === 'bug' ? 'Bug' : 'Melhoria'}
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

                                  {/* Contador de Tempo em Aberto ou Tempo de Resolução */}
                                  {ticket.status === 'fechado' && ticket.closedAt ? (
                                    <div className="flex items-center gap-2 text-xs text-green-600 font-medium mb-3 pb-3 border-b border-gray-200 bg-green-50 px-2 py-1 rounded">
                                      <Clock className="h-3 w-3" />
                                      <span>Resolvido em {getResolutionTime(ticket.createdAt, ticket.closedAt)}</span>
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
        <TicketModal ticket={selectedTicket} onClose={handleCloseModal} />
      )}

      {/* Modal de Criação de Chamado */}
      {user && (
        <CreateTicketModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          userId={user.uid}
          userEmail={user.email || ''}
          userName={user.nome || ''}
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
