-- =====================================================
-- DIAGNÓSTICO E CORREÇÃO DE URLS DE VÍDEO
-- Execute este script no banco de dados para identificar
-- e corrigir posts com URLs de vídeo inválidas
-- =====================================================

-- 1. DIAGNÓSTICO: Listar todos os posts com vídeo
SELECT '=== DIAGNÓSTICO DE VÍDEOS ===' as info;

SELECT 
    id,
    authorId,
    type,
    LEFT(videoUrl, 100) as videoUrl_preview,
    LEFT(videoThumbnailUrl, 100) as thumbnail_preview,
    CASE 
        WHEN videoUrl LIKE 'file:%' THEN 'INVÁLIDO: URL local (file://)'
        WHEN videoUrl LIKE 'ph:%' THEN 'INVÁLIDO: Photo Library iOS'
        WHEN videoUrl LIKE 'content:%' THEN 'INVÁLIDO: Content URI Android'
        WHEN videoUrl LIKE 'http://%' THEN 'HTTP (pode funcionar)'
        WHEN videoUrl LIKE 'https://%' THEN 'VÁLIDO: HTTPS'
        WHEN videoUrl IS NULL THEN 'SEM VÍDEO'
        ELSE 'DESCONHECIDO'
    END as url_status,
    createdAt
FROM posts
WHERE videoUrl IS NOT NULL
ORDER BY createdAt DESC;

-- 2. CONTAGEM: Quantos vídeos inválidos existem?
SELECT '=== CONTAGEM DE VÍDEOS ===' as info;

SELECT 
    COUNT(*) as total_videos,
    SUM(CASE WHEN videoUrl LIKE 'file:%' OR videoUrl LIKE 'ph:%' OR videoUrl LIKE 'content:%' THEN 1 ELSE 0 END) as invalidos,
    SUM(CASE WHEN videoUrl LIKE 'https://%' THEN 1 ELSE 0 END) as validos_https,
    SUM(CASE WHEN videoUrl LIKE 'http://%' AND videoUrl NOT LIKE 'https://%' THEN 1 ELSE 0 END) as validos_http
FROM posts
WHERE videoUrl IS NOT NULL;

-- 3. LISTAR VÍDEOS INVÁLIDOS (para correção manual)
SELECT '=== VÍDEOS COM URL INVÁLIDA ===' as info;

SELECT 
    id,
    authorId,
    content,
    videoUrl,
    videoThumbnailUrl,
    createdAt
FROM posts
WHERE videoUrl IS NOT NULL 
  AND (
    videoUrl LIKE 'file:%' 
    OR videoUrl LIKE 'ph:%' 
    OR videoUrl LIKE 'content:%'
    OR videoUrl NOT LIKE 'http%'
  )
ORDER BY createdAt DESC;

-- =====================================================
-- OPÇÕES DE CORREÇÃO (ESCOLHA UMA):
-- =====================================================

-- OPÇÃO A: DELETAR posts com vídeos inválidos
-- CUIDADO: Isso remove permanentemente os posts!
-- Descomente para executar:
/*
DELETE FROM posts 
WHERE videoUrl IS NOT NULL 
  AND (
    videoUrl LIKE 'file:%' 
    OR videoUrl LIKE 'ph:%' 
    OR videoUrl LIKE 'content:%'
    OR videoUrl NOT LIKE 'http%'
  );
*/

-- OPÇÃO B: CONVERTER posts de vídeo inválido para posts de texto
-- Mantém o conteúdo mas remove a referência ao vídeo
-- Descomente para executar:
/*
UPDATE posts 
SET 
    type = 'text',
    videoUrl = NULL,
    videoThumbnailUrl = NULL
WHERE videoUrl IS NOT NULL 
  AND (
    videoUrl LIKE 'file:%' 
    OR videoUrl LIKE 'ph:%' 
    OR videoUrl LIKE 'content:%'
    OR videoUrl NOT LIKE 'http%'
  );
*/

-- OPÇÃO C: MARCAR posts como inativos (soft delete)
-- Descomente para executar:
/*
UPDATE posts 
SET status = 'inactive'
WHERE videoUrl IS NOT NULL 
  AND (
    videoUrl LIKE 'file:%' 
    OR videoUrl LIKE 'ph:%' 
    OR videoUrl LIKE 'content:%'
    OR videoUrl NOT LIKE 'http%'
  );
*/

SELECT '=== FIM DO DIAGNÓSTICO ===' as info;
