# Decoradores de Subida de Archivos

Decoradores personalizados que estandarizan y simplifican la subida de archivos en tu aplicación.

## 🎯 Objetivo

Reemplazar código repetitivo como este:

```typescript
// ❌ ANTES: Código repetitivo y verboso
@Post(':id/avatar')
@UseInterceptors(FileInterceptor('avatar'))
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      avatar: { type: 'string', format: 'binary' }
    }
  }
})
async uploadAvatar(
  @Param('id') id: string,
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }),
        new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
      ],
      fileIsRequired: true,
    }),
  )
  file: Express.Multer.File,
) {
  // ...
}
```

Por código declarativo y simple:

```typescript
// ✅ DESPUÉS: Limpio y declarativo
@Post(':id/avatar')
@UploadAvatar()
async uploadAvatar(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
) {
  // ...
}
```

---

## 📋 Decoradores Disponibles

### 1. @UploadAvatar()

**Uso:** Avatares de usuarios

**Configuración predeterminada:**

- Campo: `avatar`
- Archivos: 1
- Formatos: JPG, PNG, WebP
- Tamaño máximo: 2MB

```typescript
@Post(':id/avatar')
@UploadAvatar()
async uploadAvatar(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
) {
  const command = new UploadAvatarCommand(id, file)
  return await this.handler.execute(command)
}
```

**Opciones personalizables:**

```typescript
@UploadAvatar({
  maxSize: 5 * 1024 * 1024, // 5MB
  required: false,
  description: 'Avatar del usuario (opcional)',
})
```

---

### 2. @UploadLogo()

**Uso:** Logos de organizaciones/empresas

**Configuración predeterminada:**

- Campo: `logo`
- Archivos: 1
- Formatos: JPG, PNG, WebP, SVG
- Tamaño máximo: 5MB

```typescript
@Post(':id/logo')
@UploadLogo()
async uploadLogo(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
) {
  const command = new UploadLogoCommand(id, file)
  return await this.handler.execute(command)
}
```

---

### 3. @UploadImage()

**Uso:** Imágenes en general (galerías, productos, etc.)

**Configuración predeterminada:**

- Campo: `image`
- Archivos: 1 (configurable)
- Formatos: JPG, PNG, WebP, GIF
- Tamaño máximo: 5MB

**Una imagen:**

```typescript
@Post('products/:id/image')
@UploadImage({ fieldName: 'product_image' })
async uploadProductImage(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
) {
  // ...
}
```

**Múltiples imágenes (galería):**

```typescript
@Post('products/:id/gallery')
@UploadImage({
  fieldName: 'images',
  maxFiles: 10,
  maxSize: 3 * 1024 * 1024, // 3MB por imagen
})
async uploadGallery(
  @Param('id') id: string,
  @UploadedFiles() files: Express.Multer.File[], // ⚠️ Nota: UploadedFiles (plural)
) {
  const command = new UploadGalleryCommand(id, files)
  return await this.handler.execute(command)
}
```

---

### 4. @UploadDocument()

**Uso:** Documentos de texto (DOC, DOCX, TXT)

**Configuración predeterminada:**

- Campo: `document`
- Archivos: 1 (configurable)
- Formatos: DOC, DOCX, TXT
- Tamaño máximo: 10MB

**Un documento:**

```typescript
@Post('audits/:id/report')
@UploadDocument({ fieldName: 'report' })
async uploadReport(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
) {
  // ...
}
```

**Múltiples documentos:**

```typescript
@Post('audits/:id/attachments')
@UploadDocument({
  fieldName: 'attachments',
  maxFiles: 5,
  description: 'Documentos adjuntos de la auditoría',
})
async uploadAttachments(
  @Param('id') id: string,
  @UploadedFiles() files: Express.Multer.File[],
) {
  // ...
}
```

---

### 5. @UploadPdf()

**Uso:** Archivos PDF (reportes, certificados, etc.)

**Configuración predeterminada:**

- Campo: `pdf`
- Archivos: 1 (configurable)
- Formatos: PDF
- Tamaño máximo: 20MB

```typescript
@Post('reports/:id/pdf')
@UploadPdf({
  fieldName: 'report',
  maxSize: 50 * 1024 * 1024, // 50MB para reportes grandes
})
async uploadPdfReport(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
) {
  // ...
}
```

**Múltiples PDFs:**

```typescript
@Post('compliance/documents')
@UploadPdf({
  fieldName: 'compliance_docs',
  maxFiles: 20,
  description: 'Documentos de cumplimiento normativo',
})
async uploadComplianceDocs(
  @UploadedFiles() files: Express.Multer.File[],
) {
  // ...
}
```

---

### 6. @UploadSpreadsheet()

**Uso:** Hojas de cálculo (XLS, XLSX, CSV)

**Configuración predeterminada:**

