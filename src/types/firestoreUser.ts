import type { Timestamp } from 'firebase/firestore'

/**
 * Documento `users/{uid}` no Firestore.
 * Campos espelham Auth + metadados; reserve campos extra (reserva, estadia) para integração Stays.
 */
export type FirestoreUserDocument = {
  email: string | null
  displayName: string | null
  photoURL: string | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
  /** Preenchido depois pela API / admin */
  reservationCode?: string | null
}
