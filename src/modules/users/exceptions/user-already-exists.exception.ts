import { HttpStatus } from '@nestjs/common'
import { UserException, UserExceptionMetadata } from './user.exception'

/**
 * Excepción base cuando un usuario ya existe
 */
export class UserAlreadyExistsException extends UserException {
  constructor(field: string, value: string, excludeId?: string) {
    const metadata: UserExceptionMetadata = {
      errorCode: 'USER_ALREADY_EXISTS',
      field,
      value,
      context: excludeId ? { excludeId } : undefined,
    }

    const message = `Ya existe un usuario con ${field}: ${value}`

    super(message, HttpStatus.CONFLICT, metadata)
  }
}

/**
 * Excepción cuando el email ya está registrado
 */
export class EmailAlreadyExistsException extends UserException {
  constructor(email: string, excludeId?: string) {
    const metadata: UserExceptionMetadata = {
      errorCode: 'EMAIL_ALREADY_EXISTS',
      field: 'email',
      value: email,
      context: excludeId ? { excludeId } : undefined,
    }

    const message = `El email ${email} ya está registrado`

    super(message, HttpStatus.CONFLICT, metadata)
  }
}

/**
 * Excepción cuando el username ya está en uso
 */
export class UsernameAlreadyExistsException extends UserException {
  constructor(username: string, excludeId?: string) {
    const metadata: UserExceptionMetadata = {
      errorCode: 'USERNAME_ALREADY_EXISTS',
      field: 'username',
      value: username,
      context: excludeId ? { excludeId } : undefined,
    }

    const message = `El username ${username} ya está en uso`

    super(message, HttpStatus.CONFLICT, metadata)
  }
}

/**
 * Excepción cuando el CI ya está registrado
 */
export class CiAlreadyExistsException extends UserException {
  constructor(ci: string, excludeId?: string) {
    const metadata: UserExceptionMetadata = {
      errorCode: 'CI_ALREADY_EXISTS',
      field: 'ci',
      value: ci,
      context: excludeId ? { excludeId } : undefined,
    }

    const message = `El CI ${ci} ya está registrado`

    super(message, HttpStatus.CONFLICT, metadata)
  }
}
