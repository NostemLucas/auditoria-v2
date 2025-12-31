import type { UserEntity } from '@users/entities/user.entity'

/**
 * Respuesta de login/register
 */
export interface AuthResponse {
  user: Partial<UserEntity>
  accessToken: string
  refreshToken: string
  expiresIn: number // segundos hasta que expire el access token
}

/**
 * Respuesta de refresh token
 */
export interface RefreshResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
}
