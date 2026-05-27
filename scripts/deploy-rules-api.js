#!/usr/bin/env node

require('dotenv').config({ path: '.env.migration' });

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

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

async function getAccessToken() {
  try {
    const clientEmail = process.env.TARGET_CLIENT_EMAIL;
    const privateKey = parsePrivateKey(process.env.TARGET_PRIVATE_KEY);

    // Criar JWT
    const token = jwt.sign(
      {
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      },
      privateKey,
      { algorithm: 'RS256' }
    );

    // Trocar JWT por access token
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token,
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Erro ao gerar access token:', error.message);
    throw error;
  }
}

async function deployRulesViaAPI() {
  try {
    console.log('\n🔐 FAZENDO DEPLOY DAS FIRESTORE RULES VIA API\n');
    console.log('=============================================\n');

    // Ler arquivo de rules
    const rulesPath = path.join(__dirname, '..', 'firestore.rules');
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    console.log('✅ Rules carregadas\n');

    // Gerar access token
    console.log('🔑 Autenticando...\n');
    const accessToken = await getAccessToken();
    console.log('✅ Token de acesso obtido\n');

    // Deploy via API
    const projectId = 'chamadosmcnew';
    console.log('📤 Enviando rules para o Firebase...\n');

    const response = await axios.post(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/rules`,
      {
        rules: {
          source: {
            files: [
              {
                name: 'firestore.rules',
                content: rulesContent,
              }
            ]
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    console.log('✅ DEPLOY CONCLUÍDO COM SUCESSO!\n');
    console.log('📋 Resposta do servidor:');
    console.log(`   Status: ${response.status}\n`);

    console.log('🧪 Próximos passos:\n');
    console.log('1. Volte ao navegador em http://localhost:3002');
    console.log('2. Atualize a página (F5 ou Ctrl+R)');
    console.log('3. Faça login com:');
    console.log('   Email: teste@meucurso.com');
    console.log('   Senha: Teste@12345\n');
    console.log('4. Agora deve funcionar perfeitamente!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERRO no deploy via API:\n');
    console.error(error.response?.data || error.message);

    console.log('\n📋 SOLUÇÃO ALTERNATIVA (Manual):\n');
    console.log('Se o deploy automático não funcionar:\n');
    console.log('1. Acesse: https://console.firebase.google.com/');
    console.log('2. Selecione projeto: chamadosmcnew');
    console.log('3. Vá para: Firestore Database → Rules');
    console.log('4. Clique em "Editar Rules"');
    console.log('5. Limpe e cole o conteúdo do arquivo firestore.rules');
    console.log('6. Clique em "Publicar"\n');

    process.exit(1);
  }
}

// Verificar se temos as dependências necessárias
try {
  require('axios');
  require('jsonwebtoken');
  deployRulesViaAPI();
} catch (e) {
  console.log('⚠️  Instalando dependências necessárias...\n');
  const { execSync } = require('child_process');
  try {
    execSync('npm install axios jsonwebtoken', { stdio: 'inherit' });
    deployRulesViaAPI();
  } catch (err) {
    console.error('Erro ao instalar dependências:', err.message);
    process.exit(1);
  }
}
