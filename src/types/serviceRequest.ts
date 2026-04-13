import type { ServiceOfferId } from './guestStay'

export type ServiceRequestStatus = 'pending' | 'completed'

/** Pedido na coleção `serviceRequests` (campo `userId` separa por utilizador). */
export type ServiceRequestRecord = {
  id: string
  userId: string
  serviceId: ServiceOfferId
  status: ServiceRequestStatus
  createdAt: Date | null
  updatedAt: Date | null
  completedAt: Date | null
}
