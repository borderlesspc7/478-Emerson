import { PATHS } from '../routes/path'
import type { AppUser } from '../types/user'

/** Destino inicial após login ou rota desconhecida, conforme o papel do utilizador. */
export function getDefaultPathForUser(user: AppUser | null | undefined): string {
  return user?.role === 'admin' ? PATHS.admin : PATHS.dashboard
}
