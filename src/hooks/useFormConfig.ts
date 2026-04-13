import { useState, useEffect, useCallback } from "react";
import { FormConfig } from "@/types";

const STORAGE_KEY_PREFIX = "formConfig_";
const DEFAULT_TIPOS_CHAMADO = [
  { id: "bug", nome: "Bug", descricao: "Problema encontrado no sistema" },
  { id: "melhoria", nome: "Melhoria", descricao: "Sugestão de melhoria ou feature" },
  { id: "infra", nome: "Infra", descricao: "Solicitação de infraestrutura" },
];

/**
 * Hook para gerenciar configurações de formulário usando localStorage
 * Funciona de forma independente sem depender de Cloud Functions
 */
export function useFormConfig(setor?: string) {
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carrega configuração do localStorage para um setor
   */
  const loadFormConfig = useCallback((setorName: string) => {
    try {
      setLoading(true);
      setError(null);

      const storageKey = `${STORAGE_KEY_PREFIX}${setorName.toLowerCase().replace(/\s+/g, '_')}`;
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        const config = JSON.parse(stored) as FormConfig;
        setFormConfig(config);
      } else {
        // Se não houver config customizada, retorna config padrão
        const defaultConfig: FormConfig = {
          id: `setor_${setorName.toLowerCase().replace(/\s+/g, '_')}`,
          setor: setorName,
          tiposChamado: DEFAULT_TIPOS_CHAMADO,
          camposCustomizados: [],
          versao: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: "sistema",
        };
        setFormConfig(defaultConfig);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar configuração";
      setError(message);
      setFormConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Salva configuração no localStorage
   */
  const saveFormConfig = useCallback((config: FormConfig) => {
    try {
      setError(null);
      const storageKey = `${STORAGE_KEY_PREFIX}${config.setor.toLowerCase().replace(/\s+/g, '_')}`;
      const configToSave = {
        ...config,
        versao: (config.versao || 0) + 1,
        updatedAt: new Date(),
      };
      localStorage.setItem(storageKey, JSON.stringify(configToSave));
      setFormConfig(configToSave);
      
      // Disparar evento customizado para outras abas/componentes
      window.dispatchEvent(new CustomEvent('formConfigUpdated', { 
        detail: { setor: config.setor, config: configToSave } 
      }));
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar configuração";
      setError(message);
      return false;
    }
  }, []);

  /**
   * Remove configuração do localStorage (resetar para padrão)
   */
  const resetFormConfig = useCallback((setorName: string) => {
    try {
      setError(null);
      const storageKey = `${STORAGE_KEY_PREFIX}${setorName.toLowerCase().replace(/\s+/g, '_')}`;
      localStorage.removeItem(storageKey);
      
      // Retorna para config padrão
      const defaultConfig: FormConfig = {
        id: `setor_${setorName.toLowerCase().replace(/\s+/g, '_')}`,
        setor: setorName,
        tiposChamado: DEFAULT_TIPOS_CHAMADO,
        camposCustomizados: [],
        versao: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "sistema",
      };
      setFormConfig(defaultConfig);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao resetar configuração";
      setError(message);
      return false;
    }
  }, []);

  /**
   * Atualiza apenas os tipos de chamado
   */
  const updateTiposChamado = useCallback((tipos: Array<any>) => {
    if (!formConfig) return false;

    const updated = {
      ...formConfig,
      tiposChamado: tipos,
      versao: (formConfig.versao || 0) + 1,
      updatedAt: new Date(),
    };
    return saveFormConfig(updated);
  }, [formConfig, saveFormConfig]);

  /**
   * Atualiza apenas os campos customizados
   */
  const updateCamposCustomizados = useCallback((campos: Array<any>) => {
    if (!formConfig) return false;

    const updated = {
      ...formConfig,
      camposCustomizados: campos,
      versao: (formConfig.versao || 0) + 1,
      updatedAt: new Date(),
    };
    return saveFormConfig(updated);
  }, [formConfig, saveFormConfig]);

  /**
   * Carrega automaticamente quando o setor muda
   */
  useEffect(() => {
    if (setor) {
      loadFormConfig(setor);
    }
  }, [setor, loadFormConfig]);

  /**
   * Listener para atualizações de formulário em tempo real (quando outro componente salva)
   */
  useEffect(() => {
    const handleFormConfigUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { setor: updatedSetor, config } = customEvent.detail;
      
      // Se é do mesmo setor que estamos monitorando, recarregar
      if (updatedSetor === setor) {
        setFormConfig(config);
        console.log(`✅ FormConfig atualizado para o setor: ${updatedSetor}`);
      }
    };

    window.addEventListener('formConfigUpdated', handleFormConfigUpdate as EventListener);
    
    return () => {
      window.removeEventListener('formConfigUpdated', handleFormConfigUpdate as EventListener);
    };
  }, [setor]);

  return {
    formConfig,
    loading,
    error,
    loadFormConfig,
    saveFormConfig,
    resetFormConfig,
    updateTiposChamado,
    updateCamposCustomizados,
  };
}
