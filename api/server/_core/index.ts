import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { globalRateLimit } from "../rateLimit";
import { logger, logRequest, logResponse } from "../logger";
import pinoHttp from "pino-http";
import { initializeWorkers } from "../workers";
import { startRankingJob } from "../ranking";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // ============================================
  // LOGGING - Pino HTTP middleware
  // ============================================
  const httpLogger = pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => {
        // Ignore health checks and static assets
        const url = req.url || '';
        return url === '/health' || 
               url === '/api/health' || 
               url.startsWith('/_vite') ||
               url.startsWith('/node_modules') ||
               url.endsWith('.js') ||
               url.endsWith('.css') ||
               url.endsWith('.png') ||
               url.endsWith('.jpg') ||
               url.endsWith('.svg') ||
               url.endsWith('.ico');
      },
    },
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} ${res.statusCode} - ${err?.message || 'Error'}`;
    },
    // Redact sensitive headers
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  });
  
  app.use(httpLogger);
  
  // ============================================
  // RATE LIMITING - Global
  // ============================================
  app.use(globalRateLimit);
  
  // ============================================
  // CORS
  // ============================================
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // Allow all origins in development
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  }));
  
  // ============================================
  // BODY PARSER
  // ============================================
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // ============================================
  // HEALTH CHECK
  // ============================================
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'souesporte-api',
      version: process.env.npm_package_version || '1.0.0',
    });
  });
  
  // ============================================
  // OAUTH
  // ============================================
  registerOAuthRoutes(app);
  
  // ============================================
  // LOCAL UPLOADS STATIC ROUTE (Development) - WITH RANGE SUPPORT
  // ============================================
  // Serve files from api/uploads/ directory with proper byte-range streaming
  const pathModule = await import('path');
  const fsModule = await import('fs');
  const uploadsPath = pathModule.resolve(process.cwd(), 'uploads');
  
  // Create uploads directory if it doesn't exist
  if (!fsModule.existsSync(uploadsPath)) {
    fsModule.mkdirSync(uploadsPath, { recursive: true });
    logger.info({ path: uploadsPath }, 'Created uploads directory');
  }
  
  // MIME types mapping
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.avi': 'video/avi',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
  };
  
  // Video streaming endpoint with Range support
  app.get('/uploads/*', (req, res) => {
    try {
      const relativePath = req.params[0];
      const filePath = pathModule.join(uploadsPath, relativePath);
      
      // Security: prevent directory traversal
      if (!filePath.startsWith(uploadsPath)) {
        logger.warn({ path: relativePath }, '[Streaming] Directory traversal attempt blocked');
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      // Check if file exists
      if (!fsModule.existsSync(filePath)) {
        logger.warn({ path: filePath }, '[Streaming] File not found');
        return res.status(404).json({ error: 'File not found' });
      }
      
      const stat = fsModule.statSync(filePath);
      const fileSize = stat.size;
      const ext = pathModule.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', contentType);
      
      // Handle Range request for video streaming
      const range = req.headers.range;
      
      if (range) {
        // Parse Range header: "bytes=start-end"
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        
        // Validate range
        if (start >= fileSize || end >= fileSize || start > end) {
          res.setHeader('Content-Range', `bytes */${fileSize}`);
          return res.status(416).send('Requested Range Not Satisfiable');
        }
        
        const chunkSize = (end - start) + 1;
        
        logger.info({ 
          path: relativePath, 
          range: `${start}-${end}/${fileSize}`,
          chunkSize,
          contentType 
        }, '[Streaming] 📹 Range request');
        
        res.status(206); // Partial Content
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', chunkSize);
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        
        const stream = fsModule.createReadStream(filePath, { start, end });
        stream.pipe(res);
        
        stream.on('error', (err) => {
          logger.error({ error: err.message, path: filePath }, '[Streaming] Stream error');
          if (!res.headersSent) {
            res.status(500).json({ error: 'Stream error' });
          }
        });
      } else {
        // No Range header - send entire file
        logger.info({ 
          path: relativePath, 
          size: fileSize,
          contentType 
        }, '[Streaming] 📁 Full file request');
        
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        
        const stream = fsModule.createReadStream(filePath);
        stream.pipe(res);
        
        stream.on('error', (err) => {
          logger.error({ error: err.message, path: filePath }, '[Streaming] Stream error');
          if (!res.headersSent) {
            res.status(500).json({ error: 'Stream error' });
          }
        });
      }
    } catch (error: any) {
      logger.error({ error: error.message }, '[Streaming] Error serving file');
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Handle OPTIONS for CORS preflight
  app.options('/uploads/*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    res.status(204).end();
  });
  
  logger.info({ path: uploadsPath }, '[Storage] 📁 Local uploads route enabled at /uploads (with Range support)');
  
  // ============================================
  // MEDIA UPLOAD ENDPOINT
  // ============================================
  app.post('/api/upload', async (req, res) => {
    try {
      // Para upload de imagens, vamos usar base64 por enquanto
      // Em produção, usar multer + S3/CloudStorage
      const { image, type, userId } = req.body;
      
      if (!image) {
        return res.status(400).json({ success: false, error: 'Imagem não fornecida' });
      }
      
      // Simular upload bem-sucedido
      // Em produção: salvar no S3, verificar conteúdo com AI, etc.
      const uploadId = Date.now();
      const url = image; // Em produção, seria a URL do S3
      
      // Status: pending (aguardando moderação), approved, rejected
      const status = 'approved'; // Em produção: 'pending' para moderação
      
      res.json({
        success: true,
        url,
        uploadId,
        status,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Upload error');
      res.status(500).json({ success: false, error: 'Erro no upload' });
    }
  });
  
  // ============================================
  // tRPC API
  // ============================================
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path }) => {
        logger.error({
          type: 'trpc_error',
          path,
          code: error.code,
          message: error.message,
        }, `tRPC error on ${path}: ${error.message}`);
      },
    })
  );
  
  // ============================================
  // STATIC FILES / VITE
  // ============================================
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logger.warn({ preferredPort, actualPort: port }, `Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Inicializar workers de filas
  initializeWorkers();
  
  // Inicializar job de recálculo de ranking (a cada 15 minutos)
  startRankingJob(15 * 60 * 1000);
  
  server.listen(port, () => {
    logger.info({ port, env: process.env.NODE_ENV }, `Server running on http://localhost:${port}/`);
  });
}

startServer().catch((err) => {
  console.error('FATAL ERROR:', err);
  console.error('Stack:', err.stack);
  logger.fatal({ error: err, stack: err.stack, message: err.message }, 'Failed to start server');
  process.exit(1);
});
