import { NotFoundException, ConflictException } from '@nestjs/common'
import { UpdateUserHandler } from './update-user.handler'
import { UpdateUserCommand } from './update-user.command'
import {
  createMockUsersRepository,
  createMockUser,
  createMockTransactionManager,
  createMockUserFactory,
} from '../../../testing'
import { Role } from '@authorization'

describe('UpdateUserHandler', () => {
  let handler: UpdateUserHandler
  let repository: ReturnType<typeof createMockUsersRepository>
  let validationService: any
  let userFactory: ReturnType<typeof createMockUserFactory>
  let transactionManager: ReturnType<typeof createMockTransactionManager>

  beforeEach(() => {
    repository = createMockUsersRepository()
    userFactory = createMockUserFactory()
    transactionManager = createMockTransactionManager()

    validationService = {
      ensureUserExists: jest.fn(),
      validateUniqueness: jest.fn(),
    }

    handler = new UpdateUserHandler(
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
    it('should update user successfully', async () => {
      // Arrange
      const existingUser = createMockUser({ id: 'user-123' })
      const command = new UpdateUserCommand(
        'user-123',
        'Jane',
        'Smith',
        'jane.smith@example.com',
      )

      const updatedUser = { ...existingUser, names: 'Jane', lastNames: 'Smith' }

      validationService.ensureUserExists.mockResolvedValue(existingUser)
      validationService.validateUniqueness.mockResolvedValue(undefined)
      userFactory.updateFromDto.mockReturnValue(updatedUser)
      repository.patch.mockResolvedValue(updatedUser)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(result).toEqual(updatedUser)
      expect(validationService.ensureUserExists).toHaveBeenCalledWith(
        'user-123',
      )
      expect(validationService.validateUniqueness).toHaveBeenCalledWith(
        {
          email: 'jane.smith@example.com',
          username: undefined,
          ci: undefined,
        },
        'user-123',
      )
      expect(repository.patch).toHaveBeenCalled()
    })

    it('should fail if user does not exist', async () => {
      // Arrange
      const command = new UpdateUserCommand('nonexistent-id', 'Jane')

      validationService.ensureUserExists.mockRejectedValue(
        new NotFoundException('Usuario con ID nonexistent-id no encontrado'),
      )

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException)
      expect(validationService.ensureUserExists).toHaveBeenCalledWith(
        'nonexistent-id',
      )
      expect(repository.patch).not.toHaveBeenCalled()
    })

    it('should validate uniqueness when updating email', async () => {
      // Arrange
      const existingUser = createMockUser({ id: 'user-123' })
      const command = new UpdateUserCommand(
        'user-123',
        undefined,
        undefined,
        'newemail@example.com',
      )

      validationService.ensureUserExists.mockResolvedValue(existingUser)
      validationService.validateUniqueness.mockResolvedValue(undefined)
      repository.patch.mockResolvedValue(existingUser)

      // Act
      await handler.execute(command)

      // Assert
      expect(validationService.validateUniqueness).toHaveBeenCalledWith(
        {
          email: 'newemail@example.com',
          username: undefined,
          ci: undefined,
        },
        'user-123',
      )
    })

    it('should fail if new email already exists', async () => {
      // Arrange
      const existingUser = createMockUser({ id: 'user-123' })
      const command = new UpdateUserCommand(
        'user-123',
        undefined,
        undefined,
        'existing@example.com',
      )

      validationService.ensureUserExists.mockResolvedValue(existingUser)
      validationService.validateUniqueness.mockRejectedValue(
        new ConflictException('El email ya está registrado'),
      )

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'El email ya está registrado',
      )
      expect(repository.patch).not.toHaveBeenCalled()
    })

    it('should not validate uniqueness when email is not being updated', async () => {
      // Arrange
      const existingUser = createMockUser({ id: 'user-123' })
      const command = new UpdateUserCommand('user-123', 'Jane', 'Smith')

      validationService.ensureUserExists.mockResolvedValue(existingUser)
      repository.patch.mockResolvedValue(existingUser)

      // Act
      await handler.execute(command)

      // Assert
      expect(validationService.validateUniqueness).not.toHaveBeenCalled()
    })

    it('should update roles', async () => {
      // Arrange
      const existingUser = createMockUser({
        id: 'user-123',
        roles: [Role.CLIENTE],
      })
      const command = new UpdateUserCommand(
        'user-123',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        [Role.ADMIN, Role.GERENTE],
      )

      validationService.ensureUserExists.mockResolvedValue(existingUser)
      repository.patch.mockResolvedValue(existingUser)

      // Act
      await handler.execute(command)

      // Assert
      expect(userFactory.updateFromDto).toHaveBeenCalledWith(
        existingUser,
        expect.objectContaining({
          roles: [Role.ADMIN, Role.GERENTE],
        }),
      )
    })

    it('should update only provided fields', async () => {
      // Arrange
      const existingUser = createMockUser({ id: 'user-123' })
      const command = new UpdateUserCommand(
        'user-123',
        'UpdatedName',
        undefined, // lastNames not updated
        undefined, // email not updated
      )

      validationService.ensureUserExists.mockResolvedValue(existingUser)
      repository.patch.mockResolvedValue(existingUser)

      // Act
      await handler.execute(command)

      // Assert
      expect(userFactory.updateFromDto).toHaveBeenCalledWith(
        existingUser,
        expect.objectContaining({
          names: 'UpdatedName',
          lastNames: undefined,
          email: undefined,
        }),
      )
    })

    it('should execute within a transaction', async () => {
      // Arrange
      const existingUser = createMockUser({ id: 'user-123' })
      const command = new UpdateUserCommand('user-123', 'Jane')

      validationService.ensureUserExists.mockResolvedValue(existingUser)
      repository.patch.mockResolvedValue(existingUser)

      // Act
      await handler.execute(command)

      // Assert
      expect(transactionManager.runInTransaction).toHaveBeenCalledTimes(1)
    })
  })
})
