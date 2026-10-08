import { SyncJobAction } from "./sync.types";

/**
 * Channel listing values are independent per ProductMapping.
 * Master product price/quantity are defaults only when a mapping has no channel value.
 * 0 is a valid stored channel price/quantity (nullish coalescing, not truthiness).
 */
export function isPresentNumber(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value));
}

function resolveChannelNumber(channelValue: unknown, masterValue: unknown): number {
  // Nullish fallback only. A stored 0 is a real channel value.
  const chosen = channelValue === undefined || channelValue === null ? masterValue : channelValue;
  const numeric = Number(chosen);
  return Math.max(0, Number.isFinite(numeric) ? numeric : 0);
}

export function resolveChannelPrice(channelPrice: unknown, masterPrice: unknown): number {
  return resolveChannelNumber(channelPrice, masterPrice);
}

export function resolveChannelQuantity(channelQuantity: unknown, masterQuantity: unknown): number {
  return resolveChannelNumber(channelQuantity, masterQuantity);
}

export function seedChannelListing(input: {
  channelPrice?: number | null;
  channelQuantity?: number | null;
  channelCurrency?: string | null;
  masterPrice?: number | null;
  masterQuantity?: number | null;
  masterCurrency?: string | null;
  integrationCurrency?: string | null;
}): { channelPrice: number; channelQuantity: number; channelCurrency?: string } {
  const currency = String(
    input.channelCurrency || input.masterCurrency || input.integrationCurrency || ""
  )
    .trim()
    .toUpperCase();
  return {
    channelPrice: resolveChannelPrice(input.channelPrice, input.masterPrice),
    channelQuantity: resolveChannelQuantity(input.channelQuantity, input.masterQuantity),
    ...(currency ? { channelCurrency: currency } : {}),
  };
}

export function channelListingFromImport(normalized: {
  price?: number | null;
  quantity?: number | null;
  currency?: string | null;
}): { channelPrice: number; channelQuantity: number; channelCurrency?: string } {
  const currency = String(normalized.currency || "").trim().toUpperCase();
  return {
    channelPrice: Math.max(0, Number(normalized.price) || 0),
    channelQuantity: Math.max(0, Number(normalized.quantity) || 0),
    ...(currency ? { channelCurrency: currency } : {}),
  };
}

export function isChannelListingPatch(data: {
  channelPrice?: number;
  channelQuantity?: number;
  channelCurrency?: string;
}): boolean {
  return (
    data.channelPrice !== undefined ||
    data.channelQuantity !== undefined ||
    data.channelCurrency !== undefined
  );
}

/** A listing edit syncs that mapping only. Other channel mappings are not targets. */
export function syncTargetsForMappingUpdate(
  mappingId: string,
  data: { channelPrice?: number; channelQuantity?: number; channelCurrency?: string }
): string[] {
  return isChannelListingPatch(data) ? [mappingId] : [];
}

export function resolveSyncAction(
  requestedAction: SyncJobAction,
  externalProductId: unknown
): SyncJobAction {
  if (requestedAction === SyncJobAction.DELETE) return SyncJobAction.DELETE;
  const hasExternalProductId = typeof externalProductId === "string" && externalProductId.trim().length > 0;
  return hasExternalProductId ? SyncJobAction.UPDATE : SyncJobAction.CREATE;
}

export function resolveChannelShippingCost(mappingShipping: unknown, masterShipping: unknown): number {
  if (isPresentNumber(mappingShipping)) {
    return Math.max(0, Number(mappingShipping));
  }
  return Math.max(0, Number(masterShipping) || 0);
}
