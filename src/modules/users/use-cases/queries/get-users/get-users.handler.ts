import { Injectable, Inject } from '@nestjs/common'
import type { UserEntity } from '@users/entities/user.entity'
import type { IUsersRepository } from '@users/repositories/users-repository.interface'
import type { GetUsersQuery } from './get-users.query'

/**
 * Handler para la query GetUsers
 *
 * Responsabilidad: Obtener todos los usuarios
 */
@Injectable()
export class GetUsersHandler {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
  ) {}

  async execute(_query: GetUsersQuery): Promise<UserEntity[]> {
    return await this.usersRepository.findAll()
  }
}
