-- Migration: Diagnose and fix video URLs
-- Run this script to identify posts with invalid video URLs
-- Usage: mysql -u souesporte -p souesporte < fix_video_urls.sql

-- =====================================================
-- 1. DIAGNOSE VIDEO URL ISSUES
-- =====================================================
SELECT 'Verificando URLs de vídeo...' as step;

-- Show posts with video URLs that start with 'file:/'
SELECT 
    id,
    authorId,
    SUBSTRING(videoUrl, 1, 100) as videoUrl_preview,
    SUBSTRING(videoThumbnailUrl, 1, 100) as thumbnail_preview,
    createdAt
FROM posts
WHERE videoUrl IS NOT NULL 
  AND (videoUrl LIKE 'file:%' OR videoUrl NOT LIKE 'http%')
ORDER BY createdAt DESC
LIMIT 50;

-- Count of problematic videos
SELECT 
    COUNT(*) as total_invalid_video_urls
FROM posts
WHERE videoUrl IS NOT NULL 
  AND (videoUrl LIKE 'file:%' OR videoUrl NOT LIKE 'http%');

-- =====================================================
-- 2. SHOW ALL VIDEO POSTS FOR REVIEW
-- =====================================================
SELECT 'Listando todos os posts com vídeo...' as step;

SELECT 
    id,
    authorId,
    type,
    SUBSTRING(videoUrl, 1, 150) as videoUrl,
    SUBSTRING(videoThumbnailUrl, 1, 150) as videoThumbnailUrl,
    status,
    createdAt
FROM posts
WHERE videoUrl IS NOT NULL
ORDER BY createdAt DESC
LIMIT 100;

-- =====================================================
-- 3. STATISTICS
-- =====================================================
SELECT 'Estatísticas de mídia...' as step;

SELECT 
    type,
    COUNT(*) as count,
    SUM(CASE WHEN videoUrl IS NOT NULL THEN 1 ELSE 0 END) as with_video,
    SUM(CASE WHEN imageUrl IS NOT NULL THEN 1 ELSE 0 END) as with_image,
    SUM(CASE WHEN videoThumbnailUrl IS NOT NULL THEN 1 ELSE 0 END) as with_thumbnail
FROM posts
WHERE status = 'active'
GROUP BY type;

-- =====================================================
-- 4. SAMPLE OF VALID VIDEO URLS (for reference)
-- =====================================================
SELECT 'Exemplos de URLs válidas...' as step;

SELECT 
    id,
    SUBSTRING(videoUrl, 1, 200) as videoUrl
FROM posts
WHERE videoUrl IS NOT NULL 
  AND videoUrl LIKE 'http%'
LIMIT 5;

SELECT 'Diagnóstico concluído!' as step;

-- =====================================================
-- NOTE: To fix invalid URLs, you need to:
-- 1. Re-upload the videos to your media server (S3, etc)
-- 2. Update the videoUrl field with the new HTTPS URL
-- 
-- Example update (DO NOT RUN without proper URLs):
-- UPDATE posts 
-- SET videoUrl = 'https://your-bucket.s3.amazonaws.com/videos/...'
-- WHERE id = [post_id];
-- =====================================================
