import { HttpStatus } from '@nestjs/common'
import { UserException, UserExceptionMetadata } from './user.exception'

/**
 * Excepción cuando los datos del usuario son inválidos
 */
export class InvalidUserDataException extends UserException {
  constructor(message: string, field?: string, value?: string) {
    const metadata: UserExceptionMetadata = {
      errorCode: 'INVALID_USER_DATA',
      field,
      value,
    }

    super(message, HttpStatus.BAD_REQUEST, metadata)
  }
}

/**
 * Excepción cuando el usuario está inactivo
 */
export class UserInactiveException extends UserException {
  constructor(userId: string) {
    const metadata: UserExceptionMetadata = {
      errorCode: 'USER_INACTIVE',
      userId,
    }

    const message = `El usuario con ID ${userId} está inactivo`

    super(message, HttpStatus.FORBIDDEN, metadata)
  }
}

/**
 * Excepción cuando se intenta eliminar un usuario que no puede ser eliminado
 */
export class UserCannotBeDeletedException extends UserException {
  constructor(userId: string, reason: string) {
    const metadata: UserExceptionMetadata = {
      errorCode: 'USER_CANNOT_BE_DELETED',
      userId,
      context: { reason },
    }

    const message = `El usuario con ID ${userId} no puede ser eliminado: ${reason}`

    super(message, HttpStatus.FORBIDDEN, metadata)
  }
}

/**
 * Excepción cuando un archivo de usuario es inválido
 */
export class InvalidUserFileException extends UserException {
  constructor(message: string, field: string = 'file') {
    const metadata: UserExceptionMetadata = {
      errorCode: 'INVALID_USER_FILE',
      field,
    }

    super(message, HttpStatus.BAD_REQUEST, metadata)
  }
}
