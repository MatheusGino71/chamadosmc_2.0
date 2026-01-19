'use client';

import { useState } from 'react';
import { X, Upload, Link as LinkIcon, Bug, Sparkles, Loader } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateTicketId } from '@/lib/ticketId';
import { toast } from 'sonner';
import Image from 'next/image';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  userName?: string;
}

const setores = [
  'Financeiro',
  'TI',
  'RH',
  'Marketing',
  'Comercial',
  'Sucesso do Aluno',
  'Diretoria',
  'Outros'
];

const sistemas = [
  'BIPE',
  'Área do Aluno',
  'Ecommerce'
];

export default function CreateTicketModal({ isOpen, onClose, userId, userEmail, userName }: CreateTicketModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    setor: '',
    sistema: '',
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
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem válida');
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB');
        return;
      }

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
      if (file.size > 5 * 1024 * 1024) {
        toast.error('O documento deve ter no máximo 5MB');
        return;
      }

      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de arquivo não permitido. Use PDF, DOC, DOCX, XLS, XLSX ou TXT');
        return;
      }

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

    if (!formData.tipo) {
      toast.error('Por favor, selecione o tipo (Bug ou Melhoria)');
      return;
    }

    if (formData.descricao.length < 200) {
      toast.error('A descrição deve ter no mínimo 200 caracteres');
      return;
    }

    if (!imageBase64) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    setLoading(true);

    try {
      const ticketId = await generateTicketId();

      await addDoc(collection(db, 'tickets'), {
        ticketId,
        titulo: formData.titulo,
        descricao: formData.descricao,
        tipo: formData.tipo,
        setor: formData.setor,
        sistema: formData.sistema,
        imageBase64: imageBase64 || '',
        url: formData.url || '',
        documentBase64: documentBase64 || '',
        documentName: documentName || '',
        userId,
        userName: userName || '',
        userEmail,
        status: 'aberto',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      toast.success('Chamado criado com sucesso!');
      
      // Limpar form
      setFormData({
        titulo: '',
        descricao: '',
        setor: '',
        sistema: '',
        url: '',
        tipo: '',
      });
      setImageBase64('');
      setImagePreview('');
      setDocumentBase64('');
      setDocumentName('');
      
      onClose();
    } catch (error) {
      console.error('Erro ao criar chamado:', error);
      toast.error('Erro ao criar chamado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-800">Novo Chamado</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full p-1"
            aria-label="Fechar modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                    className="object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition"
                  aria-label="Remover imagem"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Documento (opcional)
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
                    Clique para selecionar um documento
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PDF, DOC, DOCX, XLS, XLSX ou TXT até 5MB
                  </span>
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm text-gray-700">{documentName}</span>
                <button
                  type="button"
                  onClick={removeDocument}
                  className="text-red-500 hover:text-red-700"
                  aria-label="Remover documento"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Chamado'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal Explicativo sobre Bug */}
      {showBugModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
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
