import { Global, Module } from '@nestjs/common'
import { TransactionManager } from './database/transaction-manager.service'

@Global()
@Module({
  providers: [TransactionManager],
  exports: [TransactionManager],
})
export class CoreModule {}
