export const PATHS = {
  login: '/login',
  /** Entrada direta do hóspede (magic link): `/entrar/:reservationCode`. */
  guestDirectEntry: '/entrar',
  accessExpired: '/acesso-expirado',
  dashboard: '/',
  admin: '/admin',
  adminOrders: '/admin/pedidos',
  adminServices: '/admin/servicos',
  adminProperties: '/admin/imoveis',
  adminAccess: '/admin/acessos',
  reservation: '/reserva',
  aboutProperty: '/sobre-apartamento',
  interests: '/interests',
  extras: '/extras',
  services: '/servicos',
  settings: '/configuracoes',
} as const

export type PathKey = keyof typeof PATHS
