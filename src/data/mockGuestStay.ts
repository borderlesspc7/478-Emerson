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
    imageUrl:
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
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
    doorPassword: '1842#',
    floor: '4º andar',
    garageSpot: 'Vaga 27',
  },
  notes:
    'Check-out até 11h. Depósito de lixo no hall (porta à esquerda das elevadoras).',
}

export const mockServiceOffers: ServiceOffer[] = [
  {
    id: 'mock-cleaning',
    name: 'Limpeza extra',
    description: 'Limpeza completa do apartamento fora do horário padrão.',
    priceInCents: 18000,
  },
  {
    id: 'mock-linen',
    name: 'Roupa de cama e banho',
    description: 'Troca adicional de lençóis e toalhas.',
    priceInCents: 12000,
  },
  {
    id: 'mock-maintenance',
    name: 'Manutenção leve',
    description: 'Pequenos reparos ou ajustes durante a estadia.',
    priceInCents: 9000,
  },
  {
    id: 'mock-concierge',
    name: 'Concierge / apoio',
    description: 'Suporte e orientação durante a estadia.',
    priceInCents: 7000,
  },
]
