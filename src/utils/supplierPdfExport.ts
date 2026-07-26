import { SupplierRequisition, SupplierPayment } from '../types';
import { AMANOT_ELECTRONICS_ADDRESS } from '../constants/business';

interface Settings {
  amanotElectronicsAddress?: string;
  amanotElectronicsPhone?: string;
  amanotEnterpriseAddress?: string;
  amanotEnterprisePhone?: string;
}

// Convert BDT numeric amount to words helper
function numberToWordsBDT(amount: number): string {
  if (!amount || amount <= 0) return 'Zero Taka Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertChunk(n: number): string {
    let str = '';
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += units[n] + ' ';
    }
    return str;
  }

  let num = Math.floor(amount);
  let words = '';

  if (num >= 10000000) {
    words += convertChunk(Math.floor(num / 10000000)) + 'Crore ';
    num %= 10000000;
  }
  if (num >= 100000) {
    words += convertChunk(Math.floor(num / 100000)) + 'Lakh ';
    num %= 100000;
  }
  if (num >= 1000) {
    words += convertChunk(Math.floor(num / 1000)) + 'Thousand ';
    num %= 1000;
  }
  if (num > 0) {
    words += convertChunk(num);
  }

  return `${words.trim()} Taka Only`;
}

/**
 * Export Branded Supplier Requisition PDF
 * Opens in a new browser tab and automatically invokes window.print()
 */
