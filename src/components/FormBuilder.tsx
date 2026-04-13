'use client';

import { useState } from 'react';
import { FormConfig, FormField, TipoChamado, FormFieldType } from '@/types';
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import FieldEditor from './FieldEditor';
import TipoChamadoManager from './TipoChamadoManager';

interface FormBuilderProps {
  formConfig: FormConfig;
  setFormConfig: (config: FormConfig) => void;
}

export default function FormBuilder({ formConfig, setFormConfig }: FormBuilderProps) {
  const [expandedSection, setExpandedSection] = useState<'tipos' | 'campos' | null>('tipos');
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);

  const handleAddField = () => {
    setEditingField(null);
    setShowFieldEditor(true);
  };

  const handleEditField = (field: FormField) => {
    setEditingField(field);
    setShowFieldEditor(true);
  };

  const handleSaveField = (field: FormField) => {
    const campos = formConfig.camposCustomizados || [];
    
    if (editingField) {
      // Editando campo existente
      const updatedCampos = campos.map((c) =>
        c.id === editingField.id ? field : c
      );
      setFormConfig({ ...formConfig, camposCustomizados: updatedCampos });
    } else {
      // Criando novo campo
      const newField = {
        ...field,
        id: `field_${Date.now()}`,
        ordem: campos.length,
      };
      setFormConfig({ ...formConfig, camposCustomizados: [...campos, newField] });
    }

    setShowFieldEditor(false);
    setEditingField(null);
  };

  const handleDeleteField = (fieldId: string) => {
    const updatedCampos = formConfig.camposCustomizados.filter(
      (campo) => campo.id !== fieldId
    );
    setFormConfig({ ...formConfig, camposCustomizados: updatedCampos });
  };

  const handleReorderFields = (index: number, direction: 'up' | 'down') => {
    const campos = [...formConfig.camposCustomizados];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= campos.length) return;

    [campos[index], campos[newIndex]] = [campos[newIndex], campos[index]];

    // Atualizar ordem
    const updatedCampos = campos.map((c, i) => ({ ...c, ordem: i }));
    setFormConfig({ ...formConfig, camposCustomizados: updatedCampos });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Tipos de Chamado */}
      <div className="lg:col-span-2">
        <button
          onClick={() =>
            setExpandedSection(expandedSection === 'tipos' ? null : 'tipos')
          }
          className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Tipos de Chamado
          </h2>
          {expandedSection === 'tipos' ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {expandedSection === 'tipos' && (
          <div className="mt-2 bg-white border border-gray-200 rounded-lg overflow-hidden">
            <TipoChamadoManager
              tiposChamado={formConfig.tiposChamado}
              onChange={(tiposChamado) =>
                setFormConfig({ ...formConfig, tiposChamado })
              }
            />
          </div>
        )}
      </div>

      {/* Campos Customizados */}
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() =>
              setExpandedSection(expandedSection === 'campos' ? null : 'campos')
            }
            className="flex-1 flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Campos Customizados
            </h2>
            {expandedSection === 'campos' ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>

        {expandedSection === 'campos' && (
          <div className="space-y-3">
            {formConfig.camposCustomizados.length === 0 ? (
              <div className="p-6 bg-white border border-dashed border-gray-300 rounded-lg text-center">
                <p className="text-gray-500 mb-4">
                  Nenhum campo customizado ainda. Crie o primeiro para começar!
                </p>
                <button
                  onClick={handleAddField}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Novo Campo
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {formConfig.camposCustomizados.map((campo, index) => (
                    <div
                      key={campo.id}
                      className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {campo.nome}
                          </span>
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            {campo.tipo}
                          </span>
                          {campo.obrigatorio && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                              Obrigatório
                            </span>
                          )}
                        </div>
                        {campo.descricao && (
                          <p className="text-sm text-gray-500 mt-1">
                            {campo.descricao}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleReorderFields(index, 'up')
                          }
                          disabled={index === 0}
                          className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                          title="Mover para cima"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleReorderFields(index, 'down')
                          }
                          disabled={index === formConfig.camposCustomizados.length - 1}
                          className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                          title="Mover para baixo"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditField(campo)}
                          className="p-2 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteField(campo.id)}
                          className="p-2 hover:bg-red-100 text-red-600 rounded transition-colors"
                          title="Deletar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleAddField}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Campo
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Field Editor Modal */}
      {showFieldEditor && (
        <FieldEditor
          field={editingField}
          onSave={handleSaveField}
          onCancel={() => {
            setShowFieldEditor(false);
            setEditingField(null);
          }}
        />
      )}
    </div>
  );
}
