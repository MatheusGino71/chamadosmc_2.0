'use client';

import { useState } from 'react';
import { TipoChamado } from '@/types';
import { Plus, Trash2, Edit2 } from 'lucide-react';

interface TipoChamadoManagerProps {
  tiposChamado: TipoChamado[];
  onChange: (tipos: TipoChamado[]) => void;
}

export default function TipoChamadoManager({
  tiposChamado,
  onChange,
}: TipoChamadoManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState('');
  const [editingDescricao, setEditingDescricao] = useState('');
  const [newNome, setNewNome] = useState('');
  const [newDescricao, setNewDescricao] = useState('');

  const handleAddTipo = () => {
    if (!newNome.trim()) {
      alert('Nome do tipo é obrigatório');
      return;
    }

    const newTipo: TipoChamado = {
      id: `tipo_${Date.now()}`,
      nome: newNome.trim(),
      descricao: newDescricao || undefined,
    };

    onChange([...tiposChamado, newTipo]);
    setNewNome('');
    setNewDescricao('');
  };

  const handleEditStart = (tipo: TipoChamado) => {
    setEditingId(tipo.id);
    setEditingNome(tipo.nome);
    setEditingDescricao(tipo.descricao || '');
  };

  const handleEditSave = (id: string) => {
    const updated = tiposChamado.map((t) =>
      t.id === id
        ? {
            ...t,
            nome: editingNome.trim(),
            descricao: editingDescricao || undefined,
          }
        : t
    );
    onChange(updated);
    setEditingId(null);
    setEditingNome('');
    setEditingDescricao('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar este tipo de chamado?')) {
      onChange(tiposChamado.filter((t) => t.id !== id));
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Lista de tipos existentes */}
      {tiposChamado.length > 0 && (
        <div className="space-y-2">
          {tiposChamado.map((tipo) => (
            <div key={tipo.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {editingId === tipo.id ? (
                <>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={editingNome}
                      onChange={(e) => setEditingNome(e.target.value)}
                      placeholder="Nome do tipo"
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="text"
                      value={editingDescricao}
                      onChange={(e) => setEditingDescricao(e.target.value)}
                      placeholder="Descrição (opcional)"
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditSave(tipo.id)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{tipo.nome}</div>
                    {tipo.descricao && (
                      <div className="text-sm text-gray-600">{tipo.descricao}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleEditStart(tipo)}
                    className="p-2 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tipo.id)}
                    className="p-2 hover:bg-red-100 text-red-600 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formulário para adicionar novo tipo */}
      <div className="border-t border-gray-200 pt-4 space-y-3">
        <h3 className="font-medium text-gray-900">Novo Tipo de Chamado</h3>
        <div>
          <input
            type="text"
            value={newNome}
            onChange={(e) => setNewNome(e.target.value)}
            placeholder="Nome do tipo (ex: Dúvida de Aluno)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
        <div>
          <input
            type="text"
            value={newDescricao}
            onChange={(e) => setNewDescricao(e.target.value)}
            placeholder="Descrição (opcional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
        <button
          onClick={handleAddTipo}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Tipo
        </button>
      </div>
    </div>
  );
}
