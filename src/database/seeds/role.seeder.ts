import { DataSource } from 'typeorm'
import { Seeder } from 'typeorm-extension'
import { RoleEntity } from '../../users/entities/role.entity'

export default class RoleSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const roleRepository = dataSource.getRepository(RoleEntity)

    // Verificar si ya existen roles
    const existingRoles = await roleRepository.count()
    if (existingRoles > 0) {
      console.log('Roles already exist, skipping seed...')
      return
    }

    const roles = [
      {
        name: 'Admin',
        description: 'Administrador del sistema con acceso total',
      },
      {
        name: 'Manager',
        description: 'Gerente con permisos de gestión',
      },
      {
        name: 'User',
        description: 'Usuario estándar con permisos básicos',
      },
      {
        name: 'Guest',
        description: 'Usuario invitado con permisos limitados',
      },
    ]

    await roleRepository.save(roles)
    console.log('✅ Roles seeded successfully')
  }
}
