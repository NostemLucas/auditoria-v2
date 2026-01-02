import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {
  AuditEntity,
  EvaluationEntity,
  ActionPlanEntity,
  AuditStandardWeightEntity,
} from './entities'
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
import {
  EvaluationFieldsValidator,
  FollowUpAuditValidator,
  AuditClosureValidator,
} from './validators'
import {
  PlanAuditHandler,
  StartAuditHandler,
  RequestClosureHandler,
  ApproveClosureHandler,
  CloseAuditHandler,
  CancelAuditHandler,
  ConfigureWeightsHandler,
  CopyWeightsHandler,
} from './use-cases'
import { StandardEntity } from '@templates/entities/standard.entity'
import { MaturityLevelEntity } from '@frameworks/entities/maturity-level.entity'
import { UserEntity } from '@users/entities/user.entity'
import { OrganizationsModule } from '@organizations/organizations.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditEntity,
      EvaluationEntity,
      ActionPlanEntity,
      AuditStandardWeightEntity,
      StandardEntity,
      MaturityLevelEntity,
      UserEntity,
    ]),
    OrganizationsModule,
  ],
  controllers: [AuditsController, EvaluationsController, ActionPlansController],
  providers: [
    // Services
    AuditsService,
    EvaluationsService,
    ActionPlansService,

    // Validators
    EvaluationFieldsValidator,
    FollowUpAuditValidator,
    AuditClosureValidator,

    // Use Case Handlers - Lifecycle
    PlanAuditHandler,
    StartAuditHandler,
    RequestClosureHandler,
    ApproveClosureHandler,
    CloseAuditHandler,
    CancelAuditHandler,

    // Use Case Handlers - Weights
    ConfigureWeightsHandler,
    CopyWeightsHandler,
  ],
  exports: [
    AuditsService,
    EvaluationsService,
    ActionPlansService,
    // Export lifecycle handlers for use in other modules if needed
    PlanAuditHandler,
    StartAuditHandler,
    RequestClosureHandler,
    ApproveClosureHandler,
    CloseAuditHandler,
    CancelAuditHandler,
    // Export weight handlers for use in other modules if needed
    ConfigureWeightsHandler,
    CopyWeightsHandler,
  ],
})
export class AuditsModule {}
