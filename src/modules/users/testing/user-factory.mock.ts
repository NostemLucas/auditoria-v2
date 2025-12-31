import { createMockUser } from './test-helpers'

/**
 * Mock de UserFactory para tests
 */
export const createMockUserFactory = () => ({
  createFromDto: jest.fn((dto) => createMockUser(dto)),
  updateFromDto: jest.fn((user, dto) => ({ ...user, ...dto })),
  toResponse: jest.fn((user) => user),
  toResponseList: jest.fn((users) => users),
})
