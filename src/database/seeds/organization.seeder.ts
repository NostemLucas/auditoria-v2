import { DataSource } from 'typeorm'
import { Seeder } from 'typeorm-extension'
import { OrganizationEntity } from '../../users/entities/organization.entity'

export default class OrganizationSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const organizationRepository = dataSource.getRepository(OrganizationEntity)

    // Verificar si ya existen organizaciones
    const existingOrganizations = await organizationRepository.count()
    if (existingOrganizations > 0) {
      console.log('Organizations already exist, skipping seed...')
      return
    }

    const organizations = [
      {
        name: 'Default Organization',
        description: 'Organización por defecto del sistema',
        address: 'Av. Principal 123',
        phone: '+598 99 123 456',
        email: 'contact@default.com',
        isActive: true,
      },
      {
        name: 'Demo Company',
        description: 'Empresa de demostración',
        address: 'Calle Secundaria 456',
        phone: '+598 99 654 321',
        email: 'info@demo.com',
        isActive: true,
      },
    ]

    await organizationRepository.save(organizations)
    console.log('✅ Organizations seeded successfully')
  }
}
