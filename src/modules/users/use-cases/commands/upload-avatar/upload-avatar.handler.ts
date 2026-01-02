import { Injectable } from '@nestjs/common'
import { UploadAvatarCommand } from './upload-avatar.command'
import type { IUsersRepository } from '@users/repositories/users-repository.interface'
import { FilesService } from '@core/files'
import { FILE_UPLOAD_CONFIGS } from '@core/files/dtos/file-upload-options.dto'
import { UserEntity } from '@users/entities/user.entity'
import {
  UserNotFoundByIdException,
  InvalidUserFileException,
} from '@users/exceptions'

/**
 * Handler para subir avatar de usuario
 *
 * Proceso:
 * 1. Validar que el usuario exista
 * 2. Validar el archivo (formato, tamaño, dimensiones)
 * 3. Guardar archivo en /uploads/avatars/users/{userId}/
 * 4. Eliminar avatar anterior (si existe)
 * 5. Actualizar user.image con la nueva ruta
 */
@Injectable()
export class UploadAvatarHandler {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly filesService: FilesService,
  ) {}

  async execute(command: UploadAvatarCommand): Promise<UserEntity> {
    // 1. Buscar usuario
    const user = await this.usersRepository.findById(command.userId)

    if (!user) {
      throw new UserNotFoundByIdException(command.userId)
    }

    // 2. Guardar avatar nuevo (reemplazando el anterior)
    try {
      const uploadResult = await this.filesService.replaceFile(
        user.image, // Avatar anterior (null si no tiene)
        {
          file: command.file,
          folder: `avatars/users/${user.id}`, // Carpeta dinámica por usuario
          validationOptions: FILE_UPLOAD_CONFIGS.USER_AVATAR, // Validaciones predefinidas
          customFileName: 'avatar', // Nombre fijo: avatar.jpg, avatar.png, etc.
          overwrite: true, // Permitir sobrescribir
        },
      )

      // 3. Actualizar imagen del usuario
      user.image = uploadResult.filePath

      // 4. Guardar usuario
      await this.usersRepository.save(user)

      return user
    } catch (error) {
      // Si el error es del FilesService, convertirlo a excepción de usuario
      const message =
        error instanceof Error ? error.message : 'Error al subir avatar'
      throw new InvalidUserFileException(message, 'avatar')
    }
  }
}
