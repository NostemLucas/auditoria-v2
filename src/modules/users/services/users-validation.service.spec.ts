import { ConflictException, NotFoundException } from '@nestjs/common'
import { UsersValidationService } from './users-validation.service'
import { createMockUsersRepository, createMockUser } from '../testing'

describe('UsersValidationService', () => {
  let service: UsersValidationService
  let repository: ReturnType<typeof createMockUsersRepository>

  beforeEach(() => {
    repository = createMockUsersRepository()
    service = new UsersValidationService(repository)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('validateUniqueness', () => {
    describe('Email validation', () => {
      it('should pass when email does not exist', async () => {
        repository.existsByEmail.mockResolvedValue(false)

        await expect(
          service.validateUniqueness({ email: 'new@example.com' }),
        ).resolves.not.toThrow()

        expect(repository.existsByEmail).toHaveBeenCalledWith(
          'new@example.com',
          undefined,
        )
      })

      it('should throw ConflictException when email exists', async () => {
        repository.existsByEmail.mockResolvedValue(true)

        await expect(
          service.validateUniqueness({ email: 'existing@example.com' }),
        ).rejects.toThrow(ConflictException)

        await expect(
          service.validateUniqueness({ email: 'existing@example.com' }),
        ).rejects.toThrow('El email ya está registrado')
      })

      it('should exclude specific user ID when validating', async () => {
        repository.existsByEmail.mockResolvedValue(false)

        await service.validateUniqueness(
          { email: 'test@example.com' },
          'user-123',
        )

        expect(repository.existsByEmail).toHaveBeenCalledWith(
          'test@example.com',
          'user-123',
        )
      })

      it('should not validate email when not provided', async () => {
        await service.validateUniqueness({})

        expect(repository.existsByEmail).not.toHaveBeenCalled()
      })
    })

    describe('Username validation', () => {
      it('should pass when username does not exist', async () => {
        repository.existsByUsername.mockResolvedValue(false)

        await expect(
          service.validateUniqueness({ username: 'newuser' }),
        ).resolves.not.toThrow()

        expect(repository.existsByUsername).toHaveBeenCalledWith(
          'newuser',
          undefined,
        )
      })

      it('should throw ConflictException when username exists', async () => {
        repository.existsByUsername.mockResolvedValue(true)

        await expect(
          service.validateUniqueness({ username: 'existinguser' }),
        ).rejects.toThrow(ConflictException)

        await expect(
          service.validateUniqueness({ username: 'existinguser' }),
        ).rejects.toThrow('El username ya está en uso')
      })
    })

    describe('CI validation', () => {
      it('should pass when CI does not exist', async () => {
        repository.existsByCI.mockResolvedValue(false)

        await expect(
          service.validateUniqueness({ ci: '12345678' }),
        ).resolves.not.toThrow()

        expect(repository.existsByCI).toHaveBeenCalledWith(
          '12345678',
          undefined,
        )
      })

      it('should throw ConflictException when CI exists', async () => {
        repository.existsByCI.mockResolvedValue(true)

        await expect(
          service.validateUniqueness({ ci: '12345678' }),
        ).rejects.toThrow(ConflictException)

        await expect(
          service.validateUniqueness({ ci: '12345678' }),
        ).rejects.toThrow('El CI ya está registrado')
      })
    })

    describe('Multiple fields validation', () => {
      it('should validate all provided fields', async () => {
        repository.existsByEmail.mockResolvedValue(false)
        repository.existsByUsername.mockResolvedValue(false)
        repository.existsByCI.mockResolvedValue(false)

        await service.validateUniqueness({
          email: 'test@example.com',
          username: 'testuser',
          ci: '12345678',
        })

        expect(repository.existsByEmail).toHaveBeenCalledTimes(1)
        expect(repository.existsByUsername).toHaveBeenCalledTimes(1)
        expect(repository.existsByCI).toHaveBeenCalledTimes(1)
      })

      it('should fail on first conflicting field', async () => {
        repository.existsByEmail.mockResolvedValue(true) // Email exists
        repository.existsByUsername.mockResolvedValue(false)
        repository.existsByCI.mockResolvedValue(false)

        await expect(
          service.validateUniqueness({
            email: 'existing@example.com',
            username: 'newuser',
            ci: '12345678',
          }),
        ).rejects.toThrow('El email ya está registrado')

        // Should not check username/CI if email already failed
        expect(repository.existsByEmail).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('ensureUserExists', () => {
    it('should return user when found', async () => {
      const mockUser = createMockUser({ id: 'user-123' })
      repository.findById.mockResolvedValue(mockUser)

      const result = await service.ensureUserExists('user-123')

      expect(result).toBe(mockUser)
      expect(repository.findById).toHaveBeenCalledWith('user-123')
    })

    it('should throw NotFoundException when user not found', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(service.ensureUserExists('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      )

      await expect(service.ensureUserExists('nonexistent-id')).rejects.toThrow(
        'Usuario con ID nonexistent-id no encontrado',
      )
    })

    it('should handle repository errors', async () => {
      const dbError = new Error('Database connection failed')
      repository.findById.mockRejectedValue(dbError)

      await expect(service.ensureUserExists('user-123')).rejects.toThrow(
        'Database connection failed',
      )
    })
  })
})
