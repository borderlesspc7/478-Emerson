export const PATHS = {
  login: '/login',
  dashboard: '/',
  settings: '/configuracoes',
  team: '/equipe',
  reports: '/relatorios',
} as const

export type PathKey = keyof typeof PATHS
