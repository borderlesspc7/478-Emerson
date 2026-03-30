export const PATHS = {
  login: '/login',
  accessExpired: '/acesso-expirado',
  dashboard: '/',
  reservation: '/reserva',
  services: '/servicos',
  settings: '/configuracoes',
} as const

export type PathKey = keyof typeof PATHS
