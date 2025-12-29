import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {
  ReportEntity,
  ReportType,
  ReportStatus,
} from '../entities/report.entity'
import { GoogleDocsService } from './google-docs.service'
import { AuditsService } from '../../audits/services/audits.service'
import { AuditEntity } from '../../audits/entities/audit.entity'
import { ComplianceStatus } from '../../audits/entities/evaluation.entity'
import { GenerateReportDto } from '../dtos'

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name)

  constructor(
    @InjectRepository(ReportEntity)
    private readonly reportRepository: Repository<ReportEntity>,
    private readonly googleDocsService: GoogleDocsService,
    private readonly auditsService: AuditsService,
  ) {}

  async generateReport(
    generateReportDto: GenerateReportDto,
    userId: string,
  ): Promise<ReportEntity> {
    // Configurar tema si se especificó
    if (generateReportDto.theme) {
      this.googleDocsService.setTheme(generateReportDto.theme)
    }

    // Crear registro del reporte
    const report = this.reportRepository.create({
      title: this.generateTitle(generateReportDto.reportType),
      reportType: generateReportDto.reportType,
      auditId: generateReportDto.auditId,
      generatedBy: userId,
      metadata: {
        ...generateReportDto.metadata,
        theme: generateReportDto.theme || 'default',
      },
      status: ReportStatus.GENERATING,
    })

    const savedReport = await this.reportRepository.save(report)

    // Generar el documento en background
    void this.generateDocumentAsync(savedReport).catch((error: Error) => {
      this.logger.error(`Failed to generate report ${savedReport.id}`, error)
      void this.updateReportStatus(
        savedReport.id,
        ReportStatus.FAILED,
        error.message,
      )
    })

    return savedReport
  }

  private async generateDocumentAsync(report: ReportEntity): Promise<void> {
    // Configurar tema desde metadata del reporte
    const themeName =
      (report.metadata?.theme as string | undefined) || 'default'
    this.googleDocsService.setTheme(themeName)

    switch (report.reportType) {
      case ReportType.AUDIT_REPORT:
        await this.generateAuditReport(report)
        break
      case ReportType.COMPLIANCE_MATRIX:
        await this.generateComplianceMatrix(report)
        break
      case ReportType.ACTION_PLAN_SUMMARY:
        await this.generateActionPlanSummary(report)
        break
      case ReportType.EXECUTIVE_SUMMARY:
        await this.generateExecutiveSummary(report)
        break
      default:
        throw new Error(`Unknown report type: ${report.reportType as string}`)
    }

    await this.updateReportStatus(report.id, ReportStatus.COMPLETED)
  }

  private async generateAuditReport(report: ReportEntity): Promise<void> {
    if (!report.auditId) {
      throw new Error('Audit ID is required for audit reports')
    }

    // Obtener datos de la auditoría
    const audit = await this.auditsService.findOne(report.auditId)

    // Crear documento
    const { documentId, url } = await this.googleDocsService.createDocument(
      `Reporte de Auditoría - ${audit.name}`,
    )

    // Actualizar reporte con IDs
    report.googleDocId = documentId
    report.googleDocUrl = url
    await this.reportRepository.save(report)

    // Construir contenido del documento
    await this.buildAuditReportContent(documentId, audit)

    this.logger.log(`Audit report generated: ${documentId}`)
  }

  private async buildAuditReportContent(
    documentId: string,
    audit: AuditEntity,
  ): Promise<void> {
    // Obtener tema actual y estilos de tabla
    const theme = this.googleDocsService.getTheme()
    const tableStyle = this.googleDocsService.getTableStyleFromTheme()

    // 1. Título principal con color del tema
    await this.googleDocsService.appendText(
      documentId,
      'REPORTE DE AUDITORÍA',
      {
        fontSize: theme.sizes.h1,
        bold: true,
        color: theme.colors.primary,
        fontFamily: theme.fonts.heading,
        alignment: 'center',
      },
    )

    await this.googleDocsService.appendText(documentId, audit.name, {
      fontSize: theme.sizes.h2,
      bold: true,
      color: theme.colors.secondary,
      fontFamily: theme.fonts.heading,
      alignment: 'center',
    })

    // 2. Tabla de contenidos
    await this.googleDocsService.appendText(documentId, '\n')
    await this.googleDocsService.appendHeading(
      documentId,
      'Tabla de Contenidos',
      2,
    )
    await this.googleDocsService.insertTableOfContents(documentId, 1)

    // 3. Información General
    await this.googleDocsService.appendText(documentId, '\n')
    await this.googleDocsService.appendHeading(
      documentId,
      '1. Información General',
      2,
    )

    const generalInfoTable = {
      headers: ['Campo', 'Valor'],
      rows: [
        ['Organización', audit.organization?.name ?? 'N/A'],
        ['NIT', audit.organization?.nit ?? 'N/A'],
        ['Template', audit.template?.name ?? 'N/A'],
        ['Framework', audit.framework?.name ?? 'N/A'],
        ['Tipo de Auditoría', audit.auditType as string],
        ['Estado', audit.status as string],
        ['Fecha de Inicio', new Date(audit.startDate).toLocaleDateString()],
        [
          'Fecha de Fin',
          audit.endDate ? new Date(audit.endDate).toLocaleDateString() : 'N/A',
        ],
        ['Auditor Líder', audit.leadAuditor?.fullName ?? 'N/A'],
        ['Progreso', `${audit.progress}%`],
        ['Puntaje Total', audit.totalScore.toString()],
      ],
    }

    await this.googleDocsService.appendTable(
      documentId,
      generalInfoTable,
      tableStyle,
    )

    // 4. Equipo Auditor
    if (audit.auditTeam && audit.auditTeam.length > 0) {
      await this.googleDocsService.appendText(documentId, '\n')
      await this.googleDocsService.appendHeading(
        documentId,
        '2. Equipo Auditor',
        2,
      )

      const teamTable = {
        headers: ['Nombre', 'Email'],
        rows: audit.auditTeam.map((member) => [
          member.fullName ?? 'N/A',
          member.email ?? 'N/A',
        ]),
      }

      await this.googleDocsService.appendTable(
        documentId,
        teamTable,
        tableStyle,
      )
    }

    // 5. Resultados de Evaluaciones
    if (audit.evaluations && audit.evaluations.length > 0) {
      await this.googleDocsService.appendText(documentId, '\n')
      await this.googleDocsService.appendHeading(
        documentId,
        '3. Resultados de Evaluaciones',
        2,
      )

      const evaluationsTable = {
        headers: [
          'Norma',
          'Estado de Cumplimiento',
          'Nivel de Madurez',
          'Puntaje',
        ],
        rows: audit.evaluations.map((evaluation) => [
          evaluation.standard?.code ?? 'N/A',
          (evaluation.complianceStatus as string) ?? 'Pendiente',
          evaluation.maturityLevel?.name ?? 'N/A',
          evaluation.score?.toString() ?? '0',
        ]),
      }

      await this.googleDocsService.appendTable(
        documentId,
        evaluationsTable,
        tableStyle,
      )

      // 5.1 Resumen de Cumplimiento
      const totalEvaluations = audit.evaluations.length
      const completedEvaluations = audit.evaluations.filter(
        (e) => e.isCompleted,
      ).length
      const conformeEvaluations = audit.evaluations.filter(
        (e) => e.complianceStatus === ComplianceStatus.CONFORME,
      ).length
      const noConformeMenorEvaluations = audit.evaluations.filter(
        (e) => e.complianceStatus === ComplianceStatus.NO_CONFORME_MENOR,
      ).length
      const noConformeMayorEvaluations = audit.evaluations.filter(
        (e) => e.complianceStatus === ComplianceStatus.NO_CONFORME_MAYOR,
      ).length

      await this.googleDocsService.appendText(documentId, '\n')
      await this.googleDocsService.appendHeading(
        documentId,
        '3.1. Resumen de Cumplimiento',
        3,
      )

      const complianceSummaryTable = {
        headers: ['Categoría', 'Cantidad', 'Porcentaje'],
        rows: [
          ['Total de Evaluaciones', String(totalEvaluations), '100%'],
          [
            'Evaluaciones Completadas',
            String(completedEvaluations),
            `${Number(((completedEvaluations / totalEvaluations) * 100).toFixed(1))}%`,
          ],
          [
            'Conformes',
            String(conformeEvaluations),
            `${Number(((conformeEvaluations / completedEvaluations) * 100).toFixed(1))}%`,
          ],
          [
            'No Conformes Menores',
            String(noConformeMenorEvaluations),
            `${Number(((noConformeMenorEvaluations / completedEvaluations) * 100).toFixed(1))}%`,
          ],
          [
            'No Conformes Mayores',
            String(noConformeMayorEvaluations),
            `${Number(((noConformeMayorEvaluations / completedEvaluations) * 100).toFixed(1))}%`,
          ],
        ],
      }

      await this.googleDocsService.appendTable(
        documentId,
        complianceSummaryTable,
        tableStyle,
      )
    }

    // 6. Conclusiones
    await this.googleDocsService.appendText(documentId, '\n')
    await this.googleDocsService.appendHeading(documentId, '4. Conclusiones', 2)
    await this.googleDocsService.appendText(
      documentId,
      'Las conclusiones de esta auditoría se basarán en los hallazgos identificados durante el proceso de evaluación...',
      {
        fontSize: theme.sizes.body,
        color: theme.colors.text,
        fontFamily: theme.fonts.body,
      },
    )

    // 7. Recomendaciones
    await this.googleDocsService.appendText(documentId, '\n')
    await this.googleDocsService.appendHeading(
      documentId,
      '5. Recomendaciones',
      2,
    )
    await this.googleDocsService.appendText(
      documentId,
      'Se recomienda a la organización implementar las acciones correctivas necesarias para abordar las no conformidades identificadas...',
      {
        fontSize: theme.sizes.body,
        color: theme.colors.text,
        fontFamily: theme.fonts.body,
      },
    )
  }

  private async generateComplianceMatrix(report: ReportEntity): Promise<void> {
    if (!report.auditId) {
      throw new Error('Audit ID is required for compliance matrix')
    }

    const audit = await this.auditsService.findOne(report.auditId)

    const { documentId, url } = await this.googleDocsService.createDocument(
      `Matriz de Cumplimiento - ${audit.name}`,
    )

    report.googleDocId = documentId
    report.googleDocUrl = url
    await this.reportRepository.save(report)

    // TODO: Implementar contenido específico de matriz de cumplimiento
    await this.googleDocsService.appendHeading(
      documentId,
      'MATRIZ DE CUMPLIMIENTO',
      1,
    )

    this.logger.log(`Compliance matrix generated: ${documentId}`)
  }

  private async generateActionPlanSummary(report: ReportEntity): Promise<void> {
    if (!report.auditId) {
      throw new Error('Audit ID is required for action plan summary')
    }

    const audit = await this.auditsService.findOne(report.auditId)

    const { documentId, url } = await this.googleDocsService.createDocument(
      `Resumen de Planes de Acción - ${audit.name}`,
    )

    report.googleDocId = documentId
    report.googleDocUrl = url
    await this.reportRepository.save(report)

    // TODO: Implementar contenido específico de resumen de planes de acción
    await this.googleDocsService.appendHeading(
      documentId,
      'RESUMEN DE PLANES DE ACCIÓN',
      1,
    )

    this.logger.log(`Action plan summary generated: ${documentId}`)
  }

  private async generateExecutiveSummary(report: ReportEntity): Promise<void> {
    if (!report.auditId) {
      throw new Error('Audit ID is required for executive summary')
    }

    const audit = await this.auditsService.findOne(report.auditId)

    const { documentId, url } = await this.googleDocsService.createDocument(
      `Resumen Ejecutivo - ${audit.name}`,
    )

    report.googleDocId = documentId
    report.googleDocUrl = url
    await this.reportRepository.save(report)

    // TODO: Implementar contenido específico de resumen ejecutivo
    await this.googleDocsService.appendHeading(
      documentId,
      'RESUMEN EJECUTIVO',
      1,
    )

    this.logger.log(`Executive summary generated: ${documentId}`)
  }

  async shareReport(
    reportId: string,
    email: string,
    role: 'reader' | 'commenter' | 'writer' = 'reader',
  ): Promise<void> {
    const report = await this.findOne(reportId)

    if (!report.googleDocId) {
      throw new Error('Report document not yet generated')
    }

    await this.googleDocsService.shareDocument(report.googleDocId, email, role)
  }

  async findAll(): Promise<ReportEntity[]> {
    return await this.reportRepository.find({
      where: { isActive: true },
      relations: ['audit', 'generator'],
      order: { createdAt: 'DESC' },
    })
  }

  async findOne(id: string): Promise<ReportEntity> {
    const report = await this.reportRepository.findOne({
      where: { id, isActive: true },
      relations: ['audit', 'generator'],
    })

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`)
    }

    return report
  }

  async remove(id: string): Promise<void> {
    const report = await this.findOne(id)

    // Eliminar documento de Google
    if (report.googleDocId) {
      try {
        await this.googleDocsService.deleteDocument(report.googleDocId)
      } catch (error) {
        this.logger.warn(
          `Failed to delete Google Doc ${report.googleDocId}`,
          error,
        )
      }
    }

    report.isActive = false
    await this.reportRepository.save(report)
  }

  private async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    errorMessage?: string,
  ): Promise<void> {
    await this.reportRepository.update(reportId, {
      status,
      errorMessage: errorMessage || null,
    })
  }

  private generateTitle(reportType: ReportType): string {
    const titles = {
      [ReportType.AUDIT_REPORT]: 'Reporte de Auditoría',
      [ReportType.COMPLIANCE_MATRIX]: 'Matriz de Cumplimiento',
      [ReportType.ACTION_PLAN_SUMMARY]: 'Resumen de Planes de Acción',
      [ReportType.EXECUTIVE_SUMMARY]: 'Resumen Ejecutivo',
    }

    return titles[reportType] || 'Reporte'
  }
}
