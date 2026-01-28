import { describe, it, expect } from 'vitest';

describe('Brasilia Timezone Tests', () => {
  // Função que simula o cálculo do backend
  const formatBrasiliaISO = (date: Date): string => {
    // Brasília é UTC-3 (sem horário de verão desde 2019)
    const brasiliaOffset = -3 * 60; // -180 minutos
    const brasiliaTime = new Date(date.getTime() + (date.getTimezoneOffset() + brasiliaOffset) * 60000);
    
    const year = brasiliaTime.getFullYear();
    const month = String(brasiliaTime.getMonth() + 1).padStart(2, '0');
    const day = String(brasiliaTime.getDate()).padStart(2, '0');
    const hours = String(brasiliaTime.getHours()).padStart(2, '0');
    const minutes = String(brasiliaTime.getMinutes()).padStart(2, '0');
    const seconds = String(brasiliaTime.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`;
  };

  // Função que simula o cálculo do frontend
  const calculateRemainingMs = (
    serverTimeBrasilia: string,
    eventStartAtBrasilia: string,
    clientTime: number
  ): number => {
    const serverTimeMs = Date.parse(serverTimeBrasilia);
    const offsetMs = serverTimeMs - clientTime;
    const eventTimeMs = Date.parse(eventStartAtBrasilia);
    const nowMs = clientTime + offsetMs;
    return eventTimeMs - nowMs;
  };

  const formatCountdown = (remainingMs: number) => {
    if (remainingMs <= 0) return { days: '00', time: '00:00:00' };
    
    const totalSeconds = Math.floor(remainingMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return {
      days: String(days).padStart(2, '0'),
      time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    };
  };

  it('should format server time with -03:00 offset', () => {
    // Simular uma data UTC conhecida
    const utcDate = new Date('2026-01-20T02:00:00.000Z');
    const brasilia = formatBrasiliaISO(utcDate);
    
    // 02:00 UTC = 23:00 Brasília (dia anterior)
    expect(brasilia).toBe('2026-01-19T23:00:00-03:00');
  });

  it('should calculate correct remaining time', () => {
    const serverTimeBrasilia = '2026-01-19T23:00:00-03:00';
    const eventStartAtBrasilia = '2026-08-24T07:00:00-03:00';
    
    // Simular cliente com mesmo horário do servidor
    const clientTime = Date.parse(serverTimeBrasilia);
    
    const remainingMs = calculateRemainingMs(serverTimeBrasilia, eventStartAtBrasilia, clientTime);
    const countdown = formatCountdown(remainingMs);
    
    // De 19/01/2026 23:00 até 24/08/2026 07:00
    // = 216 dias + 8 horas = 216 dias, 08:00:00
    expect(countdown.days).toBe('216');
    expect(countdown.time).toBe('08:00:00');
  });

  it('should be immune to client clock changes', () => {
    const serverTimeBrasilia = '2026-01-19T23:00:00-03:00';
    const eventStartAtBrasilia = '2026-08-24T07:00:00-03:00';
    
    // Cliente com relógio correto
    const correctClientTime = Date.parse(serverTimeBrasilia);
    const remainingCorrect = calculateRemainingMs(serverTimeBrasilia, eventStartAtBrasilia, correctClientTime);
    
    // Cliente com relógio 2 horas adiantado
    const wrongClientTime = correctClientTime + (2 * 60 * 60 * 1000);
    const remainingWrong = calculateRemainingMs(serverTimeBrasilia, eventStartAtBrasilia, wrongClientTime);
    
    // Ambos devem dar o mesmo resultado porque usamos o offset do servidor
    expect(remainingCorrect).toBe(remainingWrong);
  });

  it('should show "Evento iniciado" when remaining <= 0', () => {
    const serverTimeBrasilia = '2026-08-24T08:00:00-03:00'; // 1 hora após o evento
    const eventStartAtBrasilia = '2026-08-24T07:00:00-03:00';
    
    const clientTime = Date.parse(serverTimeBrasilia);
    const remainingMs = calculateRemainingMs(serverTimeBrasilia, eventStartAtBrasilia, clientTime);
    
    expect(remainingMs).toBeLessThanOrEqual(0);
    
    const countdown = formatCountdown(remainingMs);
    expect(countdown.days).toBe('00');
    expect(countdown.time).toBe('00:00:00');
  });

  it('should show 00 days when less than 1 day remaining', () => {
    const serverTimeBrasilia = '2026-08-23T10:00:00-03:00'; // 21 horas antes
    const eventStartAtBrasilia = '2026-08-24T07:00:00-03:00';
    
    const clientTime = Date.parse(serverTimeBrasilia);
    const remainingMs = calculateRemainingMs(serverTimeBrasilia, eventStartAtBrasilia, clientTime);
    
    const countdown = formatCountdown(remainingMs);
    expect(countdown.days).toBe('00');
    expect(countdown.time).toBe('21:00:00');
  });

  it('should compose event_start_at_brasilia from eventDate + eventTime', () => {
    // Simular dados do banco
    const eventDate = new Date('2026-08-24T03:00:00.000Z'); // Armazenado como UTC
    const eventTime = '07:00';
    
    // Extrair data usando UTC (como o backend faz)
    const year = eventDate.getUTCFullYear();
    const month = String(eventDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(eventDate.getUTCDate()).padStart(2, '0');
    const [hours, minutes] = eventTime.split(':');
    
    const eventStartAtBrasilia = `${year}-${month}-${day}T${hours}:${minutes}:00-03:00`;
    
    expect(eventStartAtBrasilia).toBe('2026-08-24T07:00:00-03:00');
  });
});
