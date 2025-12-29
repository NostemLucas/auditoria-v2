import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { google, docs_v1, drive_v3 } from 'googleapis'
import { DocumentTheme, getTheme, hexToRgb } from '../templates/document-theme'

export interface TableData {
  headers: string[]
  rows: string[][]
}

export interface DocumentStyle {
  fontSize?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  color?: string // Hex color: #FF0000
  backgroundColor?: string // Hex color para fondo de texto
  fontFamily?: string // Nombre de fuente: 'Arial', 'Times New Roman', etc.
  alignment?: 'left' | 'center' | 'right' | 'justify'
}

export interface TableStyle {
  headerBackgroundColor?: string
  headerTextColor?: string
  borderColor?: string
  alternateRowColor?: string
}

@Injectable()
export class GoogleDocsService {
  private readonly logger = new Logger(GoogleDocsService.name)
  private docs: docs_v1.Docs
  private drive: drive_v3.Drive
  private currentTheme: DocumentTheme = getTheme('default')

  constructor(private configService: ConfigService) {
    this.initializeGoogleAuth()
  }

  /**
   * Configura el tema a usar para los próximos documentos
   */
  setTheme(themeName: string): void {
    this.currentTheme = getTheme(themeName)
    this.logger.log(`Theme set to: ${this.currentTheme.name}`)
  }

  /**
   * Obtiene el tema actual
   */
  getTheme(): DocumentTheme {
    return this.currentTheme
  }

  /**
   * Genera estilos de tabla basados en el tema actual
   */
  getTableStyleFromTheme(): TableStyle {
    return {
      headerBackgroundColor: this.currentTheme.colors.primary,
      headerTextColor: this.currentTheme.colors.background,
      borderColor: this.currentTheme.colors.textLight,
      alternateRowColor: this.currentTheme.colors.headerBg,
    }
  }

  private initializeGoogleAuth() {
    try {
      // Obtener credenciales del Service Account desde config
      const credentials = this.configService.get<string>('google.credentials')

      if (!credentials) {
        this.logger.warn(
          'Google credentials not configured. Reports module will not work.',
        )
        return
      }

      const parsedCredentials = JSON.parse(credentials) as Record<
        string,
        unknown
      >

      const auth = new google.auth.GoogleAuth({
        credentials: parsedCredentials,
        scopes: [
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/drive',
        ],
      })

      this.docs = google.docs({ version: 'v1', auth })
      this.drive = google.drive({ version: 'v3', auth })

      this.logger.log('Google Docs API initialized successfully')
    } catch (error) {
      this.logger.error('Failed to initialize Google Docs API', error)
      throw error
    }
  }

  /**
   * Crea un nuevo documento de Google Docs
   */
  async createDocument(
    title: string,
  ): Promise<{ documentId: string; url: string }> {
    try {
      const response = await this.docs.documents.create({
        requestBody: {
          title,
        },
      })

      const documentId = response.data.documentId!
      const url = `https://docs.google.com/document/d/${documentId}/edit`

      this.logger.log(`Document created: ${title} (${documentId})`)

      return { documentId, url }
    } catch (error) {
      this.logger.error('Failed to create document', error)
      throw error
    }
  }

