export {
  firebaseErrorToMessage,
  loginWithEmail,
  logout,
  subscribeAuth
} from './services/authService'
export { getFirebaseAuth, isFirebaseConfigured } from './lib/firebase'
export type { AppUser } from './types/user'
export { Auth } from './auth.tsx'
