export const PATHS = {
  login: '/login',
  accessExpired: '/acesso-expirado',
  dashboard: '/',
  admin: '/admin',
  reservation: '/reserva',
  aboutProperty: '/sobre-apartamento',
  services: '/servicos',
  settings: '/configuracoes',
} as const

export type PathKey = keyof typeof PATHS
