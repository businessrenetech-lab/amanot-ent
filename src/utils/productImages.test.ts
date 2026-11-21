import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import type { Product } from '../types';
import productImages from '../data/productImages.json';
import { fillProductImages, bundledImageFor, needsImageFill, markImagesFilled } from './productImages';

const base = { sku: 'X', name: 'n', business: 'amanot_enterprise', brand: 'Haier', category: 'LED TV' } as unknown as Product;

test('every bundled image path points at a file in public/', () => {
  for (const path of Object.values(productImages.byId)) assert.ok(existsSync(`public${path}`), path);
});

test('fills a missing photo by id or by model, never overwrites an existing one', () => {
  const byId = { ...base, id: 'prod_haier_h55m80gux' } as Product;
  const byModel = { ...base, id: 'some_db_id', model: 'H55M80GUX' } as Product;
  const own = { ...base, id: 'prod_haier_h55m80gux', image: 'https://example.com/mine.jpg' } as Product;
  const { products, filled } = fillProductImages([byId, byModel, own]);
  assert.equal(filled, 2);
  assert.equal(products[0].image, bundledImageFor(byId));
  assert.equal(products[1].image, bundledImageFor(byId));
  assert.equal(products[2].image, 'https://example.com/mine.jpg');
});

test('image fill runs once per tag', () => {
  assert.equal(needsImageFill({}), true);
  assert.equal(needsImageFill(markImagesFilled({})), false);
});
