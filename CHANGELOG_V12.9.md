# Changelog V12.9 - Auth Flow Ampliado

## Data: 27 de Janeiro de 2026

## Resumo
Implementação dos fluxos ampliados de autenticação conforme especificado no `auth_flow_prompt.pdf`:
1. **Login Social** (Google/Apple/Facebook)
2. **Recuperação de Conta Bloqueada** (AccountRecovery)
3. **Verificação de E-mail Pós-Cadastro** (EmailVerification)

---

## Novos Recursos

### 1. Login Social (Google/Apple/Facebook)
- Botões de login social adicionados na tela de Login
- Suporte visual para Google, Apple e Facebook
- Endpoint `mobile.socialLogin` no backend
- **Nota**: Integração OAuth completa requer configuração de credenciais dos provedores

### 2. Recuperação de Conta Bloqueada
- Nova tela `AccountRecoveryScreen`
- Fluxo para desbloquear contas após múltiplas tentativas de login falhas
- Endpoints:
  - `mobile.requestAccountRecovery` - Solicita código de recuperação
  - `mobile.unlockAccount` - Desbloqueia conta com código
- E-mail de recuperação estilizado com instruções de segurança

### 3. Verificação de E-mail Pós-Cadastro
- Nova tela `EmailVerificationScreen`
- Fluxo para verificar e-mail após cadastro
- Endpoints:
  - `mobile.sendVerificationEmail` - Envia código de verificação
  - `mobile.verifyEmail` - Verifica e-mail com código
- Opção para alterar e-mail se digitado incorretamente
- Após verificação, redireciona para ModeSelection

---

## Arquivos Modificados

### Backend (api/)
| Arquivo | Alteração |
|---------|-----------|
| `drizzle/schema.ts` | Novos campos: emailVerified, emailVerifiedAt, loginProvider, accountStatus, failedLoginAttempts, blockedAt, blockedReason |
| `server/routers.ts` | Novos endpoints: socialLogin, sendVerificationEmail, verifyEmail, requestAccountRecovery, unlockAccount, checkAccountStatus |
| `server/_core/email.ts` | Novas funções: sendVerificationEmail(), sendAccountRecoveryEmail() |

### Mobile (mobile/)
| Arquivo | Alteração |
|---------|-----------|
| `src/screens/AccountRecoveryScreen.tsx` | **NOVA TELA** - Recuperação de conta bloqueada |
| `src/screens/EmailVerificationScreen.tsx` | **NOVA TELA** - Verificação de e-mail |
| `src/screens/LoginScreen.tsx` | Botões de login social (Google/Apple/Facebook) |
| `src/config/api.ts` | Novas funções de API para os endpoints |
| `src/types/index.ts` | Novas rotas: AccountRecovery, EmailVerification |
| `App.tsx` | Imports e rotas para novas telas |

### Database
| Arquivo | Descrição |
|---------|-----------|
| `database/migrations/V12.9_auth_flow_fields.sql` | Script de migração para novos campos |

---

## Migração de Banco de Dados

Execute o script de migração para adicionar os novos campos:

```bash
mysql -u souesporte -p souesporte < database/migrations/V12.9_auth_flow_fields.sql
```

Ou execute manualmente:

```sql
ALTER TABLE users ADD COLUMN emailVerified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN emailVerifiedAt TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN loginProvider ENUM('email', 'phone', 'google', 'apple', 'facebook') DEFAULT 'email';
ALTER TABLE users ADD COLUMN accountStatus ENUM('active', 'blocked', 'pending_verification') DEFAULT 'active';
ALTER TABLE users ADD COLUMN failedLoginAttempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN blockedAt TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN blockedReason TEXT NULL;
```

---

## Configuração de Login Social (Futuro)

Para habilitar login social completo, será necessário:

### Google
1. Criar projeto no Google Cloud Console
2. Configurar OAuth 2.0 credentials
3. Adicionar `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no .env

### Apple
1. Criar App ID no Apple Developer Portal
2. Configurar Sign in with Apple
3. Adicionar `APPLE_CLIENT_ID` e `APPLE_TEAM_ID` no .env

### Facebook
1. Criar app no Facebook Developers
2. Configurar Facebook Login
3. Adicionar `FACEBOOK_APP_ID` e `FACEBOOK_APP_SECRET` no .env

---

## Regras Fixas Mantidas

✅ **0 ocorrências** de URLs hardcoded (manus.computer, localhost, 127.0.0.1)
✅ BaseURL centralizada via `EXPO_PUBLIC_API_URL`
✅ tRPC endpoint: `${EXPO_PUBLIC_API_URL}/api/trpc`
✅ Funciona em ambiente local sem dependências Manus

---

## Próximos Passos (Roadmap)

1. **Fase 1**: Consolidar login via telefone/SMS (Twilio/AWS SNS)
2. **Fase 2**: Integrar expo-auth-session com provedores OAuth
3. **Fase 3**: Implementar lógica de bloqueio automático após N tentativas falhas
