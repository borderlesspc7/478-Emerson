import type { PropertyDescriptionCard } from './propertyDescriptionCards'

const MIN_BODY = 28

const TITLE_PREFIX = 'aboutProperty.guestDesc' as const

/**
 * Tenta dividir a descrição comercial Stays (já em texto) em secções com âncoras
 * típicas de anúncios em PT. Se não bater o formato ou vierem blocos a menos de 2,
 * devolve null para a UI usar a heurística genérica.
 */
export function tryExtractStaysGuestDescriptionSections(
  plain: string
): Array<{ body: string; titleKey: string }> | null {
  const text = plain.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (text.length < 120) return null

  const iLegal = text.search(
    /IM[ÓO]VEL PARA FINS|LOCA[ÇC][ÃA]O RESIDENCIAL POR TEMPORADA/mi
  )
  const iReserva = text.search(/DETALHES DA RESERVA/mi)
  const iCadas = text.search(
    /(?:3\s*-\s*)?CADASTRO.{0,160}DOCUMENTO|CADASTRO E ENVIO/mi
  )
  const iApto = text.search(/DETALHES DO APARTAMENTO/mi)
  const iOrient = text.search(
    /ORIENTAÇÕES GERAIS|ORIENTACOES GERAIS|GENERAL GUIDELINES/mi
  )

  if (iReserva < 0 && iApto < 0) return null

  const out: Array<{ body: string; titleKey: string }> = []

  const introEnd =
    iLegal > 0 ? iLegal : iReserva > 0 ? iReserva : -1
  if (introEnd > 0) {
    const body = text.slice(0, introEnd).trim()
    if (body.length >= MIN_BODY) {
      out.push({ body, titleKey: `${TITLE_PREFIX}.propertyIntro` })
    }
  }

  if (iLegal >= 0 && iReserva > iLegal) {
    let legal = text.slice(iLegal, iReserva).trim()
    legal = stripMarketingAfterLegalBlock(legal)
    if (legal.length >= MIN_BODY) {
      out.push({ body: legal, titleKey: `${TITLE_PREFIX}.legalNotice` })
    }
  }

  if (iReserva >= 0) {
    const endR = firstPositiveAfter(
      iReserva,
      [iCadas, iApto, iOrient].filter((x) => x > iReserva)
    )
    const body = text.slice(iReserva, endR).trim()
    if (body.length >= MIN_BODY) {
      out.push({ body, titleKey: `${TITLE_PREFIX}.reservationAndParking` })
    }
  }

  if (iCadas > iReserva && (iApto > iCadas || (iApto < 0 && iOrient > iCadas))) {
    const endD = iApto > iCadas ? iApto : iOrient > iCadas ? iOrient : text.length
    const body = text.slice(iCadas, endD).trim()
    if (body.length >= MIN_BODY) {
      out.push({ body, titleKey: `${TITLE_PREFIX}.documents` })
    }
  }

  if (iApto >= 0) {
    const endA = iOrient > iApto ? iOrient : text.length
    if (iCadas < 0 || iApto > iCadas) {
      const startA = iApto
      const body = text.slice(startA, endA).trim()
      if (body.length >= MIN_BODY) {
        out.push({ body, titleKey: `${TITLE_PREFIX}.apartmentDetails` })
      }
    }
  }

  if (iOrient >= 0) {
    const body = text.slice(iOrient).trim()
    if (body.length >= MIN_BODY) {
      out.push({ body, titleKey: `${TITLE_PREFIX}.generalGuidelines` })
    }
  }

  if (out.length < 2) return null
  return out
}

function firstPositiveAfter(from: number, candidates: number[]): number {
  const next = candidates.filter((x) => x > from).sort((a, b) => a - b)
  return next[0] ?? Number.POSITIVE_INFINITY
}

/**
 * Remove o bloco de boas-vindas redundante (mantém a base legal).
 */
function stripMarketingAfterLegalBlock(s: string): string {
  const cut = s.split(/\n+\s*A locação de curta temporada/i)
  if (cut[0] && cut[0].length >= MIN_BODY) return cut[0].trim()
  const cut2 = s.split(/\n+\s*Para que sua experiência seja/i)
  if (cut2[0] && cut2[0].length >= MIN_BODY) return cut2[0].trim()
  return s
}

/**
 * Converte secções com chaves i18n em cards prontos para a UI.
 */
export function toPropertyDescriptionCardsFromGuestSections(
  sections: Array<{ body: string; titleKey: string }>,
  t: (key: string) => string
): PropertyDescriptionCard[] {
  return sections.map((s) => ({ title: t(s.titleKey), body: s.body }))
}
