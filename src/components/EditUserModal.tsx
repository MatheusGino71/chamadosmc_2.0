'use client';

import { useState, useEffect, useRef } from 'react';
import { X, User, Mail, Briefcase, Shield } from 'lucide-react';
import { User as UserType } from '@/types';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface EditUserModalProps {
  isOpen: boolean;
  user: UserType | null;
  onClose: () => void;
  onSave: (userId: string, data: { nome: string; setor: string; cpf?: string; role: any }) => Promise<void>;
}

export default function EditUserModal({ isOpen, user, onClose, onSave }: EditUserModalProps) {
  const [nome, setNome] = useState('');
  const [setor, setSetor] = useState('');
  const [cpf, setCpf] = useState('');
  const [role, setRole] = useState<any>('user');
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(modalRef, isOpen);

  useEffect(() => {
    if (user) {
      setNome(user.nome);
      setSetor(user.setor);
      setCpf(user.cpf || '');
      setRole(user.role);
    }
  }, [user]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await onSave(user.uid, { nome, setor, cpf, role });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-user-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-xl">
          <h2 id="edit-user-title" className="text-xl font-bold text-white flex items-center gap-3">
            <User size={24} />
            Editar Usuário
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="inline mr-2" size={16} />
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">O email não pode ser alterado</p>
          </div>

          {/* Nome */}
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
              <User className="inline mr-2" size={16} />
              Nome Completo
            </label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Digite o nome completo"
            />
          </div>

          {/* Setor */}
          <div>
            <label htmlFor="setor" className="block text-sm font-medium text-gray-700 mb-2">
              <Briefcase className="inline mr-2" size={16} />
              Setor
            </label>
            <select
              id="setor"
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Selecione um setor</option>
              <option value="Financeiro">Financeiro</option>
              <option value="TI">TI</option>
              <option value="RH">RH</option>
              <option value="Marketing">Marketing</option>
              <option value="Comercial">Comercial</option>
              <option value="Sucesso do Aluno">Sucesso do Aluno</option>
              <option value="Diretoria">Diretoria</option>
              <option value="Pedagógico">Pedagógico</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          {/* CPF */}
          <div>
            <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-2">
              CPF
            </label>
            <input
              id="cpf"
              type="text"
              maxLength={14}
              value={cpf}
              onChange={(e) => {
                // Formata CPF automaticamente
                let value = e.target.value.replace(/\D/g, '');
                if (value.length <= 11) {
                  value = value.replace(/(\d{3})(\d)/, '$1.$2');
                  value = value.replace(/(\d{3})(\d)/, '$1.$2');
                  value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                }
                setCpf(value);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="000.000.000-00"
            />
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              <Shield className="inline mr-2" size={16} />
              Permissão
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => {
                const newRole = e.target.value as any;
                setRole(newRole);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="user">Usuário Padrão</option>
              <optgroup label="━━━ ADMINISTRADORES ━━━">
                <option value="admin">🔐 Administrador Genérico (Legado)</option>
                <option value="admin_ti">🔧 Administrador TI - Acesso Total a Tudo</option>
              </optgroup>
              <optgroup label="━━━ ADMINISTRADORES POR SETOR ━━━">
                <option value="admin_pedagogico">📚 Administrador - Pedagógico</option>
                <option value="admin_comercial">💼 Administrador - Comercial</option>
                <option value="admin_rh">👥 Administrador - RH</option>
                <option value="admin_financeiro">💰 Administrador - Financeiro</option>
                <option value="admin_marketing">📢 Administrador - Marketing</option>
                <option value="admin_sucesso_aluno">⭐ Administrador - Sucesso do Aluno</option>
                <option value="admin_diretoria">👔 Administrador - Diretoria</option>
                <option value="admin_outros">📌 Administrador - Outros</option>
              </optgroup>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {role === 'user' && 'Usuários podem criar e gerenciar seus próprios chamados'}
              {role === 'admin' && '⚠️ Legado: Administrador com acesso total'}
              {role === 'admin_ti' && '🔧 Acesso a todos os setores e funcionalidades'}
              {role.startsWith('admin_') && role !== 'admin_ti' && `Acesso restrito ao setor específico`}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
