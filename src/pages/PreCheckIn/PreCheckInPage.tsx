import { useAuth } from '../../hooks/useAuth'
import { useGuestStay } from '../../hooks/useGuestStay'
import { usePreCheckInUnlockMonitor } from '../../hooks/usePreCheckInUnlockMonitor'
import { PreCheckInView } from './PreCheckInView'

export function PreCheckInPage() {
  const { user, logout } = useAuth()
  const { stay, serviceOffers, catalogError } = useGuestStay()

  usePreCheckInUnlockMonitor()

  const propertyName =
    user?.stay?.propertyName ||
    [stay.property.name, stay.property.unit].filter(Boolean).join(' - ')

  return (
    <PreCheckInView
      stay={stay}
      serviceOffers={serviceOffers}
      propertyName={propertyName}
      userName={user?.displayName || undefined}
      reservationCode={user?.reservationCode || undefined}
      guestUid={user?.uid}
      catalogError={catalogError}
      onLogout={logout}
    />
  )
}
