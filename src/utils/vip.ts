import { Customer } from '../types';

/** Lifetime purchase value that auto-promotes a customer into the VIP Club. */
export const VIP_THRESHOLD_RETAIL = 100_000; // 1 lac
export const VIP_THRESHOLD_WHOLESALE = 1_000_000; // 10 lac

/** Wholesale buyers get the higher VIP bar; everyone else uses the retail bar. */
export const isWholesaleCustomer = (
  c: Pick<Customer, 'customerType' | 'group'>,
  saleType?: 'retail' | 'wholesale'
): boolean =>
  c.customerType === 'wholesale' || c.group === 'Wholesale Buyers' || saleType === 'wholesale';

export const vipThresholdFor = (
  c: Pick<Customer, 'customerType' | 'group'>,
  saleType?: 'retail' | 'wholesale'
): number => (isWholesaleCustomer(c, saleType) ? VIP_THRESHOLD_WHOLESALE : VIP_THRESHOLD_RETAIL);

/**
 * Promote a customer into the VIP Club once their lifetime purchases cross the
 * threshold. Never demotes. Wholesale buyers keep their `customerType` so they
 * stay in the wholesale module while also appearing in the VIP list (which is
 * driven by `group === 'VIP Club'`).
 */
export const maybePromoteVip = (c: Customer, saleType?: 'retail' | 'wholesale'): Customer => {
  if (c.group === 'VIP Club') return c;
  if (c.totalPurchases < vipThresholdFor(c, saleType)) return c;
  return {
    ...c,
    group: 'VIP Club',
    customerType: c.customerType === 'wholesale' ? c.customerType : 'vip'
  };
};
