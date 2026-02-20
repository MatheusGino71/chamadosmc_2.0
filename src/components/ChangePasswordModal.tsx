'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Lock, Eye, EyeOff } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (currentPassword: string, newPassword: string) => Promise<void>;
}

export default function ChangePasswordModal({ isOpen, onClose, onSave }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(modalRef, isOpen);

  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [isOpen]);

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
    setError('');

    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      await onSave(currentPassword, newPassword);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-xl">
          <h2 id="change-password-title" className="text-xl font-bold text-white flex items-center gap-3">
            <Lock size={24} />
            Alterar Senha
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Senha Atual */}
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-2">
              Senha Atual
            </label>
            <div className="relative">
              <input
                id="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Digite sua senha atual"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Nova Senha */}
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
              Nova Senha
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Digite a nova senha"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
          </div>

          {/* Confirmar Nova Senha */}
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Confirme a nova senha"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
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
              {loading ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
