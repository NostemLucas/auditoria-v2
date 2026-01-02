/**
 * Command para subir avatar de usuario
 */
export class UploadAvatarCommand {
  constructor(
    /**
     * ID del usuario
     */
    public readonly userId: string,

    /**
     * Archivo de avatar (de Multer)
     */
    public readonly file: Express.Multer.File,
  ) {}
}
