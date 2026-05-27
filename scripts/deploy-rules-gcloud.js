#!/usr/bin/env node

/**
 * Script: Deploy Firestore Rules
 * Usa Google Cloud API para fazer deploy das regras
 */

require('dotenv').config({ path: '.env.migration' });

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const parsePrivateKey = (key) => {
  return key.replace(/\\n/gm, '\n');
};

// Criar arquivo de credenciais temporário
const credentialsJson = {
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

async function deployRules() {
  console.log('🚀 INICIANDO DEPLOY DE REGRAS FIRESTORE\n');
  console.log(`Projeto: chamadosmcnew\n`);

  // Criar arquivo de credenciais temporário
  const credFile = path.join(__dirname, '.firebase-creds.json');
  fs.writeFileSync(credFile, JSON.stringify(credentialsJson, null, 2));

  try {
    // Definir variável de ambiente
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credFile;
    process.env.GCLOUD_PROJECT = 'chamadosmcnew';

    console.log('📋 Lendo arquivo de regras...');
    const rulesFile = path.join(__dirname, '..', 'firestore.rules');
    const rules = fs.readFileSync(rulesFile, 'utf8');
    console.log('✓ Arquivo lido: firestore.rules\n');

    console.log('📤 Fazendo deploy das regras...\n');

    try {
      // Executar firebase deploy com as credenciais de service account
      const cmd = `firebase deploy --only firestore:rules --project chamadosmcnew`;
      console.log(`Executando: ${cmd}\n`);
      
      const result = execSync(cmd, {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          GOOGLE_APPLICATION_CREDENTIALS: credFile,
        },
        stdio: 'pipe',
        encoding: 'utf8',
      });

      console.log(result);
      console.log('\n✅ DEPLOY CONCLUÍDO COM SUCESSO!\n');
      return true;
    } catch (error) {
      // Se firebase CLI não estiver disponível, tentar com gcloud
      console.log('ℹ️  Firebase CLI não disponível, tentando com gcloud...\n');

      try {
        const cmd = `gcloud firestore rules deploy firestore.rules --project=chamadosmcnew`;
        console.log(`Executando: ${cmd}\n`);
        
        const result = execSync(cmd, {
          cwd: path.join(__dirname, '..'),
          env: {
            ...process.env,
            GOOGLE_APPLICATION_CREDENTIALS: credFile,
          },
          stdio: 'pipe',
          encoding: 'utf8',
        });

        console.log(result);
        console.log('\n✅ DEPLOY VIA GCLOUD CONCLUÍDO!\n');
        return true;
      } catch (gcloudError) {
        console.error('✗ Erro ao usar gcloud:', gcloudError.message);
        
        // Fallback: informar que precisa ser feito manualmente
        console.log('\n⚠️  DEPLOY MANUAL NECESSÁRIO:\n');
        console.log('Como Firebase CLI e gcloud não estão disponíveis,');
        console.log('você precisará fazer o deploy manualmente:\n');
        console.log('1. Vá para: https://console.firebase.google.com/project/chamadosmcnew/firestore');
        console.log('2. Clique em "Rules"');
        console.log('3. Cole o conteúdo de firestore.rules');
        console.log('4. Clique em "Publish"\n');
        
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  } finally {
    // Limpar arquivo de credenciais
    try {
      fs.unlinkSync(credFile);
    } catch (e) {}
  }
}

deployRules().then(success => {
  process.exit(success ? 0 : 1);
});
