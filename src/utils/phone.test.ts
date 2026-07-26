import assert from 'node:assert/strict';
import test from 'node:test';
import { Customer } from '../types';
import {
  findCustomerByPhone,
  normalizePhone,
  phonesMatch,
  searchCustomersByPhone
} from './phone';

const customers: Customer[] = [
  { id: 'c1', name: 'Rahim Uddin', phone: '01711123456', address: 'Mirpur, Dhaka', customerType: 'regular', totalPurchases: 150000, currentDue: 5000, createdAt: '2026-01-01' },
  { id: 'c2', name: 'Karim Store', phone: '+8801819998877', address: 'Chattogram', customerType: 'wholesale', totalPurchases: 900000, currentDue: 0, createdAt: '2026-01-02' },
  { id: 'c3', name: 'Walk-in Customer', phone: '01700000000', address: 'Showroom Counter', customerType: 'walk_in', totalPurchases: 0, currentDue: 0, createdAt: '2026-01-03' }
];

test('normalizes every common way a BD number is typed', () => {
  assert.equal(normalizePhone('01711123456'), '01711123456');
  assert.equal(normalizePhone('+8801711123456'), '01711123456');
  assert.equal(normalizePhone('8801711123456'), '01711123456');
  assert.equal(normalizePhone('008801711123456'), '01711123456');
  assert.equal(normalizePhone('1711123456'), '01711123456');
  assert.equal(normalizePhone('017-1112 3456'), '01711123456');
  assert.equal(normalizePhone(''), '');
});

test('matches numbers across formats but not different subscribers', () => {
  assert.equal(phonesMatch('+8801711123456', '01711123456'), true);
  assert.equal(phonesMatch('01711123456', '01711123457'), false);
  assert.equal(phonesMatch('', ''), false);
});

test('fetches the CRM record once a full number is entered', () => {
  assert.equal(findCustomerByPhone(customers, '01711123456')?.id, 'c1');
  // stored with country code, typed locally
  assert.equal(findCustomerByPhone(customers, '01819998877')?.id, 'c2');
  // typed with country code, stored locally
  assert.equal(findCustomerByPhone(customers, '+8801711123456')?.id, 'c1');
});

test('does not fetch on partial numbers or the walk-in placeholder', () => {
  assert.equal(findCustomerByPhone(customers, '0171112'), undefined);
  assert.equal(findCustomerByPhone(customers, '01700000000'), undefined);
  assert.equal(findCustomerByPhone(customers, '01999000111'), undefined);
});

test('suggests customers from a partial number', () => {
  assert.deepEqual(searchCustomersByPhone(customers, '01711').map((c) => c.id), ['c1']);
  assert.deepEqual(searchCustomersByPhone(customers, '1819').map((c) => c.id), ['c2']);
  // too short to be useful, and the walk-in placeholder is never suggested
  assert.deepEqual(searchCustomersByPhone(customers, '01'), []);
  assert.deepEqual(searchCustomersByPhone(customers, '0170000').map((c) => c.id), []);
});
