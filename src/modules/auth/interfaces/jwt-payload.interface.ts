import type { Role, Permission } from '@authorization'

/**
 * Payload del JWT Access Token
 * Contiene información mínima del usuario para evitar consultas a BD
 */
export interface JwtPayload {
  sub: string // user ID
  email: string
  username: string
  roles: Role[] // roles del usuario
  permissions?: Permission[] // opcional: permisos pre-calculados para performance
  iat?: number // issued at
  exp?: number // expiration
}

/**
 * Payload del Refresh Token
 */
export interface RefreshTokenPayload {
  sub: string // user ID
  tokenId: string // ID del refresh token en BD
  iat?: number
  exp?: number
}
