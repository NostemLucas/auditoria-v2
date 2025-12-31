# Módulo de Reportes - Google Docs API

Este módulo permite generar reportes editables en Google Docs a partir de los datos del sistema de auditorías.

## Configuración del Service Account

### 1. Crear un Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Anota el nombre del proyecto

### 2. Habilitar las APIs necesarias

1. En el menú de navegación, ve a **APIs y servicios > Biblioteca**
2. Busca y habilita las siguientes APIs:
   - **Google Docs API**
   - **Google Drive API**

### 3. Crear un Service Account

1. Ve a **APIs y servicios > Credenciales**
2. Haz clic en **Crear credenciales > Cuenta de servicio**
3. Completa los campos:
   - **Nombre**: `audit-reports-service`
   - **Descripción**: `Service account para generar reportes de auditoría`
4. Haz clic en **Crear y continuar**
5. (Opcional) Asigna un rol, por ejemplo `Editor`
6. Haz clic en **Continuar** y luego **Listo**

### 4. Generar la clave JSON

1. En la lista de cuentas de servicio, encuentra la que acabas de crear
2. Haz clic en los tres puntos (⋮) y selecciona **Administrar claves**
3. Haz clic en **Agregar clave > Crear nueva clave**
4. Selecciona **JSON** como tipo de clave
5. Haz clic en **Crear**
6. Se descargará un archivo JSON con las credenciales

### 5. Configurar las Variables de Entorno

El archivo JSON descargado contiene las credenciales. Debes configurarlas en tu aplicación.

**Opción A: Variable de entorno con JSON completo**

Añade en tu archivo `.env`:

```env
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS='{"type":"service_account","project_id":"tu-proyecto","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"audit-reports-service@tu-proyecto.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
```

**Opción B: Ruta al archivo JSON**

Si prefieres usar el archivo directamente, modifica `src/reports/services/google-docs.service.ts`:

```typescript
// En lugar de:
const credentials = this.configService.get<string>('google.credentials')
const parsedCredentials = JSON.parse(credentials)

// Usa:
const keyFile = './path/to/service-account-key.json'
const parsedCredentials = require(keyFile)
```

## Uso del Módulo

### Generar un Reporte de Auditoría

```bash
POST /reports/generate
Content-Type: application/json

{
  "reportType": "audit_report",
  "auditId": "uuid-de-la-auditoria",
  "theme": "default",
  "metadata": {
    "includeEvidence": true
  }
}
```

**Temas disponibles:**

- `default` - Profesional Azul (Google-style)
- `corporate_green` - Corporativo Verde con tipografía Georgia
- `minimal` - Minimalista en blanco y negro

**Respuesta:**

```json
{
  "id": "report-uuid",
  "title": "Reporte de Auditoría",
  "reportType": "audit_report",
  "status": "generating",
  "googleDocId": null,
  "googleDocUrl": null,
  "auditId": "uuid-de-la-auditoria",
  "generatedBy": "user-uuid",
  "createdAt": "2025-12-29T10:00:00.000Z"
}
```

### Consultar el Estado del Reporte

```bash
GET /reports/:id
```

Cuando `status` sea `"completed"`, el `googleDocUrl` contendrá el link al documento.

### Compartir el Reporte

```bash
POST /reports/:id/share
Content-Type: application/json

{
  "email": "usuario@example.com",
  "role": "writer"
}
```

**Roles disponibles:**

- `reader` - Solo lectura
- `commenter` - Puede comentar
- `writer` - Puede editar

### Listar Todos los Reportes

```bash
GET /reports
```

### Eliminar un Reporte

```bash
DELETE /reports/:id
```

Esto desactiva el reporte en la base de datos y elimina el documento de Google Docs.

## Tipos de Reportes Disponibles

### 1. Reporte de Auditoría Completo (`audit_report`)

- Información general de la auditoría
- Equipo auditor
- Resultados de evaluaciones
- Resumen de cumplimiento
- Conclusiones y recomendaciones
- **Incluye:** Tabla de contenidos, tablas formateadas

