import { connection } from "../server/db";

async function syncGroupsSchema() {
  try {
    console.log("🔧 Sincronizando schema da tabela groups...\n");
    
    // 1. Verificar se a tabela existe
    console.log("1. Verificando se tabela groups existe...");
    const [tables] = await connection.execute(`SHOW TABLES LIKE 'groups'`);
    if ((tables as any[]).length === 0) {
      console.log("   ❌ Tabela groups não existe! Criando...");
      await connection.execute(`
        CREATE TABLE groups (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          logoUrl TEXT,
          coverUrl TEXT,
          city VARCHAR(100),
          state VARCHAR(2),
          neighborhood VARCHAR(100),
          privacy ENUM('public', 'private') DEFAULT 'public' NOT NULL,
          groupType ENUM('running', 'cycling', 'triathlon', 'trail', 'swimming', 'fitness', 'funcional', 'caminhada_trail', 'yoga', 'lutas', 'other') DEFAULT 'running',
          sportTypes JSON,
          level ENUM('beginner', 'intermediate', 'advanced', 'all') DEFAULT 'all',
          meetingPoint TEXT,
          meetingLat DECIMAL(10, 7),
          meetingLng DECIMAL(10, 7),
          allowJoinRequests BOOLEAN DEFAULT TRUE,
          requiresApproval BOOLEAN DEFAULT FALSE,
          memberCount INT DEFAULT 0,
          postCount INT DEFAULT 0,
          ownerId INT NOT NULL,
          status ENUM('active', 'inactive', 'banned') DEFAULT 'active' NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
        )
      `);
      console.log("   ✅ Tabela groups criada!\n");
    } else {
      console.log("   ✅ Tabela groups existe!\n");
    }
    
    // 2. Lista de colunas que precisam existir
    const columnsToAdd = [
      { name: 'description', sql: 'ADD COLUMN description TEXT' },
      { name: 'logoUrl', sql: 'ADD COLUMN logoUrl TEXT' },
      { name: 'coverUrl', sql: 'ADD COLUMN coverUrl TEXT' },
      { name: 'city', sql: 'ADD COLUMN city VARCHAR(100)' },
      { name: 'state', sql: 'ADD COLUMN state VARCHAR(2)' },
      { name: 'neighborhood', sql: 'ADD COLUMN neighborhood VARCHAR(100)' },
      { name: 'privacy', sql: "ADD COLUMN privacy ENUM('public', 'private') DEFAULT 'public' NOT NULL" },
      { name: 'groupType', sql: "ADD COLUMN groupType ENUM('running', 'cycling', 'triathlon', 'trail', 'swimming', 'fitness', 'funcional', 'caminhada_trail', 'yoga', 'lutas', 'other') DEFAULT 'running'" },
      { name: 'sportTypes', sql: 'ADD COLUMN sportTypes JSON' },
      { name: 'level', sql: "ADD COLUMN level ENUM('beginner', 'intermediate', 'advanced', 'all') DEFAULT 'all'" },
      { name: 'meetingPoint', sql: 'ADD COLUMN meetingPoint TEXT' },
      { name: 'meetingLat', sql: 'ADD COLUMN meetingLat DECIMAL(10, 7)' },
      { name: 'meetingLng', sql: 'ADD COLUMN meetingLng DECIMAL(10, 7)' },
      { name: 'allowJoinRequests', sql: 'ADD COLUMN allowJoinRequests BOOLEAN DEFAULT TRUE' },
      { name: 'requiresApproval', sql: 'ADD COLUMN requiresApproval BOOLEAN DEFAULT FALSE' },
      { name: 'memberCount', sql: 'ADD COLUMN memberCount INT DEFAULT 0' },
      { name: 'postCount', sql: 'ADD COLUMN postCount INT DEFAULT 0' },
      { name: 'ownerId', sql: 'ADD COLUMN ownerId INT NOT NULL DEFAULT 1' },
      { name: 'status', sql: "ADD COLUMN status ENUM('active', 'inactive', 'banned') DEFAULT 'active' NOT NULL" },
      { name: 'createdAt', sql: 'ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL' },
      { name: 'updatedAt', sql: 'ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL' },
    ];
    
    // 3. Verificar colunas existentes
    console.log("2. Verificando colunas existentes...");
    const [columns] = await connection.execute(`SHOW COLUMNS FROM groups`);
    const existingColumns = (columns as any[]).map(c => c.Field);
    console.log("   Colunas existentes:", existingColumns.join(', '), "\n");
    
    // 4. Adicionar colunas faltantes
    console.log("3. Adicionando colunas faltantes...");
    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        try {
          await connection.execute(`ALTER TABLE groups ${col.sql}`);
          console.log(`   ✅ Coluna '${col.name}' adicionada!`);
        } catch (e: any) {
          if (e.message.includes("Duplicate column")) {
            console.log(`   ⚠️ Coluna '${col.name}' já existe`);
          } else {
            console.log(`   ❌ Erro ao adicionar '${col.name}':`, e.message);
          }
        }
      } else {
        console.log(`   ✓ Coluna '${col.name}' já existe`);
      }
    }
    
    // 5. Atualizar enum groupType para incluir todos os valores
    console.log("\n4. Atualizando enum groupType...");
    try {
      await connection.execute(`
        ALTER TABLE groups 
        MODIFY COLUMN groupType ENUM('running', 'cycling', 'triathlon', 'trail', 'swimming', 'fitness', 'funcional', 'caminhada_trail', 'yoga', 'lutas', 'other') 
        DEFAULT 'running'
      `);
      console.log("   ✅ Enum groupType atualizado!");
    } catch (e: any) {
      console.log("   ⚠️ Erro ao atualizar enum:", e.message);
    }
    
    // 6. Verificar tabela group_members
    console.log("\n5. Verificando tabela group_members...");
    const [memberTables] = await connection.execute(`SHOW TABLES LIKE 'group_members'`);
    if ((memberTables as any[]).length === 0) {
      console.log("   ❌ Tabela group_members não existe! Criando...");
      await connection.execute(`
        CREATE TABLE group_members (
          id INT AUTO_INCREMENT PRIMARY KEY,
          groupId INT NOT NULL,
          userId INT NOT NULL,
          role ENUM('owner', 'admin', 'moderator', 'member') DEFAULT 'member' NOT NULL,
          status ENUM('pending', 'active', 'inactive', 'banned') DEFAULT 'active' NOT NULL,
          canCreateTraining BOOLEAN DEFAULT FALSE,
          joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          UNIQUE KEY unique_group_user (groupId, userId)
        )
      `);
      console.log("   ✅ Tabela group_members criada!");
    } else {
      console.log("   ✅ Tabela group_members existe!");
    }
    
    console.log("\n🎉 Schema sincronizado com sucesso!");
    console.log("\n📋 Resumo da tabela groups:");
    const [finalColumns] = await connection.execute(`SHOW COLUMNS FROM groups`);
    console.log("   Total de colunas:", (finalColumns as any[]).length);
    
  } catch (error: any) {
    console.error("❌ Erro:", error.message);
    console.error(error);
  }
  
  process.exit(0);
}

syncGroupsSchema();
