import { Module, Global } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MulterModule } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { FilesService } from './files.service'
import { FileValidator } from './validators/file.validator'
import { LocalStorageService } from './services/local-storage.service'

/**
 * Módulo de archivos
 * Proporciona servicios para subir, validar y almacenar archivos
 *
 * Es Global para que esté disponible en todos los módulos sin necesidad de importar
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    // Configurar Multer con memoryStorage
    // Los archivos se guardan en memoria (buffer), no en disco
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB límite global (se valida específicamente después)
      },
    }),
  ],
  providers: [
    FilesService,
    FileValidator,
    {
      provide: 'STORAGE_SERVICE',
      useClass: LocalStorageService, // ← Fácil de cambiar a S3StorageService después
    },
  ],
  exports: [FilesService, FileValidator, MulterModule],
})
export class FilesModule {}
