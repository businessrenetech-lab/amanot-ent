import assert from 'node:assert/strict';
import test from 'node:test';
import { Account, InstallmentPlan } from '../types';
import { resolvePaymentAccount } from './paymentAccounts';

/**
 * Guards the installment/due collection wiring: every collection must resolve to a
 * business-scoped account, and every collection that moved money must be reportable.
 */

const accounts: Account[] = [
  { id: 'cash_elec', accountName: 'Electronics Counter Cash', type: 'cash', business: 'amanot_electronics', openingBalance: 0, currentBalance: 1000, isDefault: true, status: 'active', createdAt: '2026-01-01' },
  { id: 'cash_ent', accountName: 'Enterprise Counter Cash', type: 'cash', business: 'amanot_enterprise', openingBalance: 0, currentBalance: 500, isDefault: true, status: 'active', createdAt: '2026-01-01' },
  { id: 'bank_shared', accountName: 'Combined Operations Bank', type: 'bank', business: 'all', openingBalance: 0, currentBalance: 9000, isDefault: true, status: 'active', createdAt: '2026-01-01' },
  { id: 'mfs_shared', accountName: 'bKash Merchant', type: 'mfs', mfsProvider: 'bkash', business: 'all', openingBalance: 0, currentBalance: 300, isDefault: true, status: 'active', createdAt: '2026-01-01' }
];

test('an EMI collection routes to the plan business own cash drawer', () => {
  assert.equal(resolvePaymentAccount(accounts, 'cash', 'amanot_enterprise')?.id, 'cash_ent');
  assert.equal(resolvePaymentAccount(accounts, 'cash', 'amanot_electronics')?.id, 'cash_elec');
});

test('a bank/mfs EMI collection falls back to the shared combined account', () => {
  assert.equal(resolvePaymentAccount(accounts, 'bank_transfer', 'amanot_enterprise')?.id, 'bank_shared');
  assert.equal(resolvePaymentAccount(accounts, 'bkash_nagad', 'amanot_electronics')?.id, 'mfs_shared');
});

test('a collection can never be banked into the other business drawer', () => {
  assert.equal(resolvePaymentAccount(accounts, 'cash', 'amanot_enterprise', 'cash_elec')?.id, 'cash_ent');
});

test('collection with no compatible account resolves to undefined so the caller can block it', () => {
  const cashOnly = accounts.filter((a) => a.type === 'cash');
  assert.equal(resolvePaymentAccount(cashOnly, 'card', 'amanot_electronics'), undefined);
});

// ---- Report inclusion: mirrors the filter in GlobalReportsView ----

const collectedRows = (schedule: InstallmentPlan['schedule']) =>
  schedule.filter(
    (s) => (s.status === 'paid' || s.status === 'partial') && s.paidDate && (s.paidAmount || s.amount) > 0
  );

test('partial collections are reported, not silently dropped', () => {
  const schedule: InstallmentPlan['schedule'] = [
    { installmentNo: 1, dueDate: '2026-02-01', amount: 5000, status: 'paid', paidAmount: 5000, paidDate: '2026-02-01', accountId: 'cash_elec', accountName: 'Electronics Counter Cash' },
    { installmentNo: 2, dueDate: '2026-03-01', amount: 2000, status: 'partial', paidAmount: 3000, paidDate: '2026-03-01', accountId: 'cash_elec', accountName: 'Electronics Counter Cash' },
    { installmentNo: 3, dueDate: '2026-04-01', amount: 5000, status: 'due' }
  ];

  const reported = collectedRows(schedule);
  assert.deepEqual(reported.map((s) => s.installmentNo), [1, 2]);
  assert.equal(reported.reduce((sum, s) => sum + (s.paidAmount || s.amount), 0), 8000);
});

test('unpaid and zero-value rows stay out of the collection report', () => {
  const schedule: InstallmentPlan['schedule'] = [
    { installmentNo: 1, dueDate: '2026-02-01', amount: 5000, status: 'due' },
    { installmentNo: 2, dueDate: '2026-03-01', amount: 5000, status: 'overdue' },
    { installmentNo: 3, dueDate: '2026-04-01', amount: 0, status: 'partial', paidAmount: 0, paidDate: '2026-04-01' }
  ];
  assert.deepEqual(collectedRows(schedule), []);
});

test('every reported collection carries the account it was banked into', () => {
  const schedule: InstallmentPlan['schedule'] = [
    { installmentNo: 1, dueDate: '2026-02-01', amount: 5000, status: 'paid', paidAmount: 5000, paidDate: '2026-02-01', accountId: 'bank_shared', accountName: 'Combined Operations Bank' }
  ];
  collectedRows(schedule).forEach((s) => {
    assert.ok(s.accountId, 'collection is missing accountId');
    assert.ok(s.accountName, 'collection is missing accountName');
  });
});
