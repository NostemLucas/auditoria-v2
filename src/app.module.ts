import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { UsersModule } from '@users'
import { OrganizationsModule } from '@organizations'
import { TemplatesModule } from '@templates'
import { MaturityFrameworksModule } from '@frameworks'
import { AuditsModule } from '@audits'
import { ReportsModule } from '@reports'
import databaseConfig from '@core/config/database.config'
import googleConfig from '@core/config/google.config'
import { LoggerModule, CoreModule } from '@core'
import { FilesModule } from '@core/files'
import { AuthModule } from '@auth'
import { AuthorizationModule } from '@authorization'
import { APP_GUARD } from '@nestjs/core'
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, googleConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get('database')!,
      inject: [ConfigService],
    }),
    CoreModule,
    LoggerModule,
    FilesModule,
    AuthorizationModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    TemplatesModule,
    MaturityFrameworksModule,
    AuditsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Guard global para proteger todas las rutas por defecto
    },
  ],
})
export class AppModule {}