- Campo: `spreadsheet`
- Archivos: 1 (configurable)
- Formatos: XLS, XLSX, CSV
- Tamaño máximo: 15MB

```typescript
@Post('data/import')
@UploadSpreadsheet({
  fieldName: 'data_file',
  description: 'Archivo de datos para importar',
})
async importData(
  @UploadedFile() file: Express.Multer.File,
) {
  const command = new ImportDataCommand(file)
  return await this.handler.execute(command)
}
```

---

## ⚙️ Opciones Disponibles

Todos los decoradores aceptan las mismas opciones (excepto los específicos como `@UploadAvatar` que tienen valores fijos):

```typescript
interface UploadFileDecoratorOptions {
  /**
   * Nombre del campo en el formulario
   * Default: depende del decorador
   */
  fieldName?: string

  /**
   * Cantidad máxima de archivos
   * Default: 1
   * Si > 1, debes usar @UploadedFiles() (plural)
   */
  maxFiles?: number

  /**
   * Tamaño máximo por archivo en bytes
   * Default: depende del tipo
   */
  maxSize?: number

  /**
   * Si el archivo es requerido
   * Default: true
   */
  required?: boolean

  /**
   * Descripción para Swagger
   * Default: auto-generada
   */
  description?: string
}
```

---

## 📖 Ejemplos Completos

### Ejemplo 1: Avatar de Usuario

```typescript
// users.controller.ts

@Post(':id/avatar')
@HttpCode(HttpStatus.OK)
@UploadAvatar() // ✅ Todo configurado automáticamente
@ApiOperation({ summary: 'Subir avatar de usuario' })
@ApiResponse({ status: 200, description: 'Avatar subido exitosamente' })
@ApiResponse({ status: 400, description: 'Archivo inválido' })
async uploadAvatar(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
) {
  const command = new UploadAvatarCommand(id, file)
  const user = await this.uploadAvatarHandler.execute(command)
  return this.userFactory.toResponse(user)
}
```

**Request desde el cliente:**

```bash
curl -X POST http://localhost:3000/users/123/avatar \
  -F "avatar=@/path/to/avatar.jpg" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Ejemplo 2: Galería de Imágenes (Múltiples)

```typescript
// products.controller.ts

@Post(':id/gallery')
@UploadImage({
  fieldName: 'images',
  maxFiles: 10, // Máximo 10 imágenes
  maxSize: 3 * 1024 * 1024, // 3MB cada una
  description: 'Galería de imágenes del producto',
})
@ApiOperation({ summary: 'Subir imágenes a la galería del producto' })
async uploadGallery(
  @Param('id') id: string,
  @UploadedFiles() files: Express.Multer.File[], // ⚠️ Plural!
) {
  const command = new UploadGalleryCommand(id, files)
  const product = await this.uploadGalleryHandler.execute(command)
  return this.productFactory.toResponse(product)
}
```

**Handler:**

```typescript
@Injectable()
export class UploadGalleryHandler {
  constructor(
    private readonly productsRepository: IProductsRepository,
    private readonly filesService: FilesService,
  ) {}

  async execute(command: UploadGalleryCommand): Promise<ProductEntity> {
    const product = await this.productsRepository.findById(command.productId)

    // Subir múltiples imágenes
    const uploadPromises = command.files.map((file, index) =>
      this.filesService.uploadFile({
        file,
        folder: `products/${product.id}/gallery`,
        validationOptions: FILE_UPLOAD_CONFIGS.USER_AVATAR,
        customFileName: `image-${index}`,
      }),
    )

    const results = await Promise.all(uploadPromises)

    product.galleryImages = results.map((r) => r.filePath)
    await this.productsRepository.save(product)

    return product
  }
}
```

---

### Ejemplo 3: Documentos de Auditoría

```typescript
// audits.controller.ts

@Post(':id/documents')
@UploadDocument({
  fieldName: 'documents',
  maxFiles: 5,
  maxSize: 10 * 1024 * 1024,
  description: 'Documentos de respaldo de la auditoría',
})
async uploadAuditDocuments(
  @Param('id') id: string,
  @UploadedFiles() files: Express.Multer.File[],
) {
  const command = new UploadAuditDocumentsCommand(id, files)
  return await this.handler.execute(command)
}
```

---

### Ejemplo 4: Reporte PDF con Custom Validación

```typescript
// reports.controller.ts

