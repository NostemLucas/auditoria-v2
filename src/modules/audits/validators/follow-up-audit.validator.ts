import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditEntity, AuditType, AuditStatus } from '../entities/audit.entity'

@ValidatorConstraint({ name: 'FollowUpAudit', async: true })
@Injectable()
export class FollowUpAuditValidator implements ValidatorConstraintInterface {
  constructor(
    @InjectRepository(AuditEntity)
    private readonly auditRepository: Repository<AuditEntity>,
  ) {}

  async validate(value: unknown, args: ValidationArguments): Promise<boolean> {
    const dto = args.object as {
      auditType: AuditType
      parentAuditId?: string
      templateId: string
      frameworkId: string
    }

    // Si no es auditoría de seguimiento, no validar
    if (dto.auditType !== AuditType.SEGUIMIENTO) {
      return true
    }

    // Si es de seguimiento, debe tener parentAuditId
    if (!dto.parentAuditId) {
      return false
    }

    // Obtener la auditoría padre
    const parentAudit = await this.auditRepository.findOne({
      where: { id: dto.parentAuditId },
    })

    if (!parentAudit) {
      return false
    }

    // Validar que la auditoría padre esté cerrada
    if (parentAudit.status !== AuditStatus.CLOSED) {
      return false
    }

    // Validar que usen el mismo template y framework
    if (
      dto.templateId !== parentAudit.templateId ||
      dto.frameworkId !== parentAudit.frameworkId
    ) {
      return false
    }

    return true
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'La auditoría de seguimiento no es válida. Debe tener una auditoría padre completada y usar el mismo template y framework.'
  }
}

export function IsValidFollowUpAudit(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: FollowUpAuditValidator,
    })
  }
}
