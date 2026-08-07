import { PaymentMode, PaymentSplit } from '../types';

/** Human-friendly label for a payment method. */
export const paymentModeLabel = (mode?: PaymentMode): string => {
  switch (mode) {
    case 'cash':
      return 'Cash';
    case 'bkash':
      return 'bKash';
    case 'nagad':
      return 'Nagad';
    case 'rocket':
      return 'Rocket';
    case 'bkash_nagad':
      return 'Mobile Wallet';
    case 'card':
      return 'Card';
    case 'bank_transfer':
      return 'Bank Transfer';
    case 'installment':
      return 'Installment';
    default:
      return mode ? String(mode).replace('_', ' ') : '—';
  }
};

/** "Cash ৳5,000 + bKash ৳3,000" style breakdown for a split tender. */
export const splitBreakdownText = (splits?: PaymentSplit[]): string =>
  (splits || [])
    .map((s) => `${paymentModeLabel(s.paymentMode)} ৳${s.amount.toLocaleString()}`)
    .join(' + ');

/** Short methods-only label, e.g. "Split: Cash + bKash". */
export const splitMethodsText = (splits?: PaymentSplit[]): string =>
  `Split: ${(splits || []).map((s) => paymentModeLabel(s.paymentMode)).join(' + ')}`;
