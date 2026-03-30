'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessGlobalManagement } from '@/lib/auth-helpers';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { User } from '@/types';
import { ArrowLeft, UserCog, Shield, User as UserIcon, Mail, Briefcase, Calendar, Trash2, Edit2, Search, KeyRound, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ConfirmDialog';
import EditUserModal from '@/components/EditUserModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';

export default function UsersManagementPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; userId: string | null; userName: string }>({
    isOpen: false,
    userId: null,
    userName: ''
  });
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState<{ isOpen: boolean; userId: string | null; userName: string; userEmail: string }>({
    isOpen: false,
    userId: null,
    userName: '',
    userEmail: ''
  });
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);

  // Verifica se tem permissão para gerenciar usuários
  useEffect(() => {
    if (!loading && !canAccessGlobalManagement(currentUser)) {
      router.push('/admin');
    }
  }, [currentUser, loading, router]);

  // Carrega usuários
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData: User[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        usersData.push({
          uid: doc.id,
          email: data.email,
          nome: data.nome,
          setor: data.setor,
          role: data.role,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenEditModal = (user: User) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleSaveUser = async (userId: string, data: { nome: string; setor: string; cpf?: string; role: any }) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...data,
        updatedAt: new Date(),
      });
      toast.success('Usuário atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro ao atualizar usuário');
      throw error;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success('Usuário removido com sucesso!');
      setDeleteConfirm({ isOpen: false, userId: null, userName: '' });
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      toast.error('Erro ao remover usuário');
    }
  };

  const handleResetPassword = async (userEmail: string) => {
    try {
      // Envia email de redefinição de senha
      await sendPasswordResetEmail(auth, userEmail);
      
      toast.success(
        'Email de redefinição enviado! Instrua o usuário a usar a senha "123456" quando solicitado.',
        { duration: 6000 }
      );
      setResetPasswordConfirm({ isOpen: false, userId: null, userName: '', userEmail: '' });
    } catch (error: any) {
      console.error('Erro ao enviar email:', error);
      if (error.code === 'auth/user-not-found') {
        toast.error('Usuário não encontrado');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Email inválido');
      } else {
        toast.error('Erro ao enviar email de redefinição');
      }
    }
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('Usuário não autenticado');
      }

      // Reautentica o usuário
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Atualiza a senha
      await updatePassword(user, newPassword);
      
      toast.success('Senha alterada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      if (error.code === 'auth/wrong-password') {
        throw new Error('Senha atual incorreta');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('A nova senha é muito fraca');
      } else {
        throw new Error('Erro ao alterar senha');
      }
    }
  };

  const filteredUsers = users.filter(user => 
    user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.setor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-white rounded-lg shadow"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Voltar ao Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <UserCog className="text-indigo-600" size={36} />
                Gerenciamento de Usuários
              </h1>
              <p className="text-gray-600 mt-2">
                Gerencie permissões, resetar senhas e acessos dos usuários do sistema
              </p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <button
                onClick={() => setChangePasswordModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all font-medium shadow-md"
              >
                <Lock size={18} />
                Alterar Minha Senha
              </button>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total de usuários</p>
                <p className="text-2xl font-bold text-indigo-600">{users.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome, email ou setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Administradores</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role.startsWith('admin')).length}
                </p>
              </div>
              <Shield className="text-indigo-500" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Usuários Padrão</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role === 'user').length}
                </p>
              </div>
              <UserIcon className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Resultados</p>
                <p className="text-2xl font-bold text-gray-900">{filteredUsers.length}</p>
              </div>
              <Search className="text-green-500" size={32} />
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <UserCog className="text-indigo-600" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Ações disponíveis:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <Edit2 size={16} className="text-indigo-600" />
                  <span><strong>Editar:</strong> Alterar dados e permissões</span>
                </div>
                <div className="flex items-center gap-2">
                  <KeyRound size={16} className="text-orange-600" />
                  <span><strong>Resetar Senha:</strong> Enviar email de redefinição</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trash2 size={16} className="text-red-600" />
                  <span><strong>Remover:</strong> Deletar usuário do sistema</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Usuário</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Setor</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">CPF</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Permissão</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Cadastro</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <UserIcon className="mx-auto mb-4 text-gray-400" size={48} />
                      <p className="text-lg font-medium">Nenhum usuário encontrado</p>
                      <p className="text-sm">Tente ajustar os filtros de busca</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                      {/* Nome */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {user.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.nome}</p>
                            {user.uid === currentUser?.uid && (
                              <span className="text-xs text-indigo-600 font-medium">(Você)</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail size={16} className="text-gray-400" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </td>

                      {/* Setor */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Briefcase size={16} className="text-gray-400" />
                          <span className="text-sm">{user.setor}</span>
                        </div>
                      </td>

                      {/* CPF */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {user.cpf || '-'}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                          user.role.startsWith('admin')
                            ? user.role === 'admin_ti'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role.startsWith('admin') ? (
                            <>
                              <Shield size={14} />
                              {user.role === 'admin_ti' 
                                ? 'Admin TI' 
                                : user.role === 'admin'
                                ? 'Admin'
                                : `Admin ${user.setor}`}
                            </>
                          ) : (
                            <>
                              <UserIcon size={14} />
                              Usuário
                            </>
                          )}
                        </span>
                      </td>

                      {/* Data de Cadastro */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar size={16} className="text-gray-400" />
                          <span className="text-sm">
                            {format(user.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            disabled={user.uid === currentUser?.uid}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Editar usuário"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => setResetPasswordConfirm({ isOpen: true, userId: user.uid, userName: user.nome, userEmail: user.email })}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Enviar email de redefinição de senha"
                          >
                            <KeyRound size={18} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ isOpen: true, userId: user.uid, userName: user.nome })}
                            disabled={user.uid === currentUser?.uid}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Remover usuário"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Remover Usuário"
        message={
          <>
            Tem certeza que deseja remover o usuário <strong>{deleteConfirm.userName}</strong>?
            <br />
            <span className="text-red-600 font-medium">Esta ação não pode ser desfeita.</span>
          </>
        }
        confirmText="Remover"
        cancelText="Cancelar"
        onConfirm={() => deleteConfirm.userId && handleDeleteUser(deleteConfirm.userId)}
        onClose={() => setDeleteConfirm({ isOpen: false, userId: null, userName: '' })}
        variant="danger"
      />

      {/* Reset Password Confirmation Dialog */}
      <ConfirmDialog
        isOpen={resetPasswordConfirm.isOpen}
        title="Enviar Email de Redefinição"
        message={
          <>
            Enviar email de redefinição de senha para <strong>{resetPasswordConfirm.userName}</strong>?
            <br />
            <span className="text-gray-600 text-sm mt-2 block">
              Um link será enviado para: <strong>{resetPasswordConfirm.userEmail}</strong>
            </span>
            <span className="text-orange-600 font-medium text-sm mt-2 block">
              💡 Instrua o usuário a usar "123456" como nova senha
            </span>
          </>
        }
        confirmText="Enviar Email"
        cancelText="Cancelar"
        onConfirm={() => resetPasswordConfirm.userEmail && handleResetPassword(resetPasswordConfirm.userEmail)}
        onClose={() => setResetPasswordConfirm({ isOpen: false, userId: null, userName: '', userEmail: '' })}
        variant="warning"
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={editModalOpen}
        user={selectedUser}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveUser}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
        onSave={handleChangePassword}
      />
    </div>
  );
}
