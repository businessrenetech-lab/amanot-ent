// ============================================================================
// Generator: Haier (HBL Dealer Channel) price lists, November 2026 → the app's
// Product shape, written to src/data/haierProducts.json.
//
//   node scripts/generate-haier.mjs
//
// Source PDFs: HBL_AC_LCAC, HBL_REF, HBL_HCF, HBL_TV, HBL_WM, HBL_MWO, HBL_WH
// (Version 01, November 2026). Rows are transcribed below.
//
// Pricing rules:
//   retailPrice    = MRP
//   wholesalePrice = HBL "Showroom Price" (falls back to MRP - 2% where the
//                    list has no showroom column: AC, chest freezer)
//   costPrice      = HBL Dealer Price (chest freezer: Offer Price (DP))
// All under business = amanot_enterprise, brand Haier, supplier Haier BD.
// Stock starts at 0 — receive real stock via Purchase / Stock Adjustment.
// ============================================================================
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'src', 'data', 'haierProducts.json');

// ---------------------------------------------------------------- AC + LCAC
// [capacityLabel, model, mrp, dealerPrice, extra?]
const AC = [
  ['INV 2.0 TON', 'HSU-24Gravity(INV)(Pro)(X6)-WiFi*UV*AI', 100990, 79782],
  ['INV 1.6 TON', 'HSU-19Gravity(INV)(Pro)(X6)-WiFi*UV*AI', 83990, 66352],
  ['INV 1.0 TON', 'HSU-13Gravity(INV)(Pro)(X6)-WiFi*UV*AI', 66990, 52922],
  ['INV 1.6 TON', 'HSU-19SolarCool:(INV)(WiFi)(FA)', 155000, 120990],
  ['INV 2.0 TON', 'HSU-24UVCool(INV)(Pro)(X6)-WiFi*UV', 95990, 71993],
  ['INV 2.0 TON', 'HSU-24AntirustCool(INV)(Pro)(X6)-WiFi', 93990, 70493],
  ['INV 2.0 TON', 'HSU-24CleanCool(INV)(Pro)(X6)', 91990, 68993],
  ['INV 1.6 TON', 'HSU-19UltimateCool:(INV)(Pro)/T3-WiFi*UV', 99990, 74993],
  ['INV 1.6 TON', 'HSU-19PuriCool(INV)(Pro)-WiFi*IFD*AirPurifier', 99990, 74993],
  ['INV 1.6 TON', 'HSU-19HeatCool:(INV)(Pro)-WiFi', 80990, 60743],
  ['INV 1.6 TON', 'HSU-19UVCool:(INV)(Pro)(X6)-WiFi*UV', 79990, 59993],
  ['INV 1.6 TON', 'HSU-19AntirustCool(INV)(Pro)(X6)-WiFi', 77990, 58493],
  ['INV 1.6 TON', 'HSU-19CleanCool(INV)(Pro)(X6)', 75990, 56993],
  ['INV 1.5 TON', 'HSU-18ReviveCool(INV)(Pro)(X6)', 69990, 52493],
  ['INV 1.0 TON', 'HSU-13UVCool(INV)(Pro)(X6)-WiFi*UV', 62990, 47243],
  ['INV 1.0 TON', 'HSU-13AntirustCool(INV)(Pro)(X6)-WiFi', 60990, 45743],
  ['INV 1.0 TON', 'HSU-13CleanCool(INV)(Pro)(X6)', 58990, 44243],
  ['FIX 2.0 TON', 'HSU-24TurboAqua(FIX)(Pro)(X6)', 78990, 59243],
  ['FIX 1.5 TON', 'HSU-18TurboAqua(FIX)(Pro)(X6)', 63990, 47993],
  ['FIX 1.0 TON', 'HSU-12TurboAqua(FIX)(Pro)(X6)', 50990, 38243],
  // Light commercial (cassette)
  ['INV 2.0 TON', 'HSU-24SenseCool(INV)(Cassette)', 124990, 92990, 'Single Phase, 12 ft connecting pipe'],
  ['FIX 2.5 TON', 'HSU-30CassetteType:(Non-Inverter)', 135990, 100000, 'Single Phase, no pipe'],
  ['FIX 3.0 TON', 'HSU-36CassetteType:(Non-Inverter)', 161990, 115000, 'Three Phase, no pipe'],
  ['FIX 4.0 TON', 'HSU-48CassetteType:(Non-Inverter)', 201990, 145000, 'Three Phase, no pipe']
];

