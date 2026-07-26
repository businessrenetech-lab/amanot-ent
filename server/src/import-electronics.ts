// ============================================================================
// Replaces the products collection in the DB with the Amanot Electronics
// catalogue (src/data/electronicsProducts.json) and refreshes the brand /
// category master lists so the POS + storefront filters match.
//
//   npm run db:import-electronics
//
// Non-destructive to other collections (customers, sales, etc.).
// ============================================================================
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COLLECTION_BY_KEY } from './collections';
import { replaceCollection, getSingleton, setSingleton } from './repo';
import { closePool } from './db';

const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

async function run(): Promise<void> {
  const file = resolve(process.cwd(), 'src', 'data', 'electronicsProducts.json');
  const products = JSON.parse(readFileSync(file, 'utf8')) as any[];
  console.log(`Loaded ${products.length} products from ${file}`);

  // 1. Replace the entire products collection.
  await replaceCollection(COLLECTION_BY_KEY['products'], products);
  console.log(`✓ products collection replaced (${products.length} rows)`);

  // 2. Refresh brand + category master lists (merge with existing).
  const existingBrands: string[] = (await getSingleton('brands')) || [];
  const existingCats: string[] = (await getSingleton('categories')) || [];
  const brands = uniq([...products.map((p) => p.brand), ...existingBrands]);
  const categories = uniq([...products.map((p) => p.category), ...existingCats]);
  await setSingleton('brands', brands);
  await setSingleton('categories', categories);
  console.log(`✓ master lists refreshed (${brands.length} brands, ${categories.length} categories)`);
}

run()
  .then(async () => {
    await closePool();
    console.log('\nImport complete. Amanot Electronics catalogue is live.');
    process.exit(0);
  })
  .catch(async (err) => {
    await closePool();
    console.error('Import failed:', err);
    process.exit(1);
  });
