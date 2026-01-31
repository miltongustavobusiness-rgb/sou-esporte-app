# Análise Completa do Módulo de Grupos - Sou Esporte App

## 📊 RESUMO DA ANÁLISE

### Telas Mobile Identificadas (8 telas)
1. **MyGroupsScreen.tsx** - Lista de grupos do usuário
2. **CreateGroupScreen.tsx** - Criar novo grupo
3. **EditGroupScreen.tsx** - Editar grupo existente
4. **GroupDetailScreen.tsx** - Detalhes do grupo (Feed, Treinos, Ranking, Chat)
5. **GroupChatScreen.tsx** - Chat dedicado do grupo
6. **GroupRankingScreen.tsx** - Ranking do grupo
7. **ManageMembersScreen.tsx** - Gerenciar membros (modal)
8. **InviteMembersScreen.tsx** - Convidar membros

### Rotas API Mobile Identificadas (14 rotas)
| Rota | Status | Problema |
|------|--------|----------|
| `getUserGroups` | ⚠️ | Usa raw SQL - OK |
| `createGroup` | ⚠️ | Usa Drizzle - pode falhar |
| `getGroup` | ⚠️ | Usa Drizzle - pode falhar |
| `joinGroup` | ⚠️ | Usa Drizzle - pode falhar |
| `leaveGroup` | ⚠️ | Usa Drizzle - pode falhar |
| `getGroupMembers` | ✅ | Usa raw SQL - OK |
| `getPendingInvites` | ✅ | Usa raw SQL - OK |
| `inviteUser` | ✅ | Usa raw SQL - OK |
| `cancelInvite` | ✅ | Usa raw SQL - OK |
| `getGroupMessages` | ❌ | **USA DRIZZLE - FALHA** |
| `sendGroupMessage` | ❌ | **USA DRIZZLE - FALHA** |
| `deleteGroupMessage` | ❌ | **USA DRIZZLE - FALHA** |
| `getGroupPosts` | ⚠️ | Precisa verificar |
| `getTrainings` | ⚠️ | Precisa verificar |

### Funções DB Identificadas (21 funções)
| Função | Status | Usa Raw SQL? |
|--------|--------|--------------|
| `getGroupById` | ⚠️ | Não - pode falhar |
| `createGroup` | ⚠️ | Parcial |
| `getUserGroups` | ✅ | Sim |
| `joinGroup` | ⚠️ | Não |
| `leaveGroup` | ⚠️ | Não |
| `getGroupMembership` | ✅ | Sim |
| `getGroupMembers` | ✅ | Sim |
| `updateGroupMember` | ⚠️ | Não |
| `createGroupInvite` | ✅ | Sim |
| `getGroupPendingInvites` | ✅ | Sim |
| `cancelGroupInvite` | ✅ | Sim |
| `searchUsersNotInGroup` | ⚠️ | Não |
| `getGroupRanking` | ⚠️ | Não |
| `getGroupMessages` | ❌ | **NÃO - FALHA** |
| `sendGroupMessage` | ❌ | **NÃO - FALHA** |
| `getGroupMessage` | ❌ | **NÃO - FALHA** |
| `deleteGroupMessage` | ❌ | **NÃO - FALHA** |

---

## 🔴 ERROS CRÍTICOS IDENTIFICADOS

### 1. Chat do Grupo (CRÍTICO)
**Erro:** `Failed query: select group_messages...`
**Causa:** Drizzle ORM não consegue serializar colunas enum (`status`)
**Funções afetadas:**
- `getGroupMessages()` - SELECT falha
- `sendGroupMessage()` - INSERT falha
- `deleteGroupMessage()` - UPDATE falha

### 2. Convite de Membros (PARCIALMENTE CORRIGIDO)
**Erro:** `Invalid input: expected number, received string`
**Causa:** `groupId` sendo passado como string "temp" em vez de número
**Local:** InviteMembersScreen.tsx

### 3. Listagem de Grupos (PARCIALMENTE CORRIGIDO)
**Erro:** `API Error: 500`
**Causa:** Drizzle ORM com enum columns
**Status:** Já corrigido com raw SQL