// ---------------------------------------------------------------- Refrigerator
// [type, model, mrp, showroom, dealer]
const REF = [
  ['T Door', 'HRF-578TPB(BD)', 149900, 142405, 122918],
  ['Side by Side', 'HRF-622IBG (SKD)', 145900, 138605, 119638],
  ['Side by Side', 'HRF-622ICG (SKD)', 144900, 137655, 118818],
  ['No Frost', 'HRF-386TBG', 79900, 75905, 65518],
  ['No Frost', 'HRF-362TBG', 75900, 72105, 62238],
  ['No Frost', 'HRF-500VBG', 114900, 109155, 94218],
  ['No Frost', 'HRF-500VMB', 108900, 103455, 89298],
  ['No Frost', 'HRF-475VBG', 107900, 102505, 88478],
  ['No Frost', 'HRF-475VMB', 102900, 97755, 84378]
];

// ---------------------------------------------------------------- Chest freezer
// [model, litres, mrp, offerPriceDP]
const HCF = [
  ['HCF-420SME', 369, 74900, 60167],
  ['HCF-340SM', 301, 59400, 46302],
  ['HCF-290SM', 251, 53400, 41322],
  ['HCF-230SGE', 200, 51400, 40162],
  ['HCF-230SGM', 200, 48400, 35172],
  ['HCF-230SGML', 200, 48900, 35587],
  ['HCF-230SGEL', 200, 51400, 40162],
  ['HCF-175SGE', 142, 43900, 33437],
  ['HCF-175SGEL', 142, 43900, 33437]
];

// ---------------------------------------------------------------- TV
// [inch, material, model, spec, mrp, showroom, dp]
const TV = [
  [32, 'DH20H5Z01', 'H32S80GFX', 'QLED FHD Google TV', 35900, 33900, 28063],
  [43, 'DH20GCZ01', 'H43S80GFX', 'QLED FHD Google TV, 1G+8G', 46900, 43900, 35252],
  [43, 'DH20QEZ00', 'H43S80GUX', 'QLED 4K Google TV, 2G+32G', 57900, 54900, 42359],
  [43, 'DH20P7Z00', '43P7 PRO', 'HQLED, Google TV, 2G+32G, Hands Free Voice', 62900, 59900, 46017],
  [43, 'DH20P8Z00', 'H43S85GUX', 'QLED, 120Hz, Hands Free, 2G+32G', 63900, 60900, 46749],
  [50, 'DH20N8Z00', '50P7 PRO', 'HQLED, Google TV, 2G+32G, Hands Free Voice', 76900, 72900, 56260],
  [55, 'DH20MGZ00', '55P7 PRO', 'HQLED, Google TV, 2G+32G, Hands Free Voice', 91900, 86900, 67233],
  [55, 'DH20MHZ00', 'H55S85GUX', 'QLED, 120Hz, Hands Free, 2G+32G', 92900, 87900, 67965],
  [65, 'DH20LJZ00', '65P7 PRO', 'HQLED, Google TV, 2G+32G, Hands Free Voice', 123900, 117900, 90644],
  [65, 'DH20LKZ00', 'H65S85GUX', 'QLED, 120Hz, Hands Free, 2G+32G', 124900, 118900, 91376],
  [75, 'DH20KJZ00', '75P7 PRO', 'HQLED, Google TV, 2G+32G, Hands Free Voice', 164900, 154900, 120639],
  [55, 'DH210FZ00', 'H55M80GUX', 'MiniLED, 120Hz, KEF Sound', 109900, 101900, 82605],
  [65, 'DH20ZEZ00', 'H65M80GUX', 'MiniLED, 120Hz, KEF Sound', 145900, 135900, 109663],
  [75, 'DH20YEZ00', 'H75M80GUX', 'MiniLED, 120Hz, KEF Sound', 197900, 182900, 148748],
  [85, 'DH20XBZ00', 'H85M80GUX', 'MiniLED, 120Hz, KEF Sound', 259900, 245900, 195349],
  [100, 'DH20EME00', 'H100S90FUX', 'MiniLED, 144Hz, 55W KEF Sound', 499900, 449900, 390770]
];

