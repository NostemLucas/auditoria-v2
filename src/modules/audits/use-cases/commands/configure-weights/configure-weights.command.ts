/**
 * Command para configurar pesos de estándares en una auditoría
 *
 * Permite al Lead Auditor asignar ponderaciones específicas
 * según las prioridades de la organización auditada
 */
export class ConfigureWeightsCommand {
  constructor(
    public readonly auditId: string,
    public readonly weights: Array<{
      standardId: string
      weight: number
      justification?: string
      category?: string
      displayOrder?: number
    }>,
    public readonly configuredBy: string, // Lead Auditor ID
    public readonly normalizationMode: 'auto' | 'manual' = 'auto',
  ) {}
}
