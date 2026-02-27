import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

/**
 * Faz upload de uma imagem para o Firebase Storage
 * @param file - Arquivo de imagem
 * @param ticketId - ID do chamado (usado para criar caminho único)
 * @returns URL da imagem armazenada
 */
export async function uploadTicketImage(file: File, ticketId: string): Promise<string> {
  // Cria uma referência única para o arquivo
  const timestamp = Date.now();
  const fileName = `${ticketId}_${timestamp}_${file.name}`;
  const storageRef = ref(storage, `tickets/images/${fileName}`);
  
  // Faz upload do arquivo
  await uploadBytes(storageRef, file);
  
  // Obtém e retorna a URL de download
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

/**
 * Faz upload de um documento para o Firebase Storage
 * @param file - Arquivo de documento
 * @param ticketId - ID do chamado (usado para criar caminho único)
 * @returns URL do documento armazenado
 */
export async function uploadTicketDocument(file: File, ticketId: string): Promise<string> {
  // Cria uma referência única para o arquivo
  const timestamp = Date.now();
  const fileName = `${ticketId}_${timestamp}_${file.name}`;
  const storageRef = ref(storage, `tickets/documents/${fileName}`);
  
  // Faz upload do arquivo
  await uploadBytes(storageRef, file);
  
  // Obtém e retorna a URL de download
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}
