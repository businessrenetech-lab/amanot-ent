// ============================================================================
// One-off generator: maps the Amanot Electronics price-list JSON (from the PDF)
// into the app's Product shape and writes src/data/electronicsProducts.json.
//
//   node scripts/generate-electronics.mjs
//
// Pricing rules (from the request):
//   retailPrice    = MRP
//   costPrice      = MRP - 10%   (round)
//   wholesalePrice = MRP - 2%    (round)
// Supplier: Electro Mart. All under business = amanot_electronics.
// ============================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = 'C:/Users/ADMIN/Downloads/amanot_electronics_products.json';
const OUT = resolve(__dirname, '..', 'src', 'data', 'electronicsProducts.json');

const raw = JSON.parse(readFileSync(SRC, 'utf8'));

const titleCase = (s) =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const brandFromCategory = (cat) => {
  const first = cat.split(/[\/\s]/)[0].toUpperCase();
  if (first === 'GREE') return 'Gree';
  if (first === 'HAIKO') return 'Haiko';
  if (first === 'KONKA') return 'Konka';
  return titleCase(first);
};

const isAC = (cat) => /AIR CONDITIONER/.test(cat);

const cleanCategory = (c) => {
  if (/AIR CONDITIONER/.test(c)) return 'Air Conditioner';
  if (/LED TV/.test(c)) return 'LED TV';
  if (/REFRIGERATOR|FREEZER/.test(c)) return 'Refrigerator';
  if (/WASHING MACHINE/.test(c)) return 'Washing Machine';
  if (/MICRO-?WAVE|OVEN/.test(c)) return 'Microwave Oven';
  if (/CEILING FAN|CIRCULATOR FAN/.test(c)) return 'Fan';
  if (/AIR COOLER/.test(c)) return 'Air Cooler';
  if (/DEHUMIDIFIER/.test(c)) return 'Dehumidifier';
  if (/WATER DISPENSER/.test(c)) return 'Water Dispenser';
  if (/AIR PURIFIER/.test(c)) return 'Air Purifier';
  if (/AIR CURTAIN/.test(c)) return 'Air Curtain';
  if (/ELECTRIC IRON/.test(c)) return 'Electric Iron';
  if (/RICE COOKER/.test(c)) return 'Rice Cooker';
  if (/AIR FRYER/.test(c)) return 'Air Fryer';
  if (/INDUCTION|IN[RF]RARED/.test(c)) return 'Induction Cooker';
  if (/BLENDER|MIXER/.test(c)) return 'Blender';
  if (/PRESSURE COOKER/.test(c)) return 'Pressure Cooker';
  if (/ELECTRIC KETTLE/.test(c)) return 'Electric Kettle';
  if (/GAS STOVE/.test(c)) return 'Gas Stove';
  if (/KITCHEN HOOD/.test(c)) return 'Kitchen Hood';
  if (/GEYSER/.test(c)) return 'Geyser';
  if (/KITCHEN HOB/.test(c)) return 'Kitchen Hob';
  if (/CONTROL PANEL|ACP/.test(c)) return 'AC Control Panel';
  return titleCase(c);
};

// Series names that appear as the FIRST word of an AC "features" string.
const GENERIC_AC_WORDS = new Set([
  'split', 'inverter', 'wall', 'mounted', 'type', 'portable', 'ducted', 'fixed',
  'speed', 'non', 'wifi', 'cool', 'heat', 'pump', 'floor', 'standing', 'cassette',
  'pro', 'version', 'wall-mounted'
]);

const acSeries = (features) => {
  if (!features) return null;
  const first = features.replace(/[-,]/g, ' ').trim().split(/\s+/)[0];
  if (!first) return null;
  return GENERIC_AC_WORDS.has(first.toLowerCase()) ? null : first;
};

const acTypeOf = (features) => {
  const f = (features || '').toLowerCase();
  if (f.includes('inverter')) return 'Split Inverter';
  if (f.includes('ducted')) return 'Ducted Split';
  if (f.includes('portable')) return 'Portable';
  if (f.includes('cassette')) return 'Cassette';
  if (f.includes('floor')) return 'Floor Standing';
  if (f.includes('split')) return 'Split';
  return 'Split';
};

