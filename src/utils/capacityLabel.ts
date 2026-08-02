/**
 * Returns the capacity suffix to append to a product title, but ONLY when the
 * product name doesn't already carry the same size. TVs / fridges usually embed
 * the size in the name (e.g. `KONKA 43" LED TV`, `KONKA 200 LITRE Refrigerator`)
 * so appending the capacity again duplicates it. ACs typically don't spell out
 * their BTU rating in the name, so the capacity is still shown there.
 */
export const capacitySuffix = (productName: string, capacity?: string): string => {
  if (!capacity || !capacity.trim()) return '';

  const nameCompact = productName.toLowerCase().replace(/\s+/g, '');
  const capCompact = capacity.toLowerCase().replace(/\s+/g, '');

  // Whole capacity string already present in the name.
  if (nameCompact.includes(capCompact)) return '';

  // The capacity's leading number (e.g. "43", "200", "1.5") already present.
  const num = (capacity.match(/[\d.]+/) || [])[0];
  if (num && nameCompact.includes(num)) return '';

  return capacity;
};
