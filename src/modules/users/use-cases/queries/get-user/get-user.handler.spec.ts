import { NotFoundException } from '@nestjs/common'
import { GetUserHandler } from './get-user.handler'
import { GetUserQuery } from './get-user.query'
import { createMockUser } from '../../../testing'

describe('GetUserHandler', () => {
  let handler: GetUserHandler
  let validationService: any

  beforeEach(() => {
    validationService = {
      ensureUserExists: jest.fn(),
    }

    handler = new GetUserHandler(validationService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    it('should return user when found', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 'user-123' })
      const query = new GetUserQuery('user-123')

      validationService.ensureUserExists.mockResolvedValue(mockUser)

      // Act
      const result = await handler.execute(query)

      // Assert
      expect(result).toBe(mockUser)
      expect(validationService.ensureUserExists).toHaveBeenCalledWith(
        'user-123',
      )
    })

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      const query = new GetUserQuery('nonexistent-id')

      validationService.ensureUserExists.mockRejectedValue(
        new NotFoundException('Usuario con ID nonexistent-id no encontrado'),
      )

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(NotFoundException)
      await expect(handler.execute(query)).rejects.toThrow(
        'Usuario con ID nonexistent-id no encontrado',
      )
    })

    it('should handle validation service errors', async () => {
      // Arrange
      const query = new GetUserQuery('user-123')
      const error = new Error('Database error')

      validationService.ensureUserExists.mockRejectedValue(error)

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Database error')
    })
  })
})
