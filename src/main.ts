import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { LoggerService } from '@shared'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  })

  // Obtener instancia del LoggerService
  const logger = app.get(LoggerService)

  // Usar nuestro logger custom
  app.useLogger(logger)

  // Habilitar validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle('ATR API')
    .setDescription(
      'API de notificaciones, gestión de usuarios y plantillas de auditoría',
    )
    .setVersion('1.0')
    .addTag('users', 'Gestión de usuarios')
    .addTag('notifications', 'Sistema de notificaciones')
    .addTag('templates', 'Gestión de plantillas (ISO 27001, ISO 9001, etc.)')
    .addTag('standards', 'Gestión de normas con estructura jerárquica')
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, document)

  await app.listen(process.env.PORT ?? 3000)
  logger.log(
    `🚀 Application is running on: http://localhost:${process.env.PORT ?? 3000}`,
  )
  logger.log(
    `📚 Swagger documentation available at: http://localhost:${process.env.PORT ?? 3000}/api`,
  )
}
void bootstrap()