---

## 📋 PLANO DE CORREÇÃO DETALHADO

### FASE 1: Corrigir Chat do Grupo (CRÍTICO)
**Arquivos:** `api/server/db.ts`
**Funções a corrigir:**
1. `getGroupMessages()` - Converter para raw SQL
2. `sendGroupMessage()` - Converter para raw SQL
3. `deleteGroupMessage()` - Converter para raw SQL
4. `getGroupMessage()` - Converter para raw SQL

**Estimativa:** 30 minutos

### FASE 2: Corrigir Convite de Membros
**Arquivos:** `mobile/src/screens/InviteMembersScreen.tsx`
**Correções:**
1. Garantir que `groupId` seja sempre número
2. Validar parâmetros antes de chamar API

**Estimativa:** 15 minutos

### FASE 3: Verificar e Corrigir Funções Restantes
**Arquivos:** `api/server/db.ts`
**Funções a verificar/corrigir:**
1. `getGroupById()` - Verificar se usa enum
2. `joinGroup()` - Verificar se usa enum
3. `leaveGroup()` - Verificar se usa enum
4. `updateGroupMember()` - Verificar se usa enum
5. `searchUsersNotInGroup()` - Verificar se usa enum
6. `getGroupRanking()` - Verificar se usa enum

**Estimativa:** 45 minutos

### FASE 4: Testar Fluxos Completos
**Fluxos a testar:**
1. Criar grupo → Ver na lista → Acessar detalhes
2. Convidar membro → Aceitar convite → Ver na lista
3. Enviar mensagem no chat → Ver mensagens
4. Criar post no feed → Ver no feed
5. Ver ranking do grupo

**Estimativa:** 30 minutos

### FASE 5: Funcionalidades Faltantes (se houver)
**Verificar se existe:**
1. Editar grupo (EditGroupScreen)
2. Excluir grupo
3. Transferir propriedade
4. Configurações de notificação
5. Banir membro
6. Promover/rebaixar membro

---

## 🎯 FUNCIONALIDADES ESPERADAS DO MÓDULO

### Criar Grupo
- [x] Tela de criação
- [x] Rota API
- [x] Função DB
- [ ] Validação completa
- [ ] Upload de imagem de capa

### Listar Grupos
- [x] Tela "Meus Grupos"
- [x] Separação: Meus Grupos vs Grupos que Participo
- [x] Rota API (corrigida)
- [x] Função DB (corrigida)

### Detalhes do Grupo
- [x] Tela de detalhes
- [x] Abas: Feed, Treinos, Ranking, Chat
- [ ] Feed funcionando
- [ ] Treinos funcionando
- [ ] Ranking funcionando
- [ ] Chat funcionando ❌

### Gerenciar Membros
- [x] Tela de membros (modal)
- [x] Listar membros
- [ ] Promover/rebaixar
- [ ] Remover membro
- [ ] Banir membro

### Convidar Membros
- [x] Tela de convite
- [x] Buscar pessoas que segue
- [ ] Enviar convite ❌ (erro de tipo)
- [ ] Cancelar convite
- [ ] QR Code
- [ ] Link de convite

### Chat do Grupo
- [x] Tela de chat
- [ ] Carregar mensagens ❌
- [ ] Enviar mensagem ❌
- [ ] Responder mensagem
- [ ] Deletar mensagem ❌

---

## ⚠️ RISCOS E CONSIDERAÇÕES

1. **Drizzle ORM vs Raw SQL**: O Drizzle está tendo problemas com colunas enum do MySQL. A solução é usar raw SQL para todas as queries que envolvem tabelas com enum.

2. **Consistência de Dados**: Ao criar grupo, o owner deve ser adicionado automaticamente como membro.

3. **Validação de Tipos**: Garantir que IDs sejam sempre números, não strings.

4. **Performance**: Raw SQL pode ser mais verboso mas é mais confiável.

---

## 📝 PRÓXIMOS PASSOS

Aguardando aprovação do usuário para executar o plano de correção em fases.
