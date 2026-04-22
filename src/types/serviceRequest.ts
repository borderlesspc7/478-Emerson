export type ServiceRequestStatus = 'pending' | 'completed'

/** Pedido na coleção `serviceRequests` (campo `userId` separa por utilizador). */
export type ServiceRequestRecord = {
  id: string
  userId: string
  serviceId: string
  /** Nome do serviço no momento do pedido (exibe histórico se o item do catálogo for removido). */
  serviceName: string | null
  priceInCents: number
  requesterName: string | null
  reservationCode: string | null
  propertyName: string | null
  status: ServiceRequestStatus
  createdAt: Date | null
  updatedAt: Date | null
  completedAt: Date | null
}
