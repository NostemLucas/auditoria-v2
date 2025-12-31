import { IsString, MinLength, MaxLength, Matches } from 'class-validator'

export class ChangePasswordDto {
  @IsString()
  @MinLength(6, {
    message: 'La contraseña actual debe tener al menos 6 caracteres',
  })
  currentPassword: string

  @IsString()
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres',
  })
  @MaxLength(50, {
    message: 'La nueva contraseña no puede exceder 50 caracteres',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
  })
  newPassword: string
}
