import { SaleInvoice, InstallmentPlan } from '../types';
import { numberToWordsBDT } from './numberToWords';
import { formatDate } from './formatDate';
import { DEFAULT_BRAND_LOGOS } from '../data/brandLogos';
import { AMANOT_ELECTRONICS_ADDRESS } from '../constants/business';

interface Settings {
  binNumber?: string;
  amanotElectronicsAddress?: string;
  amanotElectronicsPhone?: string;
  amanotEnterpriseAddress?: string;
  amanotEnterprisePhone?: string;
}

/**
 * Export Customer Invoice as high-fidelity vector PDF in a new tab.
 * Automatically invokes browser print for 100% crisp vector rendering.
 */
export function exportCustomerInvoicePDF(
  invoice: SaleInvoice,
  settings?: Settings,
  mode: 'bw' | 'color' = 'bw',
  installmentPlan?: InstallmentPlan
) {
  const isElectronics = invoice.business === 'amanot_electronics';
  const brandTitle = isElectronics ? 'AMANAT ELECTRONICS' : 'AMANAT ENTERPRISE';
  const partnerTitle = isElectronics ? 'Channel partner of ELECTRO MART LIMITED' : 'Authorized Haier & Electronics Outlet';
  const binNumber = settings?.binNumber || 'BIN: 006091988-0602';
  const brandAddress = isElectronics
    ? settings?.amanotElectronicsAddress || AMANOT_ELECTRONICS_ADDRESS
    : settings?.amanotEnterpriseAddress || 'SSK Road, Feni Sadar, Feni.';
  const brandPhone = isElectronics
    ? settings?.amanotElectronicsPhone || '+880 1711-001122, +880 1819-223344'
    : settings?.amanotEnterprisePhone || '+880 1871-186562';

  // Model is printed per line item (Brand | Model | Cap), so no summary row is needed
  const itemSerials = invoice.items.map((it) => (it as any).serialNo || (it as any).chassisNo).filter(Boolean).join(', ');

  const greeB64 = DEFAULT_BRAND_LOGOS['gree'];
  const haikoB64 = DEFAULT_BRAND_LOGOS['haiko'];
  const konkaB64 = DEFAULT_BRAND_LOGOS['konka'];

  const takaInWords = numberToWordsBDT(invoice.grandTotal);

  // Installment / EMI schedule block (only for EMI sales).
  const scheduleHtml =
    installmentPlan && installmentPlan.schedule && installmentPlan.schedule.length
      ? `
    <div style="margin-top:14px; border:2px solid #000; border-radius:4px; overflow:hidden;">
      <div style="background:#e2e8f0; padding:6px 10px; display:flex; justify-content:space-between; font-weight:900; font-size:11px; text-transform:uppercase;">
        <span>Installment / EMI Payment Schedule</span>
        <span>${installmentPlan.paidInstallments} of ${installmentPlan.totalInstallments} paid</span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(4,1fr); border-bottom:1px solid #000; font-size:10px;">
        <div style="padding:6px; border-right:1px solid #000;"><div style="font-size:8px; text-transform:uppercase; color:#475569; font-weight:800;">Total Payable</div><div style="font-weight:900;">৳${installmentPlan.totalAmount.toLocaleString()}</div></div>
        <div style="padding:6px; border-right:1px solid #000;"><div style="font-size:8px; text-transform:uppercase; color:#475569; font-weight:800;">Down Payment</div><div style="font-weight:900;">৳${installmentPlan.downPayment.toLocaleString()}</div></div>
        <div style="padding:6px; border-right:1px solid #000;"><div style="font-size:8px; text-transform:uppercase; color:#475569; font-weight:800;">Financed</div><div style="font-weight:900;">৳${installmentPlan.financedAmount.toLocaleString()}</div></div>
        <div style="padding:6px;"><div style="font-size:8px; text-transform:uppercase; color:#475569; font-weight:800;">Monthly EMI &times; ${installmentPlan.totalInstallments}</div><div style="font-weight:900;">৳${installmentPlan.monthlyEmi.toLocaleString()}</div></div>
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:10px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:5px; border-right:1px solid #000; text-align:left;">#</th>
            <th style="padding:5px; border-right:1px solid #000; text-align:left;">Due Date</th>
            <th style="padding:5px; border-right:1px solid #000; text-align:right;">Installment Amount</th>
            <th style="padding:5px; text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${installmentPlan.schedule
            .map(
              (s) => `
            <tr style="border-top:1px solid #000;">
              <td style="padding:5px; border-right:1px solid #000; font-weight:700;">${s.installmentNo}</td>
              <td style="padding:5px; border-right:1px solid #000;">${formatDate(s.dueDate)}</td>
              <td style="padding:5px; border-right:1px solid #000; text-align:right; font-weight:700;">৳${s.amount.toLocaleString()}</td>
              <td style="padding:5px; text-align:center; font-weight:900; text-transform:uppercase;">${
                s.status === 'paid'
                  ? 'PAID' + (s.paidDate ? ' (' + formatDate(s.paidDate) + ')' : '')
                  : s.status === 'overdue'
                  ? 'OVERDUE'
                  : s.status === 'partial'
                  ? 'PARTIAL'
                  : 'DUE'
              }</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`
      : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice_${invoice.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #000000;
      background: #ffffff;
      padding: 24px;
      max-width: 820px;
      margin: 0 auto;
      font-size: 12px;
      line-height: 1.4;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-black { font-weight: 900; }
    .font-mono { font-family: monospace; }
    .uppercase { text-transform: uppercase; }

    .header-bismillah {
      font-size: 13px;
      font-weight: 800;
      margin-bottom: 6px;
      font-family: serif;
    }
    .header-main {
      border-bottom: 2px solid #000000;
      padding-bottom: 12px;
      margin-bottom: 16px;
      text-align: center;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }
    .partner-title {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .header-sub {
      font-size: 11px;
      font-weight: 700;
      margin-top: 4px;
    }
    .sl-date-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px dashed #94a3b8;
      font-family: monospace;
      font-weight: 700;
      font-size: 12px;
    }
    .sl-box {
      border: 1.5px solid #000000;
      padding: 2px 8px;
      font-weight: 900;
    }
    .cust-box {
      border: 1.5px solid #000000;
      padding: 10px 12px;
      margin-bottom: 16px;
      background: #f8fafc;
      font-weight: 700;
      font-size: 12px;
    }
    .cust-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 6px;
    }
    .cust-row:last-child { margin-bottom: 0; }
    .dotted-line {
      border-bottom: 1px dotted #000000;
      display: inline-block;
      padding: 0 4px;
      font-weight: 800;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #000000;
      margin-bottom: 16px;
    }
    th {
      background: #e2e8f0;
      color: #000000;
      border: 1px solid #000000;
      border-bottom: 2px solid #000000;
      padding: 8px;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }
    td {
      border: 1px solid #000000;
      padding: 8px;
      font-size: 11.5px;
    }
    .summary-row {
      background: #f8fafc;
      font-weight: 800;
    }

    .taka-summary-grid {
      display: grid;
      grid-template-columns: 1fr 240px;
      gap: 12px;
      border-bottom: 2px solid #000000;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .taka-box {
      border: 1.5px solid #000000;
      padding: 8px 12px;
      background: #f8fafc;
    }
    .taka-words {
      font-size: 13px;
      font-weight: 800;
      font-style: italic;
      margin-top: 2px;
    }
    .amount-box {
      border: 1.5px solid #000000;
      padding: 8px 12px;
      background: #f8fafc;
      font-family: monospace;
      font-size: 12px;
      font-weight: 700;
    }

    .signatures {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 48px;
      margin-bottom: 24px;
      font-size: 11px;
      font-weight: 800;
    }
    .sig-line {
      border-top: 2px solid #000000;
      width: 180px;
      text-align: center;
      padding-top: 4px;
      margin-top: 4px;
    }

    .logos-bar {
      border-top: 2px solid #000000;
      padding-top: 12px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      align-items: center;
      text-align: center;
    }
    .logo-img {
      height: 28px;
      max-height: 28px;
      width: auto;
      object-contain: contain;
      filter: grayscale(100%) contrast(150%);
    }

    @media print {
      body { padding: 0; }
      @page { size: A4 portrait; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="text-center header-bismillah">বিসমিল্লাহির রাহমানির রাহিম</div>

  <div class="header-main">
    <div class="brand-title">${brandTitle}</div>
    <div class="partner-title">${partnerTitle}</div>
    <div class="header-sub">${binNumber} &nbsp;•&nbsp; ${brandAddress}</div>
    <div class="header-sub">Mobile: ${brandPhone}</div>

    <div class="sl-date-row">
      <div>SL No : <span class="sl-box">${invoice.id}</span></div>
      <div>Date : <span style="text-decoration: underline dotted;">${formatDate(invoice.createdAt)}</span></div>
    </div>
  </div>

  <div class="cust-box">
    <div class="cust-row">
      <div style="flex:1;">Name : <span class="dotted-line" style="min-width: 220px;">${invoice.customerName}</span></div>
      <div>Phone : <span class="dotted-line" style="min-width: 140px;">${invoice.customerPhone}</span></div>
    </div>
    <div class="cust-row">
      <div style="width:100%;">Address : <span class="dotted-line" style="width: 85%;">${invoice.customerAddress || 'Showroom Counter Purchase'}</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 45px;" class="text-center">SL. NO.</th>
        <th class="text-left">DESCRIPTION</th>
        <th style="width: 50px;" class="text-center">QTY</th>
        <th style="width: 100px;" class="text-right">UNIT PRICE</th>
        <th style="width: 110px;" class="text-right">AMOUNT (BDT)</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items
        .map(
          (item, idx) => `
        <tr>
          <td class="text-center font-mono font-bold">${idx + 1}</td>
          <td>
            <div class="font-black uppercase" style="font-size: 13px;">${item.productName}${item.capacity ? ` &mdash; ${item.capacity}` : ''}</div>
            ${
              item.includeInstallationFee && (item.installationFee || item.extraPipingFee)
                ? `<div style="font-size: 10px; font-weight: 700; color: #1e293b; margin-top: 2px;">
                    + Installation Fee: ৳${(item.installationFee || 0).toLocaleString()}
                    ${item.extraPipingFt ? ` (${item.extraPipingFt}ft extra piping @ ৳${item.extraPipingFee})` : ''}
                  </div>`
                : ''
            }
          </td>
          <td class="text-center font-mono font-bold">${item.quantity}</td>
          <td class="text-right font-mono font-bold">৳${item.unitPrice.toLocaleString()}</td>
          <td class="text-right font-mono font-black">৳${item.total.toLocaleString()}</td>
        </tr>
      `
        )
        .join('')}

      <tr class="summary-row">
        <td colSpan="3" style="border-right: 1px solid #000000;"></td>
        <td class="text-right">Subtotal:</td>
        <td class="text-right font-mono font-bold">৳${invoice.subtotal.toLocaleString()}</td>
      </tr>

      ${
        invoice.discountTotal > 0
          ? `
      <tr class="summary-row">
        <td colSpan="3" style="border-right: 1px solid #000000;">
          Sl. No: <span class="font-mono" style="font-weight: normal;">${itemSerials || 'Verified at Delivery'}</span>
        </td>
        <td class="text-right">Less Discount:</td>
        <td class="text-right font-mono font-bold">-৳${invoice.discountTotal.toLocaleString()}</td>
      </tr>
      `
          : ''
      }

      <tr style="background: #e2e8f0; font-weight: 900; font-size: 13px;">
        <td colSpan="3" style="font-size: 10.5px; border-right: 1px solid #000000;">
          N.B. Goods Once Sold Are Not Refundable
        </td>
        <td class="text-right uppercase" style="font-size: 11px;">Total Tk.</td>
        <td class="text-right font-mono" style="font-size: 15px; font-weight: 900;">
          ৳${invoice.grandTotal.toLocaleString()}
        </td>
      </tr>
    </tbody>
  </table>

  <div class="taka-summary-grid">
    <div class="taka-box">
      <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569;">Taka (in words) :</span>
      <div class="taka-words">${takaInWords}</div>
    </div>
    <div class="amount-box">
      <div style="display: flex; justify-content: space-between;">
        <span>Paid Amount:</span>
        <span>৳${invoice.paidAmount.toLocaleString()}</span>
      </div>
      ${
        invoice.dueAmount > 0
          ? `<div style="display: flex; justify-content: space-between; border-top: 1px solid #000; margin-top: 4px; padding-top: 4px; font-weight: 900;">
              <span>Due Balance:</span>
              <span>৳${invoice.dueAmount.toLocaleString()}</span>
            </div>`
          : `<div style="text-align: right; border-top: 1px solid #000; margin-top: 4px; padding-top: 4px; font-weight: 900;">
              *** PAID IN FULL ***
            </div>`
      }
    </div>
  </div>

  <div style="border: 1px solid #000; padding: 6px 8px; margin-top: 8px; font-size: 10px; display: flex; flex-wrap: wrap; gap: 6px 18px;">
    <span><strong>Payment Mode:</strong> ${invoice.paymentMode.replace(/_/g, ' ').toUpperCase()}</span>
    <span><strong>Received In:</strong> ${invoice.accountName || 'Unassigned Account'}</span>
    ${invoice.customerPaymentNumber ? `<span><strong>Customer Wallet:</strong> ${invoice.customerPaymentNumber}</span>` : ''}
  </div>

  ${scheduleHtml}

  <div class="signatures">
    <div style="text-align: center;">
      <div class="sig-line">Customer's Signature</div>
    </div>
    <div style="text-align: center;">
      <div style="font-size: 10px; color: #475569; margin-bottom: 2px;">Served by: ${invoice.createdByStaffName || 'Authorized Staff'}</div>
      <div class="sig-line">Authorised Signature</div>
      <div style="font-size: 10px; font-weight: 800;">${brandTitle}</div>
    </div>
  </div>

  <div class="logos-bar" style="grid-template-columns: repeat(${isElectronics ? 3 : 4}, 1fr);">
    <div>
      ${konkaB64 ? `<img src="${konkaB64}" class="logo-img" alt="KONKA" />` : '<strong>KONKA</strong>'}
      <div style="font-size: 8px; font-weight: 800;">LED TV, FRIDGE & APPLIANCES</div>
    </div>
    <div>
      ${greeB64 ? `<img src="${greeB64}" class="logo-img" alt="GREE" />` : '<strong>GREE</strong>'}
      <div style="font-size: 8px; font-weight: 800;">AIR CONDITIONERS & FRIDGE</div>
    </div>
    <div>
      ${haikoB64 ? `<img src="${haikoB64}" class="logo-img" alt="HAIKO" />` : '<strong>HAIKO</strong>'}
      <div style="font-size: 8px; font-weight: 800;">TV, AC & FRIDGE</div>
    </div>
    ${
      !isElectronics
        ? `<div>
            <div style="font-size: 14px; font-weight: 900; letter-spacing: 1px;">HAIER</div>
            <div style="font-size: 8px; font-weight: 800;">INSPIRED LIVING</div>
          </div>`
        : ''
    }
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    alert('Pop-up blocked! Please allow pop-ups for this site to print/export PDF.');
  }
}
