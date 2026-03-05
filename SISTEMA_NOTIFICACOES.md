# Sistema de Notificações

## Visão Geral

Sistema completo de notificações em tempo real implementado no sistema de chamados, permitindo que administradores enviem mensagens uns aos outros e recebam notificações automáticas sobre eventos importantes dos chamados.

## Funcionalidades Implementadas

### 1. **Notificações em Tempo Real**

O sistema monitora eventos e envia notificações automaticamente para os usuários relevantes:

#### Tipos de Notificações

- **`ticket_assigned`**: Quando um chamado é atribuído a um administrador
- **`ticket_status_changed`**: Quando o status de um chamado é alterado
- **`ticket_priority_changed`**: Quando a prioridade de um chamado é modificada
- **`ticket_message`**: Quando há uma nova mensagem em um chamado
- **`admin_message`**: Quando um administrador recebe uma mensagem direta de outro administrador

### 2. **Sistema de Conversas entre Administradores**

- Administradores podem enviar mensagens diretas uns aos outros
- **Conversas bidirecionais**: Ambas as partes (remetente e destinatário) podem ver e responder mensagens
- **Threads de conversa**: Mensagens são agrupadas em conversas contínuas
- Interface dedicada para visualizar conversas com histórico completo
- **Responder mensagens**: Campo de resposta rápida dentro da visualização da conversa
- Contador de mensagens não lidas por conversa
- Marcação automática de mensagens como lidas ao abrir a conversa

### 3. **Central de Notificações**

Componente visual no header com:

- Badge mostrando quantidade de notificações não lidas
- Modal em tela cheia com lista de notificações
- Opção de marcar todas como lidas
- Ícone diferenciado por tipo de notificação
- Timestamp relativo (ex: "há 5 minutos")

## Estrutura de Arquivos

### Novos Arquivos Criados

```
src/
├── lib/
│   └── notifications.ts              # Serviço de notificações e conversas
├── components/
│   ├── NotificationCenter.tsx        # Componente central de notificações
│   ├── SendMessageModal.tsx          # Modal para enviar mensagens
│   ├── MessagesInbox.tsx             # Lista de conversas
│   └── ConversationView.tsx          # Visualização de conversa com histórico e respostas
└── types/
    └── index.ts                      # Tipos atualizados (Notification, AdminMessage, Conversation)
```

### Arquivos Modificados

- `src/app/admin/page.tsx` - Integração dos componentes de notificação e conversas
- `src/app/dashboard/page.tsx` - Adição do centro de notificações para usuários
- `src/components/TicketModal.tsx` - Envio de notificações em eventos do ticket
- `firestore.rules` - Regras de segurança para novas coleções

## Como Usar

### Para Administradores

#### Enviar Mensagem

1. Na página admin, clique no botão "Enviar Mensagem"
2. Selecione o destinatário da lista de administradores
3. Digite o assunto e a mensagem
4. Clique em "Enviar Mensagem"

#### Ver Conversas

1. Clique no botão "Mensagens" no header
2. Visualize todas as conversas com outros administradores
3. Clique em uma conversa para ver o histórico completo de mensagens
4. Use o campo de texto na parte inferior para responder
5. Pressione Enter para enviar ou Shift+Enter para quebra de linha
6. Conversas com mensagens não lidas aparecem destacadas com contador

#### Ver Notificações

1. Clique no ícone de sino no header
2. Veja todas as notificações em ordem cronológica
3. Clique em "Marcar todas" para marcar todas como lidas
4. Notificações não lidas mostram um ponto azul

### Para Usuários Comuns

- Recebem notificações quando:
  - O status do seu chamado é alterado
  - A prioridade do seu chamado é modificada
  - Um administrador envia uma mensagem no ticket

## Notificações Automáticas

### Eventos que Geram Notificações:

#### 1. Atribuição de Chamado
```typescript
// Quando um admin atribui um chamado a outro admin
notifyTicketAssigned(ticketId, ticketNumber, titulo, adminId, assignedBy, assignedByName)
```

#### 2. Mudança de Status
```typescript
// Quando o status do chamado muda (drag & drop ou atualização)
notifyTicketStatusChanged(ticketId, ticketNumber, titulo, newStatus, userId, changedBy, changedByName)
```

#### 3. Mudança de Prioridade
```typescript
// Quando a prioridade do chamado é alterada
notifyTicketPriorityChanged(ticketId, ticketNumber, titulo, newPriority, userId, changedBy, changedByName)
```

#### 4. Nova Mensagem no Ticket
```typescript
// Quando alguém comenta no ticket
notifyNewTicketMessage(ticketId, ticketNumber, titulo, recipientId, senderId, senderName, message)
```

## Regras de Segurança do Firestore

As seguintes coleções foram adicionadas ao Firestore com regras de segurança apropriadas:

### `notifications`
- **Read**: Usuários podem ler apenas suas próprias notificações
- **Create**: Qualquer usuário autenticado pode criar (para o sistema)
- **Update**: Usuários podem atualizar apenas suas próprias notificações
- **Delete**: Usuários podem deletar suas próprias notificações

