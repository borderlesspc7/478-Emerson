import { useMemo } from 'react'
import { mockGuestStay, mockServiceOffers } from '../../data/mockGuestStay'
import type { GuestStay } from '../../types/guestStay'
import { PreCheckInView } from './PreCheckInView'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function toStayBrazilIso(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:00-03:00`
}

function buildPreviewGuestStay(): GuestStay {
  const checkIn = new Date()
  checkIn.setDate(checkIn.getDate() + 2)
  checkIn.setHours(15, 0, 0, 0)

  const checkOut = new Date(checkIn)
  checkOut.setDate(checkOut.getDate() + 4)
  checkOut.setHours(11, 0, 0, 0)

  return {
    ...mockGuestStay,
    checkInAt: toStayBrazilIso(checkIn),
    checkOutAt: toStayBrazilIso(checkOut),
  }
}

/** Pré-visualização local da tela de pré-check-in (sem login nem acesso criado). */
export function PreCheckInPreviewPage() {
  const stay = useMemo(() => buildPreviewGuestStay(), [])
  const propertyName = [stay.property.name, stay.property.unit].filter(Boolean).join(' - ')

  return (
    <PreCheckInView
      preview
      stay={stay}
      serviceOffers={mockServiceOffers}
      propertyName={propertyName}
      userName="Hóspede (pré-visualização)"
      reservationCode={stay.reservationCode}
    />
  )
}
