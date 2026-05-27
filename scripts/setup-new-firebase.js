#!/usr/bin/env node

/**
 * Script: Extrair Configuração do Novo Firebase
 * Extrai a configuração pública do novo projeto Firebase (chamadosmcnew)
 */

require('dotenv').config({ path: '.env.migration' });

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const parsePrivateKey = (key) => {
  return key.replace(/\\n/gm, '\n');
};

const TARGET_CREDS = {
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

// Configuração pública do Firebase (pode ser encontrada no Firebase Console)
// Esses valores são públicos e podem ser expostos
const FIREBASE_PUBLIC_CONFIG = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyAutf0oS525Hy90PU4HpFIKDTbm1VxexUM',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'chamadosmeucurso.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'chamadosmcnew',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'chamadosmeucurso.firebasestorage.app',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '148169200418',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:148169200418:web:447ee3871c9e329ccc0b7b',
};

async function updateEnvironment() {
  console.log('🔄 Atualizando configuração Firebase...\n');

  const envFile = path.join(__dirname, '..', '.env.local');
  const backupFile = path.join(__dirname, '..', '.env.local.backup');

  // Criar backup
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    fs.writeFileSync(backupFile, envContent);
    console.log(`✓ Backup criado: .env.local.backup\n`);
  }

  // Ler arquivo atual
  let envContent = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
  let lines = envContent.split('\n');

  // Atualizar ou adicionar variáveis
  for (const [key, value] of Object.entries(FIREBASE_PUBLIC_CONFIG)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    
    if (regex.test(envContent)) {
      lines = lines.map(line => 
        line.match(regex) ? `${key}=${value}` : line
      );
      console.log(`✓ Atualizado: ${key}`);
    } else {
      lines.push(`${key}=${value}`);
      console.log(`✓ Adicionado: ${key}`);
    }
  }

  // Escrever arquivo
  envContent = lines.filter(line => line.trim()).join('\n');
  fs.writeFileSync(envFile, envContent + '\n');

  console.log('\n✅ Configuração Firebase atualizada!\n');

  // Verificar conectividade
  console.log('🔐 Verificando conectividade com novo Firebase...\n');

  admin.initializeApp({
    credential: admin.credential.cert(TARGET_CREDS),
    projectId: 'chamadosmcnew',
  });

  const db = admin.firestore();
  
  try {
    const snapshot = await db.collection('tickets').limit(1).get();
    console.log(`✓ Conexão OK! Projeto: chamadosmcnew`);
    console.log(`✓ Documentos na coleção 'tickets': ${snapshot.size}`);
  } catch (error) {
    console.error(`✗ Erro ao conectar: ${error.message}`);
  }

  await admin.app().delete();
  process.exit(0);
}

updateEnvironment().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
