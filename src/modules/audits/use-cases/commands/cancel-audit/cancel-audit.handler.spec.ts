import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CancelAuditHandler } from './cancel-audit.handler'
import { CancelAuditCommand } from './cancel-audit.command'
import { AuditEntity, AuditStatus } from '../../../entities/audit.entity'

describe('CancelAuditHandler', () => {
  let handler: CancelAuditHandler
  let auditsRepository: jest.Mocked<Repository<AuditEntity>>

  const mockAudit = {
    id: 'audit-123',
    name: 'Test Audit',
    status: AuditStatus.IN_PROGRESS,
    leadAuditorId: 'lead-auditor-123',
    isActive: true,
  } as AuditEntity

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancelAuditHandler,
        {
          provide: getRepositoryToken(AuditEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile()

    handler = module.get<CancelAuditHandler>(CancelAuditHandler)
    auditsRepository = module.get(getRepositoryToken(AuditEntity))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    it('should cancel an audit successfully', async () => {
      // Arrange
      const command = new CancelAuditCommand(
        'audit-123',
        'lead-auditor-123',
        'Client requirements changed',
      )

      auditsRepository.findOne.mockResolvedValue(mockAudit)

      const expectedAudit = {
        ...mockAudit,
        status: AuditStatus.CANCELLED,
        cancellationMetadata: {
          cancelledAt: expect.any(Date),
          cancelledBy: command.cancelledBy,
          cancellationReason: command.cancellationReason,
          previousStatus: AuditStatus.IN_PROGRESS,
        },
      }

      auditsRepository.save.mockResolvedValue(expectedAudit)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(result.status).toBe(AuditStatus.CANCELLED)
      expect(result.cancellationMetadata).toEqual(
        expect.objectContaining({
          cancelledBy: command.cancelledBy,
          cancellationReason: command.cancellationReason,
          previousStatus: AuditStatus.IN_PROGRESS,
        }),
      )
      expect(auditsRepository.save).toHaveBeenCalled()
    })

    it('should fail if audit is not found', async () => {
      // Arrange
      const command = new CancelAuditCommand(
        'non-existent-audit',
        'lead-auditor-123',
        'Reason',
      )

      auditsRepository.findOne.mockResolvedValue(null)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException)
      await expect(handler.execute(command)).rejects.toThrow(
        'Auditoría non-existent-audit no encontrada',
      )
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should fail if audit is already closed', async () => {
      // Arrange
      const command = new CancelAuditCommand(
        'audit-123',
        'lead-auditor-123',
        'Reason',
      )

      const closedAudit = {
        ...mockAudit,
        status: AuditStatus.CLOSED,
      }

      auditsRepository.findOne.mockResolvedValue(closedAudit)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      )
      await expect(handler.execute(command)).rejects.toThrow(
        'No se pueden cancelar auditorías ya cerradas',
      )
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should fail if audit is already cancelled', async () => {
      // Arrange
      const command = new CancelAuditCommand(
        'audit-123',
        'lead-auditor-123',
        'Reason',
      )

      const cancelledAudit = {
        ...mockAudit,
        status: AuditStatus.CANCELLED,
      }

      auditsRepository.findOne.mockResolvedValue(cancelledAudit)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      )
      await expect(handler.execute(command)).rejects.toThrow(
        'La auditoría ya está cancelada',
      )
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should fail if user is not the lead auditor', async () => {
      // Arrange
      const command = new CancelAuditCommand(
        'audit-123',
        'unauthorized-user',
        'Reason',
      )

      auditsRepository.findOne.mockResolvedValue(mockAudit)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ForbiddenException)
      await expect(handler.execute(command)).rejects.toThrow(
        'Solo el lead auditor puede cancelar la auditoría',
      )
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should fail if cancellation reason is empty', async () => {
      // Arrange
      const command = new CancelAuditCommand(
        'audit-123',
        'lead-auditor-123',
        '   ',
      )

      auditsRepository.findOne.mockResolvedValue(mockAudit)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      )
      await expect(handler.execute(command)).rejects.toThrow(
        'La razón de cancelación es obligatoria',
      )
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should cancel audit from DRAFT status', async () => {
      // Arrange
      const command = new CancelAuditCommand(
        'audit-123',
        'lead-auditor-123',
        'Reason',
      )

      const draftAudit = {
        ...mockAudit,
        status: AuditStatus.DRAFT,
      }

      auditsRepository.findOne.mockResolvedValue(draftAudit)

      auditsRepository.save.mockImplementation((audit) =>
        Promise.resolve(audit),
      )

      // Act
      await handler.execute(command)

      // Assert
      expect(auditsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditStatus.CANCELLED,
          cancellationMetadata: expect.objectContaining({
            previousStatus: AuditStatus.DRAFT,
          }),
        }),
      )
    })

    it('should cancel audit from PLANNED status', async () => {
      // Arrange
      const command = new CancelAuditCommand(
        'audit-123',
        'lead-auditor-123',
        'Reason',
      )

      const plannedAudit = {
        ...mockAudit,
        status: AuditStatus.PLANNED,
      }

      auditsRepository.findOne.mockResolvedValue(plannedAudit)

      auditsRepository.save.mockImplementation((audit) =>
        Promise.resolve(audit),
      )

      // Act
      await handler.execute(command)

      // Assert
      expect(auditsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditStatus.CANCELLED,
          cancellationMetadata: expect.objectContaining({
            previousStatus: AuditStatus.PLANNED,
          }),
        }),
      )
    })

    it('should cancel audit from PENDING_CLOSURE status', async () => {
      // Arrange
      const command = new CancelAuditCommand(
        'audit-123',
        'lead-auditor-123',
        'Reason',
      )

      const pendingClosureAudit = {
        ...mockAudit,
        status: AuditStatus.PENDING_CLOSURE,
      }

      auditsRepository.findOne.mockResolvedValue(pendingClosureAudit)

      auditsRepository.save.mockImplementation((audit) =>
        Promise.resolve(audit),
      )

      // Act
      await handler.execute(command)

      // Assert
      expect(auditsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditStatus.CANCELLED,
          cancellationMetadata: expect.objectContaining({
            previousStatus: AuditStatus.PENDING_CLOSURE,
          }),
        }),
      )
    })

    it('should preserve cancellation timestamp', async () => {
      // Arrange
      const command = new CancelAuditCommand(
        'audit-123',
        'lead-auditor-123',
        'Reason',
      )

      auditsRepository.findOne.mockResolvedValue(mockAudit)

      let savedAudit: any
      auditsRepository.save.mockImplementation((audit) => {
        savedAudit = audit
        return Promise.resolve(audit)
      })

      // Act
      await handler.execute(command)

      // Assert
      expect(savedAudit.cancellationMetadata.cancelledAt).toBeInstanceOf(Date)
      expect(
        savedAudit.cancellationMetadata.cancelledAt.getTime(),
      ).toBeLessThanOrEqual(Date.now())
    })
  })
})
