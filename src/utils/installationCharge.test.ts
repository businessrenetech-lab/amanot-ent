import assert from 'node:assert/strict';
import test from 'node:test';
import { Product } from '../types';

/**
 * Mirrors the POS rule: an installation charge applies only when the product
 * actually carries one. Refrigerators, TVs and similar goods must add nothing.
 */
const getInstallationCharge = (product: Product): number =>
  product.installationCharge && product.installationCharge > 0 ? product.installationCharge : 0;

const isInstallable = (product: Product): boolean => getInstallationCharge(product) > 0;

const base: Omit<Product, 'id' | 'name' | 'category'> = {
  sku: 'SKU',
  business: 'amanot_electronics',
  brand: 'Generic',
  costPrice: 1000,
  retailPrice: 2000,
  wholesalePrice: 1800,
  stockQty: 5,
  minStockAlert: 1,
  unit: 'Pcs',
  warranty: '1 Year Warranty'
};

const ac: Product = { ...base, id: 'p_ac', name: 'Gree 1.5 Ton Inverter AC', category: 'Inverter AC', installationCharge: 3500, extraPipingFeePerFt: 550 };
const fridge: Product = { ...base, id: 'p_ref', name: 'Haier 358L Refrigerator', category: 'Refrigerator' };
const tv: Product = { ...base, id: 'p_tv', name: 'Smart LED TV', category: 'Smart LED TV', installationCharge: 0 };

test('a product with a configured charge is installable', () => {
  assert.equal(isInstallable(ac), true);
  assert.equal(getInstallationCharge(ac), 3500);
});

test('a refrigerator with no configured charge adds nothing', () => {
  assert.equal(isInstallable(fridge), false);
  assert.equal(getInstallationCharge(fridge), 0);
});

test('an explicit zero charge is treated as no installation, not a default', () => {
  assert.equal(isInstallable(tv), false);
  assert.equal(getInstallationCharge(tv), 0);
});

test('no hidden fallback fee is ever substituted', () => {
  // The old behaviour substituted 3000 whenever the field was unset
  [fridge, tv].forEach((p) => assert.notEqual(getInstallationCharge(p), 3000));
});

test('cart defaults: pre-checked only for installable products', () => {
  const cartDefault = (p: Product) => ({
    includeInstallationFee: getInstallationCharge(p) > 0,
    installationFee: getInstallationCharge(p)
  });

  assert.deepEqual(cartDefault(ac), { includeInstallationFee: true, installationFee: 3500 });
  assert.deepEqual(cartDefault(fridge), { includeInstallationFee: false, installationFee: 0 });
});

test('a mixed cart only charges installation on the installable line', () => {
  const cart = [ac, fridge, tv];
  const installationTotal = cart.reduce((sum, p) => sum + getInstallationCharge(p), 0);
  assert.equal(installationTotal, 3500);
});
