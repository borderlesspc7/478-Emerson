export const PATHS = {
  login: '/login',
  dashboard: '/',
  reservation: '/reserva',
  services: '/servicos',
  settings: '/configuracoes',
} as const

export type PathKey = keyof typeof PATHS