export function exportSupplierRequisitionPDF(req: SupplierRequisition, settings?: Settings) {
  const isElectronics = req.business === 'amanot_electronics';
  const companyName = isElectronics ? 'AMANOT ELECTRONICS' : 'AMANOT ENTERPRISE';
  const companyTag = isElectronics ? 'Official Distributor: Konka, Gree & Haiko' : 'Official Partner: Haier';
  const address = isElectronics
    ? settings?.amanotElectronicsAddress || AMANOT_ELECTRONICS_ADDRESS
    : settings?.amanotEnterpriseAddress || 'Kallanpur Main Road, Dhaka-1216';
  const phone = isElectronics
    ? settings?.amanotElectronicsPhone || '+880 1871-186562 / 01711-000000'
    : settings?.amanotEnterprisePhone || '+880 1871-186562';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Requisition_${req.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 32px;
      max-width: 850px;
      margin: 0 auto;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .company-title {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .company-tag {
      font-size: 11px;
      font-weight: 700;
      color: #2563eb;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .company-info {
      font-size: 11px;
      color: #475569;
      font-weight: 500;
    }
    .doc-badge {
      text-align: right;
    }
    .doc-title {
      font-size: 18px;
      font-weight: 900;
      color: #7c3aed;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-box {
      margin-top: 6px;
      font-size: 11px;
      font-family: monospace;
      font-weight: 700;
      color: #334155;
    }
    .badge-status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      margin-top: 4px;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
    }
    .card-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .card-heading {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .card-sub {
      font-size: 12px;
      color: #475569;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 10px 12px;
      text-align: left;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
    }
    tr:nth-child(even) { background: #f8fafc; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: monospace; font-weight: 700; }
    .total-box {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 32px;
    }
    .total-card {
      background: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 12px;
      text-align: right;
    }
    .total-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
    .total-val { font-size: 20px; font-weight: 900; font-family: monospace; color: #34d399; }
    .notes-box {
      background: #fffbebfb;
      border: 1px solid #fef3c7;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 11px;
      color: #92400e;
      margin-bottom: 40px;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-top: 60px;
      text-align: center;
    }
    .sig-line {
      border-top: 1.5px dashed #64748b;
      padding-top: 6px;
      font-size: 11px;
      font-weight: 800;
      color: #475569;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-tag">${companyTag}</div>
      <div class="company-title">${companyName}</div>
      <div class="company-info">${address}</div>
      <div class="company-info">Phone: ${phone}</div>
    </div>
    <div class="doc-badge">
      <div class="doc-title">Stock Requisition Order</div>
      <div class="meta-box">REQUISITION #: ${req.id}</div>
      <div class="meta-box">DATE: ${req.requisitionDate}</div>
      <div class="badge-status">PRIORITY: ${req.priority.toUpperCase()}</div>
    </div>
  </div>

  <div class="details-grid">
    <div class="card">
      <div class="card-title">Distributor / Supplier Details</div>
      <div class="card-heading">${req.supplierName}</div>
      <div class="card-sub">Business Partner Assignment: ${isElectronics ? 'Amanot Electronics' : 'Amanot Enterprise'}</div>
      <div class="card-sub">Issued By Staff: <strong>${req.createdByStaffName || 'Store Manager'}</strong></div>
    </div>
    <div class="card">
      <div class="card-title">Requisition Schedule</div>
      <div class="card-sub">Issued Date: <strong>${req.requisitionDate}</strong></div>
      <div class="card-sub">Required By Target Date: <strong>${req.requiredByDate}</strong></div>
      <div class="card-sub">Requisition Status: <span class="badge-status" style="background:#e0e7ff;color:#3730a3;border-color:#c7d2fe;">${req.status.toUpperCase()}</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px;" class="text-center">#</th>
        <th>Requested Item & Specifications</th>
        <th>Brand</th>
        <th class="text-center">Unit</th>
        <th class="text-center">Qty</th>
        <th class="text-right">Est. Unit Price</th>
        <th class="text-right">Total Est. Cost</th>
      </tr>
    </thead>
    <tbody>
      ${req.items
        .map(
          (item, idx) => `
        <tr>
          <td class="text-center font-mono">${idx + 1}</td>
          <td>
            <strong>${item.productName}</strong>
            ${item.category ? `<br/><span style="font-size:10px;color:#64748b;">Cat: ${item.category}</span>` : ''}
            ${item.warranty ? ` | <span style="font-size:10px;color:#0284c7;">Warranty: ${item.warranty}</span>` : ''}
          </td>
          <td><strong>${item.brand || 'N/A'}</strong></td>
          <td class="text-center">${item.unit || 'Pcs'}</td>
          <td class="text-center font-mono" style="font-size:13px;font-weight:800;">${item.quantity}</td>
          <td class="text-right font-mono">৳${(item.costPrice || 0).toLocaleString()}</td>
          <td class="text-right font-mono" style="font-weight:800;">৳${(item.totalCost || item.quantity * item.costPrice).toLocaleString()}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <div class="total-box">
    <div class="total-card">
      <div class="total-label">Total Estimated Shipment Cost</div>
      <div class="total-val">৳${req.totalEstimatedCost.toLocaleString()}</div>
    </div>
  </div>

  ${
    req.notes
      ? `<div class="notes-box"><strong>Requisition Notes & Instructions:</strong><br/>${req.notes}</div>`
      : ''
  }

  <div class="signatures">
    <div class="sig-line">Store Inventory Officer</div>
    <div class="sig-line">Accounts Verified</div>
    <div class="sig-line">Distributor Representative</div>
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
    alert('Pop-up blocked! Please allow pop-ups for this site to export PDF.');
  }
}

/**
 * Export Branded Supplier Payment Voucher PDF
 * Opens in a new browser tab and automatically invokes window.print()
 */
export function exportSupplierPaymentVoucherPDF(sp: SupplierPayment, settings?: Settings) {
  const isElectronics = sp.business === 'amanot_electronics';
  const companyName = isElectronics ? 'AMANOT ELECTRONICS' : 'AMANOT ENTERPRISE';
  const companyTag = isElectronics ? 'Official Distributor: Konka, Gree & Haiko' : 'Official Partner: Haier';
  const address = isElectronics
    ? settings?.amanotElectronicsAddress || AMANOT_ELECTRONICS_ADDRESS
    : settings?.amanotEnterpriseAddress || 'Kallanpur Main Road, Dhaka-1216';
  const phone = isElectronics
    ? settings?.amanotElectronicsPhone || '+880 1871-186562 / 01711-000000'
    : settings?.amanotEnterprisePhone || '+880 1871-186562';

  const amountInWords = numberToWordsBDT(sp.amount);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Voucher_${sp.voucherNo || sp.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 32px;
      max-width: 850px;
      margin: 0 auto;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .company-title {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .company-tag {
      font-size: 11px;
      font-weight: 700;
      color: #2563eb;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .company-info {
      font-size: 11px;
      color: #475569;
      font-weight: 500;
    }
    .doc-badge {
      text-align: right;
    }
    .doc-title {
      font-size: 18px;
      font-weight: 900;
      color: #059669;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-box {
      margin-top: 6px;
      font-size: 11px;
      font-family: monospace;
      font-weight: 700;
      color: #334155;
    }
    .voucher-card {
      background: #f8fafc;
      border: 1.5px dashed #cbd5e1;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 32px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .row:last-child { border-bottom: none; }
    .label {
      font-size: 11px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      width: 180px;
      shrink: 0;
    }
    .val {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      flex: 1;
      text-align: right;
    }
    .amount-highlight {
      background: #0f172a;
      color: #34d399;
      padding: 16px 24px;
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .amount-title { font-size: 12px; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
    .amount-num { font-size: 24px; font-weight: 900; font-family: monospace; }
    .words-box {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 800;
      color: #065f46;
      margin-bottom: 40px;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-top: 60px;
      text-align: center;
    }
    .sig-line {
      border-top: 1.5px dashed #64748b;
      padding-top: 6px;
      font-size: 11px;
      font-weight: 800;
      color: #475569;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-tag">${companyTag}</div>
      <div class="company-title">${companyName}</div>
      <div class="company-info">${address}</div>
      <div class="company-info">Phone: ${phone}</div>
    </div>
    <div class="doc-badge">
      <div class="doc-title">Supplier Payment Voucher</div>
      <div class="meta-box">VOUCHER #: ${sp.voucherNo || `VCH-${sp.id}`}</div>
      <div class="meta-box">PAYMENT DATE: ${sp.paymentDate}</div>
    </div>
  </div>

  <div class="amount-highlight">
    <div class="amount-title">Total Amount Paid</div>
    <div class="amount-num">৳${sp.amount.toLocaleString()}.00</div>
  </div>

  <div class="words-box">
    Amount in Words: ${amountInWords}
  </div>

  <div class="voucher-card">
    <div class="row">
      <div class="label">Paid To Supplier</div>
      <div class="val" style="font-size: 15px; font-weight: 900;">${sp.supplierName}</div>
    </div>
    <div class="row">
      <div class="label">Business Entity</div>
      <div class="val">${isElectronics ? 'Amanot Electronics' : 'Amanot Enterprise'}</div>
    </div>
    <div class="row">
      <div class="label">Purchase Order Ref #</div>
      <div class="val">${sp.purchaseOrderId ? `#${sp.purchaseOrderId}` : 'Direct Supplier Settlement'}</div>
    </div>
    <div class="row">
      <div class="label">Payment Method</div>
      <div class="val" style="text-transform: capitalize;">${sp.paymentMethod.replace('_', ' ')}</div>
    </div>
    <div class="row">
      <div class="label">Disbursed Account</div>
      <div class="val">${sp.accountName}</div>
    </div>
    ${
      sp.paymentMethod === 'cheque'
        ? `
    <div class="row">
      <div class="label">Cheque Details</div>
      <div class="val">Cheque #: ${sp.chequeNo || 'N/A'} | Date: ${sp.chequeDate || 'N/A'} (${(sp.chequeStatus || 'pending').toUpperCase()})</div>
    </div>
    `
        : ''
    }
    <div class="row">
      <div class="label">Recorded By</div>
      <div class="val">${sp.recordedBy || 'Accounts Manager'}</div>
    </div>
    ${
      sp.notes
        ? `
    <div class="row">
      <div class="label">Remarks / Notes</div>
      <div class="val">${sp.notes}</div>
    </div>
    `
        : ''
    }
  </div>

  <div class="signatures">
    <div class="sig-line">Prepared By (Accounts)</div>
    <div class="sig-line">Verified By Manager</div>
    <div class="sig-line">Payee / Supplier Signature</div>
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
    alert('Pop-up blocked! Please allow pop-ups for this site to export PDF.');
  }
}
