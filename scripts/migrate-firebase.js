#!/usr/bin/env node

/**
 * Script de migração de dados Firebase
 * Migra dados do projeto "chamadosmeucurso" para "chamadosmcnew"
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

// ============================================
// CONFIGURAÇÕES DOS PROJETOS FIREBASE
// ============================================

// Projeto ORIGEM (chamadosmeucurso)
const sourceConfig = {
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

// Projeto DESTINO (chamadosmcnew)
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
  client_x509_cert_url: process.env.TARGET_CLIENT_CERT_URL
};

// ============================================
// INICIALIZAR FIREBASE ADMIN
// ============================================

const sourceApp = admin.initializeApp({
  credential: admin.credential.cert(sourceConfig),
  projectId: 'chamadosmeucurso'
}, 'source');

const targetApp = admin.initializeApp({
  credential: admin.credential.cert(targetConfig),
  projectId: 'chamadosmcnew'
}, 'target');

const sourceDb = sourceApp.firestore();
const targetDb = targetApp.firestore();

const sourceStorage = sourceApp.storage();
const targetStorage = targetApp.storage();

const sourceAuth = sourceApp.auth();
const targetAuth = targetApp.auth();

// ============================================
// COLEÇÕES A MIGRAR
// ============================================

const COLLECTIONS_TO_MIGRATE = [
  'tickets',
  'users',
  'notifications',
  'adminMessages',
  'counters',
  'formConfigs'
];

// ============================================
// FUNÇÕES DE UTILIDADE
// ============================================

async function logMigration(message, data = '') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message} ${data}`;
  console.log(logMessage);
  
  // Salvar em arquivo de log
  fs.appendFileSync(
    path.join(__dirname, 'migration.log'),
    logMessage + '\n'
  );
}

async function migrateSubcollections(sourceDb, targetDb, collectionPath, docId) {
  try {
    const sourceRef = sourceDb.collection(collectionPath).doc(docId);
    const targetRef = targetDb.collection(collectionPath).doc(docId);
    
    // Obter todas as sub-coleções
    const collections = await sourceRef.listCollections();
    
    for (const subCollection of collections) {
      const snapshot = await sourceRef.collection(subCollection.id).get();
      
      for (const doc of snapshot.docs) {
        await targetRef.collection(subCollection.id).doc(doc.id).set(doc.data());
      }
      
      await logMigration(`✓ Sub-coleção migrada: ${collectionPath}/${docId}/${subCollection.id} (${snapshot.size} docs)`);
    }
  } catch (error) {
    await logMigration(`✗ Erro ao migrar sub-coleções de ${collectionPath}/${docId}: ${error.message}`);
  }
}

async function migrateCollection(sourceDb, targetDb, collectionName) {
  try {
    await logMigration(`\n📚 Iniciando migração da coleção: ${collectionName}`);
    
    const sourceSnapshot = await sourceDb.collection(collectionName).get();
    let successCount = 0;
    let errorCount = 0;
    
    for (const doc of sourceSnapshot.docs) {
      try {
        const data = doc.data();
        
        // Converter Timestamps do Firestore para Date
        const processedData = processTimestamps(data);
        
        // Migrar documento
        await targetDb.collection(collectionName).doc(doc.id).set(processedData);
        
        // Migrar sub-coleções (para coleção 'tickets' que tem 'messages' e 'internalMessages')
        if (collectionName === 'tickets') {
          await migrateSubcollections(sourceDb, targetDb, collectionName, doc.id);
        }
        
        successCount++;
      } catch (error) {
        errorCount++;
        await logMigration(`  ✗ Erro ao migrar doc ${doc.id}: ${error.message}`);
      }
    }
    
    await logMigration(`✓ Coleção ${collectionName} migrada: ${successCount} docs sucesso, ${errorCount} erros`);
    return { success: successCount, errors: errorCount };
  } catch (error) {
    await logMigration(`✗ Erro ao migrar coleção ${collectionName}: ${error.message}`);
    throw error;
  }
}

function processTimestamps(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (obj instanceof admin.firestore.Timestamp) {
    return obj.toDate();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => processTimestamps(item));
  }
  
  if (typeof obj === 'object') {
    const processed = {};
    for (const key in obj) {
      processed[key] = processTimestamps(obj[key]);
    }
    return processed;
  }
  
  return obj;
}

async function migrateStorageFiles() {
  try {
    await logMigration('\n📁 Iniciando migração de arquivos do Storage...');
    
    const sourceBucket = sourceStorage.bucket();
    const targetBucket = targetStorage.bucket();
    
    const [files] = await sourceBucket.getFiles();
    let successCount = 0;
    let errorCount = 0;
    
    for (const file of files) {
      try {
        const targetFile = targetBucket.file(file.name);
        await sourceBucket.file(file.name).copy(targetFile);
        successCount++;
      } catch (error) {
        errorCount++;
        await logMigration(`  ✗ Erro ao copiar arquivo ${file.name}: ${error.message}`);
      }
    }
    
    await logMigration(`✓ Storage migrado: ${successCount} arquivos sucesso, ${errorCount} erros`);
    return { success: successCount, errors: errorCount };
  } catch (error) {
    await logMigration(`✗ Erro ao migrar Storage: ${error.message}`);
    throw error;
  }
}

async function migrateAuthUsers() {
  try {
    await logMigration('\n👥 Iniciando migração de usuários de autenticação...');
    
    let successCount = 0;
    let errorCount = 0;
    let nextPageToken;
    
    do {
      const listUsersResult = await sourceAuth.listUsers(100, nextPageToken);
      
      for (const user of listUsersResult.users) {
        try {
          // Criar usuário no Firebase de destino
          await targetAuth.createUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            disabled: user.disabled
          });
          successCount++;
        } catch (error) {
          if (error.code === 'auth/uid-already-exists') {
            // Usuário já existe, pular
            successCount++;
          } else {
            errorCount++;
            await logMigration(`  ✗ Erro ao criar usuário ${user.uid}: ${error.message}`);
          }
        }
      }
      
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    
    await logMigration(`✓ Usuários migrados: ${successCount} sucesso, ${errorCount} erros`);
    return { success: successCount, errors: errorCount };
  } catch (error) {
    await logMigration(`✗ Erro ao migrar usuários: ${error.message}`);
    throw error;
  }
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

async function runMigration() {
  try {
    // Limpar log anterior
    const logPath = path.join(__dirname, 'migration.log');
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }
    
    await logMigration('🚀 INICIANDO MIGRAÇÃO FIREBASE');
    await logMigration(`Origem: chamadosmeucurso → Destino: chamadosmcnew`);
    await logMigration('='.repeat(60));
    
    const results = {
      collections: {},
      storage: null,
      auth: null,
      timestamp: new Date().toISOString()
    };
    
    // 1. Migrar usuários de autenticação
    results.auth = await migrateAuthUsers();
    
    // 2. Migrar coleções do Firestore
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      results.collections[collectionName] = await migrateCollection(sourceDb, targetDb, collectionName);
    }
    
    // 3. Migrar arquivos do Storage
    try {
      results.storage = await migrateStorageFiles();
    } catch (error) {
      await logMigration(`⚠️  Storage não foi migrado (pode ser esperado): ${error.message}`);
      results.storage = { skipped: true, reason: error.message };
    }
    
    await logMigration('\n' + '='.repeat(60));
    await logMigration('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    await logMigration('\nResumo:');
    await logMigration(JSON.stringify(results, null, 2));
    
    // Salvar resultado em JSON
    fs.writeFileSync(
      path.join(__dirname, 'migration-results.json'),
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n✅ Migração concluída! Verifique os arquivos de log:');
    console.log(`  - ${logPath}`);
    console.log(`  - ${path.join(__dirname, 'migration-results.json')}`);
    
  } catch (error) {
    await logMigration(`\n❌ ERRO NA MIGRAÇÃO: ${error.message}`);
    console.error('Erro durante a migração:', error);
    process.exit(1);
  } finally {
    // Encerrar Firebase Admin
    await sourceApp.delete();
    await targetApp.delete();
  }
}

// ============================================
// EXECUTAR
// ============================================

if (require.main === module) {
  runMigration().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = {
  migrateCollection,
  migrateStorageFiles,
  migrateAuthUsers,
  runMigration
};
