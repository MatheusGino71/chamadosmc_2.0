import { FormConfig, TipoChamado } from '@/types';

/**
 * Configurações padrão de formulários para cada setor
 * Essas são carregadas uma única vez no seed inicial
 */

const TIPOS_PADRAO: TipoChamado[] = [
  { id: 'bug', nome: 'Bug', descricao: 'Problema encontrado no sistema' },
  { id: 'melhoria', nome: 'Melhoria', descricao: 'Sugestão de melhoria ou feature' },
  { id: 'infra', nome: 'Infra', descricao: 'Solicitação de infraestrutura' },
];

const SETORES_CONFIG: Record<string, Partial<FormConfig>> = {
  'TI': {
    tiposChamado: TIPOS_PADRAO,
    camposCustomizados: [],
  },
  'Pedagógico': {
    tiposChamado: [
      { id: 'duvida_aluno', nome: 'Dúvida de Aluno', descricao: 'Dúvidas de alunos sobre conteúdo' },
      { id: 'ajuste_nota', nome: 'Ajuste de Nota', descricao: 'Solicitação de ajuste de notas' },
      { id: 'problema_matricula', nome: 'Problema de Matrícula', descricao: 'Problemas com matrículas' },
      ...TIPOS_PADRAO,
    ],
    camposCustomizados: [],
  },
  'Financeiro': {
    tiposChamado: [
      { id: 'fatura', nome: 'Fatura', descricao: 'Questões relacionadas a faturas' },
      { id: 'reembolso', nome: 'Reembolso', descricao: 'Solicitações de reembolso' },
      { id: 'debito', nome: 'Débito', descricao: 'Problemas com débitos' },
      ...TIPOS_PADRAO,
    ],
    camposCustomizados: [],
  },
  'RH': {
    tiposChamado: [
      { id: 'contratacao', nome: 'Contratação', descricao: 'Processos de contratação' },
      { id: 'beneficios', nome: 'Benefícios', descricao: 'Questões sobre benefícios' },
      { id: 'folha_pagamento', nome: 'Folha de Pagamento', descricao: 'Problemas com folha de pagamento' },
      ...TIPOS_PADRAO,
    ],
    camposCustomizados: [],
  },
  'Marketing': {
    tiposChamado: [
      { id: 'campanha', nome: 'Campanha', descricao: 'Solicitações de campanha' },
      { id: 'conteudo', nome: 'Conteúdo', descricao: 'Questões de conteúdo' },
      { id: 'publicidade', nome: 'Publicidade', descricao: 'Questões de publicidade' },
      ...TIPOS_PADRAO,
    ],
    camposCustomizados: [],
  },
  'Comercial': {
    tiposChamado: [
      { id: 'venda', nome: 'Venda', descricao: 'Questões de vendas' },
      { id: 'cliente', nome: 'Cliente', descricao: 'Problemas com clientes' },
      { id: 'proposta', nome: 'Proposta', descricao: 'Solicitações de proposta' },
      ...TIPOS_PADRAO,
    ],
    camposCustomizados: [],
  },
  'Sucesso do Aluno': {
    tiposChamado: [
      { id: 'acompanhamento', nome: 'Acompanhamento', descricao: 'Acompanhamento de alunos' },
      { id: 'evasao', nome: 'Evasão', descricao: 'Risco de evasão de alunos' },
      { id: 'engajamento', nome: 'Engajamento', descricao: 'Problemas de engajamento' },
      ...TIPOS_PADRAO,
    ],
    camposCustomizados: [],
  },
  'Diretoria': {
    tiposChamado: [
      { id: 'estrategia', nome: 'Estratégia', descricao: 'Questões estratégicas' },
      { id: 'politica', nome: 'Política', descricao: 'Políticas da organização' },
      { id: 'relatorio', nome: 'Relatório', descricao: 'Solicitações de relatório' },
      ...TIPOS_PADRAO,
    ],
    camposCustomizados: [],
  },
  'Outros': {
    tiposChamado: TIPOS_PADRAO,
    camposCustomizados: [],
  },
};

/**
 * Retorna a configuração padrão para um setor
 */
export function getDefaultFormConfigForSetor(setor: string): Partial<FormConfig> {
  return SETORES_CONFIG[setor] || {
    tiposChamado: TIPOS_PADRAO,
    camposCustomizados: [],
  };
}

/**
 * Retorna lista de todos os setores com suas configs padrão
 */
export function getAllDefaultFormConfigs(): Record<string, Partial<FormConfig>> {
  return SETORES_CONFIG;
}