  /**
   * Agrega texto al documento
   */
  async appendText(
    documentId: string,
    text: string,
    style?: DocumentStyle,
  ): Promise<void> {
    const requests: docs_v1.Schema$Request[] = [
      {
        insertText: {
          location: {
            index: 1,
          },
          text: text + '\n',
        },
      },
    ]

    // Aplicar estilos si se proporcionan
    if (style) {
      const textLength = text.length

      // Estilos de texto
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: 1,
            endIndex: 1 + textLength,
          },
          textStyle: {
            bold: style.bold,
            italic: style.italic,
            underline: style.underline,
            fontSize: style.fontSize
              ? {
                  magnitude: style.fontSize,
                  unit: 'PT',
                }
              : undefined,
            foregroundColor: style.color
              ? {
                  color: {
                    rgbColor: hexToRgb(style.color),
                  },
                }
              : undefined,
            backgroundColor: style.backgroundColor
              ? {
                  color: {
                    rgbColor: hexToRgb(style.backgroundColor),
                  },
                }
              : undefined,
            weightedFontFamily: style.fontFamily
              ? {
                  fontFamily: style.fontFamily,
                }
              : undefined,
          },
          fields: '*',
        },
      })

      // Alineación de párrafo
      if (style.alignment) {
        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex: 1,
              endIndex: 1 + textLength + 1,
            },
            paragraphStyle: {
              alignment: style.alignment.toUpperCase() as
                | 'LEFT'
                | 'CENTER'
                | 'RIGHT'
                | 'JUSTIFIED',
            },
            fields: 'alignment',
          },
        })
      }
    }

    await this.docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests,
      },
    })
  }

  /**
   * Agrega un encabezado al documento
   */
  async appendHeading(
    documentId: string,
    text: string,
    level: 1 | 2 | 3 | 4 = 1,
  ): Promise<void> {
    const requests: docs_v1.Schema$Request[] = [
      {
        insertText: {
          location: {
            index: 1,
          },
          text: text + '\n',
        },
      },
      {
        updateParagraphStyle: {
          range: {
            startIndex: 1,
            endIndex: 1 + text.length + 1,
          },
          paragraphStyle: {
            namedStyleType: `HEADING_${level}`,
          },
          fields: 'namedStyleType',
        },
      },
    ]

    await this.docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests,
      },
    })
  }

  /**
   * Crea una tabla en el documento
   */
  async appendTable(
    documentId: string,
    tableData: TableData,
    style?: TableStyle,
  ): Promise<void> {
    const { headers, rows } = tableData
    const totalRows = 1 + rows.length // Headers + data rows
    const totalColumns = headers.length

    // Obtener el índice final del documento
    const doc = await this.docs.documents.get({ documentId })
    const endIndex = doc.data.body?.content?.slice(-1)[0]?.endIndex || 1

    const requests: docs_v1.Schema$Request[] = [
      // Insertar tabla
      {
        insertTable: {
          rows: totalRows,
          columns: totalColumns,
          location: {
            index: endIndex - 1,
          },
        },
      },
    ]

    await this.docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests,
      },
    })

    // Obtener la tabla recién creada
    const updatedDoc = await this.docs.documents.get({ documentId })
    const tables = this.findTables(updatedDoc.data)
    const table = tables[tables.length - 1] // Última tabla insertada

    if (!table) return

    const textRequests: docs_v1.Schema$Request[] = []

    // Llenar headers
    headers.forEach((header, colIndex) => {
      const cell = table.tableRows![0].tableCells![colIndex]
      const cellIndex = cell.content![0].startIndex!

      textRequests.push({
        insertText: {
          location: {
            index: cellIndex,
          },
          text: header,
        },
      })

      // Aplicar estilos a headers
      const headerTextStyle: docs_v1.Schema$TextStyle = {
        bold: true,
      }

      // Aplicar color de texto del tema si está disponible
      if (style?.headerTextColor) {
        headerTextStyle.foregroundColor = {
          color: {
            rgbColor: hexToRgb(style.headerTextColor),
          },
        }
      }

      textRequests.push({
        updateTextStyle: {
          range: {
            startIndex: cellIndex,
            endIndex: cellIndex + header.length,
          },
          textStyle: headerTextStyle,
          fields: '*',
        },
      })

      // Aplicar color de fondo a la celda del header
      if (style?.headerBackgroundColor) {
        textRequests.push({
          updateTableCellStyle: {
            tableRange: {
              tableCellLocation: {
                tableStartLocation: {
                  index: table.tableRows![0].startIndex!,
                },
                rowIndex: 0,
                columnIndex: colIndex,
              },
              rowSpan: 1,
              columnSpan: 1,
            },
            tableCellStyle: {
              backgroundColor: {
                color: {
                  rgbColor: hexToRgb(style.headerBackgroundColor),
                },
              },
            },
            fields: 'backgroundColor',
          },
        })
      }
    })

    // Llenar filas de datos
    rows.forEach((row, rowIndex) => {
      row.forEach((cellValue, colIndex) => {
        const cell = table.tableRows![rowIndex + 1].tableCells![colIndex]
        const cellIndex = cell.content![0].startIndex!

        textRequests.push({
          insertText: {
            location: {
              index: cellIndex,
            },
            text: cellValue || '',
          },
        })

        // Aplicar color alternado a las filas si está configurado
        if (style?.alternateRowColor && rowIndex % 2 === 1) {
          textRequests.push({
            updateTableCellStyle: {
              tableRange: {
                tableCellLocation: {
                  tableStartLocation: {
                    index: table.tableRows![0].startIndex!,
                  },
                  rowIndex: rowIndex + 1,
                  columnIndex: colIndex,
                },
                rowSpan: 1,
                columnSpan: 1,
              },
              tableCellStyle: {
                backgroundColor: {
                  color: {
                    rgbColor: hexToRgb(style.alternateRowColor),
                  },
                },
              },
              fields: 'backgroundColor',
            },
          })
        }
      })
    })

    if (textRequests.length > 0) {
      await this.docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: textRequests,
        },
      })
    }
  }

  /**
   * Inserta una tabla de contenidos (TOC)
   * NOTA: La tabla de contenidos se puede insertar manualmente en el documento
   * Google Docs genera automáticamente el TOC basándose en los encabezados
   */

  async insertTableOfContents(
    documentId: string,
    _index: number = 1, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<void> {
    // Insertar placeholder para TOC
    await this.appendText(
      documentId,
      '[Insertar Tabla de Contenidos manualmente en Google Docs: Insertar > Tabla de contenidos]',
    )

    // TODO: Investigar API actualizada para insertar TOC automáticamente
    // La API actual no soporta directamente insertTableOfContents en la versión de googleapis
  }

  /**
   * Comparte el documento con un usuario
   */
  async shareDocument(
    documentId: string,
    email: string,
    role: 'reader' | 'commenter' | 'writer' = 'reader',
  ): Promise<void> {
    try {
      await this.drive.permissions.create({
        fileId: documentId,
        requestBody: {
          type: 'user',
          role,
          emailAddress: email,
        },
        sendNotificationEmail: true,
      })

      this.logger.log(`Document ${documentId} shared with ${email} as ${role}`)
    } catch (error) {
      this.logger.error(`Failed to share document with ${email}`, error)
      throw error
    }
  }

  /**
   * Hace el documento público con link
   */
  async makePublicWithLink(documentId: string): Promise<void> {
    await this.drive.permissions.create({
      fileId: documentId,
      requestBody: {
        type: 'anyone',
        role: 'reader',
      },
    })
  }

  /**
   * Obtiene el contenido del documento
   */
  async getDocument(documentId: string): Promise<docs_v1.Schema$Document> {
    const response = await this.docs.documents.get({ documentId })
    return response.data
  }

  /**
   * Elimina el documento
   */
  async deleteDocument(documentId: string): Promise<void> {
    await this.drive.files.delete({ fileId: documentId })
    this.logger.log(`Document ${documentId} deleted`)
  }

  // Helpers privados

  private findTables(
    document: docs_v1.Schema$Document,
  ): docs_v1.Schema$Table[] {
    const tables: docs_v1.Schema$Table[] = []

    if (!document.body?.content) return tables

    for (const element of document.body.content) {
      if (element.table) {
        tables.push(element.table)
      }
    }

    return tables
  }
}
