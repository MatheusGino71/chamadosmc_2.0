# 🧪 Guia de Testes - Sistema de Formulários Dinâmicos

## 📋 Resumo
Este documento fornece um guia completo para testar o novo sistema de formulários dinâmicos customizáveis por setor.

---

## ✅ Checklist de Verificação

### 1️⃣ **Inicializar Dados (Admin T.I)**

**O que testar:** Seed das configurações iniciais

**Passos:**
- [ ] Abrir console do navegador (F12)
- [ ] Executar:
```javascript
const { httpsCallable } = require('firebase/functions');
const functions = require('./src/lib/firebase').default; // Ajuste conforme necessário
const initFn = httpsCallable(functions, 'initializeFormConfigs');
initFn({}).then(result => console.log(result)).catch(err => console.error(err));
```
**Esperado:** Mensagem de sucesso mostrando quantos formulários foram inicializados

---

### 2️⃣ **Acessar Interface de Customização (Admin Setorial)**

**O que testar:** Gestor consegue acessar page de formulários

**Passos:**
- [ ] Login como `admin_pedagogico` (ou outro admin setorial)
- [ ] Ir para `/admin`
- [ ] Clique no botão verde **"Formulários"**
- [ ] Deve abrir página `/admin/formularios`

**Esperado:**
- ✅ Página carrega com heading "Customizar Formulário"
- ✅ Mostra o setor do gestor (ex: "Setor: Pedagógico")
- ✅ Aba "Tipos de Chamado" fechada por padrão
- ✅ Aba "Campos Customizados" fechada por padrão
- ✅ Botão "Preview" e "Salvar" no topo

---

### 3️⃣ **Gerenciar Tipos de Chamado**

**O que testar:** Criar, editar e deletar tipos customizados

**Passos:**
1. Nella página de formulários, clique em "Tipos de Chamado"
2. [ ] **Expand:** Expandir a aba clicando no toggle
   - [ ] Deve mostrar tipos padrão (Bug, Melhoria, Infra)
3. [ ] **Edit:** Clique no ícone edit (lápis) em um tipo
   - [ ] Modal abre para editar nome/descrição
   - [ ] Salvar mudanças
4. [ ] **Add:** Scroll down e clique "+ Adicionar Tipo"
   - [ ] Digite nome: "Dúvida de Aluno"
   - [ ] Digite descrição: "Questões de alunos sobre conteúdo"
   - [ ] Clique "Adicionar Tipo"
5. [ ] **Delete:** Clique ícone trash em um tipo
   - [ ] Tipo é removido da lista

**Esperado:** Tipos aparecem/desaparecem conforme ações

---

### 4️⃣ **Gerenciar Campos Customizados**

**O que testar:** Criar, reordenar e deletar campos

**Passos:**
1. Clique em "Campos Customizados"
2. [ ] **Expand:** Expandir a aba
   - [ ] Deve mostrar mensagem se vazio
3. [ ] **Add:** Clique "+ Novo Campo"
   - [ ] Modal abre para criar campo
   - [ ] Preencha:
     - Nome: "ID do Aluno"
     - Tipo: "text"
     - Descrição: "ID único do aluno"
     - Obrigatório: ✅ Checked
     - Placeholder: "Ex: 12345"
   - [ ] Clique "Criar"
4. [ ] **Edit:** Campo aparece na lista
   - [ ] Clique ícone edit (lápis)
   - [ ] Modifique e clique "Atualizar"
5. [ ] **Reorder:** Criar 2-3 campos
   - [ ] Clique ⬆️/⬇️ para reordenar
   - [ ] Ordem deve atualizar

**Esperado:**
- Campo aparece com badge de tipo (ex: "text")
- Obrigatório aparece em vermelho se marcado
- Reordenação funciona suavemente

---

### 5️⃣ **Preview em Tempo Real**

**O que testar:** Preview mostra formulário customizado

**Passos:**
1. [ ] Clique botão "Preview" no topo
2. [ ] Página muda mas mantém header
3. [ ] Deve mostrar:
   - Heading "Preview do Formulário"
   - Tipo de Chamado com botões dinâmicos
   - Campos Globais (Título, Descrição, Imagens)
   - Seção "Campos Customizados do Setor"
   - Seus campos customizados renderizados
4. [ ] Clique "Editar" para voltar ao editor
5. [ ] Modifique algo e clique "Preview"
   - [ ] Mudanças aparecem no preview

**Esperado:** Preview atualiza em tempo real com mudanças

---

### 6️⃣ **Salvar Configuração**

**O que testar:** Salvar alterações para o banco de dados

**Passos:**
1. [ ] No editor, clique "Salvar"
2. [ ] Deve mostrar toast azul "Formulário salvo com sucesso!"
3. [ ] Recarregue a página (F5)
4. [ ] Os tipos e campos customizados ainda devem estar lá

**Esperado:**
- ✅ Toast de sucesso aparece
- ✅ Dados persistem após reload
- ✅ Nenhuma mensagem de erro

---

### 7️⃣ **Criar Chamado com Formulário Customizado (User)**

**O que testar:** Usuário normal vê campos customizados

