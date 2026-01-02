/**
 * Command para solicitar el cierre de una auditoría
 *
 * Transición: IN_PROGRESS → PENDING_CLOSURE
 *
 * Responsabilidad: Contener los datos necesarios para que el lead auditor
 * solicite el cierre de una auditoría en progreso
 */
export class RequestClosureCommand {
  constructor(
    public readonly auditId: string,
    public readonly requestedBy: string, // Debe ser el lead auditor
    public readonly reportUrl?: string, // URL del reporte preliminar (opcional)
  ) {}
}
