import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AppSettings, BusinessType } from '../types';
import { AMANOT_ELECTRONICS_ADDRESS } from '../constants/business';

export interface ReportSection {
  heading: string;
  tableHeaders: string[];
  tableData: (string | number)[][];
}

export interface ReportPdfOptions {
  title: string;
  subtitle?: string;
  businessScope: 'all' | BusinessType;
  dateFilterText: string;
  generatedBy: string;
  settings: AppSettings;
  summaryMetrics?: Array<{ label: string; value: string }>;
  // Single-table mode (backwards compatible)
  tableHeaders?: string[];
  tableData?: (string | number)[][];
  // Multi-section mode: renders each section with its own heading + table
  sections?: ReportSection[];
  fileName?: string;
}

export const generateBrandedReportPDF = (options: ReportPdfOptions) => {
  const {
    title,
    subtitle,
    businessScope,
    dateFilterText,
    generatedBy,
    settings,
    summaryMetrics = [],
    tableHeaders,
    tableData,
    sections,
    fileName
  } = options;

  // Normalize to a list of sections (single-table callers still work).
  const renderSections: ReportSection[] =
    sections && sections.length > 0
      ? sections
      : [{ heading: '', tableHeaders: tableHeaders || [], tableData: tableData || [] }];

  const doc = new jsPDF('p', 'mm', 'a4');

  const isElectronicsOnly = businessScope === 'amanot_electronics';
  const isEnterpriseOnly = businessScope === 'amanot_enterprise';

  // Header Colors
  let primaryR = 15; // Dark Slate / Blue
  let primaryG = 23;
  let primaryB = 42;

  if (isElectronicsOnly) {
    primaryR = 30; // Deep Indigo/Blue
    primaryG = 58;
    primaryB = 138;
  } else if (isEnterpriseOnly) {
    primaryR = 6; // Deep Emerald
    primaryG = 78;
    primaryB = 59;
  }

  // Draw Header Banner
  doc.setFillColor(primaryR, primaryG, primaryB);
  doc.rect(0, 0, 210, 32, 'F');

  // Title Branding
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');

  let companyName = 'AMANOT GROUP (ELECTRONICS & ENTERPRISE)';
  let subHeaderLine = 'Authorized Outlets: Konka, Gree, Haiko & Haier Home Appliances';
  let phoneLine = `Electronics: ${settings.amanotElectronicsPhone || 'N/A'} | Enterprise: ${settings.amanotEnterprisePhone || 'N/A'}`;
  let addressLine = `${settings.amanotElectronicsAddress || AMANOT_ELECTRONICS_ADDRESS}`;

  if (isElectronicsOnly) {
    companyName = 'AMANOT ELECTRONICS';
    subHeaderLine = 'Authorized Sales & Service Center (Konka, Gree & Haiko)';
    phoneLine = `Phone: ${settings.amanotElectronicsPhone || 'N/A'}`;
    addressLine = `Address: ${settings.amanotElectronicsAddress || AMANOT_ELECTRONICS_ADDRESS}`;
  } else if (isEnterpriseOnly) {
    companyName = 'AMANOT ENTERPRISE';
    subHeaderLine = 'Authorized Outlet for Haier Home Appliances';
    phoneLine = `Phone: ${settings.amanotEnterprisePhone || 'N/A'}`;
    addressLine = `Address: ${settings.amanotEnterpriseAddress || 'Rangpur, Bangladesh'}`;
  }

  doc.text(companyName, 14, 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(subHeaderLine, 14, 18);
  doc.text(`${phoneLine}   •   ${addressLine}`, 14, 24);

  // Date Generated & Badge on Right
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL AUDIT REPORT', 196, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 196, 18, { align: 'right' });
  doc.text(`By: ${generatedBy}`, 196, 24, { align: 'right' });

  // Report Title Box
  let y = 38;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, 182, 16, 2, 2, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), 18, y + 7);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const scopeText = isElectronicsOnly
    ? 'Amanot Electronics Branch'
    : isEnterpriseOnly
    ? 'Amanot Enterprise Branch'
    : 'Global Combined Group Scope';
  doc.text(`Scope: ${scopeText}   |   Period: ${dateFilterText}`, 18, y + 12);

  if (subtitle) {
    doc.text(subtitle, 190, y + 12, { align: 'right' });
  }

  y += 20;

  // KPI Summary Metrics Boxes if available
  if (summaryMetrics.length > 0) {
    const boxCount = Math.min(summaryMetrics.length, 4);
    const boxWidth = (182 - (boxCount - 1) * 3) / boxCount;

    summaryMetrics.slice(0, 4).forEach((metric, idx) => {
      const bx = 14 + idx * (boxWidth + 3);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(bx, y, boxWidth, 14, 1.5, 1.5, 'FD');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(metric.label.toUpperCase(), bx + 3, y + 5);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryR, primaryG, primaryB);
      doc.text(metric.value, bx + 3, y + 11);
    });

    y += 18;
  }

  const pageBottom = doc.internal.pageSize.height;

  const drawFooter = (data: any) => {
    const totalPages = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : 1;
    const currentPage = data.pageNumber;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageBottom - 12, 196, pageBottom - 12);
    doc.text('Amanot Group ERP System • Confidential Financial & Inventory Audit Record', 14, pageBottom - 7);
    doc.text(`Page ${currentPage} of ${totalPages}`, 196, pageBottom - 7, { align: 'right' });
  };

  // Render every section with its own heading + table, flowing down the page.
  renderSections.forEach((section, sIdx) => {
    // Section heading (skipped for the unnamed single-table fallback)
    if (section.heading) {
      if (sIdx > 0) y += 6;
      if (y + 14 > pageBottom - 20) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(primaryR, primaryG, primaryB);
      doc.roundedRect(14, y, 182, 8, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(section.heading.toUpperCase(), 18, y + 5.4);
      y += 11;
    }

    if (!section.tableData || section.tableData.length === 0) {
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('No records in the selected audit period / scope.', 16, y + 2);
      y += 8;
      return;
    }

    autoTable(doc, {
      startY: y,
      head: [section.tableHeaders],
      body: section.tableData,
      margin: { left: 14, right: 14, bottom: 25 },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        font: 'helvetica',
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [primaryR, primaryG, primaryB],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left'
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawPage: drawFooter
    });

    y = ((doc as any).lastAutoTable?.finalY || y) + 4;
  });

  // Add Formal Signatures on the last page if space allows
  const finalY = (doc as any).lastAutoTable?.finalY || y + 50;
  const pageHeight = doc.internal.pageSize.height;

  let sigY = finalY + 20;
  if (sigY + 25 > pageHeight - 15) {
    doc.addPage();
    sigY = 30;
  }

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);

  // Left Signature: Prepared By
  doc.line(20, sigY, 70, sigY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Prepared By (Accounts Officer)', 20, sigY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Staff: ${generatedBy}`, 20, sigY + 9);

  // Right Signature: Managing Director / Proprietor
  doc.line(140, sigY, 190, sigY);
  doc.setFont('helvetica', 'bold');
  doc.text('Approved By (Proprietor)', 140, sigY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('Amanot Group Management', 140, sigY + 9);

  // Save Document
  const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
  const outName = fileName || `Amanot_Report_${cleanTitle}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(outName);
};
