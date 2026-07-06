import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { UserRole } from '../common/enums/user-role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: dto.role ?? UserRole.ORGANIZER,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
      address: dto.address,
      zipCode: dto.zipCode,
      city: dto.city,
      country: dto.country,
      hideFromResults: dto.hideFromResults,
    });
    const tokens = await this.issueTokenPair(user.id, user.email, user.role);
    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const { password: _, ...safeUser } = user;
    const tokens = await this.issueTokenPair(user.id, user.email, user.role);

    let permissions: string[] | undefined;
    if (user.role === UserRole.VOLUNTEER) {
      const volunteers = await this.prisma.volunteer.findMany({ where: { userId: user.id } });
      const allPerms = volunteers.flatMap((v) => v.permissions);
      permissions = [...new Set(allPerms)];
    }

    return { user: { ...safeUser, ...(permissions && { permissions }) }, ...tokens };
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await this.prisma.refreshToken.deleteMany({ where: { id: stored.id } });
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    // rotate: delete old, issue new pair
    await this.prisma.refreshToken.deleteMany({ where: { id: stored.id } });
    const tokens = await this.issueTokenPair(stored.user.id, stored.user.email, stored.user.role);
    return tokens;
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    return { message: 'Logged out successfully' };
  }

  private async issueTokenPair(userId: string, email: string, role: string) {
    const accessToken = this.jwtService.sign({ sub: userId, email, role });

    const rawRefreshToken = randomBytes(40).toString('hex');
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') ?? '30d';
    const expiresAt = new Date(Date.now() + parseDuration(refreshExpiresIn));

    await this.prisma.refreshToken.create({
      data: { token: rawRefreshToken, userId, expiresAt },
    });

    return { access_token: accessToken, refresh_token: rawRefreshToken };
  }
}

function parseDuration(duration: string): number {
  const unit = duration.slice(-1);
  const value = parseInt(duration.slice(0, -1), 10);
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * (multipliers[unit] ?? 86_400_000);
}
