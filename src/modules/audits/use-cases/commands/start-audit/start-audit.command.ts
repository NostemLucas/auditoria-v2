/**
 * Command para iniciar una auditoría
 *
 * Transición: PLANNED → IN_PROGRESS
 *
 * Responsabilidad: Contener los datos necesarios para iniciar una auditoría planificada
 */
export class StartAuditCommand {
  constructor(
    public readonly auditId: string,
    public readonly startedBy: string, // Debe ser el lead auditor
  ) {}
}
