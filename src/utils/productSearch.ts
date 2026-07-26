import { Product } from '../types';

/**
 * POS product search.
 *
 * Counter staff type things like "gree 2 ton ac", "24000 btu", "GS-24XZNA3V" or
 * "konka fridge". A single substring match cannot serve any of those, so this
 * module tokenizes the query, requires every token to hit somewhere (AND), and
 * ranks what survives so the intended product lands on top.
 */

/** Short forms staff type, mapped to the words that actually appear in the catalogue. */
const SYNONYMS: Record<string, string> = {
  ac: 'air conditioner',
  aircon: 'air conditioner',
  fridge: 'refrigerator',
  ref: 'refrigerator',
  freezer: 'refrigerator',
  tv: 'led tv television',
  television: 'led tv',
  washer: 'washing machine',
  wm: 'washing machine',
  micro: 'microwave oven',
  oven: 'microwave oven',
  iron: 'electric iron',
  kettle: 'electric kettle',
  hood: 'kitchen hood',
  hob: 'kitchen hob',
  stove: 'gas stove',
  cooker: 'rice cooker induction cooker pressure cooker',
  geyser: 'geyser water heater',
  inv: 'inverter',
  ton: 'ton tonne'
};

/**
 * Normalizes text so the same product matches however it is typed:
 *   "2.0 Ton" / "2 ton" / "2ton"  -> "2 ton"
 *   "24000BTU"                    -> "24000 btu"
 *   "GS-24XZNA3V"                 -> "gs 24xzna3v" (hyphen kept as a separator)
 */
export function normalizeSearchText(raw: string): string {
  return (raw || '')
    .toLowerCase()
    // split digit/letter boundaries: "24000btu" -> "24000 btu", "2ton" -> "2 ton"
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/([a-z])(\d)/g, '$1 $2')
    // trailing ".0" carries no meaning for sizes: "2.0 ton" -> "2 ton"
    .replace(/(\d+)\.0(?!\d)/g, '$1')
    // punctuation becomes whitespace
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const isNumericToken = (token: string): boolean => /^\d+(\.\d+)?$/.test(token);

function expandToken(token: string): string[] {
  const synonym = SYNONYMS[token];
  return synonym ? [token, ...synonym.split(' ')] : [token];
}

export function tokenizeQuery(query: string): string[] {
  const normalized = normalizeSearchText(query);
  return normalized ? normalized.split(' ').filter(Boolean) : [];
}

interface ProductIndex {
  /** Highest-signal identifiers — SKU and model. */
  code: string;
  name: string;
  /** Headline size — "2 ton", "43 inch". The strongest spec signal. */
  size: string;
  /** Rated capacity — "24000 btu". Weaker: an accessory may quote a range it serves. */
  capacity: string;
  /** Brand, category, series, AC type. */
  classification: string;
  /** Description, tags, warranty — weakest signal. */
  extra: string;
  /** Everything above, for whole-word checks. */
  words: Set<string>;
}

function buildIndex(product: Product): ProductIndex {
  const code = normalizeSearchText([product.sku, product.model].filter(Boolean).join(' '));
  const name = normalizeSearchText(product.name);
  const size = normalizeSearchText(product.size || '');
  const capacity = normalizeSearchText(product.capacity || '');
  const classification = normalizeSearchText(
    [product.brand, product.category, product.typeSeries, product.acType].filter(Boolean).join(' ')
  );
  const extra = normalizeSearchText(
    [product.description, (product.tags || []).join(' '), product.warranty].filter(Boolean).join(' ')
  );

  return {
    code,
    name,
    size,
    capacity,
    classification,
    extra,
    words: new Set(
      `${code} ${name} ${size} ${capacity} ${classification} ${extra}`.split(' ').filter(Boolean)
    )
  };
}

/**
 * Scores one token against a field.
 *
 * Numeric tokens must match a whole word, otherwise "2 ton" would match the
 * 1.0 Ton unit whose SKU happens to contain a 2 (GS-12XZNA3V) — the precision
 * problem that makes a naive search useless on this catalogue.
 */
function scoreToken(
  token: string,
  index: ProductIndex,
  weightedFields: [string, number][],
  numericFields: [string, number][]
): number {
  if (isNumericToken(token)) {
    if (!index.words.has(token)) return 0;
    // A bare number is a spec, not a model code — "2" means 2 Ton, not a SKU
    // containing a 2. Fields are ordered by weight, so the first hit is the best.
    for (const [field, weight] of numericFields) {
      if (field.split(' ').includes(token)) return weight;
    }
    return 0;
  }

  let best = 0;
  for (const [field, weight] of weightedFields) {
    if (!field) continue;
    if (field === token) best = Math.max(best, weight * 2);
    else if (new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(field)) {
      best = Math.max(best, weight); // word-start match
    } else if (field.includes(token)) {
      best = Math.max(best, weight * 0.5); // mid-word match, e.g. partial SKU
    }
  }
  return best;
}

export interface ScoredProduct {
  product: Product;
  score: number;
}

/**
 * Returns products matching every token in the query, best match first.
 * An empty query returns everything unscored, so callers can apply their own order.
 */
export function searchProducts(products: Product[], query: string): ScoredProduct[] {
  const rawTokens = tokenizeQuery(query);
  if (rawTokens.length === 0) return products.map((product) => ({ product, score: 0 }));

  const normalizedQuery = normalizeSearchText(query);
  const results: ScoredProduct[] = [];

  for (const product of products) {
    const index = buildIndex(product);
    const weightedFields: [string, number][] = [
      [index.code, 40],
      [index.size, 34],
      [index.name, 30],
      [index.capacity, 20],
      [index.classification, 16],
      [index.extra, 6]
    ];

    // Numbers rank spec-first. Both lists must stay ordered by descending weight.
    const numericFields: [string, number][] = [
      [index.size, 40],
      [index.capacity, 30],
      [index.name, 28],
      [index.code, 24],
      [index.classification, 14],
      [index.extra, 5]
    ];

    let total = 0;
    let allTokensMatched = true;

    for (const token of rawTokens) {
      // A token counts if it or any of its synonyms hits
      const variants = expandToken(token);
      let bestForToken = 0;
      for (const variant of variants) {
        bestForToken = Math.max(
          bestForToken,
          scoreToken(variant, index, weightedFields, numericFields)
        );
      }

      if (bestForToken === 0) {
        allTokensMatched = false;
        break;
      }
      total += bestForToken;
    }

    if (!allTokensMatched) continue;

    // Whole-query bonuses: scanning a barcode or typing a full model should win outright
    if (index.code === normalizedQuery) total += 1000;
    else if (index.code.startsWith(normalizedQuery)) total += 400;
    if (index.name.includes(normalizedQuery)) total += 200;

    // Nudge sellable stock above out-of-stock items of equal relevance
    if (product.stockQty > 0) total += 5;

    results.push({ product, score: total });
  }

  return results.sort((a, b) => b.score - a.score);
}
