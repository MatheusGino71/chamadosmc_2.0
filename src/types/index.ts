export interface User {
  uid: string;
  email: string;
  nome: string;
  setor: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

export interface Ticket {
  id: string;
  ticketId: string; // ID único formatado (CHM-2026-0001)
  titulo: string;
  descricao: string;
  tipo: 'bug' | 'melhoria';
  status: 'aberto' | 'em-andamento' | 'resolvido' | 'fechado';
  setor: string;
  sistema: string;
  imageBase64?: string;
  url?: string;
  documentBase64?: string;
  documentName?: string;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
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
}
