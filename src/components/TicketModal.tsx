'use client';

import { useState, useEffect, useRef } from 'react';
import { Ticket, ChatMessage } from '@/types';
import { X, Bug, Sparkles, User as UserIcon, Briefcase, Calendar, Mail, Send, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TicketModalProps {
  ticket: Ticket;
  onClose: () => void;
}

const statusLabels = {
  'aberto': { label: 'Aberto', color: 'bg-blue-100 text-blue-800' },
  'em-andamento': { label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-800' },
  'resolvido': { label: 'Resolvido', color: 'bg-green-100 text-green-800' },
  'fechado': { label: 'Fechado', color: 'bg-gray-100 text-gray-800' },
};

export default function TicketModal({ ticket, onClose }: TicketModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details');

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

  useEffect(() => {
    // Scroll automático para última mensagem
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-3">
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
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-gray-900">{ticket.userEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Setor:</span>
                    <span className="font-medium text-gray-900">{ticket.setor}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-600">Sistema:</span>
                    <span className="font-medium text-gray-900">{ticket.sistema}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Data:</span>
                    <span className="font-medium text-gray-900">
                      {format(ticket.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Descrição do Problema</h3>
                <p className="text-gray-900 whitespace-pre-wrap bg-white border border-gray-200 rounded-lg p-4">
                  {ticket.descricao}
                </p>
              </div>

              {/* Imagem */}
              {ticket.imageBase64 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Imagem Anexada</h3>
                  <div className="relative w-full h-96 rounded-lg overflow-hidden border border-gray-200">
                    <Image
                      src={ticket.imageBase64}
                      alt="Anexo do chamado"
                      fill
                      sizes="(max-width: 768px) 100vw, 800px"
                      className="object-contain bg-gray-50"
                    />
                  </div>
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
              {ticket.documentBase64 && ticket.documentName && (
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
                    <a
                      href={ticket.documentBase64}
                      download={ticket.documentName}
                      className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-md transition-colors"
                    >
                      Baixar
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
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
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
