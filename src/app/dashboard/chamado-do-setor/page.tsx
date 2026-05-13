'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateTicketId } from '@/lib/ticketId';
import { uploadTicketImage, uploadTicketDocument } from '@/lib/storage';
import { ArrowLeft, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { FormConfig } from '@/types';
import { useFormConfig } from '@/hooks/useFormConfig';
import DynamicFormRenderer from '@/components/DynamicFormRenderer';
import { getAdminSetor } from '@/lib/auth-helpers';

interface FieldErrors {
  titulo?: string;
  descricao?: string;
  [key: string]: string | undefined;
}

export default function ChamadoSetorPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  
  // Setor do usuário
  const setorUsuario = user ? (getAdminSetor(user) || user.setor || 'Outros') : undefined;
  
  // Debug: log o setor e a chave do localStorage
  useEffect(() => {
    if (setorUsuario) {
      const storageKey = `formConfig_${setorUsuario.toLowerCase().replace(/\s+/g, '_')}`;
      console.log('🔍 Setor detectado:', setorUsuario);
      console.log('🔍 Chave localStorage procurada:', storageKey);
      console.log('🔍 Conteúdo localStorage:', localStorage.getItem(storageKey));
      console.log('🔍 Todas as chaves localStorage:', Object.keys(localStorage).filter(k => k.startsWith('formConfig_')));
    }
  }, [setorUsuario]);
  
  // Carregar os formulários customizados do setor
  const { formConfig } = useFormConfig(setorUsuario);
  
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
  });
  
  const [dadosFormulario, setDadosFormulario] = useState<Record<string, any>>({});
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    if (errors[name as keyof FieldErrors]) {
      setErrors({ ...errors, [name]: undefined });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (imageFiles.length + files.length > 3) {
      toast.error('Você pode adicionar no máximo 3 imagens');
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione apenas imagens válidas');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Cada imagem deve ter no máximo 5MB');
        return;
      }
    }

    const newFiles = [...imageFiles, ...files].slice(0, 3);
    setImageFiles(newFiles);

    const newPreviews: string[] = [];
    let loadedCount = 0;
    
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        loadedCount++;
        if (loadedCount === files.length) {
          setImagePreviews((prev) => [...prev, ...newPreviews].slice(0, 3));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (indexToRemove: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
    setImagePreviews((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Documento deve ter no máximo 5MB');
      return;
    }

    setDocumentFile(file);
    setDocumentName(file.name);
  };

  const removeDocument = () => {
    setDocumentFile(null);
    setDocumentName('');
  };

  const validateForm = (): boolean => {
    const newErrors: FieldErrors = {};

    // Valida título
    if (!formData.titulo.trim()) {
      newErrors.titulo = 'O título é obrigatório';
    } else if (formData.titulo.trim().length < 5) {
      newErrors.titulo = 'O título deve ter no mínimo 5 caracteres';
    }

    // Valida descrição
    if (!formData.descricao.trim()) {
      newErrors.descricao = 'A descrição é obrigatória';
    }

    // Valida campos customizados
    if (formConfig && formConfig.camposCustomizados) {
      for (const campo of formConfig.camposCustomizados) {
        const valor = dadosFormulario[campo.id];
        if (campo.obrigatorio && (valor === undefined || valor === null || valor === '' || (Array.isArray(valor) && valor.length === 0))) {
          newErrors[`campo_${campo.id}`] = `Campo "${campo.nome}" é obrigatório`;
        }
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!validateForm()) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      const ticketId = await generateTicketId();

      // Upload das imagens
      const imageUrls: string[] = [];
      for (const imageFile of imageFiles) {
        const url = await uploadTicketImage(imageFile, ticketId);
        imageUrls.push(url);
      }

      // Upload do documento
      let documentUrl = '';
      if (documentFile) {
        documentUrl = await uploadTicketDocument(documentFile, ticketId);
      }

      // Criar chamado com tipo automático baseado no setor
      const ticketData: any = {
        ticketId,
        titulo: formData.titulo,
        descricao: formData.descricao,
        tipo: 'customizado', // Tipo especial para formulários customizados do setor
        setor: setorUsuario,
        imageUrls: imageUrls.length > 0 ? imageUrls : [],
        documentUrl: documentUrl,
        documentName: documentName || '',
        userId: user.uid,
        userName: user.nome,
        userEmail: user.email,
        status: 'aberto',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Adiciona dados customizados do formulário
      if (formConfig && Object.keys(dadosFormulario).length > 0) {
        ticketData.dadosFormulario = dadosFormulario;
        ticketData.versionFormulario = formConfig.versao;
      }

      await addDoc(collection(db, 'tickets'), ticketData);

      toast.success('Chamado do setor criado com sucesso!');
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Erro ao criar chamado:', err);
      
      let errorMsg = 'Erro ao criar chamado. Tente novamente.';
      if (err?.message?.includes('permission') || err?.code === 'permission-denied') {
        errorMsg = 'Você não tem permissão para criar chamados.';
      } else if (err?.code === 'unavailable') {
        errorMsg = 'Sem conexão com o servidor. Verifique sua internet.';
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  // Verificar se há formulário customizado
  if (!formConfig) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Novo Chamado do Setor</h1>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-gray-400 mb-4 text-5xl">📋</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum formulário customizado disponível
            </h2>
            <p className="text-gray-600 mb-4">
              O administrador do seu setor ({setorUsuario}) ainda não criou um formulário customizado.
            </p>
            <p className="text-sm text-gray-500">
              Por enquanto, use a opção "Novo Chamado" para criar um chamado padrão.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Novo Chamado do Setor</h1>
          {setorUsuario && (
            <p className="text-sm text-gray-500 mt-1">
              Setor: <span className="font-medium">{setorUsuario}</span>
            </p>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Título */}
            <div>
              <label htmlFor="titulo" className="block text-sm font-semibold text-gray-900 mb-2">
                Título *
              </label>
              <input
                id="titulo"
                type="text"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                placeholder="Título do chamado"
                className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.titulo ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.titulo && (
                <p className="text-red-600 text-sm mt-1">{errors.titulo}</p>
              )}
            </div>

            {/* Descrição */}
            <div>
              <label htmlFor="descricao" className="block text-sm font-semibold text-gray-900 mb-2">
                Descrição *
              </label>
              <textarea
                id="descricao"
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                placeholder="Descreva o problema ou solicitação em detalhes"
                rows={4}
                className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.descricao ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.descricao && (
                <p className="text-red-600 text-sm mt-1">{errors.descricao}</p>
              )}
            </div>

            {/* Tipos de Chamado */}
            {formConfig && formConfig.tiposChamado && formConfig.tiposChamado.length > 0 && (
              <div className="border-t pt-6">
                <label className="block text-sm font-semibold text-gray-900 mb-4">
                  Tipo de Chamado *
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {formConfig.tiposChamado.map((tipo) => (
                    <label key={tipo.id} className="flex items-start p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50 transition">
                      <input
                        type="radio"
                        name="tipoChamado"
                        value={tipo.id}
                        checked={dadosFormulario.tipoChamado === tipo.id}
                        onChange={(e) => setDadosFormulario({ ...dadosFormulario, tipoChamado: e.target.value })}
                        className="mt-1 h-4 w-4"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{tipo.nome}</p>
                        {tipo.descricao && (
                          <p className="text-xs text-gray-600">{tipo.descricao}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Campos Customizados do Setor */}
            {formConfig && formConfig.camposCustomizados.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Campos Customizados do Setor
                </h3>
                <div className="space-y-4">
                  <DynamicFormRenderer
                    formConfig={formConfig}
                    onDataChange={setDadosFormulario}
                  />
                </div>
              </div>
            )}

            {/* Imagens */}
            <div className="border-t pt-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Imagens (até 3)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-input"
                />
                <label htmlFor="image-input" className="cursor-pointer block">
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    Clique ou arraste imagens aqui
                  </p>
                </label>
              </div>

              {/* Preview de Imagens */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documento */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Documento (opcional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={handleDocumentChange}
                  className="hidden"
                  id="document-input"
                />
                <label htmlFor="document-input" className="cursor-pointer block">
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    Selecione um documento (PDF, Word, Excel, etc)
                  </p>
                </label>
              </div>

              {documentName && (
                <div className="mt-4 flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <span className="text-sm text-gray-700">{documentName}</span>
                  <button
                    type="button"
                    onClick={removeDocument}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Botões */}
            <div className="border-t pt-6 flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Criando...' : 'Criar Chamado'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
