export const PATHS = {
  login: '/login',
  accessExpired: '/acesso-expirado',
  dashboard: '/',
  reservation: '/reserva',
  aboutProperty: '/sobre-apartamento',
  condo: '/condominio',
  services: '/servicos',
  settings: '/configuracoes',
} as const

export type PathKey = keyof typeof PATHS
