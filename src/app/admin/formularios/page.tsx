'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { isAdminTI, getAdminSetor } from '@/lib/auth-helpers';
import { ArrowLeft } from 'lucide-react';
import { useFormConfig } from '@/hooks/useFormConfig';
import { FormConfig } from '@/types';
import FormBuilder from '@/components/FormBuilder';
import FormPreview from '@/components/FormPreview';

export default function FormulariosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showPreview, setShowPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Pegar o setor do admin
  const adminSetor = user ? getAdminSetor(user) : undefined;
  
  // Usar hook com localStorage
  const { formConfig, loading: loadingConfig, saveFormConfig } = useFormConfig(adminSetor);
  const [localFormConfig, setLocalFormConfig] = useState<FormConfig | null>(null);

  // Sincronizar config do hook com estado local
  useEffect(() => {
    if (formConfig) {
      setLocalFormConfig(formConfig);
    }
  }, [formConfig]);

  // Auto-save quando localFormConfig muda (com delay para evitar salvamentos frequentes)
  useEffect(() => {
    if (!localFormConfig) return;

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      saveFormConfig(localFormConfig);
      setSaveStatus('saved');
      
      // Limpar o status após 2 segundos
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000); // Salva 1 segundo após a última mudança

    return () => clearTimeout(timer);
  }, [localFormConfig, saveFormConfig]);

  // Verificações de acesso
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (!loading && user) {
      const adminSetor = getAdminSetor(user);
      if (!adminSetor && !isAdminTI(user)) {
        router.push('/admin');
        return;
      }
    }
  }, [loading, user, router]);


  if (loading || loadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || !localFormConfig) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Customizar Formulário
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Setor: <span className="font-medium">{adminSetor}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                {showPreview ? 'Editar' : 'Preview'}
              </button>
              
              {/* Indicador de status de salvamento */}
              <div className="flex items-center gap-2 text-sm">
                {saveStatus === 'saving' && (
                  <>
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                    <span className="text-gray-600">Salvando...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-green-600">Salvo</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showPreview ? (
          <FormPreview formConfig={localFormConfig} />
        ) : (
          <FormBuilder
            formConfig={localFormConfig}
            setFormConfig={setLocalFormConfig}
          />
        )}
      </div>
    </div>
  );
}
