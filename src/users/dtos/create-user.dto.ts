import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator'
import { UserStatus } from '../entities/user.entity'

export class CreateUserDto {
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede exceder 50 caracteres' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
    message: 'El nombre solo puede contener letras',
  })
  names: string

  @IsString()
  @MinLength(2, { message: 'Los apellidos deben tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'Los apellidos no pueden exceder 50 caracteres' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
    message: 'Los apellidos solo pueden contener letras',
  })
  lastNames: string

  @IsEmail({}, { message: 'El email no es válido' })
  @MaxLength(100, { message: 'El email no puede exceder 100 caracteres' })
  email: string

  @IsString()
  @MinLength(3, { message: 'El username debe tener al menos 3 caracteres' })
  @MaxLength(30, { message: 'El username no puede exceder 30 caracteres' })
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'El username solo puede contener letras minúsculas, números y guiones bajos',
  })
  username: string

  @IsString()
  @Matches(/^\d{7,10}(-[A-Z0-9]{1,3})?$/, {
    message: 'El formato del CI no es válido (ej: 12345678 o 12345678-1A)',
  })
  ci: string

  @IsOptional()
  @IsString()
  @Matches(/^[\d\s\-+()]{7,20}$/, {
    message: 'El formato del teléfono no es válido',
  })
  phone?: string

  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'La dirección debe tener al menos 5 caracteres' })
  @MaxLength(200, { message: 'La dirección no puede exceder 200 caracteres' })
  address?: string

  @IsOptional()
  @IsString()
  image?: string

  @IsOptional()
  @IsEnum(UserStatus, {
    message: 'El status debe ser: active, inactive o suspended',
  })
  status?: UserStatus

  @IsOptional()
  @IsUUID('4', { message: 'El organizationId debe ser un UUID válido' })
  organizationId?: string

  @IsOptional()
  @IsArray({ message: 'roleIds debe ser un array' })
  @IsUUID('4', { each: true, message: 'Cada roleId debe ser un UUID válido' })
  roleIds?: string[]
}
