'use client';

export default function DiagnosticoPage() {
  const envVars = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✓ Configurado' : '✗ Ausente',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✓ Configurado' : '✗ Ausente',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✓ Configurado' : '✗ Ausente',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✓ Configurado' : '✗ Ausente',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '✓ Configurado' : '✗ Ausente',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '✓ Configurado' : '✗ Ausente',
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Diagnóstico do Sistema</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Variáveis de Ambiente</h2>
          <div className="space-y-2">
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="font-mono text-sm">{key}:</span>
                <span className={value.includes('✓') ? 'text-green-400' : 'text-red-400'}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Informações do Ambiente</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>NODE_ENV:</span>
              <span className="font-mono text-sm">{process.env.NODE_ENV}</span>
            </div>
            <div className="flex justify-between">
              <span>Navegador:</span>
              <span className="font-mono text-sm">{typeof window !== 'undefined' ? 'Cliente' : 'Servidor'}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Teste de Conexão</h2>
          <p className="text-gray-400">
            Se todas as variáveis estão configuradas mas o login não funciona, 
            verifique as regras do Firestore e a configuração de autenticação no Firebase Console.
          </p>
        </div>

        <a
          href="/"
          className="mt-6 inline-block bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Voltar ao Login
        </a>
      </div>
    </div>
  );
}
