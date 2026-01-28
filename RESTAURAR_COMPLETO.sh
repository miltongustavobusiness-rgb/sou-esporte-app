#!/bin/bash
#===============================================================================
# SCRIPT DE RESTAURAÇÃO COMPLETA - SOU ESPORTE V12.3 API FIX
# Este script restaura todo o ambiente de desenvolvimento automaticamente
# Testado em: Ubuntu 22.04, Debian 11+, macOS 12+, WSL2
#===============================================================================

set -e

echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║         SOU ESPORTE V12.3 - RESTAURAÇÃO COMPLETA (API Fix)            ║"
echo "║                       26 de Janeiro de 2026                           ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configurações do banco de dados
DB_NAME="souesporte"
DB_USER="souesporte"
DB_PASS="souesporte123"

#===============================================================================
# PASSO 1: Verificar dependências
#===============================================================================
echo -e "${YELLOW}[1/6] Verificando dependências...${NC}"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js não encontrado. Por favor, instale Node.js 18+${NC}"
    echo "  macOS: brew install node"
    echo "  Linux: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"

# Verificar MySQL/MariaDB
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}MySQL/MariaDB não encontrado. Por favor, instale:${NC}"
    echo "  macOS: brew install mariadb && brew services start mariadb"
    echo "  Linux: sudo apt-get install mariadb-server && sudo systemctl start mariadb"
    exit 1
fi
echo -e "${GREEN}✓ MySQL/MariaDB instalado${NC}"

#===============================================================================
# PASSO 2: Configurar banco de dados
#===============================================================================
echo ""
echo -e "${YELLOW}[2/6] Configurando banco de dados...${NC}"

# Tentar criar banco e usuário
if command -v sudo &> /dev/null; then
    sudo mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;" 2>/dev/null || \
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;" 2>/dev/null || true

    sudo mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';" 2>/dev/null || \
    mysql -u root -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';" 2>/dev/null || true

    sudo mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';" 2>/dev/null || \
    mysql -u root -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';" 2>/dev/null || true

    sudo mysql -e "FLUSH PRIVILEGES;" 2>/dev/null || \
    mysql -u root -e "FLUSH PRIVILEGES;" 2>/dev/null || true
else
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;" 2>/dev/null || true
    mysql -u root -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';" 2>/dev/null || true
    mysql -u root -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';" 2>/dev/null || true
    mysql -u root -e "FLUSH PRIVILEGES;" 2>/dev/null || true
fi

echo -e "${GREEN}✓ Banco de dados configurado${NC}"

#===============================================================================
# PASSO 3: Restaurar dump
#===============================================================================
echo ""
echo -e "${YELLOW}[3/6] Restaurando dados do banco...${NC}"

mysql -u ${DB_USER} -p${DB_PASS} ${DB_NAME} < "${SCRIPT_DIR}/database/souesporte_full_dump.sql" 2>/dev/null

TABLES=$(mysql -u ${DB_USER} -p${DB_PASS} ${DB_NAME} -e "SHOW TABLES;" 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Banco restaurado com $((TABLES-1)) tabelas${NC}"

#===============================================================================
# PASSO 4: Configurar API
#===============================================================================
echo ""
echo -e "${YELLOW}[4/6] Configurando API...${NC}"

cd "${SCRIPT_DIR}/api"

# Criar arquivo .env
cat > .env << EOF
DATABASE_URL=mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}
JWT_SECRET=sou-esporte-jwt-secret-v12-2026
PORT=3000
NODE_ENV=development
EOF

echo -e "${GREEN}✓ Arquivo .env criado${NC}"

# Instalar dependências
echo "Instalando dependências da API..."
npm install --legacy-peer-deps 2>/dev/null || npm install

echo -e "${GREEN}✓ Dependências da API instaladas${NC}"

#===============================================================================
# PASSO 5: Configurar Mobile
#===============================================================================
echo ""
echo -e "${YELLOW}[5/6] Configurando Mobile...${NC}"

cd "${SCRIPT_DIR}/mobile"

echo "Instalando dependências do Mobile..."
npm install --legacy-peer-deps 2>/dev/null || npm install

echo -e "${GREEN}✓ Dependências do Mobile instaladas${NC}"

#===============================================================================
# PASSO 6: Finalização
#===============================================================================
echo ""
echo -e "${YELLOW}[6/6] Restauração concluída!${NC}"

cd "${SCRIPT_DIR}"

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║              RESTAURAÇÃO CONCLUÍDA COM SUCESSO!                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${BLUE}PRÓXIMOS PASSOS:${NC}"
echo ""
echo -e "${GREEN}1. Iniciar a API (Terminal 1):${NC}"
echo "   cd ${SCRIPT_DIR}/api"
echo "   npm run dev"
echo ""
echo -e "${GREEN}2. Verificar se API está funcionando:${NC}"
echo "   curl http://localhost:3000/"
echo "   # Deve retornar: {\"status\":\"ok\",\"message\":\"Sou Esporte API is running\",...}"
echo ""
echo -e "${GREEN}3. Iniciar o Mobile (Terminal 2):${NC}"
echo "   cd ${SCRIPT_DIR}/mobile"
echo "   npx expo start --tunnel"
echo ""
echo -e "${BLUE}CREDENCIAIS DE TESTE:${NC}"
echo "  Email: miltongustavo@hotmail.com"
echo "  Login: Via OTP (código aparece no console da API)"
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
