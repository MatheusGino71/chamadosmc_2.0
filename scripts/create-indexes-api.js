#!/usr/bin/env node

require('dotenv').config({ path: '.env.migration' });

const axios = require('axios');
const jwt = require('jsonwebtoken');
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

async function getAccessToken() {
  try {
    const clientEmail = process.env.TARGET_CLIENT_EMAIL;
    const privateKey = parsePrivateKey(process.env.TARGET_PRIVATE_KEY);

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

async function createIndex(accessToken, collectionGroup, fields) {
  try {
    const projectId = 'chamadosmcnew';
    
    const fieldsList = fields.map(field => ({
      fieldPath: field.fieldPath,
      order: field.order
    }));

    const payload = {
      collectionGroup: collectionGroup,
      queryScope: 'COLLECTION',
      fields: fieldsList
    };

    const response = await axios.post(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups/${collectionGroup}/indexes`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      return { alreadyExists: true };
    }
    throw error;
  }
}

async function deployIndexesViaAPI() {
  try {
    console.log('\n📇 CRIANDO ÍNDICES DO FIRESTORE VIA API\n');
    console.log('=======================================\n');

    const accessToken = await getAccessToken();
    console.log('✅ Autenticado com Service Account\n');

    const indexes = [
      {
        collection: 'notifications',
        fields: [
          { fieldPath: 'recipientId', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' }
        ]
      },
      {
        collection: 'adminMessages',
        fields: [
          { fieldPath: 'recipientId', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' }
        ]
      },
      {
        collection: 'adminMessages',
        fields: [
          { fieldPath: 'senderId', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' }
        ]
      },
      {
        collection: 'adminMessages',
        fields: [
          { fieldPath: 'conversationId', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'ASCENDING' }
        ]
      },
      {
        collection: 'tickets',
        fields: [
          { fieldPath: 'userId', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' }
        ]
      },
      {
        collection: 'tickets',
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' }
        ]
      },
      {
        collection: 'tickets',
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'archived', order: 'ASCENDING' }
        ]
      }
    ];

    console.log('📤 Criando índices...\n');

    let created = 0;
    let alreadyExists = 0;
    let failed = 0;

    for (const idx of indexes) {
      try {
        const fields = idx.fields.map(f => `${f.fieldPath}(${f.order.substring(0, 3)})`).join(', ');
        process.stdout.write(`  ${idx.collection}: ${fields} ... `);

        const result = await createIndex(accessToken, idx.collection, idx.fields);

        if (result.alreadyExists) {
          console.log('⏭️  (já existe)');
          alreadyExists++;
        } else {
          console.log('✅');
          created++;
        }
      } catch (error) {
        console.log(`❌ ERRO`);
        console.error(`    ${error.message}`);
        failed++;
      }

      // Pequeno delay entre requisições
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n📊 RESUMO:\n');
    console.log(`  ✅ Criados: ${created}`);
    console.log(`  ⏭️  Já existiam: ${alreadyExists}`);
    console.log(`  ❌ Erros: ${failed}\n`);

    if (failed === 0) {
      console.log('✅ TODOS OS ÍNDICES FORAM CRIADOS COM SUCESSO!\n');
      console.log('⏳ Os índices podem levar 5-10 minutos para ficarem "Ativo"\n');
      console.log('🧪 Próximos passos:\n');
      console.log('1. Volte ao navegador em http://localhost:3002');
      console.log('2. Teste o login com um usuário antigo');
      console.log('3. Tudo deve funcionar perfeitamente!\n');
    }

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ ERRO na criação de índices:\n');
    console.error(error.message);
    console.log('\n💡 Solução alternativa:\n');
    console.log('Crie manualmente em: https://console.firebase.google.com/project/chamadosmcnew/firestore/indexes\n');
    process.exit(1);
  }
}

deployIndexesViaAPI();
