// Mock chalk para evitar problemas con ESM en Jest
jest.mock('chalk', () => ({
  default: {
    green: (str: string) => str,
    red: (str: string) => str,
    yellow: (str: string) => str,
    blue: (str: string) => str,
    cyan: (str: string) => str,
    magenta: (str: string) => str,
    white: (str: string) => str,
    gray: (str: string) => str,
    bold: (str: string) => str,
  },
}))
