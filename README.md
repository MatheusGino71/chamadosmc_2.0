# Sistema de Chamados - MeuCurso

Sistema completo de abertura e gerenciamento de chamados desenvolvido com Next.js 14, TypeScript e Firebase.

🌐 **[Acesse o sistema em produção](https://chamadosmeucurso.vercel.app)**

## 🚀 Tecnologias

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Firebase**
  - Authentication - Sistema de login e cadastro
  - Firestore - Banco de dados NoSQL em tempo real
  - Storage - Armazenamento de imagens
- **Tailwind CSS** - Estilização
- **React Beautiful DnD** - Drag and drop para kanban
- **Lucide React** - Ícones modernos

## 📋 Funcionalidades

### Para Usuários
- ✅ Cadastro e login com email/senha
- ✅ Criação de chamados com:
  - Título, descrição e setor
  - Upload de imagem (opcional)
  - ID único automático (CHM-2026-XXXX)
- ✅ Visualização dos próprios chamados
- ✅ Dashboard com estatísticas (total, abertos, em andamento, resolvidos)
- ✅ Updates em tempo real

### Para Administradores
- ✅ Painel administrativo exclusivo
- ✅ Kanban board com 4 colunas:
  - Aberto
  - Em Andamento
  - Resolvido
  - Fechado
- ✅ Drag & drop para mover chamados entre status
- ✅ Visualização de todos os chamados
- ✅ Updates em tempo real

## 🔧 Configuração

### 1. Instalar dependências

\`\`\`bash
npm install
\`\`\`

### 2. Configurar Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto (ou use um existente)
3. Ative os seguintes serviços:
   - **Authentication** > Sign-in method > Email/Password
   - **Firestore Database** > Criar banco de dados (modo produção)
   - **Storage** > Criar bucket

4. Vá em **Project Settings** > **General**
5. Em "Your apps", clique em "Web" (</>) para criar um app web
6. Copie as credenciais do Firebase

### 3. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env.local`:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Edite `.env.local` e adicione suas credenciais do Firebase:

\`\`\`env
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
\`\`\`

### 4. Configurar regras do Firestore

No Firebase Console, vá em **Firestore Database** > **Rules** e adicione:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regras para users
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth.uid == userId || 
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Regras para tickets
    match /tickets/{ticketId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                       (resource.data.userId == request.auth.uid || 
                        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow delete: if request.auth != null && 
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Regras para mensagens do chat
    match /messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                      request.resource.data.senderId == request.auth.uid;
      allow delete: if request.auth != null && 
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
\`\`\`

### 5. Configurar regras do Storage

No Firebase Console, vá em **Storage** > **Rules** e adicione:

\`\`\`javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /tickets/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
\`\`\`

### 6. Criar usuário administrador

Depois de iniciar o projeto, crie um usuário normalmente. Em seguida, no Firebase Console:

1. Vá em **Firestore Database**
2. Encontre a coleção `users`
3. Localize o documento do usuário que será admin
4. Edite o campo `role` de `"user"` para `"admin"`

## 🚀 Executar o projeto

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── admin/              # Painel administrativo
│   │   ├── layout.tsx      # Layout protegido para admins
│   │   └── page.tsx        # Kanban board
│   ├── dashboard/          # Dashboard do usuário
│   │   ├── novo-chamado/   # Criação de chamados
│   │   ├── layout.tsx      # Layout protegido
│   │   └── page.tsx        # Lista de chamados
│   ├── login/
│   │   └── page.tsx        # Página de login
│   ├── register/
│   │   └── page.tsx        # Página de cadastro
│   ├── layout.tsx          # Layout raiz
│   ├── page.tsx            # Página inicial (redirect)
│   └── globals.css         # Estilos globais
├── contexts/
│   └── AuthContext.tsx     # Context de autenticação
├── lib/
│   ├── firebase.ts         # Configuração Firebase
│   ├── storage.ts          # Upload de imagens
│   └── ticketId.ts         # Gerador de IDs únicos
└── types/
    └── index.ts            # TypeScript interfaces
```

## 🎨 Características Técnicas

- **App Router** do Next.js 14
- **Server Components** e **Client Components** otimizados
- **Realtime Updates** com Firestore listeners
- **Protected Routes** com middleware de autenticação
- **Responsive Design** mobile-first
- **TypeScript** com tipagem completa
- **Image Optimization** com Next.js Image

## 🔐 Segurança

- Senhas criptografadas pelo Firebase Auth
- Regras de segurança no Firestore e Storage
- Validação de tipos de arquivo e tamanho
- Rotas protegidas com validação de role
- Tokens JWT gerenciados pelo Firebase

## 📝 Modelo de Dados

### User
```typescript
{
  uid: string;
  email: string;
  nome: string;
  setor: string;
  role: 'user' | 'admin';
  createdAt: Date;
}
```

### Ticket
```typescript
{
  id: string;
  ticketId: string; // CHM-2026-0001
  titulo: string;
  descricao: string;
  status: 'aberto' | 'em-andamento' | 'resolvido' | 'fechado';
  setor: string;
  imageUrl?: string;
  userId: string;
  userName: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## 📄 Licença

Este projeto está sob a licença MIT.
