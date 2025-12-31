import { GetUsersByOrganizationHandler } from './get-users-by-organization.handler'
import { GetUsersByOrganizationQuery } from './get-users-by-organization.query'
import { createMockUsersRepository, createMockUsers } from '../../../testing'

describe('GetUsersByOrganizationHandler', () => {
  let handler: GetUsersByOrganizationHandler
  let repository: ReturnType<typeof createMockUsersRepository>

  beforeEach(() => {
    repository = createMockUsersRepository()
    handler = new GetUsersByOrganizationHandler(repository)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    it('should return users for a specific organization', async () => {
      // Arrange
      const organizationId = 'org-123'
      const mockUsers = createMockUsers(3).map((user) => ({
        ...user,
        organizationId,
      }))
      const query = new GetUsersByOrganizationQuery(organizationId)

      repository.findByOrganization.mockResolvedValue(mockUsers)

      // Act
      const result = await handler.execute(query)

      // Assert
      expect(result).toBe(mockUsers)
      expect(result).toHaveLength(3)
      expect(repository.findByOrganization).toHaveBeenCalledWith(organizationId)
    })

    it('should return empty array when organization has no users', async () => {
      // Arrange
      const query = new GetUsersByOrganizationQuery('org-empty')
      repository.findByOrganization.mockResolvedValue([])

      // Act
      const result = await handler.execute(query)

      // Assert
      expect(result).toEqual([])
      expect(repository.findByOrganization).toHaveBeenCalledWith('org-empty')
    })

    it('should handle repository errors', async () => {
      // Arrange
      const query = new GetUsersByOrganizationQuery('org-123')
      const error = new Error('Database error')

      repository.findByOrganization.mockRejectedValue(error)

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Database error')
    })
  })
})
