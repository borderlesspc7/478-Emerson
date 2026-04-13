import type { GuestStay, ServiceOffer } from '../types/guestStay'

/** Substituir por resposta da API Stays quando a integração existir. */
export const mockGuestStay: GuestStay = {
  reservationCode: 'ZEN-2026-8841',
  property: {
    name: 'Zen Residence · Pinheiros',
    unit: 'Apto 402',
    floor: '4º andar',
    addressLine: 'Rua dos Pinheiros, 123',
    city: 'São Paulo, SP',
    postalCode: '05422-000',
  },
  checkInAt: '2026-04-14T15:00:00-03:00',
  checkOutAt: '2026-04-18T11:00:00-03:00',
  wifi: {
    ssid: 'ZEN_GUEST',
    password: 'bemvindo2026',
  },
  access: {
    summary: 'Entrada digital ativa durante a estadia.',
    instructions:
      'Use o teclado ao lado da porta: digite o código 1842# e aguarde o sinal verde. O cofre na sala contém a chave extra (código enviado por SMS). Mantenha a porta da varanda fechada ao sair.',
  },
  notes:
    'Check-out até 11h. Depósito de lixo no hall (porta à esquerda das elevadoras).',
}

export const mockServiceOffers: ServiceOffer[] = [
  { id: 'cleaning' },
  { id: 'linen' },
  { id: 'maintenance' },
  { id: 'concierge' },
]
