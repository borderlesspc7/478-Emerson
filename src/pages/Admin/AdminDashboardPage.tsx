import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button/Button'
import { mockActiveGuests, mockServiceRequestsAdmin } from '../../data/adminMock'
import { getGuestAccessWindows, upsertGuestAccessWindow } from '../../lib/guestAccess'
import type { ActiveGuest, GuestAccessStatus, ServiceRequestAdmin } from '../../types/admin'
import '../shared/guestContent.css'
import './AdminDashboardPage.css'

const tabKeys = ['guests', 'create', 'services'] as const

type ServiceGroup = {
  reservationCode: string
  items: ServiceRequestAdmin[]
}

function normalizeDate(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

function getGuestStatus(guest: ActiveGuest): GuestAccessStatus {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const checkIn = normalizeDate(guest.checkInDate)
  const checkOut = normalizeDate(guest.checkOutDate)

  if (today < checkIn) return 'future'
  if (today > checkOut) return 'expired'
  return 'active'
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(normalizeDate(value))
}

function formatDateTime(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function groupServicesByReservation(services: ServiceRequestAdmin[]): ServiceGroup[] {
  const map = new Map<string, ServiceRequestAdmin[]>()

  for (const service of services) {
    const list = map.get(service.reservationCode) ?? []
    list.push(service)
    map.set(service.reservationCode, list)
  }

  return Array.from(map.entries()).map(([reservationCode, items]) => ({
    reservationCode,
    items: items.sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    ),
  }))
}

export function AdminDashboardPage() {
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState<(typeof tabKeys)[number]>('guests')
  const [guests, setGuests] = useState<ActiveGuest[]>(() => {
    const fromAccess = getGuestAccessWindows().map((window) => ({
      id: `access-${window.reservationCode}`,
      reservationCode: window.reservationCode,
      checkInDate: window.startDate,
      checkOutDate: window.endDate,
    }))

    const uniqueByReservation = new Map<string, ActiveGuest>()
    for (const guest of [...fromAccess, ...mockActiveGuests]) {
      if (!uniqueByReservation.has(guest.reservationCode)) {
        uniqueByReservation.set(guest.reservationCode, guest)
      }
    }
    return Array.from(uniqueByReservation.values())
  })
  const [services, setServices] = useState<ServiceRequestAdmin[]>(mockServiceRequestsAdmin)
  const [reservationCode, setReservationCode] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const pendingServices = useMemo(
    () => services.filter((service) => service.status === 'pending'),
    [services]
  )

  const completedServices = useMemo(
    () => services.filter((service) => service.status === 'completed'),
    [services]
  )

  const guestByReservation = useMemo(() => {
    const entries = guests.map((guest) => [guest.reservationCode, guest] as const)
    return new Map(entries)
  }, [guests])

  const pendingServiceGroups = useMemo(
    () => groupServicesByReservation(pendingServices),
    [pendingServices]
  )

  const completedServiceGroups = useMemo(
    () => groupServicesByReservation(completedServices),
    [completedServices]
  )

  function resetCreateForm() {
    setReservationCode('')
    setStartDate('')
    setEndDate('')
  }

  function handleCreateAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    if (!reservationCode.trim() || !startDate || !endDate) {
      setFormError(t('admin.create.errorRequired'))
      return
    }

    if (normalizeDate(endDate) < normalizeDate(startDate)) {
      setFormError(t('admin.create.errorDateRange'))
      return
    }

    const newGuest: ActiveGuest = {
      id: `guest-${Date.now()}`,
      reservationCode: reservationCode.trim().toUpperCase(),
      checkInDate: startDate,
      checkOutDate: endDate,
    }

    upsertGuestAccessWindow({
      reservationCode: newGuest.reservationCode,
      startDate,
      endDate,
    })

    setGuests((current) => {
      const withoutSameCode = current.filter(
        (guest) => guest.reservationCode !== newGuest.reservationCode
      )
      return [newGuest, ...withoutSameCode]
    })
    resetCreateForm()
    setSuccessMessage(t('admin.create.success'))
    setActiveTab('guests')

    window.setTimeout(() => {
      setSuccessMessage(null)
    }, 2400)
  }

  function handleCompleteService(serviceId: string) {
    setServices((current) =>
      current.map((service) =>
        service.id === serviceId ? { ...service, status: 'completed' } : service
      )
    )
  }

  function handleDeleteService(serviceId: string) {
    setServices((current) => current.filter((service) => service.id !== serviceId))
  }

  return (
    <div className="page-admin">
      <header className="guest-content__hero">
        <h2 className="guest-content__heading">{t('admin.title')}</h2>
        <p className="guest-content__lead">{t('admin.lead')}</p>
      </header>

      <div className="page-admin__tabs" role="tablist" aria-label={t('admin.tabs.aria')}>
        {tabKeys.map((tabKey) => {
          const isActive = activeTab === tabKey
          return (
            <button
              key={tabKey}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`admin-tab-panel-${tabKey}`}
              id={`admin-tab-${tabKey}`}
              className={`page-admin__tab ${isActive ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tabKey)}
            >
              {t(`admin.tabs.${tabKey}`)}
            </button>
          )
        })}
      </div>

      <section
        className="page-admin__tab-panel"
        role="tabpanel"
        id={`admin-tab-panel-${activeTab}`}
        aria-labelledby={`admin-tab-${activeTab}`}
      >
        {successMessage ? <p className="page-admin__success">{successMessage}</p> : null}

        {activeTab === 'guests' ? (
          <div className="page-admin__table-wrap">
            <table className="page-admin__table">
              <thead>
                <tr>
                  <th>{t('admin.guests.colReservation')}</th>
                  <th>{t('admin.guests.colCheckIn')}</th>
                  <th>{t('admin.guests.colCheckOut')}</th>
                  <th>{t('admin.guests.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((guest) => {
                  const status = getGuestStatus(guest)
                  return (
                    <tr key={guest.id}>
                      <td>{guest.reservationCode}</td>
                      <td>{formatDate(guest.checkInDate, i18n.language)}</td>
                      <td>{formatDate(guest.checkOutDate, i18n.language)}</td>
                      <td>
                        <span className={`page-admin__badge page-admin__badge--${status}`}>
                          {t(`admin.status.${status}`)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === 'create' ? (
          <form className="page-admin__form" onSubmit={handleCreateAccess}>
            <label className="page-admin__field">
              <span>{t('admin.create.reservationCode')}</span>
              <input
                type="text"
                value={reservationCode}
                onChange={(event) => setReservationCode(event.target.value)}
                placeholder={t('admin.create.reservationPlaceholder')}
                required
              />
            </label>

            <label className="page-admin__field">
              <span>{t('admin.create.startDate')}</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
            </label>

            <label className="page-admin__field">
              <span>{t('admin.create.endDate')}</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                required
              />
            </label>

            {formError ? <p className="page-admin__error">{formError}</p> : null}

            <div className="page-admin__form-actions">
              <Button type="submit" variant="primary">
                {t('admin.create.submit')}
              </Button>
            </div>
          </form>
        ) : null}

        {activeTab === 'services' ? (
          <div className="page-admin__services-layout">
            <section>
              <h3 className="guest-content__section">{t('admin.services.pendingTitle')}</h3>
              <div className="page-admin__guest-areas">
                {pendingServiceGroups.length ? (
                  pendingServiceGroups.map((group) => {
                    const guest = guestByReservation.get(group.reservationCode)
                    const guestStatus = guest ? getGuestStatus(guest) : null

                    return (
                      <article key={group.reservationCode} className="page-admin__guest-area">
                        <header className="page-admin__guest-area-header">
                          <div>
                            <p className="guest-content__card-title">
                              {t('admin.services.guestAreaLabel')}
                            </p>
                            <p className="page-admin__guest-area-code">{group.reservationCode}</p>
                          </div>
                          {guestStatus ? (
                            <span className={`page-admin__badge page-admin__badge--${guestStatus}`}>
                              {t(`admin.status.${guestStatus}`)}
                            </span>
                          ) : null}
                        </header>
                        <div className="page-admin__guest-services">
                          {group.items.map((service) => (
                            <article key={service.id} className="guest-content__card page-admin__service-card">
                              <p className="guest-content__card-title">{service.reservationCode}</p>
                              <p className="page-admin__service-type">{service.serviceType}</p>
                              <p className="guest-content__card-meta">
                                {t('admin.services.requestedAt', {
                                  date: formatDateTime(service.requestedAt, i18n.language),
                                })}
                              </p>
                              <span className="page-admin__badge page-admin__badge--pending">
                                {t('admin.status.pending')}
                              </span>
                              <div className="page-admin__service-actions">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="page-admin__btn-success"
                                  onClick={() => handleCompleteService(service.id)}
                                >
                                  {t('admin.services.complete')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => handleDeleteService(service.id)}
                                >
                                  {t('admin.services.delete')}
                                </Button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </article>
                    )
                  })
                ) : (
                  <p className="page-admin__empty">{t('admin.services.pendingEmpty')}</p>
                )}
              </div>
            </section>

            <section>
              <h3 className="guest-content__section">{t('admin.services.historyTitle')}</h3>
              <div className="page-admin__guest-areas">
                {completedServiceGroups.length ? (
                  completedServiceGroups.map((group) => {
                    const guest = guestByReservation.get(group.reservationCode)
                    const guestStatus = guest ? getGuestStatus(guest) : null

                    return (
                      <article key={group.reservationCode} className="page-admin__guest-area">
                        <header className="page-admin__guest-area-header">
                          <div>
                            <p className="guest-content__card-title">
                              {t('admin.services.guestAreaLabel')}
                            </p>
                            <p className="page-admin__guest-area-code">{group.reservationCode}</p>
                          </div>
                          {guestStatus ? (
                            <span className={`page-admin__badge page-admin__badge--${guestStatus}`}>
                              {t(`admin.status.${guestStatus}`)}
                            </span>
                          ) : null}
                        </header>
                        <div className="page-admin__guest-services">
                          {group.items.map((service) => (
                            <article
                              key={service.id}
                              className="guest-content__card page-admin__service-card page-admin__service-card--completed"
                            >
                              <p className="guest-content__card-title">{service.reservationCode}</p>
                              <p className="page-admin__service-type">{service.serviceType}</p>
                              <p className="guest-content__card-meta">
                                {t('admin.services.requestedAt', {
                                  date: formatDateTime(service.requestedAt, i18n.language),
                                })}
                              </p>
                              <span className="page-admin__badge page-admin__badge--completed">
                                {t('admin.status.completed')}
                              </span>
                              <div className="page-admin__service-actions">
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => handleDeleteService(service.id)}
                                >
                                  {t('admin.services.delete')}
                                </Button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </article>
                    )
                  })
                ) : (
                  <p className="page-admin__empty">{t('admin.services.historyEmpty')}</p>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  )
}
