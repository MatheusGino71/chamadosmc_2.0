#!/usr/bin/env node

require('dotenv').config({ path: '.env.migration' });

const fs = require('fs');
const path = require('path');
const https = require('https');

async function deployFirestoreRules() {
  try {
    console.log('\n🔐 FAZENDO DEPLOY DAS FIRESTORE RULES\n');
    console.log('======================================\n');

    // Ler arquivo de rules
    const rulesPath = path.join(__dirname, '..', 'firestore.rules');
    
    if (!fs.existsSync(rulesPath)) {
      console.error(`❌ Arquivo firestore.rules não encontrado em ${rulesPath}`);
      process.exit(1);
    }

    const rulesContent = fs.readFileSync(rulesPath, 'utf8');
    console.log('📄 Rules carregadas com sucesso\n');

    // Obter access token
    const clientEmail = process.env.TARGET_CLIENT_EMAIL;
    const privateKey = process.env.TARGET_PRIVATE_KEY.replace(/\\n/g, '\n');
    const projectId = 'chamadosmcnew';

    console.log('🔑 Autenticando com Service Account...\n');

    const jwt = require('jsonwebtoken');
    
    if (typeof jwt.sign !== 'function') {
      console.log('⚠️  Instalando dependência jsonwebtoken...\n');
      console.log('Você pode tentar:\n');
      console.log('npm install jsonwebtoken\n');
      
      // Se não tiver, mostrar alternativa
      showManualInstructions(projectId, rulesContent);
      process.exit(0);
    }

    const token = jwt.sign(
      {
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/identitytoolkit',
        aud: 'https://oauth2.googleapis.com/token',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      },
      privateKey,
      { algorithm: 'RS256' }
    );

    console.log('✅ Token gerado com sucesso\n');

    showManualInstructions(projectId, rulesContent);

  } catch (error) {
    console.error('\n❌ ERRO:\n');
    console.error(error.message);
    process.exit(1);
  }
}

function showManualInstructions(projectId, rulesContent) {
  console.log('📋 PRÓXIMOS PASSOS (MANUAL):\n');
  console.log('==========================\n');
  
  console.log('Para fazer deploy das Firestore Rules:\n');
  
  console.log('OPÇÃO 1 - Via Console Firebase (Mais Fácil):\n');
  console.log('1. Acesse: https://console.firebase.google.com/');
  console.log('2. Selecione projeto: chamadosmcnew');
  console.log('3. Vá para: Firestore Database → Rules');
  console.log('4. Clique em "Editar Rules"');
  console.log('5. Limpe o conteúdo atual');
  console.log('6. Cole o conteúdo abaixo:\n');
  
  console.log('────────────────────────────────────────────────');
  console.log(rulesContent);
  console.log('────────────────────────────────────────────────\n');
  
  console.log('7. Clique em "Publicar"\n');
  
  console.log('OPÇÃO 2 - Via Firebase CLI:\n');
  console.log('1. npm install -g firebase-tools');
  console.log('2. firebase login');
  console.log('3. firebase use chamadosmcnew');
  console.log('4. firebase deploy --only firestore:rules\n');

  console.log('⚠️  Após fazer deploy, teste o login novamente!\n');
}

deployFirestoreRules();
