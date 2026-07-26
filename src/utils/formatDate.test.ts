import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDate, formatDateTime } from './formatDate';

test('renders stored ISO dates as Day/Month/Year', () => {
  assert.equal(formatDate('2026-07-26'), '26/07/2026');
  assert.equal(formatDate('2026-01-05'), '05/01/2026');
  assert.equal(formatDate('2026-12-31'), '31/12/2026');
});

test('handles stored values that carry a time part', () => {
  assert.equal(formatDate('2026-07-15 17:30'), '15/07/2026');
  assert.equal(formatDateTime('2026-07-15 17:30'), '15/07/2026 17:30');
  assert.equal(formatDateTime('2026-07-15'), '15/07/2026');
});

test('never reorders an already formatted Day/Month/Year value', () => {
  assert.equal(formatDate('26/07/2026'), '26/07/2026');
});

test('accepts Date objects', () => {
  assert.equal(formatDate(new Date(2026, 6, 26)), '26/07/2026');
});

test('empty and invalid input degrade quietly', () => {
  assert.equal(formatDate(''), '');
  assert.equal(formatDate(undefined), '');
  assert.equal(formatDate(null), '');
  assert.equal(formatDate('not a date'), 'not a date');
});
