# Guía de Subida de Archivos

Sistema flexible y escalable para manejo de archivos con validaciones, almacenamiento dinámico y arquitectura limpia.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Ejemplo: Avatar de Usuario](#ejemplo-avatar-de-usuario)
- [Configuraciones Predefinidas](#configuraciones-predefinidas)
- [Crear Nuevo Tipo de Upload](#crear-nuevo-tipo-de-upload)
- [Cambiar Implementación de Storage](#cambiar-implementación-de-storage)
- [Testing](#testing)

---

## Características

- ✅ **Multer con memoryStorage** - No guarda automáticamente, tienes control total
- ✅ **Validaciones completas** - Tipo MIME, extensión, tamaño, dimensiones de imagen
- ✅ **Redimensionamiento automático** - Para imágenes que exceden dimensiones máximas
- ✅ **Carpetas dinámicas** - Por usuario, organización, fecha, etc.
- ✅ **Arquitectura limpia** - Fácil cambiar de local storage a S3, Cloudinary, etc.
- ✅ **Reemplazo automático** - Elimina archivo anterior al subir uno nuevo
- ✅ **URLs públicas** - Generación automática de URLs para acceso HTTP

---

## Arquitectura

```
┌─────────────┐
│ Controller  │  (Recibe archivo de Multer)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Handler   │  (Use Case - Lógica de negocio)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│FilesService │  (Orquestador)
└──────┬──────┘
       │
       ├─────────────────────┬───────────────────┐
       ▼                     ▼                   ▼
┌──────────────┐   ┌─────────────────┐   ┌────────────────┐
│FileValidator │   │ LocalStorage    │   │ S3Storage      │
│              │   │ (implementación)│   │ (futuro)       │
└──────────────┘   └─────────────────┘   └────────────────┘
```

### Componentes Principales

1. **FilesService**: Orquesta validación y almacenamiento
2. **FileValidator**: Valida archivos según configuración
3. **LocalStorageService**: Implementación de almacenamiento local (IStorageService)
4. **IStorageService**: Interface - permite cambiar implementación sin afectar el resto

---

## Ejemplo: Avatar de Usuario

### Endpoint Implementado

```http
POST /users/:id/avatar
Content-Type: multipart/form-data

avatar: [archivo]
```

### Código del Controller

```typescript
@Post(':id/avatar')
@UseInterceptors(FileInterceptor('avatar')) // 'avatar' es el nombre del campo
@ApiConsumes('multipart/form-data')
async uploadAvatar(
  @Param('id') id: string,
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
        new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
      ],
      fileIsRequired: true,
    }),
  )
  file: Express.Multer.File,
) {
  const command = new UploadAvatarCommand(id, file)
  const user = await this.uploadAvatarHandler.execute(command)
  return this.userFactory.toResponse(user)
}
```

### Código del Handler

```typescript
@Injectable()
export class UploadAvatarHandler {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly filesService: FilesService,
  ) {}

  async execute(command: UploadAvatarCommand): Promise<UserEntity> {
    // 1. Buscar usuario
    const user = await this.usersRepository.findById(command.userId)

    // 2. Subir archivo (reemplazando el anterior)
    const uploadResult = await this.filesService.replaceFile(
      user.image, // Avatar anterior (null si no tiene)
      {
        file: command.file,
        folder: `avatars/users/${user.id}`, // ✅ Carpeta dinámica
        validationOptions: FILE_UPLOAD_CONFIGS.USER_AVATAR, // ✅ Validaciones predefinidas
        customFileName: 'avatar', // ✅ Nombre fijo
        overwrite: true,
      },
    )

    // 3. Actualizar usuario
    user.image = uploadResult.filePath
    await this.usersRepository.save(user)

    return user
  }
}
```

### Resultado

```json
{
  "id": "123",
  "name": "John Doe",
  "email": "john@example.com",
  "image": "avatars/users/123/avatar.jpg",
  "imageUrl": "http://localhost:3000/uploads/avatars/users/123/avatar.jpg"
}
```

**Estructura de archivos:**

```
uploads/
└── avatars/
    └── users/
        └── 123/
            └── avatar.jpg  (se sobrescribe cada vez)
```

---

## Configuraciones Predefinidas

Ubicadas en `src/@core/files/dtos/file-upload-options.dto.ts`:

### USER_AVATAR

```typescript
{
  fileType: FileType.IMAGE,
  maxSize: 2 * 1024 * 1024, // 2MB
  minWidth: 100,
  minHeight: 100,
  maxWidth: 2000,
  maxHeight: 2000,
}
```

**Formatos permitidos:** JPG, PNG, WebP
**Uso:** Avatares de usuarios

### ORGANIZATION_LOGO

```typescript
{
  fileType: FileType.IMAGE,
  maxSize: 5 * 1024 * 1024, // 5MB
  minWidth: 200,
  minHeight: 200,
  maxWidth: 3000,
  maxHeight: 3000,
}
```

**Formatos permitidos:** JPG, PNG, WebP, SVG
**Uso:** Logos de organizaciones

### DOCUMENT

```typescript
{
  fileType: FileType.DOCUMENT,
  maxSize: 10 * 1024 * 1024, // 10MB
}
```

**Formatos permitidos:** PDF, DOC, DOCX, TXT
**Uso:** Documentos generales

### PDF

```typescript
{
  fileType: FileType.PDF,
  maxSize: 20 * 1024 * 1024, // 20MB
}
```

**Formatos permitidos:** PDF
**Uso:** Reportes, auditorías, etc.

### SPREADSHEET

```typescript
{
  fileType: FileType.SPREADSHEET,
  maxSize: 15 * 1024 * 1024, // 15MB
}
```

**Formatos permitidos:** XLS, XLSX, CSV
**Uso:** Hojas de cálculo

---

## Crear Nuevo Tipo de Upload

### 1. Definir Configuración (opcional)

```typescript
// src/@core/files/dtos/file-upload-options.dto.ts

export const FILE_UPLOAD_CONFIGS = {
  // ... configs existentes

  REPORT_PDF: {
    fileType: FileType.PDF,
    maxSize: 50 * 1024 * 1024, // 50MB para reportes grandes
  } as FileUploadOptions,
}
```

### 2. Crear Command

```typescript
// src/modules/reports/use-cases/commands/upload-report/upload-report.command.ts

export class UploadReportCommand {
  constructor(
    public readonly reportId: string,
    public readonly file: Express.Multer.File,
  ) {}
}
```

### 3. Crear Handler

```typescript
// src/modules/reports/use-cases/commands/upload-report/upload-report.handler.ts

@Injectable()
export class UploadReportHandler {
  constructor(
    private readonly reportsRepository: IReportsRepository,
    private readonly filesService: FilesService,
  ) {}

  async execute(command: UploadReportCommand): Promise<ReportEntity> {
    const report = await this.reportsRepository.findById(command.reportId)

    const uploadResult = await this.filesService.replaceFile(report.filePath, {
      file: command.file,
      folder: `reports/${new Date().getFullYear()}/${report.id}`,
      validationOptions: FILE_UPLOAD_CONFIGS.REPORT_PDF,
      customFileName: `report-${Date.now()}`,
    })

    report.filePath = uploadResult.filePath
    await this.reportsRepository.save(report)

    return report
  }
}
```

### 4. Crear Endpoint

```typescript
@Post(':id/upload')
@UseInterceptors(FileInterceptor('report'))
@ApiConsumes('multipart/form-data')
async uploadReport(
  @Param('id') id: string,
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
        new FileTypeValidator({ fileType: /pdf$/ }),
      ],
      fileIsRequired: true,
    }),
  )
  file: Express.Multer.File,
) {
  const command = new UploadReportCommand(id, file)
  return await this.uploadReportHandler.execute(command)
}
```

---

## Cambiar Implementación de Storage

Para cambiar de almacenamiento local a S3, Cloudinary, etc.:

### 1. Crear Nueva Implementación

```typescript
// src/@core/files/services/s3-storage.service.ts

import { Injectable } from '@nestjs/common'
import { S3 } from 'aws-sdk'
import type { IStorageService } from '../interfaces/storage.interface'
import {
  SaveFileOptions,
  SaveFileResult,
  DeleteFileOptions,
} from '../interfaces/storage.interface'

@Injectable()
export class S3StorageService implements IStorageService {
  private s3: S3

  constructor(private configService: ConfigService) {
    this.s3 = new S3({
      accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
      region: configService.get('AWS_REGION'),
    })
  }

  async saveFile(options: SaveFileOptions): Promise<SaveFileResult> {
    const key = `${options.folder}/${options.customFileName || uuidv4()}${this.getExtension(options.originalName)}`

    await this.s3
      .upload({
        Bucket: this.configService.get('AWS_S3_BUCKET')!,
        Key: key,
        Body: options.buffer,
        ContentType: options.mimeType,
      })
      .promise()

    return {
      fileName: path.basename(key),
      filePath: key,
      url: this.getFileUrl(key),
      size: options.buffer.length,
      mimeType: options.mimeType,
    }
  }

  async deleteFile(options: DeleteFileOptions): Promise<void> {
    await this.s3
      .deleteObject({
        Bucket: this.configService.get('AWS_S3_BUCKET')!,
        Key: options.filePath,
      })
      .promise()
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await this.s3
        .headObject({
          Bucket: this.configService.get('AWS_S3_BUCKET')!,
          Key: filePath,
        })
        .promise()
      return true
    } catch {
      return false
    }
  }

  getFileUrl(filePath: string): string {
    const bucket = this.configService.get('AWS_S3_BUCKET')
    const region = this.configService.get('AWS_REGION')
    return `https://${bucket}.s3.${region}.amazonaws.com/${filePath}`
  }

  private getExtension(filename: string): string {
    const parts = filename.split('.')
    return parts.length > 1 ? `.${parts.pop()}` : ''
  }
}
```

### 2. Cambiar Provider en FilesModule

```typescript
// src/@core/files/files.module.ts

@Global()
@Module({
  // ...
  providers: [
    FilesService,
    FileValidator,
    {
      provide: 'STORAGE_SERVICE',
      useClass: S3StorageService, // ✅ Cambiar aquí (antes: LocalStorageService)
    },
  ],
  // ...
})
export class FilesModule {}
```

### 3. Configurar Variables de Entorno

```env
# .env

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

**¡Listo!** El resto del código sigue funcionando sin cambios.

---

## Testing

### Ejemplo de Test para Handler

```typescript
describe('UploadAvatarHandler', () => {
  let handler: UploadAvatarHandler
  let repository: jest.Mocked<IUsersRepository>
  let filesService: jest.Mocked<FilesService>

  beforeEach(() => {
    repository = createMockUsersRepository()
    filesService = {
      replaceFile: jest.fn(),
    } as any

    handler = new UploadAvatarHandler(repository, filesService)
  })

  it('should upload avatar successfully', async () => {
    const user = createMockUser({ id: '123', image: null })
    const file: Express.Multer.File = {
      buffer: Buffer.from('fake-image'),
      originalname: 'avatar.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
    } as any

    repository.findById.mockResolvedValue(user)
    filesService.replaceFile.mockResolvedValue({
      fileName: 'avatar.jpg',
      filePath: 'avatars/users/123/avatar.jpg',
      url: 'http://localhost:3000/uploads/avatars/users/123/avatar.jpg',
      size: 1024,
      mimeType: 'image/jpeg',
    })

    const command = new UploadAvatarCommand('123', file)
    const result = await handler.execute(command)

    expect(result.image).toBe('avatars/users/123/avatar.jpg')
    expect(filesService.replaceFile).toHaveBeenCalledWith(null, {
      file,
      folder: 'avatars/users/123',
      validationOptions: FILE_UPLOAD_CONFIGS.USER_AVATAR,
      customFileName: 'avatar',
      overwrite: true,
    })
  })
})
```

---

## Variables de Entorno

Agrega a tu `.env`:

```env
# File Uploads
APP_URL=http://localhost:3000
UPLOADS_DIR=./uploads
```

---

## Estructura de Archivos Creada

```
src/
├── @core/
│   └── files/
│       ├── enums/
│       │   ├── file-type.enum.ts        (Tipos de archivos soportados)
│       │   └── index.ts
│       ├── interfaces/
│       │   ├── storage.interface.ts     (IStorageService interface)
│       │   └── index.ts
│       ├── dtos/
│       │   ├── file-upload-options.dto.ts (Configs predefinidas)
│       │   └── index.ts
│       ├── validators/
│       │   ├── file.validator.ts        (Validaciones + redimensionamiento)
│       │   └── index.ts
│       ├── services/
│       │   ├── local-storage.service.ts (Implementación local)
│       │   └── index.ts
│       ├── files.service.ts             (Servicio principal)
│       ├── files.module.ts              (Módulo global)
│       └── index.ts
└── modules/
    └── users/
        └── use-cases/
            └── commands/
                └── upload-avatar/       (Ejemplo de implementación)
                    ├── upload-avatar.command.ts
                    ├── upload-avatar.handler.ts
                    └── index.ts

uploads/                                 (Generado automáticamente)
└── avatars/
    └── users/
        └── {userId}/
            └── avatar.{ext}
```

---

## Ventajas de Esta Arquitectura

1. **Separación de Responsabilidades**
   - Controller: Solo recibe HTTP
   - Handler: Lógica de negocio
   - FilesService: Orquesta validación y storage
   - Validator: Validaciones puras
   - Storage: Implementación concreta

2. **Testeable**
   - Cada componente se puede testear aisladamente
   - Mocks fáciles de crear

3. **Escalable**
   - Cambiar de local a S3: 1 línea de código
   - Agregar nuevos tipos de upload: Crear handler

4. **Validaciones Centralizadas**
   - Configs reutilizables (USER_AVATAR, DOCUMENT, etc.)
   - No duplicar lógica de validación

5. **Carpetas Dinámicas**
   - Por usuario, organización, fecha, etc.
   - Control total del path

---

## Próximos Pasos

1. ✅ **Avatar de usuario** - Implementado
2. ⏳ **Logo de organización** - Mismo patrón
3. ⏳ **Documentos de auditoría** - PDFs, Excel, etc.
4. ⏳ **Implementar S3StorageService** - Para producción
5. ⏳ **Agregar resize/compress images** - Optimizar tamaño
6. ⏳ **Agregar virus scanning** - ClamAV integration

---

**¡Sistema de archivos listo para usar y fácil de extender!** 🚀
