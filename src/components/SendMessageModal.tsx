'use client';

import { useState, useEffect } from 'react';
import { X, Send, Mail } from 'lucide-react';
import { User } from '@/types';
import { sendAdminMessage } from '@/lib/notifications';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

export default function SendMessageModal({ isOpen, onClose, currentUser }: SendMessageModalProps) {
  const [admins, setAdmins] = useState<User[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  // Carrega lista de administradores
  useEffect(() => {
    if (!isOpen) return;

    const loadAdmins = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'admin')
        );
        const snapshot = await getDocs(q);
        const adminsList = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              uid: doc.id,
              email: data.email,
              nome: data.nome,
              setor: data.setor,
              cpf: data.cpf || '',
              role: data.role,
              createdAt: data.createdAt?.toDate() || new Date(),
            } as User;
          })
          .filter(admin => admin.uid !== currentUser.uid); // Remove o usuário atual da lista

        setAdmins(adminsList);
      } catch (error) {
        console.error('Erro ao carregar administradores:', error);
        toast.error('Erro ao carregar lista de administradores');
      } finally {
        setLoadingAdmins(false);
      }
    };

    loadAdmins();
  }, [isOpen, currentUser.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAdmin || !subject.trim() || !message.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    const recipient = admins.find(admin => admin.uid === selectedAdmin);
    if (!recipient) {
      toast.error('Administrador não encontrado');
      return;
    }

    setLoading(true);

    try {
      await sendAdminMessage(
        currentUser.uid,
        currentUser.nome,
        recipient.uid,
        recipient.nome,
        subject,
        message
      );

      toast.success('Mensagem enviada com sucesso!');
      setSelectedAdmin('');
      setSubject('');
      setMessage('');
      onClose();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Enviar Mensagem</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Destinatário */}
            <div>
              <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-2">
                Destinatário *
              </label>
              {loadingAdmins ? (
                <div className="text-sm text-gray-500">Carregando administradores...</div>
              ) : admins.length === 0 ? (
                <div className="text-sm text-gray-500">Nenhum outro administrador disponível</div>
              ) : (
                <select
                  id="recipient"
                  value={selectedAdmin}
                  onChange={(e) => setSelectedAdmin(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione um administrador</option>
                  {admins.map((admin) => (
                    <option key={admin.uid} value={admin.uid}>
                      {admin.nome} - {admin.setor} ({admin.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Assunto */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Assunto *
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite o assunto da mensagem"
                maxLength={100}
                required
              />
            </div>

            {/* Mensagem */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Mensagem *
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Digite sua mensagem..."
                maxLength={1000}
                required
              />
              <div className="text-xs text-gray-500 mt-1 text-right">
                {message.length}/1000 caracteres
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || loadingAdmins || admins.length === 0}
            >
              <Send className="w-4 h-4" />
              {loading ? 'Enviando...' : 'Enviar Mensagem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
