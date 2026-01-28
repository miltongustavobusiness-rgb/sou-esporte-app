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
  },
}));

describe('Search Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchEvents', () => {
    it('should return cached results if available', async () => {
      const { cacheService } = await import('./cache');
      const cachedResult = {
        events: [{ id: 1, name: 'Test Event' }],
        total: 1,
        query: 'test',
        took: 5,
      };
      vi.mocked(cacheService.get).mockResolvedValue(cachedResult);

      const { searchEvents } = await import('./search');
      const result = await searchEvents({ query: 'test' });

      expect(result.events).toEqual(cachedResult.events);
      expect(result.total).toBe(1);
    });

    it('should return empty results for empty query', async () => {
      const { cacheService } = await import('./cache');
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue({} as any);

      const { searchEvents } = await import('./search');
      const result = await searchEvents({ query: '' });

      expect(result.events).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return empty results for single character query', async () => {
      const { cacheService } = await import('./cache');
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue({} as any);

      const { searchEvents } = await import('./search');
      const result = await searchEvents({ query: 'a' });

      expect(result.events).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return empty results if database is not available', async () => {
      const { cacheService } = await import('./cache');
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(null);

      const { searchEvents } = await import('./search');
      const result = await searchEvents({ query: 'corrida' });

      expect(result.events).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return empty array for short prefix', async () => {
      const { getSearchSuggestions } = await import('./search');
      const result = await getSearchSuggestions('a');

      expect(result).toEqual([]);
    });

    it('should return cached suggestions if available', async () => {
      const { cacheService } = await import('./cache');
      const cachedSuggestions = ['Corrida 5K', 'Corrida 10K'];
      vi.mocked(cacheService.get).mockResolvedValue(cachedSuggestions);

      const { getSearchSuggestions } = await import('./search');
      const result = await getSearchSuggestions('cor');

      expect(result).toEqual(cachedSuggestions);
    });

    it('should return empty array if database is not available', async () => {
      const { cacheService } = await import('./cache');
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(null);

      const { getSearchSuggestions } = await import('./search');
      const result = await getSearchSuggestions('corrida');

      expect(result).toEqual([]);
    });
  });
});
