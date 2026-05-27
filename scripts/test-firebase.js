#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.migration') });

const admin = require('firebase-admin');

// Helper para fazer unescape de strings com quebras de linha
const parsePrivateKey = (key) => {
  if (!key) return undefined;
  try {
    // Se começa com ", é uma string JSON escapada
    if (key.startsWith('"') && key.endsWith('"')) {
      return JSON.parse(key);
    }
    // Caso contrário, tenta fazer replace direto
    return key.replace(/\\n/g, '\n');
  } catch (e) {
    return key.replace(/\\n/g, '\n');
  }
};

const firebaseConfig = {
  type: 'service_account',
  project_id: 'chamadosmeucurso',
  private_key_id: process.env.SOURCE_PRIVATE_KEY_ID,
  private_key: parsePrivateKey(process.env.SOURCE_PRIVATE_KEY),
  client_email: process.env.SOURCE_CLIENT_EMAIL,
  client_id: process.env.SOURCE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.SOURCE_CLIENT_CERT_URL
};

console.log('🔍 Configuração do Firebase:');
console.log('project_id:', firebaseConfig.project_id);
console.log('client_email:', firebaseConfig.client_email);
console.log('private_key length:', firebaseConfig.private_key?.length);
console.log('private_key starts with:', firebaseConfig.private_key?.substring(0, 50));

try {
  const app = admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
    projectId: 'chamadosmeucurso'
  });
  console.log('\n✅ Firebase app inicializado com sucesso!');
  console.log('App name:', app.name);
  
  const db = admin.firestore();
  console.log('Firestore inicializado:', db !== null);
  
  // Testar conexão
  db.collection('test').limit(1).get()
    .then(snapshot => {
      console.log('✅ Conexão com Firestore OK');
      console.log('Docs encontrados:', snapshot.size);
      app.delete();
      process.exit(0);
    })
    .catch(error => {
      console.log('❌ Erro ao conectar:', error.message);
      app.delete();
      process.exit(1);
    });
} catch (error) {
  console.error('❌ Erro ao inicializar Firebase:', error.message);
  process.exit(1);
}
