/**
 * Converte HTML da Stays (descrição comercial) em texto com quebras, para
 * podermos partir em blocos.
 */
export function htmlToDescriptionPlainText(raw: string): string {
  if (!raw?.trim()) return ''
  let s = raw
  s = s.replace(/<\s*br\s*\/?>/gi, '\n')
  s = s.replace(/<\/\s*(p|div|h[1-6]|li|tr|section|article)\s*>/gi, '\n\n')
  s = s.replace(/<li[^>]*>/gi, '\n• ')
  s = s.replace(/<[^>]+>/g, ' ')
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
  s = s
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
  s = s.replace(/\n{3,}/g, '\n\n')
  return s.trim()
}

export type PropertyDescriptionCard = {
  title: string
  body: string
}

const SECTION_MARKERS: RegExp[] = [
  /\bCheck-in\b/gi,
  /\bCheck-out\b/gi,
  /\bVaga(?:\s+de)?\s+garagem\b/gi,
  /\bVaga(?=\s*[:–-])/gi,
  /\bEstacionamento\b/gi,
  /\bBiometr/gi,
  /\bO\s+anfitri[ãa]o\b/gi,
  /\bNão\s+oferecemos\b/gi,
  /\bA\s+Lei\b/gi,
  /\bLei\s*8[.,]?\s*245\b/gi,
  /\bDocumenta[çc]ão\b/gi,
  /\bHóspedes\b/gi,
  /\bHospedes\b/gi,
  /\bRegistro(s)?\b/gi,
  /\bAcesso\s+obrigatório\b/gi,
  /\bRegras\s+gerais\b/gi,
  /\bCondom[íi]nio\b/gi,
]

/**
 * Parte a descrição (já em texto) em blocos com títulos heurísticos.
 * Primeiro: parágrafos duplos. Depois: primeiras ocorrências de marcadores (PT) num único bloco.
 */
export function splitDescriptionIntoCards(
  plain: string,
  fallbackTitle: (i: number) => string
): PropertyDescriptionCard[] {
  const text = plain.trim()
  if (!text) return []

  let chunks = text
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter(Boolean)
  if (chunks.length < 2) {
    const byTopics = splitLongBlobBySectionMarkers(text)
    if (byTopics.length > 1) chunks = byTopics
  }
  if (chunks.length < 2 && text.length > 800) {
    chunks = splitBySentenceGroups(text, 5)
  }

  return chunks.map((body, i) => {
    const { title, rest } = inferTitleForBlock(body, fallbackTitle(i + 1))
    return { title, body: rest }
  })
}

/**
 * Corta o texto nas primeiras ocorrências de tópicos (índice do match),
 * de modo a formar 2+ partes. Se o mesmo marcador ocorre duas vezes, ambas
 * as posições entram; blocos muito pequenos podem sair, mas a UI ainda lê.
 */
function splitLongBlobBySectionMarkers(s: string): string[] {
  const starts = new Set<number>([0])
  for (const pattern of SECTION_MARKERS) {
    const re = new RegExp(pattern.source, 'gi')
    let m: RegExpExecArray | null
    while ((m = re.exec(s)) !== null) {
      if (m.index > 0) starts.add(m.index)
    }
  }
  const ordered = [...starts].sort((a, b) => a - b)
  if (ordered.length < 2) return [s]
  const parts: string[] = []
  for (let i = 0; i < ordered.length; i++) {
    const from = ordered[i]!
    const to = i + 1 < ordered.length ? ordered[i + 1]! : s.length
    const chunk = s.slice(from, to).trim()
    if (chunk) parts.push(chunk)
  }
  return parts.length > 0 ? parts : [s]
}

function splitBySentenceGroups(s: string, perGroup: number): string[] {
  const sentences = s
    .split(/(?<=[.!?…])\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
  if (sentences.length <= 1) return [s]
  const groups: string[] = []
  for (let i = 0; i < sentences.length; i += perGroup) {
    groups.push(sentences.slice(i, i + perGroup).join(' '))
  }
  return groups
}

function inferTitleForBlock(
  block: string,
  defaultTitle: string
): { title: string; rest: string } {
  const lines = block
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length >= 2 && lines[0].length <= 100 && !lines[0].endsWith('…')) {
    return { title: cleanTitleLine(lines[0]), rest: lines.slice(1).join('\n\n') }
  }
  const m = block.match(
    /^(Check-in|Check-out|Vaga|Estacionamento|Biometr|Hóspedes?|Hospedes?|O anfitri|Não oferec|A Lei|Lei|Documenta|Registro|Registos?|Acesso|Código|Horário|Apartamento|Imóvel|Regras|Condom)[^\n.]{0,100}(?:[.:]|$)/im
  )
  if (m) {
    const firstEnd = m[0].length
    return {
      title: cleanTitleLine(m[0].replace(/[.:]+$/g, '')),
      rest: block.slice(firstEnd).trim(),
    }
  }
  const first = block.split(/(?<=[.!?])\s+/, 2)[0]
  if (first && first.length < 100 && first.length < block.length * 0.35) {
    return { title: cleanTitleLine(first), rest: block.slice(first.length).trim() }
  }
  return { title: defaultTitle, rest: block }
}

function cleanTitleLine(t: string): string {
  return t.replace(/^\*+\s*/, '').replace(/\*+$/g, '').trim()
}
