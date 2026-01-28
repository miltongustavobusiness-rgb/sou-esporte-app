/**
 * Sistema de Filas - Processamento Assíncrono
 * 
 * Implementação in-memory para desenvolvimento.
 * Preparado para migração para BullMQ + Redis em produção.
 * 
 * FUTURO: Quando migrar para Upstash Redis:
 * 1. Instalar: pnpm add bullmq ioredis
 * 2. Configurar UPSTASH_REDIS_URL e UPSTASH_REDIS_TOKEN
 * 3. Trocar implementação de InMemoryQueue para BullMQ
 */

import { logger } from './logger';
import { EventEmitter } from 'events';

// ============================================
// TIPOS
// ============================================

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job<T = unknown> {
  id: string;
  name: string;
  data: T;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  result?: unknown;
}

export interface JobOptions {
  delay?: number; // Delay em ms antes de processar
  attempts?: number; // Número máximo de tentativas
  priority?: number; // Prioridade (maior = mais prioritário)
}

export type JobProcessor<T = unknown> = (job: Job<T>) => Promise<unknown>;

// ============================================
// FILA IN-MEMORY
// ============================================

class InMemoryQueue<T = unknown> extends EventEmitter {
  private jobs: Map<string, Job<T>> = new Map();
  private pendingJobs: string[] = [];
  private processors: Map<string, JobProcessor<T>> = new Map();
  private processing = false;
  private jobCounter = 0;

  constructor(public name: string) {
    super();
    logger.info({ queue: name }, `Queue "${name}" initialized (in-memory)`);
  }

  /**
   * Adiciona um job à fila
   */
  async add(jobName: string, data: T, options: JobOptions = {}): Promise<Job<T>> {
    const id = `${this.name}:${jobName}:${++this.jobCounter}:${Date.now()}`;
    
    const job: Job<T> = {
      id,
      name: jobName,
      data,
      status: 'pending',
      attempts: 0,
      maxAttempts: options.attempts || 3,
      createdAt: new Date(),
    };

    this.jobs.set(id, job);
    
    // Se tem delay, agenda para depois
    if (options.delay && options.delay > 0) {
      setTimeout(() => {
        this.pendingJobs.push(id);
        this.processNext();
      }, options.delay);
    } else {
      this.pendingJobs.push(id);
      this.processNext();
    }

    logger.debug({ 
      queue: this.name, 
      jobId: id, 
      jobName,
      delay: options.delay 
    }, `Job added to queue`);

    return job;
  }

  /**
   * Registra um processador para um tipo de job
   */
  process(jobName: string, processor: JobProcessor<T>): void {
    this.processors.set(jobName, processor);
    logger.info({ queue: this.name, jobName }, `Processor registered for "${jobName}"`);
  }

  /**
   * Processa o próximo job da fila
   */
  private async processNext(): Promise<void> {
    if (this.processing || this.pendingJobs.length === 0) {
      return;
    }

    this.processing = true;

    const jobId = this.pendingJobs.shift();
    if (!jobId) {
      this.processing = false;
      return;
    }

    const job = this.jobs.get(jobId);
    if (!job) {
      this.processing = false;
      this.processNext();
      return;
    }

    const processor = this.processors.get(job.name);
    if (!processor) {
      logger.warn({ queue: this.name, jobName: job.name }, `No processor found for job type`);
      job.status = 'failed';
      job.error = `No processor registered for job type: ${job.name}`;
      job.failedAt = new Date();
      this.processing = false;
      this.processNext();
      return;
    }

    job.status = 'processing';
    job.processedAt = new Date();
    job.attempts++;

    try {
      const result = await processor(job);
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;
      
      logger.info({ 
        queue: this.name, 
        jobId: job.id, 
        jobName: job.name,
        duration: Date.now() - job.processedAt.getTime()
      }, `Job completed successfully`);

      this.emit('completed', job);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error({ 
        queue: this.name, 
        jobId: job.id, 
        jobName: job.name,
        attempt: job.attempts,
        maxAttempts: job.maxAttempts,
        error: errorMessage
      }, `Job failed`);

      if (job.attempts < job.maxAttempts) {
        // Retry com backoff exponencial
        job.status = 'pending';
        const delay = Math.pow(2, job.attempts) * 1000; // 2s, 4s, 8s...
        
        setTimeout(() => {
          this.pendingJobs.push(job.id);
          this.processNext();
        }, delay);
        
        logger.info({ 
          queue: this.name, 
          jobId: job.id, 
          retryIn: delay 
        }, `Job scheduled for retry`);
      } else {
        job.status = 'failed';
        job.failedAt = new Date();
        job.error = errorMessage;
        this.emit('failed', job, error);
      }
    }

    this.processing = false;
    
    // Processa próximo job
    setImmediate(() => this.processNext());
  }

