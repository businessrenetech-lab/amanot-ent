import assert from 'node:assert/strict';
import test from 'node:test';
import { Account } from '../types';
import {
  applySalePaymentToAccounts,
  ensureBusinessCashAccounts,
  getBusinessAccounts,
  getCompatiblePaymentAccounts,
  resolveBusinessAccount,
  resolvePaymentAccount
} from './paymentAccounts';

const accounts: Account[] = [
  { id: 'cash', accountName: 'Main Counter Cash', type: 'cash', business: 'all', openingBalance: 0, currentBalance: 100, isDefault: true, status: 'active', createdAt: '2026-01-01' },
  { id: 'bank', accountName: 'Main Bank', type: 'bank', business: 'all', openingBalance: 0, currentBalance: 200, isDefault: true, status: 'active', createdAt: '2026-01-01' },
  { id: 'bkash', accountName: 'bKash Merchant', type: 'mfs', mfsProvider: 'bkash', business: 'all', openingBalance: 0, currentBalance: 300, isDefault: true, status: 'active', createdAt: '2026-01-01' },
  { id: 'nagad', accountName: 'Nagad Merchant', type: 'mfs', mfsProvider: 'nagad', business: 'all', openingBalance: 0, currentBalance: 400, isDefault: true, status: 'active', createdAt: '2026-01-01' },
  { id: 'rocket', accountName: 'Rocket Merchant', type: 'mfs', mfsProvider: 'rocket', business: 'all', openingBalance: 0, currentBalance: 500, isDefault: true, status: 'active', createdAt: '2026-01-01' }
];

test('maps each POS payment method to its compatible account', () => {
  assert.equal(resolvePaymentAccount(accounts, 'cash', 'amanot_electronics')?.id, 'cash');
  assert.equal(resolvePaymentAccount(accounts, 'card', 'amanot_electronics')?.id, 'bank');
  assert.equal(resolvePaymentAccount(accounts, 'bank_transfer', 'amanot_electronics')?.id, 'bank');
  assert.equal(resolvePaymentAccount(accounts, 'bkash', 'amanot_electronics')?.id, 'bkash');
  assert.equal(resolvePaymentAccount(accounts, 'nagad', 'amanot_electronics')?.id, 'nagad');
  assert.equal(resolvePaymentAccount(accounts, 'rocket', 'amanot_electronics')?.id, 'rocket');
  assert.deepEqual(getCompatiblePaymentAccounts(accounts, 'nagad', 'amanot_electronics').map((a) => a.id), ['nagad']);
});

test('credits a completed cash sale to Main Counter Cash', () => {
  const updated = applySalePaymentToAccounts(accounts, undefined, {
    accountId: 'cash',
    paidAmount: 75,
    isDraft: false
  });
  assert.equal(updated.find((account) => account.id === 'cash')?.currentBalance, 175);
});

test('reassigns an edited payment without double counting', () => {
  const updated = applySalePaymentToAccounts(
    accounts,
    { accountId: 'cash', paidAmount: 50, isDraft: false },
    { accountId: 'bkash', paidAmount: 60, isDraft: false }
  );
  assert.equal(updated.find((account) => account.id === 'cash')?.currentBalance, 50);
  assert.equal(updated.find((account) => account.id === 'bkash')?.currentBalance, 360);
});

test('reverses the credited amount when a posted sale is deleted', () => {
  const updated = applySalePaymentToAccounts(
    accounts,
    { accountId: 'cash', paidAmount: 25, isDraft: false },
    undefined
  );
  assert.equal(updated.find((account) => account.id === 'cash')?.currentBalance, 75);
});

// ---- Business-scoped account routing ----

