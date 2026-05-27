#!/usr/bin/env node

/**
 * Script: Deploy Firestore Rules e Indexes
 * Faz deploy das regras e índices para o novo Firebase usando API REST
 */

require('dotenv').config({ path: '.env.migration' });

const fs = require('fs');
const path = require('path');
const https = require('https');

const parsePrivateKey = (key) => {
  return key.replace(/\\n/gm, '\n');
};

const TARGET_CREDS = {
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

// Função para obter access token
async function getAccessToken() {
  const jwt = require('jsonwebtoken');
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: TARGET_CREDS.client_email,
    sub: TARGET_CREDS.client_email,
    aud: TARGET_CREDS.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const token = jwt.sign(payload, TARGET_CREDS.private_key, {
    algorithm: 'RS256',
    header: {
      kid: TARGET_CREDS.private_key_id,
    },
  });

  const response = await new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token,
    });

    const req = https.request(TARGET_CREDS.token_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.toString().length,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.access_token);
        } catch (e) {
          reject(new Error(`Failed to parse token response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData.toString());
    req.end();
  });

  return response;
}

// Função para fazer request via HTTP
function makeRequest(method, url, accessToken, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = jsonData.length;
    }

    const req = https.request(urlObj, options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function deployRules(accessToken) {
  console.log('\n📋 Lendo arquivo de regras...');
  
  const rulesFile = path.join(__dirname, '..', 'firestore.rules');
  const rules = fs.readFileSync(rulesFile, 'utf8');

  console.log('📤 Fazendo upload das regras...');

  const url = `https://firestore.googleapis.com/v1/projects/chamadosmcnew/databases/(default)/rules:release`;
  
  const payload = {
    rules: {
      source: {
        files: [
          {
            name: 'firestore.rules',
            content: rules,
          }
        ]
      }
    }
  };

  try {
    const result = await makeRequest('PATCH', url, accessToken, payload);
    console.log('✓ Regras deployadas com sucesso!');
    return true;
  } catch (error) {
    console.error('✗ Erro ao fazer deploy das regras:', error.message);
    return false;
  }
}

async function deployIndexes(accessToken) {
  console.log('\n📋 Lendo arquivo de índices...');
  
  const indexFile = path.join(__dirname, '..', 'firestore.indexes.json');
  const indexContent = fs.readFileSync(indexFile, 'utf8');
  const indexes = JSON.parse(indexContent);

  console.log(`📤 Fazendo deploy de ${indexes.indexes?.length || 0} índices...`);

  // Deploy é feito automaticamente quando os índices estão no firestore.indexes.json
  // O Firebase CLI detecta automaticamente, mas vamos pelo menos validar

  try {
    if (!indexes.indexes || indexes.indexes.length === 0) {
      console.log('ℹ️  Nenhum índice para fazer deploy');
      return true;
    }

    console.log('✓ Arquivo de índices validado');
    console.log(`✓ ${indexes.indexes.length} índice(s) configurado(s)`);
    
    // Nota: O deploy automático de índices via API é limitado
    // A forma recomendada é usar o Firebase Console ou o Firebase CLI autenticado
    return true;
  } catch (error) {
    console.error('✗ Erro ao processar índices:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 INICIANDO DEPLOY DE REGRAS E ÍNDICES\n');
  console.log(`Projeto: chamadosmcnew\n`);

  try {
    console.log('🔐 Obtendo access token...');
    const accessToken = await getAccessToken();
    console.log('✓ Access token obtido');

    const rulesSuccess = await deployRules(accessToken);
    const indexesSuccess = await deployIndexes(accessToken);

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DO DEPLOY\n');
    
    if (rulesSuccess) {
      console.log('✓ Regras Firestore: Deployadas com sucesso');
    } else {
      console.log('✗ Regras Firestore: Erro no deploy');
    }

    if (indexesSuccess) {
      console.log('✓ Índices: Validados (deploy via Firebase Console)');
    } else {
      console.log('✗ Índices: Erro na validação');
    }

    console.log('\n⚠️  IMPORTANTE:');
    console.log('Os índices precisam ser criados via Firebase Console:');
    console.log('https://console.firebase.google.com/project/chamadosmcnew/firestore/indexes');
    console.log('');

    process.exit(rulesSuccess ? 0 : 1);
  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

main();
