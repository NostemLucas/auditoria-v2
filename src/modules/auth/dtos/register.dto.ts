import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsUUID,
} from 'class-validator'

export class RegisterDto {
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

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(50, { message: 'La contraseña no puede exceder 50 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
  })
  password: string

  @IsOptional()
  @IsUUID('4', { message: 'El organizationId debe ser un UUID válido' })
  organizationId?: string
}
