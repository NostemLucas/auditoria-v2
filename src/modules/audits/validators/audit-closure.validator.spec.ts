import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {
  AuditClosureValidator,
  AuditCannotBeClosedException,
} from './audit-closure.validator'
import { AuditEntity } from '../entities/audit.entity'
import {
  EvaluationEntity,
  ComplianceStatus,
} from '../entities/evaluation.entity'
import { ActionPlanEntity } from '../entities/action-plan.entity'

describe('AuditClosureValidator', () => {
  let validator: AuditClosureValidator
  let _auditsRepository: jest.Mocked<Repository<AuditEntity>>
  let evaluationsRepository: jest.Mocked<Repository<EvaluationEntity>>
  let _actionPlansRepository: jest.Mocked<Repository<ActionPlanEntity>>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditClosureValidator,
        {
          provide: getRepositoryToken(AuditEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EvaluationEntity),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ActionPlanEntity),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile()

    validator = module.get<AuditClosureValidator>(AuditClosureValidator)
    _auditsRepository = module.get(getRepositoryToken(AuditEntity))
    evaluationsRepository = module.get(getRepositoryToken(EvaluationEntity))
    _actionPlansRepository = module.get(getRepositoryToken(ActionPlanEntity))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('validateEvaluationsComplete', () => {
    it('should pass if all evaluations are completed', async () => {
      // Arrange
      const completedEvaluations = [
        { id: 'eval-1', isCompleted: true, isActive: true },
        { id: 'eval-2', isCompleted: true, isActive: true },
        { id: 'eval-3', isCompleted: true, isActive: true },
      ] as EvaluationEntity[]

      evaluationsRepository.find.mockResolvedValue(completedEvaluations)

      // Act & Assert
      await expect(
        validator.validateEvaluationsComplete('audit-123'),
      ).resolves.toBe(true)
    })

    it('should fail if there are no evaluations', async () => {
      // Arrange
      evaluationsRepository.find.mockResolvedValue([])

      // Act & Assert
      await expect(
        validator.validateEvaluationsComplete('audit-123'),
      ).rejects.toThrow(AuditCannotBeClosedException)
      await expect(
        validator.validateEvaluationsComplete('audit-123'),
      ).rejects.toThrow('No hay evaluaciones registradas')
    })

    it('should fail if some evaluations are incomplete', async () => {
      // Arrange
      const mixedEvaluations = [
        { id: 'eval-1', isCompleted: true, isActive: true },
        { id: 'eval-2', isCompleted: false, isActive: true },
        { id: 'eval-3', isCompleted: false, isActive: true },
      ] as EvaluationEntity[]

      evaluationsRepository.find.mockResolvedValue(mixedEvaluations)

      // Act & Assert
      await expect(
        validator.validateEvaluationsComplete('audit-123'),
      ).rejects.toThrow(AuditCannotBeClosedException)
      await expect(
        validator.validateEvaluationsComplete('audit-123'),
      ).rejects.toThrow('Hay 2 evaluaciones sin completar')
    })
  })

  describe('validateFindingsClassified', () => {
    it('should pass if all findings are classified', async () => {
      // Arrange
      const classifiedEvaluations = [
        {
          id: 'eval-1',
          complianceStatus: ComplianceStatus.CONFORME,
          isActive: true,
        },
        {
          id: 'eval-2',
          complianceStatus: ComplianceStatus.NO_CONFORME_MAYOR,
          isActive: true,
        },
        {
          id: 'eval-3',
          complianceStatus: ComplianceStatus.OBSERVACION,
          isActive: true,
        },
      ] as EvaluationEntity[]

      evaluationsRepository.find.mockResolvedValue(classifiedEvaluations)

      // Act & Assert
      await expect(
        validator.validateFindingsClassified('audit-123'),
      ).resolves.toBe(true)
    })

    it('should fail if some findings are unclassified', async () => {
      // Arrange
      const unclassifiedEvaluations = [
        {
          id: 'eval-1',
          complianceStatus: ComplianceStatus.CONFORME,
          isActive: true,
        },
        { id: 'eval-2', complianceStatus: null, isActive: true },
        { id: 'eval-3', complianceStatus: null, isActive: true },
      ] as EvaluationEntity[]

      evaluationsRepository.find.mockResolvedValue(unclassifiedEvaluations)

      // Act & Assert
      await expect(
        validator.validateFindingsClassified('audit-123'),
      ).rejects.toThrow(AuditCannotBeClosedException)
      await expect(
        validator.validateFindingsClassified('audit-123'),
      ).rejects.toThrow(
        'Hay 2 evaluaciones sin clasificar su estado de conformidad',
      )
    })
  })

  describe('validateActionPlans', () => {
    it('should pass if all major non-conformities have action plans', async () => {
      // Arrange
      const nonConformitiesWithPlans = [
        {
          id: 'eval-1',
          complianceStatus: ComplianceStatus.NO_CONFORME_MAYOR,
          isActive: true,
          actionPlans: [{ id: 'plan-1', status: 'aprobado' }],
        },
        {
          id: 'eval-2',
          complianceStatus: ComplianceStatus.NO_CONFORME_MAYOR,
          isActive: true,
          actionPlans: [{ id: 'plan-2', status: 'en_progreso' }],
        },
      ] as EvaluationEntity[]

      evaluationsRepository.find.mockResolvedValue(nonConformitiesWithPlans)

      // Act & Assert
      await expect(validator.validateActionPlans('audit-123')).resolves.toBe(
        true,
      )
    })

    it('should fail if major non-conformities lack action plans', async () => {
      // Arrange
      const nonConformitiesWithoutPlans = [
        {
          id: 'eval-1',
          complianceStatus: ComplianceStatus.NO_CONFORME_MAYOR,
          isActive: true,
          actionPlans: [],
        },
        {
          id: 'eval-2',
          complianceStatus: ComplianceStatus.NO_CONFORME_MAYOR,
          isActive: true,
          actionPlans: null,
        },
      ] as EvaluationEntity[]

      evaluationsRepository.find.mockResolvedValue(nonConformitiesWithoutPlans)

      // Act & Assert
      await expect(validator.validateActionPlans('audit-123')).rejects.toThrow(
        AuditCannotBeClosedException,
      )
      await expect(validator.validateActionPlans('audit-123')).rejects.toThrow(
        'Hay 2 no conformidades MAYORES sin plan de acción aprobado',
      )
    })

    it('should fail if action plans are not approved or in progress', async () => {
      // Arrange
      const nonConformitiesWithDraftPlans = [
        {
          id: 'eval-1',
          complianceStatus: ComplianceStatus.NO_CONFORME_MAYOR,
          isActive: true,
          actionPlans: [{ id: 'plan-1', status: 'borrador' }],
        },
      ] as EvaluationEntity[]

      evaluationsRepository.find.mockResolvedValue(
        nonConformitiesWithDraftPlans,
      )

      // Act & Assert
      await expect(validator.validateActionPlans('audit-123')).rejects.toThrow(
        AuditCannotBeClosedException,
      )
    })

    it('should pass if there are no major non-conformities', async () => {
      // Arrange
      evaluationsRepository.find.mockResolvedValue([])

      // Act & Assert
      await expect(validator.validateActionPlans('audit-123')).resolves.toBe(
        true,
      )
    })
  })

  describe('calculateClosureStatistics', () => {
    it('should calculate statistics correctly', async () => {
      // Arrange
      const evaluations = [
        {
          id: 'eval-1',
          complianceStatus: ComplianceStatus.CONFORME,
          isActive: true,
        },
        {
          id: 'eval-2',
          complianceStatus: ComplianceStatus.CONFORME,
          isActive: true,
        },
        {
          id: 'eval-3',
          complianceStatus: ComplianceStatus.NO_CONFORME_MAYOR,
          isActive: true,
        },
        {
          id: 'eval-4',
          complianceStatus: ComplianceStatus.NO_CONFORME_MAYOR,
          isActive: true,
        },
        {
          id: 'eval-5',
          complianceStatus: ComplianceStatus.NO_CONFORME_MENOR,
          isActive: true,
        },
        {
          id: 'eval-6',
          complianceStatus: ComplianceStatus.OBSERVACION,
          isActive: true,
        },
        {
          id: 'eval-7',
          complianceStatus: ComplianceStatus.NO_APLICA,
          isActive: true,
        },
      ] as EvaluationEntity[]

      evaluationsRepository.find.mockResolvedValue(evaluations)

      // Act
      const result = await validator.calculateClosureStatistics('audit-123')

      // Assert
      expect(result).toEqual({
        totalEvaluations: 7,
        totalFindings: 7,
        nonConformitiesCount: {
          critical: 0,
          major: 2,
          minor: 1,
        },
        conformitiesPercentage: 28.57, // 2 conforme de 7 total = 28.57%
        requiresFollowUp: true, // Tiene NC mayores
      })
    })

    it('should calculate 100% conformity when all are conforming', async () => {
      // Arrange
      const evaluations = [
        {
          id: 'eval-1',
          complianceStatus: ComplianceStatus.CONFORME,
          isActive: true,
        },
        {
          id: 'eval-2',
          complianceStatus: ComplianceStatus.CONFORME,
          isActive: true,
        },
        {
          id: 'eval-3',
          complianceStatus: ComplianceStatus.CONFORME,
          isActive: true,
        },
      ] as EvaluationEntity[]

      evaluationsRepository.find.mockResolvedValue(evaluations)

      // Act
      const result = await validator.calculateClosureStatistics('audit-123')

      // Assert
      expect(result.conformitiesPercentage).toBe(100)
      expect(result.requiresFollowUp).toBe(false)
    })

    it('should handle empty evaluations', async () => {
      // Arrange
      evaluationsRepository.find.mockResolvedValue([])

      // Act
      const result = await validator.calculateClosureStatistics('audit-123')

      // Assert
      expect(result).toEqual({
        totalEvaluations: 0,
        totalFindings: 0,
        nonConformitiesCount: {
          critical: 0,
          major: 0,
          minor: 0,
        },
        conformitiesPercentage: 0,
        requiresFollowUp: false,
      })
    })

    it('should require follow-up if there are minor non-conformities', async () => {
      // Arrange
      const evaluations = [
        {
          id: 'eval-1',
          complianceStatus: ComplianceStatus.CONFORME,
          isActive: true,
        },
        {
          id: 'eval-2',
          complianceStatus: ComplianceStatus.NO_CONFORME_MENOR,
          isActive: true,
        },
      ] as EvaluationEntity[]

      evaluationsRepository.find.mockResolvedValue(evaluations)

      // Act
      const result = await validator.calculateClosureStatistics('audit-123')

      // Assert
      expect(result.requiresFollowUp).toBe(true)
      expect(result.nonConformitiesCount.minor).toBe(1)
    })
  })

  describe('validateClosure', () => {
    it('should pass all validations for a valid audit', async () => {
      // Arrange
      const completedEvaluations = [
        {
          id: 'eval-1',
          isCompleted: true,
          complianceStatus: ComplianceStatus.CONFORME,
          isActive: true,
        },
        {
          id: 'eval-2',
          isCompleted: true,
          complianceStatus: ComplianceStatus.NO_CONFORME_MAYOR,
          isActive: true,
          actionPlans: [{ id: 'plan-1', status: 'aprobado' }],
        },
      ] as EvaluationEntity[]

      evaluationsRepository.find.mockResolvedValue(completedEvaluations)

      // Act & Assert
      await expect(
        validator.validateClosure('audit-123'),
      ).resolves.toBeUndefined()
    })

    it('should fail if any validation fails', async () => {
      // Arrange
      const incompleteEvaluations = [
        { id: 'eval-1', isCompleted: false, isActive: true },
      ] as EvaluationEntity[]

      evaluationsRepository.find.mockResolvedValue(incompleteEvaluations)

      // Act & Assert
      await expect(validator.validateClosure('audit-123')).rejects.toThrow(
        AuditCannotBeClosedException,
      )
    })
  })
})
