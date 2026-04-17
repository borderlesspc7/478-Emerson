import type { ActiveGuest, ServiceRequestAdmin } from '../types/admin'

export const mockActiveGuests: ActiveGuest[] = [
  {
    id: 'g-1',
    reservationCode: 'ZEN-2026-8841',
    checkInDate: '2026-04-14',
    checkOutDate: '2026-04-18',
  },
  {
    id: 'g-2',
    reservationCode: 'ZEN-2026-8930',
    checkInDate: '2026-04-17',
    checkOutDate: '2026-04-22',
  },
  {
    id: 'g-3',
    reservationCode: 'ZEN-2026-8705',
    checkInDate: '2026-04-05',
    checkOutDate: '2026-04-10',
  },
]

export const mockServiceRequestsAdmin: ServiceRequestAdmin[] = [
  {
    id: 'sr-1',
    reservationCode: 'ZEN-2026-8841',
    serviceType: 'Limpeza extra',
    requestedAt: '2026-04-15T09:20:00-03:00',
    status: 'pending',
  },
  {
    id: 'sr-2',
    reservationCode: 'ZEN-2026-8930',
    serviceType: 'Manutenção',
    requestedAt: '2026-04-16T14:40:00-03:00',
    status: 'pending',
  },
  {
    id: 'sr-3',
    reservationCode: 'ZEN-2026-8705',
    serviceType: 'Troca de enxoval',
    requestedAt: '2026-04-09T11:05:00-03:00',
    status: 'completed',
  },
]
