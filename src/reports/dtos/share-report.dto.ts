import { IsEmail, IsEnum, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export enum ShareRole {
  READER = 'reader',
  COMMENTER = 'commenter',
  WRITER = 'writer',
}

export class ShareReportDto {
  @ApiProperty({
    description: 'Email del usuario con quien compartir',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string

  @ApiPropertyOptional({
    description: 'Rol de permisos',
    enum: ShareRole,
    default: ShareRole.READER,
  })
  @IsOptional()
  @IsEnum(ShareRole)
  role?: ShareRole
}
