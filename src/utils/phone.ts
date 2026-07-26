import { Customer } from '../types';

/**
 * Normalizes a Bangladeshi mobile number to the local 11-digit form (01XXXXXXXXX)
 * so numbers typed as +8801711…, 8801711…, 01711-123456 or 1711123456 all match
 * the same CRM record.
 */
export const normalizePhone = (raw: string): string => {
  let digits = (raw || '').replace(/\D/g, '');

  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('880')) digits = digits.slice(3);
  else if (digits.length === 11 && digits.startsWith('0')) return digits;

  // At this point the leading 0 (if any) may still be present after the country code
  if (digits.startsWith('0')) digits = digits.slice(1);

  return digits ? `0${digits}` : '';
};

/** True when both numbers refer to the same subscriber. */
export const phonesMatch = (a: string, b: string): boolean => {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  return na.length > 0 && na === nb;
};

/** Placeholder number used for anonymous walk-in sales — never treated as a real customer. */
export const WALK_IN_PHONE = '01700000000';

export const isWalkInPhone = (raw: string): boolean => phonesMatch(raw, WALK_IN_PHONE);

/** Exact (normalized) CRM lookup — used to auto-fill the POS customer form. */
export const findCustomerByPhone = (
  customers: Customer[],
  raw: string
): Customer | undefined => {
  const normalized = normalizePhone(raw);
  if (normalized.length < 11 || isWalkInPhone(normalized)) return undefined;
  return customers.find((c) => normalizePhone(c.phone) === normalized);
};

/** Partial (normalized) CRM lookup — used to suggest customers while the number is being typed. */
export const searchCustomersByPhone = (
  customers: Customer[],
  raw: string,
  limit = 5
): Customer[] => {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length < 3) return [];

  const normalized = normalizePhone(raw);
  const needle = normalized.length > 1 ? normalized.slice(1) : digits;

  return customers
    .filter((c) => {
      const candidate = normalizePhone(c.phone);
      return candidate.length > 0 && !isWalkInPhone(candidate) && candidate.includes(needle);
    })
    .slice(0, limit);
};
