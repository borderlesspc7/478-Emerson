import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button/Button'
import { useToast } from '../../contexts/ToastContext'
import { upsertGuestAccessLink } from '../../services/guestAccessLinkFirestore'

type AdminCreateAccessProps = {
  propertyOptions: { id: string; label: string }[]
  loadingOptions: boolean
}

export function AdminCreateAccess({ propertyOptions, loadingOptions }: AdminCreateAccessProps) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [code, setCode] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed || !propertyId.trim()) {
      showToast(t('adminCreateAccess.validation'), 'error')
      return
    }
    setSubmitting(true)
    try {
      await upsertGuestAccessLink({
        reservationCode: trimmed,
        propertyId: propertyId.trim(),
        accessActive: true,
      })
      showToast(t('adminCreateAccess.success'), 'success')
      setCode('')
      setPropertyId('')
    } catch {
      showToast(t('adminCreateAccess.error'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
      <h4 className="guest-content__section" style={{ margin: 0 }}>
        {t('adminCreateAccess.title')}
      </h4>
      <p className="guest-content__lead" style={{ marginTop: '0.35rem' }}>
        {t('adminCreateAccess.lead')}
      </p>

      <label>
        <span>{t('adminCreateAccess.fieldReservation')}</span>
        <input
          value={code}
          onChange={(ev) => setCode(ev.target.value)}
          placeholder={t('adminCreateAccess.placeholderReservation')}
          autoComplete="off"
        />
      </label>

      <label>
        <span>{t('adminCreateAccess.fieldProperty')}</span>
        <select
          value={propertyId}
          onChange={(ev) => setPropertyId(ev.target.value)}
          disabled={loadingOptions}
        >
          <option value="">{t('adminCreateAccess.selectProperty')}</option>
          {propertyOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <Button type="submit" variant="primary" loading={submitting}>
        {t('adminCreateAccess.submit')}
      </Button>
    </form>
  )
}
