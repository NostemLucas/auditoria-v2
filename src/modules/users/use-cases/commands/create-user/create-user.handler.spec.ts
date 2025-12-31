import { ConflictException } from '@nestjs/common'
import { CreateUserHandler } from './create-user.handler'
import { CreateUserCommand } from './create-user.command'
import {
  createMockUsersRepository,
  createMockUser,
  createMockTransactionManager,
  createMockUserFactory,
} from '../../../testing'
import { Role } from '@authorization'

describe('CreateUserHandler', () => {
  let handler: CreateUserHandler
  let repository: ReturnType<typeof createMockUsersRepository>
  let validationService: any
  let userFactory: ReturnType<typeof createMockUserFactory>
  let transactionManager: ReturnType<typeof createMockTransactionManager>

  beforeEach(() => {
    repository = createMockUsersRepository()
    userFactory = createMockUserFactory()
    transactionManager = createMockTransactionManager()

    // Mock validation service
    validationService = {
      validateUniqueness: jest.fn(),
    }

    handler = new CreateUserHandler(
      repository,
      validationService,
      userFactory,
      transactionManager,
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    it('should create a user successfully', async () => {
      // Arrange
      const command = new CreateUserCommand(
        'John',
        'Doe',
        'john.doe@example.com',
        'johndoe',
        '12345678',
        'password123',
        [Role.CLIENTE],
        '+1234567890',
        '123 Main St',
        'org-123',
      )

      const mockUser = createMockUser({
        names: command.names,
        email: command.email,
      })

      validationService.validateUniqueness.mockResolvedValue(undefined)
      userFactory.createFromDto.mockReturnValue(mockUser)
      repository.save.mockResolvedValue(mockUser)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(result).toBe(mockUser)
      expect(validationService.validateUniqueness).toHaveBeenCalledWith({
        email: command.email,
        username: command.username,
        ci: command.ci,
      })
      expect(userFactory.createFromDto).toHaveBeenCalledWith({
        names: command.names,
        lastNames: command.lastNames,
        email: command.email,
        username: command.username,
        ci: command.ci,
        roles: command.roles,
        phone: command.phone,
        address: command.address,
        organizationId: command.organizationId,
      })
      expect(repository.save).toHaveBeenCalledWith(mockUser)
      expect(transactionManager.runInTransaction).toHaveBeenCalled()
    })

    it('should fail if email already exists', async () => {
      // Arrange
      const command = new CreateUserCommand(
        'John',
        'Doe',
        'existing@example.com',
        'johndoe',
        '12345678',
        'password123',
        [Role.CLIENTE],
      )

      validationService.validateUniqueness.mockRejectedValue(
        new ConflictException('El email ya está registrado'),
      )

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ConflictException)
      await expect(handler.execute(command)).rejects.toThrow(
        'El email ya está registrado',
      )

      expect(validationService.validateUniqueness).toHaveBeenCalled()
      expect(userFactory.createFromDto).not.toHaveBeenCalled()
      expect(repository.save).not.toHaveBeenCalled()
    })

    it('should fail if username already exists', async () => {
      // Arrange
      const command = new CreateUserCommand(
        'John',
        'Doe',
        'john@example.com',
        'existinguser',
        '12345678',
        'password123',
        [Role.CLIENTE],
      )

      validationService.validateUniqueness.mockRejectedValue(
        new ConflictException('El username ya está en uso'),
      )

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'El username ya está en uso',
      )
    })

    it('should fail if CI already exists', async () => {
      // Arrange
      const command = new CreateUserCommand(
        'John',
        'Doe',
        'john@example.com',
        'johndoe',
        '12345678',
        'password123',
        [Role.CLIENTE],
      )

      validationService.validateUniqueness.mockRejectedValue(
        new ConflictException('El CI ya está registrado'),
      )

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'El CI ya está registrado',
      )
    })

    it('should create user without optional fields', async () => {
      // Arrange
      const command = new CreateUserCommand(
        'John',
        'Doe',
        'john@example.com',
        'johndoe',
        '12345678',
        'password123',
        [Role.CLIENTE],
        undefined, // no phone
        undefined, // no address
        undefined, // no organizationId
      )

      const mockUser = createMockUser()
      validationService.validateUniqueness.mockResolvedValue(undefined)
      userFactory.createFromDto.mockReturnValue(mockUser)
      repository.save.mockResolvedValue(mockUser)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(result).toBe(mockUser)
      expect(userFactory.createFromDto).toHaveBeenCalledWith({
        names: command.names,
        lastNames: command.lastNames,
        email: command.email,
        username: command.username,
        ci: command.ci,
        roles: command.roles,
        phone: undefined,
        address: undefined,
        organizationId: undefined,
      })
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const command = new CreateUserCommand(
        'John',
        'Doe',
        'john@example.com',
        'johndoe',
        '12345678',
        'password123',
        [Role.CLIENTE],
      )

      const mockUser = createMockUser()
      validationService.validateUniqueness.mockResolvedValue(undefined)
      userFactory.createFromDto.mockReturnValue(mockUser)
      repository.save.mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database error')
      expect(repository.save).toHaveBeenCalled()
    })

    it('should execute within a transaction', async () => {
      // Arrange
      const command = new CreateUserCommand(
        'John',
        'Doe',
        'john@example.com',
        'johndoe',
        '12345678',
        'password123',
        [Role.CLIENTE],
      )

      const mockUser = createMockUser()
      validationService.validateUniqueness.mockResolvedValue(undefined)
      userFactory.createFromDto.mockReturnValue(mockUser)
      repository.save.mockResolvedValue(mockUser)

      // Act
      await handler.execute(command)

      // Assert
      expect(transactionManager.runInTransaction).toHaveBeenCalledTimes(1)
      expect(transactionManager.runInTransaction).toHaveBeenCalledWith(
        expect.any(Function),
      )
    })
  })
})
