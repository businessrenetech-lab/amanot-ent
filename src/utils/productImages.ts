import type { Product } from '../types';
import productImages from '../data/productImages.json';

// Product photos collected from electromart.store (Gree, Konka, Haiko) and
// haier.com/bd (Haier), matched by model number. Files live in public/products/.
// Bump the tag when the image set is refreshed so it is applied once more.
export const PRODUCT_IMAGES_TAG = 'product-images-2026-11';

const BY_ID = productImages.byId as Record<string, string>;
const BY_MODEL = productImages.byModel as Record<string, string>;

export const bundledImageFor = (p: Pick<Product, 'id' | 'model' | 'sku'>): string | undefined =>
  BY_ID[p.id] || BY_MODEL[(p.model || p.sku || '').trim().toLowerCase()];

/** Gives every product that has no photo yet its bundled photo. Never replaces an existing one. */
export function fillProductImages(products: Product[]): { products: Product[]; filled: number } {
  let filled = 0;
  const next = products.map((p) => {
    if (p.image || p.images?.length) return p;
    const image = bundledImageFor(p);
    if (!image) return p;
    filled++;
    return { ...p, image };
  });
  return filled ? { products: next, filled } : { products, filled: 0 };
}

export const needsImageFill = (settings: { catalogImports?: string[] } | undefined) =>
  !(settings?.catalogImports || []).includes(PRODUCT_IMAGES_TAG);

export const markImagesFilled = <T extends { catalogImports?: string[] }>(settings: T): T => ({
  ...settings,
  catalogImports: Array.from(new Set([...(settings.catalogImports || []), PRODUCT_IMAGES_TAG]))
});
