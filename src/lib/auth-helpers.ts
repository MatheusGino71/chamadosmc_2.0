import { User } from '@/types';

export const SETORES = [
  'Pedagógico',
  'Comercial',
  'RH',
  'Financeiro',
  'Marketing',
  'Sucesso do Aluno',
  'Diretoria',
  'Outros'
] as const;

export const ROLE_SETOR_MAP: Record<string, string> = {
  'admin_pedagogico': 'Pedagógico',
  'admin_comercial': 'Comercial',
  'admin_rh': 'RH',
  'admin_financeiro': 'Financeiro',
  'admin_marketing': 'Marketing',
  'admin_sucesso_aluno': 'Sucesso do Aluno',
  'admin_diretoria': 'Diretoria',
  'admin_outros': 'Outros',
};

export const getRoleSetorMap = (): Array<{ role: string; label: string; setor: string }> => [
  { role: 'admin_ti', label: '🔧 Administrador TI (Acesso Total)', setor: 'TI' },
  { role: 'admin_pedagogico', label: '📚 Administrador - Pedagógico', setor: 'Pedagógico' },
  { role: 'admin_comercial', label: '💼 Administrador - Comercial', setor: 'Comercial' },
  { role: 'admin_rh', label: '👥 Administrador - RH', setor: 'RH' },
  { role: 'admin_financeiro', label: '💰 Administrador - Financeiro', setor: 'Financeiro' },
  { role: 'admin_marketing', label: '📢 Administrador - Marketing', setor: 'Marketing' },
  { role: 'admin_sucesso_aluno', label: '⭐ Administrador - Sucesso do Aluno', setor: 'Sucesso do Aluno' },
  { role: 'admin_diretoria', label: '👔 Administrador - Diretoria', setor: 'Diretoria' },
  { role: 'admin_outros', label: '📌 Administrador - Outros', setor: 'Outros' },
];

// Verifica se é admin (qualquer tipo)
export const isAdmin = (user: User | null): boolean => {
  if (!user) return false;
  return user.role.startsWith('admin');
};

// Verifica se é TI (acesso a tudo)
export const isAdminTI = (user: User | null): boolean => {
  return user?.role === 'admin_ti';
};

// Verifica se é admin genérico (compatibilidade)
export const isAdminGeneral = (user: User | null): boolean => {
  return user?.role === 'admin' || user?.role === 'admin_ti';
};

// Retorna o setor do admin
export const getAdminSetor = (user: User | null): string | null => {
  if (!user) return null;
  return ROLE_SETOR_MAP[user.role as keyof typeof ROLE_SETOR_MAP] || null;
};

// Verifica se pode acessar um setor específico
export const canAccessSetor = (user: User | null, setor: string): boolean => {
  if (!user) return false;
  if (isAdminTI(user)) return true; // TI acessa tudo
  const userSetor = getAdminSetor(user);
  return userSetor === setor;
};

// Verifica se pode acessar funcionalidades de gestão global (Usuários e Acompanhamento)
// Apenas admin_ti e admin_outros (genérico) têm acesso
export const canAccessGlobalManagement = (user: User | null): boolean => {
  if (!user) return false;
  // admin_ti (TI) tem acesso total
  if (isAdminTI(user)) return true;
  // admin_outros (genérico) pode gerenciar usuários e acompanhamento
  if (user.role === 'admin_outros') return true;
  // admin legado tem acesso também
  if (user.role === 'admin') return true;
  // Admins de setores específicos NÃO têm acesso
  return false;
};

// Lista de admins para um setor específico
export const getAdminRoleForSetor = (setor: string): string | null => {
  const entry = Object.entries(ROLE_SETOR_MAP).find(([_, s]) => s === setor);
  return entry ? entry[0] : null;
};
