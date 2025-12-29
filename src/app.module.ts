import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { UsersModule } from './users/users.module'
import { OrganizationsModule } from './organizations/organizations.module'
import { TemplatesModule } from './templates/templates.module'
import { MaturityFrameworksModule } from './maturity-frameworks/maturity-frameworks.module'
import { AuditsModule } from './audits/audits.module'
import { ReportsModule } from './reports/reports.module'
import databaseConfig from './config/database.config'
import redisConfig from './config/redis.config'
import googleConfig from './config/google.config'
import { LoggerModule } from '@shared'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, googleConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get('database')!,
      inject: [ConfigService],
    }),
    UsersModule,
    OrganizationsModule,
    TemplatesModule,
    MaturityFrameworksModule,
    AuditsModule,
    ReportsModule,
    LoggerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
