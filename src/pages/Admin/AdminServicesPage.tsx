import { useCallback, useEffect, useMemo, useState } from 'react'

import { createPortal } from 'react-dom'

import { useTranslation } from 'react-i18next'

import { FiAlertTriangle, FiEdit2, FiTrash2 } from 'react-icons/fi'

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



  const [formName, setFormName] = useState('')

  const [formDescription, setFormDescription] = useState('')

  const [formPrice, setFormPrice] = useState('')

  const [formWhatsapp, setFormWhatsapp] = useState('')



  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  const [editName, setEditName] = useState('')

  const [editDescription, setEditDescription] = useState('')

  const [editPrice, setEditPrice] = useState('')

  const [editWhatsapp, setEditWhatsapp] = useState('')

  const [editModalError, setEditModalError] = useState<string | null>(null)



  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)



  const editingItem = useMemo(

    () => (editingItemId ? catalogItems.find((c) => c.id === editingItemId) : undefined),

    [editingItemId, catalogItems]

  )



  const deletingItem = useMemo(

    () => (deletingItemId ? catalogItems.find((c) => c.id === deletingItemId) : undefined),

    [deletingItemId, catalogItems]

  )



  const errorMessage = useMemo(() => {

    if (mutateError) return mutateError

    if (catalogError === 'firestore/listen-failed') {

      return t('servicesPage.errorCatalogListen')

    }

    return null

  }, [mutateError, catalogError, t])



  const clearCreateForm = useCallback(() => {

    setFormName('')

    setFormDescription('')

    setFormPrice('')

    setFormWhatsapp('')

  }, [])



  const closeEditModal = useCallback(() => {

    setEditingItemId(null)

    setEditName('')

    setEditDescription('')

    setEditPrice('')

    setEditWhatsapp('')

    setEditModalError(null)

  }, [])



  const openEditModal = useCallback((id: string) => {

    const item = catalogItems.find((c) => c.id === id)

    if (!item) return

    setEditingItemId(id)

    setEditName(item.name)

    setEditDescription(item.description)

    setEditPrice(formatCentsToBrlInput(item.priceInCents))

    setEditWhatsapp(item.whatsappPhone || '')

    setEditModalError(null)

  }, [catalogItems])



  const closeDeleteModal = useCallback(() => {

    setDeletingItemId(null)

  }, [])



  useEffect(() => {

    if (!editingItemId && !deletingItemId) return

    const onKey = (ev: KeyboardEvent) => {

      if (ev.key !== 'Escape') return

      if (editingItemId) closeEditModal()

      else if (deletingItemId) closeDeleteModal()

    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)

  }, [editingItemId, deletingItemId, closeEditModal, closeDeleteModal])



  const setSaveError = useCallback(

    (e: unknown, target: 'page' | 'edit' = 'page') => {

      const code =

        e && typeof e === 'object' && 'code' in e

          ? String((e as { code: string }).code)

          : ''

      const message =

        code === 'permission-denied'

          ? t('servicesPage.admin.errorPermission')

          : t('servicesPage.admin.errorSave')

      if (target === 'edit') {

        setEditModalError(message)

      } else {

        setMutateError(message)

      }

    },

    [t]

  )



  const handleAddCatalog = useCallback(async () => {

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

      await addServiceCatalogItem({

        name: formName,

        description: formDescription,

        priceInCents: cents,

        whatsappPhone: formWhatsapp,

      })

      clearCreateForm()

    } catch (e) {

      setSaveError(e)

    } finally {

      setCatalogSaving(false)

    }

  }, [formName, formDescription, formPrice, formWhatsapp, t, clearCreateForm, setSaveError])



  const handleSaveEdit = useCallback(async () => {

    if (!editingItemId) return

    if (!editName.trim()) {

      setEditModalError(t('servicesPage.admin.errorNameRequired'))

      return

    }

    setEditModalError(null)

    setCatalogSaving(true)

    const cents = parseBrlToCents(editPrice)

    try {

      const authUser = getFirebaseAuth()?.currentUser

      if (authUser) {

        await syncUserProfileToFirestore(authUser)

      }

      await updateServiceCatalogItem(editingItemId, {

        name: editName,

        description: editDescription,

        priceInCents: cents,

        whatsappPhone: editWhatsapp,

      })

      closeEditModal()

    } catch (e) {

      setSaveError(e, 'edit')

    } finally {

      setCatalogSaving(false)

    }

  }, [

    editingItemId,

    editName,

    editDescription,

    editPrice,

    editWhatsapp,

    t,

    closeEditModal,

    setSaveError,

  ])



  const handleConfirmDelete = useCallback(async () => {

    if (!deletingItemId) return

    setMutateError(null)

    setCatalogSaving(true)

    try {

      const authUser = getFirebaseAuth()?.currentUser

      if (authUser) {

        await syncUserProfileToFirestore(authUser)

      }

      await deleteServiceCatalogItem(deletingItemId)

      closeDeleteModal()

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

      closeDeleteModal()

    } finally {

      setCatalogSaving(false)

    }

  }, [deletingItemId, t, closeDeleteModal])



  const editModal =

    editingItemId && editingItem

      ? createPortal(

          <div

            className="admin-service-modal__backdrop"

            role="presentation"

            onClick={closeEditModal}

          >

            <div

              className="admin-service-modal__dialog"

              role="dialog"

              aria-modal="true"

              aria-labelledby="admin-service-edit-title"

              onClick={(ev) => ev.stopPropagation()}

            >

              <header className="admin-service-modal__header">

                <h5 id="admin-service-edit-title" className="admin-service-modal__title">

                  {t('servicesPage.admin.editModalTitle', { name: editingItem.name })}

                </h5>

                <button

                  type="button"

                  className="admin-service-modal__close"

                  onClick={closeEditModal}

                  aria-label={t('servicesPage.admin.modalClose')}

                >

                  ×

                </button>

              </header>

              <div className="admin-service-modal__body">

                {editModalError ? (

                  <p className="page-services__error" role="alert">

                    {editModalError}

                  </p>

                ) : null}

                <div className="page-services__field">

                  <label className="page-services__label" htmlFor="edit-svc-name">

                    {t('servicesPage.admin.fieldName')}

                  </label>

                  <input

                    id="edit-svc-name"

                    className="page-services__input"

                    value={editName}

                    onChange={(e) => setEditName(e.target.value)}

                    disabled={catalogSaving}

                    autoComplete="off"

                  />

                </div>

                <div className="page-services__field">

                  <label className="page-services__label" htmlFor="edit-svc-desc">

                    {t('servicesPage.admin.fieldDescription')}

                  </label>

                  <textarea

                    id="edit-svc-desc"

                    className="page-services__textarea"

                    value={editDescription}

                    onChange={(e) => setEditDescription(e.target.value)}

                    disabled={catalogSaving}

                    rows={3}

                  />

                </div>

                <div className="page-services__field page-services__field--price">

                  <label className="page-services__label" htmlFor="edit-svc-price">

                    {t('servicesPage.admin.fieldPrice')}

                  </label>

                  <input

                    id="edit-svc-price"

                    className="page-services__input"

                    inputMode="decimal"

                    placeholder={t('servicesPage.admin.pricePlaceholder')}

                    value={editPrice}

                    onChange={(e) => setEditPrice(e.target.value)}

                    disabled={catalogSaving}

                    autoComplete="off"

                  />

                </div>

                <div className="page-services__field">

                  <label className="page-services__label" htmlFor="edit-svc-wa">

                    {t('servicesPage.admin.fieldWhatsapp')}

                  </label>

                  <input

                    id="edit-svc-wa"

                    className="page-services__input"

                    inputMode="tel"

                    placeholder={t('servicesPage.admin.whatsappPlaceholder')}

                    value={editWhatsapp}

                    onChange={(e) => setEditWhatsapp(e.target.value)}

                    disabled={catalogSaving}

                    autoComplete="off"

                  />

                  <p className="page-services__admin-hint page-services__admin-hint--field">

                    {t('servicesPage.admin.whatsappHint')}

                  </p>

                </div>

              </div>

              <footer className="admin-service-modal__footer">

                <Button

                  type="button"

                  variant="secondary"

                  size="md"

                  disabled={catalogSaving}

                  onClick={closeEditModal}

                >

                  {t('servicesPage.admin.cancel')}

                </Button>

                <Button

                  type="button"

                  variant="primary"

                  size="md"

                  loading={catalogSaving}

                  onClick={() => void handleSaveEdit()}

                >

                  {t('servicesPage.admin.save')}

                </Button>

              </footer>

            </div>

          </div>,

          document.body

        )

      : null



  const deleteModal =

    deletingItemId && deletingItem

      ? createPortal(

          <div

            className="admin-service-modal__backdrop"

            role="presentation"

            onClick={closeDeleteModal}

          >

            <div

              className="admin-service-modal__dialog admin-service-modal__dialog--confirm"

              role="alertdialog"

              aria-modal="true"

              aria-labelledby="admin-service-delete-title"

              aria-describedby="admin-service-delete-desc"

              onClick={(ev) => ev.stopPropagation()}

            >

              <div className="admin-service-modal__confirm">

                <div className="admin-service-modal__confirm-icon" aria-hidden>

                  <FiAlertTriangle />

                </div>

                <h5 id="admin-service-delete-title" className="admin-service-modal__confirm-title">

                  {t('servicesPage.admin.deleteModalTitle')}

                </h5>

                <p id="admin-service-delete-desc" className="admin-service-modal__confirm-lead">

                  {t('servicesPage.admin.confirmDeleteLead')}

                </p>

                <div className="admin-service-modal__confirm-target">

                  <span className="admin-service-modal__confirm-target-label">

                    {t('servicesPage.admin.fieldName')}

                  </span>

                  <p className="admin-service-modal__confirm-target-name">{deletingItem.name}</p>

                </div>

                <p className="admin-service-modal__confirm-hint">

                  {t('servicesPage.admin.confirmDeleteHint')}

                </p>

                <footer className="admin-service-modal__confirm-actions">

                  <Button

                    type="button"

                    variant="secondary"

                    size="md"

                    fullWidth

                    disabled={catalogSaving}

                    onClick={closeDeleteModal}

                  >

                    {t('servicesPage.admin.cancel')}

                  </Button>

                  <Button

                    type="button"

                    variant="danger"

                    size="md"

                    fullWidth

                    loading={catalogSaving}

                    leftIcon={<FiTrash2 aria-hidden />}

                    onClick={() => void handleConfirmDelete()}

                  >

                    {t('servicesPage.admin.confirmDelete')}

                  </Button>

                </footer>

              </div>

            </div>

          </div>,

          document.body

        )

      : null



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



        <div className="page-services__admin-layout">

          <div className="page-services__admin-form">

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

                onClick={() => void handleAddCatalog()}

              >

                {t('servicesPage.admin.add')}

              </Button>

            </div>

          </div>



          <div className="page-services__admin-list-panel">

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

                    <div className="page-services__admin-row-body">

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

                        onClick={() => openEditModal(item.id)}

                        disabled={catalogSaving}

                      >

                        {t('servicesPage.admin.edit')}

                      </Button>

                      <Button

                        type="button"

                        variant="danger"

                        size="sm"

                        leftIcon={<FiTrash2 aria-hidden />}

                        onClick={() => setDeletingItemId(item.id)}

                        disabled={catalogSaving}

                      >

                        {t('servicesPage.admin.remove')}

                      </Button>

                    </div>

                  </li>

                ))}

              </ul>

            )}

          </div>

        </div>

      </section>



      {editModal}

      {deleteModal}

    </div>

  )

}


