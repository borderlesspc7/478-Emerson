import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ErrorCode, useDropzone, type FileRejection } from 'react-dropzone'
import {
  FiArrowLeft,
  FiCornerUpRight,
  FiEdit3,
  FiHome,
  FiImage,
  FiUploadCloud,
  FiVideo,
} from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button/Button'
import { useToast } from '../../contexts/ToastContext'
import {
  getPropertyCuration,
  savePropertyCuration,
} from '../../services/propertyCurationFirestore'
import { fetchListingById } from '../../services/staysService'
import {
  tryDeletePropertyImageByUrl,
  uploadPropertyImage,
} from '../../services/storageService'
import type { StaysPropertyListing } from '../../types/staysApi'
import { isEmbeddableVideoUrl } from '../../lib/mediaUrl'
import { PATHS } from '../../routes/path'
import '../shared/guestContent.css'
import './AdminPropertyEditPage.css'

const DROP_ACCEPT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
} as const

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function listingTitle(l: StaysPropertyListing | null): string {
  if (!l) return ''
  const m = l._mstitle
  if (m) {
    const txt =
      m.pt_BR ||
      m.pt_PT ||
      m.en_US ||
      Object.values(m).find((x) => typeof x === 'string' && String(x).trim())
    if (txt) return String(txt).trim().slice(0, 120)
  }
  return l.internalName?.trim() || l.id?.trim() || l._id || ''
}

function isUploadErrorCode(msg: string, code: string): boolean {
  return msg === code
}

type EditSectionProps = {
  icon: ReactNode
  title: string
  description: string
  countLabel?: string
  children: ReactNode
}

function EditSection({
  icon,
  title,
  description,
  countLabel,
  children,
}: EditSectionProps) {
  return (
    <section className="admin-property-edit__section">
      <header className="admin-property-edit__section-head">
        <div className="admin-property-edit__section-title-row">
          <span className="admin-property-edit__section-icon" aria-hidden>
            {icon}
          </span>
          <div>
            <h4 className="admin-property-edit__section-title">{title}</h4>
            <p className="admin-property-edit__section-desc">{description}</p>
          </div>
        </div>
        {countLabel ? (
          <span className="admin-property-edit__count">{countLabel}</span>
        ) : null}
      </header>
      {children}
    </section>
  )
}

