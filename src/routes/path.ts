export const PATHS = {
  login: '/login',
  accessExpired: '/acesso-expirado',
  dashboard: '/',
  admin: '/admin',
  adminOrders: '/admin/pedidos',
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