const extractSize = (spec) => {
  if (!spec) return null;
  let m;
  if ((m = spec.match(/(\d+(?:\.\d+)?)\s*TON/i))) return `${m[1]} Ton`;
  if ((m = spec.match(/(\d+(?:\.\d+)?)\s*(?:INCH|")/i))) return `${m[1]}"`;
  if ((m = spec.match(/(\d+(?:\.\d+)?)\s*(?:LTR|LITER|LITRE|L)\b/i))) return `${m[1]} Litre`;
  if ((m = spec.match(/(\d+(?:\.\d+)?)\s*KG/i))) return `${m[1]} KG`;
  if ((m = spec.match(/(\d+(?:\.\d+)?)\s*W\b/i))) return `${m[1]}W`;
  return spec.trim();
};

const extractCapacity = (spec, ac) => {
  if (!spec) return null;
  if (ac) {
    const m = spec.match(/(\d+)\s*BTU/i);
    return m ? `${m[1]} BTU` : spec.trim();
  }
  return spec.trim();
};

const warrantyOf = (cleanCat) => {
  if (cleanCat === 'Air Conditioner') return '10 Years Compressor, 1 Year Spare Parts';
  if (cleanCat === 'LED TV') return '3 Years Panel, 1 Year Parts';
  if (cleanCat === 'Refrigerator') return '12 Years Compressor, 1 Year Parts';
  if (cleanCat === 'Washing Machine') return '10 Years Motor, 1 Year Parts';
  return '1 Year Official Warranty';
};

const buildName = ({ brandUpper, size, ac, series, acType, cleanCat, model }) => {
  if (ac) {
    const parts = [brandUpper];
    if (size) parts.push(size.toUpperCase());
    if (series) parts.push(series);
    if (acType) parts.push(acType);
    let base = parts.join(' ');
    if (!/\bAC$/i.test(base)) base += ' AC';
    return `${base} (${model})`;
  }
  const parts = [brandUpper];
  if (size) parts.push(size.toUpperCase());
  parts.push(cleanCat);
  return `${parts.join(' ')} (${model})`;
};

const round = (n) => Math.round(n);
const seen = new Set();
const out = [];

for (const p of raw.products) {
  const retail = p.mrp_bdt ?? p.single_phase_220_230v_bdt ?? p.three_phase_380_415v_bdt ?? 0;
  if (!retail) continue; // skip rows with no usable price (e.g. blank ACP variants)

  const ac = isAC(p.category);
  const brand = brandFromCategory(p.category);
  const cleanCat = cleanCategory(p.category);
  const model = (p.product_model || '').trim();

  // de-dup exact repeats
  const dedupKey = `${model}|${p.features}|${p.specification}|${retail}`;
  if (seen.has(dedupKey)) continue;
  seen.add(dedupKey);

  const series = ac ? acSeries(p.features) : null;
  const acType = ac ? acTypeOf(p.features) : null;
  const size = extractSize(p.specification);
  const capacity = extractCapacity(p.specification, ac);

  const name = buildName({
    brandUpper: brand.toUpperCase(),
    size,
    ac,
    series,
    acType,
    cleanCat,
    model
  });

  const product = {
    id: `prod_ae_${p.id}`,
    sku: model || `AE-${p.id}`,
    name,
    business: 'amanot_electronics',
    brand,
    category: cleanCat,
    costPrice: round(retail * 0.9),
    retailPrice: retail,
    wholesalePrice: round(retail * 0.98),
    stockQty: 10,
    minStockAlert: 3,
    unit: ac ? 'Set' : 'Pcs',
    warranty: warrantyOf(cleanCat),
    isFeaturedOnWebsite: true,
    supplierId: 'supp_electro_mart',
    supplierName: 'Electro Mart',
    description: [p.features, p.specification].filter(Boolean).join(' — '),
    // Structured technical fields (shown small on invoices, editable in the modal)
    ...(model ? { model } : {}),
    ...(series ? { typeSeries: series } : {}),
    ...(acType ? { acType } : {}),
    ...(capacity ? { capacity } : {}),
    ...(size ? { size } : {}),
    ...(p.install_charge_bdt ? { installationCharge: p.install_charge_bdt } : {}),
    ...(p.extra_over_10ft_bdt ? { extraPipingFeePerFt: p.extra_over_10ft_bdt } : {})
  };
  out.push(product);
}

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');

// ---- report ----
const cats = {};
const brands = {};
for (const p of out) {
  cats[p.category] = (cats[p.category] || 0) + 1;
  brands[p.brand] = (brands[p.brand] || 0) + 1;
}
console.log(`Wrote ${out.length} products -> ${OUT}`);
console.log('Brands:', brands);
console.log('Categories:', cats);
console.log('\nSamples:');
for (const idx of [0, 96, 111, 175, 300]) {
  const p = out[idx];
  if (p) console.log(`  • ${p.name}\n      model=${p.model} series=${p.typeSeries || '-'} acType=${p.acType || '-'} cap=${p.capacity || '-'} size=${p.size || '-'} | retail=${p.retailPrice} cost=${p.costPrice} ws=${p.wholesalePrice}`);
}
