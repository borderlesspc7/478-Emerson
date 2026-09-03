import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiImage } from 'react-icons/fi'
import { Button } from '../../components/ui/Button/Button'
import { useToast } from '../../contexts/ToastContext'
import { guestDirectEntryAbsUrl } from '../../lib/guestDirectLink'
import { resolveReservationPropertyDisplay } from '../../lib/staysReservationProperty'
import { resolveGuestReservationCode } from '../../lib/staysReservationCode'
import { normalizeStaysCustomFields } from '../../lib/staysCustomFields'
import type { StaysCustomFieldGuest } from '../../types/staysCustomField'
import { getFirebaseAuth } from '../../lib/firebase'
import {
  normalizeGuestAccessReservationCode,
  upsertGuestAccessLink,
} from '../../services/guestAccessLinkFirestore'
import { syncUserProfileToFirestore } from '../../services/userProfileFirestore'
import {
  fetchListingById,
  fetchListingCustomFieldLabelMap,
  fetchReservationProperty,
} from '../../services/staysService'
import { StaysApiError } from '../../services/staysClient'
import './AdminCreateAccess.css'

const PICKER_PAGE_SIZE = 12

export type AdminPropertyPickerItem = {
  propertyId: string
  title: string
  shortCode: string | null
  imageUrl: string | null
}

type AdminCreateAccessProps = {
  propertyPickerItems: AdminPropertyPickerItem[]
  loadingProperties: boolean
}

