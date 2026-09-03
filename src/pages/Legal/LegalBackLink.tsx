import { FiArrowLeft } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { PATHS } from '../../routes/path'

export function LegalBackLink() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate(user ? PATHS.settings : PATHS.login)
  }

  return (
    <button type="button" className="legal-page__back" onClick={handleBack}>
      <FiArrowLeft aria-hidden />
      {t('legal.back')}
    </button>
  )
}
