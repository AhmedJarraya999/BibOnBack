import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed'),
}));
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const mockUser = {
  id: 'user-1',
  name: 'Ahmed',
  email: 'ahmed@test.com',
  password: 'hashed',
  role: 'ORGANIZER',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  refreshToken: {
    create: jest.fn().mockResolvedValue({}),
    findUnique: jest.fn(),
    delete: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({}),
  },
};

const mockUsersService = {
  create: jest.fn().mockResolvedValue(mockUser),
  findByEmail: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed-token'),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'jwt.refreshExpiresIn': '30d',
    };
    return map[key];
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      mockUsersService as unknown as UsersService,
      mockJwtService as unknown as JwtService,
      mockConfigService as unknown as ConfigService,
      mockPrisma as unknown as PrismaService,
    );
  });

  describe('register', () => {
    it('creates a user and returns tokens', async () => {
      const result = await service.register({
        name: 'Ahmed',
        email: 'ahmed@test.com',
        password: 'Password123!',
      });

      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ahmed@test.com' }),
      );
      expect(result).toHaveProperty('access_token', 'signed-token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('user');
    });
  });

  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'ahmed@test.com',
        password: 'Password123!',
      });

      expect(result).toHaveProperty('access_token', 'signed-token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@test.com', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'ahmed@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('issues new tokens on valid refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 86400000),
        user: mockUser,
      });

      const result = await service.refresh('valid-token');

      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('throws UnauthorizedException when refresh token not found', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when refresh token is expired', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 1000),
        user: mockUser,
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('deletes the refresh token', async () => {
      await service.logout('some-token');
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'some-token' },
      });
    });
  });
});
