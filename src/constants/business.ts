export const AMANOT_ELECTRONICS_ADDRESS =
  'Opposite Z U Model Hospital, S. S. K Road, Feni, Bangladesh.';

export const AMANOT_PHONE = '01711-360121, 01712-727548';

// Amanat Enterprise (Haier Exclusive Showroom) — fixed contact details. These
// always win over whatever is saved in Settings so every document prints them.
export const AMANAT_ENTERPRISE_ADDRESS = 'Godown Quarter, Rail Gate, Feni.';
export const AMANAT_ENTERPRISE_PHONE = '01740639192, 01841950117';

export const withFixedEnterpriseContact = <T extends object>(settings: T): T => ({
  ...settings,
  amanotEnterpriseAddress: AMANAT_ENTERPRISE_ADDRESS,
  amanotEnterprisePhone: AMANAT_ENTERPRISE_PHONE
});

// Demo numbers the app was first seeded with; a saved setting still holding one
// of these was never really configured, so documents fall back to AMANOT_PHONE.
const SEEDED_PLACEHOLDER_PHONES = [
  '+880 1711-001122, +880 1819-223344',
  '+880 1911-556677, +880 1612-889900'
];

export const resolveBusinessPhone = (saved?: string): string => {
  const value = (saved || '').trim();
  return !value || SEEDED_PLACEHOLDER_PHONES.includes(value) ? AMANOT_PHONE : value;
};
