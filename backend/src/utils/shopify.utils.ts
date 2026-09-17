/**
 * Normalizes a Shopify store URL/domain input to standard domain format:
 * e.g. "amazing-ink-shop.myshopify.com"
 * 
 * Handles:
 * - "https://admin.shopify.com/store/amazing-ink-shop/products" -> "amazing-ink-shop.myshopify.com"
 * - "admin.shopify.com/store/amazing-ink-shop" -> "amazing-ink-shop.myshopify.com"
 * - "https://amazing-ink-shop.myshopify.com/admin/settings" -> "amazing-ink-shop.myshopify.com"
 * - "amazing-ink-shop" -> "amazing-ink-shop.myshopify.com"
 */
export function normalizeShopifyDomain(input: string): string {
  let clean = (input || "").trim().toLowerCase();

  // Strip protocol
  clean = clean.replace(/^https?:\/\//, "");

  // Check admin.shopify.com/store/STORE_HANDLE pattern
  const adminMatch = clean.match(/admin\.shopify\.com\/store\/([^\/\?#]+)/);
  if (adminMatch && adminMatch[1]) {
    return `${adminMatch[1]}.myshopify.com`;
  }

  // Strip path, query params, hash
  clean = clean.split("/")[0].split("?")[0].split("#")[0];

  // If already ends with .myshopify.com, return it
  if (clean.endsWith(".myshopify.com")) {
    return clean;
  }

  // If handle contains no dots, append .myshopify.com
  if (!clean.includes(".")) {
    return `${clean}.myshopify.com`;
  }

  return clean;
}
