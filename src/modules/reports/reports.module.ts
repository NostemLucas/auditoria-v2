import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ReportEntity } from './entities/report.entity'
import { ReportsController } from './controllers/reports.controller'
import { ReportsService } from './services/reports.service'
import { GoogleDocsService } from './services/google-docs.service'
import { AuditsModule } from '@audits/audits.module'

@Module({
  imports: [TypeOrmModule.forFeature([ReportEntity]), AuditsModule],
  controllers: [ReportsController],
  providers: [ReportsService, GoogleDocsService],
  exports: [ReportsService],
})
export class ReportsModule {}
