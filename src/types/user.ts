export interface AppUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  reservationCode?: string | null
  stay?: {
    checkInAt?: string | null
    checkOutAt?: string | null
    propertyName?: string | null
    unit?: string | null
  }
}
