import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { WsException } from '@nestjs/websockets'
import { Socket } from 'socket.io'
import type { JwtPayload } from '@auth/interfaces/jwt-payload.interface'

/**
 * Guard para validar JWT en conexiones WebSocket
 * El token puede venir de:
 * - Query params: ?token=xxx
 * - Auth header: Authorization: Bearer xxx
 * - Handshake auth: { auth: { token: 'xxx' } }
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name)

  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient()
      const token = this.extractTokenFromClient(client)

      if (!token) {
        throw new WsException('No se proporcionó token de autenticación')
      }

      // Verificar y decodificar el token
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token)

      // Adjuntar el payload al socket para uso posterior
      client.data.user = payload

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token inválido'
      this.logger.error(`Error de autenticación WebSocket: ${message}`)
      throw new WsException('Autenticación fallida')
    }
  }

  /**
   * Extrae el token del cliente WebSocket
   * Soporta múltiples formas de envío
   */
  private extractTokenFromClient(client: Socket): string | null {
    // 1. Intentar desde query params (?token=xxx)
    const queryToken = client.handshake.query?.token
    if (queryToken && typeof queryToken === 'string') {
      return queryToken
    }

    // 2. Intentar desde auth object ({ auth: { token: 'xxx' } })
    const authToken = client.handshake.auth?.token
    if (authToken && typeof authToken === 'string') {
      return authToken
    }

    // 3. Intentar desde Authorization header
    const authHeader = client.handshake.headers?.authorization
    if (authHeader && typeof authHeader === 'string') {
      const [type, token] = authHeader.split(' ')
      if (type === 'Bearer' && token) {
        return token
      }
    }

    return null
  }
}
