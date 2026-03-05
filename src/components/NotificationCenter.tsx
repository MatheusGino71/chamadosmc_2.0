'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Check, CheckCheck, MessageSquare, AlertCircle, TrendingUp, User } from 'lucide-react';
import { Notification } from '@/types';
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '@/lib/notifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

interface NotificationCenterProps {
  userId: string;
  onOpenConversation?: (senderId: string, senderName: string) => void;
}

// Ícone e cor por tipo de notificação
const notificationStyles = {
  ticket_assigned: { 
    icon: User, 
    color: 'text-blue-600 bg-blue-50',
    borderColor: 'border-blue-200'
  },
  ticket_updated: { 
    icon: AlertCircle, 
    color: 'text-yellow-600 bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  ticket_message: { 
    icon: MessageSquare, 
    color: 'text-green-600 bg-green-50',
    borderColor: 'border-green-200'
  },
  admin_message: { 
    icon: MessageSquare, 
    color: 'text-purple-600 bg-purple-50',
    borderColor: 'border-purple-200'
  },
  ticket_status_changed: { 
    icon: TrendingUp, 
    color: 'text-indigo-600 bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  ticket_priority_changed: { 
    icon: AlertCircle, 
    color: 'text-orange-600 bg-orange-50',
    borderColor: 'border-orange-200'
  },
};

export default function NotificationCenter({ userId, onOpenConversation }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Quantidade de notificações não lidas
  const unreadCount = notifications.filter(n => !n.read).length;

  // Função para carregar notificações (useCallback para estabilidade)
  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    
    try {
      const notifs = await getNotifications(userId);
      setNotifications(notifs);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // Limpa o intervalo anterior
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    if (!userId) {
      setLoading(false);
      return;
    }

    // Carrega notificações imediatamente
    loadNotifications();

    // Atualiza a cada 5 segundos
    refreshIntervalRef.current = setInterval(() => {
      loadNotifications();
    }, 5000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [userId, loadNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    // Marca como lida
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }

    // Navega para o destino apropriado
    if (notification.type === 'admin_message' && notification.senderId && notification.senderName && onOpenConversation) {
      // Abre a conversa com o remetente
      setIsOpen(false);
      onOpenConversation(notification.senderId, notification.senderName);
    } else if (notification.ticketId) {
      // Se for relacionado a um chamado, fecha o modal
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(userId);
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  return (
    <>
      {/* Botão de Notificações */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="Notificações"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Modal de Notificações em Tela Cheia */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Bell className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Notificações</h3>
                  {unreadCount > 0 && (
                    <p className="text-sm text-gray-600">
                      {unreadCount} {unreadCount === 1 ? 'notificação não lida' : 'notificações não lidas'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2 transition-colors"
                    title="Marcar todas como lidas"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Marcar todas como lidas
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Lista de Notificações */}
            <div className="overflow-y-auto flex-1 p-6">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  Carregando notificações...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Nenhuma notificação</p>
                  <p className="text-sm mt-1">Você está em dia com tudo!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => {
                    const style = notificationStyles[notification.type];
                    const Icon = style.icon;

                    return (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 rounded-lg border-2 hover:shadow-md cursor-pointer transition-all ${
                          !notification.read 
                            ? 'bg-blue-50/50 border-blue-200 hover:border-blue-300' 
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex gap-4">
                          {/* Ícone */}
                          <div className={`flex-shrink-0 w-12 h-12 rounded-full ${style.color} flex items-center justify-center`}>
                            <Icon className="w-6 h-6" />
                          </div>

                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <p className={`text-base font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                  {notification.title}
                                </p>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                                )}
                              </div>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {formatDistanceToNow(notification.createdAt, { 
                                  locale: ptBR, 
                                  addSuffix: true 
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                              {notification.message}
                            </p>
                            {notification.ticketNumber && (
                              <div className="mt-3">
                                <span className="text-xs font-mono bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                                  {notification.ticketNumber}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
