'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ticket } from '@/types';
import { LogOut, Plus, User, Briefcase, Clock, CheckCircle, Bug, Sparkles, Eye, MessageSquare, Filter, SortAsc, SortDesc, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import TicketModal from '@/components/TicketModal';
import SearchBar from '@/components/SearchBar';
import ConfirmDialog from '@/components/ConfirmDialog';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';

const statusColors = {
  'aberto': 'bg-blue-100 text-blue-800',
  'em-andamento': 'bg-yellow-100 text-yellow-800',
  'resolvido': 'bg-green-100 text-green-800',
  'fechado': 'bg-gray-100 text-gray-800',
};

const statusLabels = {
  'aberto': 'Aberto',
  'em-andamento': 'Em Andamento',
  'resolvido': 'Resolvido',
  'fechado': 'Fechado',
};

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  // Paginação
  const [itemsPerPage] = useState(20);
  const [displayedItems, setDisplayedItems] = useState(20);

  useEffect(() => {
    if (!user) return;

    // Escuta mudanças nos chamados do usuário em tempo real
    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef,
      where('userId', '==', user.uid)
    );

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
        
        // Ordena no cliente
        ticketsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        setTickets(ticketsData);
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao buscar chamados:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Filtragem e busca com useMemo para performance
  const filteredTickets = useMemo(() => {
    let filtered = [...tickets];

    // Busca por título, descrição ou ID
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.titulo.toLowerCase().includes(searchLower) ||
          ticket.descricao.toLowerCase().includes(searchLower) ||
          ticket.ticketId.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter);
    }

    // Filtro por tipo
    if (typeFilter !== 'todos') {
      filtered = filtered.filter((ticket) => ticket.tipo === typeFilter);
    }

    // Ordenação
    filtered.sort((a, b) => {
      const timeA = a.createdAt.getTime();
      const timeB = b.createdAt.getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return filtered;
  }, [tickets, searchTerm, statusFilter, typeFilter, sortOrder]);

  // Tickets paginados
  const paginatedTickets = useMemo(() => {
    return filteredTickets.slice(0, displayedItems);
  }, [filteredTickets, displayedItems]);

  const handleLoadMore = () => {
    setDisplayedItems((prev) => prev + itemsPerPage);
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const handleOpenTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTicket(null);
  };

  const stats = {
    total: filteredTickets.length,
    abertos: filteredTickets.filter(t => t.status === 'aberto').length,
    emAndamento: filteredTickets.filter(t => t.status === 'em-andamento').length,
    resolvidos: filteredTickets.filter(t => t.status === 'resolvido').length,
    fechados: filteredTickets.filter(t => t.status === 'fechado').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
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
                <h1 className="text-2xl font-bold text-gray-900">Meus Chamados</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Bem-vindo(a), {user?.nome}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.nome}</p>
                <p className="text-xs text-gray-500">{user?.setor}</p>
              </div>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8" role="region" aria-label="Estatísticas de chamados">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <Briefcase className="h-8 w-8 text-gray-400" aria-hidden="true" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Abertos</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.abertos}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-400" aria-hidden="true" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Em Andamento</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.emAndamento}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-400" aria-hidden="true" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Resolvidos</p>
                    <p className="text-2xl font-bold text-green-600">{stats.resolvidos}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-400" aria-hidden="true" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Fechados</p>
                    <p className="text-2xl font-bold text-gray-700">{stats.fechados}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-gray-400" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Botão Novo Chamado */}
            <div className="mb-6">
              <button
                onClick={() => router.push('/dashboard/novo-chamado')}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label="Criar novo chamado"
              >
                <Plus className="h-5 w-5" />
                Novo Chamado
              </button>
            </div>

            {/* Busca e Filtros */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="space-y-4">
                {/* Barra de Busca */}
                <SearchBar 
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Buscar por título, descrição ou ID do chamado..."
                  className="w-full"
                />

                {/* Toggle de Filtros */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
                  aria-expanded={showFilters}
                  aria-controls="filters-section"
                >
                  <Filter className="h-4 w-4" />
                  {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
                </button>

                {/* Filtros */}
                {showFilters && (
                  <div id="filters-section" className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t" role="region" aria-label="Filtros de chamados">
                    <div>
                      <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        id="status-filter"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        aria-label="Filtrar por status"
                      >
                        <option value="todos">Todos os status</option>
                        <option value="aberto">Aberto</option>
                        <option value="em-andamento">Em Andamento</option>
                        <option value="resolvido">Resolvido</option>
                        <option value="fechado">Fechado</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo
                      </label>
                      <select
                        id="type-filter"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        aria-label="Filtrar por tipo"
                      >
                        <option value="todos">Todos os tipos</option>
                        <option value="bug">Bug</option>
                        <option value="melhoria">Melhoria</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="sort-order" className="block text-sm font-medium text-gray-700 mb-1">
                        Ordenação
                      </label>
                      <button
                        id="sort-order"
                        onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                        className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-primary-500"
                        aria-label={`Ordenar por data: ${sortOrder === 'desc' ? 'mais recentes primeiro' : 'mais antigos primeiro'}`}
                      >
                        <span className="text-sm">
                          {sortOrder === 'desc' ? 'Mais recentes' : 'Mais antigos'}
                        </span>
                        {sortOrder === 'desc' ? (
                          <SortDesc className="h-4 w-4 text-gray-500" aria-hidden="true" />
                        ) : (
                          <SortAsc className="h-4 w-4 text-gray-500" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Contador de resultados */}
                <p className="text-sm text-gray-600">
                  Mostrando {paginatedTickets.length} de {filteredTickets.length} chamado(s)
                  {searchTerm || statusFilter !== 'todos' || typeFilter !== 'todos' ? ' (filtrado)' : ''}
                </p>
              </div>
            </div>

        {/* Lista de Chamados */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Histórico de Chamados</h2>
          </div>
          
          {paginatedTickets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchTerm || statusFilter !== 'todos' || typeFilter !== 'todos' 
                ? 'Nenhum chamado encontrado com os filtros selecionados.'
                : 'Nenhum chamado encontrado. Crie seu primeiro chamado!'
              }
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200" role="list" aria-label="Lista de chamados">
                {paginatedTickets.map((ticket) => (
                  <article 
                    key={ticket.id} 
                    className="p-6 hover:bg-gray-50 transition"
                    role="listitem"
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm font-semibold text-primary-600">
                            {ticket.ticketId}
                          </span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[ticket.status]}`}>
                            {statusLabels[ticket.status]}
                          </span>
                          <span className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                            ticket.tipo === 'bug' 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {ticket.tipo === 'bug' ? <Bug className="h-3 w-3" aria-hidden="true" /> : <Sparkles className="h-3 w-3" aria-hidden="true" />}
                            {ticket.tipo === 'bug' ? 'Bug' : 'Melhoria'}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {ticket.titulo}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {ticket.descricao.substring(0, 150)}
                          {ticket.descricao.length > 150 && '...'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" aria-hidden="true" />
                            {ticket.setor}
                          </span>
                          <span>
                            {format(ticket.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {ticket.url && (
                          <a
                            href={ticket.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:text-primary-700 underline mt-2 inline-block focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                          >
                            🔗 Link anexado
                          </a>
                        )}
                      </div>
                      {ticket.imageBase64 && (
                        <div className="relative w-full sm:w-32 h-32 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                          <Image
                            src={ticket.imageBase64}
                            alt={`Imagem do chamado ${ticket.ticketId}`}
                            fill
                            sizes="128px"
                            className="object-cover"
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Botão Visualizar e Chat */}
                    <div className="mt-4">
                      <button
                        onClick={() => handleOpenTicket(ticket)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                        aria-label={`Visualizar detalhes e chat do chamado ${ticket.ticketId}`}
                      >
                        <Eye className="h-4 w-4" />
                        Visualizar e Chat
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {/* Botão Load More */}
              {displayedItems < filteredTickets.length && (
                <div className="px-6 py-4 border-t border-gray-200 text-center">
                  <button
                    onClick={handleLoadMore}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-gray-400"
                    aria-label="Carregar mais chamados"
                  >
                    <ChevronDown className="h-5 w-5" />
                    Carregar mais ({filteredTickets.length - displayedItems} restantes)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
          </>
        )}
      </main>

      {/* Modal de Visualização e Chat */}
      {showModal && selectedTicket && (
        <TicketModal ticket={selectedTicket} onClose={handleCloseModal} />
      )}

      {/* Diálogo de Confirmação de Logout */}
      <ConfirmDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={confirmLogout}
        title="Confirmar saída"
        message="Tem certeza que deseja sair da sua conta?"
        confirmText="Sim, sair"
        cancelText="Cancelar"
        variant="warning"
      />
    </div>
  );
}
