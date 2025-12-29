import { DataSource } from 'typeorm'
import { Seeder } from 'typeorm-extension'
import { UserEntity, UserStatus } from '../../users/entities/user.entity'
import { RoleEntity } from '../../users/entities/role.entity'
import { OrganizationEntity } from '../../organizations/entities/organization.entity'

export default class UserSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(UserEntity)
    const roleRepository = dataSource.getRepository(RoleEntity)
    const organizationRepository = dataSource.getRepository(OrganizationEntity)

    // Verificar si ya existen usuarios
    const existingUsers = await userRepository.count()
    if (existingUsers > 0) {
      console.log('Users already exist, skipping seed...')
      return
    }

    // Obtener roles y organizaciones
    const adminRole = await roleRepository.findOne({ where: { name: 'Admin' } })
    const userRole = await roleRepository.findOne({ where: { name: 'User' } })
    const defaultOrganization = await organizationRepository.findOne({
      where: { name: 'Default Organization' },
    })

    if (!adminRole || !userRole || !defaultOrganization) {
      console.error(
        '❌ Required roles or organizations not found. Run role and organization seeders first.',
      )
      return
    }

    const users = [
      {
        names: 'Admin',
        lastNames: 'System',
        email: 'admin@system.com',
        username: 'admin',
        ci: '12345678-1',
        phone: '+598 99 111 111',
        address: 'Admin Address 123',
        image: null,
        status: UserStatus.ACTIVE,
        organizationId: defaultOrganization.id,
        roles: [adminRole],
      },
      {
        names: 'John',
        lastNames: 'Doe',
        email: 'john.doe@example.com',
        username: 'johndoe',
        ci: '23456789-2',
        phone: '+598 99 222 222',
        address: 'User Street 456',
        image: null,
        status: UserStatus.ACTIVE,
        organizationId: defaultOrganization.id,
        roles: [userRole],
      },
      {
        names: 'Jane',
        lastNames: 'Smith',
        email: 'jane.smith@example.com',
        username: 'janesmith',
        ci: '34567890-3',
        phone: '+598 99 333 333',
        address: 'Another Street 789',
        image: null,
        status: UserStatus.ACTIVE,
        organizationId: defaultOrganization.id,
        roles: [userRole],
      },
    ]

    await userRepository.save(users)
    console.log('✅ Users seeded successfully')
  }
}
