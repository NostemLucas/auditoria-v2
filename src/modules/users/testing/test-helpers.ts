import { UserEntity, UserStatus } from '../entities/user.entity'
import { Role } from '@authorization'

/**
 * Helpers para crear datos de prueba
 */

export const createMockUser = (overrides?: Partial<UserEntity>): UserEntity => {
  const user = new UserEntity()
  user.id = overrides?.id || '123e4567-e89b-12d3-a456-426614174000'
  user.names = overrides?.names || 'John'
  user.lastNames = overrides?.lastNames || 'Doe'
  user.email = overrides?.email || 'john.doe@example.com'
  user.username = overrides?.username || 'johndoe'
  user.ci = overrides?.ci || '12345678'
  user.phone = overrides?.phone || null
  user.address = overrides?.address || null
  user.image = overrides?.image || null
  user.status = overrides?.status || UserStatus.ACTIVE
  user.organizationId = overrides?.organizationId || null
  user.roles = overrides?.roles || [Role.CLIENTE]
  user.createdAt = overrides?.createdAt || new Date()
  user.updatedAt = overrides?.updatedAt || new Date()

  return user
}

export const createMockUsers = (count: number): UserEntity[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockUser({
      id: `user-${i}`,
      email: `user${i}@example.com`,
      username: `user${i}`,
    }),
  )
}
