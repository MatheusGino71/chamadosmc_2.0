import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { FormConfig, FormField, TipoChamado } from '@/types';

const FORM_CONFIGS_COLLECTION = 'formConfigs';

/**
 * Gera o ID do documento FormConfig para um setor
 * Formato: setor_[nomedosetor] (ex: setor_pedagogico)
 */
export function getFormConfigDocId(setor: string): string {
  return `setor_${setor.toLowerCase().replace(/\s+/g, '_')}`;
}

/**
 * Busca a configuração de formulário de um setor
 */
export async function getFormConfig(setor: string): Promise<FormConfig | null> {
  try {
    const docId = getFormConfigDocId(setor);
    const docRef = doc(db, FORM_CONFIGS_COLLECTION, docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      } as FormConfig;
    }
    return null;
  } catch (error) {
    console.error(`Erro ao buscar FormConfig para setor "${setor}":`, error);
    return null;
  }
}

/**
 * Salva/atualiza a configuração de formulário de um setor
 */
export async function saveFormConfig(
  setor: string,
  config: Omit<FormConfig, 'id' | 'updatedAt' | 'versao'>
): Promise<boolean> {
  try {
    const docId = getFormConfigDocId(setor);
    const docRef = doc(db, FORM_CONFIGS_COLLECTION, docId);
    const docSnap = await getDoc(docRef);

    const versao = docSnap.exists()
      ? (docSnap.data().versao || 0) + 1
      : 1;

    const formConfig: Omit<FormConfig, 'id'> = {
      ...config,
      setor,
      versao,
      updatedAt: new Date(),
    };

    await setDoc(docRef, {
      ...formConfig,
      createdAt: formConfig.createdAt instanceof Date 
        ? Timestamp.fromDate(formConfig.createdAt) 
        : formConfig.createdAt,
      updatedAt: formConfig.updatedAt instanceof Date 
        ? Timestamp.fromDate(formConfig.updatedAt) 
        : formConfig.updatedAt,
    });

    return true;
  } catch (error) {
    console.error(`Erro ao salvar FormConfig para setor "${setor}":`, error);
    return false;
  }
}

/**
 * Atualiza apenas os tipos de chamado de um setor
 */
export async function updateTiposChamado(
  setor: string,
  tiposChamado: TipoChamado[]
): Promise<boolean> {
  try {
    const docId = getFormConfigDocId(setor);
    const docRef = doc(db, FORM_CONFIGS_COLLECTION, docId);

    await updateDoc(docRef, {
      tiposChamado,
      updatedAt: Timestamp.now(),
    });

    return true;
  } catch (error) {
    console.error(`Erro ao atualizar tipos de chamado para setor "${setor}":`, error);
    return false;
  }
}

/**
 * Atualiza apenas os campos customizados de um setor
 */
export async function updateCamposCustomizados(
  setor: string,
  campos: FormField[]
): Promise<boolean> {
  try {
    const docId = getFormConfigDocId(setor);
    const docRef = doc(db, FORM_CONFIGS_COLLECTION, docId);

    await updateDoc(docRef, {
      camposCustomizados: campos,
      updatedAt: Timestamp.now(),
    });

    return true;
  } catch (error) {
    console.error(`Erro ao atualizar campos customizados para setor "${setor}":`, error);
    return false;
  }
}

/**
 * Retorna tipos de chamado padrão que todos os setores herdam
 * (exceto T.I que aparentemente está certo no sistema atual)
 */
export function getTiposChamadoPadrao(): TipoChamado[] {
  return [
    { id: 'bug', nome: 'Bug', descricao: 'Problema encontrado no sistema' },
    { id: 'melhoria', nome: 'Melhoria', descricao: 'Sugestão de melhoria ou feature' },
    { id: 'infra', nome: 'Infra', descricao: 'Solicitação de infraestrutura' },
  ];
}
