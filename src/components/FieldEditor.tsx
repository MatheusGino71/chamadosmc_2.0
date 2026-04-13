'use client';

import { useState, useEffect } from 'react';
import { FormField, FormFieldType } from '@/types';
import { X } from 'lucide-react';

interface FieldEditorProps {
  field: FormField | null;
  onSave: (field: FormField) => void;
  onCancel: () => void;
}

const FIELD_TYPES: { value: FormFieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Texto', description: 'Campo de texto curto' },
  { value: 'textarea', label: 'Área de Texto', description: 'Texto longo com múltiplas linhas' },
  { value: 'email', label: 'E-mail', description: 'Campo validado para e-mail' },
  { value: 'number', label: 'Número', description: 'Campo numérico' },
  { value: 'tel', label: 'Telefone', description: 'Campo para telefone' },
  { value: 'date', label: 'Data', description: 'Seletor de data' },
  { value: 'select', label: 'Seleção', description: 'Dropdown com opções' },
  { value: 'checkbox', label: 'Checkbox', description: 'Verdadeiro/Falso' },
  { value: 'file', label: 'Arquivo', description: 'Upload de arquivo' },
];

export default function FieldEditor({ field, onSave, onCancel }: FieldEditorProps) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<FormFieldType>('text');
  const [descricao, setDescricao] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [obrigatorio, setObrigatorio] = useState(false);
  const [opcoes, setOpcoes] = useState<string[]>([]);
  const [validacao, setValidacao] = useState<{
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    customMessage?: string;
  }>({});

  useEffect(() => {
    if (field) {
      setNome(field.nome);
      setTipo(field.tipo);
      setDescricao(field.descricao || '');
      setPlaceholder(field.placeholder || '');
      setObrigatorio(field.obrigatorio);
      setOpcoes(field.opcoes || []);
      setValidacao(field.validacao || {});
    }
  }, [field]);

  const handleSave = () => {
    if (!nome.trim()) {
      alert('Nome do campo é obrigatório');
      return;
    }

    const newField: FormField = {
      id: field?.id || `field_${Date.now()}`,
      nome: nome.trim(),
      tipo,
      obrigatorio,
      placeholder: placeholder || undefined,
      descricao: descricao || undefined,
      opcoes: (tipo === 'select' || tipo === 'checkbox') && opcoes.length > 0 ? opcoes : undefined,
      validacao: Object.keys(validacao).length > 0 ? validacao : undefined,
      ordem: field?.ordem || 0,
    };

    onSave(newField);
  };

  const handleAddOpcao = () => {
    setOpcoes([...opcoes, '']);
  };

  const handleUpdateOpcao = (index: number, value: string) => {
    const newOpcoes = [...opcoes];
    newOpcoes[index] = value;
    setOpcoes(newOpcoes);
  };

  const handleRemoveOpcao = (index: number) => {
    setOpcoes(opcoes.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {field ? 'Editar Campo' : 'Novo Campo'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Nome do Campo */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Nome do Campo *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: ID do Aluno"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Tipo de Campo */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Tipo de Campo *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FIELD_TYPES.map((fieldType) => (
                <button
                  key={fieldType.value}
                  onClick={() => {
                    setTipo(fieldType.value);
                    if (fieldType.value !== 'select' && fieldType.value !== 'checkbox') {
                      setOpcoes([]);
                    }
                  }}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    tipo === fieldType.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{fieldType.label}</div>
                  <div className="text-sm text-gray-500">{fieldType.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Descrição (Opcional)
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição adicional mostrada para o usuário"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Placeholder */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Placeholder
            </label>
            <input
              type="text"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="Ex: Digite aqui..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Obrigatório */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="obrigatorio"
              checked={obrigatorio}
              onChange={(e) => setObrigatorio(e.target.checked)}
              className="w-4 h-4 border border-gray-300 rounded"
            />
            <label htmlFor="obrigatorio" className="text-sm font-medium text-gray-900">
              Campo Obrigatório
            </label>
          </div>

          {/* Opções (para select/checkbox) */}
          {(tipo === 'select' || tipo === 'checkbox') && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Opções
              </label>
              <div className="space-y-2">
                {opcoes.map((opcao, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={opcao}
                      onChange={(e) => handleUpdateOpcao(index, e.target.value)}
                      placeholder={`Opção ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleRemoveOpcao(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddOpcao}
                  className="w-full px-3 py-2 border border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-gray-400 transition-colors"
                >
                  + Adicionar Opção
                </button>
              </div>
            </div>
          )}

          {/* Validação */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Regras de Validação (Opcional)
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Min. Caracteres
                  </label>
                  <input
                    type="number"
                    value={validacao.minLength || ''}
                    onChange={(e) =>
                      setValidacao({
                        ...validacao,
                        minLength: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Máx. Caracteres
                  </label>
                  <input
                    type="number"
                    value={validacao.maxLength || ''}
                    onChange={(e) =>
                      setValidacao({
                        ...validacao,
                        maxLength: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Validação por Regex (Padrão)
                </label>
                <input
                  type="text"
                  value={validacao.pattern || ''}
                  onChange={(e) =>
                    setValidacao({
                      ...validacao,
                      pattern: e.target.value || undefined,
                    })
                  }
                  placeholder="Ex: ^[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}$ (para CPF)"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Mensagem de Erro Personalizada
                </label>
                <input
                  type="text"
                  value={validacao.customMessage || ''}
                  onChange={(e) =>
                    setValidacao({
                      ...validacao,
                      customMessage: e.target.value || undefined,
                    })
                  }
                  placeholder="Ex: CPF inválido"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
          >
            {field ? 'Atualizar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}
