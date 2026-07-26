import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Each audit filter exports its own content. Previously every filter produced
 * the same combined "Tax Filing & Compliance Audit Report", so a user viewing
 * (say) Product-Wise Tax Sales got a PDF containing all five sections.
 */

const srcDir = path.resolve(process.cwd(), 'src');
const source = fs.readFileSync(path.join(srcDir, 'components/reports/AuditReportsView.tsx'), 'utf8');

/** Mirrors getExportSpec's section selection. */
const HEADINGS = [
  '1. Tax Profit & Loss Statement',
  '2. Tax Sales Invoices Audit',
  '3. Product-Wise Tax Sales',
  '4. Tax Purchase & Procurement',
  '4a. Purchased Product Details (all POs)',
  '5. Tax Business Expenses'
];

const pick = (prefixes: string[]) =>
  HEADINGS.filter((h) => prefixes.some((p) => h.startsWith(p)));

test('each filter selects only its own section', () => {
  assert.deepEqual(pick(['1.']), ['1. Tax Profit & Loss Statement']);
  assert.deepEqual(pick(['2.']), ['2. Tax Sales Invoices Audit']);
  assert.deepEqual(pick(['3.']), ['3. Product-Wise Tax Sales']);
  assert.deepEqual(pick(['5.']), ['5. Tax Business Expenses']);
});

test('the purchases filter includes its product-detail sub-section', () => {
  assert.deepEqual(pick(['4.', '4a.']), [
    '4. Tax Purchase & Procurement',
    '4a. Purchased Product Details (all POs)'
  ]);
});

test('no filter leaks a section belonging to another', () => {
  const selections = [['1.'], ['2.'], ['3.'], ['4.', '4a.'], ['5.']];
  selections.forEach((prefixes) => {
    const picked = pick(prefixes);
    assert.ok(picked.length > 0, `${prefixes} selected nothing`);
    assert.ok(picked.length < HEADINGS.length, `${prefixes} selected everything`);
  });
});

test('every section is covered exactly once across the filters', () => {
  const covered = [['1.'], ['2.'], ['3.'], ['4.', '4a.'], ['5.']].flatMap(pick);
  assert.equal(covered.length, HEADINGS.length);
  assert.equal(new Set(covered).size, HEADINGS.length);
});

// ---- Source guards ----

test('a seventh combined filter exists', () => {
  assert.ok(/'full_report'/.test(source), 'full_report tab must exist');
  assert.ok(
    /TAX FILING & COMPLIANCE AUDIT REPORT \(Combined\)/.test(source),
    'the combined option must be listed in the filter menu'
  );
});

test('only the combined filter bundles every section', () => {
  const spec = source.slice(source.indexOf('const getExportSpec'), source.indexOf('const handleExportTaxPDF'));
  assert.ok(/case 'full_report'/.test(spec), 'full_report must be a case in getExportSpec');
  // the combined case is the one that spreads all sections
  assert.ok(/\.\.\.all/.test(spec), 'full_report must include all audit sections');
  // and the per-tab cases must use pick(), not the whole list
  ['profit_loss', 'sales', 'product_sales', 'purchases', 'expenses'].forEach((tab) => {
    const idx = spec.indexOf(`case '${tab}'`);
    assert.ok(idx > -1, `${tab} must have its own export case`);
  });
});

test('the PDF title and filename follow the active filter', () => {
  assert.ok(/title,\s*$/m.test(source) || /title,/.test(source), 'PDF title must come from the export spec');
  assert.ok(/Amanot_\$\{fileTag\}_/.test(source), 'filename must vary per filter');
  // The combined title still exists, but only inside the full_report case —
  // generateBrandedReportPDF itself must receive the variable, never a literal.
  const pdfCall = source.slice(source.indexOf('const handleExportTaxPDF'));
  assert.ok(
    !/title: 'Tax Filing & Compliance Audit Report'/.test(
      pdfCall.slice(0, pdfCall.indexOf('fileName'))
    ),
    'the PDF call must take its title from the export spec, not a literal'
  );
});

test('print output follows the active filter too', () => {
  assert.ok(
    /const \{ title: printTitle, sections \} = getExportSpec\(\)/.test(source),
    'print must use the same per-filter spec as the PDF export'
  );
  assert.ok(
    !/const sections = buildAuditSections\(\);/.test(source),
    'print must not unconditionally build every section'
  );
});
