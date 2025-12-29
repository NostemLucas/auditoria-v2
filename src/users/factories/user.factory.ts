import { Injectable } from '@nestjs/common'
import { UserEntity, UserStatus } from '../entities/user.entity'
import { RoleEntity } from '../entities/role.entity'
import { CreateUserDto } from '../dtos/create-user.dto'
import { UpdateUserDto } from '../dtos/update-user.dto'

@Injectable()
export class UserFactory {
  /**
   * Crea una nueva instancia de UserEntity desde un DTO
   */
  createFromDto(dto: CreateUserDto, roles?: RoleEntity[]): UserEntity {
    const user = new UserEntity()

    user.names = dto.names.trim()
    user.lastNames = dto.lastNames.trim()
    user.email = dto.email.toLowerCase().trim()
    user.username = dto.username.toLowerCase().trim()
    user.ci = dto.ci.trim()
    user.phone = dto.phone?.trim() || null
    user.address = dto.address?.trim() || null
    user.image = dto.image?.trim() || null
    user.status = dto.status || UserStatus.ACTIVE
    user.organizationId = dto.organizationId || null
    user.roles = roles || []

    return user
  }

  /**
   * Actualiza una entidad UserEntity existente con los datos del DTO
   */
  updateFromDto(
    user: UserEntity,
    dto: UpdateUserDto,
    roles?: RoleEntity[],
  ): UserEntity {
    if (dto.names !== undefined) {
      user.names = dto.names.trim()
    }

    if (dto.lastNames !== undefined) {
      user.lastNames = dto.lastNames.trim()
    }

    if (dto.email !== undefined) {
      user.email = dto.email.toLowerCase().trim()
    }

    if (dto.username !== undefined) {
      user.username = dto.username.toLowerCase().trim()
    }

    if (dto.ci !== undefined) {
      user.ci = dto.ci.trim()
    }

    if (dto.phone !== undefined) {
      user.phone = dto.phone?.trim() || null
    }

    if (dto.address !== undefined) {
      user.address = dto.address?.trim() || null
    }

    if (dto.image !== undefined) {
      user.image = dto.image?.trim() || null
    }

    if (dto.status !== undefined) {
      user.status = dto.status
    }

    if (dto.organizationId !== undefined) {
      user.organizationId = dto.organizationId
    }

    if (roles !== undefined) {
      user.roles = roles
    }

    return user
  }

  /**
   * Convierte una entidad a un objeto plano para respuestas API
   */
  toResponse(user: UserEntity) {
    return {
      id: user.id,
      names: user.names,
      lastNames: user.lastNames,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      ci: user.ci,
      phone: user.phone,
      address: user.address,
      image: user.image,
      status: user.status,
      organizationId: user.organizationId,
      roles: user.roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }

  /**
   * Convierte múltiples entidades a respuestas API
   */
  toResponseList(users: UserEntity[]) {
    return users.map((user) => this.toResponse(user))
  }
}
