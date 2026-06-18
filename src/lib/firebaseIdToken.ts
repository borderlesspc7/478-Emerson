import { getFirebaseAuth } from './firebase'

export async function getFirebaseIdToken(): Promise<string> {
  const auth = getFirebaseAuth()
  const user = auth?.currentUser
  if (!user) throw new Error('auth/not-signed-in')
  return user.getIdToken()
}
