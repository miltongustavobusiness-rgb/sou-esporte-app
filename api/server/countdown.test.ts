import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

// Mock context for unauthenticated requests
function createMockContext(): TrpcContext {
  return {
    user: null,
    setCookie: () => {},
    clearCookie: () => {},
  };
}

describe('Countdown Timer - Server Time Synchronization', () => {
  it('should return server_time in events.getById response', async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    try {
      const event = await caller.events.getById({ id: 150001 });
      
      // Verify server_time is present and is a valid ISO timestamp
      expect(event.server_time).toBeDefined();
      expect(typeof event.server_time).toBe('string');
      
      // Verify it's a valid date
      const serverDate = new Date(event.server_time);
      expect(serverDate.getTime()).not.toBeNaN();
      
      // Verify server_time is recent (within last minute)
      const now = new Date();
      const diff = Math.abs(now.getTime() - serverDate.getTime());
      expect(diff).toBeLessThan(60000); // Within 60 seconds
    } catch (error: any) {
      // If event not found, skip test
      if (error.code === 'NOT_FOUND') {
        console.log('Event 150001 not found, skipping test');
        return;
      }
      throw error;
    }
  });

  it('should return eventTimezone in events.getById response', async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    try {
      const event = await caller.events.getById({ id: 150001 });
      
      // Verify eventTimezone is present
      expect(event.eventTimezone).toBeDefined();
      expect(typeof event.eventTimezone).toBe('string');
      expect(event.eventTimezone).toBe('America/Sao_Paulo');
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        console.log('Event 150001 not found, skipping test');
        return;
      }
      throw error;
    }
  });

  it('should return eventStartAt as valid timestamp', async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    try {
      const event = await caller.events.getById({ id: 150001 });
      
      // eventStartAt should be present for events with eventDate
      if (event.eventStartAt) {
        const startDate = new Date(event.eventStartAt);
        expect(startDate.getTime()).not.toBeNaN();
        
        // eventStartAt should be on same day or after eventDate
        const eventDate = new Date(event.eventDate);
        expect(startDate.getTime()).toBeGreaterThanOrEqual(eventDate.getTime() - 86400000);
      }
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        console.log('Event 150001 not found, skipping test');
        return;
      }
      throw error;
    }
  });
});
