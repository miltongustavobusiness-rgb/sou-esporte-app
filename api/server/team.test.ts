import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock users for testing
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

const mockUser2 = {
  ...mockUser,
  id: 2,
  openId: "test-user-456",
  email: "test2@example.com",
  name: "Test User 2",
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

describe("Team Router", () => {
  describe("team.getMyTeams", () => {
    it("should return empty array for user with no teams", async () => {
      const ctx = createMockContext(mockUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.team.getMyTeams();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should require authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.team.getMyTeams()).rejects.toThrow();
    });
  });

  describe("team.search", () => {
    it("should search teams without authentication", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.team.search({ query: "test", limit: 10 });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.team.search({ query: "a", limit: 5 });

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe("team.getById", () => {
    it("should throw NOT_FOUND for non-existent team", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.team.getById({ id: 999999 })
      ).rejects.toThrow();
    });
  });

  describe("team.getBySlug", () => {
    it("should throw NOT_FOUND for non-existent team slug", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.team.getBySlug({ slug: "non-existent-team-slug-12345" })
      ).rejects.toThrow();
    });
  });

  describe("team.create", () => {
    it("should require authentication to create team", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.team.create({
          name: "Test Team",
          slug: "test-team",
        })
      ).rejects.toThrow();
    });

    it("should validate team name length", async () => {
      const ctx = createMockContext(mockUser);
      const caller = appRouter.createCaller(ctx);

      // Name too short
      await expect(
        caller.team.create({
          name: "A",
          slug: "a",
        })
      ).rejects.toThrow();
    });
  });

  describe("team.getMembers", () => {
    it("should return empty array for non-existent team", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.team.getMembers({ teamId: 999999 });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe("team.getMyInvitations", () => {
    it("should return invitations for authenticated user", async () => {
      const ctx = createMockContext(mockUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.team.getMyInvitations();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should require authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.team.getMyInvitations()).rejects.toThrow();
    });
  });

  describe("team.inviteMember", () => {
    it("should require authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.team.inviteMember({
          teamId: 1,
          email: "test@example.com",
        })
      ).rejects.toThrow();
    });

    it("should require email or userId", async () => {
      const ctx = createMockContext(mockUser);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.team.inviteMember({
          teamId: 1,
        })
      ).rejects.toThrow();
    });
  });

  describe("team.acceptInvitation", () => {
    it("should throw NOT_FOUND for invalid token", async () => {
      const ctx = createMockContext(mockUser);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.team.acceptInvitation({ token: "invalid-token-12345" })
      ).rejects.toThrow();
    });
  });

  describe("team.removeMember", () => {
    it("should require authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.team.removeMember({ teamId: 1, userId: 2 })
      ).rejects.toThrow();
    });
  });

  describe("team.updateMemberRole", () => {
    it("should require authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.team.updateMemberRole({ teamId: 1, userId: 2, role: "admin" })
      ).rejects.toThrow();
    });
  });

  describe("team.registerTeamForEvent", () => {
    it("should require authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.team.registerTeamForEvent({
          teamId: 1,
          eventId: 1,
          athletes: [{ userId: 1, categoryId: 1 }],
        })
      ).rejects.toThrow();
    });
  });

  describe("team.getTeamRegistrations", () => {
    it("should require authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.team.getTeamRegistrations({ teamId: 1 })
      ).rejects.toThrow();
    });
  });
});
