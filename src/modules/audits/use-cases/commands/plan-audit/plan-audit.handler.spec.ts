import { NotFoundException, BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PlanAuditHandler } from './plan-audit.handler'
import { PlanAuditCommand } from './plan-audit.command'
import { AuditEntity, AuditStatus } from '../../../entities/audit.entity'
import { UserEntity } from '@users/entities/user.entity'

describe('PlanAuditHandler', () => {
  let handler: PlanAuditHandler
  let auditsRepository: jest.Mocked<Repository<AuditEntity>>
  let usersRepository: jest.Mocked<Repository<UserEntity>>

  const mockAudit = {
    id: 'audit-123',
    name: 'Test Audit',
    status: AuditStatus.DRAFT,
    templateId: 'template-123',
    frameworkId: 'framework-123',
    organizationId: 'org-123',
    isActive: true,
    auditTeam: [],
  } as AuditEntity

  const mockLeadAuditor = {
    id: 'lead-auditor-123',
    names: 'John',
    lastNames: 'Doe',
    email: 'john@example.com',
    isActive: true,
  } as UserEntity

  const mockAuditors = [
    {
      id: 'auditor-1',
      names: 'Jane',
      lastNames: 'Smith',
      email: 'jane@example.com',
      isActive: true,
    },
    {
      id: 'auditor-2',
      names: 'Bob',
      lastNames: 'Johnson',
      email: 'bob@example.com',
      isActive: true,
    },
  ] as UserEntity[]

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanAuditHandler,
        {
          provide: getRepositoryToken(AuditEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile()

    handler = module.get<PlanAuditHandler>(PlanAuditHandler)
    auditsRepository = module.get(getRepositoryToken(AuditEntity))
    usersRepository = module.get(getRepositoryToken(UserEntity))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    it('should plan an audit successfully', async () => {
      // Arrange
      const command = new PlanAuditCommand(
        'audit-123',
        'lead-auditor-123',
        ['auditor-1', 'auditor-2'],
        new Date('2025-02-01'),
        new Date('2025-02-28'),
        'ISO 27001 Controls Audit',
      )

      auditsRepository.findOne.mockResolvedValue(mockAudit)
      usersRepository.findOne.mockResolvedValue(mockLeadAuditor)
      usersRepository.find.mockResolvedValue(mockAuditors)

      const expectedAudit = {
        ...mockAudit,
        status: AuditStatus.PLANNED,
        leadAuditorId: command.leadAuditorId,
        auditTeam: mockAuditors,
        startDate: command.scheduledStartDate,
        endDate: command.scheduledEndDate,
        scope: command.scope,
      }

      auditsRepository.save.mockResolvedValue(expectedAudit)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(result.status).toBe(AuditStatus.PLANNED)
      expect(result.leadAuditorId).toBe(command.leadAuditorId)
      expect(result.scope).toBe(command.scope)
      expect(auditsRepository.findOne).toHaveBeenCalledWith({
        where: { id: command.auditId, isActive: true },
        relations: ['auditTeam'],
      })
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: command.leadAuditorId, isActive: true },
      })
      expect(usersRepository.find).toHaveBeenCalled()
      expect(auditsRepository.save).toHaveBeenCalled()
    })

    it('should fail if audit is not found', async () => {
      // Arrange
      const command = new PlanAuditCommand(
        'non-existent-audit',
        'lead-auditor-123',
        ['auditor-1'],
        new Date('2025-02-01'),
        new Date('2025-02-28'),
        'Test Scope',
      )

      auditsRepository.findOne.mockResolvedValue(null)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException)
      await expect(handler.execute(command)).rejects.toThrow(
        'Auditoría non-existent-audit no encontrada',
      )
      expect(usersRepository.findOne).not.toHaveBeenCalled()
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should fail if audit is not in DRAFT status', async () => {
      // Arrange
      const command = new PlanAuditCommand(
        'audit-123',
        'lead-auditor-123',
        ['auditor-1'],
        new Date('2025-02-01'),
        new Date('2025-02-28'),
        'Test Scope',
      )

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
        'Solo se pueden planificar auditorías en estado DRAFT',
      )
      expect(usersRepository.findOne).not.toHaveBeenCalled()
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should fail if end date is before start date', async () => {
      // Arrange
      const command = new PlanAuditCommand(
        'audit-123',
        'lead-auditor-123',
        ['auditor-1'],
        new Date('2025-02-28'),
        new Date('2025-02-01'), // End before start
        'Test Scope',
      )

      const auditInDraft = { ...mockAudit, status: AuditStatus.DRAFT }
      auditsRepository.findOne.mockResolvedValue(auditInDraft)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      )
      await expect(handler.execute(command)).rejects.toThrow(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      )
      expect(usersRepository.findOne).not.toHaveBeenCalled()
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should fail if lead auditor is not found', async () => {
      // Arrange
      const command = new PlanAuditCommand(
        'audit-123',
        'non-existent-lead',
        ['auditor-1'],
        new Date('2025-02-01'),
        new Date('2025-02-28'),
        'Test Scope',
      )

      const auditInDraft = { ...mockAudit, status: AuditStatus.DRAFT }
      auditsRepository.findOne.mockResolvedValue(auditInDraft)
      usersRepository.findOne.mockResolvedValue(null)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException)
      await expect(handler.execute(command)).rejects.toThrow(
        'Lead auditor non-existent-lead no encontrado',
      )
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should fail if no auditors are assigned', async () => {
      // Arrange
      const command = new PlanAuditCommand(
        'audit-123',
        'lead-auditor-123',
        [], // No auditors
        new Date('2025-02-01'),
        new Date('2025-02-28'),
        'Test Scope',
      )

      const auditInDraft = { ...mockAudit, status: AuditStatus.DRAFT }
      auditsRepository.findOne.mockResolvedValue(auditInDraft)
      usersRepository.findOne.mockResolvedValue(mockLeadAuditor)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      )
      await expect(handler.execute(command)).rejects.toThrow(
        'Debe asignar al menos 1 auditor adicional al equipo',
      )
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should fail if some auditors are not found', async () => {
      // Arrange
      const command = new PlanAuditCommand(
        'audit-123',
        'lead-auditor-123',
        ['auditor-1', 'auditor-2', 'non-existent-auditor'],
        new Date('2025-02-01'),
        new Date('2025-02-28'),
        'Test Scope',
      )

      const auditInDraft = { ...mockAudit, status: AuditStatus.DRAFT }
      auditsRepository.findOne.mockResolvedValue(auditInDraft)
      usersRepository.findOne.mockResolvedValue(mockLeadAuditor)
      usersRepository.find.mockResolvedValue(mockAuditors) // Only 2 auditors found

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      )
      await expect(handler.execute(command)).rejects.toThrow(
        'Algunos auditores no fueron encontrados o están inactivos',
      )
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should fail if scope is empty', async () => {
      // Arrange
      const command = new PlanAuditCommand(
        'audit-123',
        'lead-auditor-123',
        ['auditor-1'],
        new Date('2025-02-01'),
        new Date('2025-02-28'),
        '   ', // Empty/whitespace scope
      )

      const auditInDraft = { ...mockAudit, status: AuditStatus.DRAFT }
      auditsRepository.findOne.mockResolvedValue(auditInDraft)
      usersRepository.findOne.mockResolvedValue(mockLeadAuditor)
      usersRepository.find.mockResolvedValue([mockAuditors[0]])

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      )
      await expect(handler.execute(command)).rejects.toThrow(
        'El alcance de la auditoría es requerido',
      )
      expect(auditsRepository.save).not.toHaveBeenCalled()
    })

    it('should update organizationId if provided', async () => {
      // Arrange
      const newOrgId = 'new-org-456'
      const command = new PlanAuditCommand(
        'audit-123',
        'lead-auditor-123',
        ['auditor-1'],
        new Date('2025-02-01'),
        new Date('2025-02-28'),
        'Test Scope',
        newOrgId,
      )

      const auditInDraft = { ...mockAudit, status: AuditStatus.DRAFT }
      auditsRepository.findOne.mockResolvedValue(auditInDraft)
      usersRepository.findOne.mockResolvedValue(mockLeadAuditor)
      usersRepository.find.mockResolvedValue([mockAuditors[0]])

      const expectedAudit = {
        ...mockAudit,
        status: AuditStatus.PLANNED,
        organizationId: newOrgId,
      }

      auditsRepository.save.mockResolvedValue(expectedAudit)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(result.organizationId).toBe(newOrgId)
      expect(auditsRepository.save).toHaveBeenCalled()
    })
  })
})
