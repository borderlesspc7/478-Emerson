export type GuestAccessStatus = 'active' | 'future' | 'expired'

export type ActiveGuest = {
  id: string
  reservationCode: string
  checkInDate: string
  checkOutDate: string
}

export type ServiceRequestStatus = 'pending' | 'completed'

export type ServiceRequestAdmin = {
  id: string
  reservationCode: string
  serviceType: string
  requestedAt: string
  status: ServiceRequestStatus
}
