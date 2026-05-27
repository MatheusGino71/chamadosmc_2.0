#!/usr/bin/env node

/**
 * Script para exportar dados do Firebase como backup
 * Útil antes de fazer a migração para ter um backup seguro
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.migration') });

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

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

const app = admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  projectId: 'chamadosmeucurso'
});
const db = app.firestore();

const COLLECTIONS = [
  'tickets',
  'users',
  'notifications',
  'adminMessages',
  'counters',
  'formConfigs'
];

async function exportCollection(collectionName) {
  console.log(`📤 Exportando ${collectionName}...`);
  
  const snapshot = await db.collection(collectionName).get();
  const data = {};
  
  for (const doc of snapshot.docs) {
    data[doc.id] = doc.data();
    
    // Exportar sub-coleções (para tickets)
    if (collectionName === 'tickets') {
      const subCollections = await doc.ref.listCollections();
      const subData = {};
      
      for (const subCollection of subCollections) {
        const subSnapshot = await doc.ref.collection(subCollection.id).get();
        subData[subCollection.id] = {};
        
        for (const subDoc of subSnapshot.docs) {
          subData[subCollection.id][subDoc.id] = subDoc.data();
        }
      }
      
      data[doc.id]._subCollections = subData;
    }
  }
  
  return data;
}

async function exportBackup() {
  try {
    console.log('\n🚀 INICIANDO BACKUP DOS DADOS...\n');
    
    const backup = {
      timestamp: new Date().toISOString(),
      projectId: 'chamadosmeucurso',
      collections: {}
    };
    
    for (const collection of COLLECTIONS) {
      try {
        backup.collections[collection] = await exportCollection(collection);
        console.log(`✅ ${collection} exportado com sucesso`);
      } catch (error) {
        console.error(`❌ Erro ao exportar ${collection}:`, error.message);
      }
    }
    
    // Salvar backup
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const fileName = `backup-${new Date().getTime()}.json`;
    const filePath = path.join(backupDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));
    
    console.log(`\n✅ BACKUP CONCLUÍDO!`);
    console.log(`📁 Arquivo: ${filePath}`);
    console.log(`📊 Total de coleções: ${Object.keys(backup.collections).length}`);
    
    // Mostrar resumo
    console.log('\n📋 Resumo:');
    for (const [collection, data] of Object.entries(backup.collections)) {
      const count = Object.keys(data).length;
      console.log(`  - ${collection}: ${count} documentos`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao fazer backup:', error);
    process.exit(1);
  } finally {
    await app.delete();
  }
}

if (require.main === module) {
  exportBackup();
}

module.exports = { exportBackup, exportCollection };
