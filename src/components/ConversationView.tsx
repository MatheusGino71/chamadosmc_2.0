'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Send, User, MessageSquare } from 'lucide-react';
import { AdminMessage, Conversation } from '@/types';
import { getConversationMessages, sendAdminMessage, markConversationAsRead } from '@/lib/notifications';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversationViewProps {
  conversation: Conversation;
  currentUserId: string;
  currentUserName: string;
  onBack: () => void;
}

export default function ConversationView({ 
  conversation, 
  currentUserId, 
  currentUserName,
  onBack 
}: ConversationViewProps) {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Determina o outro participante (sempre na posição 0 da lista)
  const otherUserId = conversation.participantIds[0] || '';
  const otherUserName = conversation.participantNames[0] || 'Usuário';

  // Função para carregar mensagens (useCallback para estabilidade)
  const loadMessages = useCallback(async () => {
    try {
      console.log('🔍 Carregando mensagens para conversationId:', conversation.id);
      const msgs = await getConversationMessages(conversation.id);
      console.log('✅ Mensagens carregadas:', msgs.length, msgs);
      setMessages(msgs);
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens:', error);
    }
  }, [conversation.id]);

  useEffect(() => {
    // Limpa o intervalo anterior
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    // Carrega mensagens imediatamente
    loadMessages();

    // Marca todas as mensagens como lidas
    markConversationAsRead(conversation.id, currentUserId);

    // Atualiza a cada 2 segundos
    refreshIntervalRef.current = setInterval(() => {
      loadMessages();
    }, 2000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [conversation.id, currentUserId, loadMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      
      // Encontra a primeira mensagem para usar o mesmo assunto
      const firstMessage = messages[0];
      const subject = firstMessage ? `Re: ${firstMessage.subject}` : conversation.subject;

      await sendAdminMessage(
        currentUserId,
        currentUserName,
        otherUserId,
        otherUserName,
        subject,
        newMessage.trim()
      );

      setNewMessage('');
      
      // Recarrega as mensagens imediatamente após enviar
      await loadMessages();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">Voltar</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{otherUserName}</h3>
            <p className="text-sm text-gray-600">{conversation.subject}</p>
          </div>
          <div className="text-sm text-gray-500 px-3 py-1 bg-gray-100 rounded-full">
            {messages.length} {messages.length === 1 ? 'mensagem' : 'mensagens'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 scroll-smooth" 
        style={{ 
          flex: '1 1 auto', 
          overflowY: 'auto', 
          minHeight: '200px',
          maxHeight: 'calc(100vh - 400px)'
        }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma mensagem ainda</p>
              <p className="text-sm">Envie a primeira mensagem para iniciar a conversa</p>
            </div>
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-500 mb-2">Mostrando {messages.length} mensagens</div>
            {messages.map((message) => {
            const isCurrentUser = message.senderId === currentUserId;
            
            return (
              <div
                key={message.id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {/* Nome do remetente */}
                  <span className="text-xs text-gray-500 px-2">
                    {isCurrentUser ? 'Você' : message.senderName}
                  </span>
                  
                  {/* Mensagem */}
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      isCurrentUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.message}</p>
                  </div>
                  
                  {/* Timestamp */}
                  <span className="text-xs text-gray-400 px-2">
                    {format(message.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
            );
          })}
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0" style={{ flexShrink: 0, marginTop: 'auto' }}>
        <div className="flex gap-3 items-start">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Digite sua mensagem..."
            rows={2}
            maxLength={1000}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium whitespace-nowrap h-[52px]"
          >
            <Send className="w-5 h-5" />
            <span>Enviar</span>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {newMessage.length}/1000 • Pressione Enter para enviar, Shift+Enter para quebra de linha
        </p>
      </div>
    </div>
  );
}