/**
 * Command para cerrar una auditoría
 *
 * Transición: PENDING_CLOSURE → CLOSED
 *
 * Responsabilidad: Contener los datos necesarios para cerrar definitivamente
 * una auditoría que ha sido aprobada para cierre
 */
export class CloseAuditCommand {
  constructor(
    public readonly auditId: string,
    public readonly closedBy: string, // Debe ser el lead auditor
    public readonly reportUrl?: string, // URL del reporte final
  ) {}
}
