import express, { type Express } from "express";
import { type Server } from "http";

/**
 * Setup para desenvolvimento - API pura (mobile-first)
 * Não depende de client/index.html
 */
export async function setupVite(app: Express, _server: Server) {
  // Rota raiz - resposta simples para verificar se API está rodando
  app.get("/", (_req, res) => {
    res.status(200).json({
      status: "ok",
      message: "Sou Esporte API is running",
      version: "12.2",
      timestamp: new Date().toISOString(),
      endpoints: {
        health: "/health",
        trpc: "/api/trpc/*"
      }
    });
  });

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString()
    });
  });
}

/**
 * Serve arquivos estáticos em produção - API pura (mobile-first)
 * Não depende de build web
 */
export function serveStatic(app: Express) {
  // Rota raiz - resposta simples para verificar se API está rodando
  app.get("/", (_req, res) => {
    res.status(200).json({
      status: "ok",
      message: "Sou Esporte API is running",
      version: "12.2",
      mode: "production",
      timestamp: new Date().toISOString(),
      endpoints: {
        health: "/health",
        trpc: "/api/trpc/*"
      }
    });
  });

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString()
    });
  });

  // Fallback para rotas não encontradas (exceto /api/*)
  app.use("*", (req, res, next) => {
    // Se for rota de API, deixa passar para o próximo handler
    if (req.originalUrl.startsWith("/api/")) {
      return next();
    }
    
    // Para outras rotas, retorna 404
    res.status(404).json({
      error: "Not Found",
      message: "This is a mobile-first API. Use /api/trpc/* endpoints.",
      availableEndpoints: {
        root: "/",
        health: "/health",
        trpc: "/api/trpc/*"
      }
    });
  });
}
