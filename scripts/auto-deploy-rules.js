#!/usr/bin/env node

require('dotenv').config({ path: '.env.migration' });

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

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

async function deployRulesWithServiceAccount() {
  try {
    console.log('\n🔐 FAZENDO DEPLOY DAS FIRESTORE RULES\n');
    console.log('======================================\n');

    // Criar arquivo de configuração do Firebase
    const firebaseConfig = {
      projects: {
        default: 'chamadosmcnew'
      }
    };

    const firebaseRcPath = path.join(__dirname, '..', '.firebaserc');
    fs.writeFileSync(firebaseRcPath, JSON.stringify(firebaseConfig, null, 2));
    console.log('✅ Arquivo .firebaserc criado\n');

    // Deploy das rules
    console.log('📤 Iniciando deploy das Firestore Rules...\n');
    
    const projectPath = path.join(__dirname, '..');
    const { stdout, stderr } = await execPromise(
      'firebase deploy --only firestore:rules',
      { cwd: projectPath }
    );

    console.log(stdout);
    if (stderr) {
      console.warn('⚠️  Avisos:\n', stderr);
    }

    console.log('\n✅ DEPLOY CONCLUÍDO COM SUCESSO!\n');
    console.log('🧪 Próximos passos:\n');
    console.log('1. Volte ao navegador em http://localhost:3002');
    console.log('2. Atualize a página (F5 ou Ctrl+R)');
    console.log('3. Faça login com:');
    console.log('   Email: teste@meucurso.com');
    console.log('   Senha: Teste@12345\n');
    console.log('4. Agora deve funcionar perfeitamente!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERRO no deploy:\n');
    console.error(error.message);
    
    console.log('\n📋 SOLUÇÃO ALTERNATIVA (Manual):\n');
    console.log('Se o deploy automático não funcionar:\n');
    console.log('1. Acesse: https://console.firebase.google.com/');
    console.log('2. Selecione projeto: chamadosmcnew');
    console.log('3. Vá para: Firestore Database → Rules');
    console.log('4. Clique em "Editar Rules"');
    console.log('5. Cole o conteúdo do arquivo firestore.rules local\n');
    
    process.exit(1);
  }
}

deployRulesWithServiceAccount();
