#!/usr/bin/env node

require('dotenv').config({ path: '.env.migration' });

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const parsePrivateKey = (key) => {
  if (typeof key === 'string') {
    try {
      return JSON.parse(`"${key}"`).replace(/\\n/g, '\n');
    } catch (e) {
      return key.replace(/\\n/g, '\n');
    }
  }
  return key;
};

try {
  console.log('\n🔐 PREPARANDO PARA DEPLOY DAS FIRESTORE RULES\n');
  console.log('============================================\n');

  // Criar arquivo de service account temporário
  const serviceAccountPath = path.join(__dirname, '..', 'sa-key.json');
  
  const serviceAccountConfig = {
    type: 'service_account',
    project_id: 'chamadosmcnew',
    private_key_id: process.env.TARGET_PRIVATE_KEY_ID,
    private_key: parsePrivateKey(process.env.TARGET_PRIVATE_KEY),
    client_email: process.env.TARGET_CLIENT_EMAIL,
    client_id: process.env.TARGET_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.TARGET_CLIENT_CERT_URL,
  };

  fs.writeFileSync(serviceAccountPath, JSON.stringify(serviceAccountConfig, null, 2));
  console.log('✅ Arquivo de credenciais criado\n');

  // Configurar variável de ambiente
  process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;

  console.log('📤 Fazendo deploy das Firestore Rules...\n');

  // Executar firebase deploy
  const projectPath = path.join(__dirname, '..');
  const result = execSync('firebase deploy --only firestore:rules', {
    cwd: projectPath,
    env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: serviceAccountPath },
    encoding: 'utf8'
  });

  console.log(result);

  // Deletar arquivo de credenciais após deploy
  setTimeout(() => {
    if (fs.existsSync(serviceAccountPath)) {
      fs.unlinkSync(serviceAccountPath);
      console.log('🧹 Arquivo de credenciais removido (segurança)\n');
    }
  }, 1000);

  console.log('✅ DEPLOY CONCLUÍDO COM SUCESSO!\n');
  console.log('🧪 Próximos passos:\n');
  console.log('1. Volte ao navegador em http://localhost:3002');
  console.log('2. Atualize a página (F5 ou Ctrl+R)');
  console.log('3. Faça login com:');
  console.log('   Email: teste@meucurso.com');
  console.log('   Senha: Teste@12345\n');
  console.log('4. Agora deve funcionar perfeitamente!\n');

  process.exit(0);
} catch (error) {
  console.error('\n❌ ERRO no deploy:\n');
  console.error(error.message);

  // Limpar arquivo de credenciais em caso de erro
  const serviceAccountPath = path.join(__dirname, '..', 'sa-key.json');
  if (fs.existsSync(serviceAccountPath)) {
    fs.unlinkSync(serviceAccountPath);
  }

  console.log('\n📋 SOLUÇÃO ALTERNATIVA (Manual):\n');
  console.log('Se o deploy automático não funcionar:\n');
  console.log('1. Acesse: https://console.firebase.google.com/');
  console.log('2. Selecione projeto: chamadosmcnew');
  console.log('3. Vá para: Firestore Database → Rules');
  console.log('4. Clique em "Editar Rules"');
  console.log('5. Limpe e cole:\n');

  const rulesPath = path.join(__dirname, '..', 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');
  console.log(rulesContent);
  console.log('\n6. Clique em "Publicar"\n');

  process.exit(1);
}
