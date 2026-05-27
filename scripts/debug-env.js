#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.migration') });

console.log('🔍 Variáveis carregadas:');
console.log('SOURCE_PRIVATE_KEY_ID:', process.env.SOURCE_PRIVATE_KEY_ID ? '✅ Carregado' : '❌ Não encontrado');
console.log('SOURCE_CLIENT_EMAIL:', process.env.SOURCE_CLIENT_EMAIL ? '✅ Carregado' : '❌ Não encontrado');
console.log('SOURCE_CLIENT_ID:', process.env.SOURCE_CLIENT_ID ? '✅ Carregado' : '❌ Não encontrado');
console.log('SOURCE_PRIVATE_KEY:', process.env.SOURCE_PRIVATE_KEY ? '✅ Carregado (length: ' + process.env.SOURCE_PRIVATE_KEY.length + ')' : '❌ Não encontrado');
console.log('SOURCE_CLIENT_CERT_URL:', process.env.SOURCE_CLIENT_CERT_URL ? '✅ Carregado' : '❌ Não encontrado');

console.log('\n🔍 Arquivo .env.migration:');
const fs = require('fs');
const path = require('path');
const envPath = require('path').join(__dirname, '..', '.env.migration');
console.log('Path:', envPath);
console.log('Existe:', fs.existsSync(envPath));

console.log('\n📄 Conteúdo primeiras linhas:');
const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n').slice(0, 10);
lines.forEach((line, i) => {
  if (line.includes('KEY')) {
    console.log(`Linha ${i}: ${line.substring(0, 50)}...`);
  } else {
    console.log(`Linha ${i}: ${line}`);
  }
});
