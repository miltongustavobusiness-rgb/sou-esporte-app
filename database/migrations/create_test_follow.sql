-- Script para criar relacionamento de follow de teste
-- Execute este script para criar um follow mútuo entre dois usuários para testar o chat
-- Usage: mysql -u souesporte -p souesporte < create_test_follow.sql

-- IMPORTANTE: Substitua USER_ID_1 e USER_ID_2 pelos IDs reais dos usuários que deseja conectar
-- Você pode encontrar os IDs executando: SELECT id, name, email FROM users LIMIT 20;

-- Variáveis (substitua pelos IDs reais)
SET @USER_ID_1 = 1; -- Primeiro usuário
SET @USER_ID_2 = 2; -- Segundo usuário

-- =====================================================
-- 1. VERIFICAR SE USUÁRIOS EXISTEM
-- =====================================================
SELECT 'Verificando usuários...' as step;

SELECT id, name, email, followersCount, followingCount 
FROM users 
WHERE id IN (@USER_ID_1, @USER_ID_2);

-- =====================================================
-- 2. CRIAR FOLLOW MÚTUO (se não existir)
-- =====================================================
SELECT 'Criando follows...' as step;

-- User 1 segue User 2
INSERT IGNORE INTO user_follows (followerId, followingId, createdAt)
VALUES (@USER_ID_1, @USER_ID_2, NOW());

-- User 2 segue User 1
INSERT IGNORE INTO user_follows (followerId, followingId, createdAt)
VALUES (@USER_ID_2, @USER_ID_1, NOW());

-- =====================================================
-- 3. ATUALIZAR CONTADORES
-- =====================================================
SELECT 'Atualizando contadores...' as step;

-- Atualizar contador de followingCount para User 1
UPDATE users 
SET followingCount = (
    SELECT COUNT(*) FROM user_follows WHERE followerId = @USER_ID_1
)
WHERE id = @USER_ID_1;

-- Atualizar contador de followersCount para User 1
UPDATE users 
SET followersCount = (
    SELECT COUNT(*) FROM user_follows WHERE followingId = @USER_ID_1
)
WHERE id = @USER_ID_1;

-- Atualizar contador de followingCount para User 2
UPDATE users 
SET followingCount = (
    SELECT COUNT(*) FROM user_follows WHERE followerId = @USER_ID_2
)
WHERE id = @USER_ID_2;

-- Atualizar contador de followersCount para User 2
UPDATE users 
SET followersCount = (
    SELECT COUNT(*) FROM user_follows WHERE followingId = @USER_ID_2
)
WHERE id = @USER_ID_2;

-- =====================================================
-- 4. VERIFICAR RESULTADO
-- =====================================================
SELECT 'Verificando resultado...' as step;

-- Verificar follows criados
SELECT 
    uf.id,
    u1.name as follower_name,
    u2.name as following_name,
    uf.createdAt
FROM user_follows uf
JOIN users u1 ON uf.followerId = u1.id
JOIN users u2 ON uf.followingId = u2.id
WHERE uf.followerId IN (@USER_ID_1, @USER_ID_2)
   OR uf.followingId IN (@USER_ID_1, @USER_ID_2);

-- Verificar contadores atualizados
SELECT id, name, followersCount, followingCount 
FROM users 
WHERE id IN (@USER_ID_1, @USER_ID_2);

-- Verificar se é mutual follow (ambos se seguem)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM user_follows 
            WHERE followerId = @USER_ID_1 AND followingId = @USER_ID_2
        ) AND EXISTS (
            SELECT 1 FROM user_follows 
            WHERE followerId = @USER_ID_2 AND followingId = @USER_ID_1
        )
        THEN 'SIM - Chat disponível entre estes usuários!'
        ELSE 'NÃO - Follow não é mútuo, chat não disponível'
    END as mutual_follow_status;

SELECT 'Script concluído!' as step;