const multiBusiness: Account[] = [
  { id: 'cash_shared', accountName: 'Legacy Shared Cash', type: 'cash', business: 'all', openingBalance: 0, currentBalance: 1000, isDefault: true, status: 'active', createdAt: '2026-01-01' },
  { id: 'cash_elec', accountName: 'Electronics Counter Cash', type: 'cash', business: 'amanot_electronics', openingBalance: 0, currentBalance: 200, isDefault: true, status: 'active', createdAt: '2026-01-01' },
  { id: 'cash_ent', accountName: 'Enterprise Counter Cash', type: 'cash', business: 'amanot_enterprise', openingBalance: 0, currentBalance: 300, isDefault: true, status: 'active', createdAt: '2026-01-01' },
  { id: 'bank_shared', accountName: 'Combined Operations Bank', type: 'bank', business: 'all', openingBalance: 0, currentBalance: 900, isDefault: true, status: 'active', createdAt: '2026-01-01' },
  { id: 'bank_elec_closed', accountName: 'Old Electronics Bank', type: 'bank', business: 'amanot_electronics', openingBalance: 0, currentBalance: 5, isDefault: false, status: 'inactive', createdAt: '2026-01-01' }
];

test('each business takes cash from its own drawer, never the other one', () => {
  assert.equal(resolvePaymentAccount(multiBusiness, 'cash', 'amanot_electronics')?.id, 'cash_elec');
  assert.equal(resolvePaymentAccount(multiBusiness, 'cash', 'amanot_enterprise')?.id, 'cash_ent');
});

test('a business never sees the other business\'s accounts', () => {
  const forElectronics = getBusinessAccounts(multiBusiness, 'amanot_electronics').map((a) => a.id);
  assert.ok(!forElectronics.includes('cash_ent'));
  const forEnterprise = getBusinessAccounts(multiBusiness, 'amanot_enterprise').map((a) => a.id);
  assert.ok(!forEnterprise.includes('cash_elec'));
});

test('a mapped account outranks a shared one, and shared is still listed as fallback', () => {
  const options = getCompatiblePaymentAccounts(multiBusiness, 'cash', 'amanot_electronics').map((a) => a.id);
  assert.deepEqual(options, ['cash_elec', 'cash_shared']);
});

test('falls back to the combined bank account when the business has none of its own', () => {
  assert.equal(resolvePaymentAccount(multiBusiness, 'bank_transfer', 'amanot_electronics')?.id, 'bank_shared');
  assert.equal(resolvePaymentAccount(multiBusiness, 'card', 'amanot_enterprise')?.id, 'bank_shared');
});

test('an explicit pick is honoured only when that account is usable by the business', () => {
  assert.equal(resolvePaymentAccount(multiBusiness, 'cash', 'amanot_electronics', 'cash_shared')?.id, 'cash_shared');
  // picking the other business's drawer is rejected and routed back to its own
  assert.equal(resolvePaymentAccount(multiBusiness, 'cash', 'amanot_electronics', 'cash_ent')?.id, 'cash_elec');
});

test('inactive accounts are never selectable', () => {
  assert.ok(!getBusinessAccounts(multiBusiness, 'amanot_electronics').some((a) => a.id === 'bank_elec_closed'));
});

test('resolveBusinessAccount can be pinned to a type for outgoing payments', () => {
  assert.equal(resolveBusinessAccount(multiBusiness, 'amanot_enterprise', undefined, 'bank')?.id, 'bank_shared');
  assert.equal(resolveBusinessAccount(multiBusiness, 'amanot_enterprise', undefined, 'cash')?.id, 'cash_ent');
});

test('backfills a cash drawer for any business missing one, without touching balances', () => {
  const legacy: Account[] = [multiBusiness[0]];
  const backfilled = ensureBusinessCashAccounts(legacy);

  assert.equal(backfilled.length, 3);
  assert.equal(backfilled.find((a) => a.id === 'cash_shared')?.currentBalance, 1000);
  assert.equal(resolvePaymentAccount(backfilled, 'cash', 'amanot_electronics')?.business, 'amanot_electronics');
  assert.equal(resolvePaymentAccount(backfilled, 'cash', 'amanot_enterprise')?.business, 'amanot_enterprise');
  backfilled
    .filter((a) => a.id !== 'cash_shared')
    .forEach((a) => assert.equal(a.currentBalance, 0));
});

test('backfill is idempotent', () => {
  assert.equal(ensureBusinessCashAccounts(multiBusiness), multiBusiness);
});
