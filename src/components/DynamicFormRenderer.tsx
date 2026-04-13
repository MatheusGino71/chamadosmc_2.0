'use client';

import { FormConfig } from '@/types';
import { useState } from 'react';

interface DynamicFormRendererProps {
  formConfig: FormConfig;
  onDataChange?: (dados: Record<string, any>) => void;
  isPreview?: boolean;
}

export default function DynamicFormRenderer({
  formConfig,
  onDataChange,
  isPreview = false,
}: DynamicFormRendererProps) {
  const [dados, setDados] = useState<Record<string, any>>({});

  const handleChange = (fieldId: string, value: any) => {
    const newDados = { ...dados, [fieldId]: value };
    setDados(newDados);
    onDataChange?.(newDados);
  };

  if (!formConfig.camposCustomizados || formConfig.camposCustomizados.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {formConfig.camposCustomizados
        .sort((a, b) => a.ordem - b.ordem)
        .map((campo) => (
          <div key={campo.id}>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {campo.nome}
              {campo.obrigatorio && <span className="text-red-600 ml-1">*</span>}
            </label>

            {campo.descricao && (
              <p className="text-xs text-gray-600 mb-2">{campo.descricao}</p>
            )}

            {/* Campos de texto */}
            {campo.tipo === 'text' && (
              <input
                type="text"
                disabled={isPreview}
                value={dados[campo.id] || ''}
                onChange={(e) => handleChange(campo.id, e.target.value)}
                placeholder={campo.placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              />
            )}

            {/* Email */}
            {campo.tipo === 'email' && (
              <input
                type="email"
                disabled={isPreview}
                value={dados[campo.id] || ''}
                onChange={(e) => handleChange(campo.id, e.target.value)}
                placeholder={campo.placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              />
            )}

            {/* Número */}
            {campo.tipo === 'number' && (
              <input
                type="number"
                disabled={isPreview}
                value={dados[campo.id] || ''}
                onChange={(e) => handleChange(campo.id, e.target.value)}
                placeholder={campo.placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              />
            )}

            {/* Telefone */}
            {campo.tipo === 'tel' && (
              <input
                type="tel"
                disabled={isPreview}
                value={dados[campo.id] || ''}
                onChange={(e) => handleChange(campo.id, e.target.value)}
                placeholder={campo.placeholder || '(00) 00000-0000'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              />
            )}

            {/* Data */}
            {campo.tipo === 'date' && (
              <input
                type="date"
                disabled={isPreview}
                value={dados[campo.id] || ''}
                onChange={(e) => handleChange(campo.id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              />
            )}

            {/* Textarea */}
            {campo.tipo === 'textarea' && (
              <textarea
                disabled={isPreview}
                value={dados[campo.id] || ''}
                onChange={(e) => handleChange(campo.id, e.target.value)}
                placeholder={campo.placeholder}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              />
            )}

            {/* Select */}
            {campo.tipo === 'select' && (
              <select
                disabled={isPreview}
                value={dados[campo.id] || ''}
                onChange={(e) => handleChange(campo.id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">
                  {campo.placeholder || 'Selecione uma opção'}
                </option>
                {campo.opcoes?.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            )}

            {/* Checkbox */}
            {campo.tipo === 'checkbox' && (
              <div className="space-y-2">
                {campo.opcoes?.map((opcao) => (
                  <label key={opcao} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={isPreview}
                      checked={
                        Array.isArray(dados[campo.id])
                          ? dados[campo.id].includes(opcao)
                          : false
                      }
                      onChange={(e) => {
                        const currentArray = Array.isArray(dados[campo.id])
                          ? dados[campo.id]
                          : [];
                        const newArray = e.target.checked
                          ? [...currentArray, opcao]
                          : currentArray.filter((item) => item !== opcao);
                        handleChange(campo.id, newArray);
                      }}
                      className="w-4 h-4 border border-gray-300 rounded disabled:bg-gray-100"
                    />
                    <span className="text-sm text-gray-700">{opcao}</span>
                  </label>
                ))}
              </div>
            )}

            {/* File */}
            {campo.tipo === 'file' && (
              <input
                type="file"
                disabled={isPreview}
                onChange={(e) => handleChange(campo.id, e.target.files?.[0])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              />
            )}
          </div>
        ))}
    </div>
  );
}
