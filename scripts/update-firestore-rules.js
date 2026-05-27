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

async function updateFirestoreRules() {
  try {
    console.log('\n🔐 ATUALIZANDO FIRESTORE RULES\n');
    console.log('==============================\n');

    // Ler arquivo de rules
    const rulesPath = path.join(__dirname, '..', 'firestore.rules');
    
    if (!fs.existsSync(rulesPath)) {
      console.error(`❌ Arquivo firestore.rules não encontrado em ${rulesPath}`);
      process.exit(1);
    }

    const rulesContent = fs.readFileSync(rulesPath, 'utf8');
    console.log('📄 Conteúdo das rules:');
    console.log('------------------------');
    console.log(rulesContent);
    console.log('------------------------\n');

    // Atualizar rules usando firebaseRulesAdminSDK (se disponível)
    // Por enquanto, vamos mostrar instruções para deploy manual

    console.log('⚠️  IMPORTANTE: O Node.js Admin SDK não tem método direto para deploy de rules.\n');
    console.log('📋 OPÇÕES:\n');
    console.log('1️⃣  DEPLOY MANUAL (recomendado):\n');
    console.log('   a) Instale Firebase CLI: npm install -g firebase-tools');
    console.log('   b) Autentique: firebase login');
    console.log('   c) Configure o projeto: firebase use chamadosmcnew (ou selecione na lista)');
    console.log('   d) Deploy das rules: firebase deploy --only firestore:rules\n');

    console.log('2️⃣  REGRAS TEMPORÁRIAS (para teste):\n');
    console.log('   Para teste rápido, você pode usar regras mais permissivas:');
    console.log('   - Acesse: https://console.firebase.google.com/');
    console.log('   - Projeto: chamadosmcnew');
    console.log('   - Firestore Database → Rules');
    console.log('   - Cole o conteúdo abaixo:\n');

    const permissiveRules = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Temporariamente: qualquer autenticado pode ler/escrever
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;

    console.log('────────────────────────────────────────────────');
    console.log(permissiveRules);
    console.log('────────────────────────────────────────────────\n');

    console.log('⚠️  Depois de fazer deploy, teste o login novamente!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERRO:\n');
    console.error(error.message);
    process.exit(1);
  }
}

updateFirestoreRules();
