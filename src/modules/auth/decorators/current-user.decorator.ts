import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { JwtPayload } from '../interfaces/jwt-payload.interface'

/**
 * Decorator para obtener el usuario del JWT (request.user)
 *
 * IMPORTANTE:
 * - Retorna el JwtPayload del token (NO consulta DB)
 * - Contiene: id, email, username, roles, permissions
 * - Para datos completos del usuario, usa UsersService.findById()
 *
 * @example
 * // Uso básico (más común)
 * @Get('reports')
 * async getReports(@CurrentUser() user: JwtPayload) {
 *   return this.reportsService.findByUserId(user.sub)
 * }
 *
 * @example
 * // Extraer solo el ID
 * @Get('profile')
 * async getProfile(@CurrentUser('sub') userId: string) {
 *   return this.usersService.findById(userId)
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    const user: JwtPayload = request.user

    return data ? user?.[data] : user
  },
)
