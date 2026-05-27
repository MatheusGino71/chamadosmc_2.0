#!/usr/bin/env node

require('dotenv').config({ path: '.env.migration' });

const admin = require('firebase-admin');

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

// Configurar credenciais do Firebase Admin
const targetConfig = {
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

// Inicializar Firebase Admin para o projeto de destino
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(targetConfig),
    projectId: 'chamadosmcnew'
  });
}

const auth = admin.auth();

async function createTestUser() {
  try {
    console.log('\n🧪 CRIANDO USUÁRIO DE TESTE NO FIREBASE AUTH\n');
    console.log('================================================\n');

    const testEmail = 'teste@meucurso.com';
    const testPassword = 'Teste@12345';
    const testDisplayName = 'Usuário Teste';

    // Tentar excluir usuário se já existir
    try {
      const existingUser = await auth.getUserByEmail(testEmail);
      console.log(`⚠️  Usuário ${testEmail} já existe. Deletando...`);
      await auth.deleteUser(existingUser.uid);
      console.log('✅ Usuário anterior deletado\n');
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        console.log(`✅ Usuário ${testEmail} não existe (novo)\n`);
      } else {
        throw err;
      }
    }

    // Criar novo usuário
    console.log(`📝 Criando usuário com:\n`);
    console.log(`   Email: ${testEmail}`);
    console.log(`   Senha: ${testPassword}`);
    console.log(`   Nome: ${testDisplayName}\n`);

    const userRecord = await auth.createUser({
      email: testEmail,
      password: testPassword,
      displayName: testDisplayName,
      emailVerified: true,
    });

    console.log('✅ USUÁRIO CRIADO COM SUCESSO!\n');
    console.log(`📋 Detalhes:\n`);
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Email: ${userRecord.email}`);
    console.log(`   Nome: ${userRecord.displayName}`);
    console.log(`   Email Verificado: ${userRecord.emailVerified}\n`);

    console.log('🧪 PRÓXIMOS PASSOS:\n');
    console.log(`1. Acesse http://localhost:3002/login`);
    console.log(`2. Use as credenciais:\n`);
    console.log(`   Email: ${testEmail}`);
    console.log(`   Senha: ${testPassword}\n`);
    console.log(`3. Você deve conseguir fazer login com sucesso\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERRO ao criar usuário de teste:\n');
    console.error(error.message);
    console.error('\n' + error.code);
    process.exit(1);
  }
}

createTestUser();
