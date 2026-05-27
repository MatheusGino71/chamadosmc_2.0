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

async function createTestUserDocument() {
  try {
    console.log('\n📝 CRIANDO DOCUMENTO DE USUÁRIO NO FIRESTORE\n');
    console.log('============================================\n');

    const testEmail = 'teste@meucurso.com';
    const testUid = '5SBIil8g8kMUqlLtQfCHnR21dhD3'; // UID do usuário criado

    // Primeiro, verificar o UID obtendo o usuário do Auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(testEmail);
      console.log(`✅ Usuário encontrado no Firebase Auth`);
      console.log(`   UID: ${userRecord.uid}\n`);
    } catch (err) {
      console.error(`❌ Usuário ${testEmail} não encontrado no Auth`);
      process.exit(1);
    }

    // Criar documento de usuário no Firestore
    const userData = {
      uid: userRecord.uid,
      email: testEmail,
      displayName: 'Usuário Teste',
      photoURL: null,
      role: 'user', // ou 'admin', 'professor' conforme sua necessidade
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      department: 'Teste',
    };

    console.log(`📝 Criando documento:\n`);
    console.log(`   Coleção: users`);
    console.log(`   Documento ID: ${userRecord.uid}`);
    console.log(`   Dados: ${JSON.stringify(userData, null, 2)}\n`);

    await db.collection('users').doc(userRecord.uid).set(userData);

    console.log('✅ DOCUMENTO CRIADO COM SUCESSO!\n');

    console.log('🧪 PRÓXIMOS PASSOS:\n');
    console.log(`1. Volte ao navegador em http://localhost:3002`);
    console.log(`2. Faça logout e login novamente com:`);
    console.log(`   Email: ${testEmail}`);
    console.log(`   Senha: Teste@12345\n`);
    console.log(`3. Agora deve funcionar!\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERRO ao criar documento de usuário:\n');
    console.error(error.message);
    if (error.code) {
      console.error('Código:', error.code);
    }
    process.exit(1);
  }
}

createTestUserDocument();
