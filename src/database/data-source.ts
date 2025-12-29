import { DataSource, DataSourceOptions } from 'typeorm'
import { config } from 'dotenv'
import { SeederOptions } from 'typeorm-extension'

// Cargar variables de entorno
config()

export const dataSourceOptions: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'notifications_db',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  seeds: ['src/database/seeds/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
}

const dataSource = new DataSource(dataSourceOptions)

export default dataSource
