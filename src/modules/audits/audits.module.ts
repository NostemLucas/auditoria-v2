import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditEntity, EvaluationEntity, ActionPlanEntity } from './entities'
import {
  AuditsService,
  EvaluationsService,
  ActionPlansService,
} from './services'
import {
  AuditsController,
  EvaluationsController,
  ActionPlansController,
} from './controllers'
import { EvaluationFieldsValidator, FollowUpAuditValidator } from './validators'
import { StandardEntity } from '@templates/entities/standard.entity'
import { MaturityLevelEntity } from '@frameworks/entities/maturity-level.entity'
import { OrganizationsModule } from '@organizations/organizations.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditEntity,
      EvaluationEntity,
      ActionPlanEntity,
      StandardEntity,
      MaturityLevelEntity,
    ]),
    OrganizationsModule,
  ],
  controllers: [AuditsController, EvaluationsController, ActionPlansController],
  providers: [
    AuditsService,
    EvaluationsService,
    ActionPlansService,
    EvaluationFieldsValidator,
    FollowUpAuditValidator,
  ],
  exports: [AuditsService, EvaluationsService, ActionPlansService],
})
export class AuditsModule {}
