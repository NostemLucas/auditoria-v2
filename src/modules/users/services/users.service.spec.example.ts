import { Test, TestingModule } from '@nestjs/testing'
import { UsersService } from './users.service'
import type { IUsersRepository } from '../repositories/users-repository.interface'
import { UserFactory } from '../factories/user.factory'
import { TransactionManager } from '@core/database/transaction-manager.service'
import { Role } from '@authorization'
import { UserEntity, UserStatus } from '../entities/user.entity'
import { CreateUserDto } from '../dtos'
import { createMockUsersRepository } from '../testing/users-repository.mock'
import { createMockTransactionManager } from '@shared/testing/mocks'

describe('UsersService', () => {
  let service: UsersService
  let mockUsersRepository: jest.Mocked<IUsersRepository>
  let mockTransactionManager: jest.Mocked<TransactionManager>

  beforeEach(async () => {
    // Crear mocks usando factories reutilizables
    mockUsersRepository = createMockUsersRepository()
    mockTransactionManager = createMockTransactionManager()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        UserFactory,
        {
          provide: 'IUsersRepository',
          useValue: mockUsersRepository,
        },
        {
          provide: TransactionManager,
          useValue: mockTransactionManager,
        },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    it('should create a user successfully', async () => {
      const createUserDto: CreateUserDto = {
        names: 'John',
        lastNames: 'Doe',
        email: 'john@example.com',
        username: 'johndoe',
        ci: '12345678',
        organizationId: 'org-123',
        roles: [Role.CLIENTE],
      }

      const mockUser = {
        id: 'user-1',
        ...createUserDto,
        status: UserStatus.ACTIVE,
      } as UserEntity

      // Setup mocks
      mockUsersRepository.existsByEmail.mockResolvedValue(false)
      mockUsersRepository.existsByUsername.mockResolvedValue(false)
      mockUsersRepository.existsByCI.mockResolvedValue(false)
      mockUsersRepository.save.mockResolvedValue(mockUser)

      // Execute
      const result = await service.create(createUserDto)

      // Assert
      expect(result).toBe(mockUser)
      expect(mockUsersRepository.existsByEmail).toHaveBeenCalledWith(
        createUserDto.email,
        undefined,
      )
      expect(mockUsersRepository.save).toHaveBeenCalled()
      expect(mockTransactionManager.runInTransaction).toHaveBeenCalled()
    })

    it('should throw ConflictException when email already exists', async () => {
      const createUserDto: CreateUserDto = {
        names: 'John',
        lastNames: 'Doe',
        email: 'john@example.com',
        username: 'johndoe',
        ci: '12345678',
        organizationId: 'org-123',
      }

      mockUsersRepository.existsByEmail.mockResolvedValue(true)

      await expect(service.create(createUserDto)).rejects.toThrow(
        'El email ya está registrado',
      )
    })
  })

  describe('findOne', () => {
    it('should return a user when found', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'john@example.com',
      } as UserEntity

      mockUsersRepository.findById.mockResolvedValue(mockUser)

      const result = await service.findOne('user-1')

      expect(result).toBe(mockUser)
      expect(mockUsersRepository.findById).toHaveBeenCalledWith('user-1')
    })

    it('should throw NotFoundException when user not found', async () => {
      mockUsersRepository.findById.mockResolvedValue(null)

      await expect(service.findOne('non-existent')).rejects.toThrow(
        'Usuario con ID non-existent no encontrado',
      )
    })
  })
})