### 2. Matriz de Cumplimiento (`compliance_matrix`)

- Vista tabular del cumplimiento por norma
- Estado de cada evaluación
- (En desarrollo)

### 3. Resumen de Planes de Acción (`action_plan_summary`)

- Todos los planes de acción generados
- Estado de implementación
- Fechas y responsables
- (En desarrollo)

### 4. Resumen Ejecutivo (`executive_summary`)

- Resumen de alto nivel para gerencia
- Métricas clave
- Hallazgos principales
- (En desarrollo)

## Características del Generador

### Elementos soportados:

✅ **Texto con estilos**

- Negrita, cursiva, subrayado
- Tamaño de fuente
- Colores personalizables
- Familias de fuentes
- Alineación (izquierda, centro, derecha, justificado)

✅ **Encabezados** (H1, H2, H3, H4)

✅ **Tablas con estilos temáticos**

- Headers con color de fondo y texto personalizado
- Filas alternadas para mejor legibilidad
- Datos dinámicos desde la base de datos

✅ **Tabla de Contenidos (TOC)**

- Generada automáticamente
- Se actualiza con los encabezados

✅ **Permisos**

- Compartir con usuarios específicos
- Control de roles (lector, comentador, editor)

✅ **Temas de diseño**

- Múltiples temas predefinidos
- Colores y tipografía consistentes
- Personalización por reporte

## Sistema de Temas

### Temas Predefinidos

**Default (Profesional Azul)**

- Colores: Azul Google (#1a73e8)
- Fuente: Arial
- Ideal para reportes corporativos estándar

**Corporate Green (Corporativo Verde)**

- Colores: Verde (#0f9d58)
- Fuente: Georgia para títulos, Arial para cuerpo
- Ideal para organizaciones con identidad verde

**Minimal (Minimalista)**

- Colores: Escala de grises
- Fuente: Helvetica
- Ideal para reportes técnicos y formales

### Personalización de Temas

Los temas controlan:

- **Colores**: primary, secondary, accent, text, background, headerBg
- **Tipografía**: heading, body, code
- **Tamaños**: h1, h2, h3, h4, body, small

Para crear temas personalizados, edita `/src/reports/templates/document-theme.ts`:

```typescript
export const CUSTOM_THEME: DocumentTheme = {
  name: 'Mi Tema Personalizado',
  colors: {
    primary: '#ff6b6b',
    secondary: '#4ecdc4',
    accent: '#ffe66d',
    text: '#2d3436',
    textLight: '#636e72',
    background: '#ffffff',
    headerBg: '#f8f9fa',
  },
  fonts: {
    heading: 'Roboto',
    body: 'Open Sans',
    code: 'Fira Code',
  },
  sizes: {
    h1: 28,
    h2: 22,
    h3: 16,
    h4: 14,
    body: 12,
    small: 10,
  },
}
```

## Troubleshooting

### Error: "Google credentials not configured"

Verifica que la variable de entorno `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` esté configurada correctamente.

### Error: "The caller does not have permission"

Asegúrate de que:

1. Las APIs de Google Docs y Drive estén habilitadas
2. El Service Account tenga los permisos correctos
3. El JSON de credenciales sea válido

### El documento se crea pero no puedo verlo

Los documentos creados por el Service Account pertenecen a esa cuenta. Tienes dos opciones:

1. Usar el endpoint `/reports/:id/share` para compartirlo con tu email
2. El documento se crea en el Drive del Service Account, no en el tuyo

### Cómo acceder a los documentos del Service Account

Opción recomendada: Crea una carpeta compartida en Google Drive y configura el Service Account para crear documentos ahí.

## Próximas Mejoras

- [ ] Plantillas personalizables
- [ ] Gráficos y estadísticas visuales
- [ ] Exportación a PDF
- [ ] Firma digital de reportes
- [ ] Generación en batch
- [ ] Webhooks cuando el reporte esté listo
