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
  extractListingsFromPayload,
  extractListingsTotalCount,
} from "../lib/staysListingsPayload";
import {
  buildListingCustomFieldLabelMap,
  extractListingCustomFieldDefinitionsFromPayload,
} from "../lib/staysCustomFields";
import {
  mapStaysToGuestStayBundle,
  serviceOffersForGuest,
  type StaysGuestStayBundle,
} from "./staysMapper";

/**
 * Campos adicionais (Wi‑Fi, andar, vaga) vêm do `mapStaysToGuestStayBundle` em `staysMapper.ts`
 * (heurísticas sobre texto Stays). A validação de check-out em tempo real usa `user.stay` no cliente.
 */
const CACHE_TTL_MS = 60_000;

const cache = new Map<string, { expiresAt: number; value: unknown }>();

/** Limpa o cache em memória da Stays (ex.: botão «Atualizar» no painel admin). */
export function clearStaysClientCache(): void {
  cache.clear();
}

/** Apenas em dev — ajuda a mapear respostas da API Stays; evitar em produção (dados sensíveis). */
function devLogStays(label: string, ...args: unknown[]) {
  if (import.meta.env.DEV) {
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
 * GET /external/v1/settings/app/listing-custom-fields
 * Catálogo global: `_idfield` ↔ título (`_msname`) para enriquecer `listing.customFields` ({ id, val }).
 */
export async function fetchListingCustomFieldLabelMap(): Promise<
  Map<string, string>
> {
  const client = requireStaysAxios();
  const path = "settings/app/listing-custom-fields";
  return cached(`GET:${path}`, () =>
    withStaysRetry(async () => {
      const data = await client.get<unknown>(path).then((r) => r.data);
      const defs = extractListingCustomFieldDefinitionsFromPayload(data);
      return buildListingCustomFieldLabelMap(defs);
    }),
  );
}

function mergeListingsInto(
  map: Map<string, StaysPropertyListing>,
  items: StaysPropertyListing[],
) {
  for (const it of items) {
    const k = String(it._id || it.id || "").trim();
    if (k) map.set(k, it);
  }
}

/**
 * Lista imóveis (GET …/content/listings).
 * Pagina com `skip`+`limit` sempre que o último lote vier “cheio” (antes só paginávamos se a 1.ª
 * página tivesse ≥100 itens, o que omitia contas com limite por defeito menor que 100).
 * Se `skip` repetir os mesmos dados, faz varredura alternativa com `page`.
 * Lê `total` / `totalCount` no envelope quando existir.
 */
export async function fetchListings(): Promise<StaysPropertyListing[]> {
  const client = requireStaysAxios();
  const byId = new Map<string, StaysPropertyListing>();
  const pageSize = 100;
  const maxBatches = 500;

  async function ingestPath(path: string): Promise<{
    batchLen: number;
    newMerged: number;
    total?: number;
  }> {
    const data = await withStaysRetry(() =>
      client.get<unknown>(path).then((r) => r.data),
    );
    const items = extractListingsFromPayload(data);
    const before = byId.size;
    mergeListingsInto(byId, items);
    return {
      batchLen: items.length,
      newMerged: byId.size - before,
      total: extractListingsTotalCount(data),
    };
  }

  try {
    let reportedTotal: number | undefined;
    let skipBroken = false;

    const runSkipChain = async (fromZero: boolean) => {
      for (let skip = fromZero ? 0 : pageSize, i = 0; i < maxBatches; i++, skip += pageSize) {
        let batchLen = 0;
        let newMerged = 0;
        let total: number | undefined;
        try {
          ({ batchLen, newMerged, total } = await ingestPath(
            `content/listings?skip=${skip}&limit=${pageSize}`,
          ));
        } catch {
          if (skip === 0) throw new Error("skip-0-failed");
          break;
        }
        if (total != null) reportedTotal = reportedTotal ?? total;
        if (batchLen === 0) break;
        if (reportedTotal != null && byId.size >= reportedTotal) break;
        if (batchLen < pageSize) break;
        if (skip > 0 && newMerged === 0 && batchLen === pageSize) {
          skipBroken = true;
          break;
        }
      }
    };

    try {
      await runSkipChain(true);
    } catch {
      await ingestPath("content/listings");
      try {
        await runSkipChain(false);
      } catch {
        /* bare + incremental skip optional */
      }
    }

    const incompleteByTotal =
      reportedTotal != null && byId.size < reportedTotal;

    if (skipBroken || incompleteByTotal) {
      const startPage = skipBroken ? 2 : 1;
      let stagnantPages = 0;
      for (let page = startPage; page <= maxBatches; page++) {
        let batchLen = 0;
        let newMerged = 0;
        try {
          const r = await ingestPath(
            `content/listings?page=${page}&limit=${pageSize}`,
          );
          batchLen = r.batchLen;
          newMerged = r.newMerged;
          if (r.total != null) reportedTotal = reportedTotal ?? r.total;
        } catch {
          break;
        }
        if (batchLen === 0) break;
        if (reportedTotal != null && byId.size >= reportedTotal) break;
        if (batchLen < pageSize) break;
        if (
          !(incompleteByTotal && reportedTotal != null) &&
          newMerged === 0 &&
          batchLen === pageSize
        ) {
          stagnantPages += 1;
          if (stagnantPages >= 2) break;
        } else {
          stagnantPages = 0;
        }
      }
    }

    return Array.from(byId.values());
  } catch {
    return [];
  }
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
  let customFieldLabelById: ReadonlyMap<string, string> = new Map<
    string,
    string
  >();

  if (listingRef) {
    const [listingResult, labelsResult] = await Promise.allSettled([
      fetchListingById(listingRef),
      fetchListingCustomFieldLabelMap(),
    ]);
    listing =
      listingResult.status === "fulfilled" ? listingResult.value : null;
    customFieldLabelById =
      labelsResult.status === "fulfilled"
        ? labelsResult.value
        : new Map<string, string>();

    if (listing) {
      const listingRouteId = listing.id?.trim() || listingRef;
      try {
        houseRules = await fetchListingHouseRules(listingRouteId);
      } catch {
        houseRules = null;
      }
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
    customFieldLabelById,
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
