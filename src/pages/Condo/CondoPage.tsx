import { useState, type KeyboardEvent } from 'react'
import { FiChevronDown, FiFileText, FiShield, FiTrash2, FiTruck } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { condoRuleCardKeys, type CondoRuleCardKey } from '../../data/condoContent'
import '../shared/guestContent.css'
import './CondoPage.css'

const ruleCardIcons: Record<CondoRuleCardKey, JSX.Element> = {
  internalRules: <FiFileText aria-hidden />,
  commonAreas: <FiShield aria-hidden />,
  wasteDisposal: <FiTrash2 aria-hidden />,
  garageRules: <FiTruck aria-hidden />,
}

export function CondoPage() {
  const { t } = useTranslation()
  const [expandedCards, setExpandedCards] = useState<Record<CondoRuleCardKey, boolean>>({
    internalRules: false,
    commonAreas: false,
    wasteDisposal: false,
    garageRules: false,
  })

  function toggleCard(cardKey: CondoRuleCardKey) {
    setExpandedCards((current) => ({
      ...current,
      [cardKey]: !current[cardKey],
    }))
  }

  function handleCardKeyboardToggle(
    event: KeyboardEvent<HTMLElement>,
    toggle: () => void
  ) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggle()
    }
  }

  return (
    <div className="page-condo">
      <header className="guest-content__hero">
        <h2 className="guest-content__heading">{t('condo.title')}</h2>
        <p className="guest-content__lead">{t('condo.lead')}</p>
      </header>

      <section aria-label={t('condo.rulesSectionTitle')}>
        <h3 className="guest-content__section">{t('condo.rulesSectionTitle')}</h3>
        <div className="page-condo__rules-grid">
          {condoRuleCardKeys.map((cardKey) => {
            const isOpen = expandedCards[cardKey]
            const cardPanelId = `condo-card-panel-${cardKey}`
            const cardButtonId = `condo-card-button-${cardKey}`

            return (
              <article
                key={cardKey}
                className="page-condo__rule-card"
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-controls={cardPanelId}
                onClick={() => toggleCard(cardKey)}
                onKeyDown={(event) =>
                  handleCardKeyboardToggle(event, () => toggleCard(cardKey))
                }
              >
                <div
                  className={`guest-content__card page-condo__rule-card-shell ${
                    isOpen ? 'is-open' : ''
                  }`}
                >
                  <div
                    id={cardButtonId}
                    className="page-condo__rule-trigger"
                  >
                    <span className="page-condo__rule-icon">{ruleCardIcons[cardKey]}</span>
                    <span className="page-condo__rule-title">{t(`condo.cards.${cardKey}.title`)}</span>
                    <FiChevronDown
                      aria-hidden
                      className={`page-condo__chevron ${isOpen ? 'is-open' : ''}`}
                    />
                  </div>
                  <p className="guest-content__card-meta">{t(`condo.cards.${cardKey}.summary`)}</p>
                  <div
                    id={cardPanelId}
                    role="region"
                    aria-labelledby={cardButtonId}
                    aria-hidden={!isOpen}
                    className={`page-condo__rule-collapse ${isOpen ? 'is-open' : ''}`}
                  >
                    <div className="page-condo__rule-content">
                      <p className="guest-content__prose">{t(`condo.cards.${cardKey}.details`)}</p>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
