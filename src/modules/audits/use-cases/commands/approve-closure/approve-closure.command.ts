/**
 * Command para aprobar el cierre de una auditoría
 *
 * Estado: PENDING_CLOSURE (sin cambiar)
 *
 * Responsabilidad: Registrar la aprobación del lead auditor para proceder
 * con el cierre definitivo
 */
export class ApproveClosureCommand {
  constructor(
    public readonly auditId: string,
    public readonly approvedBy: string, // Debe ser el lead auditor
  ) {}
}
