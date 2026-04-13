'use client';

// VERSÃO: 4.0 - FORMULÁRIOS DINÂMICOS POR SETOR - 13/04/2026
// Esta versão renderiza o formulário EXATAMENTE como o gestor customizou

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateTicketId } from '@/lib/ticketId';
import { uploadTicketImage, uploadTicketDocument } from '@/lib/storage';
import { ArrowLeft, Upload, X, Link as LinkIcon } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { FormConfig } from '@/types';
import { useFormConfig } from '@/hooks/useFormConfig';
import DynamicFormRenderer from '@/components/DynamicFormRenderer';
import { getAdminSetor } from '@/lib/auth-helpers';

interface FieldErrors {
  tipo?: string;
  titulo?: string;
  descricao?: string;
  url?: string;
  [key: string]: string | undefined; // Para campos customizados
}

export default function NovoChamadoPage() {
  // VERIFICAÇÃO DE VERSÃO - Se não aparecer este log, o cache não foi limpo!
  console.log('%c🔥 VERSÃO 4.0 - FORMULÁRIOS DINÂMICOS POR SETOR 🔥', 'color: #00ff00; font-size: 20px; font-weight: bold;');
  console.log('%c✅ O formulário se adapta ao layout criado pelo gestor do setor', 'color: #00ff00; font-size: 16px;');
  
  const { user } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  
  // Setor do usuário é determinado pela sua role
  const setorUsuario = user ? (getAdminSetor(user) || 'Outros') : undefined;
  
  // Carregar os formulários customizados do setor
  const { formConfig } = useFormConfig(setorUsuario);
  
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: '' as string,
    url: '',
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

    // Valida tipo
    if (!formData.tipo) {
      newErrors.tipo = 'Selecione um tipo de chamado';
    }

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

    // Valida URL
    if (!formData.url.trim()) {
      newErrors.url = 'A URL é obrigatória';
    } else {
      try {
        new URL(formData.url);
      } catch {
        newErrors.url = 'URL inválida. Use o formato: https://exemplo.com';
      }
    }

    // Valida imagem
    if (imageFiles.length === 0) {
      newErrors.url = (newErrors.url || '') + ' Pelo menos uma imagem é obrigatória';
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

    // Valida formulário
    if (!validateForm()) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Gera ID único do chamado
      console.log('Gerando ticket ID...');
      const ticketId = await generateTicketId();
      console.log('Ticket ID gerado:', ticketId);

      // Upload das imagens para o Storage (até 3)
      const imageUrls: string[] = [];
      for (const imageFile of imageFiles) {
        console.log('Fazendo upload da imagem...');
        const url = await uploadTicketImage(imageFile, ticketId);
        console.log('Imagem enviada:', url);
        imageUrls.push(url);
      }

      // Upload do documento para o Storage (se houver)
      let documentUrl = '';
      if (documentFile) {
        console.log('Fazendo upload do documento...');
        documentUrl = await uploadTicketDocument(documentFile, ticketId);
        console.log('Documento enviado:', documentUrl);
      }

      // Cria o chamado no Firestore
      console.log('Criando chamado no Firestore...');
      const ticketData: any = {
        ticketId,
        titulo: formData.titulo,
        descricao: formData.descricao,
        tipo: formData.tipo,
        setor: setorUsuario,
        imageUrls: imageUrls.length > 0 ? imageUrls : [],
        url: formData.url,
        documentUrl: documentUrl,
        documentName: documentName || '',
        userId: user.uid,
        userName: user.nome,
        userEmail: user.email,
        status: 'aberto',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Adiciona dados customizados do formulário se existirem
      if (formConfig && Object.keys(dadosFormulario).length > 0) {
        ticketData.dadosFormulario = dadosFormulario;
        ticketData.versionFormulario = formConfig.versao;
      }

      await addDoc(collection(db, 'tickets'), ticketData);

      console.log('Chamado criado com sucesso!');
      toast.success('Chamado criado com sucesso!');
      // Redireciona para o dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Erro ao criar chamado:', err);
      console.error('Código do erro:', err?.code);
      console.error('Mensagem do erro:', err?.message);
      
      // Mensagem de erro mais detalhada
      let errorMsg = 'Erro ao criar chamado. Tente novamente.';
      
      if (err?.message?.includes('index')) {
        errorMsg = 'Erro de configuração do banco de dados. Contate o administrador.';
      } else if (err?.message?.includes('permission') || err?.code === 'permission-denied') {
        errorMsg = 'Você não tem permissão para criar chamados. Contate o administrador.';
      } else if (err?.code === 'unavailable') {
        errorMsg = 'Sem conexão com o servidor. Verifique sua internet.';
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Novo Chamado</h1>
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

            {/* Tipo de Chamado */}
            {formConfig ? (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Tipo de Chamado *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {formConfig.tiposChamado.map((tipo) => (
                    <button
                      key={tipo.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, tipo: tipo.id });
                        setErrors({ ...errors, tipo: undefined });
                      }}
                      className={`p-4 border-2 rounded-lg transition text-left ${
                        formData.tipo === tipo.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : errors.tipo && !formData.tipo
                          ? 'border-red-500 bg-white text-gray-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-medium">{tipo.nome}</div>
                      {tipo.descricao && (
                        <div className="text-xs text-gray-500 mt-1">{tipo.descricao}</div>
                      )}
                    </button>
                  ))}
                </div>
                {errors.tipo && (
                  <p className="text-red-600 text-sm mt-1">{errors.tipo}</p>
                )}
              </div>
            ) : (
              <div>Carregando formulário...</div>
            )}

            {/* Campos Globais */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Campos Globais (sempre presentes)</h3>
              
              {/* Título */}
              <div className="mb-4">
                <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  id="titulo"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.titulo ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Título do chamado"
                />
                {errors.titulo && (
                  <p className="text-red-600 text-sm mt-1">{errors.titulo}</p>
                )}
              </div>

              {/* Descrição */}
              <div className="mb-4">
                <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição *
                </label>
                <textarea
                  id="descricao"
                  name="descricao"
                  rows={4}
                  value={formData.descricao}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.descricao ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Descreva o problema ou solicitação..."
                />
                {errors.descricao && (
                  <p className="text-red-600 text-sm mt-1">{errors.descricao}</p>
                )}
              </div>

              {/* Imagens */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagens * (até 3)
                </label>
                
                {imagePreviews.length < 3 && (
                  <div className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-blue-400 transition ${
                    errors.url ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                      <Upload className="h-8 w-8 mb-2 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Clique para adicionar imagens ({imagePreviews.length}/3)
                      </span>
                    </label>
                  </div>
                )}
                
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200">
                          <Image
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Campos Customizados do Setor */}
            {formConfig && formConfig.camposCustomizados && formConfig.camposCustomizados.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  Campos Específicos do Setor {setorUsuario}
                </h3>
                <DynamicFormRenderer
                  formConfig={formConfig}
                  onDataChange={(dados) => setDadosFormulario(dados)}
                />
              </div>
            )}

            {/* URL */}
            <div className="border-t pt-6">
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                URL *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LinkIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="url"
                  id="url"
                  name="url"
                  value={formData.url}
                  onChange={handleChange}
                  className={`w-full pl-10 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.url ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="https://exemplo.com"
                />
              </div>
              {errors.url && (
                <p className="text-red-600 text-sm mt-1">{errors.url}</p>
              )}
            </div>

            {/* Botões */}
            <div className="flex gap-4 border-t pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
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
