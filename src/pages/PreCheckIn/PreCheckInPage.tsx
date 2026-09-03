import { useAuth } from '../../hooks/useAuth'
import { useGuestStay } from '../../hooks/useGuestStay'
import { usePreCheckInUnlockMonitor } from '../../hooks/usePreCheckInUnlockMonitor'
import { useGuestAccessSettings } from '../../hooks/useGuestEarlyCheckInAccess'
import { resolveAccessReleaseAt } from '../../lib/guestAccessRelease'
import { PreCheckInView } from './PreCheckInView'

export function PreCheckInPage() {
  const { user, logout } = useAuth()
  const { stay, serviceOffers, catalogError } = useGuestStay()
  const accessSettings = useGuestAccessSettings(user)

  usePreCheckInUnlockMonitor()

  const propertyName =
    user?.stay?.propertyName ||
    [stay.property.name, stay.property.unit].filter(Boolean).join(' - ')

  return (
    <PreCheckInView
      stay={stay}
      accessReleaseAt={
        resolveAccessReleaseAt(stay.checkInAt, accessSettings.accessReleaseTime) ??
        stay.checkInAt
      }
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
