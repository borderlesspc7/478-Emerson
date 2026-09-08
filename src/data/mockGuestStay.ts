import type { GuestStay, ServiceOffer } from '../types/guestStay'

/** Dados de exemplo para login DEV (`demo` / `demo-pre`). */
export const mockGuestStay: GuestStay = {
  reservationCode: 'DEV-DEMO',
  bookingPortal: 'Booking.com',
  property: {
    name: 'Pepi Residencial - arena da baixada - elc102',
    unit: 'ELC102',
    buildingName: 'Ed. Luciane',
    listingCode: 'elc102',
    floor: '10º andar',
    addressLine: 'Av. Pres. Getúlio Vargas, 1345',
    city: 'Curitiba, PR · Rebouças',
    postalCode: '80250-180',
    imageUrl:
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
  },
  checkInAt: '2026-04-14T15:00:00-03:00',
  checkOutAt: '2026-04-18T11:00:00-03:00',
  wifi: {
    ssid: 'CondominioLuciane',
    password: 'luciane1345',
  },
  access: {
    summary:
      'Apartamento de 39 m² no Ed. Luciane (Av. Pres. Getúlio Vargas, 1345). Acomoda até 4 hóspedes. Perto da Arena da Baixada e do Batel.',
    instructions:
      'Use o teclado ao lado da porta: digite o código 1842# e aguarde o sinal verde.\nO cofre na sala contém a chave extra.\nMantenha a porta da varanda fechada ao sair.',
    doorPassword: '1842#',
    apartmentPassword: '1133',
    floor: '10º andar',
    garageSpot: 'Vaga 27',
  },
  notes: 'Check-out até 11h. Depósito de lixo no hall.',
  staysCustomFields: [
    {
      key: 'apartment-password',
      label: 'Senha do apartamento',
      value: '1133',
    },
  ],
}

export const mockServiceOffers: ServiceOffer[] = [
  {
    id: 'mock-linen',
    name: 'Troca de enxoval',
    description:
      '2 toalhas de banho\n2 fronhas\n1 toalha de rosto\n1 toalha de piso',
    priceInCents: 7000,
  },
  {
    id: 'mock-cleaning',
    name: 'Limpeza extra',
    description:
      'Limpeza completa do apartamento\nFora do horário padrão\nInclui troca de lixo e louça',
    priceInCents: 18000,
  },
  {
    id: 'mock-maintenance',
    name: 'Manutenção leve',
    description: 'Pequenos reparos ou ajustes durante a estadia.',
    priceInCents: 9000,
  },
]
