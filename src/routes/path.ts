export const PATHS = {
  login: '/login',
  /** Entrada direta do hóspede (magic link): `/entrar/:reservationCode`. */
  guestDirectEntry: '/entrar',
  accessExpired: '/acesso-expirado',
  /** Hóspede antes do horário de check-in: pré-visualização e serviços. */
  preCheckIn: '/aguardando-checkin',
  /** Só em desenvolvimento: pré-visualização da tela sem login. */
  preCheckInPreview: '/dev/preview/aguardando-checkin',
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
