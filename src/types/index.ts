export interface User {
  uid: string;
  email: string;
  nome: string;
  setor: string;
  cpf?: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

export type Priority = 'urgente' | 'alta' | 'media' | 'baixa';

export const PRIORITY_CONFIG = {
  urgente: { label: 'Urgente', days: 1, color: 'bg-red-100 text-red-700', borderColor: 'border-red-500' },
  alta: { label: 'Alta', days: 2, color: 'bg-orange-100 text-orange-700', borderColor: 'border-orange-500' },
  media: { label: 'Média', days: 4, color: 'bg-yellow-100 text-yellow-700', borderColor: 'border-yellow-500' },
  baixa: { label: 'Baixa', days: 7, color: 'bg-green-100 text-green-700', borderColor: 'border-green-500' },
} as const;

export interface Ticket {
  id: string;
  ticketId: string; // ID único formatado (CHM-2026-0001)
  titulo: string;
  descricao: string;
  tipo: 'bug' | 'melhoria' | 'infra';
  priority: Priority; // Prioridade do chamado (apenas admin pode alterar)
  status: 'aberto' | 'em-andamento' | 'resolvido' | 'fechado';
  setor: string;
  sistema: string;
  tipoSolicitacao?: string; // 'Solicitar uma Base' ou 'Criação de conta' ou subtipos de INFRA
  subtipoInfra?: string; // 'Solicitar aparelho/máquina' ou 'Suporte'
  cpf?: string; // CPF para criação de conta
  imageBase64?: string; // Deprecated: usado em chamados antigos
  imageUrl?: string; // Deprecated: URL da imagem única (mantido para compatibilidade)
  imageUrls?: string[]; // URLs de até 3 imagens no Firebase Storage
  url?: string;
  documentBase64?: string; // Deprecated: usado em chamados antigos
  documentUrl?: string; // URL do documento no Firebase Storage
  documentName?: string;
  userId: string;
  userName: string;
  userEmail: string;
  assignedTo?: string; // UID do admin responsável
  assignedToName?: string; // Nome do admin responsável
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  archived?: boolean; // Indica se o chamado está arquivado
  archivedAt?: Date; // Data em que foi arquivado
}

export interface ChatMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'admin';
  message: string;
  createdAt: Date;
}

export interface CreateTicketData {
  titulo: string;
  descricao: string;
  setor: string;
  imageFile?: File;
}

export interface RegisterData {
  email: string;
  password: string;
  nome: string;
  setor: string;
  cpf?: string;
}

export type NotificationType = 
  | 'ticket_assigned'       // Chamado atribuído a um admin
  | 'ticket_updated'        // Chamado atualizado
  | 'ticket_message'        // Nova mensagem em um chamado
  | 'admin_message'         // Mensagem direta de outro admin
  | 'ticket_status_changed' // Status do chamado alterado
  | 'ticket_priority_changed'; // Prioridade do chamado alterada

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  recipientId: string;       // UID do destinatário
  senderId?: string;         // UID do remetente (opcional)
  senderName?: string;       // Nome do remetente
  ticketId?: string;         // ID do chamado relacionado (se aplicável)
  ticketNumber?: string;     // Número formatado do chamado (ex: CHM-2026-0001)
  read: boolean;             // Se a notificação foi lida
  createdAt: Date;
}

export interface AdminMessage {
  id: string;
  conversationId: string;    // ID único da conversa (combinação dos IDs ordenados)
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: Date;
  readAt?: Date;
}

export interface Conversation {
  id: string;                // conversationId
  participantIds: string[];  // IDs dos participantes
  participantNames: string[]; // Nomes dos participantes
  lastMessage: string;       // Última mensagem da conversa
  lastMessageDate: Date;     // Data da última mensagem
  unreadCount: number;       // Mensagens não lidas
  subject: string;           // Assunto da conversa
}
