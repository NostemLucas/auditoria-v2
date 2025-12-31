import type { Role } from '@authorization'

/**
 * Command para crear un nuevo usuario
 *
 * Los commands son DTOs inmutables que representan una intención de cambio.
 * Contienen solo los datos necesarios para ejecutar la operación.
 */
export class CreateUserCommand {
  constructor(
    public readonly names: string,
    public readonly lastNames: string,
    public readonly email: string,
    public readonly username: string,
    public readonly ci: string,
    public readonly password: string,
    public readonly roles: Role[],
    public readonly phone?: string,
    public readonly address?: string,
    public readonly organizationId?: string,
  ) {}
}
