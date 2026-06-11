import { PATHS } from '../routes/path'
import type { AppUser } from '../types/user'
import { getGuestHomePath } from './guestHomePath'

/** Destino inicial após login ou rota desconhecida, conforme o papel do utilizador. */
export function getDefaultPathForUser(user: AppUser | null | undefined): string {
  if (user?.role === 'admin') return PATHS.admin
  if (user?.role === 'guest') return getGuestHomePath(user)
  return PATHS.dashboard
}
