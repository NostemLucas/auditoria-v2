import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * Metadata adicional para excepciones de usuario
 */
export interface UserExceptionMetadata {
  /**
   * Código de error interno para logging/debugging
   */
  errorCode?: string

  /**
   * ID del usuario relacionado (si aplica)
   */
  userId?: string

  /**
   * Campo que causó el error (email, username, ci, etc.)
   */
  field?: string

  /**
   * Valor que causó el error (para debugging)
   */
  value?: string

  /**
   * Información adicional contextual
   */
  context?: Record<string, unknown>
}

/**
 * Clase base para todas las excepciones del módulo de usuarios
 * Extiende HttpException de NestJS para mantener compatibilidad
 */
export class UserException extends HttpException {
  public readonly metadata: UserExceptionMetadata

  constructor(
    message: string,
    status: HttpStatus,
    metadata: UserExceptionMetadata = {},
  ) {
    super(
      {
        message,
        statusCode: status,
        error: HttpStatus[status],
        timestamp: new Date().toISOString(),
        ...metadata,
      },
      status,
    )

    this.metadata = metadata
    this.name = this.constructor.name
  }
}
