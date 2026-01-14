import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Gera um ID único para o chamado no formato CHM-YYYY-XXXX
 * Ex: CHM-2026-0001, CHM-2026-0002, etc.
 */
export async function generateTicketId(): Promise<string> {
  const year = new Date().getFullYear();
  
  try {
    // Busca o último chamado criado para obter o próximo número
    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef,
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    let nextNumber = 1;
    
    if (!snapshot.empty) {
      const lastTicket = snapshot.docs[0].data();
      const lastTicketId = lastTicket.ticketId as string;
      
      // Extrai o número do último ticket (CHM-2026-0001 -> 0001)
      const lastNumber = parseInt(lastTicketId.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    
    // Formata o número com zeros à esquerda (0001, 0002, etc.)
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    
    return `CHM-${year}-${formattedNumber}`;
  } catch (error) {
    console.error('Erro ao gerar ID do ticket:', error);
    // Fallback: usa timestamp
    const timestamp = Date.now().toString().slice(-4);
    return `CHM-${year}-${timestamp}`;
  }
}
