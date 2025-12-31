import { TransactionManager } from '@core/database/transaction-manager.service'

/**
 * Crea un mock del TransactionManager para testing
 *
 * Por defecto, runInTransaction ejecuta el callback directamente (sin transacción real)
 * Esto permite que los tests sean síncronos y más rápidos
 *
 * @param shouldExecuteCallback - Si es true, ejecuta el callback. Si es false, solo mockea.
 */
export function createMockTransactionManager(
  shouldExecuteCallback = true,
): jest.Mocked<TransactionManager> {
  const runInTransaction = jest.fn()

  if (shouldExecuteCallback) {
    // Por defecto, ejecuta el callback directamente
    runInTransaction.mockImplementation(async (callback) => {
      return await callback({} as any)
    })
  }

  return {
    runInTransaction,
    runWithEntityManager: jest.fn(),
  } as unknown as jest.Mocked<TransactionManager>
}
