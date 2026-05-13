import { useCallback, useEffect, useState } from 'react'
import { ErrorCode, useDropzone, type FileRejection } from 'react-dropzone'
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
import { PATHS } from '../../routes/path'
import '../../components/AdminLayout/AdminLayout.css'
import '../shared/guestContent.css'

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

export function AdminPropertyEditPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { propertyId: rawParam } = useParams<{ propertyId: string }>()
  const propertyId = rawParam ? decodeURIComponent(rawParam) : ''
  const { showToast } = useToast()

  const [title, setTitle] = useState('')
  const [garageUrls, setGarageUrls] = useState<string[]>([])
  const [elevatorUrls, setElevatorUrls] = useState<string[]>([])
  const [manualAccess, setManualAccess] = useState('')
  const [manualProperty, setManualProperty] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingG, setUploadingG] = useState(false)
  const [uploadingE, setUploadingE] = useState(false)

  const persistCuration = useCallback(
    async (nextGarage: string[], nextElevator: string[]) => {
      await savePropertyCuration(propertyId, {
        garagePhotoUrls: nextGarage,
        elevatorPhotoUrls: nextElevator,
        manualAccessTips: manualAccess,
        manualPropertyTips: manualProperty,
        displayName: title || null,
      })
    },
    [propertyId, manualAccess, manualProperty, title],
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
      if (isUploadErrorCode(msg, 'storage/not-configured') || isUploadErrorCode(msg, 'storage/invalid-property-id')) {
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
  })
  const elevatorDropzone = useDropzone({
    onDrop: onDropElevator,
    onDropRejected: toastDropRejected,
    accept: DROP_ACCEPT,
    disabled: uploadingE || !propertyId,
    multiple: true,
    maxSize: MAX_IMAGE_BYTES,
  })

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!propertyId) return
    setSaving(true)
    try {
      await savePropertyCuration(propertyId, {
        garagePhotoUrls: garageUrls,
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
    <section>
      <p style={{ marginBottom: '1rem' }}>
        <Link to={PATHS.adminProperties} className="guest-content__card-meta">
          ← {t('adminPropertyEdit.back')}
        </Link>
      </p>
      <h3 className="guest-content__section">{title || propertyId}</h3>
      <p className="admin-property-card__meta" style={{ marginBottom: '1.25rem' }}>
        {propertyId}
      </p>

      {loading ? (
        <p className="guest-content__card-meta">{t('adminPropertyEdit.loading')}</p>
      ) : (
        <form className="admin-form admin-property-edit" onSubmit={handleSave}>
          <label>
            <span>{t('adminPropertyEdit.displayName')}</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <div>
            <span className="guest-content__card-title" style={{ display: 'block', marginBottom: '0.5rem' }}>
              {t('adminPropertyEdit.garagePhotos')}
            </span>
            <div className="admin-property-edit__drop-actions">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={uploadingG || !propertyId}
                onClick={garageDropzone.open}
              >
                {t('adminPropertyEdit.attachImagesGarage')}
              </Button>
            </div>
            <div
              {...garageDropzone.getRootProps()}
              className={`dropzone ${garageDropzone.isDragActive ? 'is-focused' : ''}`}
            >
              <input {...garageDropzone.getInputProps()} />
              <p>{t('adminPropertyEdit.dropHint')}</p>
            </div>
            {uploadingG ? (
              <div className="admin-property-edit__upload-status" role="status" aria-live="polite">
                <span className="app-shell-loading__spinner" aria-hidden />
                <span className="guest-content__card-meta">{t('adminPropertyEdit.uploading')}</span>
              </div>
            ) : null}
            <div className="thumb-row">
              {garageUrls.map((url) => (
                <div key={url} className="thumb-slot">
                  <img src={url} alt="" />
                  <button
                    type="button"
                    className="thumb-slot__remove"
                    onClick={() => void removeGarageAt(url)}
                    aria-label={t('adminPropertyEdit.removePhoto')}
                    title={t('adminPropertyEdit.removePhoto')}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {garageUrls.length ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => void clearGarage()} style={{ marginTop: '0.5rem' }}>
                {t('adminPropertyEdit.clearGarage')}
              </Button>
            ) : null}
          </div>

          <div>
            <span className="guest-content__card-title" style={{ display: 'block', marginBottom: '0.5rem' }}>
              {t('adminPropertyEdit.elevatorPhotos')}
            </span>
            <div className="admin-property-edit__drop-actions">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={uploadingE || !propertyId}
                onClick={elevatorDropzone.open}
              >
                {t('adminPropertyEdit.attachImagesElevator')}
              </Button>
            </div>
            <div
              {...elevatorDropzone.getRootProps()}
              className={`dropzone ${elevatorDropzone.isDragActive ? 'is-focused' : ''}`}
            >
              <input {...elevatorDropzone.getInputProps()} />
              <p>{t('adminPropertyEdit.dropHint')}</p>
            </div>
            {uploadingE ? (
              <div className="admin-property-edit__upload-status" role="status" aria-live="polite">
                <span className="app-shell-loading__spinner" aria-hidden />
                <span className="guest-content__card-meta">{t('adminPropertyEdit.uploading')}</span>
              </div>
            ) : null}
            <div className="thumb-row">
              {elevatorUrls.map((url) => (
                <div key={url} className="thumb-slot">
                  <img src={url} alt="" />
                  <button
                    type="button"
                    className="thumb-slot__remove"
                    onClick={() => void removeElevatorAt(url)}
                    aria-label={t('adminPropertyEdit.removePhoto')}
                    title={t('adminPropertyEdit.removePhoto')}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {elevatorUrls.length ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void clearElevator()}
                style={{ marginTop: '0.5rem' }}
              >
                {t('adminPropertyEdit.clearElevator')}
              </Button>
            ) : null}
          </div>

          <label>
            <span>{t('adminPropertyEdit.manualAccess')}</span>
            <textarea value={manualAccess} onChange={(e) => setManualAccess(e.target.value)} />
          </label>

          <label>
            <span>{t('adminPropertyEdit.manualProperty')}</span>
            <textarea value={manualProperty} onChange={(e) => setManualProperty(e.target.value)} />
          </label>

          <Button type="submit" variant="primary" loading={saving}>
            {t('adminPropertyEdit.save')}
          </Button>
        </form>
      )}
    </section>
  )
}
