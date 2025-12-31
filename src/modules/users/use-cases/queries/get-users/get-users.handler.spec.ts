import { GetUsersHandler } from './get-users.handler'
import { GetUsersQuery } from './get-users.query'
import { createMockUsersRepository, createMockUsers } from '../../../testing'

describe('GetUsersHandler', () => {
  let handler: GetUsersHandler
  let repository: ReturnType<typeof createMockUsersRepository>

  beforeEach(() => {
    repository = createMockUsersRepository()
    handler = new GetUsersHandler(repository)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    it('should return all users', async () => {
      // Arrange
      const mockUsers = createMockUsers(5)
      const query = new GetUsersQuery()

      repository.findAll.mockResolvedValue(mockUsers)

      // Act
      const result = await handler.execute(query)

      // Assert
      expect(result).toBe(mockUsers)
      expect(result).toHaveLength(5)
      expect(repository.findAll).toHaveBeenCalledTimes(1)
    })

    it('should return empty array when no users exist', async () => {
      // Arrange
      const query = new GetUsersQuery()
      repository.findAll.mockResolvedValue([])

      // Act
      const result = await handler.execute(query)

      // Assert
      expect(result).toEqual([])
      expect(repository.findAll).toHaveBeenCalled()
    })

    it('should handle repository errors', async () => {
      // Arrange
      const query = new GetUsersQuery()
      const error = new Error('Database error')

      repository.findAll.mockRejectedValue(error)

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Database error')
    })
  })
})
