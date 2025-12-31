import * as nodemailer from 'nodemailer'

/**
 * Helper para crear cuentas de prueba de Ethereal Email automáticamente
 */
export class EmailTestHelper {
  /**
   * Genera credenciales de Ethereal Email para testing
   * Solo usar en desarrollo
   */
  static async createTestAccount(): Promise<{
    host: string
    port: number
    secure: boolean
    user: string
    password: string
  }> {
    const testAccount = await nodemailer.createTestAccount()

    console.log('━'.repeat(60))
    console.log('📧 Cuenta de prueba de Ethereal Email creada:')
    console.log('━'.repeat(60))
    console.log(`Host:     ${testAccount.smtp.host}`)
    console.log(`Port:     ${testAccount.smtp.port}`)
    console.log(`Secure:   ${testAccount.smtp.secure}`)
    console.log(`User:     ${testAccount.user}`)
    console.log(`Password: ${testAccount.pass}`)
    console.log('━'.repeat(60))
    console.log('🌐 Ver emails en: https://ethereal.email/messages')
    console.log('━'.repeat(60))
    console.log('')
    console.log('💡 Tip: Copia estas credenciales a tu archivo .env:')
    console.log('')
    console.log(`MAIL_HOST=${testAccount.smtp.host}`)
    console.log(`MAIL_PORT=${testAccount.smtp.port}`)
    console.log(`MAIL_SECURE=false`)
    console.log(`MAIL_USER=${testAccount.user}`)
    console.log(`MAIL_PASSWORD=${testAccount.pass}`)
    console.log('━'.repeat(60))

    return {
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      user: testAccount.user,
      password: testAccount.pass,
    }
  }

  /**
   * Obtiene la URL de preview de un email de Ethereal
   */
  static getPreviewUrl(messageInfo: unknown): string | null {
    const url = nodemailer.getTestMessageUrl(messageInfo as any)
    return url || null
  }
}
