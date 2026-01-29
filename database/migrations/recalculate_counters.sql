-- Migration: Recalculate followers/following counters
-- Run this script to fix counters that may have become out of sync
-- Usage: mysql -u souesporte -p souesporte < recalculate_counters.sql

-- =====================================================
-- 1. RECALCULATE FOLLOWERS COUNT
-- =====================================================
-- Update followersCount for each user based on actual follows in userFollows table

UPDATE users u
SET followersCount = (
    SELECT COUNT(*) 
    FROM userFollows uf 
    WHERE uf.followingId = u.id
);

-- =====================================================
-- 2. RECALCULATE FOLLOWING COUNT
-- =====================================================
-- Update followingCount for each user based on actual follows in userFollows table

UPDATE users u
SET followingCount = (
    SELECT COUNT(*) 
    FROM userFollows uf 
    WHERE uf.followerId = u.id
);

-- =====================================================
-- 3. RECALCULATE POSTS COUNT (optional)
-- =====================================================
-- If you have a postsCount column in users table

-- UPDATE users u
-- SET postsCount = (
--     SELECT COUNT(*) 
--     FROM posts p 
--     WHERE p.authorId = u.id AND p.status = 'active'
-- );

-- =====================================================
-- 4. RECALCULATE LIKES COUNT ON POSTS
-- =====================================================
-- Update likesCount for each post based on actual reactions

UPDATE posts p
SET likesCount = (
    SELECT COUNT(*) 
    FROM postReactions pr 
    WHERE pr.postId = p.id
);

-- =====================================================
-- 5. VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the counters are correct

-- Check users with followers
SELECT id, name, followersCount, followingCount 
FROM users 
WHERE followersCount > 0 OR followingCount > 0
ORDER BY followersCount DESC
LIMIT 20;

-- Check mutual follows (users who can chat)
SELECT 
    u1.id as user1_id, 
    u1.name as user1_name,
    u2.id as user2_id,
    u2.name as user2_name
FROM userFollows f1
JOIN userFollows f2 ON f1.followerId = f2.followingId AND f1.followingId = f2.followerId
JOIN users u1 ON f1.followerId = u1.id
JOIN users u2 ON f1.followingId = u2.id
WHERE f1.followerId < f1.followingId
LIMIT 20;

-- Check posts with likes
SELECT id, content, likesCount 
FROM posts 
WHERE likesCount > 0
ORDER BY likesCount DESC
LIMIT 10;
