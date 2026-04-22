import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiEdit2, FiTrash2, FiX } from 'react-icons/fi'
import { Button } from '../../components/ui/Button/Button'
import { useAuth } from '../../hooks/useAuth'
import { useGuestStay } from '../../hooks/useGuestStay'
import { useServiceRequests } from '../../hooks/useServiceRequests'
import { getFirebaseAuth } from '../../lib/firebase'
import { formatCentsToBrlInput, parseBrlToCents } from '../../lib/priceInput'
import {
  addServiceCatalogItem,
  deleteServiceCatalogItem,
  updateServiceCatalogItem,
} from '../../services/serviceCatalogFirestore'
import { createServiceRequest } from '../../services/serviceRequestsFirestore'
import { syncUserProfileToFirestore } from '../../services/userProfileFirestore'
import '../shared/guestContent.css'
import './ServicesPage.css'

function formatPrice(locale: string, valueInCents: number): string {
  const loc = locale === 'en' ? 'en-US' : 'pt-BR'
  return new Intl.NumberFormat(loc, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(valueInCents / 100)
}

function formatRequestedAt(date: Date | null, locale: string): string {
  if (!date || Number.isNaN(date.getTime())) return '—'
  const loc = locale === 'en' ? 'en' : 'pt-BR'
  return new Intl.DateTimeFormat(loc, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export function ServicesPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const uid = user?.uid
  const isAdmin = user?.role === 'admin'
  const {
    stay,
    serviceOffers,
    catalogItems,
    catalogReady,
    catalogError,
  } = useGuestStay()
  const { requests, loading: historyLoading, error: historyError } = useServiceRequests(
    isAdmin ? undefined : uid
  )

  const [offerLoadingId, setOfferLoadingId] = useState<string | null>(null)
  const [mutateError, setMutateError] = useState<string | null>(null)
  const [catalogSaving, setCatalogSaving] = useState(false)
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPrice, setFormPrice] = useState('')

  useEffect(() => {
    if (editingCatalogId) {
      const item = catalogItems.find((c) => c.id === editingCatalogId)
      if (item) {
        setFormName(item.name)
        setFormDescription(item.description)
        setFormPrice(formatCentsToBrlInput(item.priceInCents))
      }
    } else {
      setFormName('')
      setFormDescription('')
      setFormPrice('')
    }
  }, [editingCatalogId, catalogItems])

  const locale = i18n.language
  const userName = user?.displayName || t('common.guest')
  const reservationCode =
    user?.reservationCode || stay.reservationCode || t('servicesPage.notInformed')
  const propertyName =
    user?.stay?.propertyName ||
    [stay.property.name, stay.property.unit].filter(Boolean).join(' - ')

  const showGuestRequestFlow = isAdmin ? false : true

  const pricesByServiceId = useMemo(
    () => new Map(serviceOffers.map((offer) => [offer.id, offer.priceInCents])),
    [serviceOffers]
  )

  const errorMessage = useMemo(() => {
    if (mutateError) return mutateError
    if (!isAdmin && historyError === 'firestore/listen-failed') {
      return t('servicesPage.errorListen')
    }
    if (catalogError === 'firestore/listen-failed') {
      return t('servicesPage.errorCatalogListen')
    }
    return null
  }, [isAdmin, mutateError, historyError, catalogError, t])

  const clearCatalogForm = useCallback(() => {
    setEditingCatalogId(null)
    setFormName('')
    setFormDescription('')
    setFormPrice('')
  }, [])

  const setSaveError = useCallback(
    (e: unknown) => {
      const code =
        e && typeof e === 'object' && 'code' in e
          ? String((e as { code: string }).code)
          : ''
      if (code === 'permission-denied') {
        setMutateError(t('servicesPage.admin.errorPermission'))
        return
      }
      setMutateError(t('servicesPage.admin.errorSave'))
    },
    [t]
  )

  const handleSaveCatalog = useCallback(async () => {
    if (!isAdmin) return
    if (!formName.trim()) {
      setMutateError(t('servicesPage.admin.errorNameRequired'))
      return
    }
    setMutateError(null)
    setCatalogSaving(true)
    const cents = parseBrlToCents(formPrice)
    try {
      const authUser = getFirebaseAuth()?.currentUser
      if (authUser) {
        await syncUserProfileToFirestore(authUser)
      }
      if (editingCatalogId) {
        await updateServiceCatalogItem(editingCatalogId, {
          name: formName,
          description: formDescription,
          priceInCents: cents,
        })
      } else {
        await addServiceCatalogItem({
          name: formName,
          description: formDescription,
          priceInCents: cents,
        })
      }
      clearCatalogForm()
    } catch (e) {
      setSaveError(e)
    } finally {
      setCatalogSaving(false)
    }
  }, [
    isAdmin,
    formName,
    formDescription,
    formPrice,
    editingCatalogId,
    t,
    clearCatalogForm,
    setSaveError,
  ])

  const handleDeleteCatalog = useCallback(
    async (id: string) => {
      if (!isAdmin) return
      if (!window.confirm(t('servicesPage.admin.confirmDeleteOffer'))) return
      setMutateError(null)
      setCatalogSaving(true)
      try {
        const authUser = getFirebaseAuth()?.currentUser
        if (authUser) {
          await syncUserProfileToFirestore(authUser)
        }
        await deleteServiceCatalogItem(id)
        if (editingCatalogId === id) clearCatalogForm()
      } catch (e) {
        const code =
          e && typeof e === 'object' && 'code' in e
            ? String((e as { code: string }).code)
            : ''
        if (code === 'permission-denied') {
          setMutateError(t('servicesPage.admin.errorPermission'))
        } else {
          setMutateError(t('servicesPage.admin.errorDelete'))
        }
      } finally {
        setCatalogSaving(false)
      }
    },
    [isAdmin, t, editingCatalogId, clearCatalogForm]
  )

  const handleRequest = useCallback(
    async (serviceId: string) => {
      if (!uid || isAdmin) return
      setMutateError(null)
      setOfferLoadingId(serviceId)
      try {
        const offer = serviceOffers.find((o) => o.id === serviceId)
        if (!offer) return
        const priceInCents = pricesByServiceId.get(serviceId) ?? 0
        await createServiceRequest(uid, serviceId, priceInCents, {
          serviceName: offer.name,
          requesterName: userName,
          reservationCode,
          propertyName,
        })
        const price = formatPrice(locale, priceInCents)
        const message = t('servicesPage.whatsappMessage', {
          name: userName,
          reservationCode,
          property: propertyName,
          service: offer.name,
          price,
        })
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
      } catch {
        setMutateError(t('servicesPage.errorCreate'))
      } finally {
        setOfferLoadingId(null)
      }
    },
    [
      uid,
      isAdmin,
      serviceOffers,
      pricesByServiceId,
      userName,
      reservationCode,
      propertyName,
      locale,
      t,
    ]
  )

  const historyHeadingId = 'services-history-heading'

  return (
    <div className="page-services">
      <header className="guest-content__hero">
        <h2 className="guest-content__heading">{t('servicesPage.title')}</h2>
        <p className="guest-content__lead">
          {isAdmin ? t('servicesPage.leadAdmin') : t('servicesPage.lead')}
        </p>
      </header>

      {errorMessage ? (
        <p className="page-services__error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {isAdmin ? (
        <section
          className="page-services__catalog page-services__catalog--admin"
          aria-label={t('servicesPage.admin.sectionManage')}
        >
          <h3 className="guest-content__section page-services__section-title">
            {t('servicesPage.admin.sectionManage')}
          </h3>
          <p className="page-services__admin-hint">{t('servicesPage.admin.hint')}</p>

          <div className="page-services__admin-form">
            {editingCatalogId ? (
              <p className="page-services__editing-label">
                {t('servicesPage.admin.editing', { name: formName || '—' })}
              </p>
            ) : null}
            <div className="page-services__field">
              <label className="page-services__label" htmlFor="svc-name">
                {t('servicesPage.admin.fieldName')}
              </label>
              <input
                id="svc-name"
                className="page-services__input"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={catalogSaving}
                autoComplete="off"
              />
            </div>
            <div className="page-services__field">
              <label className="page-services__label" htmlFor="svc-desc">
                {t('servicesPage.admin.fieldDescription')}
              </label>
              <textarea
                id="svc-desc"
                className="page-services__textarea"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                disabled={catalogSaving}
                rows={3}
              />
            </div>
            <div className="page-services__field page-services__field--price">
              <label className="page-services__label" htmlFor="svc-price">
                {t('servicesPage.admin.fieldPrice')}
              </label>
              <input
                id="svc-price"
                className="page-services__input"
                inputMode="decimal"
                placeholder={t('servicesPage.admin.pricePlaceholder')}
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                disabled={catalogSaving}
                autoComplete="off"
              />
            </div>
            <div className="page-services__admin-form-actions">
              <Button
                type="button"
                variant="primary"
                size="md"
                loading={catalogSaving}
                onClick={handleSaveCatalog}
              >
                {editingCatalogId ? t('servicesPage.admin.save') : t('servicesPage.admin.add')}
              </Button>
              {editingCatalogId ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  leftIcon={<FiX aria-hidden />}
                  disabled={catalogSaving}
                  onClick={clearCatalogForm}
                >
                  {t('servicesPage.admin.cancelEdit')}
                </Button>
              ) : null}
            </div>
          </div>

          {!catalogReady ? (
            <p className="page-services__catalog-loading" role="status">
              {t('servicesPage.admin.catalogLoading')}
            </p>
          ) : catalogItems.length === 0 ? (
            <p className="page-services__empty">{t('servicesPage.admin.catalogEmpty')}</p>
          ) : (
            <ul
              className="page-services__admin-list"
              aria-label={t('servicesPage.admin.listAria')}
            >
              {catalogItems.map((item) => (
                <li key={item.id} className="page-services__admin-row">
                  <div>
                    <strong className="page-services__admin-name">{item.name}</strong>
                    <p className="page-services__admin-desc">{item.description || '—'}</p>
                    <p className="page-services__admin-price">
                      {formatPrice(locale, item.priceInCents)}
                    </p>
                  </div>
                  <div className="page-services__admin-row-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<FiEdit2 aria-hidden />}
                      onClick={() => setEditingCatalogId(item.id)}
                      disabled={catalogSaving}
                    >
                      {t('servicesPage.admin.edit')}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      leftIcon={<FiTrash2 aria-hidden />}
                      onClick={() => void handleDeleteCatalog(item.id)}
                      disabled={catalogSaving}
                    >
                      {t('servicesPage.admin.remove')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {showGuestRequestFlow ? (
        <section
          className="page-services__catalog"
          aria-label={t('servicesPage.sectionCatalog')}
        >
          <h3 className="guest-content__section page-services__section-title">
            {t('servicesPage.sectionCatalog')}
          </h3>
          <ul className="page-services__list" aria-label={t('servicesPage.listAria')}>
            {serviceOffers.map((offer) => {
              const formattedPrice = formatPrice(locale, offer.priceInCents)
              return (
                <li key={offer.id} className="page-services__row">
                  <div className="page-services__body">
                    <h4 className="page-services__title">{offer.name}</h4>
                    <p className="page-services__desc">{offer.description}</p>
                  </div>
                  <div className="page-services__action">
                    <span className="page-services__price-label">
                      {t('servicesPage.priceLabel')}
                    </span>
                    <strong className="page-services__price-value">{formattedPrice}</strong>
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      loading={offerLoadingId === offer.id}
                      disabled={!uid || offerLoadingId !== null}
                      onClick={() => void handleRequest(offer.id)}
                    >
                      {t('servicesPage.request')}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {!isAdmin ? (
        <section
          className="page-services__history-panel"
          aria-labelledby={historyHeadingId}
        >
          <div className="page-services__history-intro">
            <h3
              id={historyHeadingId}
              className="guest-content__section page-services__section-title"
            >
              {t('servicesPage.sectionHistory')}
            </h3>
            <p className="page-services__history-lead">
              {t('servicesPage.sectionHistoryLead')}
            </p>
          </div>

          {historyLoading && requests.length === 0 ? (
            <p className="page-services__history-loading">
              {t('servicesPage.historyLoading')}
            </p>
          ) : null}
          {!historyLoading && requests.length === 0 ? (
            <p className="page-services__history-empty">
              {t('servicesPage.historyEmpty')}
            </p>
          ) : null}

          {requests.length > 0 ? (
            <div
              className="page-services__history-table"
              role="table"
              aria-label={t('servicesPage.historyAria')}
            >
              <div
                className="page-services__history-row page-services__history-row--head"
                role="row"
              >
                <div className="page-services__history-cell" role="columnheader">
                  {t('servicesPage.colService')}
                </div>
                <div className="page-services__history-cell" role="columnheader">
                  {t('servicesPage.colStatus')}
                </div>
                <div className="page-services__history-cell" role="columnheader">
                  {t('servicesPage.colDate')}
                </div>
                <div className="page-services__history-cell" role="columnheader">
                  {t('servicesPage.colReservation')}
                </div>
                <div className="page-services__history-cell" role="columnheader">
                  {t('servicesPage.colProperty')}
                </div>
                <div className="page-services__history-cell" role="columnheader">
                  {t('servicesPage.colPrice')}
                </div>
              </div>
              <div className="page-services__history-body" role="rowgroup">
                {requests.map((req) => {
                  const isPending = req.status === 'pending'
                  const title = req.serviceName || t('servicesPage.unknownService')
                  const requested = formatRequestedAt(req.createdAt, locale)
                  const requestPrice = formatPrice(locale, req.priceInCents)
                  const requestReservation = req.reservationCode || reservationCode
                  const requestProperty = req.propertyName || propertyName
                  const statusLabel = isPending
                    ? t('servicesPage.statusPending')
                    : t('servicesPage.statusCompleted')

                  return (
                    <div key={req.id} className="page-services__history-row" role="row">
                      <div
                        className="page-services__history-cell"
                        role="cell"
                        data-label={t('servicesPage.colService')}
                      >
                        <span className="page-services__history-service">{title}</span>
                      </div>
                      <div
                        className="page-services__history-cell"
                        role="cell"
                        data-label={t('servicesPage.colStatus')}
                      >
                        <span
                          className={`page-services__badge ${
                            isPending
                              ? 'page-services__badge--pending'
                              : 'page-services__badge--completed'
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <div
                        className="page-services__history-cell"
                        role="cell"
                        data-label={t('servicesPage.colDate')}
                      >
                        <time
                          className="page-services__history-date"
                          dateTime={req.createdAt?.toISOString() ?? undefined}
                        >
                          {requested}
                        </time>
                      </div>
                      <div
                        className="page-services__history-cell"
                        role="cell"
                        data-label={t('servicesPage.colReservation')}
                      >
                        <span className="page-services__history-text">
                          {requestReservation}
                        </span>
                      </div>
                      <div
                        className="page-services__history-cell"
                        role="cell"
                        data-label={t('servicesPage.colProperty')}
                      >
                        <span className="page-services__history-text">
                          {requestProperty}
                        </span>
                      </div>
                      <div
                        className="page-services__history-cell"
                        role="cell"
                        data-label={t('servicesPage.colPrice')}
                      >
                        <span className="page-services__history-price">{requestPrice}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {!isAdmin ? (
        <p className="page-services__hint">{t('servicesPage.hint')}</p>
      ) : null}
    </div>
  )
}
