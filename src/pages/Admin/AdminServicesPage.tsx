import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiEdit2, FiTrash2, FiX } from 'react-icons/fi'
import { Button } from '../../components/ui/Button/Button'
import { useServiceCatalog } from '../../hooks/useServiceCatalog'
import { getFirebaseAuth } from '../../lib/firebase'
import { formatCentsToBrlInput, parseBrlToCents } from '../../lib/priceInput'
import {
  addServiceCatalogItem,
  deleteServiceCatalogItem,
  updateServiceCatalogItem,
} from '../../services/serviceCatalogFirestore'
import { syncUserProfileToFirestore } from '../../services/userProfileFirestore'
import '../../components/AdminLayout/AdminLayout.css'
import '../shared/guestContent.css'
import '../Services/ServicesPage.css'

function formatPrice(locale: string, valueInCents: number): string {
  const loc = locale === 'en' ? 'en-US' : 'pt-BR'
  return new Intl.NumberFormat(loc, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(valueInCents / 100)
}

export function AdminServicesPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { items: catalogItems, ready: catalogReady, error: catalogError } = useServiceCatalog()

  const [mutateError, setMutateError] = useState<string | null>(null)
  const [catalogSaving, setCatalogSaving] = useState(false)
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formWhatsapp, setFormWhatsapp] = useState('')

  useEffect(() => {
    if (editingCatalogId) {
      const item = catalogItems.find((c) => c.id === editingCatalogId)
      if (item) {
        setFormName(item.name)
        setFormDescription(item.description)
        setFormPrice(formatCentsToBrlInput(item.priceInCents))
        setFormWhatsapp(item.whatsappPhone || '')
      }
    } else {
      setFormName('')
      setFormDescription('')
      setFormPrice('')
      setFormWhatsapp('')
    }
  }, [editingCatalogId, catalogItems])

  const errorMessage = useMemo(() => {
    if (mutateError) return mutateError
    if (catalogError === 'firestore/listen-failed') {
      return t('servicesPage.errorCatalogListen')
    }
    return null
  }, [mutateError, catalogError, t])

  const clearCatalogForm = useCallback(() => {
    setEditingCatalogId(null)
    setFormName('')
    setFormDescription('')
    setFormPrice('')
    setFormWhatsapp('')
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
          whatsappPhone: formWhatsapp,
        })
      } else {
        await addServiceCatalogItem({
          name: formName,
          description: formDescription,
          priceInCents: cents,
          whatsappPhone: formWhatsapp,
        })
      }
      clearCatalogForm()
    } catch (e) {
      setSaveError(e)
    } finally {
      setCatalogSaving(false)
    }
  }, [
    formName,
    formDescription,
    formPrice,
    formWhatsapp,
    editingCatalogId,
    t,
    clearCatalogForm,
    setSaveError,
  ])

  const handleDeleteCatalog = useCallback(
    async (id: string) => {
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
    [t, editingCatalogId, clearCatalogForm]
  )

  return (
    <div className="page-services">
      <header className="guest-content__hero">
        <h2 className="guest-content__heading">{t('adminServices.title')}</h2>
        <p className="guest-content__lead">{t('adminServices.lead')}</p>
      </header>

      {errorMessage ? (
        <p className="page-services__error" role="alert">
          {errorMessage}
        </p>
      ) : null}

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
            <label className="page-services__label" htmlFor="admin-svc-name">
              {t('servicesPage.admin.fieldName')}
            </label>
            <input
              id="admin-svc-name"
              className="page-services__input"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={catalogSaving}
              autoComplete="off"
            />
          </div>
          <div className="page-services__field">
            <label className="page-services__label" htmlFor="admin-svc-desc">
              {t('servicesPage.admin.fieldDescription')}
            </label>
            <textarea
              id="admin-svc-desc"
              className="page-services__textarea"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              disabled={catalogSaving}
              rows={3}
            />
          </div>
          <div className="page-services__field page-services__field--price">
            <label className="page-services__label" htmlFor="admin-svc-price">
              {t('servicesPage.admin.fieldPrice')}
            </label>
            <input
              id="admin-svc-price"
              className="page-services__input"
              inputMode="decimal"
              placeholder={t('servicesPage.admin.pricePlaceholder')}
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              disabled={catalogSaving}
              autoComplete="off"
            />
          </div>
          <div className="page-services__field">
            <label className="page-services__label" htmlFor="admin-svc-wa">
              {t('servicesPage.admin.fieldWhatsapp')}
            </label>
            <input
              id="admin-svc-wa"
              className="page-services__input"
              inputMode="tel"
              placeholder={t('servicesPage.admin.whatsappPlaceholder')}
              value={formWhatsapp}
              onChange={(e) => setFormWhatsapp(e.target.value)}
              disabled={catalogSaving}
              autoComplete="off"
            />
            <p className="page-services__admin-hint page-services__admin-hint--field">
              {t('servicesPage.admin.whatsappHint')}
            </p>
          </div>
          <div className="page-services__admin-form-actions">
            <Button
              type="button"
              variant="primary"
              size="md"
              loading={catalogSaving}
              onClick={() => void handleSaveCatalog()}
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
                  <p className="page-services__admin-wa">
                    <span className="page-services__admin-wa-label">
                      {t('servicesPage.admin.colWhatsapp')}:{' '}
                    </span>
                    {item.whatsappPhone ? (
                      <span className="page-services__admin-wa-value">{item.whatsappPhone}</span>
                    ) : (
                      <span className="page-services__admin-wa-empty">—</span>
                    )}
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
    </div>
  )
}
