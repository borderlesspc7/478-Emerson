import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  htmlToDescriptionPlainText,
  splitDescriptionIntoCards,
} from '../lib/propertyDescriptionCards'
import {
  toPropertyDescriptionCardsFromGuestSections,
  tryExtractStaysGuestDescriptionSections,
} from '../lib/staysGuestDescriptionSections'

type PropertyDescriptionCardListProps = {
  description: string | null | undefined
  /** Chave i18n com `{{n}}` para títulos quando a heurística não extrai título. */
  fallbackTitleKey: string
  cardClassName: string
  /**
   * Tenta separar a descrição Stays (PT) em secções (imóvel, legal, reserva, etc.).
   * Se não corresponder ao formato, usa a heurística genérica.
   */
  structuredGuestDescription?: boolean
}

/**
 * Descrição comercial (texto com quebras ou HTML) repartida em vários cards.
 */
export function PropertyDescriptionCardList({
  description,
  fallbackTitleKey,
  cardClassName,
  structuredGuestDescription = false,
}: PropertyDescriptionCardListProps) {
  const { t } = useTranslation()
  const cards = useMemo(() => {
    const raw = description?.trim() ?? ''
    if (!raw) return []
    const plain = raw.includes('<') ? htmlToDescriptionPlainText(raw) : raw
    if (structuredGuestDescription) {
      const sections = tryExtractStaysGuestDescriptionSections(plain)
      if (sections && sections.length >= 2) {
        return toPropertyDescriptionCardsFromGuestSections(sections, t)
      }
    }
    return splitDescriptionIntoCards(plain, (n) => t(fallbackTitleKey, { n }))
  }, [description, t, fallbackTitleKey, structuredGuestDescription])

  if (cards.length === 0) return null
  return (
    <>
      {cards.map((c, i) => (
        <article key={i} className={cardClassName}>
          <h4 className="guest-content__card-title">{c.title}</h4>
          <p className="guest-content__card-value guest-content__prose">{c.body}</p>
        </article>
      ))}
    </>
  )
}
