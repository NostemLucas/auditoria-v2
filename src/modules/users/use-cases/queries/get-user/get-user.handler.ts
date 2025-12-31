import { Injectable } from '@nestjs/common'
import type { UserEntity } from '@users/entities/user.entity'
import { UsersValidationService } from '@users/services/users-validation.service'
import type { GetUserQuery } from './get-user.query'

/**
 * Handler para la query GetUser
 *
 * Responsabilidad: Obtener un usuario por ID
 */
@Injectable()
export class GetUserHandler {
  constructor(private readonly validationService: UsersValidationService) {}

  async execute(query: GetUserQuery): Promise<UserEntity> {
    // Reutiliza la validación del service
    return await this.validationService.ensureUserExists(query.userId)
  }
}