// ---------------------------------------------------------------- Washing machine
// [model, type, mrp, showroom, dealer]
const WM = [
  ['HW140-BD14697WU1', '3 Drum', 179900, 170905, 145719],
  ['HWD140-BPD14387GNU1', 'Washer Dryer', 128900, 122455, 104409],
  ['HW120-BP12357S8', 'Front Load', 81900, 77805, 66339],
  ['HW100-BP12357S8', 'Front Load', 76900, 73055, 62289],
  ['HW90-BP12357S8', 'Front Load', 68900, 65455, 55809],
  ['HD80-V939S', 'Front Load Dryer', 54900, 49410, 39528],
  ['HWM200-BD2178S8', 'Top Load', 63900, 60705, 51759],
  ['HWM130-B1678ES8', 'Top Load', 56900, 54055, 46089],
  ['HWM120-316S6', 'Top Load', 52900, 50255, 42849],
  ['HWM100-316S6', 'Top Load', 46900, 44555, 37989],
  ['HWM90-316S6', 'Top Load', 38900, 36955, 31509],
  ['HWM80-316S6', 'Top Load', 34400, 32680, 27864],
  ['HWM80-1269S6', 'Top Load', 29900, 25500, 23000]
];

// ---------------------------------------------------------------- Microwave oven
// [model, material, type, mrp, showroom, dealer]
const MWO = [
  ['HMW-M2001BBD', 'FZ03WYM07', 'Solo', 10990, 10441, 9012],
  ['HMW-E2301GBBD', 'FZ03WXM07', 'Grill', 15990, 15191, 13112],
  ['HMW-E3001CBBD', 'FZ03WWM07', 'Convection', 23990, 22791, 19672]
];

// ---------------------------------------------------------------- Water heater
// [model, material, litres, mrp, showroom, dealer]
const WH = [
  ['ES30H-CK3(BD)', 'GA0SJHE00', 30, 13300, 11970, 9975],
  ['ES40H-CK3(BD)', 'GA0G8WE00', 40, 14800, 13320, 11100],
  ['ES50H-CK3(BD)', 'GA0G8VE00', 50, 16300, 14670, 12225],
  ['ES35H-Tigris', 'GA0UM0E04', 35, 13800, 12420, 10350],
  ['ES45H-Tigris', 'GA0UM1E04', 45, 15500, 13950, 11625],
  ['ES30V-Tigris', 'GA0UAAE02', 30, 14300, 12870, 10725]
];

// ============================================================================
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pct98 = (n) => Math.round(n * 0.98);

const base = (model, category) => ({
  id: `prod_haier_${slug(model)}`,
  sku: model,
  business: 'amanot_enterprise',
  brand: 'Haier',
  category,
  stockQty: 0,
  minStockAlert: 2,
  isFeaturedOnWebsite: true,
  supplierId: 'supp_haier_bd',
  supplierName: 'Haier Bangladesh Sales Dept',
  model
});

const out = [];

for (const [cap, model, mrp, dealer, extra] of AC) {
  const [kind, ton] = cap.split(/\s+/);
  const inverter = kind.toUpperCase() === 'INV';
  const cassette = /cassette/i.test(model);
  const tons = Number(ton).toFixed(1);
  const btu = Math.round(Number(ton) * 12000);
  const series = (model.match(/^HSU-\d+([A-Za-z]+)/) || [])[1] || '';
  const acType = cassette
    ? inverter ? 'Cassette Inverter' : 'Cassette'
    : inverter ? 'Split Inverter' : 'Split';
  out.push({
    ...base(model, 'Air Conditioner'),
    name: `HAIER ${tons} TON ${series === 'CassetteType' ? '' : series + ' '}${acType} AC (${model})`.replace(/\s+/g, ' '),
    costPrice: dealer,
    retailPrice: mrp,
    wholesalePrice: pct98(mrp),
    unit: 'Set',
    warranty: '10 Years Compressor, 1 Year Spare Parts',
    description: `${series && series !== 'CassetteType' ? series + ' — ' : ''}${acType} ${tons} Ton ${btu} BTU${extra ? ' · ' + extra : ''}`,
    typeSeries: series && series !== 'CassetteType' ? series : undefined,
    acType,
    capacity: `${btu} BTU`,
    size: `${tons} Ton`,
    tags: [inverter ? 'Inverter' : 'Non-Inverter', ...(/wifi/i.test(model) ? ['WiFi'] : [])]
  });
}