  /**
   * Retorna estatísticas da fila
   */
  getStats(): { pending: number; processing: number; completed: number; failed: number } {
    let pending = 0, processing = 0, completed = 0, failed = 0;
    
    for (const job of Array.from(this.jobs.values())) {
      switch (job.status) {
        case 'pending': pending++; break;
        case 'processing': processing++; break;
        case 'completed': completed++; break;
        case 'failed': failed++; break;
      }
    }

    return { pending, processing, completed, failed };
  }

  /**
   * Limpa jobs antigos (completed/failed)
   */
  cleanup(maxAge: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, job] of Array.from(this.jobs.entries())) {
      if (job.status === 'completed' || job.status === 'failed') {
        const jobAge = now - job.createdAt.getTime();
        if (jobAge > maxAge) {
          this.jobs.delete(id);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      logger.debug({ queue: this.name, cleaned }, `Cleaned old jobs`);
    }

    return cleaned;
  }
}

// ============================================
// FILAS DO SISTEMA
// ============================================

// Fila de notificações push
export const notificationQueue = new InMemoryQueue<{
  userId: number;
  title: string;
  body: string;
  data?: Record<string, string>;
}>('notifications');

// Fila de e-mails
export const emailQueue = new InMemoryQueue<{
  to: string;
  subject: string;
  html: string;
  text?: string;
}>('emails');

// Fila de lembretes de eventos
export const reminderQueue = new InMemoryQueue<{
  userId: number;
  eventId: number;
  eventName: string;
  eventDate: Date;
  reminderType: 'day_before' | 'hour_before' | 'event_start';
}>('reminders');

// Fila de processamento de imagens
export const imageQueue = new InMemoryQueue<{
  imageUrl: string;
  operations: Array<{ type: 'resize' | 'crop' | 'compress'; params: Record<string, unknown> }>;
}>('images');

// ============================================
// HELPERS
// ============================================

/**
 * Agenda notificação push
 */
export async function scheduleNotification(
  userId: number,
  title: string,
  body: string,
  options?: { delay?: number; data?: Record<string, string> }
): Promise<Job<unknown>> {
  return notificationQueue.add('push', {
    userId,
    title,
    body,
    data: options?.data,
  }, { delay: options?.delay });
}

/**
 * Agenda envio de e-mail
 */
export async function scheduleEmail(
  to: string,
  subject: string,
  html: string,
  options?: { delay?: number; text?: string }
): Promise<Job<unknown>> {
  return emailQueue.add('send', {
    to,
    subject,
    html,
    text: options?.text,
  }, { delay: options?.delay });
}

/**
 * Agenda lembrete de evento
 */
export async function scheduleEventReminder(
  userId: number,
  eventId: number,
  eventName: string,
  eventDate: Date,
  reminderType: 'day_before' | 'hour_before' | 'event_start'
): Promise<Job<unknown>> {
  // Calcula delay baseado no tipo de lembrete
  const now = Date.now();
  const eventTime = eventDate.getTime();
  let triggerTime: number;

  switch (reminderType) {
    case 'day_before':
      triggerTime = eventTime - 24 * 60 * 60 * 1000; // 24h antes
      break;
    case 'hour_before':
      triggerTime = eventTime - 60 * 60 * 1000; // 1h antes
      break;
    case 'event_start':
      triggerTime = eventTime;
      break;
  }

  const delay = Math.max(0, triggerTime - now);

  return reminderQueue.add('remind', {
    userId,
    eventId,
    eventName,
    eventDate,
    reminderType,
  }, { delay });
}

/**
 * Inicializa limpeza periódica de jobs antigos
 */
export function startQueueCleanup(intervalMs: number = 3600000): NodeJS.Timeout {
  return setInterval(() => {
    notificationQueue.cleanup();
    emailQueue.cleanup();
    reminderQueue.cleanup();
    imageQueue.cleanup();
  }, intervalMs);
}

export default {
  notification: notificationQueue,
  email: emailQueue,
  reminder: reminderQueue,
  image: imageQueue,
  scheduleNotification,
  scheduleEmail,
  scheduleEventReminder,
  startQueueCleanup,
};
