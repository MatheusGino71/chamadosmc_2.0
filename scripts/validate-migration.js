#!/usr/bin/env node

/**
 * Script: Validar Migração Firebase
 * Descri­ção: Testa conectividade e valida integridade dos dados
 * no novo Firebase após migração
 */

require('dotenv').config({ path: '.env.migration' });

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Importar função de parse (mesmo do migrate-firebase.js)
const parsePrivateKey = (key) => {
  return key.replace(/\\n/gm, '\n');
};

const TARGET_CREDS = {
  type: 'service_account',
  project_id: process.env.TARGET_PROJECT_ID,
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
admin.initializeApp({
  credential: admin.credential.cert(TARGET_CREDS),
  projectId: TARGET_CREDS.project_id,
});

const db = admin.firestore();
const auth = admin.auth();

const COLLECTIONS_TO_CHECK = [
  'tickets',
  'users',
  'notifications',
  'adminMessages',
  'counters',
  'formConfigs'
];

async function validateMigration() {
  console.log('\n🔍 INICIANDO VALIDAÇÃO DE MIGRAÇÃO\n');
  console.log(`Projeto: ${TARGET_CREDS.project_id}\n`);

  const results = {
    collections: {},
    auth: {},
    timestamp: new Date().toISOString(),
    passed: 0,
    failed: 0,
    warnings: []
  };

  // Validar Collections
  console.log('📚 Validando Collections...\n');
  
  for (const collection of COLLECTIONS_TO_CHECK) {
    try {
      const snapshot = await db.collection(collection).get();
      const count = snapshot.size;
      
      results.collections[collection] = {
        count,
        status: 'OK'
      };

      console.log(`  ✓ ${collection}: ${count} documentos`);
      results.passed++;
    } catch (error) {
      results.collections[collection] = {
        count: 0,
        status: 'ERROR',
        error: error.message
      };
      console.log(`  ✗ ${collection}: ${error.message}`);
      results.failed++;
    }
  }

  // Validar Authentication
  console.log('\n👥 Validando Authentication Users...\n');
  
  try {
    const listUsersResult = await auth.listUsers(1000);
    const userCount = listUsersResult.users.length;
    
    results.auth = {
      count: userCount,
      status: 'OK'
    };
    
    console.log(`  ✓ Total de usuários: ${userCount}`);
    results.passed++;
  } catch (error) {
    results.auth = {
      count: 0,
      status: 'ERROR',
      error: error.message
    };
    console.log(`  ✗ Erro ao listar usuários: ${error.message}`);
    results.failed++;
  }

  // Validar Índices
  console.log('\n🔍 Verificando Índices Firestore...\n');
  
  try {
    const indexes = await db.listIndexes();
    console.log(`  ℹ️  Índices existentes: ${indexes.length}`);
    results.indexes = { count: indexes.length, status: 'OK' };
    results.passed++;
  } catch (error) {
    console.log(`  ⚠️  Erro ao listar índices: ${error.message}`);
    results.warnings.push(`Índices: ${error.message}`);
  }

  // Validar Integridade de Dados Críticos
  console.log('\n🔐 Validando Integridade de Dados...\n');
  
  try {
    const ticketSnapshot = await db.collection('tickets').limit(1).get();
    if (ticketSnapshot.empty) {
      console.log('  ⚠️  Nenhum ticket encontrado');
      results.warnings.push('Nenhum ticket encontrado');
    } else {
      const ticket = ticketSnapshot.docs[0].data();
      console.log(`  ✓ Amostra de ticket OK (userId: ${ticket.userId})`);
      results.passed++;
    }

    const userSnapshot = await db.collection('users').limit(1).get();
    if (userSnapshot.empty) {
      console.log('  ⚠️  Nenhum usuário encontrado');
      results.warnings.push('Nenhum usuário encontrado');
    } else {
      const user = userSnapshot.docs[0].data();
      console.log(`  ✓ Amostra de usuário OK (email: ${user.email})`);
      results.passed++;
    }
  } catch (error) {
    console.log(`  ✗ Erro ao validar dados: ${error.message}`);
    results.failed++;
  }

  // Resumo Final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA VALIDAÇÃO\n');

  let totalDocs = 0;
  for (const [collection, data] of Object.entries(results.collections)) {
    totalDocs += data.count;
    console.log(`  ${collection}: ${data.count} docs - ${data.status}`);
  }

  console.log(`\n  Usuários de Autenticação: ${results.auth.count || 0}`);
  console.log(`  Índices: ${results.indexes?.count || 0}`);

  console.log('\n  Validações Passou: ' + (results.passed > 0 ? `✓ ${results.passed}` : '0'));
  console.log(`  Validações Falharam: ${results.failed > 0 ? `✗ ${results.failed}` : '0'}`);

  if (results.warnings.length > 0) {
    console.log(`  Avisos: ${results.warnings.length}`);
    results.warnings.forEach(w => console.log(`    ⚠️  ${w}`));
  }

  console.log('\n' + '='.repeat(60));

  if (results.failed === 0) {
    console.log('✅ VALIDAÇÃO CONCLUÍDA COM SUCESSO!\n');
  } else {
    console.log('⚠️  ALGUMAS VALIDAÇÕES FALHARAM\n');
  }

  // Salvar resultados
  const resultsFile = path.join(__dirname, 'validation-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`📄 Resultados salvos: ${resultsFile}\n`);

  await admin.app().delete();
  process.exit(results.failed > 0 ? 1 : 0);
}

validateMigration().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
