/**
 * Temas y estilos predefinidos para documentos de reportes
 */

export interface DocumentTheme {
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    text: string
    textLight: string
    background: string
    headerBg: string
  }
  fonts: {
    heading: string
    body: string
    code: string
  }
  sizes: {
    h1: number
    h2: number
    h3: number
    h4: number
    body: number
    small: number
  }
}

/**
 * Tema por defecto - Profesional Azul
 */
export const DEFAULT_THEME: DocumentTheme = {
  name: 'Profesional Azul',
  colors: {
    primary: '#1a73e8', // Azul Google
    secondary: '#174ea6', // Azul oscuro
    accent: '#ea4335', // Rojo para alertas
    text: '#202124', // Gris muy oscuro
    textLight: '#5f6368', // Gris medio
    background: '#ffffff', // Blanco
    headerBg: '#f1f3f4', // Gris claro
  },
  fonts: {
    heading: 'Arial',
    body: 'Arial',
    code: 'Courier New',
  },
  sizes: {
    h1: 24,
    h2: 18,
    h3: 14,
    h4: 12,
    body: 11,
    small: 9,
  },
}

/**
 * Tema Corporativo Verde
 */
export const CORPORATE_GREEN_THEME: DocumentTheme = {
  name: 'Corporativo Verde',
  colors: {
    primary: '#0f9d58', // Verde
    secondary: '#0d7a45', // Verde oscuro
    accent: '#f4b400', // Amarillo
    text: '#202124',
    textLight: '#5f6368',
    background: '#ffffff',
    headerBg: '#e8f5e9',
  },
  fonts: {
    heading: 'Georgia',
    body: 'Arial',
    code: 'Courier New',
  },
  sizes: {
    h1: 26,
    h2: 20,
    h3: 16,
    h4: 14,
    body: 12,
    small: 10,
  },
}

/**
 * Tema Minimalista
 */
export const MINIMAL_THEME: DocumentTheme = {
  name: 'Minimalista',
  colors: {
    primary: '#000000', // Negro
    secondary: '#424242', // Gris oscuro
    accent: '#757575', // Gris medio
    text: '#212121',
    textLight: '#757575',
    background: '#ffffff',
    headerBg: '#fafafa',
  },
  fonts: {
    heading: 'Helvetica',
    body: 'Helvetica',
    code: 'Monaco',
  },
  sizes: {
    h1: 22,
    h2: 18,
    h3: 14,
    h4: 12,
    body: 11,
    small: 9,
  },
}

/**
 * Obtiene un tema por nombre
 */
export function getTheme(themeName?: string): DocumentTheme {
  switch (themeName?.toLowerCase()) {
    case 'corporate_green':
      return CORPORATE_GREEN_THEME
    case 'minimal':
      return MINIMAL_THEME
    case 'default':
    default:
      return DEFAULT_THEME
  }
}

/**
 * Convierte color hex a RGB normalizado para Google Docs API
 */
export function hexToRgb(hex: string): {
  red: number
  green: number
  blue: number
} {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        red: parseInt(result[1], 16) / 255,
        green: parseInt(result[2], 16) / 255,
        blue: parseInt(result[3], 16) / 255,
      }
    : { red: 0, green: 0, blue: 0 }
}
