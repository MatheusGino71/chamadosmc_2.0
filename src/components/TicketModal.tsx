'use client';

import { useState, useEffect, useRef } from 'react';
import { Ticket, ChatMessage, User, Priority, PRIORITY_CONFIG } from '@/types';
import { X, Bug, Sparkles, User as UserIcon, Briefcase, Calendar, Mail, Send, MessageSquare, UserCog, Trash2, Users, Maximize2, AlertCircle, Clock, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ConfirmDialog from './ConfirmDialog';
import { notifyNewTicketMessage, notifyTicketAssigned, notifyTicketPriorityChanged } from '@/lib/notifications';
import { archiveTicket } from '@/lib/archiveTickets';

interface TicketModalProps {
  ticket: Ticket;
  onClose: () => void;
  admins?: User[];
  onDelete?: () => void;
}

const statusLabels = {
  'aberto': { label: 'Aberto', color: 'bg-blue-100 text-blue-800' },
  'em-andamento': { label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-800' },
  'resolvido': { label: 'Resolvido', color: 'bg-green-100 text-green-800' },
  'fechado': { label: 'Fechado', color: 'bg-gray-100 text-gray-800' },
};

const setores = [
  'Financeiro',
  'TI',
  'RH',
  'Marketing',
  'Comercial',
  'Sucesso do Aluno',
  'Diretoria',
  'Pedagógico',
  'Outros'
];

export default function TicketModal({ ticket, onClose, admins = [], onDelete }: TicketModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newInternalMessage, setNewInternalMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingInternal, setSendingInternal] = useState(false);
  const [assignedTo, setAssignedTo] = useState(ticket.assignedTo || '');
  const [priority, setPriority] = useState<Priority>(ticket.priority || 'media');
  const [setor, setSetor] = useState(ticket.setor || '');
  const [updatingAssignment, setUpdatingAssignment] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [updatingSetor, setUpdatingSetor] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const internalMessagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'internalChat'>('details');

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    // Escuta mudanças nas mensagens em tempo real
    const messagesRef = collection(db, 'tickets', ticket.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    try {
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const messagesData = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
            } as ChatMessage;
          });
          
          setMessages(messagesData);
        },
        (error) => {
          console.error('Erro ao buscar mensagens:', error);
          if (error.code !== 'cancelled') {
            toast.error('Erro ao carregar mensagens');
          }
        }
      );
    } catch (error) {
      console.error('Erro ao configurar listener de mensagens:', error);
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
  }, [ticket.id]);

  // Listener para mensagens do chat interno (apenas para admins)
  useEffect(() => {
    if (user?.role !== 'admin') return;

    let unsubscribe: (() => void) | null = null;

    const internalMessagesRef = collection(db, 'tickets', ticket.id, 'internalMessages');
    const q = query(internalMessagesRef, orderBy('createdAt', 'asc'));

    try {
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const messagesData = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
            } as ChatMessage;
          });
          
          setInternalMessages(messagesData);
        },
        (error) => {
          console.error('Erro ao buscar mensagens internas:', error);
          if (error.code !== 'cancelled') {
            toast.error('Erro ao carregar mensagens internas');
          }
        }
      );
    } catch (error) {
      console.error('Erro ao configurar listener de mensagens internas:', error);
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
  }, [ticket.id, user?.role]);

  useEffect(() => {
    // Scroll automático para última mensagem
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Scroll automático para última mensagem interna
    internalMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [internalMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user) return;

    setSending(true);

    try {
      const messagesRef = collection(db, 'tickets', ticket.id, 'messages');
      await addDoc(messagesRef, {
        senderId: user.uid,
        senderName: user.nome,
        senderRole: user.role,
        message: newMessage.trim(),
        createdAt: new Date(),
      });

      // Envia notificação para o destinatário apropriado
      const recipientId = user.role === 'admin' ? ticket.userId : (ticket.assignedTo || '');
      if (recipientId && recipientId !== user.uid) {
        try {
          await notifyNewTicketMessage(
            ticket.id,
            ticket.ticketId,
            ticket.titulo,
            recipientId,
            user.uid,
            user.nome,
            newMessage.trim()
          );
        } catch (error) {
          console.error('Erro ao enviar notificação:', error);
        }
      }

      setNewMessage('');
      toast.success('Mensagem enviada!');
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      
      // Verifica se é erro de permissão do Firestore
      if (error?.code === 'permission-denied') {
        toast.error('Erro de permissão. Verifique as regras do Firestore.');
      } else {
        toast.error('Erro ao enviar mensagem: ' + (error?.message || 'Tente novamente.'));
      }
    } finally {
      setSending(false);
    }
  };

  const handleSendInternalMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newInternalMessage.trim() || !user || user.role !== 'admin') return;

    setSendingInternal(true);

    try {
      const internalMessagesRef = collection(db, 'tickets', ticket.id, 'internalMessages');
      await addDoc(internalMessagesRef, {
        senderId: user.uid,
        senderName: user.nome,
        senderRole: user.role,
        message: newInternalMessage.trim(),
        createdAt: new Date(),
      });

      setNewInternalMessage('');
      toast.success('Mensagem interna enviada!');
    } catch (error: any) {
      console.error('Erro ao enviar mensagem interna:', error);
      
      if (error?.code === 'permission-denied') {
        toast.error('Erro de permissão. Verifique as regras do Firestore.');
      } else {
        toast.error('Erro ao enviar mensagem interna: ' + (error?.message || 'Tente novamente.'));
      }
    } finally {
      setSendingInternal(false);
    }
  };

  const handleUpdateAssignment = async (newAssignedTo: string) => {
    if (!user || user.role !== 'admin') return;

    setUpdatingAssignment(true);

    try {
      const ticketRef = doc(db, 'tickets', ticket.id);
      const assignedAdmin = newAssignedTo ? admins.find(a => a.uid === newAssignedTo) : null;

      await updateDoc(ticketRef, {
        assignedTo: newAssignedTo || null,
        assignedToName: assignedAdmin?.nome || null,
        updatedAt: new Date(),
      });

      // Envia notificação para o admin atribuído
      if (newAssignedTo && assignedAdmin) {
        try {
          await notifyTicketAssigned(
            ticket.id,
            ticket.ticketId,
            ticket.titulo,
            newAssignedTo,
            user.uid,
            user.nome
          );
        } catch (error) {
          console.error('Erro ao enviar notificação:', error);
        }
      }

      setAssignedTo(newAssignedTo);
      toast.success(newAssignedTo ? 'Responsável atribuído com sucesso!' : 'Responsável removido com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar responsável:', error);
      toast.error('Erro ao atualizar responsável');
    } finally {
      setUpdatingAssignment(false);
    }
  };

  const handleUpdatePriority = async (newPriority: Priority) => {
    if (!user || user.role !== 'admin') return;
    if (updatingPriority) return;

    setUpdatingPriority(true);

    try {
      const ticketRef = doc(db, 'tickets', ticket.id);

      await updateDoc(ticketRef, {
        priority: newPriority,
        updatedAt: new Date(),
      });

      // Envia notificação para o criador do chamado
      if (ticket.userId !== user.uid) {
        try {
          await notifyTicketPriorityChanged(
            ticket.id,
            ticket.ticketId,
            ticket.titulo,
            newPriority,
            ticket.userId,
            user.uid,
            user.nome
          );
        } catch (error) {
          console.error('Erro ao enviar notificação:', error);
        }
      }

      setPriority(newPriority);
      toast.success('Prioridade atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar prioridade:', error);
      toast.error('Erro ao atualizar prioridade');
    } finally {
      setUpdatingPriority(false);
    }
  };

  const handleUpdateSetor = async (newSetor: string) => {
    if (!user || user.role !== 'admin') return;
    if (updatingSetor) return;

    setUpdatingSetor(true);

    try {
      const ticketRef = doc(db, 'tickets', ticket.id);

      await updateDoc(ticketRef, {
        setor: newSetor,
        updatedAt: new Date(),
      });

      setSetor(newSetor);
      toast.success('Setor atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar setor:', error);
      toast.error('Erro ao atualizar setor');
    } finally {
      setUpdatingSetor(false);
    }
  };

  const handleArchiveTicket = async () => {
    if (!user || user.role !== 'admin') {
      toast.error('Apenas administradores podem arquivar chamados');
      return;
    }

    setArchiving(true);

    try {
      await archiveTicket(ticket.id);
      toast.success('Chamado arquivado com sucesso!');
      
      // Fechar modal
      onClose();
    } catch (error: any) {
      console.error('Erro ao arquivar chamado:', error);
      
      if (error?.code === 'permission-denied') {
        toast.error('Erro de permissão. Verifique as regras do Firestore.');
      } else {
        toast.error('Erro ao arquivar chamado: ' + (error?.message || 'Tente novamente.'));
      }
    } finally {
      setArchiving(false);
      setShowArchiveDialog(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!user) return;

    // Verifica se o usuário é admin ou o dono do chamado
    if (user.role !== 'admin' && user.uid !== ticket.userId) {
      toast.error('Você não tem permissão para excluir este chamado');
      return;
    }

    setDeleting(true);

    try {
      // Excluir todas as mensagens do chat
      const messagesRef = collection(db, 'tickets', ticket.id, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);
      
      const deleteMessagesPromises = messagesSnapshot.docs.map(msg => 
        deleteDoc(doc(db, 'tickets', ticket.id, 'messages', msg.id))
      );
      
      await Promise.all(deleteMessagesPromises);

      // Excluir todas as mensagens internas
      const internalMessagesRef = collection(db, 'tickets', ticket.id, 'internalMessages');
      const internalMessagesSnapshot = await getDocs(internalMessagesRef);
      
      const deleteInternalMessagesPromises = internalMessagesSnapshot.docs.map(msg => 
        deleteDoc(doc(db, 'tickets', ticket.id, 'internalMessages', msg.id))
      );
      
      await Promise.all(deleteInternalMessagesPromises);

      // Excluir o chamado
      await deleteDoc(doc(db, 'tickets', ticket.id));

      toast.success('Chamado excluído com sucesso!');
      
      // Chamar callback se fornecido
      if (onDelete) {
        onDelete();
      }
      
      // Fechar modal
      onClose();
    } catch (error: any) {
      console.error('Erro ao excluir chamado:', error);
      
      if (error?.code === 'permission-denied') {
        toast.error('Erro de permissão. Verifique as regras do Firestore.');
      } else {
        toast.error('Erro ao excluir chamado: ' + (error?.message || 'Tente novamente.'));
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-900">{ticket.titulo}</h2>
              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                ticket.tipo === 'bug' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {ticket.tipo === 'bug' ? <Bug className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                {ticket.tipo === 'bug' ? 'Bug' : 'Melhoria'}
              </span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusLabels[ticket.status].color}`}>
                {statusLabels[ticket.status].label}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${PRIORITY_CONFIG[priority].color}`}>
                <AlertCircle className="h-3 w-3" />
                {PRIORITY_CONFIG[priority].label}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1 font-mono font-bold">{ticket.ticketId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition ${
              activeTab === 'details'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 Detalhes do Chamado
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition relative ${
              activeTab === 'chat'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat com Usuário
              {messages.length > 0 && (
                <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {messages.length}
                </span>
              )}
            </span>
          </button>
          {/* Aba de Chat Interno - Apenas para Admins */}
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('internalChat')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition relative ${
                activeTab === 'internalChat'
                  ? 'border-b-2 border-emerald-500 text-emerald-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />
                Chat Interno
                {internalMessages.length > 0 && (
                  <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {internalMessages.length}
                  </span>
                )}
              </span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' ? (
            <div className="space-y-6">
              {/* Informações do Usuário */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Informações do Solicitante</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Nome:</span>
                    <span className="font-medium text-gray-900">{ticket.userName}</span>
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                      {ticket.setor}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-gray-900">{ticket.userEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-600">Sistema:</span>
                    <span className="font-medium text-gray-900">{ticket.sistema}</span>
                  </div>
                  
                  {/* Tipo de Solicitação - apenas se existir */}
                  {ticket.tipoSolicitacao && (
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="text-gray-600">Tipo de Solicitação:</span>
                      <span className="font-medium text-gray-900">{ticket.tipoSolicitacao}</span>
                    </div>
                  )}
                  
                  {/* CPF - apenas se existir */}
                  {ticket.cpf && (
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                      <span className="text-gray-600">CPF:</span>
                      <span className="font-medium text-gray-900">{ticket.cpf}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Data:</span>
                    <span className="font-medium text-gray-900">
                      {format(ticket.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Responsável (apenas para admins) */}
              {user?.role === 'admin' && admins.length > 0 && (
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <h3 className="text-sm font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                    <UserCog className="h-4 w-4" />
                    Atribuir Responsável
                  </h3>
                  <select
                    value={assignedTo}
                    onChange={(e) => handleUpdateAssignment(e.target.value)}
                    disabled={updatingAssignment}
                    className="w-full px-3 py-2 border border-indigo-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Nenhum responsável</option>
                    {admins.map((admin) => (
                      <option key={admin.uid} value={admin.uid}>
                        {admin.nome}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-indigo-600 mt-2">
                    {assignedTo ? `Atribuído a: ${admins.find(a => a.uid === assignedTo)?.nome}` : 'Nenhum administrador responsável por este chamado'}
                  </p>
                </div>
              )}

              {/* Setor (apenas para admins) */}
              {user?.role === 'admin' && (
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                  <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Setor do Chamado
                  </h3>
                  <select
                    value={setor}
                    onChange={(e) => handleUpdateSetor(e.target.value)}
                    disabled={updatingSetor}
                    className="w-full px-3 py-2 border border-emerald-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {setores.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-emerald-600 mt-2">
                    Setor atual: <span className="font-medium">{setor}</span>
                  </p>
                </div>
              )}

              {/* Prioridade (apenas para admins) */}
              {user?.role === 'admin' && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <h3 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Prioridade do Chamado
                  </h3>
                  <select
                    value={priority}
                    onChange={(e) => handleUpdatePriority(e.target.value as Priority)}
                    disabled={updatingPriority}
                    className="w-full px-3 py-2 border border-amber-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="urgente">🔴 Urgente (1 dia)</option>
                    <option value="alta">🟠 Alta (2 dias)</option>
                    <option value="media">🟡 Média (4 dias)</option>
                    <option value="baixa">🟢 Baixa (7 dias)</option>
                  </select>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${PRIORITY_CONFIG[priority].color}`}>
                      {PRIORITY_CONFIG[priority].label}
                    </span>
                    <span className="text-xs text-amber-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Prazo: {PRIORITY_CONFIG[priority].days} {PRIORITY_CONFIG[priority].days === 1 ? 'dia' : 'dias'}
                    </span>
                  </div>
                </div>
              )}

              {/* Visualização de Prioridade (para usuários) */}
              {user?.role !== 'admin' && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Prioridade
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${PRIORITY_CONFIG[priority].color}`}>
                      {PRIORITY_CONFIG[priority].label}
                    </span>
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Prazo: {PRIORITY_CONFIG[priority].days} {PRIORITY_CONFIG[priority].days === 1 ? 'dia' : 'dias'}
                    </span>
                  </div>
                </div>
              )}

              {/* Descrição */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Descrição do Problema</h3>
                <p className="text-gray-900 whitespace-pre-wrap bg-white border border-gray-200 rounded-lg p-4">
                  {ticket.descricao}
                </p>
              </div>

              {/* Imagens */}
              {((ticket.imageUrls && ticket.imageUrls.length > 0) || ticket.imageUrl || ticket.imageBase64) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    {ticket.imageUrls && ticket.imageUrls.length > 1 ? 'Imagens Anexadas' : 'Imagem Anexada'}
                  </h3>
                  
                  {ticket.imageUrls && ticket.imageUrls.length > 0 ? (
                    // Novo formato: múltiplas imagens
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ticket.imageUrls.map((url, idx) => (
                        <div 
                          key={idx}
                          className="relative w-full h-64 rounded-lg overflow-hidden border border-gray-200 group cursor-pointer"
                          onClick={() => setExpandedImage(url)}
                        >
                          <Image
                            src={url}
                            alt={`Anexo ${idx + 1} do chamado`}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-contain bg-gray-50"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3">
                              <Maximize2 className="h-6 w-6 text-gray-900" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Formato antigo: uma imagem
                    <div className="relative w-full h-96 rounded-lg overflow-hidden border border-gray-200 group cursor-pointer"
                         onClick={() => setExpandedImage((ticket.imageUrl || ticket.imageBase64) as string)}>
                      <Image
                        src={(ticket.imageUrl || ticket.imageBase64) as string}
                        alt="Anexo do chamado"
                        fill
                        sizes="(max-width: 768px) 100vw, 800px"
                        className="object-contain bg-gray-50"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3">
                          <Maximize2 className="h-6 w-6 text-gray-900" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* URL */}
              {ticket.url && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Link de Referência</h3>
                  <a
                    href={ticket.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 underline break-all"
                  >
                    {ticket.url}
                  </a>
                </div>
              )}

              {/* Documento */}
              {ticket.documentName && (ticket.documentUrl || ticket.documentBase64) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Documento Anexado</h3>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="p-3 bg-primary-100 rounded">
                      <svg className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{ticket.documentName}</p>
                      <p className="text-xs text-gray-500">Documento anexado ao chamado</p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={ticket.documentUrl || ticket.documentBase64}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors"
                      >
                        Ver PDF
                      </a>
                      <a
                        href={ticket.documentUrl || ticket.documentBase64}
                        download={ticket.documentName}
                        className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-md transition-colors"
                      >
                        Baixar
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'chat' ? (
            <div className="flex flex-col h-[500px]">
              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <MessageSquare className="h-16 w-16 mb-3" />
                    <p className="text-sm">Nenhuma mensagem ainda</p>
                    <p className="text-xs">Inicie a conversa com o usuário</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.senderRole === 'admin'
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold">
                              {msg.senderRole === 'admin' ? '👨‍💼 Admin' : '👤 Usuário'}
                            </span>
                            <span className="text-xs opacity-75">
                              {format(msg.createdAt, 'HH:mm', { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input de Mensagem */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Enviar
                </button>
              </form>
            </div>
          ) : (
            /* Chat Interno - Apenas para Admins */
            <div className="flex flex-col h-[500px]">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-emerald-700 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <strong>Chat Interno:</strong> Visível apenas para administradores. Use para discussões privadas sobre o chamado.
                </p>
              </div>

              {/* Mensagens Internas */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                {internalMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-emerald-400">
                    <Users className="h-16 w-16 mb-3" />
                    <p className="text-sm">Nenhuma mensagem interna ainda</p>
                    <p className="text-xs">Inicie uma discussão privada entre admins</p>
                  </div>
                ) : (
                  <>
                    {internalMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="flex justify-start"
                      >
                        <div className="max-w-[70%] rounded-lg p-3 bg-emerald-100 text-emerald-900 border border-emerald-200">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold">
                              🛡️ {msg.senderName}
                            </span>
                            <span className="text-xs opacity-75">
                              {format(msg.createdAt, 'HH:mm', { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={internalMessagesEndRef} />
                  </>
                )}
              </div>

              {/* Input de Mensagem Interna */}
              <form onSubmit={handleSendInternalMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newInternalMessage}
                  onChange={(e) => setNewInternalMessage(e.target.value)}
                  placeholder="Mensagem interna (apenas admins)..."
                  className="flex-1 px-4 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50"
                  disabled={sendingInternal}
                />
                <button
                  type="submit"
                  disabled={sendingInternal || !newInternalMessage.trim()}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Enviar
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 p-6 border-t border-gray-200">
          <div className="flex gap-3">
            {/* Botão de Arquivar - mostrado apenas para admin */}
            {user?.role === 'admin' && !ticket.archived && (
              <button
                onClick={() => setShowArchiveDialog(true)}
                disabled={archiving}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Archive className="h-4 w-4" />
                Arquivar Chamado
              </button>
            )}
            {/* Botão de Excluir - mostrado apenas para admin ou dono do chamado */}
            {(user?.role === 'admin' || user?.uid === ticket.userId) && (
              <button
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleting}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Excluir Chamado
              </button>
            )}
          </div>
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Imagem Ampliada */}
      {expandedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-[99999] flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setExpandedImage(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpandedImage(null);
            }}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition z-10 bg-black bg-opacity-50 rounded-full p-2"
            aria-label="Fechar imagem"
          >
            <X className="h-8 w-8" />
          </button>
          <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
            <Image
              src={expandedImage}
              alt="Imagem ampliada"
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
        </div>
      )}

      {/* Diálogo de Confirmação de Arquivamento */}
      <ConfirmDialog
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        onConfirm={handleArchiveTicket}
        title="Confirmar Arquivamento"
        message={`Tem certeza que deseja arquivar o chamado ${ticket.ticketId}? Chamados arquivados podem ser desarquivados posteriormente.`}
        confirmText="Sim, arquivar"
        cancelText="Cancelar"
        variant="warning"
      />

      {/* Diálogo de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteTicket}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o chamado ${ticket.ticketId}? Esta ação não pode ser desfeita e todas as mensagens do chat também serão excluídas.`}
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}
