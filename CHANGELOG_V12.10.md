# CHANGELOG V12.10 - Groups Expanded

**Data:** 27 de Janeiro de 2026  
**Versão Base:** V12.9-Sou-Esporte-Auth-Flow

---

## 📋 Resumo

Implementação completa do sistema de Grupos expandido conforme `group_master_prompt.pdf`, incluindo:
- Novas modalidades de treino (Funcional, Caminhada/Trail, Yoga, Lutas)
- Gestão completa de membros com permissões granulares
- Sistema de ranking interno por modalidade
- Chat em tempo real do grupo
- GroupDetail como hub central

---

## 🆕 Novas Funcionalidades

### 1. Modalidades de Treino Especializadas
- **Funcional**: Circuitos, HIIT, treinos de força com exercícios e equipamentos
- **Caminhada/Trail**: Trilhas com distância, elevação, dificuldade e terreno
- **Yoga**: Sessões com estilo, nível, áreas de foco e duração
- **Lutas**: Artes marciais com tipo de treino, sparring e equipamentos

### 2. Gestão de Membros (ManageMembersScreen)
- Listagem de todos os membros com busca
- Sistema de cargos: Owner, Admin, Moderador, Membro
- Permissão granular para criar treinos
- Convidar novos membros por busca
- Remover membros do grupo

### 3. Ranking Interno (GroupRankingScreen)
- Ranking por modalidade (Geral, Corrida, Funcional, Trail, Yoga, Lutas)
- Filtro por período (Geral, Este Mês, Esta Semana)
- Pódio visual para top 3
- Posição do usuário atual destacada
- Pontuação baseada em participações

### 4. Chat do Grupo (GroupChatScreen)
- Mensagens em tempo real (polling 5s)
- Respostas a mensagens específicas
- Avatares e nomes dos remetentes
- Formatação de tempo inteligente

### 5. GroupDetail como Hub Central
- Quick Actions: Membros, Ranking, Chat, Criar Treino
- Abas: Feed, Treinos, Ranking, Chat
- Modal para seleção de tipo de treino
- Integração com todas as novas telas

---

## 📁 Arquivos Criados

### Mobile (Telas)
| Arquivo | Descrição |
|---------|-----------|
| `ManageMembersScreen.tsx` | Gestão de membros do grupo |
| `GroupRankingScreen.tsx` | Ranking interno do grupo |
| `GroupChatScreen.tsx` | Chat em tempo real |
| `CreateFunctionalTrainingScreen.tsx` | Criar treino funcional |
| `CreateHikeScreen.tsx` | Criar caminhada/trilha |
| `CreateYogaSessionScreen.tsx` | Criar sessão de yoga |
| `CreateFightTrainingScreen.tsx` | Criar treino de lutas |

---

## 📁 Arquivos Modificados

### Backend (API)
| Arquivo | Alteração |
|---------|-----------|
| `api/drizzle/schema.ts` | Novas tabelas: functionalTrainings, hikes, yogaSessions, fightTrainings, groupMessages, groupRankings |
| `api/server/routers.ts` | 15+ novos endpoints para grupos expandidos |
| `api/server/db.ts` | Funções de banco para novas tabelas |

### Mobile
| Arquivo | Alteração |
|---------|-----------|
| `App.tsx` | Imports e rotas das 7 novas telas |
| `src/types/index.ts` | 7 novas rotas no RootStackParamList |
| `src/config/api.ts` | 15+ funções de API para grupos |
| `src/screens/GroupDetailScreen.tsx` | Reescrito como hub central |
| `src/screens/CreateGroupScreen.tsx` | Novas modalidades adicionadas |

### Database
| Arquivo | Descrição |
|---------|-----------|
| `database/migrations/V12.10_groups_expanded.sql` | Script de migração SQL |

---

## 🗄️ Novas Tabelas do Banco

```sql
-- Treinos Funcionais
functional_trainings (id, groupId, creatorId, title, description, scheduledAt, 
  meetingPoint, maxParticipants, trainingType, intensity, estimatedDuration, 
  exercises, equipment, status, createdAt)

-- Caminhadas/Trilhas
hikes (id, groupId, creatorId, title, description, scheduledAt, meetingPoint,
  maxParticipants, trailName, distance, elevationGain, difficulty, terrain,
  estimatedDuration, status, createdAt)

-- Sessões de Yoga
yoga_sessions (id, groupId, creatorId, title, description, scheduledAt,
  meetingPoint, maxParticipants, yogaStyle, level, duration, focusAreas,
  bringMat, status, createdAt)

-- Treinos de Lutas
fight_trainings (id, groupId, creatorId, title, description, scheduledAt,
  meetingPoint, maxParticipants, martialArt, trainingType, level, duration,
  hasSparring, requiredEquipment, status, createdAt)

-- Mensagens do Grupo
group_messages (id, groupId, senderId, content, imageUrl, replyToId, 
  isDeleted, createdAt)

-- Ranking do Grupo
group_rankings (id, groupId, userId, modality, points, totalParticipations,
  totalDistance, totalTime, totalElevation, totalWins, totalLosses, 
  period, updatedAt)
```

---

## 🔌 Novos Endpoints da API

### Gestão de Membros
- `mobile.groups.getMembers` - Listar membros
- `mobile.groups.searchUsersToInvite` - Buscar usuários
- `mobile.groups.inviteUser` - Convidar usuário
- `mobile.groups.updateMember` - Atualizar cargo/permissões
- `mobile.groups.removeMember` - Remover membro

### Ranking
- `mobile.groups.getRanking` - Obter ranking por modalidade/período

### Chat
- `mobile.groups.getMessages` - Obter mensagens
- `mobile.groups.sendMessage` - Enviar mensagem

### Treinos por Modalidade
- `mobile.groups.createFunctionalTraining`
- `mobile.groups.createHike`
- `mobile.groups.createYogaSession`
- `mobile.groups.createFightTraining`
- `mobile.groups.getTrainings` - Listar todos os treinos
- `mobile.groups.joinTraining` - Confirmar presença

---

## ✅ Verificação de Qualidade

- **0 URLs hardcoded** (exceto verificação de warning em apiHealthCheck.ts)
- **BaseURL centralizada** via `EXPO_PUBLIC_API_URL`
- **Paleta de cores mantida** (#00C853 verde principal)
- **TypeScript tipado** corretamente
- **Navegação configurada** no App.tsx

---

## 📱 Fluxo de Navegação

```
GroupDetail (Hub)
├── ManageMembers → Gestão de membros
├── GroupRanking → Ranking interno
├── GroupChat → Chat em tempo real
└── Modal de Criar Treino
    ├── CreateFunctionalTraining
    ├── CreateHike
    ├── CreateYogaSession
    └── CreateFightTraining
```

---

## 🚀 Próximos Passos Sugeridos

1. Implementar WebSocket para chat em tempo real (substituir polling)
2. Adicionar notificações push para novos treinos
3. Implementar sistema de badges/conquistas
4. Adicionar galeria de fotos do grupo
5. Integrar com GPS para tracking de trilhas
