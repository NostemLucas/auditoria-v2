/**
 * Command para cancelar una auditoría
 *
 * Transición: Cualquier estado → CANCELLED
 *
 * Responsabilidad: Contener los datos necesarios para cancelar una auditoría
 */
export class CancelAuditCommand {
  constructor(
    public readonly auditId: string,
    public readonly cancelledBy: string, // Debe ser lead auditor o admin
    public readonly cancellationReason: string,
  ) {}
}
