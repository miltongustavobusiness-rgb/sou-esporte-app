# Sou Esporte - Troubleshooting Guide

Este documento descreve os problemas comuns do app e suas soluções.

## Problemas Identificados e Soluções

### 1. Contadores Zerados (Seguidores, Seguindo, Posts)

**Sintoma:** Os contadores de seguidores, seguindo e posts mostram 0 mesmo quando há dados no banco.

**Causa:** Os contadores são cacheados na tabela `users` e podem ficar dessincronizados com os dados reais nas tabelas `user_follows` e `posts`.

**Solução:**
Execute o script de migração para recalcular os contadores:

```bash
cd database/migrations
mysql -u [usuario] -p [database] < recalculate_counters.sql
```

Este script irá:
- Recalcular `followersCount` baseado na tabela `user_follows`
- Recalcular `followingCount` baseado na tabela `user_follows`
- Recalcular `likesCount` nos posts baseado na tabela `post_likes`
- Recalcular `commentsCount` nos posts baseado na tabela `comments`

### 2. Chat Indisponível ("Chat não disponível")

**Sintoma:** Ao tentar abrir o chat com outro usuário, aparece a mensagem "Chat não disponível" com ícone de cadeado.

**Causa:** O sistema de chat requer **mutual follow** - ambos os usuários precisam se seguir mutuamente para poder conversar.

**Verificação:**
Execute o script de diagnóstico para verificar se há follows mútuos:

```bash
mysql -u [usuario] -p [database] < diagnose_database.sql
```

Procure pela seção "Check mutual follows" para ver quais usuários podem conversar.

**Solução:**
1. Se os dados de follow foram perdidos, use o script `create_test_follow.sql` para criar relacionamentos de follow:

```bash
# Edite o script para definir os IDs dos usuários
mysql -u [usuario] -p [database] < create_test_follow.sql
```

2. Ou, no app, ambos os usuários precisam:
   - Ir ao perfil do outro usuário
   - Clicar em "Seguir"
   - Aguardar o outro usuário fazer o mesmo

### 3. Vídeos com Tela Preta

**Sintoma:** Os vídeos no feed aparecem como tela preta, com o ícone de play cortado ou não funcionando.

**Possíveis Causas:**

1. **URL do vídeo inválida ou inacessível**
   - Verifique se a URL do vídeo está correta no banco de dados
   - Teste a URL diretamente no navegador

2. **Formato de vídeo incompatível**
   - iOS suporta: MP4 (H.264), MOV, M4V
   - Formatos problemáticos: WebM, AVI, MKV

3. **Problemas de CORS no servidor**
   - O servidor de mídia precisa permitir requisições cross-origin
   - Verifique os headers CORS no servidor de storage

4. **Conexão de rede lenta**
   - Vídeos grandes podem demorar para carregar
   - Verifique a conexão de internet

**Diagnóstico:**
O player de vídeo registra erros no console. Conecte o dispositivo e verifique os logs:

```bash
# No terminal do Mac com Expo
npx expo start --dev-client
# Ou verifique os logs no Expo Go
```

Procure por mensagens como:
- `[InlineVideoPlayer] ❌ VIDEO ERROR`
- `403 Forbidden` - Problema de autenticação/CORS
- `404 Not Found` - URL inválida
- `Decode Error` - Formato incompatível

**Solução:**
1. Verifique se as URLs de vídeo no banco são válidas
2. Certifique-se que o servidor de mídia está acessível
3. Converta vídeos para MP4 H.264 antes de fazer upload

### 4. Likes Não Contando

**Sintoma:** Ao curtir um post, o contador não atualiza.

**Causa:** O contador `likesCount` na tabela `posts` pode estar dessincronizado.

**Solução:**
Execute o script de recálculo de contadores:

```bash
mysql -u [usuario] -p [database] < recalculate_counters.sql
```

### 5. Swipe Vertical Não Funciona no Feed

**Sintoma:** Não é possível deslizar para cima/baixo para navegar entre vídeos no feed.

**Causa:** O feed principal usa ScrollView, não FlatList com paginação.

**Nota:** O swipe vertical funciona no modo fullscreen (VideoFullscreenModal). No feed inline, a navegação é por scroll normal.

## Scripts de Manutenção

### Localização dos Scripts

```
database/migrations/
├── diagnose_database.sql      # Diagnóstico geral do banco
├── recalculate_counters.sql   # Recalcular contadores
└── create_test_follow.sql     # Criar follows de teste
```

### Como Executar

1. Conecte ao servidor MySQL
2. Execute o script desejado:

```bash
mysql -u [usuario] -p [database] < [script].sql
```

## Logs e Debug

### Habilitar Logs Detalhados

O app já possui logs detalhados. Para visualizar:

1. **Expo Go:** Os logs aparecem no terminal onde `npx expo start` está rodando
2. **React Native Debugger:** Conecte para ver logs no console

### Logs Importantes

- `[API]` - Chamadas de API e erros
- `[InlineVideoPlayer]` - Status do player de vídeo
- `[ChatScreen]` - Operações de chat
- `[useFeed]` - Carregamento do feed

## Contato

Para problemas não resolvidos por este guia, entre em contato com a equipe de desenvolvimento.
