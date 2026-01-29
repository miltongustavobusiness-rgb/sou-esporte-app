-- Diagnostic Script: Check database integrity
-- Run this to diagnose issues with the database
-- Usage: mysql -u souesporte -p souesporte < diagnose_database.sql

-- =====================================================
-- 1. CHECK USERS TABLE
-- =====================================================
SELECT '=== USERS TABLE ===' as section;

SELECT COUNT(*) as total_users FROM users;

SELECT 
    COUNT(*) as users_with_photos,
    COUNT(CASE WHEN photoUrl IS NOT NULL THEN 1 END) as with_photo,
    COUNT(CASE WHEN photoUrl IS NULL THEN 1 END) as without_photo
FROM users;

-- =====================================================
-- 2. CHECK FOLLOWS TABLE
-- =====================================================
SELECT '=== USER FOLLOWS TABLE ===' as section;

SELECT COUNT(*) as total_follows FROM userFollows;

-- Users with most followers
SELECT u.id, u.name, COUNT(uf.followerId) as actual_followers, u.followersCount as stored_count
FROM users u
LEFT JOIN userFollows uf ON uf.followingId = u.id
GROUP BY u.id
HAVING actual_followers > 0 OR stored_count > 0
ORDER BY actual_followers DESC
LIMIT 10;

-- =====================================================
-- 3. CHECK POSTS TABLE
-- =====================================================
SELECT '=== POSTS TABLE ===' as section;

SELECT COUNT(*) as total_posts FROM posts;

SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN imageUrl IS NOT NULL THEN 1 END) as with_image,
    COUNT(CASE WHEN videoUrl IS NOT NULL THEN 1 END) as with_video,
    COUNT(CASE WHEN imageUrl IS NULL AND videoUrl IS NULL THEN 1 END) as text_only
FROM posts
WHERE status = 'active';

-- =====================================================
-- 4. CHECK REACTIONS TABLE
-- =====================================================
SELECT '=== POST REACTIONS TABLE ===' as section;

SELECT COUNT(*) as total_reactions FROM postReactions;

-- Posts with most likes
SELECT p.id, SUBSTRING(p.content, 1, 50) as content_preview, 
       COUNT(pr.id) as actual_likes, p.likesCount as stored_count
FROM posts p
LEFT JOIN postReactions pr ON pr.postId = p.id
GROUP BY p.id
HAVING actual_likes > 0 OR stored_count > 0
ORDER BY actual_likes DESC
LIMIT 10;

-- =====================================================
-- 5. CHECK CHAT THREADS
-- =====================================================
SELECT '=== CHAT THREADS TABLE ===' as section;

SELECT COUNT(*) as total_threads FROM chatThreads;

-- Active chat threads
SELECT ct.id, u1.name as user1, u2.name as user2, ct.lastMessageAt
FROM chatThreads ct
JOIN users u1 ON ct.user1Id = u1.id
JOIN users u2 ON ct.user2Id = u2.id
ORDER BY ct.lastMessageAt DESC
LIMIT 10;

-- =====================================================
-- 6. CHECK CHAT MESSAGES
-- =====================================================
SELECT '=== CHAT MESSAGES TABLE ===' as section;

SELECT COUNT(*) as total_messages FROM chatMessages;

-- =====================================================
-- 7. INTEGRITY CHECKS
-- =====================================================
SELECT '=== INTEGRITY CHECKS ===' as section;

-- Orphaned follows (followerId doesn't exist)
SELECT COUNT(*) as orphaned_follower_ids
FROM userFollows uf
LEFT JOIN users u ON uf.followerId = u.id
WHERE u.id IS NULL;

-- Orphaned follows (followingId doesn't exist)
SELECT COUNT(*) as orphaned_following_ids
FROM userFollows uf
LEFT JOIN users u ON uf.followingId = u.id
WHERE u.id IS NULL;

-- Orphaned posts (authorId doesn't exist)
SELECT COUNT(*) as orphaned_posts
FROM posts p
LEFT JOIN users u ON p.authorId = u.id
WHERE u.id IS NULL;

-- Orphaned reactions (postId doesn't exist)
SELECT COUNT(*) as orphaned_reactions
FROM postReactions pr
LEFT JOIN posts p ON pr.postId = p.id
WHERE p.id IS NULL;
