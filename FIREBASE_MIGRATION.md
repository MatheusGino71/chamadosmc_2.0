# 🚀 Guia de Migração Firebase

Este guia descreve como migrar os dados do projeto Firebase `chamadosmeucurso` para `chamadosmcnew`.

## 📋 Pré-requisitos

1. **Node.js** instalado (v14+)
2. **Firebase Admin SDK** - será instalado automaticamente
3. **Credenciais de Service Account** para ambos os projetos Firebase

## 🔑 Obter Credenciais de Service Account

Para cada projeto Firebase, você precisa:

### 1. Acessar Google Cloud Console
- Ir para: https://console.cloud.google.com/
- Selecionar o projeto Firebase

### 2. Gerar uma chave privada
- Menu > APIs & Services > Service Accounts
- Clique em "Manage Service Accounts" na sua service account padrão
- Clique em "Create Key" > JSON
- Salve o arquivo `service-account.json`

### 3. Extrair as credenciais
Abra o arquivo JSON e copie os seguintes valores:

```json
{
  "private_key_id": "...",
  "private_key": "...",
  "client_email": "...",
  "client_id": "...",
  "client_x509_cert_url": "..."
}
```

## 📝 Configurar Variáveis de Ambiente

Crie um arquivo `.env.migration` na raiz do projeto com as credenciais:

```bash
# PROJETO ORIGEM (chamadosmeucurso)
SOURCE_PRIVATE_KEY_ID="seu_private_key_id_origem"
SOURCE_PRIVATE_KEY="seu_private_key_origem"
SOURCE_CLIENT_EMAIL="seu_client_email_origem"
SOURCE_CLIENT_ID="seu_client_id_origem"
SOURCE_CLIENT_CERT_URL="seu_client_x509_cert_url_origem"

# PROJETO DESTINO (chamadosmcnew)
TARGET_PRIVATE_KEY_ID="seu_private_key_id_destino"
TARGET_PRIVATE_KEY="seu_private_key_destino"
TARGET_CLIENT_EMAIL="seu_client_email_destino"
TARGET_CLIENT_ID="seu_client_id_destino"
TARGET_CLIENT_CERT_URL="seu_client_x509_cert_url_destino"
```

⚠️ **IMPORTANTE**: Nunca commite este arquivo no Git!

## 🔧 Instalar Dependências

```bash
npm install firebase-admin --save-dev
```

## ▶️ Executar a Migração

```bash
# Carregar as variáveis de ambiente e rodar o script
node -r dotenv/config scripts/migrate-firebase.js dotenv_config_path=.env.migration
```

Ou, se não quiser usar dotenv:

```bash
set SOURCE_PRIVATE_KEY_ID=... && set SOURCE_PRIVATE_KEY=... && ... && node scripts/migrate-firebase.js
```

## 📊 O que será migrado?

### ✅ Coleções Firestore:
- `tickets` (com sub-coleções: messages, internalMessages)
- `users`
- `notifications`
- `adminMessages`
- `counters`
- `formConfigs`

### ✅ Storage:
- Todos os arquivos do Cloud Storage

### ✅ Autenticação:
- Usuários Firebase Auth

## 📝 Logs da Migração

Após executar, verifique:
- `scripts/migration.log` - Log detalhado de cada operação
- `scripts/migration-results.json` - Resumo dos resultados

## ✔️ Verificar Migração

1. **No Firebase Console:**
   - Acesse o novo projeto `chamadosmcnew`
   - Veja se os dados aparecem em Firestore
   - Verifique o Storage
   - Verifique Authentication

2. **Testar a aplicação:**
   ```bash
   npm run dev
   ```
   - Faça login com uma conta existente
   - Verifique se os dados estão carregando
   - Teste as funcionalidades

## 🚨 Possíveis Problemas

### Erro: "private_key contains invalid characters"
**Solução:** Certifique-se de que `private_key` está entre aspas duplas e com `\n` para quebras de linha.

### Erro: "Permission denied" ao copiar Storage
**Solução:** Verifique as permissões das service accounts nos buckets do Storage.

### Erro: "auth/uid-already-exists"
**Solução:** É normal se o usuário já existe no destino - o script ignora e continua.

## 🔄 Próximos Passos

Após a migração bem-sucedida:

1. **Testar completamente** a aplicação com dados migrados
2. **Validar integridade** dos dados
3. **Fazer backup** do projeto antigo antes de deletar
4. **Atualizar documentação** do projeto
5. **Fazer push** das mudanças:
   ```bash
   git add .env.local
   git commit -m "chore: Migrar Firebase para chamadosmcnew"
   git push
   ```

## 📞 Suporte

Se encontrar problemas:
1. Verifique o arquivo `scripts/migration.log`
2. Confirme que as credenciais estão corretas
3. Verifique as permissões do IAM no Google Cloud Console
4. Consulte a documentação oficial: https://firebase.google.com/docs

---

**Criado em:** $(date)
**Status:** Pronto para usar