export function AdminPropertyEditPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { propertyId: rawParam } = useParams<{ propertyId: string }>()
  const propertyId = rawParam ? decodeURIComponent(rawParam) : ''
  const { showToast } = useToast()

  const [title, setTitle] = useState('')
  const [garageUrls, setGarageUrls] = useState<string[]>([])
  const [garageVideoUrl, setGarageVideoUrl] = useState('')
  const [elevatorUrls, setElevatorUrls] = useState<string[]>([])
  const [manualAccess, setManualAccess] = useState('')
  const [manualProperty, setManualProperty] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingG, setUploadingG] = useState(false)
  const [uploadingE, setUploadingE] = useState(false)

  const persistCuration = useCallback(
    async (nextGarage: string[], nextElevator: string[], nextGarageVideo = garageVideoUrl) => {
      await savePropertyCuration(propertyId, {
        garagePhotoUrls: nextGarage,
        garageVideoUrl: nextGarageVideo.trim() || null,
        elevatorPhotoUrls: nextElevator,
        manualAccessTips: manualAccess,
        manualPropertyTips: manualProperty,
        displayName: title || null,
      })
    },
    [propertyId, manualAccess, manualProperty, title, garageVideoUrl],
  )

  const toastDropRejected = useCallback(
    (rejections: FileRejection[]) => {
      if (!rejections.length) return
      const tooLarge = rejections.some((r) =>
        r.errors.some(
          (e) => e.code === ErrorCode.FileTooLarge || String(e.code).includes('too-large'),
        ),
      )
      if (tooLarge) {
        showToast(t('adminPropertyEdit.uploadFileTooLarge'), 'error')
      } else {
        showToast(t('adminPropertyEdit.uploadUnsupported'), 'error')
      }
    },
    [showToast, t],
  )

  const toastUploadError = useCallback(
    (e: unknown) => {
      const msg = e instanceof Error ? e.message : ''
      if (isUploadErrorCode(msg, 'storage/file-too-large')) {
        showToast(t('adminPropertyEdit.uploadFileTooLarge'), 'error')
        return
      }
      if (isUploadErrorCode(msg, 'storage/unsupported-format')) {
        showToast(t('adminPropertyEdit.uploadUnsupported'), 'error')
        return
      }
      if (
        isUploadErrorCode(msg, 'storage/not-configured') ||
        isUploadErrorCode(msg, 'storage/invalid-property-id')
      ) {
        showToast(t('adminPropertyEdit.uploadFail'), 'error')
        return
      }
      showToast(t('adminPropertyEdit.uploadFail'), 'error')
    },
    [showToast, t],
  )

  useEffect(() => {
    if (!propertyId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [listing, cur] = await Promise.all([
          fetchListingById(propertyId).catch(() => null),
          getPropertyCuration(propertyId),
        ])
        if (cancelled) return
        const listTitle = listingTitle(listing)
        setTitle(listTitle || cur?.displayName || propertyId)
        setGarageUrls(cur?.garagePhotoUrls ?? [])
        setGarageVideoUrl(cur?.garageVideoUrl ?? '')
        setElevatorUrls(cur?.elevatorPhotoUrls ?? [])
        setManualAccess(cur?.manualAccessTips ?? '')
        setManualProperty(cur?.manualPropertyTips ?? '')
      } catch {
        if (!cancelled) showToast(t('adminPropertyEdit.loadError'), 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [propertyId, showToast, t])

  const onDropGarage = useCallback(
    async (files: File[]) => {
      if (!propertyId || !files.length) return
      setUploadingG(true)
      try {
        const urls: string[] = []
        for (const f of files) {
          urls.push(await uploadPropertyImage(propertyId, f, 'garage'))
        }
        const nextGarage = [...garageUrls, ...urls]
        setGarageUrls(nextGarage)
        await persistCuration(nextGarage, elevatorUrls)
        showToast(
          urls.length > 1 ? t('adminPropertyEdit.uploadOkPlural') : t('adminPropertyEdit.uploadOk'),
          'success',
        )
      } catch (e) {
        toastUploadError(e)
      } finally {
        setUploadingG(false)
      }
    },
    [propertyId, garageUrls, elevatorUrls, persistCuration, showToast, t, toastUploadError],
  )

  const onDropElevator = useCallback(
    async (files: File[]) => {
      if (!propertyId || !files.length) return
      setUploadingE(true)
      try {
        const urls: string[] = []
        for (const f of files) {
          urls.push(await uploadPropertyImage(propertyId, f, 'elevator'))
        }
        const nextElevator = [...elevatorUrls, ...urls]
        setElevatorUrls(nextElevator)
        await persistCuration(garageUrls, nextElevator)
        showToast(
          urls.length > 1 ? t('adminPropertyEdit.uploadOkPlural') : t('adminPropertyEdit.uploadOk'),
          'success',
        )
      } catch (e) {
        toastUploadError(e)
      } finally {
        setUploadingE(false)
      }
    },
    [propertyId, garageUrls, elevatorUrls, persistCuration, showToast, t, toastUploadError],
  )

  const removeGarageAt = useCallback(
    async (url: string) => {
      if (!propertyId) return
      await tryDeletePropertyImageByUrl(url)
      const next = garageUrls.filter((u) => u !== url)
      setGarageUrls(next)
      try {
        await persistCuration(next, elevatorUrls)
      } catch {
        showToast(t('adminPropertyEdit.saveFail'), 'error')
      }
    },
    [propertyId, garageUrls, elevatorUrls, persistCuration, showToast, t],
  )

  const removeElevatorAt = useCallback(
    async (url: string) => {
      if (!propertyId) return
      await tryDeletePropertyImageByUrl(url)
      const next = elevatorUrls.filter((u) => u !== url)
      setElevatorUrls(next)
      try {
        await persistCuration(garageUrls, next)
      } catch {
        showToast(t('adminPropertyEdit.saveFail'), 'error')
      }
    },
    [propertyId, garageUrls, elevatorUrls, persistCuration, showToast, t],
  )

  const clearGarage = useCallback(async () => {
    if (!propertyId) return
    for (const u of garageUrls) {
      await tryDeletePropertyImageByUrl(u)
    }
    setGarageUrls([])
    try {
      await persistCuration([], elevatorUrls)
    } catch {
      showToast(t('adminPropertyEdit.saveFail'), 'error')
    }
  }, [propertyId, garageUrls, elevatorUrls, persistCuration, showToast, t])

  const clearElevator = useCallback(async () => {
    if (!propertyId) return
    for (const u of elevatorUrls) {
      await tryDeletePropertyImageByUrl(u)
    }
    setElevatorUrls([])
    try {
      await persistCuration(garageUrls, [])
    } catch {
      showToast(t('adminPropertyEdit.saveFail'), 'error')
    }
  }, [propertyId, garageUrls, elevatorUrls, persistCuration, showToast, t])

  const garageDropzone = useDropzone({
    onDrop: onDropGarage,
    onDropRejected: toastDropRejected,
    accept: DROP_ACCEPT,
    disabled: uploadingG || !propertyId,
    multiple: true,
    maxSize: MAX_IMAGE_BYTES,
    noClick: true,
    noKeyboard: true,
  })
  const elevatorDropzone = useDropzone({
    onDrop: onDropElevator,
    onDropRejected: toastDropRejected,
    accept: DROP_ACCEPT,
    disabled: uploadingE || !propertyId,
    multiple: true,
    maxSize: MAX_IMAGE_BYTES,
    noClick: true,
    noKeyboard: true,
  })

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!propertyId) return
    const trimmedVideo = garageVideoUrl.trim()
    if (trimmedVideo && !isEmbeddableVideoUrl(trimmedVideo)) {
      showToast(t('adminPropertyEdit.garageVideoInvalid'), 'error')
      return
    }
    setSaving(true)
    try {
      await savePropertyCuration(propertyId, {
        garagePhotoUrls: garageUrls,
        garageVideoUrl: trimmedVideo || null,
        elevatorPhotoUrls: elevatorUrls,
        manualAccessTips: manualAccess,
        manualPropertyTips: manualProperty,
        displayName: title || null,
      })
      showToast(t('adminPropertyEdit.saveOk'), 'success')
      navigate(PATHS.adminProperties)
    } catch {
      showToast(t('adminPropertyEdit.saveFail'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!propertyId) {
    return <p className="guest-content__card-meta">{t('adminPropertyEdit.missingId')}</p>
  }

  return (
    <section className="admin-property-edit-page">
      <Link to={PATHS.adminProperties} className="admin-property-edit-page__back">
        <FiArrowLeft aria-hidden />
        {t('adminPropertyEdit.back')}
      </Link>

      <header className="admin-property-edit-page__header">
        <p className="admin-property-edit-page__eyebrow">{t('adminPropertyEdit.pageTitle')}</p>
        <h3 className="admin-property-edit-page__title">{title || propertyId}</h3>
        <p className="admin-property-edit-page__id">{propertyId}</p>
        <p className="admin-property-edit-page__lead">{t('adminPropertyEdit.pageLead')}</p>
      </header>

      {loading ? (
        <div className="admin-property-edit-page__loading" role="status" aria-live="polite">
          <span className="app-shell-loading__spinner" aria-hidden />
          <span className="guest-content__card-meta">{t('adminPropertyEdit.loading')}</span>
        </div>
      ) : (
        <form className="admin-form admin-property-edit-page__form" onSubmit={handleSave}>
          <EditSection
            icon={<FiHome />}
            title={t('adminPropertyEdit.sectionIdentity')}
            description={t('adminPropertyEdit.sectionIdentityDesc')}
          >
            <label className="admin-property-edit__field">
              <span>{t('adminPropertyEdit.displayName')}</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoComplete="off"
              />
            </label>
          </EditSection>

          <EditSection
            icon={<FiImage />}
            title={t('adminPropertyEdit.garagePhotos')}
            description={t('adminPropertyEdit.sectionGarageDesc')}
            countLabel={t('adminPropertyEdit.photoCount', { count: garageUrls.length })}
          >
            <div className="admin-property-edit__media-toolbar">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={uploadingG || !propertyId}
                onClick={garageDropzone.open}
                leftIcon={<FiUploadCloud aria-hidden />}
              >
                {t('adminPropertyEdit.attachImagesGarage')}
              </Button>
              {garageUrls.length ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void clearGarage()}
                >
                  {t('adminPropertyEdit.clearGarage')}
                </Button>
              ) : null}
            </div>

            <div
              {...garageDropzone.getRootProps()}
              className={[
                'admin-property-edit__dropzone',
                garageDropzone.isDragActive ? 'is-focused' : '',
                uploadingG || !propertyId ? 'is-disabled' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={garageDropzone.open}
            >
              <input {...garageDropzone.getInputProps()} />
              <span className="admin-property-edit__dropzone-icon" aria-hidden>
                <FiUploadCloud />
              </span>
              <p className="admin-property-edit__dropzone-title">
                {t('adminPropertyEdit.dropTitle')}
              </p>
              <p className="admin-property-edit__dropzone-hint">
                {t('adminPropertyEdit.dropHintShort')}
              </p>
            </div>

            {uploadingG ? (
              <div className="admin-property-edit__upload-status" role="status" aria-live="polite">
                <span className="app-shell-loading__spinner" aria-hidden />
                <span className="guest-content__card-meta">
                  {t('adminPropertyEdit.uploading')}
                </span>
              </div>
            ) : null}

            {garageUrls.length ? (
              <div className="admin-property-edit__thumbs">
                {garageUrls.map((url) => (
                  <div key={url} className="admin-property-edit__thumb">
                    <img src={url} alt="" />
                    <button
                      type="button"
                      className="admin-property-edit__thumb-remove"
                      onClick={() => void removeGarageAt(url)}
                      aria-label={t('adminPropertyEdit.removePhoto')}
                      title={t('adminPropertyEdit.removePhoto')}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="admin-property-edit__empty-thumbs">
                {t('adminPropertyEdit.noPhotosYet')}
              </p>
            )}

            <label className="admin-property-edit__field">
              <span className="admin-property-edit__field-label admin-property-edit__field-label--with-icon">
                <FiVideo aria-hidden />
                {t('adminPropertyEdit.garageVideo')}
              </span>
              <input
                type="url"
                inputMode="url"
                value={garageVideoUrl}
                onChange={(e) => setGarageVideoUrl(e.target.value)}
                placeholder={t('adminPropertyEdit.garageVideoPlaceholder')}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <p className="admin-property-edit__hint">{t('adminPropertyEdit.garageVideoHint')}</p>
          </EditSection>

          <EditSection
            icon={<FiCornerUpRight />}
            title={t('adminPropertyEdit.elevatorPhotos')}
            description={t('adminPropertyEdit.sectionElevatorDesc')}
            countLabel={t('adminPropertyEdit.photoCount', { count: elevatorUrls.length })}
          >
            <div className="admin-property-edit__media-toolbar">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={uploadingE || !propertyId}
                onClick={elevatorDropzone.open}
                leftIcon={<FiUploadCloud aria-hidden />}
              >
                {t('adminPropertyEdit.attachImagesElevator')}
              </Button>
              {elevatorUrls.length ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void clearElevator()}
                >
                  {t('adminPropertyEdit.clearElevator')}
                </Button>
              ) : null}
            </div>

            <div
              {...elevatorDropzone.getRootProps()}
              className={[
                'admin-property-edit__dropzone',
                elevatorDropzone.isDragActive ? 'is-focused' : '',
                uploadingE || !propertyId ? 'is-disabled' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={elevatorDropzone.open}
            >
              <input {...elevatorDropzone.getInputProps()} />
              <span className="admin-property-edit__dropzone-icon" aria-hidden>
                <FiUploadCloud />
              </span>
              <p className="admin-property-edit__dropzone-title">
                {t('adminPropertyEdit.dropTitle')}
              </p>
              <p className="admin-property-edit__dropzone-hint">
                {t('adminPropertyEdit.dropHintShort')}
              </p>
            </div>

            {uploadingE ? (
              <div className="admin-property-edit__upload-status" role="status" aria-live="polite">
                <span className="app-shell-loading__spinner" aria-hidden />
                <span className="guest-content__card-meta">
                  {t('adminPropertyEdit.uploading')}
                </span>
              </div>
            ) : null}

            {elevatorUrls.length ? (
              <div className="admin-property-edit__thumbs">
                {elevatorUrls.map((url) => (
                  <div key={url} className="admin-property-edit__thumb">
                    <img src={url} alt="" />
                    <button
                      type="button"
                      className="admin-property-edit__thumb-remove"
                      onClick={() => void removeElevatorAt(url)}
                      aria-label={t('adminPropertyEdit.removePhoto')}
                      title={t('adminPropertyEdit.removePhoto')}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="admin-property-edit__empty-thumbs">
                {t('adminPropertyEdit.noPhotosYet')}
              </p>
            )}
          </EditSection>

          <EditSection
            icon={<FiEdit3 />}
            title={t('adminPropertyEdit.sectionTips')}
            description={t('adminPropertyEdit.sectionTipsDesc')}
          >
            <label className="admin-property-edit__field">
              <span>{t('adminPropertyEdit.manualAccess')}</span>
              <textarea
                value={manualAccess}
                onChange={(e) => setManualAccess(e.target.value)}
                rows={5}
              />
            </label>

            <label className="admin-property-edit__field">
              <span>{t('adminPropertyEdit.manualProperty')}</span>
              <textarea
                value={manualProperty}
                onChange={(e) => setManualProperty(e.target.value)}
                rows={5}
              />
            </label>
          </EditSection>

          <div className="admin-property-edit__actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(PATHS.adminProperties)}
            >
              {t('adminPropertyEdit.cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {t('adminPropertyEdit.save')}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
