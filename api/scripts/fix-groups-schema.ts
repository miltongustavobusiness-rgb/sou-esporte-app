import { connection } from "../server/db";

async function fixGroupsSchema() {
  try {
    console.log("🔧 Corrigindo schema da tabela groups...\n");
    
    // 1. Alterar o enum groupType para incluir todos os valores
    console.log("1. Alterando enum groupType...");
    await connection.execute(`
      ALTER TABLE groups 
      MODIFY COLUMN groupType ENUM('running', 'cycling', 'triathlon', 'trail', 'swimming', 'fitness', 'funcional', 'caminhada_trail', 'yoga', 'lutas', 'other', 'gratuito', 'pago') 
      DEFAULT 'running'
    `);
    console.log("   ✅ Enum groupType alterado!\n");
    
    // 2. Verificar se coluna neighborhood existe
    console.log("2. Verificando coluna neighborhood...");
    try {
      await connection.execute(`
        ALTER TABLE groups ADD COLUMN neighborhood VARCHAR(100)
      `);
      console.log("   ✅ Coluna neighborhood adicionada!\n");
    } catch (e: any) {
      if (e.message.includes("Duplicate column")) {
        console.log("   ✅ Coluna neighborhood já existe!\n");
      } else {
        console.log("   ⚠️ Erro:", e.message, "\n");
      }
    }
    
    console.log("🎉 Schema corrigido com sucesso!");
    
  } catch (error: any) {
    console.error("❌ Erro:", error.message);
  }
  
  process.exit(0);
}

fixGroupsSchema();
