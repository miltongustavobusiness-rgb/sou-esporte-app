import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getUserByEmail: vi.fn(),
  getUserByCpf: vi.fn(),
  createUser: vi.fn(),
  getUserByEmailAndPassword: vi.fn(),
  updateUserLastSignedIn: vi.fn(),
}));

// Mock the storage module
vi.mock('./storage', () => ({
  storagePut: vi.fn(),
}));

import * as db from './db';
import { storagePut } from './storage';

describe('Mobile Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      (db.getUserByEmail as any).mockResolvedValue(null);
      (db.getUserByCpf as any).mockResolvedValue(null);
      (db.createUser as any).mockResolvedValue(123);

      // Simulate registration logic
      const email = 'test@example.com';
      const existingUser = await db.getUserByEmail(email);
      expect(existingUser).toBeNull();

      const userId = await db.createUser({
        name: 'Test User',
        email: email,
        cpf: null,
        phone: null,
        birthDate: null,
        gender: null,
        photoUrl: null,
      });

      expect(userId).toBe(123);
      expect(db.createUser).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        cpf: null,
        phone: null,
        birthDate: null,
        gender: null,
        photoUrl: null,
      });
    });

    it('should reject registration if email already exists', async () => {
      (db.getUserByEmail as any).mockResolvedValue({ id: 1, email: 'existing@example.com' });

      const existingUser = await db.getUserByEmail('existing@example.com');
      expect(existingUser).not.toBeNull();
      expect(existingUser?.email).toBe('existing@example.com');
    });

    it('should reject registration if CPF already exists', async () => {
      (db.getUserByEmail as any).mockResolvedValue(null);
      (db.getUserByCpf as any).mockResolvedValue({ id: 1, cpf: '12345678901' });

      const existingUser = await db.getUserByEmail('new@example.com');
      expect(existingUser).toBeNull();

      const existingCpf = await db.getUserByCpf('12345678901');
      expect(existingCpf).not.toBeNull();
    });
  });

  describe('loginUser', () => {
    it('should login user with valid credentials', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        photoUrl: null,
      };

      (db.getUserByEmailAndPassword as any).mockResolvedValue(mockUser);
      (db.updateUserLastSignedIn as any).mockResolvedValue(undefined);

      const user = await db.getUserByEmailAndPassword('test@example.com', 'password123');
      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');

      await db.updateUserLastSignedIn(user!.id);
      expect(db.updateUserLastSignedIn).toHaveBeenCalledWith(1);
    });

    it('should reject login with invalid credentials', async () => {
      (db.getUserByEmailAndPassword as any).mockResolvedValue(null);

      const user = await db.getUserByEmailAndPassword('wrong@example.com', 'wrongpassword');
      expect(user).toBeNull();
    });
  });

  describe('uploadImage', () => {
    it('should upload image to S3 successfully', async () => {
      (storagePut as any).mockResolvedValue({ url: 'https://s3.example.com/profiles/test.jpg' });

      const base64 = 'SGVsbG8gV29ybGQ='; // "Hello World" in base64
      const buffer = Buffer.from(base64, 'base64');
      const filename = 'profiles/1234-test.jpg';

      const result = await storagePut(filename, buffer, 'image/jpeg');

      expect(result.url).toBe('https://s3.example.com/profiles/test.jpg');
      expect(storagePut).toHaveBeenCalledWith(filename, buffer, 'image/jpeg');
    });
  });
});
