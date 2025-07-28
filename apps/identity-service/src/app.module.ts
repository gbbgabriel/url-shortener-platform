import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/prisma';
import { ObservabilityModule } from '@app/observability';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthController } from './health/health.controller';
import { MetricsController } from './metrics/metrics.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ObservabilityModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [],
})
export class AppModule {}
