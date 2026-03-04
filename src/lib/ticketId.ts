import { collection, query, orderBy, limit, getDocs, doc, runTransaction, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Gera um ID único para o chamado no formato CHM-YYYY-XXXX
 * Ex: CHM-2026-0001, CHM-2026-0002, etc.
 * Usa transações do Firestore para garantir IDs únicos mesmo em criações simultâneas
 */
export async function generateTicketId(): Promise<string> {
  const year = new Date().getFullYear();
  const counterDocId = `ticket-counter-${year}`;
  
  try {
    // Usa transação para garantir atomicidade
    const ticketId = await runTransaction(db, async (transaction) => {
      const counterRef = doc(db, 'counters', counterDocId);
      const counterDoc = await transaction.get(counterRef);
      
      let nextNumber = 1;
      
      if (counterDoc.exists()) {
        // Incrementa o contador existente
        const currentCount = counterDoc.data().count || 0;
        nextNumber = currentCount + 1;
        transaction.update(counterRef, { 
          count: nextNumber,
          lastUpdated: new Date()
        });
      } else {
        // Cria o contador para o ano atual
        // Mas primeiro verifica se já existem tickets deste ano
        const ticketsRef = collection(db, 'tickets');
        const q = query(
          ticketsRef,
          orderBy('createdAt', 'desc'),
          limit(100) // Busca os últimos 100 para garantir que pegamos do ano correto
        );
        
        const snapshot = await getDocs(q);
        
        // Procura o último ticket do ano atual
        for (const doc of snapshot.docs) {
          const ticketData = doc.data();
          const ticketId = ticketData.ticketId as string;
          if (ticketId && ticketId.startsWith(`CHM-${year}-`)) {
            const lastNumber = parseInt(ticketId.split('-')[2]);
            if (!isNaN(lastNumber)) {
              nextNumber = lastNumber + 1;
              break;
            }
          }
        }
        
        transaction.set(counterRef, { 
          count: nextNumber,
          year: year,
          createdAt: new Date(),
          lastUpdated: new Date()
        });
      }
      
      // Formata o número com zeros à esquerda (0001, 0002, etc.)
      const formattedNumber = nextNumber.toString().padStart(4, '0');
      return `CHM-${year}-${formattedNumber}`;
    });
    
    return ticketId;
  } catch (error) {
    console.error('Erro ao gerar ID do ticket:', error);
    
    // Fallback mais robusto: usa timestamp + random para evitar colisões
    const timestamp = Date.now().toString().slice(-3);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const fallbackNumber = `${timestamp}${random}`.slice(0, 4);
    
    return `CHM-${year}-${fallbackNumber}`;
  }
}