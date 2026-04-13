'use client';

import { FormConfig } from '@/types';
import DynamicFormRenderer from './DynamicFormRenderer';

interface FormPreviewProps {
  formConfig: FormConfig;
}

export default function FormPreview({ formConfig }: FormPreviewProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Preview do Formulário
          </h2>
          <p className="text-gray-600">
            Setor: <span className="font-medium">{formConfig.setor}</span>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Esta é a visualização de como o formulário aparecerá para os usuários do setor.
          </p>
        </div>

        <div className="space-y-6 pt-6 border-t border-gray-200">
          {/* Tipo de Chamado (simulado) */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Tipo de Chamado
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {formConfig.tiposChamado.map((tipo) => (
                <button
                  key={tipo.id}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 text-left transition-colors cursor-pointer"
                >
                  <div className="font-medium text-gray-900">{tipo.nome}</div>
                  {tipo.descricao && (
                    <div className="text-sm text-gray-500 mt-1">{tipo.descricao}</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Campos Globais (simulado) */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Campos Globais (sempre presentes)
            </label>
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  placeholder="Título do chamado"
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição *
                </label>
                <textarea
                  placeholder="Descreva o problema..."
                  disabled
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagens
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center disabled opacity-50">
                  <p className="text-gray-500 text-sm">Até 3 imagens (PNG, JPG)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Campos Customizados */}
          {formConfig.camposCustomizados.length > 0 ? (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Campos Customizados do Setor
              </label>
              <DynamicFormRenderer
                formConfig={formConfig}
                isPreview={true}
              />
            </div>
          ) : (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-900 text-sm">
                ℹ️ Nenhum campo customizado adicionado ainda. O formulário usará apenas os campos globais.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
