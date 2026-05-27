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

// Configurar ambos os projetos
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
  client_x509_cert_url: process.env.SOURCE_CLIENT_CERT_URL,
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

// Inicializar Firebase Apps
const sourceApp = admin.initializeApp({
  credential: admin.credential.cert(sourceConfig),
  projectId: 'chamadosmeucurso'
}, 'source');

const targetApp = admin.initializeApp({
  credential: admin.credential.cert(targetConfig),
  projectId: 'chamadosmcnew'
}, 'target');

const sourceAuth = admin.auth(sourceApp);
const targetAuth = admin.auth(targetApp);

async function migrateOldUsers() {
  try {
    console.log('\n👥 MIGRANDO USUÁRIOS ANTIGOS DO FIREBASE AUTH\n');
    console.log('=============================================\n');

    let migrated = 0;
    let failed = 0;
    let alreadyExists = 0;

    // Listar todos os usuários do projeto antigo
    console.log('📥 Obtendo usuários do Firebase antigo (chamadosmeucurso)...\n');

    let nextPageToken = undefined;
    const allUsers = [];

    // Paginar através de todos os usuários
    do {
      const listUsersResult = await sourceAuth.listUsers(100, nextPageToken);
      allUsers.push(...listUsersResult.users);
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`✅ Total de usuários encontrados: ${allUsers.length}\n`);

    if (allUsers.length === 0) {
      console.log('⚠️  Nenhum usuário encontrado para migrar.\n');
      process.exit(0);
    }

    console.log('🔄 Iniciando migração...\n');

    // Migrar cada usuário
    for (const user of allUsers) {
      try {
        // Verificar se usuário já existe no novo projeto
        let targetUserExists = false;
        try {
          await targetAuth.getUser(user.uid);
          targetUserExists = true;
        } catch (err) {
          if (err.code !== 'auth/user-not-found') {
            throw err;
          }
        }

        if (targetUserExists) {
          console.log(`⏭️  ${user.email} - Já existe no novo projeto`);
          alreadyExists++;
          continue;
        }

        // Criar usuário no novo projeto (sem senha, já que não a temos)
        const createUserData = {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          disabled: user.disabled,
        };

        if (user.displayName) {
          createUserData.displayName = user.displayName;
        }
        if (user.photoURL) {
          createUserData.photoURL = user.photoURL;
        }

        // Se o usuário tem login por email, configurar senha aleatória
        const userRecord = await targetAuth.createUser(createUserData);

        console.log(`✅ ${user.email} - Migrado com sucesso (UID: ${user.uid})`);
        migrated++;

      } catch (error) {
        console.error(`❌ ${user.email} - ERRO: ${error.message}`);
        failed++;
      }
    }

    console.log('\n📊 RESUMO DA MIGRAÇÃO:\n');
    console.log(`  ✅ Usuários migrados: ${migrated}`);
    console.log(`  ⏭️  Já existiam: ${alreadyExists}`);
    console.log(`  ❌ Erros: ${failed}`);
    console.log(`  📊 Total processado: ${migrated + alreadyExists + failed}\n`);

    console.log('⚠️  IMPORTANTE:\n');
    console.log('Os usuários migrados foram criados SEM SENHA.');
    console.log('Eles precisam fazer "Esqueci a senha" para acessar.\n');

    console.log('🧪 Próximas etapas:\n');
    console.log('1. Faça deploy dos índices do Firestore');
    console.log('2. Os usuários podem fazer login com reset de senha\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERRO na migração:\n');
    console.error(error.message);
    process.exit(1);
  }
}

migrateOldUsers();
