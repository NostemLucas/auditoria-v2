import type { IUsersRepository } from '../repositories/users-repository.interface'
import type { UserEntity } from '../entities/user.entity'
import { createExtendedMockRepository } from '@shared/testing/mocks'

/**
 * Crea un mock completo de IUsersRepository para testing
 *
 * Incluye todos los métodos del BaseRepository + métodos específicos de Users
 */
export function createMockUsersRepository(): jest.Mocked<IUsersRepository> {
  return createExtendedMockRepository<UserEntity, IUsersRepository>({
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    findByCI: jest.fn(),
    findByOrganization: jest.fn(),
    existsByEmail: jest.fn(),
    existsByUsername: jest.fn(),
    existsByCI: jest.fn(),
  })
}
