import { FormConfig, FormField } from '@/types';

/**
 * Valida se os dados fornecidos correspondem aos campos customizados da FormConfig
 * Retorna: { válido: boolean, erros: Record<fieldId, string[]> }
 */
export function validateCustomFields(
  dados: Record<string, any>,
  formConfig: FormConfig | null | undefined
): { valid: boolean; errors: Record<string, string[]> } {
  const errors: Record<string, string[]> = {};

  if (!formConfig || !formConfig.camposCustomizados) {
    return { valid: true, errors: {} }; // Sem campos customizados = sempre válido
  }

  const campos = formConfig.camposCustomizados;

  for (const campo of campos) {
    const valor = dados[campo.id];
    const campoErros: string[] = [];

    // Verificar obrigatoriedade
    if (campo.obrigatorio && (valor === undefined || valor === null || valor === '')) {
      campoErros.push(`Campo "${campo.nome}" é obrigatório.`);
    }

    // Se não é obrigatório e está vazio, pular validações
    if (!campo.obrigatorio && (valor === undefined || valor === null || valor === '')) {
      if (campoErros.length > 0) {
        errors[campo.id] = campoErros;
      }
      continue;
    }

    // Validar tipo
    const tipoValido = validateFieldType(valor, campo.tipo);
    if (!tipoValido) {
      campoErros.push(`Campo "${campo.nome}" possui um tipo inválido. Esperado: ${campo.tipo}`);
    }

    // Validar regras customizadas
    const validacaoErros = validateFieldRules(valor, campo);
    campoErros.push(...validacaoErros);

    if (campoErros.length > 0) {
      errors[campo.id] = campoErros;
    }
  }

  const valid = Object.keys(errors).length === 0;
  return { valid, errors };
}

/**
 * Valida o tipo de dados de um campo
 */
function validateFieldType(valor: any, tipo: string): boolean {
  if (valor === null || valor === undefined || valor === '') {
    return true; // Validação de tipo não se aplica a valores vazios
  }

  switch (tipo) {
    case 'email':
      return typeof valor === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
    case 'number':
      return !isNaN(Number(valor));
    case 'tel':
      return typeof valor === 'string' && /^\d{10,}$/.test(valor.replace(/\D/g, ''));
    case 'date':
      return !isNaN(Date.parse(valor));
    case 'checkbox':
      return typeof valor === 'boolean' || valor === 'true' || valor === 'false';
    case 'text':
    case 'textarea':
    case 'select':
    case 'file':
    default:
      return typeof valor === 'string' || typeof valor === 'number' || Array.isArray(valor);
  }
}

/**
 * Aplica regras de validação customizadas ao campo
 */
function validateFieldRules(valor: any, campo: FormField): string[] {
  const erros: string[] = [];

  if (!campo.validacao || valor === null || valor === undefined || valor === '') {
    return erros;
  }

  const { validacao } = campo;
  const valorStr = String(valor);

  // Validar minLength
  if (validacao.minLength !== undefined && valorStr.length < validacao.minLength) {
    erros.push(
      validacao.customMessage ||
        `Campo "${campo.nome}" deve ter no mínimo ${validacao.minLength} caracteres.`
    );
  }

  // Validar maxLength
  if (validacao.maxLength !== undefined && valorStr.length > validacao.maxLength) {
    erros.push(
      validacao.customMessage ||
        `Campo "${campo.nome}" deve ter no máximo ${validacao.maxLength} caracteres.`
    );
  }

  // Validar pattern (regex)
  if (validacao.pattern !== undefined) {
    const regex = new RegExp(validacao.pattern);
    if (!regex.test(valorStr)) {
      erros.push(
        validacao.customMessage ||
          `Campo "${campo.nome}" não corresponde ao formato esperado.`
      );
    }
  }

  return erros;
}

/**
 * Limpa/normaliza dados de entrada antes de validação
 * Remove campos que não existem na FormConfig
 */
export function sanitizeFormData(
  dados: Record<string, any>,
  formConfig: FormConfig | null | undefined
): Record<string, any> {
  if (!formConfig || !formConfig.camposCustomizados) {
    return {}; // Sem campos customizados = sem dados
  }

  const validFieldIds = new Set(formConfig.camposCustomizados.map((c) => c.id));
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(dados)) {
    if (validFieldIds.has(key)) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Formata dados para armazenamento
 * Trata valores booleanos, datas, números, etc.
 */
export function formatFormData(
  dados: Record<string, any>,
  formConfig: FormConfig | null | undefined
): Record<string, any> {
  if (!formConfig || !formConfig.camposCustomizados) {
    return {};
  }

  const formatted: Record<string, any> = {};
  const camposMap = new Map(formConfig.camposCustomizados.map((c) => [c.id, c]));

  for (const [fieldId, value] of Object.entries(dados)) {
    const campo = camposMap.get(fieldId);
    if (!campo) continue;

    switch (campo.tipo) {
      case 'number':
        formatted[fieldId] = value !== '' ? Number(value) : null;
        break;
      case 'checkbox':
        formatted[fieldId] = value === true || value === 'true';
        break;
      case 'date':
        formatted[fieldId] = value ? new Date(value) : null;
        break;
      default:
        formatted[fieldId] = value || null;
    }
  }

  return formatted;
}
