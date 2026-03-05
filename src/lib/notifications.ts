import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc,
  writeBatch,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { Notification, NotificationType, AdminMessage, Conversation } from '@/types';

/**
 * Gera um ID único para uma conversa entre dois usuários
 */
function generateConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

/**
 * Cria uma nova notificação
 */
export async function createNotification(
  type: NotificationType,
  title: string,
  message: string,
  recipientId: string,
  options?: {
    senderId?: string;
    senderName?: string;
    ticketId?: string;
    ticketNumber?: string;
  }
): Promise<string> {
  try {
    const notificationData = {
      type,
      title,
      message,
      recipientId,
      senderId: options?.senderId || null,
      senderName: options?.senderName || null,
      ticketId: options?.ticketId || null,
      ticketNumber: options?.ticketNumber || null,
      read: false,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    throw error;
  }
}

/**
 * Marca uma notificação como lida
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
    });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    throw error;
  }
}

/**
 * Marca todas as notificações de um usuário como lidas
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    // Validação: retorna se userId for inválido
    if (!userId || userId.trim() === '') {
      console.warn('markAllNotificationsAsRead: userId inválido');
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach((document) => {
      batch.update(document.ref, { read: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Erro ao marcar todas notificações como lidas:', error);
    throw error;
  }
}

/**
 * Busca notificações de um usuário - SEM listener em tempo real
 */
export async function getNotifications(
  userId: string
): Promise<Notification[]> {
  // Validação: retorna array vazio se userId for inválido
  if (!userId || userId.trim() === '') {
    console.warn('getNotifications: userId inválido');
    return [];
  }

  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Notification;
    });
    
    return notifications;
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return [];
  }
}

/**
 * Envia uma mensagem direta entre administradores
 */
export async function sendAdminMessage(
  senderId: string,
  senderName: string,
  recipientId: string,
  recipientName: string,
  subject: string,
  message: string
): Promise<string> {
  try {
    const conversationId = generateConversationId(senderId, recipientId);
    
    // Cria a mensagem
    const messageData = {
      conversationId,
      senderId,
      senderName,
      recipientId,
      recipientName,
      subject,
      message,
      read: false,
      createdAt: Timestamp.now(),
      readAt: null,
    };

    const docRef = await addDoc(collection(db, 'adminMessages'), messageData);

    // Cria uma notificação para o destinatário
    await createNotification(
      'admin_message',
      `Nova mensagem de ${senderName}`,
      subject,
      recipientId,
      { senderId, senderName }
    );

    return docRef.id;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
}

/**
 * Marca uma mensagem de admin como lida
 */
export async function markAdminMessageAsRead(messageId: string): Promise<void> {
  try {
    const messageRef = doc(db, 'adminMessages', messageId);
    await updateDoc(messageRef, {
      read: true,
      readAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Erro ao marcar mensagem como lida:', error);
    throw error;
  }
}

/**
 * Busca mensagens de admin (recebidas E enviadas) - SEM listener em tempo real
 * Usa duas queries separadas para evitar conflitos do Firestore
 */
export async function getAdminMessages(
  userId: string
): Promise<AdminMessage[]> {
  // Validação: retorna array vazio se userId for inválido
  if (!userId || userId.trim() === '') {
    console.warn('getAdminMessages: userId inválido');
    return [];
  }

  try {
    // Query 1: Mensagens recebidas
    const receivedQuery = query(
      collection(db, 'adminMessages'),
      where('recipientId', '==', userId)
    );

    // Query 2: Mensagens enviadas
    const sentQuery = query(
      collection(db, 'adminMessages'),
      where('senderId', '==', userId)
    );

    // Executa ambas as queries em paralelo
    const [receivedSnapshot, sentSnapshot] = await Promise.all([
      getDocs(receivedQuery),
      getDocs(sentQuery)
    ]);

    // Combina os resultados
    const receivedMessages = receivedSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        readAt: data.readAt?.toDate() || undefined,
      } as AdminMessage;
    });

    const sentMessages = sentSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        readAt: data.readAt?.toDate() || undefined,
      } as AdminMessage;
    });

    // Combina e remove duplicatas (se houver)
    const allMessages = [...receivedMessages, ...sentMessages];
    const uniqueMessages = Array.from(
      new Map(allMessages.map(msg => [msg.id, msg])).values()
    );

    // Ordena por data (mais recente primeiro)
    uniqueMessages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return uniqueMessages;
  } catch (error) {
    console.error('Erro ao buscar mensagens de admin:', error);
    return [];
  }
}

/**
 * Busca todas as mensagens de uma conversa específica - SEM listener em tempo real
 */
export async function getConversationMessages(
  conversationId: string
): Promise<AdminMessage[]> {
  // Validação: retorna array vazio se conversationId for inválido
  if (!conversationId || conversationId.trim() === '') {
    console.warn('getConversationMessages: conversationId inválido');
    return [];
  }

  try {
    const q = query(
      collection(db, 'adminMessages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);
    
    const messages = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        readAt: data.readAt?.toDate() || undefined,
      } as AdminMessage;
    });
    
    return messages;
  } catch (error) {
    console.error('Erro ao buscar mensagens da conversa:', error);
    return [];
  }
}

