# Script para Criar Usuário Administrador

## Credenciais do Admin:
- **Email:** administrador@meucurso.com.br
- **Senha:** Meucurso123

## Método 1: Via Interface (Recomendado)

1. Acesse a página de **Cadastro**: http://localhost:3000/register
2. Preencha os campos:
   - Nome: Administrador
   - Email: administrador@meucurso.com.br
   - Setor: TI
   - Senha: Meucurso123
   - Confirmar Senha: Meucurso123
3. Clique em "Cadastrar"
4. Após criar, vá ao Firebase Console:
   - Acesse: https://console.firebase.google.com/project/chamadosmeucurso/firestore/data
   - Navegue até a coleção `users`
   - Encontre o usuário com email `administrador@meucurso.com.br`
   - Edite o documento e altere o campo `role` de `"user"` para `"admin"`
5. Faça logout e login novamente para acessar o painel admin

## Método 2: Direto no Firebase Console

1. **Authentication:**
   - Acesse: https://console.firebase.google.com/project/chamadosmeucurso/authentication/users
   - Clique em "Add user"
   - Email: administrador@meucurso.com.br
   - Password: Meucurso123
   - Copie o UID gerado

2. **Firestore:**
   - Acesse: https://console.firebase.google.com/project/chamadosmeucurso/firestore/data
   - Vá para a coleção `users`
   - Clique em "Add document"
   - Document ID: Cole o UID copiado
   - Adicione os campos:
     ```
     email: administrador@meucurso.com.br
     nome: Administrador
     setor: TI
     role: admin
     createdAt: timestamp (now)
     ```
   - Salvar

## Acessar Painel Admin

Após criar o usuário admin, acesse:
- Login: http://localhost:3000/login
- Use: administrador@meucurso.com.br / Meucurso123
- Você será redirecionado para: http://localhost:3000/admin

## Funcionalidades do Painel Admin (Kanban)

✅ **Drag & Drop** - Arraste cards entre as colunas
✅ **4 Colunas** - Aberto, Em Andamento, Resolvido, Fechado
✅ **Updates em Tempo Real** - Mudanças sincronizadas instantaneamente
✅ **Cards Informativos** - ID, tipo (Bug/Melhoria), título, descrição, imagem, URL, usuário, setor, data
✅ **Estatísticas** - Dashboard com contadores por status
✅ **Visual Trello-like** - Design inspirado no Trello
