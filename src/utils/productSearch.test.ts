import assert from 'node:assert/strict';
import test from 'node:test';
import { Product } from '../types';
import { normalizeSearchText, searchProducts, tokenizeQuery } from './productSearch';

const base = {
  business: 'amanot_electronics' as const,
  costPrice: 50000,
  retailPrice: 60000,
  wholesalePrice: 58000,
  stockQty: 10,
  minStockAlert: 3,
  unit: 'Set',
  warranty: '10 Years Compressor, 1 Year Spare Parts'
};

const catalogue: Product[] = [
  { ...base, id: 'p1', sku: 'GS-12XZNA3V', model: 'GS-12XZNA3V', name: 'GREE 1.0 TON Zeno Split Inverter AC (GS-12XZNA3V)', brand: 'Gree', category: 'Air Conditioner', typeSeries: 'Zeno', acType: 'Split Inverter', capacity: '12000 BTU', size: '1.0 Ton' },
  { ...base, id: 'p2', sku: 'GS-18XZNA3V', model: 'GS-18XZNA3V', name: 'GREE 1.5 TON Zeno Split Inverter AC (GS-18XZNA3V)', brand: 'Gree', category: 'Air Conditioner', typeSeries: 'Zeno', acType: 'Split Inverter', capacity: '18000 BTU', size: '1.5 Ton' },
  { ...base, id: 'p3', sku: 'GS-24XZNA3V', model: 'GS-24XZNA3V', name: 'GREE 2.0 TON Zeno Split Inverter AC (GS-24XZNA3V)', brand: 'Gree', category: 'Air Conditioner', typeSeries: 'Zeno', acType: 'Split Inverter', capacity: '24000 BTU', size: '2.0 Ton' },
  { ...base, id: 'p4', sku: 'GS-24XSMA1', model: 'GS-24XSMA1', name: 'GREE 2.0 TON Shimo Split AC (GS-24XSMA1)', brand: 'Gree', category: 'Air Conditioner', typeSeries: 'Shimo', acType: 'Split', capacity: '24000 BTU', size: '2.0 Ton' },
  // Accessory rated for a 1-2 ton range, with a junk model field — must not outrank real 2 ton units
  { ...base, id: 'p5', sku: 'Timer 2:1', model: 'Timer 2:1', name: 'GREE 1 TON AC Control Panel (Timer 2:1)', brand: 'Gree', category: 'AC Control Panel', capacity: '1 Ton-2 Ton', size: '1 Ton', description: 'AC Auto Control Panel (ACP) Box' },
  { ...base, id: 'p6', sku: 'KRT-135GB', model: 'KRT-135GB', name: 'KONKA 135 LITRE Refrigerator (KRT-135GB)', brand: 'Konka', category: 'Refrigerator', capacity: '135 Litre', size: '135 Litre' },
  { ...base, id: 'p7', sku: 'KDG43XR683ANT', model: 'KDG43XR683ANT', name: 'KONKA 43" LED TV (KDG43XR683ANT)', brand: 'Konka', category: 'LED TV', size: '43"' },
  { ...base, id: 'p8', sku: 'GF-24XTS410', model: 'GF-24XTS410', name: 'GREE 2.0 TON Floor Standing AC (GF-24XTS410)', brand: 'Gree', category: 'Air Conditioner', acType: 'Floor Standing', capacity: '24000 BTU', size: '2.0 Ton' }
];

const ids = (query: string) => searchProducts(catalogue, query).map((r) => r.product.id);

test('normalization makes sizes and codes match however they are typed', () => {
  assert.equal(normalizeSearchText('2.0 Ton'), '2 ton');
  assert.equal(normalizeSearchText('2ton'), '2 ton');
  assert.equal(normalizeSearchText('24000BTU'), '24000 btu');
  assert.equal(normalizeSearchText('GS-24XZNA3V'), 'gs 24 xzna 3 v');
  assert.equal(normalizeSearchText('1.5 Ton'), '1.5 ton');
});

test('tokenizes a multi-word query', () => {
  assert.deepEqual(tokenizeQuery('gree 2 ton ac'), ['gree', '2', 'ton', 'ac']);
});

test('"gree 2 ton ac" finds the 2 ton units and puts them first', () => {
  const result = ids('gree 2 ton ac');
  assert.ok(result.length > 0, 'query returned nothing');
  // every top result is a genuine 2.0 Ton air conditioner
  assert.ok(['p3', 'p4', 'p8'].includes(result[0]), `unexpected top hit: ${result[0]}`);
  // the 1.0/1.5 ton units are excluded outright
  assert.ok(!result.includes('p1'));
  assert.ok(!result.includes('p2'));
});

test('a 1-2 ton accessory never outranks a real 2 ton unit', () => {
  const result = ids('gree 2 ton ac');
  const panelRank = result.indexOf('p5');
  const realRank = result.indexOf('p3');
  assert.ok(realRank >= 0, 'real 2 ton unit missing');
  if (panelRank >= 0) assert.ok(realRank < panelRank, 'control panel outranked the real AC');
});

test('a bare number never matches a code that merely contains it', () => {
  // "2" must not pull in GS-12XZNA3V just because its SKU contains a 2
  assert.ok(!ids('2 ton').includes('p1'));
});

test('exact SKU or model search returns that one product on top', () => {
  assert.equal(ids('GS-24XZNA3V')[0], 'p3');
  assert.equal(ids('gs-24xzna3v')[0], 'p3');
  assert.equal(ids('gs 24xzna3v')[0], 'p3');
});

test('partial code search still works', () => {
  assert.deepEqual(ids('24xzna'), ['p3']);
  assert.ok(ids('xsma').includes('p4'));
});

test('capacity search works', () => {
  const result = ids('24000 btu');
  assert.ok(result.includes('p3') && result.includes('p4') && result.includes('p8'));
  assert.ok(!result.includes('p1'));
});

test('short forms staff actually type resolve to the right category', () => {
  assert.deepEqual(ids('konka fridge'), ['p6']);
  assert.deepEqual(ids('konka tv'), ['p7']);
});

test('word order does not matter', () => {
  assert.deepEqual(ids('gree 2 ton').sort(), ids('2 ton gree').sort());
});

test('series and type searches narrow correctly', () => {
  assert.deepEqual(ids('zeno').sort(), ['p1', 'p2', 'p3']);
  assert.deepEqual(ids('floor standing'), ['p8']);
});

test('a query with no real match returns nothing rather than noise', () => {
  assert.deepEqual(ids('2.5 ton floor standing'), []);
  assert.deepEqual(ids('samsung'), []);
});

test('an empty query returns the full list untouched', () => {
  assert.equal(searchProducts(catalogue, '').length, catalogue.length);
  assert.equal(searchProducts(catalogue, '   ').length, catalogue.length);
});

test('in-stock items edge out identical out-of-stock ones', () => {
  const withOos: Product[] = [
    { ...catalogue[2], id: 'oos', stockQty: 0 },
    { ...catalogue[2], id: 'in', stockQty: 4 }
  ];
  assert.equal(searchProducts(withOos, 'gree 2 ton')[0].product.id, 'in');
});
