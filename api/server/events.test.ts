import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock user for authenticated context
const mockUser = {
  id: 1,
  openId: "test-user-123",
  email: "test@example.com",
  name: "Test User",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const mockAdminUser = {
  ...mockUser,
  id: 2,
  openId: "admin-user-123",
  role: "admin" as const,
};

function createMockContext(user: typeof mockUser | null = null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Events Router", () => {
  describe("events.list", () => {
    it("should return events list without authentication", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.events.list({});

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter events by status", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.events.list({ status: "published" });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // All returned events should be published
      result.forEach(event => {
        expect(event.status).toBe("published");
      });
    });

    it("should filter featured events", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.events.list({ featured: true });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // All returned events should be featured
      result.forEach(event => {
        expect(event.featured).toBe(true);
      });
    });

    it("should limit results", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.events.list({ limit: 5 });

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe("events.getBySlug", () => {
    it("should throw NOT_FOUND for non-existent event", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.events.getBySlug({ slug: "non-existent-event-slug-12345" })
      ).rejects.toThrow();
    });
  });
});

describe("User Router", () => {
  describe("user.getProfile", () => {
    it("should return profile for authenticated user", async () => {
      const ctx = createMockContext(mockUser);
      const caller = appRouter.createCaller(ctx);

      // This may return null if user doesn't exist in DB, which is expected
      const result = await caller.user.getProfile();
      
      // Result can be null or a user object
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe("user.getStats", () => {
    it("should return stats structure for authenticated user", async () => {
      const ctx = createMockContext(mockUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.user.getStats();

      expect(result).toBeDefined();
      // totalRaces and totalDistance can be number or string depending on DB
      expect(result.totalRaces).toBeDefined();
      expect(result.totalDistance).toBeDefined();
    });
  });
});

describe("Registration Router", () => {
  describe("registration.getMyRegistrations", () => {
    it("should return registrations for authenticated user", async () => {
      const ctx = createMockContext(mockUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.registration.getMyRegistrations();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe("Admin Router", () => {
  describe("admin.getMyEvents", () => {
    it("should return events for admin user", async () => {
      const ctx = createMockContext(mockAdminUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.getMyEvents();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe("Auth Router", () => {
  describe("auth.me", () => {
    it("should return null for unauthenticated user", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();

      expect(result).toBeNull();
    });

    it("should return user for authenticated user", async () => {
      const ctx = createMockContext(mockUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();

      expect(result).toBeDefined();
      expect(result?.openId).toBe(mockUser.openId);
    });
  });

  describe("auth.logout", () => {
    it("should clear session cookie and return success", async () => {
      let clearedCookieName = "";
      const ctx: TrpcContext = {
        user: mockUser,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {
          clearCookie: (name: string) => {
            clearedCookieName = name;
          },
        } as TrpcContext["res"],
      };

      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.logout();

      expect(result).toEqual({ success: true });
      // Cookie name is defined in shared/const.ts
      expect(clearedCookieName).toBeTruthy();
    });
  });
});
