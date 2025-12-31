/**
 * Command para eliminar (soft delete) un usuario
 */
export class DeleteUserCommand {
  constructor(public readonly userId: string) {}
}
