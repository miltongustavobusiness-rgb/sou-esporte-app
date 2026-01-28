/**
 * Workers - Processadores de Jobs
 * 
 * Registra processadores para cada tipo de job nas filas.
 * Cada worker é responsável por executar a lógica de negócio.
 */

import { 
  notificationQueue, 
  emailQueue, 
  reminderQueue, 
  imageQueue,
  startQueueCleanup 
} from './queue';
import { logger, logBusinessEvent } from './logger';
import * as db from './db';

// ============================================
// WORKER DE NOTIFICAÇÕES PUSH
// ============================================

notificationQueue.process('push', async (job) => {
  const { userId, title, body, data } = job.data;
  
  logger.info({ 
    worker: 'notification', 
    userId, 
    title 
  }, `Processing push notification`);

  try {
    // Buscar tokens de push do usuário
    const pushTokens = await db.getUserPushTokens(userId);
    
    if (pushTokens.length === 0) {
      logger.warn({ userId }, `No push tokens found for user`);
      return { sent: 0, reason: 'no_tokens' };
    }

    // TODO: Integrar com serviço de push (Expo Push, Firebase, etc.)
    // Por enquanto, apenas loga a notificação
    for (const token of pushTokens) {
      logger.info({ 
        userId, 
        token: token.token.substring(0, 20) + '...', 
        title, 
        body 
      }, `Would send push notification`);
    }

    logBusinessEvent('push_notification_sent', {
      userId,
      title,
      tokenCount: pushTokens.length,
    });

    return { sent: pushTokens.length };
  } catch (error) {
    logger.error({ userId, error }, `Failed to send push notification`);
    throw error;
  }
});

// ============================================
// WORKER DE E-MAILS
// ============================================

emailQueue.process('send', async (job) => {
  const { to, subject, html, text } = job.data;
  
  logger.info({ 
    worker: 'email', 
    to, 
    subject 
  }, `Processing email`);

  try {
    // TODO: Integrar com serviço de e-mail (Resend, SendGrid, etc.)
    // Por enquanto, apenas loga o e-mail
    logger.info({ 
      to, 
      subject, 
      htmlLength: html.length 
    }, `Would send email`);

    logBusinessEvent('email_sent', {
      to,
      subject,
    });

    return { sent: true, to };
  } catch (error) {
    logger.error({ to, subject, error }, `Failed to send email`);
    throw error;
  }
});

// ============================================
// WORKER DE LEMBRETES
// ============================================

reminderQueue.process('remind', async (job) => {
  const { userId, eventId, eventName, eventDate, reminderType } = job.data;
  
  logger.info({ 
    worker: 'reminder', 
    userId, 
    eventId, 
    reminderType 
  }, `Processing event reminder`);

  try {
    // Buscar usuário
    const user = await db.getUserById(userId);
    if (!user) {
      logger.warn({ userId }, `User not found for reminder`);
      return { sent: false, reason: 'user_not_found' };
    }

    // Criar mensagem baseada no tipo de lembrete
    let title: string;
    let body: string;

    switch (reminderType) {
      case 'day_before':
        title = '🏃 Amanhã é o grande dia!';
        body = `Seu evento "${eventName}" acontece amanhã. Prepare-se!`;
        break;
      case 'hour_before':
        title = '⏰ Falta 1 hora!';
        body = `O evento "${eventName}" começa em 1 hora. Já está pronto?`;
        break;
      case 'event_start':
        title = '🚀 O evento começou!';
        body = `O evento "${eventName}" está começando agora. Boa sorte!`;
        break;
    }

    // Criar notificação no banco
    await db.createNotification({
      userId,
      type: 'event',
      title,
      message: body,
      eventId: eventId,
    });

    // Agendar push notification
    const pushTokens = await db.getUserPushTokens(userId);
    if (pushTokens.length > 0) {
      // Adiciona à fila de notificações push
      await notificationQueue.add('push', {
        userId,
        title,
        body,
        data: { eventId: String(eventId), type: reminderType },
      });
    }

    logBusinessEvent('event_reminder_sent', {
      userId,
      eventId,
      eventName,
      reminderType,
    });

    return { sent: true, reminderType };
  } catch (error) {
    logger.error({ userId, eventId, reminderType, error }, `Failed to send reminder`);
    throw error;
  }
});

// ============================================
// WORKER DE IMAGENS
// ============================================

imageQueue.process('process', async (job) => {
  const { imageUrl, operations } = job.data;
  
  logger.info({ 
    worker: 'image', 
    imageUrl: imageUrl.substring(0, 50) + '...', 
    operationsCount: operations.length 
  }, `Processing image`);

  try {
    // TODO: Integrar com serviço de processamento de imagens
    // Por enquanto, apenas loga a operação
    for (const op of operations) {
      logger.info({ 
        operation: op.type, 
        params: op.params 
      }, `Would apply image operation`);
    }

    return { processed: true, operations: operations.length };
  } catch (error) {
    logger.error({ imageUrl, error }, `Failed to process image`);
    throw error;
  }
});

// ============================================
// INICIALIZAÇÃO
// ============================================

/**
 * Inicializa todos os workers e limpeza periódica
 */
export function initializeWorkers(): void {
  logger.info({}, `Initializing queue workers...`);
  
  // Inicia limpeza periódica de jobs antigos (a cada 1 hora)
  startQueueCleanup(60 * 60 * 1000);
  
  // Log de estatísticas a cada 5 minutos
  setInterval(() => {
    const stats = {
      notifications: notificationQueue.getStats(),
      emails: emailQueue.getStats(),
      reminders: reminderQueue.getStats(),
      images: imageQueue.getStats(),
    };
    
    const totalPending = 
      stats.notifications.pending + 
      stats.emails.pending + 
      stats.reminders.pending + 
      stats.images.pending;
    
    if (totalPending > 0) {
      logger.info({ stats }, `Queue statistics`);
    }
  }, 5 * 60 * 1000);
  
  logger.info({}, `Queue workers initialized`);
}

// Listeners de eventos para logging
notificationQueue.on('completed', (job) => {
  logger.debug({ jobId: job.id, result: job.result }, `Notification job completed`);
});

notificationQueue.on('failed', (job, error) => {
  logger.error({ jobId: job.id, error: job.error }, `Notification job failed`);
});

emailQueue.on('completed', (job) => {
  logger.debug({ jobId: job.id, result: job.result }, `Email job completed`);
});

emailQueue.on('failed', (job, error) => {
  logger.error({ jobId: job.id, error: job.error }, `Email job failed`);
});

reminderQueue.on('completed', (job) => {
  logger.debug({ jobId: job.id, result: job.result }, `Reminder job completed`);
});

reminderQueue.on('failed', (job, error) => {
  logger.error({ jobId: job.id, error: job.error }, `Reminder job failed`);
});

export default {
  initializeWorkers,
};
