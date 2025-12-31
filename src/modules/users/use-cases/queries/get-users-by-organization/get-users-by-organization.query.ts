/**
 * Query para obtener usuarios por organización
 */
export class GetUsersByOrganizationQuery {
  constructor(public readonly organizationId: string) {}
}
