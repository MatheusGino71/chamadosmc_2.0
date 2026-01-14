'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ticket } from '@/types';
import { LogOut, Plus, User, Briefcase, Clock, CheckCircle, Bug, Sparkles, Eye, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import TicketModal from '@/components/TicketModal';

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

  const handleLogout = async () => {
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
    total: tickets.length,
    abertos: tickets.filter(t => t.status === 'aberto').length,
    emAndamento: tickets.filter(t => t.status === 'em-andamento').length,
    resolvidos: tickets.filter(t => t.status === 'resolvido').length,
    fechados: tickets.filter(t => t.status === 'fechado').length,
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
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Briefcase className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Abertos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.abertos}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Em Andamento</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.emAndamento}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolvidos</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolvidos}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fechados</p>
                <p className="text-2xl font-bold text-gray-700">{stats.fechados}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Botão Novo Chamado */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard/novo-chamado')}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition shadow-md"
          >
            <Plus className="h-5 w-5" />
            Novo Chamado
          </button>
        </div>

        {/* Lista de Chamados */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Histórico de Chamados</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum chamado encontrado. Crie seu primeiro chamado!
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="p-6 hover:bg-gray-50 transition">
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
                      {ticket.tipo === 'bug' ? <Bug className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                      {ticket.tipo === 'bug' ? 'Bug' : 'Melhoria'}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {ticket.titulo}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {ticket.descricao}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
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
                      className="text-xs text-primary-600 hover:text-primary-700 underline mt-2 inline-block"
                    >
                      🔗 Link anexado
                    </a>
                  )}
                    </div>
                    {ticket.imageBase64 && (
                      <div className="relative w-full sm:w-32 h-32 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                        <Image
                          src={ticket.imageBase64}
                          alt="Imagem do chamado"
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
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-md transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      Visualizar e Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal de Visualização e Chat */}
      {showModal && selectedTicket && (
        <TicketModal ticket={selectedTicket} onClose={handleCloseModal} />
      )}
    </div>
  );
}
