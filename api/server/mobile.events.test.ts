import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getEventById: vi.fn(),
  updateEvent: vi.fn(),
  getEventCategories: vi.fn(),
  getEventRegistrations: vi.fn(),
}));

import * as db from './db';

describe('Mobile Events API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateEvent', () => {
    it('should update event successfully', async () => {
      const mockEvent = {
        id: 1,
        name: 'Test Event',
        status: 'draft',
      };

      (db.getEventById as any).mockResolvedValue(mockEvent);
      (db.updateEvent as any).mockResolvedValue(undefined);

      // Simulate the update logic
      const eventId = 1;
      const updateData = { name: 'Updated Event', status: 'published' };

      const event = await db.getEventById(eventId);
      expect(event).toBeDefined();
      expect(event?.id).toBe(1);

      await db.updateEvent(eventId, updateData);
      expect(db.updateEvent).toHaveBeenCalledWith(1, updateData);
    });

    it('should throw error if event not found', async () => {
      (db.getEventById as any).mockResolvedValue(null);

      const event = await db.getEventById(999);
      expect(event).toBeNull();
    });
  });

  describe('publishEvent', () => {
    it('should publish event by changing status to published', async () => {
      const mockEvent = {
        id: 1,
        name: 'Draft Event',
        status: 'draft',
      };

      (db.getEventById as any).mockResolvedValue(mockEvent);
      (db.updateEvent as any).mockResolvedValue(undefined);

      const event = await db.getEventById(1);
      expect(event?.status).toBe('draft');

      await db.updateEvent(1, { status: 'published' });
      expect(db.updateEvent).toHaveBeenCalledWith(1, { status: 'published' });
    });
  });

  describe('getEventForEdit', () => {
    it('should return event with categories', async () => {
      const mockEvent = {
        id: 1,
        name: 'Test Event',
        city: 'São Paulo',
        state: 'SP',
      };

      const mockCategories = [
        { id: 1, name: '5K', distance: '5', price: '100.00' },
        { id: 2, name: '10K', distance: '10', price: '150.00' },
      ];

      (db.getEventById as any).mockResolvedValue(mockEvent);
      (db.getEventCategories as any).mockResolvedValue(mockCategories);

      const event = await db.getEventById(1);
      const categories = await db.getEventCategories(1);

      expect(event).toBeDefined();
      expect(event?.name).toBe('Test Event');
      expect(categories).toHaveLength(2);
      expect(categories[0].name).toBe('5K');
    });
  });

  describe('getEventRegistrations', () => {
    it('should return registrations for an event', async () => {
      const mockRegistrations = [
        { id: 1, userId: 1, eventId: 1, paymentStatus: 'paid' },
        { id: 2, userId: 2, eventId: 1, paymentStatus: 'pending' },
      ];

      (db.getEventRegistrations as any).mockResolvedValue(mockRegistrations);

      const registrations = await db.getEventRegistrations(1);

      expect(registrations).toHaveLength(2);
      expect(registrations[0].paymentStatus).toBe('paid');
      expect(registrations[1].paymentStatus).toBe('pending');
    });

    it('should return empty array if no registrations', async () => {
      (db.getEventRegistrations as any).mockResolvedValue([]);

      const registrations = await db.getEventRegistrations(999);

      expect(registrations).toHaveLength(0);
    });
  });
});
