-- Migration: Fix duplicate follows and add UNIQUE constraint
-- Run this script to remove duplicate follow entries and prevent future duplicates
-- Usage: mysql -u souesporte -p souesporte < fix_duplicate_follows.sql

-- =====================================================
-- 1. IDENTIFY DUPLICATES
-- =====================================================
SELECT 'Identificando duplicatas...' as step;

-- Show duplicate follows
SELECT 
    followerId, 
    followingId, 
    COUNT(*) as count
FROM user_follows
GROUP BY followerId, followingId
HAVING COUNT(*) > 1;

-- =====================================================
-- 2. REMOVE DUPLICATES (keep only the oldest entry)
-- =====================================================
SELECT 'Removendo duplicatas...' as step;

-- Create temporary table with IDs to keep (oldest entry for each pair)
CREATE TEMPORARY TABLE IF NOT EXISTS follows_to_keep AS
SELECT MIN(id) as id
FROM user_follows
GROUP BY followerId, followingId;

-- Delete all entries except the ones to keep
DELETE FROM user_follows
WHERE id NOT IN (SELECT id FROM follows_to_keep);

-- Drop temporary table
DROP TEMPORARY TABLE IF EXISTS follows_to_keep;

-- =====================================================
-- 3. ADD UNIQUE CONSTRAINT (if not exists)
-- =====================================================
SELECT 'Adicionando constraint UNIQUE...' as step;

-- Check if constraint already exists
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'user_follows' 
    AND CONSTRAINT_NAME = 'unique_follow_pair'
);

-- Add unique constraint if it doesn't exist
-- This prevents duplicate follows in the future
SET @sql = IF(@constraint_exists = 0,
    'ALTER TABLE user_follows ADD CONSTRAINT unique_follow_pair UNIQUE (followerId, followingId)',
    'SELECT "Constraint already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 4. RECALCULATE COUNTERS
-- =====================================================
SELECT 'Recalculando contadores...' as step;

-- Update followersCount for all users
UPDATE users u
SET followersCount = (
    SELECT COUNT(*) 
    FROM user_follows uf 
    WHERE uf.followingId = u.id
);

-- Update followingCount for all users
UPDATE users u
SET followingCount = (
    SELECT COUNT(*) 
    FROM user_follows uf 
    WHERE uf.followerId = u.id
);

-- =====================================================
-- 5. VERIFICATION
-- =====================================================
SELECT 'Verificando resultado...' as step;

-- Show users with follows
SELECT id, name, followersCount, followingCount 
FROM users 
WHERE followersCount > 0 OR followingCount > 0
ORDER BY followersCount DESC
LIMIT 20;

-- Verify no more duplicates
SELECT 
    followerId, 
    followingId, 
    COUNT(*) as count
FROM user_follows
GROUP BY followerId, followingId
HAVING COUNT(*) > 1;

-- Show total follows
SELECT COUNT(*) as total_follows FROM user_follows;

SELECT 'Script concluído!' as step;
