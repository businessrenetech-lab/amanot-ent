import { SaleInvoice, InstallmentPlan } from '../types';
import { numberToWordsBDT } from './numberToWords';
import { formatDate } from './formatDate';
import { DEFAULT_BRAND_LOGOS } from '../data/brandLogos';
import { AMANOT_ELECTRONICS_ADDRESS, resolveBusinessPhone } from '../constants/business';
import { paymentModeLabel } from './paymentLabel';

interface Settings {
  amanotElectronicsAddress?: string;
  amanotElectronicsPhone?: string;
  amanotEnterpriseAddress?: string;
  amanotEnterprisePhone?: string;
}

type WholesaleBalance = { previousBalance: number; closingBalance: number };

const esc = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const money = (n: number): string =>
  (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const clock = (d: Date): string =>
  d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

/** Time of day the sale was entered, or '' when the stored value is date-only. */
const entryTime = (createdAt?: string): string => {
  const raw = String(createdAt || '').trim();
  if (/T\d{2}:\d{2}/.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return clock(parsed);
  }
  const hm = raw.match(/\s(\d{2}):(\d{2})/);
  if (!hm) return '';
  const d = new Date();
  d.setHours(Number(hm[1]), Number(hm[2]), 0, 0);
  return clock(d);
};

const EMBLEM_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="5"/>
  <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2"/>
  <path fill="currentColor" d="M 30 50 C 30 35 42 25 58 25 C 70 25 78 32 78 42 L 30 42 C 30 60 42 68 58 68 C 68 68 74 63 76 56 L 86 58 C 82 72 70 80 56 80 C 38 80 30 65 30 50 Z"/>
  <path fill="currentColor" d="M 45 30 L 55 30 L 68 65 L 58 65 L 53 52 L 42 52 L 39 65 L 30 65 Z M 44 44 L 50 44 L 47 35 Z"/>
</svg>`;

const CASH_MEMO_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Noto+Serif+Bengali:wght@600&display=swap');

.cm-sheet {
  box-sizing: border-box;
  display: flex;
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 12mm 12mm 11mm;
  background: #ffffff;
}
.cm * { box-sizing: border-box; margin: 0; padding: 0; }
.cm {
  --ink: #000000;
  --soft: #3f3f3f;
  --accent: #000000;
  --rule: #c9c9c9;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-family: 'Archivo', 'Arial Narrow', Arial, sans-serif;
  font-size: 10.1pt;
  line-height: 1.35;
  color: var(--ink);
  text-align: left;
  font-variant-numeric: tabular-nums lining-nums;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.cm-color { --accent: #1d3c8f; }

.cm-head { text-align: center; }
.cm-bismillah {
  font-family: 'Noto Serif Bengali', serif;
  font-size: 8.9pt;
  font-weight: 600;
  margin-bottom: 1.9mm;
}
.cm-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3.1mm;
  color: var(--accent);
}
.cm-brand svg { width: 12.5mm; height: 12.5mm; flex: none; }
.cm-brand h1 {
  font-size: 22pt;
  font-weight: 800;
  font-stretch: 125%;
  line-height: 1;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.cm-partner {
  margin-top: 1.9mm;
  font-size: 11.3pt;
  font-weight: 700;
  font-stretch: 112%;
}
.cm-addr { margin-top: 0.7mm; font-size: 9.5pt; color: var(--soft); }
.cm-addr b { color: var(--ink); font-weight: 600; }

.cm-title {
  display: flex;
  align-items: center;
  gap: 4.2mm;
  margin: 3.8mm 0 3.6mm;
  color: var(--accent);
}
.cm-title::before, .cm-title::after {
  content: '';
  flex: 1;
  height: 2.2pt;
  border-top: 0.6pt solid var(--rule);
  border-bottom: 0.4pt solid var(--rule);
}
.cm-title span {
  font-size: 12.5pt;
  font-weight: 800;
  font-stretch: 125%;
  letter-spacing: 0.3em;
  margin-right: -0.3em;
  text-transform: uppercase;
}

.cm-meta {
  display: grid;
  grid-template-columns: 1fr max-content;
  column-gap: 8.3mm;
  margin-bottom: 3.6mm;
}
.cm-dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: 2.4mm;
  row-gap: 0.9mm;
  align-content: start;
}
.cm-dl dt {
  display: flex;
  justify-content: space-between;
  gap: 3mm;
  font-weight: 600;
}
.cm-dl dt::after { content: ':'; }
.cm-dl dd { min-width: 0; overflow-wrap: anywhere; }
.cm-dl dd.cm-strong { font-weight: 700; font-size: 11.3pt; line-height: 1.2; }
.cm-dl dd.cm-nowrap { white-space: nowrap; overflow-wrap: normal; }

.cm-items { width: 100%; border-collapse: collapse; }
.cm-items th {
  padding: 1.8mm 1.7mm;
  border-top: 0.6pt solid var(--rule);
  border-bottom: 0.6pt solid var(--rule);
  font-size: 9.5pt;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}
.cm-items td {
  padding: 2mm 1.7mm;
  border-bottom: 0.4pt solid var(--rule);
  vertical-align: top;
}
.cm-items .cm-num { text-align: right; white-space: nowrap; }
.cm-items .cm-mid { text-align: center; }
.cm-items td.cm-brandcell { font-weight: 700; text-transform: uppercase; }
.cm-items td.cm-amount { font-weight: 700; }
.cm-desc { font-weight: 600; }
.cm-sub { margin-top: 0.5mm; font-size: 8.9pt; color: var(--soft); }

.cm-sum { display: flex; justify-content: flex-end; margin-top: 1.7mm; }
.cm-totals { width: 78.5mm; border-collapse: collapse; }
.cm-totals td { padding: 0.9mm 1.7mm; }
.cm-totals td:first-child { font-weight: 600; }
.cm-totals td:last-child { text-align: right; white-space: nowrap; }
.cm-totals tr.cm-key td {
  padding-top: 1.3mm;
  padding-bottom: 1.3mm;
  color: var(--accent);
  font-size: 11.9pt;
  font-weight: 800;
}
.cm-totals tr.cm-key-first td { border-top: 0.6pt solid var(--rule); padding-top: 1.9mm; }
.cm-totals tr.cm-key-last td { border-bottom: 0.6pt solid var(--rule); padding-bottom: 1.9mm; }
.cm-totals tr.cm-split td { padding-top: 0; font-size: 8.9pt; font-weight: 400; color: var(--soft); }
.cm-totals tr.cm-split td:first-child { padding-left: 4.8mm; }

.cm-words {
  margin-top: 3.1mm;
  font-size: 10.1pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.cm-block { margin-top: 3.8mm; break-inside: avoid; page-break-inside: avoid; }
.cm-block h2 {
  display: flex;
  justify-content: space-between;
  gap: 4.8mm;
  padding-bottom: 0.9mm;
  border-bottom: 0.6pt solid var(--rule);
  font-size: 10.1pt;
  font-weight: 800;
}
.cm-block h2 span { font-weight: 500; }
.cm-mini { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
.cm-mini th, .cm-mini td {
  padding: 1.1mm 1.7mm;
  border-bottom: 0.4pt solid var(--rule);
  text-align: left;
}
.cm-mini th { font-weight: 700; }
.cm-mini .cm-num { text-align: right; white-space: nowrap; }
.cm-mini tr.cm-strong-row td { font-weight: 800; }
.cm-facts {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2.4mm;
  padding: 1.4mm 1.7mm;
  border-bottom: 0.4pt solid var(--rule);
  font-size: 9.5pt;
}
.cm-facts small { display: block; font-size: 8.3pt; color: var(--soft); }
.cm-facts b { font-weight: 700; }

/* Left blank for the shop's hand-applied PAID seal. */
.cm-stamps {
  flex: 1;
  min-height: 34mm;
  margin-bottom: 4mm;
}

.cm-nb { font-size: 9.5pt; font-weight: 700; }
.cm-sign {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 11.9mm;
  margin-top: 10.7mm;
}
.cm-sign div { flex: 0 1 54.7mm; text-align: center; }
.cm-sign small { display: block; margin-bottom: 0.9mm; font-size: 8.9pt; color: var(--soft); }
.cm-sign span {
  display: block;
  padding-top: 1.4mm;
  font-size: 9.5pt;
  font-weight: 700;
}
.cm-logos {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10.7mm;
  margin-top: 4.1mm;
  padding-top: 2.4mm;
  border-top: 0.4pt solid var(--rule);
}
.cm-logos img { height: 6mm; width: auto; filter: grayscale(100%) contrast(140%); }
.cm-color .cm-logos img { filter: none; }
.cm-logos b { font-size: 10.7pt; font-weight: 800; letter-spacing: 0.08em; }
.cm-printed { margin-top: 1.7mm; text-align: center; font-size: 7.7pt; color: var(--soft); }

@media print {
  .cm-sheet { width: auto; min-height: 270mm; margin: 0; padding: 0; }
}
`;

/**
 * Builds the A4 cash memo. One template feeds the on-screen preview, the
 * direct print and the new-tab PDF export, so they can never drift apart.
 */
export function buildCashMemo(
  invoice: SaleInvoice,
  settings?: Settings,
  mode: 'bw' | 'color' = 'bw',
  installmentPlan?: InstallmentPlan,
  wholesale?: WholesaleBalance
): { css: string; html: string } {
  const isElectronics = invoice.business === 'amanot_electronics';
  const brandTitle = isElectronics ? 'AMANAT ELECTRONICS' : 'AMANAT ENTERPRISE';
  const partnerTitle = isElectronics
    ? 'Channel partner of Electro Mart Limited'
    : 'Authorized Haier & Electronics Outlet';
  const brandAddress = isElectronics
    ? settings?.amanotElectronicsAddress || AMANOT_ELECTRONICS_ADDRESS
    : settings?.amanotEnterpriseAddress || 'SSK Road, Feni Sadar, Feni.';
  const brandPhone = resolveBusinessPhone(
    isElectronics ? settings?.amanotElectronicsPhone : settings?.amanotEnterprisePhone
  );

  const hasSchedule = !!(installmentPlan && installmentPlan.schedule && installmentPlan.schedule.length);
  const title = invoice.isDraft ? 'Draft Memo' : wholesale || hasSchedule ? 'Invoice' : 'Cash Memo';
  const time = entryTime(invoice.createdAt);
  const splits = invoice.paymentSplits && invoice.paymentSplits.length > 1 ? invoice.paymentSplits : [];
  const paymentText = splits.length ? 'Split payment' : paymentModeLabel(invoice.paymentMode);
  const installationTotal =
    invoice.installationFeeTotal ??
    invoice.items.reduce((sum, it) => sum + (it.installationFee || 0) + (it.extraPipingFee || 0), 0);

  const itemRows = invoice.items
    .map((item, idx) => {
      const serial = (item as any).serialNo || (item as any).chassisNo;
      const showModel =
        item.model && !item.productName.toLowerCase().includes(String(item.model).toLowerCase());
      const fees = item.includeInstallationFee && (item.installationFee || item.extraPipingFee);
      const sub = [
        showModel ? `Model: ${esc(item.model)}` : '',
        serial ? `S/N: ${esc(serial)}` : '',
        fees
          ? `Installation ${money(item.installationFee || 0)}${
              item.extraPipingFt
                ? `, extra piping ${esc(item.extraPipingFt)} ft ${money(item.extraPipingFee || 0)}`
                : ''
            }`
          : ''
      ].filter(Boolean);
      return `
        <tr>
          <td class="cm-mid">${idx + 1}</td>
          <td class="cm-brandcell">${esc(item.brand)}</td>
          <td>
            <div class="cm-desc">${esc(item.productName)}</div>
            ${sub.length ? `<div class="cm-sub">${sub.join(' &nbsp;|&nbsp; ')}</div>` : ''}
          </td>
          <td class="cm-num">${money(item.quantity)}</td>
          <td class="cm-num">${money(item.unitPrice)}</td>
          <td class="cm-num cm-amount">${money(item.quantity * item.unitPrice)}</td>
        </tr>`;
    })
    .join('');

  const balance = Math.max(0, invoice.grandTotal - (invoice.isDraft ? 0 : invoice.paidAmount));
  const splitRows = splits
    .map(
      (s) =>
        `<tr class="cm-split"><td>${esc(paymentModeLabel(s.paymentMode))}</td><td>${money(s.amount)}</td></tr>`
    )
    .join('');

  const wholesaleHtml = wholesale
    ? `
    <section class="cm-block">
      <h2>Wholesale account &ndash; balance brought forward</h2>
      <table class="cm-mini">
        <tbody>
          <tr><td>Previous Balance (B/F)</td><td class="cm-num">${money(wholesale.previousBalance)}</td></tr>
          <tr><td>This Invoice Total</td><td class="cm-num">${money(invoice.grandTotal)}</td></tr>
          <tr><td>Payment Received</td><td class="cm-num">${money(invoice.paidAmount)}</td></tr>
          <tr class="cm-strong-row"><td>Closing Balance (Total Due)</td><td class="cm-num">${money(wholesale.closingBalance)}</td></tr>
        </tbody>
      </table>
    </section>`
    : '';

  const statusText = (s: { status: string; paidDate?: string }) =>
    s.status === 'paid'
      ? `Paid${s.paidDate ? ` (${formatDate(s.paidDate)})` : ''}`
      : s.status === 'overdue'
      ? 'Overdue'
      : s.status === 'partial'
      ? 'Partial'
      : 'Due';

  const scheduleHtml =
    hasSchedule && installmentPlan
      ? `
    <section class="cm-block">
      <h2>Installment payment schedule <span>${installmentPlan.paidInstallments} of ${installmentPlan.totalInstallments} paid</span></h2>
      <div class="cm-facts">
        <div><small>Total payable</small><b>${money(installmentPlan.totalAmount)}</b></div>
        <div><small>Down payment</small><b>${money(installmentPlan.downPayment)}</b></div>
        <div><small>Financed</small><b>${money(installmentPlan.financedAmount)}</b></div>
        <div><small>Monthly &times; ${installmentPlan.totalInstallments}</small><b>${money(installmentPlan.monthlyEmi)}</b></div>
      </div>
      <table class="cm-mini">
        <thead>
          <tr><th>No.</th><th>Due Date</th><th class="cm-num">Amount</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${installmentPlan.schedule
            .map(
              (s) => `
          <tr>
            <td>${s.installmentNo}</td>
            <td>${formatDate(s.dueDate)}</td>
            <td class="cm-num">${money(s.amount)}</td>
            <td>${esc(statusText(s))}</td>
          </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </section>`
      : '';

  const logos = [
    { key: 'konka', name: 'KONKA' },
    { key: 'gree', name: 'GREE' },
    { key: 'haiko', name: 'HAIKO' }
  ]
    .map(({ key, name }) =>
      DEFAULT_BRAND_LOGOS[key] ? `<img src="${DEFAULT_BRAND_LOGOS[key]}" alt="${name}" />` : `<b>${name}</b>`
    )
    .concat(isElectronics ? [] : ['<b>HAIER</b>'])
    .join('');

  const now = new Date();

  const html = `
<div class="cm${mode === 'color' ? ' cm-color' : ''}">
  <header class="cm-head">
    <p class="cm-bismillah">বিসমিল্লাহির রাহমানির রাহিম</p>
    <div class="cm-brand">${EMBLEM_SVG}<h1>${brandTitle}</h1></div>
    <p class="cm-partner">${esc(partnerTitle)}</p>
    <p class="cm-addr">${esc(brandAddress)}</p>
    <p class="cm-addr">Contact: <b>${esc(brandPhone)}</b></p>
  </header>

  <div class="cm-title"><span>${title}</span></div>

  <section class="cm-meta">
    <dl class="cm-dl">
      <dt>Name</dt><dd class="cm-strong">${esc(invoice.customerName)}</dd>
      <dt>Address</dt><dd>${esc(invoice.customerAddress || 'Showroom Counter Purchase')}</dd>
      <dt>Mobile</dt><dd>${esc(invoice.customerPhone)}</dd>
    </dl>
    <dl class="cm-dl">
      <dt>Invoice No.</dt><dd class="cm-strong cm-nowrap">${esc(invoice.id)}</dd>
      <dt>Date</dt><dd>${formatDate(invoice.createdAt)}</dd>
      ${time ? `<dt>Entry Time</dt><dd>${time}</dd>` : ''}
      <dt>Prepared By</dt><dd>${esc(invoice.createdByStaffName || 'Authorized Staff')}</dd>
      ${
        invoice.isDraft
          ? ''
          : `<dt>Payment</dt><dd>${esc(paymentText)}${
              invoice.customerPaymentNumber ? ` (${esc(invoice.customerPaymentNumber)})` : ''
            }</dd>`
      }
    </dl>
  </section>

  <table class="cm-items">
    <thead>
      <tr>
        <th class="cm-mid" style="width:9.5mm">SL</th>
        <th style="width:25mm">Brand Name</th>
        <th>Product Description</th>
        <th class="cm-num" style="width:14.3mm">Qty</th>
        <th class="cm-num" style="width:26.2mm">Unit Price</th>
        <th class="cm-num" style="width:29.8mm">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <section class="cm-sum">
    <table class="cm-totals">
      <tbody>
        <tr><td>Total Amount</td><td>${money(invoice.subtotal)}</td></tr>
        ${invoice.discountTotal > 0 ? `<tr><td>Less Discount</td><td>${money(invoice.discountTotal)}</td></tr>` : ''}
        ${installationTotal > 0 ? `<tr><td>Add Installation</td><td>${money(installationTotal)}</td></tr>` : ''}
        <tr class="cm-key cm-key-first"><td>Net Payable Amount</td><td>${money(invoice.grandTotal)}</td></tr>
        <tr class="cm-key"><td>Paid Amount</td><td>${money(invoice.isDraft ? 0 : invoice.paidAmount)}</td></tr>
        ${splitRows}
        <tr class="cm-key cm-key-last"><td>Balance</td><td>${money(balance)}</td></tr>
      </tbody>
    </table>
  </section>

  <p class="cm-words">Taka: ${esc(numberToWordsBDT(invoice.grandTotal).replace(/ Taka( and| Only)/, '$1'))}</p>

  ${wholesaleHtml}
  ${scheduleHtml}

  <div class="cm-stamps" aria-hidden="true"></div>

  <footer class="cm-foot">
    <p class="cm-nb">Goods once sold are not returnable or exchangeable.</p>
    <div class="cm-sign">
      <div><span>Customer Signature</span></div>
      <div><span>${brandTitle}</span></div>
    </div>
    <div class="cm-logos">${logos}</div>
    <p class="cm-printed">Printed ${formatDate(now)} ${clock(now)}</p>
  </footer>
</div>`;

  return { css: CASH_MEMO_CSS, html };
}

function cashMemoDocument(
  invoice: SaleInvoice,
  settings: Settings | undefined,
  mode: 'bw' | 'color',
  installmentPlan: InstallmentPlan | undefined,
  wholesale: WholesaleBalance | undefined,
  autoPrint: boolean
): string {
  const memo = buildCashMemo(invoice, settings, mode, installmentPlan, wholesale);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice_${esc(invoice.id)}</title>
  <style>
    ${memo.css}
    html, body { margin: 0; padding: 0; }
    body { background: #e5e7eb; padding: 8mm 0; }
    .cm-sheet { box-shadow: 0 1mm 5mm rgba(0, 0, 0, 0.18); }
    @page { size: A4 portrait; margin: 12mm 12mm 11mm; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .cm-sheet { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="cm-sheet">${memo.html}</div>
  <script>
    // Printable height of an A4 page inside the @page margins (297 - 12 - 11 - 4mm slack).
    window.fitMemo = function () {
      var sheet = document.querySelector('.cm-sheet');
      var memo = document.querySelector('.cm');
      if (!sheet || !memo) return;
      memo.style.zoom = '';
      sheet.style.minHeight = '0';
      // A zoomed flex child gets stretched by the un-zoomed height, so drop the stretch while fitting.
      sheet.style.display = 'block';
      var limit = (270 * 96) / 25.4;
      var cs = getComputedStyle(sheet);
      var pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      var used = function () { return sheet.getBoundingClientRect().height - pad; };
      if (used() <= limit) { sheet.style.minHeight = ''; sheet.style.display = ''; return; }
      // Shrinking reflows the text wider, so search for the largest zoom that fits.
      var lo = 0.45, hi = 1;
      for (var i = 0; i < 10; i++) {
        var mid = (lo + hi) / 2;
        memo.style.zoom = String(mid);
        if (used() <= limit) lo = mid; else hi = mid;
      }
      memo.style.zoom = String(lo);
    };
    window.addEventListener('beforeprint', window.fitMemo);
    window.onload = function () {
      var go = function () {
        window.fitMemo();
        ${autoPrint ? 'setTimeout(function () { window.print(); }, 200);' : ''}
      };
      if (document.fonts && document.fonts.ready) { document.fonts.ready.then(go, go); } else { go(); }
    };
  </script>
</body>
</html>`;
}

/** Opens the A4 cash memo in a new tab and invokes the browser print dialog (Save as PDF). */
export function exportCustomerInvoicePDF(
  invoice: SaleInvoice,
  settings?: Settings,
  mode: 'bw' | 'color' = 'bw',
  installmentPlan?: InstallmentPlan,
  wholesale?: WholesaleBalance
) {
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(cashMemoDocument(invoice, settings, mode, installmentPlan, wholesale, true));
    win.document.close();
  } else {
    alert('Pop-up blocked! Please allow pop-ups for this site to print/export PDF.');
  }
}

/** Prints the A4 cash memo straight from the current page through a hidden frame. */
export function printCashMemo(
  invoice: SaleInvoice,
  settings?: Settings,
  mode: 'bw' | 'color' = 'bw',
  installmentPlan?: InstallmentPlan,
  wholesale?: WholesaleBalance
) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) return;
    const go = () => {
      (win as Window & { fitMemo?: () => void }).fitMemo?.();
      win.onafterprint = () => frame.remove();
      win.focus();
      win.print();
    };
    const fonts = win.document.fonts;
    if (fonts && fonts.ready) fonts.ready.then(() => setTimeout(go, 150), go);
    else go();
  };
  frame.srcdoc = cashMemoDocument(invoice, settings, mode, installmentPlan, wholesale, false);
  document.body.appendChild(frame);
}
