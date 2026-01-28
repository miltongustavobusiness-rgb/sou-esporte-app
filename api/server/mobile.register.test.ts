import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';

// Mock the database module
vi.mock('./db', () => ({
  getUserByEmail: vi.fn(),
  getUserByCpf: vi.fn(),
  createUser: vi.fn(),
  getUserByEmailAndPassword: vi.fn(),
  updateUserLastSignedIn: vi.fn(),
}));

describe('mobile.registerUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register a new user successfully', async () => {
    // Mock: email doesn't exist
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined);
    vi.mocked(db.getUserByCpf).mockResolvedValue(undefined);
    vi.mocked(db.createUser).mockResolvedValue(1);

    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.mobile.registerUser({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      cpf: '12345678901',
      phone: '11999999999',
      gender: 'male',
    });

    expect(result.success).toBe(true);
    expect(result.userId).toBe(1);
    expect(result.message).toBe('Conta criada com sucesso!');
    expect(db.createUser).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    }));
  });

  it('should reject duplicate email', async () => {
    // Mock: email already exists
    vi.mocked(db.getUserByEmail).mockResolvedValue({
      id: 1,
      openId: 'existing-user',
      name: 'Existing User',
      email: 'test@example.com',
      role: 'user',
    } as any);

    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    await expect(caller.mobile.registerUser({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    })).rejects.toThrow('Este e-mail já está cadastrado');
  });

  it('should reject duplicate CPF', async () => {
    // Mock: email doesn't exist but CPF does
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined);
    vi.mocked(db.getUserByCpf).mockResolvedValue({
      id: 1,
      openId: 'existing-user',
      cpf: '12345678901',
    } as any);

    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    await expect(caller.mobile.registerUser({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      cpf: '12345678901',
    })).rejects.toThrow('Este CPF já está cadastrado');
  });

  it('should reject short password', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    await expect(caller.mobile.registerUser({
      name: 'Test User',
      email: 'test@example.com',
      password: '123', // Too short
    })).rejects.toThrow();
  });

  it('should reject invalid email format', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    await expect(caller.mobile.registerUser({
      name: 'Test User',
      email: 'invalid-email',
      password: 'password123',
    })).rejects.toThrow();
  });
});

describe('mobile.loginUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should login user with correct credentials', async () => {
    vi.mocked(db.getUserByEmailAndPassword).mockResolvedValue({
      id: 1,
      openId: 'test-user',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      photoUrl: null,
    } as any);
    vi.mocked(db.updateUserLastSignedIn).mockResolvedValue(undefined);

    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.mobile.loginUser({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.email).toBe('test@example.com');
    expect(db.updateUserLastSignedIn).toHaveBeenCalledWith(1);
  });

  it('should reject invalid credentials', async () => {
    vi.mocked(db.getUserByEmailAndPassword).mockResolvedValue(undefined);

    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    await expect(caller.mobile.loginUser({
      email: 'test@example.com',
      password: 'wrongpassword',
    })).rejects.toThrow('E-mail ou senha inválidos');
  });
});
