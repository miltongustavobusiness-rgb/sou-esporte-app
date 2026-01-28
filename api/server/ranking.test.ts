import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('./db', () => ({
  getDb: vi.fn(),
}));

vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./cache', () => ({
  cacheService: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    invalidatePattern: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Ranking Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('recalculateRankings', () => {
    it('should return early if database is not available', async () => {
      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(null);

      const { recalculateRankings } = await import('./ranking');
      const result = await recalculateRankings();

      expect(result).toEqual({ updated: 0, duration: 0 });
    });

    it('should handle empty events list', async () => {
      const { getDb } = await import('./db');
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const { recalculateRankings } = await import('./ranking');
      const result = await recalculateRankings();

      expect(result.updated).toBe(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getHighlightedEvents', () => {
    it('should return cached results if available', async () => {
      const { cacheService } = await import('./cache');
      const cachedEvents = [{ id: 1, name: 'Test Event' }];
      vi.mocked(cacheService.get).mockResolvedValue(cachedEvents);

      const { getHighlightedEvents } = await import('./ranking');
      const result = await getHighlightedEvents(10);

      expect(result).toEqual(cachedEvents);
      expect(cacheService.get).toHaveBeenCalled();
    });

    it('should return empty array if database is not available', async () => {
      const { cacheService } = await import('./cache');
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(null);

      const { getHighlightedEvents } = await import('./ranking');
      const result = await getHighlightedEvents(10);

      expect(result).toEqual([]);
    });
  });

  describe('startRankingJob', () => {
    it('should return a timer interval', async () => {
      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(null);

      const { startRankingJob } = await import('./ranking');
      const timer = startRankingJob(60000);

      expect(timer).toBeDefined();
      clearInterval(timer);
    });
  });
});
