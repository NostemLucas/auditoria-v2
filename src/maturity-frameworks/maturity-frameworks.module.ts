import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FrameworkEntity } from './entities/framework.entity'
import { MaturityLevelEntity } from './entities/maturity-level.entity'
import { FrameworksService } from './services/frameworks.service'
import { MaturityLevelsService } from './services/maturity-levels.service'
import { FrameworksController } from './controllers/frameworks.controller'
import { MaturityLevelsController } from './controllers/maturity-levels.controller'
import { MaturityLevelFieldsValidator } from './validators/maturity-level-fields.validator'

@Module({
  imports: [TypeOrmModule.forFeature([FrameworkEntity, MaturityLevelEntity])],
  controllers: [FrameworksController, MaturityLevelsController],
  providers: [
    FrameworksService,
    MaturityLevelsService,
    MaturityLevelFieldsValidator,
  ],
  exports: [FrameworksService, MaturityLevelsService],
})
export class MaturityFrameworksModule {}