@Post(':id/upload')
@UploadPdf({
  fieldName: 'report',
  maxSize: 50 * 1024 * 1024, // 50MB para reportes grandes
  description: 'Reporte de auditoría en formato PDF',
})
async uploadReport(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
) {
  // El decorador ya valida que sea PDF y tamaño
  // Aquí puedes agregar validaciones adicionales en el handler

  const command = new UploadReportCommand(id, file)
  return await this.handler.execute(command)
}
```

**Handler con validaciones adicionales:**

```typescript
@Injectable()
export class UploadReportHandler {
  async execute(command: UploadReportCommand) {
    const report = await this.reportsRepository.findById(command.reportId)

    // ✅ Validación adicional: Solo se puede subir si el reporte está en draft
    if (report.status !== ReportStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden subir archivos a reportes en estado borrador',
      )
    }

    // Subir y reemplazar archivo anterior
    const result = await this.filesService.replaceFile(report.filePath, {
      file: command.file,
      folder: `reports/${new Date().getFullYear()}/${report.id}`,
      validationOptions: FILE_UPLOAD_CONFIGS.PDF,
      customFileName: `report-${Date.now()}`,
    })

    report.filePath = result.filePath
    report.status = ReportStatus.PENDING_REVIEW
    await this.reportsRepository.save(report)

    return report
  }
}
```

---

## 🔧 Validaciones

### Validaciones Automáticas del Decorador

Los decoradores configuran automáticamente:

1. **Multer FileInterceptor/FilesInterceptor**
   - Maneja la subida con memoryStorage
   - Configura el nombre del campo
   - Configura cantidad de archivos

2. **Swagger Documentation**
   - `@ApiConsumes('multipart/form-data')`
   - `@ApiBody` con schema del archivo
   - Descripción de formatos y tamaños permitidos

### Validaciones Adicionales en el Handler

Las validaciones de formato, tamaño, dimensiones se hacen en el **Handler** usando `FilesService`:

```typescript
// Handler
const result = await this.filesService.uploadFile({
  file: command.file,
  folder: 'avatars/users',
  validationOptions: FILE_UPLOAD_CONFIGS.USER_AVATAR, // ✅ Aquí se valida
})
```

`FILE_UPLOAD_CONFIGS.USER_AVATAR` valida:

- MIME type (image/jpeg, image/png, image/webp)
- Extensión (.jpg, .png, .webp)
- Tamaño (max 2MB)
- Dimensiones (min 100x100, max 2000x2000)

---

## 🎨 Swagger Documentation

Los decoradores generan automáticamente documentación de Swagger:

**Ejemplo generado:**

```yaml
/users/{id}/avatar:
  post:
    summary: Subir avatar de usuario
    consumes:
      - multipart/form-data
    requestBody:
      required: true
      content:
        multipart/form-data:
          schema:
            type: object
            properties:
              avatar:
                type: string
                format: binary
                description: 'Archivo (.jpg, .jpeg, .png, .webp). Tamaño máximo: 2.0MB'
            required:
              - avatar
```

---

## 📦 Estructura Creada

```
src/@core/files/decorators/
├── upload-file.decorator.ts        # Helper base
├── upload-image.decorator.ts       # @UploadImage, @UploadAvatar, @UploadLogo
├── upload-document.decorator.ts    # @UploadDocument
├── upload-pdf.decorator.ts         # @UploadPdf
├── upload-spreadsheet.decorator.ts # @UploadSpreadsheet
└── index.ts
```

---

## ✅ Ventajas

1. **Código más limpio:**
   - De 25 líneas → 1 línea

2. **Estandarización:**
   - Mismos nombres de campos en toda la app
   - Mismos tamaños y validaciones

3. **Mantenible:**
   - Cambiar configuración en un solo lugar
   - Fácil agregar nuevos tipos

4. **Swagger automático:**
   - Documentación generada sin código extra

5. **Type-safe:**
   - TypeScript te ayuda con autocompletado

6. **Reutilizable:**
   - Usa el mismo decorador en múltiples endpoints

---

## 🚀 Próximos Pasos

1. ✅ **Decoradores básicos** - Implementados
2. ⏳ **Usar en todos los módulos** (Organizations, Audits, etc.)
3. ⏳ **Agregar decoradores para Videos/Audio** si se necesitan
4. ⏳ **Custom validator decorators** para casos muy específicos

---

## 💡 Tips

### Tip 1: Un archivo vs Múltiples

```typescript
// Un archivo
@UploadImage()
async upload(@UploadedFile() file: Express.Multer.File) {}

// Múltiples archivos
@UploadImage({ maxFiles: 10 })
async upload(@UploadedFiles() files: Express.Multer.File[]) {} // ⚠️ Plural!
```

### Tip 2: Campo opcional

```typescript
@UploadAvatar({ required: false })
async upload(@UploadedFile() file?: Express.Multer.File) {
  if (!file) {
    // No se subió archivo
  }
}
```

### Tip 3: Custom validations

Las validaciones automáticas del decorador son básicas (MIME type).
Para validaciones complejas (dimensiones, contenido), usa el `FilesService` en el handler.

---

**¡Decoradores listos para usar en toda tu aplicación!** 🎉
