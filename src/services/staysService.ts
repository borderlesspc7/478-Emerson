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
import {
  parseStaysBookingPayload,
  parseStaysExtraServicesPayload,
  parseStaysHouseRulesPayload,
  parseStaysListingPayload,
  requireReservationListingId,
} from "./staysValidation";

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

/** Logs seguros (sem payload/credenciais). Em DEV vai ao console; em PROD só erros. */
function logStays(
  level: "info" | "warn" | "error",
  label: string,
  context: Record<string, unknown>,
) {
  const entry = { scope: "stays", label, ...context };
  if (level === "error") {
    console.error("[Stays]", entry);
    return;
  }
  if (import.meta.env.DEV) {
    if (level === "warn") console.warn("[Stays]", entry);
    else console.info("[Stays]", entry);
  }
}

function staysErrorSummary(error: unknown): Record<string, unknown> {
  if (error instanceof StaysApiError) {
    return { code: error.code ?? "stays/unknown", status: error.status ?? null };
  }
  return { code: "stays/unknown", status: null };
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
      withStaysRetry(() =>
        client.get<unknown>(path).then((r) => parseStaysBookingPayload(r.data)),
      ),
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
      client.get<unknown>(path).then((r) => parseStaysListingPayload(r.data)),
    ),
  );
}

export type StaysReservationProperty = {
  booking: StaysBooking;
  listingId: string;
  listing: StaysPropertyListing;
};

/** Resolve e valida o vínculo reserva → imóvel usado na criação de acesso. */
export async function fetchReservationProperty(
  reservationCode: string,
): Promise<StaysReservationProperty> {
  const booking = await fetchReservation(reservationCode);
  const listingId = requireReservationListingId(booking);
  const listing = await fetchListingById(listingId);
  return { booking, listingId, listing };
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
  } catch (error) {
    logStays("error", "listing-list-failed", staysErrorSummary(error));
    throw error;
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
    withStaysRetry(() =>
      client
        .get<unknown>(path)
        .then((r) => parseStaysHouseRulesPayload(r.data)),
    ),
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
      client
        .get<unknown>(path)
        .then((r) => parseStaysExtraServicesPayload(r.data)),
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

  const listingRef = requireReservationListingId(booking);
  let listing: StaysPropertyListing | null = null;
  let houseRules: StaysHouseRules | null = null;
  let customFieldLabelById: ReadonlyMap<string, string> = new Map<
    string,
    string
  >();

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
    } catch (error) {
      logStays("warn", "house-rules-unavailable", {
        ...staysErrorSummary(error),
        hasListingRouteId: Boolean(listingRouteId),
      });
      houseRules = null;
    }
  } else if (listingResult.status === "rejected") {
    logStays("warn", "listing-unavailable", staysErrorSummary(listingResult.reason));
  }

  let extras: StaysExtraService[] = [];
  try {
    extras = await fetchReservationExtraServices(normalized);
  } catch (error) {
    logStays("warn", "extra-services-unavailable", staysErrorSummary(error));
    extras = [];
  }

  logStays("info", "guest-profile-fetched", {
    reservationCodeLength: normalized.length,
    hasListing: listing !== null,
    hasHouseRules: houseRules !== null,
    extraServicesCount: extras.length,
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
  logStays("info", "guest-profile-mapped", {
    hasPrimaryGuest: profile.primaryGuest !== null,
    serviceOffersCount: profile.serviceOffers.length,
    hasCheckIn: Boolean(profile.guestStay.checkInAt),
    hasCheckOut: Boolean(profile.guestStay.checkOutAt),
  });

  return profile;
}

export function isStaysApiConfigured(): boolean {
  return getStaysAxios() != null;
}
