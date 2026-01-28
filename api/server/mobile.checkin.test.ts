import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getRegistrationById: vi.fn(),
  updateRegistrationCheckIn: vi.fn(),
  updateRegistrationPaymentStatus: vi.fn(),
  updateRegistrationStatus: vi.fn(),
  createEventResult: vi.fn(),
  deleteEventResult: vi.fn(),
  getEventById: vi.fn(),
  updateEvent: vi.fn(),
}));

import * as db from './db';

describe('Mobile Check-in and Payment API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkIn', () => {
    it('should perform check-in successfully', async () => {
      const mockRegistration = {
        id: 1,
        userId: 1,
        eventId: 1,
        paymentStatus: 'paid',
        checkedIn: false,
      };

      (db.getRegistrationById as any).mockResolvedValue(mockRegistration);
      (db.updateRegistrationCheckIn as any).mockResolvedValue(undefined);

      const registration = await db.getRegistrationById(1);
      expect(registration).toBeDefined();
      expect(registration?.checkedIn).toBe(false);

      await db.updateRegistrationCheckIn(1, true);
      expect(db.updateRegistrationCheckIn).toHaveBeenCalledWith(1, true);
    });

    it('should throw error if registration not found', async () => {
      (db.getRegistrationById as any).mockResolvedValue(null);

      const registration = await db.getRegistrationById(999);
      expect(registration).toBeNull();
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {
      const mockRegistration = {
        id: 1,
        userId: 1,
        eventId: 1,
        paymentStatus: 'pending',
      };

      (db.getRegistrationById as any).mockResolvedValue(mockRegistration);
      (db.updateRegistrationPaymentStatus as any).mockResolvedValue(undefined);

      const registration = await db.getRegistrationById(1);
      expect(registration?.paymentStatus).toBe('pending');

      await db.updateRegistrationPaymentStatus(1, 'paid');
      expect(db.updateRegistrationPaymentStatus).toHaveBeenCalledWith(1, 'paid');
    });
  });

  describe('cancelRegistration', () => {
    it('should cancel registration successfully', async () => {
      const mockRegistration = {
        id: 1,
        userId: 1,
        eventId: 1,
        status: 'confirmed',
      };

      (db.getRegistrationById as any).mockResolvedValue(mockRegistration);
      (db.updateRegistrationStatus as any).mockResolvedValue(undefined);

      const registration = await db.getRegistrationById(1);
      expect(registration?.status).toBe('confirmed');

      await db.updateRegistrationStatus(1, 'cancelled');
      expect(db.updateRegistrationStatus).toHaveBeenCalledWith(1, 'cancelled');
    });
  });
});

describe('Mobile Results API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addResult', () => {
    it('should add result successfully', async () => {
      const resultData = {
        eventId: 1,
        athleteName: 'João Silva',
        bibNumber: '123',
        categoryName: '10K',
        chipTime: 3600,
        gunTime: 3610,
        pace: 360,
      };

      (db.createEventResult as any).mockResolvedValue({ id: 1 });

      const result = await db.createEventResult(resultData);
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(db.createEventResult).toHaveBeenCalledWith(resultData);
    });
  });

  describe('deleteResult', () => {
    it('should delete result successfully', async () => {
      (db.deleteEventResult as any).mockResolvedValue({ success: true });

      const result = await db.deleteEventResult(1);
      expect(result.success).toBe(true);
      expect(db.deleteEventResult).toHaveBeenCalledWith(1);
    });
  });

  describe('publishResults', () => {
    it('should publish results by updating event status', async () => {
      const mockEvent = {
        id: 1,
        name: 'Test Event',
        status: 'published',
        resultsPublished: false,
      };

      (db.getEventById as any).mockResolvedValue(mockEvent);
      (db.updateEvent as any).mockResolvedValue(undefined);

      const event = await db.getEventById(1);
      expect(event).toBeDefined();

      await db.updateEvent(1, { resultsPublished: true });
      expect(db.updateEvent).toHaveBeenCalledWith(1, { resultsPublished: true });
    });
  });
});
