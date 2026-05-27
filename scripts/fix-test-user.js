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

// Inicializar Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(targetConfig),
    projectId: 'chamadosmcnew'
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function fixTestUserDocument() {
  try {
    console.log('\n🔧 CORRIGINDO DOCUMENTO DE USUÁRIO\n');
    console.log('===================================\n');

    const testEmail = 'teste@meucurso.com';

    // Obter usuário do Auth para ter o UID correto
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(testEmail);
      console.log(`✅ Usuário encontrado no Firebase Auth`);
      console.log(`   UID: ${userRecord.uid}\n`);
    } catch (err) {
      console.error(`❌ Usuário ${testEmail} não encontrado no Auth`);
      process.exit(1);
    }

    // Atualizar documento com os campos corretos
    const userData = {
      email: testEmail,
      nome: 'Usuário Teste',  // Campo correto (não displayName)
      setor: 'TI',             // Campo obrigatório
      cpf: '000.000.000-00',   // Campo obrigatório
      role: 'user',
      createdAt: admin.firestore.Timestamp.now(),
    };

    console.log(`📝 Atualizando documento com campos corretos:\n`);
    console.log(`   Coleção: users`);
    console.log(`   Documento ID: ${userRecord.uid}`);
    console.log(`   Campos:\n`);
    Object.entries(userData).forEach(([key, value]) => {
      console.log(`     - ${key}: ${JSON.stringify(value)}`);
    });
    console.log();

    await db.collection('users').doc(userRecord.uid).update(userData);

    console.log('✅ DOCUMENTO ATUALIZADO COM SUCESSO!\n');

    console.log('🧪 PRÓXIMOS PASSOS:\n');
    console.log(`1. Volte ao navegador em http://localhost:3002`);
    console.log(`2. Atualize a página (F5 ou Ctrl+R)`);
    console.log(`3. Faça login com:`);
    console.log(`   Email: ${testEmail}`);
    console.log(`   Senha: Teste@12345\n`);
    console.log(`4. Agora deve funcionar corretamente!\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERRO ao atualizar documento de usuário:\n');
    console.error(error.message);
    if (error.code) {
      console.error('Código:', error.code);
    }
    process.exit(1);
  }
}

fixTestUserDocument();