/**
 * Agrupa mensagens em conversas
 */
export function groupMessagesIntoConversations(
  messages: AdminMessage[],
  currentUserId: string
): Conversation[] {
  const conversationsMap = new Map<string, Conversation>();

  messages.forEach((message) => {
    const { conversationId } = message;
    
    if (!conversationsMap.has(conversationId)) {
      // Determina o outro participante
      const otherUserId = message.senderId === currentUserId ? message.recipientId : message.senderId;
      const otherUserName = message.senderId === currentUserId ? message.recipientName : message.senderName;
      
      conversationsMap.set(conversationId, {
        id: conversationId,
        participantIds: [otherUserId, currentUserId], // Outro usuário primeiro
        participantNames: [otherUserName], // Nome do outro usuário
        lastMessage: message.message,
        lastMessageDate: message.createdAt,
        unreadCount: message.recipientId === currentUserId && !message.read ? 1 : 0,
        subject: message.subject,
      });
    } else {
      const conversation = conversationsMap.get(conversationId)!;
      
      // Atualiza última mensagem se for mais recente
      if (message.createdAt > conversation.lastMessageDate) {
        conversation.lastMessage = message.message;
        conversation.lastMessageDate = message.createdAt;
      }
      
      // Conta mensagens não lidas
      if (message.recipientId === currentUserId && !message.read) {
        conversation.unreadCount++;
      }
    }
  });

  return Array.from(conversationsMap.values()).sort(
    (a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime()
  );
}

/**
 * Marca todas as mensagens de uma conversa como lidas
 */
export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  try {
    // Validação: retorna se parâmetros forem inválidos
    if (!conversationId || conversationId.trim() === '' || !userId || userId.trim() === '') {
      console.warn('markConversationAsRead: parâmetros inválidos');
      return;
    }

    const q = query(
      collection(db, 'adminMessages'),
      where('conversationId', '==', conversationId),
      where('recipientId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        read: true,
        readAt: Timestamp.now(),
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Erro ao marcar conversa como lida:', error);
    throw error;
  }
}

/**
 * Notificações automáticas para eventos de chamados
 */

// Quando um chamado é atribuído a um admin
export async function notifyTicketAssigned(
  ticketId: string,
  ticketNumber: string,
  ticketTitle: string,
  adminId: string,
  assignedBy: string,
  assignedByName: string
): Promise<void> {
  await createNotification(
    'ticket_assigned',
    'Chamado Atribuído',
    `O chamado "${ticketTitle}" foi atribuído a você`,
    adminId,
    {
      senderId: assignedBy,
      senderName: assignedByName,
      ticketId,
      ticketNumber,
    }
  );
}

// Quando o status de um chamado muda
export async function notifyTicketStatusChanged(
  ticketId: string,
  ticketNumber: string,
  ticketTitle: string,
  newStatus: string,
  userId: string,
  changedBy: string,
  changedByName: string
): Promise<void> {
  const statusLabels: Record<string, string> = {
    'aberto': 'Aberto',
    'em-andamento': 'Em Andamento',
    'resolvido': 'Resolvido',
    'fechado': 'Fechado',
  };

  await createNotification(
    'ticket_status_changed',
    'Status do Chamado Alterado',
    `O chamado "${ticketTitle}" mudou para ${statusLabels[newStatus] || newStatus}`,
    userId,
    {
      senderId: changedBy,
      senderName: changedByName,
      ticketId,
      ticketNumber,
    }
  );
}

// Quando a prioridade de um chamado muda
export async function notifyTicketPriorityChanged(
  ticketId: string,
  ticketNumber: string,
  ticketTitle: string,
  newPriority: string,
  userId: string,
  changedBy: string,
  changedByName: string
): Promise<void> {
  const priorityLabels: Record<string, string> = {
    'urgente': 'Urgente',
    'alta': 'Alta',
    'media': 'Média',
    'baixa': 'Baixa',
  };

  await createNotification(
    'ticket_priority_changed',
    'Prioridade do Chamado Alterada',
    `O chamado "${ticketTitle}" agora tem prioridade ${priorityLabels[newPriority] || newPriority}`,
    userId,
    {
      senderId: changedBy,
      senderName: changedByName,
      ticketId,
      ticketNumber,
    }
  );
}

// Quando há uma nova mensagem em um chamado
export async function notifyNewTicketMessage(
  ticketId: string,
  ticketNumber: string,
  ticketTitle: string,
  recipientId: string,
  senderId: string,
  senderName: string,
  messagePreview: string
): Promise<void> {
  await createNotification(
    'ticket_message',
    'Nova Mensagem no Chamado',
    `${senderName} comentou em "${ticketTitle}": ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`,
    recipientId,
    {
      senderId,
      senderName,
      ticketId,
      ticketNumber,
    }
  );
}