**Passos:**
1. [ ] Login como usuário common (não admin)
2. [ ] Ir para `/dashboard/novo-chamado`
3. [ ] Selecione o setor customizado (ex: "Pedagógico")
4. [ ] Página deve:
   - [ ] Mostrar tipos dinâmicos (ex: "Dúvida de Aluno", não "Bug")
   - [ ] NÃO mostrar campo "Sistema" (para o setor)
   - [ ] Mostrar seus campos customizados (ex: "ID do Aluno")
5. [ ] Preencha o formulário:
   - Selecione um tipo customizado
   - Título (mín 5 caracteres)
   - Descrição
   - Campos customizados (obrigatórios)
   - Imagens (até 3)
6. [ ] Clique enviar

**Esperado:**
- ✅ Campos customizados renderizam como tipos definidos
- ✅ Validação client-side funciona (campos obrigatórios)
- ✅ Chamado é criado com sucesso
- ✅ Rediretor para dashboard

---

### 8️⃣ **Validação de Campos Obrigatórios**

**O que testar:** Campos obrigatórios não permitem envio vazio

**Passos:**
1. [ ] Ir para novo-chamado
2. [ ] Selecione setor com campos customizados obrigatórios
3. [ ] Deixe campo obrigatório VAZIO
4. [ ] Tente enviar (clique botão submit)

**Esperado:**
- ⚠️ Toast de erro aparece
- ⚠️ Campo obrigatório recebe highlight de erro
- ❌ Chamado NÃO é criado

---

### 9️⃣ **T.I Mantém Estrutura Padrão**

**O que testar:** T.I segue o fluxo padrão

**Passos:**
1. [ ] Login como `admin_ti`
2. [ ] Ir para `/admin/formularios`
3. [ ] Deve mostrar tipos padrão: Bug, Melhoria, Infra
4. [ ] Criar novo chamado como usuário T.I
5. [ ] Campo "Sistema" deve aparecer (BIPE, Área do Aluno, etc)
6. [ ] Tipos do formulário devem ser os padrão em cards visuais

**Esperado:**
- ✅ Tipos padrão são renderizados
- ✅ Campo "Sistema" visível
- ✅ Ícones (Bug, Sparkles, Wrench) aparecem

---

### 🔟 **Permissões e Segurança**

**O que testar:** Apenas admins corretos podem customizar

**Passos:**
1. [ ] Login como `admin_pedagogico`
   - [ ] Pode acessar `/admin/formularios`
   - [ ] Pode customizar apenas o formulário do seu setor
2. [ ] Login como `admin_comercial`
   - [ ] Pode acessar `/admin/formularios`
   - [ ] Vê seu próprio setor ("Comercial")
3. [ ] Login como usuário common
   - [ ] NÃO consegue acessar `/admin/formularios`
   - [ ] Redirecionado para `/admin`

**Esperado:**
- ✅ Cada admin vê apenas seu setor
- ✅ Usuários comuns não acessam
- ✅ Cloud Functions validam permissões

---

### 1️⃣1️⃣ **Dados em Firestore**

**O que testar:** Dados são salvos corretamente

**Passos:**
1. [ ] Abra Firebase Console
2. [ ] Vá para Firestore > Collection: `formConfigs`
3. [ ] Procure por `setor_pedagogico` (exemplo)
4. [ ] Deve conter:
   - `setor: "Pedagógico"`
   - `tiposChamado: [...]`
   - `camposCustomizados: [...]`
   - `versao: X`
   - `createdAt, updatedAt, createdBy`

**Esperado:** Documento existe e tem estrutura correta

---

### 1️⃣2️⃣ **Checklist de Edge Cases**

**O que testar:** Casos extremos

| Teste | Passos | Esperado |
|-------|--------|----------|
| **Campo vazio** | Deixar campo customizado vazio se obrigatório | ❌ Toast de erro, não envia |
| **Max caracteres** | Campo com maxLength=10, digitar 20 | ✅ Tipo de campo trunca ou mostra erro |
| **E-mail inválido** | Campo email, digitar "abc" | ⚠️ Aviso ou rejeição |
| **Setor sem custom** | Setor sem campos customizados | ✅ Apenas campos globais aparecem |
| **N tipos** | Setor com 5+ tipos | ✅ Layout adapta (grid 2 cols se > 3) |

---

## 🚀 Passos Após Validação Completar

- [ ] Testar em produção (se aplicável)
- [ ] Executar `initializeFormConfigs` uma única vez em prod
- [ ] Avisar gestores sobre novo sistema
- [ ] Criar documentação para gestores
- [ ] Monitorar logs para erros

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| Cloud Functions não aparecem | Deploy com `firebase deploy --only functions` |
| FormConfig não carregando | Executar `initializeFormConfigs` |
| Campos não renderizam | Verificar `DynamicFormRenderer` props |
| Permissões negadas | Verificar `firestore.rules` e custom claims |
| Toast não aparece | Verificar se `sonner` está instalado |

---

## 📝 Notas

- Versão: 3.0 - Formulários Dinâmicos
- Data: 08/04/2026
- Status: Implementação Completa ✅
