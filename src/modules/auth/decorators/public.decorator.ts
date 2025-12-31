import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'

/**
 * Decorator para marcar rutas como públicas (sin autenticación)
 *
 * @example
 * @Public()
 * @Get('public-data')
 * async getPublicData() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