for (const [type, model, mrp, showroom, dealer] of REF) {
  out.push({
    ...base(model, 'Refrigerator'),
    name: `HAIER ${type} Refrigerator (${model})`,
    costPrice: dealer,
    retailPrice: mrp,
    wholesalePrice: showroom,
    unit: 'Pcs',
    warranty: '12 Years Compressor, 1 Year Parts',
    description: `${type} Refrigerator`,
    typeSeries: type
  });
}

for (const [model, litres, mrp, dp] of HCF) {
  out.push({
    ...base(model, 'Deep Fridge'),
    name: `HAIER ${litres} LTR Chest Freezer (${model})`,
    costPrice: dp,
    retailPrice: mrp,
    wholesalePrice: pct98(mrp),
    unit: 'Pcs',
    warranty: '12 Years Compressor, 1 Year Parts',
    description: `Chest Freezer — ${litres} Litre`,
    capacity: `${litres} LTR`,
    size: `${litres} Litre`
  });
}

for (const [inch, material, model, spec, mrp, showroom, dp] of TV) {
  out.push({
    ...base(model, 'LED TV'),
    name: `HAIER ${inch}" ${spec.split(',')[0].replace(/\s*TV$/i, '')} TV (${model})`,
    costPrice: dp,
    retailPrice: mrp,
    wholesalePrice: showroom,
    unit: 'Pcs',
    warranty: '3 Years Panel, 1 Year Parts',
    description: `${inch}" ${spec} · Material ${material}`,
    size: `${inch}"`
  });
}

for (const [model, type, mrp, showroom, dealer] of WM) {
  const kg = (model.match(/^H[A-Z]*?(\d{2,3})-/) || [])[1];
  const kgLabel = kg ? `${Number(kg) / 10} KG` : '';
  out.push({
    ...base(model, 'Washing Machine'),
    name: `HAIER ${kgLabel ? kgLabel + ' ' : ''}${type} Washing Machine (${model})`,
    costPrice: dealer,
    retailPrice: mrp,
    wholesalePrice: showroom,
    unit: 'Pcs',
    warranty: '10 Years Motor, 1 Year Parts',
    description: `${type} Washing Machine${kgLabel ? ' — ' + kgLabel : ''}`,
    typeSeries: type,
    size: kgLabel || undefined
  });
}

for (const [model, material, type, mrp, showroom, dealer] of MWO) {
  out.push({
    ...base(model, 'Microwave Oven'),
    name: `HAIER ${type} Microwave Oven (${model})`,
    costPrice: dealer,
    retailPrice: mrp,
    wholesalePrice: showroom,
    unit: 'Pcs',
    warranty: '1 Year Official Warranty',
    description: `${type} Microwave Oven · Material ${material}`,
    typeSeries: type
  });
}

for (const [model, material, litres, mrp, showroom, dealer] of WH) {
  out.push({
    ...base(model, 'Geyser'),
    name: `HAIER ${litres} LTR Water Heater (${model})`,
    costPrice: dealer,
    retailPrice: mrp,
    wholesalePrice: showroom,
    unit: 'Pcs',
    warranty: '1 Year Official Warranty',
    description: `Electric Water Heater — ${litres} Litre · Material ${material}`,
    capacity: `${litres} LTR`,
    size: `${litres} Litre`
  });
}

// Drop undefined keys so the JSON stays clean.
const clean = out.map((p) => JSON.parse(JSON.stringify(p)));
const ids = new Set(clean.map((p) => p.id));
if (ids.size !== clean.length) throw new Error('Duplicate product ids');

writeFileSync(OUT, JSON.stringify(clean, null, 2) + '\n');
console.log(`Wrote ${clean.length} Haier products → ${OUT}`);
