import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import type { IUsersRepository } from '../repositories/users-repository.interface'
import type { UserEntity } from '../entities/user.entity'

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
   * @throws ConflictException si algún campo ya existe
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
        throw new ConflictException('El email ya está registrado')
      }
    }

    if (data.username) {
      const exists = await this.usersRepository.existsByUsername(
        data.username,
        excludeId,
      )
      if (exists) {
        throw new ConflictException('El username ya está en uso')
      }
    }

    if (data.ci) {
      const exists = await this.usersRepository.existsByCI(data.ci, excludeId)
      if (exists) {
        throw new ConflictException('El CI ya está registrado')
      }
    }
  }

  /**
   * Verifica que un usuario exista, si no lanza excepción
   *
   * @param userId - ID del usuario
   * @returns UserEntity encontrado
   * @throws NotFoundException si el usuario no existe
   */
  async ensureUserExists(userId: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(userId)

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`)
    }

    return user
  }
}
