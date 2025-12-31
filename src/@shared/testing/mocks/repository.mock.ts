import type { BaseEntity } from '@core/entities'
import type { IBaseRepository } from '@core/repositories/base-repository.interface'

/**
 * Crea un mock del BaseRepository con todos sus métodos
 * Útil para testing de servicios que usan repositorios
 */
export function createMockRepository<T extends BaseEntity>(): jest.Mocked<
  IBaseRepository<T>
> {
  return {
    create: jest.fn(),
    createMany: jest.fn(),
    save: jest.fn(),
    saveMany: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    patch: jest.fn(),
    softDelete: jest.fn(),
    recover: jest.fn(),
  }
}

/**
 * Crea un mock extendido del repositorio con métodos adicionales
 * Combina los métodos base con métodos específicos
 *
 * @example
 * const mockUsersRepo = createExtendedMockRepository<UserEntity, IUsersRepository>({
 *   findByEmail: jest.fn(),
 *   existsByEmail: jest.fn(),
 * })
 */
export function createExtendedMockRepository<
  T extends BaseEntity,
  R extends IBaseRepository<T>,
>(extensions: Record<string, jest.Mock>): jest.Mocked<R> {
  return {
    ...createMockRepository<T>(),
    ...extensions,
  } as jest.Mocked<R>
}
