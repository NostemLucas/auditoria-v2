import { runSeeders } from 'typeorm-extension'
import dataSource from '../data-source'
import RoleSeeder from './role.seeder'
import OrganizationSeeder from './organization.seeder'
import UserSeeder from './user.seeder'

async function runAllSeeds() {
  try {
    // Inicializar conexión
    await dataSource.initialize()
    console.log('📦 Database connection initialized')

    // Ejecutar seeders en orden
    await runSeeders(dataSource, {
      seeds: [RoleSeeder, OrganizationSeeder, UserSeeder],
    })

    console.log('🎉 All seeders executed successfully!')

    // Cerrar conexión
    await dataSource.destroy()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error running seeders:', error)
    await dataSource.destroy()
    process.exit(1)
  }
}

void runAllSeeds()
