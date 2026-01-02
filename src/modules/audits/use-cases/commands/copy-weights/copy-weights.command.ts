/**
 * Command para copiar pesos desde una fuente existente
 *
 * Permite reutilizar configuraciones de pesos de:
 * - La plantilla de la auditoría
 * - Una auditoría previa similar
 */
export class CopyWeightsCommand {
  constructor(
    public readonly auditId: string,
    public readonly source: 'template' | 'previous_audit',
    public readonly copiedBy: string, // Lead Auditor ID
    public readonly sourceAuditId?: string, // Requerido si source = 'previous_audit'
    public readonly adjustmentFactor: number = 1.0, // Factor de ajuste (1.0 = sin cambios)
    public readonly normalizationMode: 'auto' | 'manual' = 'auto',
  ) {}
}
