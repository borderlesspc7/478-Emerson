import { useEffect, useState } from 'react'
import { FiCheck, FiX } from 'react-icons/fi'
import { Button } from '../../components/ui/Button/Button'

type AdminAccessEditableFieldProps = {
  value: string
  label: string
  onSave: (nextValue: string) => Promise<void>
  monospace?: boolean
}

export function AdminAccessEditableField({
  value,
  label,
  onSave,
  monospace = false,
}: AdminAccessEditableFieldProps) {
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const isDirty = draft.trim() !== value.trim()

  async function handleSave() {
    if (!isDirty || saving) return
    setSaving(true)
    try {
      await onSave(draft.trim())
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraft(value)
  }

  return (
    <div className="admin-access__editable">
      <label className="visually-hidden" htmlFor={`access-edit-${label}`}>
        {label}
      </label>
      <input
        id={`access-edit-${label}`}
        className={`admin-access__editable-input${monospace ? ' admin-access__editable-input--mono' : ''}`}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void handleSave()
          }
          if (e.key === 'Escape') handleCancel()
        }}
        aria-label={label}
      />
      {isDirty ? (
        <div className="admin-access__editable-actions">
          <Button
            type="button"
            size="sm"
            variant="primary"
            className="admin-access__editable-btn"
            loading={saving}
            leftIcon={<FiCheck aria-hidden />}
            onClick={() => void handleSave()}
          >
            <span className="admin-access__editable-btn-label">OK</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="admin-access__editable-btn"
            disabled={saving}
            leftIcon={<FiX aria-hidden />}
            onClick={handleCancel}
          >
            <span className="admin-access__editable-btn-label">×</span>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
