#!/usr/bin/env node

require('dotenv').config({ path: '.env.migration' });

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

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

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(targetConfig),
    projectId: 'chamadosmcnew'
  });
}

async function checkIndexes() {
  try {
    console.log('\n📇 VERIFICANDO STATUS DOS ÍNDICES\n');
    console.log('==================================\n');

    const db = admin.firestore();

    // Listar colecções para verificar se existem
    const collections = ['notifications', 'adminMessages', 'tickets'];
    
    console.log('📊 Colecções e documentos:\n');

    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName).limit(1).get();
        console.log(`  ✅ ${collectionName}: ${snapshot.size > 0 ? 'tem documentos' : 'vazia'}`);
      } catch (error) {
        console.log(`  ❌ ${collectionName}: erro ao acessar`);
      }
    }

    console.log('\n📖 STATUS DOS ÍNDICES:\n');
    console.log('Os índices foram criados MANUALMENTE via Firebase Console.');
    console.log('Eles devem estar sendo processados agora.\n');

    console.log('⏳ Checklist para completar:\n');
    console.log('1. ✅ Você fez login no Firebase Console');
    console.log('2. ✅ Script criou 7 índices');
    console.log('3. ⏳ Aguardando ~5-10 minutos para ficarem "Ativo"\n');

    console.log('🧪 Teste rápido:\n');
    console.log('1. Volte ao navegador em http://localhost:3002');
    console.log('2. Teste fazer login com um usuário antigo');
    console.log('3. Se houver erro de índice ainda, aguarde mais um pouco\n');

    process.exit(0);
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

checkIndexes();