### `adminMessages`
- **Read**: Apenas rem

```typescript
// Criar notificação
createNotification(type, title, message, recipientId, options?)

// Marcar como lida
markNotificationAsRead(notificationId)

// Marcar todas como lidas
markAllNotificationsAsRead(userId)

// Escutar notificações em tempo real
subscribeToNotifications(userId, callback)

// Enviar mensagem entre admins (cria conversa automaticamente)
sendAdminMessage(senderId, senderName, recipientId, recipientName, subject, message)

// Marcar mensagem como lida
markAdminMessageAsRead(messageId)

// Escutar todas as mensagens (recebidas E enviadas)
subscribeToAdminMessages(userId, callback)

// Escutar mensagens de uma conversa específica
subscribeToConversationMessages(conversationId, callback)

// Agrupar mensagens em conversas
groupMessagesIntoConversations(messages, currentUserId)

// Marcar todas as mensagens de uma conversa como lidas
markConversationAsRead(conversationId, userId)
```

## Estrutura de Dados

### Notification

```typescript
{
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  ticketId?: string;
  ticketNumber?: string;
  read: boolean;
  createdAt: Date;
}
```

### AdminMessage

```typescript
{
  id: string;
  conversationId: string;    // ID único da conversa (combinação dos IDs ordenados)
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: Date;
  readAt?: Date;
}
```

### Conversation

```typescript
{
  id: string;                // conversationId
  participantIds: string[];  // IDs dos participantes
  participantNames: string[]; // Nomes dos participantes
  lastMessage: string;       // Última mensagem da conversa
  lastMessageDate: Date;     // Data da última mensagem
  unreadCount: number;       // Mensagens não lidas
  subject: string;           // Assunto da conversa
}
```

## Componentes UI

### NotificationCenter

- Badge com contador de não lidas
- Modal em tela cheia com lista de notificações
- Ícones coloridos por tipo
- Tempo relativo de criação
- Ação de marcar todas como lidas

### SendMessageModal

- Formulário para enviar mensagens
- Seleção de destinatário (lista de admins)
- Campos de assunto e mensagem
- Validação de campos obrigatórios
- Limite de caracteres

### MessagesInbox

- **Modal centralizado**: Abre no centro da tela
- Lista de conversas (não mensagens individuais)
- Mostra último preview de mensagem
- Indicador de mensagens não lidas por conversa
- Avatar do outro participante
- Timestamp da última mensagem
- Abre ConversationView ao clicar

### ConversationView

- **Área de mensagens com scroll**: Arraste ou role para ver mensagens anteriores
- Histórico completo de mensagens da conversa
- Scrollbar personalizada e visível
- Bolhas de mensagem com diferenciação visual (remetente vs destinatário)
- Campo de texto para responder
- Envio com Enter (Shift+Enter para quebra de linha)
- Scroll manual: você controla onde quer visualizar no histórico
- Marca mensagens como lidas automaticamente

### MessagesInbox
- Lista de mensagens recebidas
- Visualização individual de mensagens
- Indicador de não lidas
- Avatar do remetente
- Timestamp formatado

## Melhorias Futuras Sugeridas

1. **Preferências de Notificação**
   - Permitir usuários escolherem quais tipos de notificação desejam receber
   - Opção de silenciar notificações por um período

2. **Notificações Push**
   - Integrar com Firebase Cloud Messaging
   - Notificações no navegador mesmo com aba fechada

3. **Histórico de Notificações**
   - Página dedicada com todas as notificações antigas
   - Filtros por tipo e data
   - Busca em notificações

4. **Recursos de Conversa Avançados**
   - Anexar arquivos nas mensagens
   - Emojis e formatação de texto (negrito, itálico)
   - Indicador de "digitando..."
   - Confirmação de leitura (visto)
   - Busca dentro de conversas

5. **Notificações por Email**
   - Enviar email quando houver notificações importantes
   - Digest diário de notificações
   - Resumo de conversas não respondidas

6. **Grupos de Administradores**
   - Enviar mensagens para grupos
   - Criar canais de comunicação por departamento
   - Conversas em grupo com múltiplos participantes

7. **Arquivamento de Conversas**
   - Opção para arquivar conversas antigas
   - Filtro para ver conversas arquivadas
   - Restaurar conversas arquivadas

## Deploy

Após implementar o sistema, certifique-se de:

1. **Atualizar as regras do Firestore:**
```bash
firebase deploy --only firestore:rules
```

2. **Testar as notificações:**
   - Criar um chamado
   - Atribuir a um admin
   - Alterar status e prioridade
   - Enviar mensagens
   - Enviar mensagem entre admins

3. **Verificar permissões:**
   - Testar com usuário comum e admin
   - Verificar se notificações aparecem em tempo real
   - Confirmar que apenas destinatários corretos recebem notificações

## Suporte

Para dúvidas ou problemas com o sistema de notificações, verifique:
1. Console do navegador para erros
2. Regras do Firestore estão atualizadas
3. Usuário está autenticado
4. Conexão com Firebase está ativa
