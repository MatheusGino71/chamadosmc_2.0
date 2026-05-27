#!/usr/bin/env node

/**
 * Script de diagnóstico das credenciais do Firebase
 */

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('🔍 DIAGNÓSTICO DE CREDENCIAIS DO FIREBASE');
console.log('============================================\n');

console.log('📋 Configuração carregada do .env.local:\n');
Object.entries(config).forEach(([key, value]) => {
  const masked = value ? `${String(value).substring(0, 20)}...` : '❌ NÃO DEFINIDO';
  console.log(`  ${key}: ${masked}`);
});

console.log('\n✅ Verificação:\n');

const issues = [];

if (!config.apiKey) issues.push('❌ NEXT_PUBLIC_FIREBASE_API_KEY não definida');
if (!config.authDomain) issues.push('❌ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN não definida');
if (!config.projectId) issues.push('❌ NEXT_PUBLIC_FIREBASE_PROJECT_ID não definida');
if (!config.storageBucket) issues.push('❌ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET não definida');
if (!config.messagingSenderId) issues.push('❌ NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID não definida');
if (!config.appId) issues.push('❌ NEXT_PUBLIC_FIREBASE_APP_ID não definida');

// Verificar coerência
if (config.authDomain && config.projectId) {
  const expectedDomain = `${config.projectId}.firebaseapp.com`;
  if (!config.authDomain.includes(config.projectId)) {
    issues.push(`⚠️  authDomain (${config.authDomain}) não corresponde ao projectId (${config.projectId})`);
  }
}

if (config.storageBucket && config.projectId) {
  if (!config.storageBucket.includes(config.projectId)) {
    issues.push(`⚠️  storageBucket (${config.storageBucket}) não corresponde ao projectId (${config.projectId})`);
  }
}

if (issues.length === 0) {
  console.log('✅ Todas as variáveis estão definidas e coerentes!');
} else {
  issues.forEach(issue => console.log(`  ${issue}`));
  console.log('\n❌ Há problemas nas credenciais!');
}

console.log('\n📖 SOLUÇÃO:\n');
console.log('Para obter as credenciais corretas do Firebase:\n');
console.log('1. Acesse: https://console.firebase.google.com/');
console.log('2. Selecione projeto: chamadosmcnew');
console.log('3. Clique em "Configurações do projeto" (engrenagem)');
console.log('4. Vá para aba "Seu apps"');
console.log('5. Selecione seu app web (ou crie um se não existir)');
console.log('6. Copie o objeto de configuração (firebaseConfig)');
console.log('7. Atualize o .env.local com os valores corretos\n');
