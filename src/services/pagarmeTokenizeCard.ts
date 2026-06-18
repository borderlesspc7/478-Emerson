export type CardTokenizeInput = {
  number: string
  holderName: string
  expMonth: string
  expYear: string
  cvv: string
}

function requirePublicKey(): string {
  const key = import.meta.env.VITE_PAGARME_PUBLIC_KEY?.trim()
  if (!key) {
    throw new Error('pagarme/public-key-missing')
  }
  return key
}

export async function tokenizePagarmeCard(input: CardTokenizeInput): Promise<string> {
  const appId = requirePublicKey()
  const url = `https://api.pagar.me/core/v5/tokens?appId=${encodeURIComponent(appId)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'card',
      card: {
        number: input.number.replace(/\D/g, ''),
        holder_name: input.holderName.trim(),
        exp_month: Number.parseInt(input.expMonth, 10),
        exp_year: Number.parseInt(input.expYear.length === 2 ? `20${input.expYear}` : input.expYear, 10),
        cvv: input.cvv.replace(/\D/g, ''),
      },
    }),
  })

  const data = (await response.json().catch(() => null)) as { id?: string; message?: string } | null
  if (!response.ok || !data?.id) {
    const message = data?.message || `Pagar.me token HTTP ${response.status}`
    throw new Error(message)
  }

  return data.id
}

export function isPagarmePublicKeyConfigured(): boolean {
  return Boolean(import.meta.env.VITE_PAGARME_PUBLIC_KEY?.trim())
}
