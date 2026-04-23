import type { ServiceOffer } from "../types/guestStay";
import type {
  StaysBooking,
  StaysExtraService,
  StaysHouseRules,
  StaysPropertyListing,
} from "../types/staysApi";
import type { AxiosInstance } from "axios";
import { getStaysAxios, StaysApiError, withStaysRetry } from "./staysClient";
import {
  mapStaysToGuestStayBundle,
  serviceOffersForGuest,
  type StaysGuestStayBundle,
} from "./staysMapper";
const CACHE_TTL_MS = 60_000;

const cache = new Map<string, { expiresAt: number; value: unknown }>();

/** Apenas em dev — ajuda a mapear respostas da API Stays; evitar em produção (dados sensíveis). */
function devLogStays(label: string, ...args: unknown[]) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console -- depuração intencional só em DEV
    console.log(`[Stays] ${label}`, ...args);
  }
}

function requireStaysAxios(): AxiosInstance {
  const instance = getStaysAxios();
  if (!instance) {
    throw new StaysApiError(
      "Integração Stays não configurada. Defina VITE_STAYS_BASE_URL, VITE_STAYS_LOGIN e VITE_STAYS_PASSWORD.",
      undefined,
      "stays/not-configured",
    );
  }
  return instance;
}

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value as T;
  }
  const value = await fetcher();
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  return value;
}

function segment(pathSegment: string): string {
  return encodeURIComponent(pathSegment);
}

/**
 * Código de reserva / acesso (Stays: id curto, `partnerCode` ou id longo — ver documentação).
 * Só `trim`; preserve o casing tal como no painel Stays (a documentação mostra códigos como `CJ01G`).
 */
export function normalizeStaysReservationId(raw: string): string {
  return raw.trim();
}

/**
 * GET /external/v1/booking/reservations/{reservationId}
 * `reservationId` aceita id curto/longo e também `partnerCode` (ver API Stays).
 * Se 404, tenta de novo com o mesmo id em MAIÚSCULAS, caso o utilizador tenha introduzido outro casing.
 */
export async function fetchReservation(
  reservationCode: string,
): Promise<StaysBooking> {
  const raw = normalizeStaysReservationId(reservationCode);
  if (!raw) {
    throw new StaysApiError(
      "Código de reserva vazio.",
      undefined,
      "stays/invalid-id",
    );
  }
  const client = requireStaysAxios();
  const getOne = (id: string) => {
    const path = `booking/reservations/${segment(id)}`;
    return cached(`GET:${path}`, () =>
      withStaysRetry(() => client.get<StaysBooking>(path).then((r) => r.data)),
    );
  };
  try {
    return await getOne(raw);
  } catch (e) {
    if (
      e instanceof StaysApiError &&
      e.code === "stays/not-found" &&
      raw !== raw.toUpperCase()
    ) {
      return await getOne(raw.toUpperCase());
    }
    throw e;
  }
}

/**
 * GET /external/v1/content/listings/{listingId}
 */
export async function fetchListingById(
  listingId: string,
): Promise<StaysPropertyListing> {
  const client = requireStaysAxios();
  const path = `content/listings/${segment(listingId)}`;
  return cached(`GET:${path}`, () =>
    withStaysRetry(() =>
      client.get<StaysPropertyListing>(path).then((r) => r.data),
    ),
  );
}

/**
 * GET /external/v1/settings/listing/{listingId}/house-rules
 */
export async function fetchListingHouseRules(
  listingId: string,
): Promise<StaysHouseRules> {
  const client = requireStaysAxios();
  const path = `settings/listing/${segment(listingId)}/house-rules`;
  return cached(`GET:${path}`, () =>
    withStaysRetry(() => client.get<StaysHouseRules>(path).then((r) => r.data)),
  );
}

/**
 * GET /external/v1/booking/reservations/{reservationId}/extra-services
 */
export async function fetchReservationExtraServices(
  reservationCode: string,
): Promise<StaysExtraService[]> {
  const client = requireStaysAxios();
  const path = `booking/reservations/${segment(reservationCode)}/extra-services`;
  return cached(`GET:${path}`, () =>
    withStaysRetry(() =>
      client.get<StaysExtraService[]>(path).then((r) => r.data),
    ),
  );
}

export type StaysGuestProfile = StaysGuestStayBundle & {
  serviceOffers: ServiceOffer[];
};

/**
 * Agrega reserva + imóvel (listing) + regras + extras para o modelo do app.
 * Usa o id curto do listing nas rotas de conteúdo/configurações quando disponível.
 */
export async function fetchGuestProfileFromStays(
  reservationCode: string,
): Promise<StaysGuestProfile> {
  const normalized = normalizeStaysReservationId(reservationCode);
  const booking = await fetchReservation(normalized);

  if (booking.type === "canceled") {
    throw new StaysApiError(
      "Esta reserva está cancelada na Stays.",
      undefined,
      "stays/reservation-canceled",
    );
  }

  const listingRef = booking._idlisting;
  let listing: StaysPropertyListing | null = null;
  let houseRules: StaysHouseRules | null = null;

  if (listingRef) {
    try {
      listing = await fetchListingById(listingRef);

      const listingRouteId = listing.id?.trim() || listingRef;
      try {
        houseRules = await fetchListingHouseRules(listingRouteId);
      } catch {
        houseRules = null;
      }
    } catch {
      listing = null;
    }
  }

  let extras: StaysExtraService[] = [];
  try {
    extras = await fetchReservationExtraServices(normalized);
  } catch {
    extras = [];
  }

  /**
   * Resumo do que a Stays devolve (payloads tal como vêm da API, antes de `mapStaysToGuestStayBundle`).
   * Na consola (DEV), filtre por "API Stays" e expanda o objeto.
   */
  devLogStays("API Stays — respostas brutas (expandir objeto no DevTools)", {
    oQueE:
      "booking = reserva; listing = ficha do imóvel (content/listings); houseRules = regras do imóvel; extraServices = extras da reserva. Valores null = não pedido, erro ou inexistente.",
    codigoReserva: normalized,
    listingIdNaReserva: listingRef ?? null,
    rotas: {
      reserva: `GET …/external/v1/booking/reservations/${encodeURIComponent(normalized)}`,
      imovel: listingRef
        ? `GET …/external/v1/content/listings/${encodeURIComponent(String(listingRef))}`
        : "(reserva sem _idlisting — listing não pedido)",
      regrasCasa: listingRef
        ? `GET …/external/v1/settings/listing/${encodeURIComponent(String(listing?.id?.trim() || listingRef))}/house-rules`
        : "(sem _idlisting na reserva — houseRules não pedido)",
      extrasReserva: `GET …/external/v1/booking/reservations/${encodeURIComponent(normalized)}/extra-services`,
    },
    booking,
    listing,
    houseRules,
    extraServices: extras,
  });

  const bundle = mapStaysToGuestStayBundle(
    normalized,
    booking,
    listing,
    houseRules,
  );

  const serviceOffers = serviceOffersForGuest(extras);
  const profile: StaysGuestProfile = {
    ...bundle,
    serviceOffers,
  };
  devLogStays("App — após mapeamento (GuestStay + ofertas)", {
    guestStay: profile.guestStay,
    primaryGuest: profile.primaryGuest,
    serviceOffers: profile.serviceOffers,
  });

  return profile;
}

export function isStaysApiConfigured(): boolean {
  return getStaysAxios() != null;
}
