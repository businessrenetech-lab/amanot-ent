import type { Product } from '../types';
import haierProducts from '../data/haierProducts.json';

// Bump this tag when a new Haier price list is generated, so the new rows are
// merged once into every existing install (DB or localStorage).
export const HAIER_CATALOG_TAG = 'haier-hbl-2026-11';

export const HAIER_PRODUCTS = haierProducts as unknown as Product[];

const keyOf = (p: Pick<Product, 'sku' | 'model'>) => (p.model || p.sku || '').trim().toLowerCase();

/**
 * Adds every Haier catalogue product that the list does not already hold
 * (matched by id, model or SKU). Existing products — and their stock and
 * edited prices — are left untouched.
 */
export function mergeHaierCatalog(products: Product[]): { products: Product[]; added: number } {
  const ids = new Set(products.map((p) => p.id));
  const keys = new Set(products.map(keyOf).filter(Boolean));
  const missing = HAIER_PRODUCTS.filter((p) => !ids.has(p.id) && !keys.has(keyOf(p)));
  return missing.length ? { products: [...products, ...missing], added: missing.length } : { products, added: 0 };
}

export const needsHaierImport = (settings: { catalogImports?: string[] } | undefined) =>
  !(settings?.catalogImports || []).includes(HAIER_CATALOG_TAG);

export const markHaierImported = <T extends { catalogImports?: string[] }>(settings: T): T => ({
  ...settings,
  catalogImports: Array.from(new Set([...(settings.catalogImports || []), HAIER_CATALOG_TAG]))
});
