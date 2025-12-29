import { IoAdapter } from '@nestjs/platform-socket.io'
import { ServerOptions, Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import { ConfigService } from '@nestjs/config'
import { INestApplicationContext, Logger } from '@nestjs/common'
import { RedisConfig } from './interfaces/redis-config.interface'

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null
  private readonly logger = new Logger(RedisIoAdapter.name)

  constructor(
    app: INestApplicationContext,
    private configService: ConfigService,
  ) {
    super(app)
  }

  async connectToRedis(): Promise<void> {
    const redisConfig = this.configService.get<RedisConfig>('redis')

    if (!redisConfig) {
      throw new Error('Redis configuration not found')
    }

    const pubClient = createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
      password: redisConfig.password,
    })

    const subClient = pubClient.duplicate()

    await Promise.all([pubClient.connect(), subClient.connect()])

    this.logger.log('Redis clients connected successfully')

    pubClient.on('error', (err: Error) => {
      this.logger.error('Redis Pub Client Error:', err)
    })

    subClient.on('error', (err: Error) => {
      this.logger.error('Redis Sub Client Error:', err)
    })

    this.adapterConstructor = createAdapter(pubClient, subClient)
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: '*',
        credentials: true,
      },
    }) as Server

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor)
      this.logger.log('Redis adapter attached to Socket.IO server')
    } else {
      this.logger.warn(
        'Redis adapter not initialized, running in single-instance mode',
      )
    }

    return server
  }
}
