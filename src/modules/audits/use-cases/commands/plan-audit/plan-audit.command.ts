/**
 * Command para planificar una auditoría
 *
 * Transición: DRAFT → PLANNED
 *
 * Responsabilidad: Contener los datos necesarios para planificar una auditoría
 */
export class PlanAuditCommand {
  constructor(
    public readonly auditId: string,
    public readonly leadAuditorId: string,
    public readonly auditorIds: string[],
    public readonly scheduledStartDate: Date,
    public readonly scheduledEndDate: Date,
    public readonly scope: string,
    public readonly organizationId?: string, // Si necesita cambiar la organización
  ) {}
}
