import { registerAs } from '@nestjs/config'
import { TypeOrmModuleOptions } from '@nestjs/typeorm'

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'notifications_db',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false, // Usar migrations en lugar de synchronize
    logging: process.env.NODE_ENV === 'development',
  }),
)
