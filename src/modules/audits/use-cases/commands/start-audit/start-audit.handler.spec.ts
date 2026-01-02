import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { StartAuditHandler } from './start-audit.handler'
import { StartAuditCommand } from './start-audit.command'
import { AuditEntity, AuditStatus } from '../../../entities/audit.entity'

describe('StartAuditHandler', () => {
  let handler: StartAuditHandler
  let auditsRepository: jest.Mocked<Repository<AuditEntity>>

  const mockAudit = {
    id: 'audit-123',
    name: 'Test Audit',
    status: AuditStatus.PLANNED,
    leadAuditorId: 'lead-auditor-123',
    isActive: true,
  } as AuditEntity

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartAuditHandler,
        {
          provide: getRepositoryToken(AuditEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile()

    handler = module.get<StartAuditHandler>(StartAuditHandler)
    auditsRepository = module.get(getRepositoryToken(AuditEntity))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    it('should start an audit successfully', async () => {
      // Arrange
      const command = new StartAuditCommand('audit-123', 'lead-auditor-123')

      auditsRepository.findOne.mockResolvedValue(mockAudit)

      const expectedAudit = {
        ...mockAudit,
        status: AuditStatus.IN_PROGRESS,
      }

      auditsRepository.save.mockResolvedValue(expectedAudit)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(result.status).toBe(AuditStatus.IN_PROGRESS)
      expect(auditsRepository.findOne).toHaveBeenCalledWith({
        where: { id: command.auditId, isActive: true },
      })
      expect(auditsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditStatus.IN_PROGRESS,
        }),
      )
    })

    it('should fail if audit is not found', async () => {
      // Arrange
      const command = new StartAuditCommand(
        'non-existent-audit',
        'lead-auditor-123',
      )

      auditsRepository.findOne.mockResolvedValue(null)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException)
      await expect(handler.execute(command)).rejects.toThrow(
        'Auditoría non-existent-audit no encontrada',
      )
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should fail if audit is not in PLANNED status', async () => {
      // Arrange
      const command = new StartAuditCommand('audit-123', 'lead-auditor-123')

      const auditInDraft = {
        ...mockAudit,
        status: AuditStatus.DRAFT,
      }

      auditsRepository.findOne.mockResolvedValue(auditInDraft)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      )
      await expect(handler.execute(command)).rejects.toThrow(
        'Solo se pueden iniciar auditorías en estado PLANNED',
      )
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should fail if user is not the lead auditor', async () => {
      // Arrange
      const command = new StartAuditCommand('audit-123', 'unauthorized-user')

      auditsRepository.findOne.mockResolvedValue(mockAudit)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ForbiddenException)
      await expect(handler.execute(command)).rejects.toThrow(
        'Solo el lead auditor puede iniciar la auditoría',
      )
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should fail if trying to start an already started audit', async () => {
      // Arrange
      const command = new StartAuditCommand('audit-123', 'lead-auditor-123')

      const auditAlreadyInProgress = {
        ...mockAudit,
        status: AuditStatus.IN_PROGRESS,
      }

      auditsRepository.findOne.mockResolvedValue(auditAlreadyInProgress)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      )
      await expect(handler.execute(command)).rejects.toThrow(
        'Solo se pueden iniciar auditorías en estado PLANNED',
      )
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should fail if trying to start a closed audit', async () => {
      // Arrange
      const command = new StartAuditCommand('audit-123', 'lead-auditor-123')

      const closedAudit = {
        ...mockAudit,
        status: AuditStatus.CLOSED,
      }

      auditsRepository.findOne.mockResolvedValue(closedAudit)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      )
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })
  })
})
