import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { LoggerService } from '@shared'
import { useContainer } from 'class-validator'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  })

  // Habilitar inyección de dependencias en validadores personalizados
  useContainer(app.select(AppModule), { fallbackOnErrors: true })

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
      'API de auditorías, plantillas, frameworks de madurez y gestión de usuarios',
    )
    .setVersion('1.0')
    .addTag('users', 'Gestión de usuarios')
    .addTag('notifications', 'Sistema de notificaciones')
    .addTag('templates', 'Gestión de plantillas (ISO 27001, ISO 9001, etc.)')
    .addTag('standards', 'Gestión de normas con estructura jerárquica')
    .addTag(
      'frameworks',
      'Frameworks de madurez/ponderación (COBIT 5, CMMI, etc.)',
    )
    .addTag('maturity-levels', 'Niveles de madurez con textos predefinidos')
    .addTag(
      'audits',
      'Gestión de auditorías (inicial, seguimiento, recertificación)',
    )
    .addTag('evaluations', 'Evaluación de normas con niveles de madurez')
    .addTag('action-plans', 'Planes de acción para remediar no conformidades')
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
