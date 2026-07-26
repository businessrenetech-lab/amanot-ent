import { Account, AccountType, BusinessType, PaymentMode, SaleInvoice } from '../types';

type SalePayment = Pick<SaleInvoice, 'accountId' | 'paidAmount' | 'isDraft'>;

export const ALL_BUSINESSES: BusinessType[] = ['amanot_electronics', 'amanot_enterprise'];

export const BUSINESS_LABELS: Record<'all' | BusinessType, string> = {
  all: 'Shared / Combined',
  amanot_electronics: 'Amanot Electronics',
  amanot_enterprise: 'Amanot Enterprise'
};

/** True when the account can be used by the given business (its own, or a combined account). */
export function isAccountUsableBy(account: Account, business: 'all' | BusinessType): boolean {
  if (business === 'all') return true;
  return account.business === 'all' || account.business === business;
}

/**
 * Ranks accounts so a business always draws from its own mapped account first and
 * only falls back to a shared/combined account when it has none of its own.
 *   0 = the business's own default   1 = the business's own
 *   2 = shared default               3 = shared
 */
function scopeRank(account: Account, business: 'all' | BusinessType): number {
  const isDedicated = business === 'all' ? account.business === 'all' : account.business === business;
  return (isDedicated ? 0 : 2) + (account.isDefault ? 0 : 1);
}

function byScopeThenName(business: 'all' | BusinessType) {
  return (a: Account, b: Account) => {
    const diff = scopeRank(a, business) - scopeRank(b, business);
    return diff !== 0 ? diff : a.accountName.localeCompare(b.accountName);
  };
}

/**
 * Every active account a business may post money to or from, ordered so the
 * business's own accounts come before shared ones. Use this for account pickers
 * on expenses, supplier payments and any other outgoing money screen.
 */
export function getBusinessAccounts(
  accounts: Account[],
  business: 'all' | BusinessType,
  type?: AccountType
): Account[] {
  return accounts
    .filter(
      (account) =>
        account.status === 'active' &&
        isAccountUsableBy(account, business) &&
        (type ? account.type === type : true)
    )
    .sort(byScopeThenName(business));
}

/** The account a business should default to when money moves without an explicit pick. */
export function resolveBusinessAccount(
  accounts: Account[],
  business: 'all' | BusinessType,
  selectedAccountId?: string,
  type?: AccountType
): Account | undefined {
  const usable = getBusinessAccounts(accounts, business, type);
  return usable.find((account) => account.id === selectedAccountId) || usable[0];
}

export function getCompatiblePaymentAccounts(
  accounts: Account[],
  paymentMode: PaymentMode,
  business: 'all' | BusinessType
): Account[] {
  const available = accounts.filter(
    (account) => account.status === 'active' && isAccountUsableBy(account, business)
  );

  const matches = (() => {
    if (paymentMode === 'cash' || paymentMode === 'installment') {
      return available.filter((account) => account.type === 'cash');
    }
    if (paymentMode === 'card' || paymentMode === 'bank_transfer') {
      return available.filter((account) => account.type === 'bank');
    }
    if (paymentMode === 'bkash_nagad') {
      return available.filter((account) => account.type === 'mfs');
    }
    return available.filter(
      (account) => account.type === 'mfs' && account.mfsProvider === paymentMode
    );
  })();

  return matches.sort(byScopeThenName(business));
}

export function resolvePaymentAccount(
  accounts: Account[],
  paymentMode: PaymentMode,
  business: 'all' | BusinessType,
  selectedAccountId?: string
): Account | undefined {
  const compatible = getCompatiblePaymentAccounts(accounts, paymentMode, business);
  return compatible.find((account) => account.id === selectedAccountId) || compatible[0];
}

/**
 * Non-destructive backfill: gives every business its own cash drawer so counter
 * takings are never pooled across businesses. Existing accounts (and their
 * balances) are left untouched — new drawers start at zero.
 */
export function ensureBusinessCashAccounts(accounts: Account[]): Account[] {
  const missing = ALL_BUSINESSES.filter(
    (business) => !accounts.some((a) => a.type === 'cash' && a.business === business)
  );
  if (missing.length === 0) return accounts;

  const created: Account[] = missing.map((business) => ({
    id: `acc_cash_${business}`,
    accountName: `${BUSINESS_LABELS[business]} Counter Cash`,
    type: 'cash',
    business,
    openingBalance: 0,
    currentBalance: 0,
    isDefault: true,
    status: 'active',
    createdAt: new Date().toISOString().split('T')[0],
    notes: 'Dedicated POS cash drawer for this business'
  }));

  return [...accounts, ...created];
}

export function applySalePaymentToAccounts(
  accounts: Account[],
  previousSale?: SalePayment,
  nextSale?: SalePayment
): Account[] {
  return accounts.map((account) => {
    let balanceChange = 0;

    if (!previousSale?.isDraft && previousSale?.accountId === account.id) {
      balanceChange -= previousSale.paidAmount;
    }
    if (!nextSale?.isDraft && nextSale?.accountId === account.id) {
      balanceChange += nextSale.paidAmount;
    }

    return balanceChange === 0
      ? account
      : { ...account, currentBalance: account.currentBalance + balanceChange };
  });
}
