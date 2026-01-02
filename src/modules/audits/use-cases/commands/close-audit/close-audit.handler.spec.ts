import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CloseAuditHandler } from './close-audit.handler'
import { CloseAuditCommand } from './close-audit.command'
import { AuditEntity, AuditStatus } from '../../../entities/audit.entity'
import { AuditClosureValidator } from '../../../validators/audit-closure.validator'

describe('CloseAuditHandler', () => {
  let handler: CloseAuditHandler
  let auditsRepository: jest.Mocked<Repository<AuditEntity>>
  let closureValidator: jest.Mocked<AuditClosureValidator>

  const mockAudit = {
    id: 'audit-123',
    name: 'Test Audit',
    status: AuditStatus.PENDING_CLOSURE,
    leadAuditorId: 'lead-auditor-123',
    closureApprovedAt: new Date('2025-01-01'),
    closureApprovedBy: 'lead-auditor-123',
    closureMetadata: {
      closedAt: new Date('2025-01-10'),
      closedBy: 'lead-auditor-123',
      totalEvaluations: 10,
      totalFindings: 10,
      nonConformitiesCount: {
        critical: 0,
        major: 2,
        minor: 1,
      },
      conformitiesPercentage: 70,
      requiresFollowUp: true,
    },
    isActive: true,
  } as AuditEntity

  const mockStatistics = {
    totalEvaluations: 10,
    totalFindings: 10,
    nonConformitiesCount: {
      critical: 0,
      major: 2,
      minor: 1,
    },
    conformitiesPercentage: 70,
    requiresFollowUp: true,
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloseAuditHandler,
        {
          provide: getRepositoryToken(AuditEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: AuditClosureValidator,
          useValue: {
            validateClosure: jest.fn(),
            calculateClosureStatistics: jest.fn(),
          },
        },
      ],
    }).compile()

    handler = module.get<CloseAuditHandler>(CloseAuditHandler)
    auditsRepository = module.get(getRepositoryToken(AuditEntity))
    closureValidator = module.get(AuditClosureValidator)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    it('should close an audit successfully', async () => {
      // Arrange
      const command = new CloseAuditCommand(
        'audit-123',
        'lead-auditor-123',
        'https://storage.com/report-final.pdf',
      )

      auditsRepository.findOne.mockResolvedValue(mockAudit)
      closureValidator.validateClosure.mockResolvedValue(undefined)
      closureValidator.calculateClosureStatistics.mockResolvedValue(
        mockStatistics,
      )

      const expectedAudit = {
        ...mockAudit,
        status: AuditStatus.CLOSED,
        closureMetadata: {
          ...mockStatistics,
          closedAt: expect.any(Date),
          closedBy: command.closedBy,
          reportUrl: command.reportUrl,
        },
      }

      auditsRepository.save.mockResolvedValue(expectedAudit)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(result.status).toBe(AuditStatus.CLOSED)
      expect(result.closureMetadata?.reportUrl).toBe(command.reportUrl)
      expect(closureValidator.validateClosure).toHaveBeenCalledWith(
        command.auditId,
      )
      expect(closureValidator.calculateClosureStatistics).toHaveBeenCalledWith(
        command.auditId,
      )
      expect(auditsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditStatus.CLOSED,
        }),
      )
    })

    it('should fail if audit is not found', async () => {
      // Arrange
      const command = new CloseAuditCommand(
        'non-existent-audit',
        'lead-auditor-123',
      )

      auditsRepository.findOne.mockResolvedValue(null)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException)
      await expect(handler.execute(command)).rejects.toThrow(
        'Auditoría non-existent-audit no encontrada',
      )
      expect(closureValidator.validateClosure).not.toHaveBeenCalled()
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should fail if audit is not in PENDING_CLOSURE status', async () => {
      // Arrange
      const command = new CloseAuditCommand('audit-123', 'lead-auditor-123')

      const auditInProgress = {
        ...mockAudit,
        status: AuditStatus.IN_PROGRESS,
      }

      auditsRepository.findOne.mockResolvedValue(auditInProgress)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      )
      await expect(handler.execute(command)).rejects.toThrow(
        'Solo se pueden cerrar auditorías en estado PENDING_CLOSURE',
      )
      expect(closureValidator.validateClosure).not.toHaveBeenCalled()
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should fail if user is not the lead auditor', async () => {
      // Arrange
      const command = new CloseAuditCommand('audit-123', 'unauthorized-user')

      auditsRepository.findOne.mockResolvedValue(mockAudit)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ForbiddenException)
      await expect(handler.execute(command)).rejects.toThrow(
        'Solo el lead auditor puede cerrar la auditoría',
      )
      expect(closureValidator.validateClosure).not.toHaveBeenCalled()
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should fail if closure is not approved', async () => {
      // Arrange
      const command = new CloseAuditCommand('audit-123', 'lead-auditor-123')

      const auditWithoutApproval = {
        ...mockAudit,
        closureApprovedAt: null,
        closureApprovedBy: null,
      }

      auditsRepository.findOne.mockResolvedValue(auditWithoutApproval)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      )
      await expect(handler.execute(command)).rejects.toThrow(
        'El lead auditor debe aprobar el cierre antes de cerrar la auditoría',
      )
      expect(closureValidator.validateClosure).not.toHaveBeenCalled()
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should fail if validations do not pass', async () => {
      // Arrange
      const command = new CloseAuditCommand('audit-123', 'lead-auditor-123')

      auditsRepository.findOne.mockResolvedValue(mockAudit)

      const validationError = new Error('Hay evaluaciones sin completar')
      validationError.name = 'AuditCannotBeClosedException'
      closureValidator.validateClosure.mockRejectedValue(validationError)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      )
      await expect(handler.execute(command)).rejects.toThrow(
        'No se puede cerrar la auditoría',
      )
      expect(closureValidator.validateClosure).toHaveBeenCalled()
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should set endDate if not already set', async () => {
      // Arrange
      const command = new CloseAuditCommand('audit-123', 'lead-auditor-123')

      const auditWithoutEndDate = {
        ...mockAudit,
        endDate: null,
      }

      auditsRepository.findOne.mockResolvedValue(auditWithoutEndDate)
      closureValidator.validateClosure.mockResolvedValue(undefined)
      closureValidator.calculateClosureStatistics.mockResolvedValue(
        mockStatistics,
      )

      auditsRepository.save.mockImplementation((audit) =>
        Promise.resolve(audit),
      )

      // Act
      await handler.execute(command)

      // Assert
      expect(auditsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          endDate: expect.any(Date),
        }),
      )
    })

    it('should preserve reportUrl from metadata if not provided in command', async () => {
      // Arrange
      const command = new CloseAuditCommand('audit-123', 'lead-auditor-123') // No reportUrl

      const auditWithReportUrl = {
        ...mockAudit,
        closureMetadata: {
          ...mockAudit.closureMetadata,
          reportUrl: 'https://storage.com/report-preliminary.pdf',
        },
      }

      auditsRepository.findOne.mockResolvedValue(auditWithReportUrl)
      closureValidator.validateClosure.mockResolvedValue(undefined)
      closureValidator.calculateClosureStatistics.mockResolvedValue(
        mockStatistics,
      )

      auditsRepository.save.mockImplementation((audit) =>
        Promise.resolve(audit),
      )

      // Act
      await handler.execute(command)

      // Assert
      expect(auditsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          closureMetadata: expect.objectContaining({
            reportUrl: 'https://storage.com/report-preliminary.pdf',
          }),
        }),
      )
    })

    it('should calculate fresh statistics at closure time', async () => {
      // Arrange
      const command = new CloseAuditCommand('audit-123', 'lead-auditor-123')

      auditsRepository.findOne.mockResolvedValue(mockAudit)
      closureValidator.validateClosure.mockResolvedValue(undefined)

      const newStatistics = {
        ...mockStatistics,
        totalEvaluations: 15,
        conformitiesPercentage: 80,
      }

      closureValidator.calculateClosureStatistics.mockResolvedValue(
        newStatistics,
      )

      auditsRepository.save.mockImplementation((audit) =>
        Promise.resolve(audit),
      )

      // Act
      await handler.execute(command)

      // Assert
      expect(closureValidator.calculateClosureStatistics).toHaveBeenCalledWith(
        command.auditId,
      )
      expect(auditsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          closureMetadata: expect.objectContaining({
            totalEvaluations: 15,
            conformitiesPercentage: 80,
          }),
        }),
      )
    })
  })
})
