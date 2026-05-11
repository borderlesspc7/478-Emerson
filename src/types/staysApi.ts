/**
 * Tipos alinhados à API externa Stays (documentação: stays.net/external-api).
 * Campos opcionais porque a API pode evoluir e nem todos os ambientes retornam o mesmo conjunto.
 */

export type StaysLocalizedString = Partial<
  Record<'pt_BR' | 'en_US' | 'es_ES' | 'pt_PT' | string, string>
>

export type StaysBookingType = 'reserved' | 'booked' | 'blocked' | 'canceled' | string

export interface StaysBookingGuestListItem {
  name?: string
  email?: string
  birthday?: string
  primary?: boolean
  type?: string
}

export interface StaysBookingGuestsDetails {
  adults?: number
  children?: number
  infants?: number
  list?: StaysBookingGuestListItem[]
}

export interface StaysBookingPrice {
  currency?: string
  _f_total?: number
}

export interface StaysBooking {
  _id?: string
  id?: string
  partnerCode?: string
  creationDate?: string
  checkInDate?: string
  checkInTime?: string
  checkOutDate?: string
  checkOutTime?: string
  _idlisting?: string
  _idclient?: string
  type?: StaysBookingType
  price?: StaysBookingPrice
  internalNote?: string
  guests?: number
  guestsDetails?: StaysBookingGuestsDetails
}

export interface StaysListingAddress {
  countryCode?: string
  state?: string
  stateCode?: string
  city?: string
  region?: string
  street?: string
  streetNumber?: string
  additional?: string
  zip?: string
}

export interface StaysPropertyListing {
  _id?: string
  id?: string
  /** Imagem principal (metadados da Stays). */
  _idmainImage?: string
  _t_mainImageMeta?: { url?: string }
  /** Lista curta de ids de imagem. */
  images?: { _id?: string }[]
  /** Metadados com URL completa por imagem. */
  _t_imagesMeta?: Array<{ _id?: string; url?: string; area?: string }>
  internalName?: string
  _mstitle?: StaysLocalizedString
  /** Descrição comercial (HTML). */
  _msdesc?: StaysLocalizedString
  /** Resumo curto. */
  _mssummary?: StaysLocalizedString
  /** Notas operacionais / orientações (HTML). */
  _msnotes?: StaysLocalizedString
  /** Instruções de acesso ao imóvel (HTML). */
  _msaccess?: StaysLocalizedString
  subtype?: string
  address?: StaysListingAddress
  status?: string
  /** Campos personalizados do listing na Stays (Wi‑Fi, etc., conforme configuração). */
  customFields?: unknown[]
}

export interface StaysGuestPrimary {
  name: string
  email?: string | null
}

/** Hóspede principal derivado de `guestsDetails.list` na reserva. */
export type StaysGuest = StaysGuestPrimary

export interface StaysHouseRules {
  smokingAllowed?: boolean
  petsAllowed?: string | boolean
  _mshouserules?: StaysLocalizedString
}

export interface StaysExtraService {
  _id?: string
  _idextra?: string
  _msname?: StaysLocalizedString
  _f_unitPrice?: number
  _i_unitCount?: number
  _f_val?: number
  desc?: string
}
