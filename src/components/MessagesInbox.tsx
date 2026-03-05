'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mail, MessageSquare } from 'lucide-react';
import { AdminMessage, Conversation } from '@/types';
import { getAdminMessages, groupMessagesIntoConversations } from '@/lib/notifications';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ConversationView from './ConversationView';

interface MessagesInboxProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  openConversationWith?: { userId: string; userName: string };
}

export default function MessagesInbox({ 
  isOpen, 
  onClose, 
  userId, 
  userName,
  openConversationWith 
}: MessagesInboxProps) {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Gera o conversationId da mesma forma que o serviço
  const generateConversationId = (userId1: string, userId2: string): string => {
    return [userId1, userId2].sort().join('_');
  };

  // Função para carregar mensagens (useCallback para estabilidade)
  const loadMessages = useCallback(async () => {
    if (!userId) return;
    
    try {
      const msgs = await getAdminMessages(userId);
      setMessages(msgs);
      const convs = groupMessagesIntoConversations(msgs, userId);
      setConversations(convs);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // Limpa o intervalo anterior
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    if (!isOpen || !userId) {
      setLoading(false);
      return;
    }

    // Carrega mensagens imediatamente
    loadMessages();

    // Atualiza a cada 3 segundos enquanto o inbox está aberto
    refreshIntervalRef.current = setInterval(() => {
      loadMessages();
    }, 3000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isOpen, userId, loadMessages]);

  // Abre automaticamente a conversa especificada
  useEffect(() => {
    if (openConversationWith && conversations.length > 0 && !selectedConversation) {
      const targetConversationId = generateConversationId(userId, openConversationWith.userId);
      const conversation = conversations.find(c => c.id === targetConversationId);
      
      if (conversation) {
        setSelectedConversation(conversation);
      } else {
        // Se a conversa não existir ainda, cria uma conversa "vazia"
        const newConversation: Conversation = {
          id: targetConversationId,
          participantIds: [userId, openConversationWith.userId],
          participantNames: [openConversationWith.userName],
          lastMessage: '',
          lastMessageDate: new Date(),
          unreadCount: 0,
          subject: 'Nova conversa',
        };
        setSelectedConversation(newConversation);
      }
    }
  }, [openConversationWith, conversations, selectedConversation, userId]);

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  const handleClose = () => {
    setSelectedConversation(null);
    onClose();
  };

  const totalUnreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Conversas</h2>
              {totalUnreadCount > 0 && (
                <p className="text-sm text-gray-600">
                  {totalUnreadCount} {totalUnreadCount === 1 ? 'mensagem não lida' : 'mensagens não lidas'}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1" style={{ minHeight: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Carregando conversas...
            </div>
          ) : selectedConversation ? (
            // Visualização de Conversa
            <ConversationView
              conversation={selectedConversation}
              currentUserId={userId}
              currentUserName={userName}
              onBack={handleBack}
            />
          ) : conversations.length === 0 ? (
            // Sem Conversas
            <div className="p-8 text-center text-gray-500">
              <Mail className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="text-lg">Nenhuma conversa</p>
              <p className="text-sm mt-1">Você ainda não tem conversas com outros administradores</p>
            </div>
          ) : (
            // Lista de Conversas
            <div className="divide-y divide-gray-200 overflow-y-auto h-full">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    conversation.unreadCount > 0 ? 'bg-purple-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        conversation.unreadCount > 0 ? 'bg-purple-200' : 'bg-gray-200'
                      }`}>
                        <span className={`font-semibold ${
                          conversation.unreadCount > 0 ? 'text-purple-700' : 'text-gray-600'
                        }`}>
                          {conversation.participantNames[0].charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-base font-semibold ${
                            conversation.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {conversation.participantNames[0]}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {format(conversation.lastMessageDate, 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                      
                      <p className={`text-sm mb-1 ${
                        conversation.unreadCount > 0 ? 'font-medium text-gray-900' : 'text-gray-700'
                      }`}>
                        {conversation.subject}
                      </p>
                      
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {conversation.lastMessage}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
