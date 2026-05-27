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

// Configurar Firebase Admin
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

// Inicializar Firebase
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(targetConfig),
    projectId: 'chamadosmcnew'
  });
}

async function deployIndexes() {
  try {
    console.log('\n📇 PREPARANDO ÍNDICES DO FIRESTORE\n');
    console.log('==================================\n');

    // Ler arquivo de índices
    const indexesPath = path.join(__dirname, '..', 'firestore.indexes.json');
    
    if (!fs.existsSync(indexesPath)) {
      console.error(`❌ Arquivo firestore.indexes.json não encontrado`);
      process.exit(1);
    }

    const indexesData = JSON.parse(fs.readFileSync(indexesPath, 'utf8'));
    console.log(`✅ Índices carregados: ${indexesData.indexes.length} índices encontrados\n`);

    console.log('📋 Índices a serem criados:\n');
    indexesData.indexes.forEach((idx, i) => {
      const fields = idx.fields.map(f => `${f.fieldPath} (${f.order})`).join(', ');
      console.log(`  ${i + 1}. ${idx.collectionGroup}: ${fields}`);
    });

    console.log('\n📖 PRÓXIMOS PASSOS:\n');
    console.log('Para criar os índices no Firestore, você tem 2 opções:\n');

    console.log('OPÇÃO 1 - Deploy via Firebase CLI:\n');
    console.log('  firebase use chamadosmcnew');
    console.log('  firebase deploy --only firestore:indexes\n');

    console.log('OPÇÃO 2 - Via Console Firebase:\n');
    console.log('  1. Acesse: https://console.firebase.google.com/project/chamadosmcnew/firestore/indexes');
    console.log('  2. Você verá uma sugestão para criar os índices faltantes');
    console.log('  3. Clique em "Criar índice" para cada um\n');

    console.log('⚠️  Os índices podem levar alguns minutos para serem criados.\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERRO:\n');
    console.error(error.message);
    process.exit(1);
  }
}

deployIndexes();
