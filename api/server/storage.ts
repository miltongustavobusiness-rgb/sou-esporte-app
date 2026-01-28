// Storage helpers with LOCAL FALLBACK for development
// In production: Uses Forge storage proxy
// In development: Saves files locally to api/uploads/

import { ENV } from './_core/env';
import * as fs from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';

// ============================================
// STORAGE PROVIDER DETECTION
// ============================================

type StorageProvider = 'FORGE' | 'LOCAL';

function getStorageProvider(): StorageProvider {
  const hasForgeCredentials = ENV.forgeApiUrl && ENV.forgeApiKey;
  
  if (hasForgeCredentials) {
    console.log('[Storage] 🌐 Provider: FORGE (cloud storage)');
    return 'FORGE';
  }
  
  // In development without Forge credentials, use local storage
  console.log('[Storage] 📁 Provider: LOCAL (api/uploads/)');
  console.log('[Storage] ⚠️ BUILT_IN_FORGE_API_URL and/or BUILT_IN_FORGE_API_KEY not set');
  console.log('[Storage] ⚠️ Using local file storage for development');
  return 'LOCAL';
}

// Log provider on startup
const STORAGE_PROVIDER = getStorageProvider();

// ============================================
// LOCAL STORAGE IMPLEMENTATION
// ============================================

// Get the uploads directory path
function getUploadsDir(): string {
  // Use absolute path relative to the api directory
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('[Storage] 📂 Created uploads directory:', uploadsDir);
  }
  
  return uploadsDir;
}

// Get the base URL for serving local files
// IMPORTANT: Must use the public URL that mobile devices can access
function getLocalBaseUrl(): string {
  // Priority: API_PUBLIC_URL > HOST:PORT > fallback to localhost
  // API_PUBLIC_URL should be set to the IP address accessible from mobile devices
  // Example: API_PUBLIC_URL=http://192.168.0.14:3000
  
  if (process.env.API_PUBLIC_URL) {
    const url = process.env.API_PUBLIC_URL.replace(/\/+$/, ''); // Remove trailing slash
    console.log('[Storage] 🌐 Using API_PUBLIC_URL:', url);
    return url;
  }
  
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';
  
  // If HOST is 0.0.0.0 or localhost, warn that uploads may not work on mobile
  if (host === '0.0.0.0' || host === 'localhost' || host === '127.0.0.1') {
    console.warn('[Storage] ⚠️ WARNING: HOST is set to', host);
    console.warn('[Storage] ⚠️ Mobile devices cannot access localhost!');
    console.warn('[Storage] ⚠️ Set API_PUBLIC_URL=http://YOUR_IP:3000 in .env');
    console.warn('[Storage] ⚠️ Example: API_PUBLIC_URL=http://192.168.0.14:3000');
  }
  
  return `http://${host}:${port}`;
}

// Save file locally
async function localStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const uploadsDir = getUploadsDir();
  
  // Normalize the key and generate unique filename
  const normalizedKey = relKey.replace(/^\/+/, '');
  const ext = getExtensionFromContentType(contentType) || path.extname(normalizedKey) || '';
  const uniqueId = nanoid(8);
  const timestamp = Date.now();
  
  // Create subdirectory based on key (e.g., profiles/, events/, posts/)
  const keyParts = normalizedKey.split('/');
  const folder = keyParts.length > 1 ? keyParts[0] : 'general';
  const originalName = keyParts[keyParts.length - 1].replace(/\.[^/.]+$/, ''); // Remove extension
  
  const folderPath = path.join(uploadsDir, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  
  // Generate unique filename
  const filename = `${timestamp}-${uniqueId}-${originalName}${ext}`;
  const filePath = path.join(folderPath, filename);
  const key = `${folder}/${filename}`;
  
  // Convert data to Buffer if needed
  let buffer: Buffer;
  if (typeof data === 'string') {
    buffer = Buffer.from(data);
  } else if (data instanceof Uint8Array) {
    buffer = Buffer.from(data);
  } else {
    buffer = data;
  }
  
  // Write file to disk
  fs.writeFileSync(filePath, buffer);
  
  // Generate public URL
  const baseUrl = getLocalBaseUrl();
  const url = `${baseUrl}/uploads/${key}`;
  
  console.log('[Storage] ✅ LOCAL: File saved');
  console.log('[Storage]    Path:', filePath);
  console.log('[Storage]    URL:', url);
  console.log('[Storage]    Size:', buffer.length, 'bytes');
  console.log('[Storage]    Type:', contentType);
  
  return { key, url };
}

// Get file extension from content type
function getExtensionFromContentType(contentType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/webm': '.webm',
    'video/avi': '.avi',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'application/pdf': '.pdf',
  };
  return mimeToExt[contentType.toLowerCase()] || '';
}

// Get local file URL
async function localStorageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, '');
  const baseUrl = getLocalBaseUrl();
  const url = `${baseUrl}/uploads/${key}`;
  
  // Check if file exists
  const filePath = path.join(getUploadsDir(), key);
  if (!fs.existsSync(filePath)) {
    console.log('[Storage] ⚠️ LOCAL: File not found:', filePath);
  }
  
  return { key, url };
}

// ============================================
// FORGE STORAGE IMPLEMENTATION (Original)
// ============================================

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

async function forgeStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  
  console.log('[Storage] ✅ FORGE: File uploaded');
  console.log('[Storage]    Key:', key);
  console.log('[Storage]    URL:', url);
  
  return { key, url };
}

async function forgeStorageGet(relKey: string): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}

// ============================================
// EXPORTED FUNCTIONS (Auto-select provider)
// ============================================

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  console.log('[Storage] 📤 Upload request:', relKey, '(', contentType, ')');
  
  if (STORAGE_PROVIDER === 'LOCAL') {
    return localStoragePut(relKey, data, contentType);
  }
  
  return forgeStoragePut(relKey, data, contentType);
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  console.log('[Storage] 📥 Get request:', relKey);
  
  if (STORAGE_PROVIDER === 'LOCAL') {
    return localStorageGet(relKey);
  }
  
  return forgeStorageGet(relKey);
}

// Export provider info for debugging
export function getActiveStorageProvider(): StorageProvider {
  return STORAGE_PROVIDER;
}
