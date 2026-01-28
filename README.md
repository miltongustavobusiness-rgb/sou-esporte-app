# Sou Esporte App

Aplicativo mobile para atletas e organizadores de eventos esportivos.

## 🚀 Como Rodar Localmente (Mac + Expo Go)

### Pré-requisitos

- Node.js 18+
- npm ou pnpm
- Expo Go instalado no iPhone/Android
- Mac/PC e celular na mesma rede Wi-Fi

### 1. Descobrir seu IP local

```bash
# Mac
ipconfig getifaddr en0

# Windows
ipconfig | findstr IPv4

# Linux
hostname -I | awk '{print $1}'
```

Anote o IP (ex: `192.168.0.14`)

### 2. Configurar Backend

```bash
cd api

# Copiar arquivo de ambiente
cp .env.example .env

# Editar .env e substituir SEU_IP pelo seu IP real
# Exemplo: API_PUBLIC_URL=http://192.168.0.14:3000

# Instalar dependências
npm install

# Iniciar servidor
npm run dev
```

O backend estará rodando em `http://localhost:3000`

### 3. Configurar Mobile

```bash
cd mobile

# Copiar arquivo de ambiente
cp .env.example .env

# Editar .env e substituir SEU_IP pelo seu IP real
# Exemplo: EXPO_PUBLIC_API_URL=http://192.168.0.14:3000

# Instalar dependências
npm install

# Iniciar Expo
npx expo start -c
```

### 4. Abrir no Celular

1. Abra o app **Expo Go** no seu iPhone/Android
2. Escaneie o QR code que aparece no terminal
3. O app será carregado automaticamente

### 📱 Estrutura do App

| Tela | Descrição |
|------|-----------|
| Feed | Timeline social com posts, vídeos e grupos |
| Competições | Lista de eventos e inscrições |
| Ranking | Classificação de atletas |
| Perfil | Dados do usuário e configurações |
| Chat | Mensagens diretas e grupos |
| Grid | Perfil social estilo Instagram |

### 🔧 Solução de Problemas

**App não conecta na API?**
- Verifique se o IP está correto em ambos os `.env`
- Confirme que Mac e celular estão na mesma rede Wi-Fi
- Tente reiniciar o Expo: `npx expo start -c`

**Imagens/vídeos não carregam?**
- Verifique `API_PUBLIC_URL` no backend `.env`
- O IP deve ser o mesmo em `api/.env` e `mobile/.env`

**Email de verificação não chega?**
- Verifique as credenciais SMTP no `api/.env`
- Confira se `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` e `SMTP_PASS` estão configurados

### 📂 Estrutura de Pastas

```
sou-esporte-app/
├── api/                 # Backend Node.js + tRPC
│   ├── server/          # Rotas e lógica de negócio
│   ├── drizzle/         # Schema do banco de dados
│   └── uploads/         # Arquivos enviados
├── mobile/              # App React Native + Expo
│   ├── src/
│   │   ├── screens/     # Telas do app
│   │   ├── components/  # Componentes reutilizáveis
│   │   ├── contexts/    # Estado global (React Context)
│   │   ├── services/    # Conexão com API
│   │   └── utils/       # Funções auxiliares
│   └── assets/          # Imagens e fontes
└── database/            # Scripts SQL e migrações
```

### 👥 Usuários de Teste

| Email | Senha |
|-------|-------|
| miltongustavo@hotmail.com | 123456 |
| gladstonmuniz@gmail.com | 123456 |

---

Desenvolvido com ❤️ para a comunidade esportiva brasileira.
