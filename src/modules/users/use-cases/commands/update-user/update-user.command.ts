import type { Role } from '@authorization'

/**
 * Command para actualizar un usuario existente
 */
export class UpdateUserCommand {
  constructor(
    public readonly userId: string,
    public readonly names?: string,
    public readonly lastNames?: string,
    public readonly email?: string,
    public readonly username?: string,
    public readonly ci?: string,
    public readonly phone?: string,
    public readonly address?: string,
    public readonly image?: string,
    public readonly roles?: Role[],
    public readonly organizationId?: string,
  ) {}
}
