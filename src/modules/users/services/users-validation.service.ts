import { Injectable, Inject } from '@nestjs/common'
import type { IUsersRepository } from '../repositories/users-repository.interface'
import type { UserEntity } from '../entities/user.entity'
import {
  EmailAlreadyExistsException,
  UsernameAlreadyExistsException,
  CiAlreadyExistsException,
  UserNotFoundByIdException,
} from '../exceptions'

/**
 * Servicio de validaciones reutilizables para usuarios
 *
 * Este servicio contiene lógica de validación que puede ser
 * reutilizada por múltiples casos de uso (commands).
 */
@Injectable()
export class UsersValidationService {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
  ) {}

  /**
   * Valida que email, username y CI sean únicos
   * Reutilizable en create, update, y cualquier otro caso de uso
   *
   * @param data - Datos a validar (email, username, ci)
   * @param excludeId - ID a excluir de la validación (útil para updates)
   * @throws EmailAlreadyExistsException si el email ya existe
   * @throws UsernameAlreadyExistsException si el username ya existe
   * @throws CiAlreadyExistsException si el CI ya existe
   */
  async validateUniqueness(
    data: {
      email?: string
      username?: string
      ci?: string
    },
    excludeId?: string,
  ): Promise<void> {
    if (data.email) {
      const exists = await this.usersRepository.existsByEmail(
        data.email,
        excludeId,
      )
      if (exists) {
        throw new EmailAlreadyExistsException(data.email, excludeId)
      }
    }

    if (data.username) {
      const exists = await this.usersRepository.existsByUsername(
        data.username,
        excludeId,
      )
      if (exists) {
        throw new UsernameAlreadyExistsException(data.username, excludeId)
      }
    }

    if (data.ci) {
      const exists = await this.usersRepository.existsByCI(data.ci, excludeId)
      if (exists) {
        throw new CiAlreadyExistsException(data.ci, excludeId)
      }
    }
  }

  /**
   * Verifica que un usuario exista, si no lanza excepción
   *
   * @param userId - ID del usuario
   * @returns UserEntity encontrado
   * @throws UserNotFoundByIdException si el usuario no existe
   */
  async ensureUserExists(userId: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(userId)

    if (!user) {
      throw new UserNotFoundByIdException(userId)
    }

    return user
  }
}
