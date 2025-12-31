/**
 * Mock de TransactionManager para tests
 */
export const createMockTransactionManager = () => ({
  runInTransaction: jest.fn((callback) => callback()),
  getCurrentEntityManager: jest.fn(),
})
