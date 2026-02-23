'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateTicketId } from '@/lib/ticketId';
import { ArrowLeft, Upload, X, Link as LinkIcon, Bug, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

const setores = [
  'Financeiro',
  'TI',
  'RH',
  'Marketing',
  'Comercial',
  'Sucesso do Aluno',
  'Diretoria',
  'Pedagógico',
  'Outros'
];

const sistemas = [
  'BIPE',
  'Área do Aluno',
  'Ecommerce',
  'Outros'
];

export default function NovoChamadoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    setor: '',
    sistema: '',
    tipoSolicitacao: '',
    cpf: '',
    url: '',
    tipo: '' as 'bug' | 'melhoria' | '',
  });
  const [imageBase64, setImageBase64] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [documentBase64, setDocumentBase64] = useState<string>('');
  const [documentName, setDocumentName] = useState<string>('');
  const [showBugModal, setShowBugModal] = useState(false);
  const [showMelhoriaModal, setShowMelhoriaModal] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Valida tipo de arquivo
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione uma imagem válida');
        return;
      }
      
      // Valida tamanho (máx 2MB para base64)
      if (file.size > 2 * 1024 * 1024) {
        setError('A imagem deve ter no máximo 2MB');
        return;
      }

      setError('');
      
      // Converte para base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImageBase64(base64String);
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageBase64('');
    setImagePreview('');
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Valida tamanho (máx 5MB para documentos)
      if (file.size > 5 * 1024 * 1024) {
        setError('O documento deve ter no máximo 5MB');
        return;
      }

      // Valida tipo de arquivo (documentos comuns)
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setError('Tipo de arquivo não permitido. Use PDF, DOC, DOCX, XLS, XLSX ou TXT');
        return;
      }

      setError('');
      
      // Converte para base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setDocumentBase64(base64String);
        setDocumentName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeDocument = () => {
    setDocumentBase64('');
    setDocumentName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.tipo) {
      const errorMsg = 'Por favor, selecione o tipo (Bug ou Melhoria)';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (formData.descricao.length < 200) {
      const errorMsg = 'A descrição deve ter no mínimo 200 caracteres';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (!imageBase64) {
      const errorMsg = 'Por favor, selecione uma imagem';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Gera ID único do chamado
      const ticketId = await generateTicketId();

      // Cria o chamado no Firestore
      await addDoc(collection(db, 'tickets'), {
        ticketId,
        titulo: formData.titulo,
        descricao: formData.descricao,
        tipo: formData.tipo,
        setor: formData.setor,
        sistema: formData.sistema,
        tipoSolicitacao: formData.tipoSolicitacao || '',
        cpf: formData.cpf || '',
        imageBase64: imageBase64 || '',
        url: formData.url || '',
        documentBase64: documentBase64 || '',
        documentName: documentName || '',
        userId: user.uid,
        userName: user.nome,
        userEmail: user.email,
        status: 'aberto',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      toast.success('Chamado criado com sucesso!');
      // Redireciona para o dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Erro ao criar chamado:', err);
      const errorMsg = 'Erro ao criar chamado. Tente novamente.';
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

            <div>
              <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">
                Título do Chamado *
              </label>
              <input
                type="text"
                id="titulo"
                name="titulo"
                required
                value={formData.titulo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Ex: Problema com acesso ao sistema"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'bug' })}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg transition ${
                      formData.tipo === 'bug'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
                    }`}
                  >
                    <Bug className="h-5 w-5" />
                    <span className="font-medium">Bug</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBugModal(true)}
                    className="text-xs text-gray-500 hover:text-primary-600 underline mt-1 w-full text-center"
                  >
                    Não sabe o que é um bug? Clique aqui
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'melhoria' })}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg transition ${
                      formData.tipo === 'melhoria'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    <Sparkles className="h-5 w-5" />
                    <span className="font-medium">Melhoria</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMelhoriaModal(true)}
                    className="text-xs text-gray-500 hover:text-primary-600 underline mt-1 w-full text-center"
                  >
                    Não sabe o que é melhoria? Clique aqui
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="setor" className="block text-sm font-medium text-gray-700 mb-1">
                Setor *
              </label>
              <select
                id="setor"
                name="setor"
                required
                value={formData.setor}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Selecione um setor</option>
                {setores.map((setor) => (
                  <option key={setor} value={setor}>
                    {setor}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sistema" className="block text-sm font-medium text-gray-700 mb-1">
                Para qual sistema? *
              </label>
              <select
                id="sistema"
                name="sistema"
                required
                value={formData.sistema}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Selecione um sistema</option>
                {sistemas.map((sistema) => (
                  <option key={sistema} value={sistema}>
                    {sistema}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo Tipo de Solicitação - aparece apenas para sistemas específicos */}
            {(formData.sistema === 'BIPE' || formData.sistema === 'Área do Aluno') && (
              <div>
                <label htmlFor="tipoSolicitacao" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Solicitação *
                </label>
                <select
                  id="tipoSolicitacao"
                  name="tipoSolicitacao"
                  required
                  value={formData.tipoSolicitacao}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Selecione o tipo</option>
                  <option value="Solicitar uma Base">Solicitar uma Base</option>
                  <option value="Criação de conta">Criação de conta</option>
                </select>
              </div>
            )}

            {/* Campo CPF - aparece apenas quando seleciona "Criação de conta" */}
            {formData.tipoSolicitacao === 'Criação de conta' && (
              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">
                  CPF *
                </label>
                <input
                  type="text"
                  id="cpf"
                  name="cpf"
                  required
                  maxLength={14}
                  value={formData.cpf}
                  onChange={(e) => {
                    // Formata CPF automaticamente
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 11) {
                      value = value.replace(/(\d{3})(\d)/, '$1.$2');
                      value = value.replace(/(\d{3})(\d)/, '$1.$2');
                      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                    }
                    setFormData({ ...formData, cpf: value });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="000.000.000-00"
                />
              </div>
            )}

            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição *
              </label>
              <textarea
                id="descricao"
                name="descricao"
                required
                rows={6}
                minLength={200}
                value={formData.descricao}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Descreva o problema ou solicitação com o máximo de detalhes possível..."
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.descricao.length}/200 caracteres mínimos
              </p>
            </div>

            <div>
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
                  required
                  value={formData.url}
                  onChange={handleChange}
                  className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://exemplo.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagem *
              </label>
              
              {!imagePreview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                    required
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-12 w-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      Clique para selecionar uma imagem
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      PNG, JPG até 2MB (será convertida em Base64)
                    </span>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-gray-200">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      fill
                      sizes="600px"
                      className="object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Documento (Opcional)
              </label>
              
              {!documentName ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={handleDocumentChange}
                    className="hidden"
                    id="document-upload"
                  />
                  <label
                    htmlFor="document-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-12 w-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      Clique para anexar um documento
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      PDF, DOC, DOCX, XLS, XLSX, TXT até 5MB
                    </span>
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 rounded">
                      <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{documentName}</p>
                      <p className="text-xs text-gray-500">Documento anexado</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeDocument}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-4">
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
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Criando...' : 'Criar Chamado'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Modal Explicativo sobre Bug */}
      {showBugModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Bug className="h-6 w-6 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">O que é um Bug?</h2>
                </div>
                <button
                  onClick={() => setShowBugModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  Um <strong>bug</strong> é um erro, falha ou defeito em um software ou sistema que faz com que ele funcione de maneira inesperada ou não desejada. Esses erros podem ser causados por diversas razões, como erros humanos, conflitos de software ou falhas de hardware.
                </p>
                
                <p className="text-gray-700 leading-relaxed mt-4">
                  A origem do termo remonta ao século XIX, quando foi utilizado para descrever falhas em máquinas mecânicas, e se popularizou na área da computação, especialmente com a cientista <strong>Grace Hopper</strong>, que identificou um bug em um computador em 1947.
                </p>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Exemplos de Bugs:</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Botão que não funciona quando clicado</li>
                    <li>• Tela que trava ou fecha inesperadamente</li>
                    <li>• Informações que aparecem incorretamente</li>
                    <li>• Erro ao tentar salvar ou enviar dados</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowBugModal(false)}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Explicativo sobre Melhoria */}
      {showMelhoriaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Sparkles className="h-6 w-6 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">O que é uma Melhoria?</h2>
                </div>
                <button
                  onClick={() => setShowMelhoriaModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  A <strong>melhoria sistêmica</strong> refere-se à implementação de uma abordagem que considera a interdependência e interconexão de todos os elementos de um sistema. Essa abordagem é utilizada para entender como as partes de um sistema se relacionam e como essas relações influenciam o funcionamento do todo.
                </p>
                
                <p className="text-gray-700 leading-relaxed mt-4">
                  A melhoria sistêmica é aplicada em diversas áreas, como administração, psicologia, ecologia e engenharia, e é fundamental para resolver problemas de forma mais eficaz e promover uma gestão mais eficiente.
                </p>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Exemplos de Melhorias:</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Adicionar nova funcionalidade ao sistema</li>
                    <li>• Otimizar processos existentes</li>
                    <li>• Melhorar a experiência do usuário</li>
                    <li>• Aumentar a eficiência de operações</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowMelhoriaModal(false)}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
