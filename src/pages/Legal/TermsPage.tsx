import { useTranslation } from 'react-i18next'
import { LegalBackLink } from './LegalBackLink'
import './LegalPage.css'

type LegalSection = { title: string; body: string }

export function TermsPage() {
  const { t } = useTranslation()
  const sections = t('legal.termsSections', { returnObjects: true }) as LegalSection[]

  return (
    <article className="legal-page">
      <LegalBackLink />
      <h1 className="legal-page__title">{t('legal.termsTitle')}</h1>
      <p className="legal-page__meta">{t('legal.lastUpdated')}</p>
      <p className="legal-page__intro">{t('legal.termsIntro')}</p>
      {Array.isArray(sections)
        ? sections.map((section) => (
            <section key={section.title} className="legal-page__section">
              <h3>{section.title}</h3>
              <p>{section.body}</p>
            </section>
          ))
        : null}
    </article>
  )
}
