import { Injectable, Inject } from '@nestjs/common'
import type { UserEntity } from '@users/entities/user.entity'
import type { IUsersRepository } from '@users/repositories/users-repository.interface'
import type { GetUsersByOrganizationQuery } from './get-users-by-organization.query'

/**
 * Handler para la query GetUsersByOrganization
 *
 * Responsabilidad: Obtener usuarios filtrados por organización
 */
@Injectable()
export class GetUsersByOrganizationHandler {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
  ) {}

  async execute(query: GetUsersByOrganizationQuery): Promise<UserEntity[]> {
    return await this.usersRepository.findByOrganization(query.organizationId)
  }
}
