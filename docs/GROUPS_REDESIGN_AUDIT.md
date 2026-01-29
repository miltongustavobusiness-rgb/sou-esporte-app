# Auditoria - Redesign de Grupos

## Estado Atual

### 1. Botão "Criar Grupo"
- **Localização:** `FeedScreen.tsx` linha 58 (QUICK_ACTIONS)
- **Rota:** Navega para `CreateGroup`
- **Tela:** `CreateGroupScreen.tsx`

### 2. Telas de Grupos Existentes
- `CreateGroupScreen.tsx` - Criação de grupo
- `GroupDetailScreen.tsx` - Detalhes do grupo
- `GroupChatScreen.tsx` - Chat do grupo
- `GroupRankingScreen.tsx` - Ranking do grupo

### 3. API de Grupos
- `groups.list` - Lista grupos do usuário (getUserGroups)
- `groups.get` - Detalhes de um grupo
- `groups.create` - Criar grupo
- `groups.join` - Entrar no grupo
- `groups.leave` - Sair do grupo
- `groups.getGroup` - Detalhes com membership
- `groups.getMembers` - Lista membros
- `groups.getMembership` - Verifica membership do usuário

### 4. Estrutura de Membership
```typescript
interface MembershipData {
  role: 'owner' | 'admin' | 'moderator' | 'member';
  canCreateTraining: boolean;
  status: string;
}
```

### 5. Verificação de Permissões
- `isOwner = group.ownerId === ctx.user.id`
- `isAdmin = membership?.role === 'admin' || membership?.role === 'owner'`
- `canManage = membership?.role === 'owner' || membership?.role === 'admin'`

## Arquivos a Modificar

| Arquivo | Motivo |
|---------|--------|
| `FeedScreen.tsx` | Substituir "Criar Grupo" por "Meus Grupos" no QUICK_ACTIONS |
| `MyGroupsScreen.tsx` (NOVO) | Criar tela "Meus Grupos" com seções Admin/Membro |
| `App.tsx` ou `navigation` | Adicionar rota MyGroups |
| `services/api.ts` | Já tem getUserGroups, verificar se retorna role |

## Fluxo Proposto

1. Usuário clica em "Meus Grupos" no QUICK_ACTIONS
2. Abre tela MyGroupsScreen
3. Tela mostra:
   - Botão "+ Criar Grupo" no topo
   - Seção "Grupos que administro" (role = owner/admin)
   - Seção "Grupos que participo" (role = member/moderator)
   - Seção "Convites pendentes" (se houver)
4. Cada card mostra badge de papel (👑 Admin / 🏃 Membro)
5. Tap no card abre GroupDetailScreen
6. Botão "+ Criar Grupo" navega para CreateGroupScreen (reutiliza)
