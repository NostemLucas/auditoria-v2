import { HttpStatus } from '@nestjs/common'
import { UserException, UserExceptionMetadata } from './user.exception'

/**
 * Excepción cuando no se encuentra un usuario
 */
export class UserNotFoundException extends UserException {
  constructor(
    identifier: string,
    identifierType: 'id' | 'email' | 'username' = 'id',
  ) {
    const metadata: UserExceptionMetadata = {
      errorCode: 'USER_NOT_FOUND',
      field: identifierType,
      value: identifier,
    }

    const message = `Usuario no encontrado con ${identifierType}: ${identifier}`

    super(message, HttpStatus.NOT_FOUND, metadata)
  }
}

/**
 * Excepción cuando no se encuentra un usuario por ID
 */
export class UserNotFoundByIdException extends UserNotFoundException {
  constructor(userId: string) {
    super(userId, 'id')
  }
}

/**
 * Excepción cuando no se encuentra un usuario por email
 */
export class UserNotFoundByEmailException extends UserNotFoundException {
  constructor(email: string) {
    super(email, 'email')
  }
}

/**
 * Excepción cuando no se encuentra un usuario por username
 */
export class UserNotFoundByUsernameException extends UserNotFoundException {
  constructor(username: string) {
    super(username, 'username')
  }
}
