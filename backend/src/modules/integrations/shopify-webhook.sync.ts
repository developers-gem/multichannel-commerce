import { toShopifyGid } from "../../utils/shopify.utils";

export interface ShopifyCatalogPatch {
  title?: string;
  description?: string;
  brand?: string;
  category?: string;
  images?: string[];
}

export interface ShopifyMappingListing {
  sku: string;
  externalProductId: string;
  externalVariantId: string;
  externalInventoryItemId: string;
  externalSku: string;
  channelPrice?: number;
  channelQuantity?: number;
  syncStatus: "SYNCED";
  isActive: true;
  isDeleted: false;
}

export interface ShopifyProductWebhookPlan {
  sku: string;
  productGid: string;
  variantGid: string;
  inventoryItemGid: string;
  /** Shared catalog fields. Price and quantity are never included. */
  masterCatalog: ShopifyCatalogPatch;
  /** Used only when the master product does not exist yet. */
  masterDefaults: {
    title: string;
    description: string;
    brand: string;
    category: string;
    images: string[];
    price: number;
    quantity: number;
  };
  mapping: ShopifyMappingListing;
}

export function planShopifyProductWebhook(payload: Record<string, any>): ShopifyProductWebhookPlan | null {
  const rawProductId = String(payload.id || "");
  if (!rawProductId) return null;

  const primaryVariant = (payload.variants || [])[0];
  const rawVariantId = primaryVariant ? String(primaryVariant.id || "") : "";
  const rawInventoryItemId = primaryVariant ? String(primaryVariant.inventory_item_id || "") : "";
  const skuRaw = String(primaryVariant?.sku || "").trim();
  const sku = skuRaw ? skuRaw.toUpperCase() : `SKU-SHOPIFY-${rawProductId}`;
  const images = Array.isArray(payload.images)
    ? payload.images.map((image: any) => image?.src).filter(Boolean)
    : undefined;

  const channelPrice =
    primaryVariant?.price !== undefined && primaryVariant?.price !== null
      ? Math.max(0, Number(primaryVariant.price) || 0)
      : undefined;
  const channelQuantity =
    primaryVariant?.inventory_quantity !== undefined && primaryVariant?.inventory_quantity !== null
      ? Math.max(0, Number(primaryVariant.inventory_quantity) || 0)
      : undefined;

  const masterCatalog: ShopifyCatalogPatch = {};
  if (payload.title) masterCatalog.title = payload.title;
  if (payload.body_html !== undefined && payload.body_html !== null) masterCatalog.description = payload.body_html || "";
  if (payload.vendor !== undefined) masterCatalog.brand = payload.vendor || "";
  if (payload.product_type !== undefined) masterCatalog.category = payload.product_type || "";
  if (images) masterCatalog.images = images;

  return {
    sku,
    productGid: toShopifyGid("Product", rawProductId),
    variantGid: rawVariantId ? toShopifyGid("ProductVariant", rawVariantId) : "",
    inventoryItemGid: rawInventoryItemId ? toShopifyGid("InventoryItem", rawInventoryItemId) : "",
    masterCatalog,
    masterDefaults: {
      title: payload.title || "Untitled Shopify Product",
      description: payload.body_html || "",
      brand: payload.vendor || "",
      category: payload.product_type || "",
      images: images || [],
      price: channelPrice ?? 0,
      quantity: channelQuantity ?? 0,
    },
    mapping: {
      sku,
      externalProductId: toShopifyGid("Product", rawProductId),
      externalVariantId: rawVariantId ? toShopifyGid("ProductVariant", rawVariantId) : "",
      externalInventoryItemId: rawInventoryItemId ? toShopifyGid("InventoryItem", rawInventoryItemId) : "",
      externalSku: sku,
      ...(channelPrice !== undefined ? { channelPrice } : {}),
      ...(channelQuantity !== undefined ? { channelQuantity } : {}),
      syncStatus: "SYNCED",
      isActive: true,
      isDeleted: false,
    },
  };
}

export function planShopifyInventoryWebhook(payload: Record<string, any>): {
  rawInventoryItemId: string;
  inventoryItemGid: string;
  channelQuantity: number;
} | null {
  const rawInventoryItemId = String(payload.inventory_item_id || "");
  const quantity = Number(payload.available);
  if (!rawInventoryItemId || !Number.isFinite(quantity)) return null;
  return {
    rawInventoryItemId,
    inventoryItemGid: toShopifyGid("InventoryItem", rawInventoryItemId),
    channelQuantity: Math.max(0, quantity),
  };
}
