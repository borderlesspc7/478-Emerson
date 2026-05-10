import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button/Button'
import { useToast } from '../../contexts/ToastContext'
import {
  getPropertyCuration,
  savePropertyCuration,
} from '../../services/propertyCurationFirestore'
import { fetchListingById } from '../../services/staysService'
import { uploadPropertyCurationImage } from '../../services/storageUpload'
import type { StaysPropertyListing } from '../../types/staysApi'
import { PATHS } from '../../routes/path'
import '../../components/AdminLayout/AdminLayout.css'
import '../shared/guestContent.css'

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
          urls.push(await uploadPropertyCurationImage(propertyId, f))
        }
        setGarageUrls((prev) => [...prev, ...urls])
        showToast(t('adminPropertyEdit.uploadOk'), 'success')
      } catch {
        showToast(t('adminPropertyEdit.uploadFail'), 'error')
      } finally {
        setUploadingG(false)
      }
    },
    [propertyId, showToast, t]
  )

  const onDropElevator = useCallback(
    async (files: File[]) => {
      if (!propertyId || !files.length) return
      setUploadingE(true)
      try {
        const urls: string[] = []
        for (const f of files) {
          urls.push(await uploadPropertyCurationImage(propertyId, f))
        }
        setElevatorUrls((prev) => [...prev, ...urls])
        showToast(t('adminPropertyEdit.uploadOk'), 'success')
      } catch {
        showToast(t('adminPropertyEdit.uploadFail'), 'error')
      } finally {
        setUploadingE(false)
      }
    },
    [propertyId, showToast, t]
  )

  const dzG = useDropzone({
    onDrop: onDropGarage,
    accept: { 'image/*': [] },
    disabled: uploadingG || !propertyId,
  })
  const dzE = useDropzone({
    onDrop: onDropElevator,
    accept: { 'image/*': [] },
    disabled: uploadingE || !propertyId,
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
        <form className="admin-form" onSubmit={handleSave}>
          <label>
            <span>{t('adminPropertyEdit.displayName')}</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <div>
            <span className="guest-content__card-title" style={{ display: 'block', marginBottom: '0.5rem' }}>
              {t('adminPropertyEdit.garagePhotos')}
            </span>
            <div
              {...dzG.getRootProps()}
              className={`dropzone ${dzG.isDragActive ? 'is-focused' : ''}`}
            >
              <input {...dzG.getInputProps()} />
              <p>{t('adminPropertyEdit.dropHint')}</p>
            </div>
            {uploadingG ? (
              <p className="guest-content__card-meta">{t('adminPropertyEdit.uploading')}</p>
            ) : null}
            <div className="thumb-row">
              {garageUrls.map((url) => (
                <img key={url} src={url} alt="" />
              ))}
            </div>
            {garageUrls.length ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setGarageUrls([])}
                style={{ marginTop: '0.5rem' }}
              >
                {t('adminPropertyEdit.clearGarage')}
              </Button>
            ) : null}
          </div>

          <div>
            <span className="guest-content__card-title" style={{ display: 'block', marginBottom: '0.5rem' }}>
              {t('adminPropertyEdit.elevatorPhotos')}
            </span>
            <div
              {...dzE.getRootProps()}
              className={`dropzone ${dzE.isDragActive ? 'is-focused' : ''}`}
            >
              <input {...dzE.getInputProps()} />
              <p>{t('adminPropertyEdit.dropHint')}</p>
            </div>
            {uploadingE ? (
              <p className="guest-content__card-meta">{t('adminPropertyEdit.uploading')}</p>
            ) : null}
            <div className="thumb-row">
              {elevatorUrls.map((url) => (
                <img key={url} src={url} alt="" />
              ))}
            </div>
            {elevatorUrls.length ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setElevatorUrls([])}
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
