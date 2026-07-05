import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { VolunteerPermissionsGuard } from './common/guards/volunteer-permissions.guard';
import * as Joi from 'joi';

import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import jwtConfig from './config/jwt.config';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { DashboardModule } from './dashboard/dashboard.module';
import { MailModule } from './mail/mail.module';
import { DistributionsModule } from './distributions/distributions.module';
import { PaymentsModule } from './payments/payments.module';
import { EventsModule } from './events/events.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ParticipantsModule } from './participants/participants.module';
import { PrismaModule } from './prisma/prisma.module';
import { RacesModule } from './races/races.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { ResultsModule } from './results/results.module';
import { UsersModule } from './users/users.module';
import { VolunteersModule } from './volunteers/volunteers.module';
import { CheckpointsModule } from './checkpoints/checkpoints.module';
import { ReclamationsModule } from './reclamations/reclamations.module';
import { MedicalModule } from './medical/medical.module';
import { GamesModule } from './games/games.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig],
      envFilePath: '.env',
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_SECRET: Joi.string().min(16).required(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
        SMTP_HOST: Joi.string().required(),
        SMTP_PORT: Joi.number().default(587),
        SMTP_USER: Joi.string().required(),
        SMTP_PASS: Joi.string().required(),
        SMTP_FROM: Joi.string().default('"Race Platform" <no-reply@race-platform.com>'),
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        CORS_ORIGINS: Joi.string().default('http://localhost:3000,http://localhost:3001'),
      }),
      validationOptions: { abortEarly: false },
    }),
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60000, limit: 60 },   // 60 requests per minute (general)
      { name: 'auth', ttl: 60000, limit: 10 },      // 10 requests per minute (auth endpoints)
    ]),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    EventsModule,
    RacesModule,
    ParticipantsModule,
    RegistrationsModule,
    UsersModule,
    VolunteersModule,
    CheckpointsModule,
    ReclamationsModule,
    MedicalModule,
    GamesModule,
    ResultsModule,
    DashboardModule,
    DistributionsModule,
    PaymentsModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: VolunteerPermissionsGuard },
  ],
})
export class AppModule {}
