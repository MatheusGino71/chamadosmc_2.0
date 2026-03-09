import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Arquiva automaticamente chamados fechados há mais de 7 dias
 * Esta função deve ser chamada periodicamente (ex: ao carregar o painel admin)
 */
export async function autoArchiveOldTickets(): Promise<number> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Busca chamados fechados e não arquivados
    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef,
      where('status', '==', 'fechado'),
      where('archived', '!=', true) // Firestore permite != true para pegar null/undefined/false
    );

    const snapshot = await getDocs(q);
    let archivedCount = 0;

    const archivePromises = snapshot.docs
      .filter((docSnapshot) => {
        const data = docSnapshot.data();
        const closedAt = data.closedAt?.toDate();
        
        // Verifica se tem closedAt e se foi fechado há mais de 7 dias
        if (closedAt && closedAt <= sevenDaysAgo) {
          return true;
        }
        return false;
      })
      .map(async (docSnapshot) => {
        const ticketRef = doc(db, 'tickets', docSnapshot.id);
        await updateDoc(ticketRef, {
          archived: true,
          archivedAt: new Date(),
        });
        archivedCount++;
      });

    await Promise.all(archivePromises);

    if (archivedCount > 0) {
      console.log(`${archivedCount} chamado(s) arquivado(s) automaticamente`);
    }

    return archivedCount;
  } catch (error) {
    console.error('Erro ao arquivar chamados automaticamente:', error);
    return 0;
  }
}

/**
 * Arquiva um chamado manualmente
 */
export async function archiveTicket(ticketId: string): Promise<void> {
  try {
    const ticketRef = doc(db, 'tickets', ticketId);
    await updateDoc(ticketRef, {
      archived: true,
      archivedAt: new Date(),
    });
  } catch (error) {
    console.error('Erro ao arquivar chamado:', error);
    throw error;
  }
}

/**
 * Desarquiva um chamado
 */
export async function unarchiveTicket(ticketId: string): Promise<void> {
  try {
    const ticketRef = doc(db, 'tickets', ticketId);
    await updateDoc(ticketRef, {
      archived: false,
      archivedAt: null,
    });
  } catch (error) {
    console.error('Erro ao desarquivar chamado:', error);
    throw error;
  }
}