export function AdminCreateAccess({
  propertyPickerItems,
  loadingProperties,
}: AdminCreateAccessProps) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [code, setCode] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [propertySummary, setPropertySummary] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [pickerPage, setPickerPage] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [lastGuestDirectUrl, setLastGuestDirectUrl] = useState<string | null>(null)
  const [fieldDefs, setFieldDefs] = useState<StaysCustomFieldGuest[]>([])
  const [loadingCustomFields, setLoadingCustomFields] = useState(false)
  const [visibility, setVisibility] = useState<Record<string, boolean>>({})
  const [propertySource, setPropertySource] = useState<'stays' | 'manual' | null>(null)
  const [reservationLookupLoading, setReservationLookupLoading] = useState(false)
  const [reservationLookupMessage, setReservationLookupMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const closePicker = useCallback(() => setPickerOpen(false), [])

  useEffect(() => {
    if (!pickerOpen) return
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') closePicker()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pickerOpen, closePicker])

  useEffect(() => {
    if (!pickerOpen) return
    setPickerQuery('')
    setPickerPage(0)
  }, [pickerOpen])

  useEffect(() => {
    setPickerPage(0)
  }, [pickerQuery])

  const filteredPickerItems = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase()
    if (!q) return propertyPickerItems
    return propertyPickerItems.filter((item) => {
      const id = item.propertyId.toLowerCase()
      const code = (item.shortCode ?? '').toLowerCase()
      return (
        id.includes(q) ||
        code.includes(q) ||
        item.title.toLowerCase().includes(q)
      )
    })
  }, [propertyPickerItems, pickerQuery])

  const pickerTotalPages = Math.max(
    1,
    Math.ceil(filteredPickerItems.length / PICKER_PAGE_SIZE),
  )

  useEffect(() => {
    setPickerPage((p) => Math.min(p, pickerTotalPages - 1))
  }, [pickerTotalPages])

  const pickerPageItems = useMemo(() => {
    const start = pickerPage * PICKER_PAGE_SIZE
    return filteredPickerItems.slice(start, start + PICKER_PAGE_SIZE)
  }, [filteredPickerItems, pickerPage])

  const pickerRangeFrom =
    filteredPickerItems.length === 0 ? 0 : pickerPage * PICKER_PAGE_SIZE + 1
  const pickerRangeTo = Math.min(
    (pickerPage + 1) * PICKER_PAGE_SIZE,
    filteredPickerItems.length,
  )

  useEffect(() => {
    let cancelled = false
    const id = propertyId.trim()
    if (!id) {
      setFieldDefs([])
      setVisibility({})
      setLoadingCustomFields(false)
      return
    }
    setLoadingCustomFields(true)
    void (async () => {
      try {
        const [listing, labelMap] = await Promise.all([
          fetchListingById(id),
          fetchListingCustomFieldLabelMap().catch(
            () => new Map<string, string>(),
          ),
        ])
        if (cancelled) return
        const defs = normalizeStaysCustomFields(listing.customFields, labelMap)
        setFieldDefs(defs)
        setVisibility(Object.fromEntries(defs.map((f) => [f.key, true])))
      } catch {
        if (!cancelled) {
          setFieldDefs([])
          setVisibility({})
        }
      } finally {
        if (!cancelled) setLoadingCustomFields(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [propertyId])

  function setFieldVisible(key: string, visible: boolean) {
    setVisibility((prev) => ({ ...prev, [key]: visible }))
  }

  function selectProperty(item: AdminPropertyPickerItem) {
    setPropertyId(item.propertyId)
    setPropertySource('manual')
    const codePart = item.shortCode
      ? `${item.shortCode} · ${item.propertyId}`
      : item.propertyId
    setPropertySummary(`${item.title} (${codePart})`)
    closePicker()
  }

  function handleReservationCodeChange(nextCode: string) {
    setCode(nextCode)
    setReservationLookupMessage(null)
    if (propertySource === 'stays') {
      setPropertyId('')
      setPropertySummary('')
      setPropertySource(null)
    }
  }

  async function resolvePropertyFromReservation(options?: {
    silentEmpty?: boolean
  }): Promise<{ propertyId: string; reservationCode: string } | null> {
    const trimmed = code.trim()
    if (!trimmed) {
      if (!options?.silentEmpty) {
        setReservationLookupMessage({
          type: 'error',
          text: t('adminCreateAccess.lookupEmpty'),
        })
      }
      return null
    }

    setReservationLookupLoading(true)
    setReservationLookupMessage(null)
    try {
      const { booking, listingId, listing } = await fetchReservationProperty(trimmed)
      const resolved = resolveReservationPropertyDisplay(
        listingId,
        listing,
        propertyPickerItems,
      )
      const guestReservationCode = resolveGuestReservationCode(booking, trimmed)
      setCode(guestReservationCode)
      setPropertyId(resolved.propertyId)
      setPropertySummary(resolved.summary)
      setPropertySource('stays')
      setReservationLookupMessage({
        type: 'success',
        text: t('adminCreateAccess.lookupSuccess'),
      })
      return {
        propertyId: resolved.propertyId,
        reservationCode: guestReservationCode,
      }
    } catch (error) {
      if (propertySource === 'stays') {
        setPropertyId('')
        setPropertySummary('')
        setPropertySource(null)
      }
      const errorKey =
        error instanceof StaysApiError
          ? {
              'stays/not-found': 'lookupNotFound',
              'stays/reservation-canceled': 'lookupCanceled',
              'stays/reservation-without-listing': 'lookupWithoutProperty',
              'stays/unauthorized': 'lookupUnauthorized',
              'stays/not-configured': 'lookupNotConfigured',
              'stays/invalid-response': 'lookupInvalidResponse',
            }[error.code ?? '']
          : undefined
      setReservationLookupMessage({
        type: 'error',
        text: t(`adminCreateAccess.${errorKey ?? 'lookupError'}`),
      })
      return null
    } finally {
      setReservationLookupLoading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) {
      showToast(t('adminCreateAccess.validation'), 'error')
      return
    }

    let reservationCode = trimmed
    let resolvedPropertyId = propertyId.trim()
    if (!resolvedPropertyId) {
      const fromStays = await resolvePropertyFromReservation()
      resolvedPropertyId = fromStays?.propertyId.trim() ?? ''
      reservationCode = fromStays?.reservationCode ?? reservationCode
    }

    if (!resolvedPropertyId) {
      showToast(t('adminCreateAccess.validation'), 'error')
      return
    }
    setSubmitting(true)
    try {
      const authUser = getFirebaseAuth()?.currentUser
      if (authUser) {
        await syncUserProfileToFirestore(authUser)
      }
      await upsertGuestAccessLink({
        reservationCode,
        propertyId: resolvedPropertyId,
        accessActive: true,
        customFieldVisibility:
          Object.keys(visibility).length > 0 ? visibility : undefined,
      })
      setLastGuestDirectUrl(
        guestDirectEntryAbsUrl(normalizeGuestAccessReservationCode(reservationCode)),
      )
      showToast(t('adminCreateAccess.success'), 'success')
      setCode('')
      setPropertyId('')
      setPropertySummary('')
      setPropertySource(null)
      setReservationLookupMessage(null)
      setFieldDefs([])
      setVisibility({})
    } catch (err: unknown) {
      console.error('[AdminCreateAccess] upsertGuestAccessLink', err)
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : ''
      if (code === 'permission-denied') {
        showToast(t('adminCreateAccess.errorPermission'), 'error')
      } else if (
        err instanceof Error &&
        err.message === 'guest-access/invalid-reservation-code'
      ) {
        showToast(t('adminCreateAccess.validation'), 'error')
      } else {
        showToast(t('adminCreateAccess.error'), 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function copyGuestDirectUrl() {
    if (!lastGuestDirectUrl) return
    try {
      await navigator.clipboard.writeText(lastGuestDirectUrl)
      showToast(t('adminCreateAccess.directLinkCopied'), 'success')
    } catch {
      showToast(t('adminCreateAccess.directLinkCopyFailed'), 'error')
    }
  }

  const pickerModal =
    pickerOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="admin-property-picker__backdrop"
            role="presentation"
            onClick={closePicker}
          >
            <div
              className="admin-property-picker__dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-property-picker-title"
              onClick={(ev) => ev.stopPropagation()}
            >
              <header className="admin-property-picker__header">
                <h5 id="admin-property-picker-title" className="admin-property-picker__title">
                  {t('adminCreateAccess.modalTitle')}
                </h5>
                <button
                  type="button"
                  className="admin-property-picker__close"
                  onClick={closePicker}
                  aria-label={t('adminCreateAccess.modalClose')}
                >
                  ×
                </button>
              </header>
              <div
                className={
                  !loadingProperties && propertyPickerItems.length > 0
                    ? 'admin-property-picker__body admin-property-picker__body--picker'
                    : 'admin-property-picker__body'
                }
              >
                {loadingProperties ? (
                  <p className="guest-content__card-meta" role="status">
                    {t('adminCreateAccess.loadingProperties')}
                  </p>
                ) : propertyPickerItems.length === 0 ? (
                  <p className="guest-content__card-meta">{t('adminCreateAccess.noProperties')}</p>
                ) : (
                  <>
                    <div className="admin-property-picker__toolbar">
                      <label className="admin-property-picker__search-label">
                        <span className="admin-property-picker__search-label-text">
                          {t('adminCreateAccess.propertySearchLabel')}
                        </span>
                        <input
                          type="search"
                          className="admin-property-picker__search-input"
                          value={pickerQuery}
                          onChange={(ev) => setPickerQuery(ev.target.value)}
                          placeholder={t('adminCreateAccess.propertySearchPlaceholder')}
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </label>
                    </div>
                    {filteredPickerItems.length === 0 ? (
                      <p className="guest-content__card-meta admin-property-picker__empty-msg">
                        {t('adminCreateAccess.propertyNoSearchResults')}
                      </p>
                    ) : (
                      <>
                        <div className="admin-property-picker__grid-wrap">
                          <ul className="admin-property-picker__grid">
                            {pickerPageItems.map((item) => (
                              <li key={item.propertyId}>
                                <button
                                  type="button"
                                  className={`admin-property-picker__card ${
                                    propertyId === item.propertyId ? 'is-selected' : ''
                                  }`}
                                  onClick={() => selectProperty(item)}
                                >
                                  <div className="admin-property-picker__thumb">
                                    {item.imageUrl ? (
                                      <img src={item.imageUrl} alt="" loading="lazy" />
                                    ) : (
                                      <span
                                        className="admin-property-picker__thumb-fallback"
                                        aria-hidden
                                      >
                                        <FiImage />
                                      </span>
                                    )}
                                  </div>
                                  <span className="admin-property-picker__card-title">
                                    {item.title}
                                  </span>
                                  <span className="admin-property-picker__card-code">
                                    {item.shortCode
                                      ? `${item.shortCode} · ${item.propertyId}`
                                      : item.propertyId}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {pickerTotalPages > 1 ? (
                          <footer className="admin-property-picker__footer">
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={pickerPage <= 0}
                              onClick={() => setPickerPage((p) => Math.max(0, p - 1))}
                            >
                              {t('adminCreateAccess.paginationPrev')}
                            </Button>
                            <p className="admin-property-picker__footer-meta">
                              {t('adminCreateAccess.paginationSummary', {
                                page: pickerPage + 1,
                                totalPages: pickerTotalPages,
                                from: pickerRangeFrom,
                                to: pickerRangeTo,
                                total: filteredPickerItems.length,
                              })}
                            </p>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={pickerPage >= pickerTotalPages - 1}
                              onClick={() =>
                                setPickerPage((p) =>
                                  Math.min(pickerTotalPages - 1, p + 1),
                                )
                              }
                            >
                              {t('adminCreateAccess.paginationNext')}
                            </Button>
                          </footer>
                        ) : (
                          <p className="admin-property-picker__footer-meta admin-property-picker__footer-meta--solo">
                            {t('adminCreateAccess.paginationCountOnly', {
                              from: pickerRangeFrom,
                              to: pickerRangeTo,
                              total: filteredPickerItems.length,
                            })}
                          </p>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      {pickerModal}
      <form className="admin-create-access admin-form" onSubmit={handleSubmit}>
        <h4 className="guest-content__section" style={{ margin: 0 }}>
          {t('adminCreateAccess.title')}
        </h4>
        <p className="guest-content__lead" style={{ marginTop: '0.35rem' }}>
          {t('adminCreateAccess.lead')}
        </p>

        <label>
          <span>{t('adminCreateAccess.fieldReservation')}</span>
          <div className="admin-create-access__reservation-row">
            <input
              value={code}
              onChange={(ev) => handleReservationCodeChange(ev.target.value)}
              onBlur={() => {
                if (!code.trim() || propertyId.trim() || reservationLookupLoading) return
                void resolvePropertyFromReservation({ silentEmpty: true })
              }}
              onKeyDown={(ev) => {
                if (ev.key !== 'Enter') return
                ev.preventDefault()
                void resolvePropertyFromReservation()
              }}
              placeholder={t('adminCreateAccess.placeholderReservation')}
              autoComplete="off"
            />
            <Button
              type="button"
              variant="secondary"
              loading={reservationLookupLoading}
              disabled={!code.trim()}
              onClick={() => void resolvePropertyFromReservation()}
            >
              {t('adminCreateAccess.lookupReservation')}
            </Button>
          </div>
        </label>

        {reservationLookupMessage ? (
          <p
            className={`admin-create-access__lookup-message admin-create-access__lookup-message--${reservationLookupMessage.type}`}
            role={reservationLookupMessage.type === 'error' ? 'alert' : 'status'}
          >
            {reservationLookupMessage.text}
          </p>
        ) : null}

        <div className="admin-create-access__property-field">
          <span className="admin-create-access__field-label">{t('adminCreateAccess.fieldProperty')}</span>
          <div className="admin-create-access__property-row">
            <Button
              type="button"
              variant="secondary"
              disabled={loadingProperties}
              onClick={() => setPickerOpen(true)}
            >
              {propertySummary
                ? t('adminCreateAccess.changeProperty')
                : t('adminCreateAccess.chooseProperty')}
            </Button>
          </div>
          {propertySummary ? (
            <p className="guest-content__card-meta admin-create-access__property-summary">
              {propertySummary}
            </p>
          ) : (
            <p className="guest-content__card-meta">{t('adminCreateAccess.propertyHint')}</p>
          )}
        </div>

        {propertyId.trim() ? (
          <div className="admin-create-access__visibility" aria-live="polite">
            <h5 className="admin-create-access__visibility-title">
              {t('adminCreateAccess.visibilityTitle')}
            </h5>
            <p className="guest-content__card-meta admin-create-access__visibility-lead">
              {t('adminCreateAccess.visibilityLead')}
            </p>
            {loadingCustomFields ? (
              <p className="guest-content__card-meta" role="status">
                {t('adminCreateAccess.loadingCustomFields')}
              </p>
            ) : fieldDefs.length === 0 ? (
              <p className="guest-content__card-meta">{t('adminCreateAccess.noCustomFields')}</p>
            ) : (
              <ul className="admin-create-access__switch-list">
                {fieldDefs.map((f) => (
                  <li key={f.key} className="admin-create-access__switch-row">
                    <div className="admin-create-access__switch-text">
                      <span className="admin-create-access__switch-label">{f.label}</span>
                      {f.value ? (
                        <span className="admin-create-access__switch-preview">{f.value}</span>
                      ) : (
                        <span className="admin-create-access__switch-preview admin-create-access__switch-preview--empty">
                          {t('adminCreateAccess.emptyFieldValue')}
                        </span>
                      )}
                    </div>
                    <label className="admin-create-access__switch">
                      <input
                        type="checkbox"
                        role="switch"
                        checked={visibility[f.key] !== false}
                        onChange={(ev) => setFieldVisible(f.key, ev.target.checked)}
                        aria-label={t('adminCreateAccess.switchAria', { label: f.label })}
                      />
                      <span className="admin-create-access__switch-ui" aria-hidden />
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <Button type="submit" variant="primary" loading={submitting}>
          {t('adminCreateAccess.submit')}
        </Button>

        {lastGuestDirectUrl ? (
          <div className="admin-create-access__direct-link" role="region" aria-label={t('adminCreateAccess.directLinkTitle')}>
            <h5 className="admin-create-access__direct-link-title">{t('adminCreateAccess.directLinkTitle')}</h5>
            <p className="guest-content__card-meta admin-create-access__direct-link-lead">
              {t('adminCreateAccess.directLinkLead')}
            </p>
            <div className="admin-create-access__direct-link-row">
              <input
                type="text"
                readOnly
                className="admin-create-access__direct-link-input"
                value={lastGuestDirectUrl}
                onFocus={(ev) => ev.currentTarget.select()}
              />
              <Button type="button" variant="secondary" onClick={() => void copyGuestDirectUrl()}>
                {t('adminCreateAccess.copyDirectLink')}
              </Button>
            </div>
            <Button type="button" variant="secondary" onClick={() => setLastGuestDirectUrl(null)}>
              {t('adminCreateAccess.dismissDirectLink')}
            </Button>
          </div>
        ) : null}
      </form>
    </>
  )
}
