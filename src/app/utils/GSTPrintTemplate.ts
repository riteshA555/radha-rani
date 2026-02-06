
import { BusinessProfileSettings } from '../../types/settings';
import { formatIndianRupees } from '../../shared/utils/formatters';

interface GSTPrintProps {
    type: 'GSTR1' | 'GSTR3B';
    period: string; // "YYYY-MM"
    businessProfile: BusinessProfileSettings | null;
    orders: any[]; // GSTR-1 Data
    expenses: any[]; // ITC Data
    breakdown: any[]; // Summary Data
}

export const generateGSTPrintHTML = ({ type, period, businessProfile, orders, expenses, breakdown }: GSTPrintProps) => {
    const [year, month] = period.split('-');
    const periodLabel = new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    const reportTitle = type === 'GSTR1' ? 'GSTR-1 (Outward Supplies)' : 'GSTR-3B (Summary Return)';

    // Calculate Totals for Summary
    const totalTaxable = breakdown.reduce((sum: number, b: any) => sum + b.taxableValue, 0);
    const totalIGST = breakdown.reduce((sum: number, b: any) => sum + b.igst, 0);
    const totalCGST = breakdown.reduce((sum: number, b: any) => sum + b.cgst, 0);
    const totalSGST = breakdown.reduce((sum: number, b: any) => sum + b.sgst, 0);
    const totalTax = totalIGST + totalCGST + totalSGST;

    // GSTR-1 Rows (Sales)
    const rows = type === 'GSTR1' ? orders.map((o: any) => {
        const stateMatch = !o.customer?.state || !businessProfile?.state || o.customer.state.toLowerCase() === businessProfile.state.toLowerCase();
        const tax = Number(o.gst_amount);
        const igst = stateMatch ? 0 : tax;
        const cgst = stateMatch ? tax / 2 : 0;
        const sgst = stateMatch ? tax / 2 : 0;

        return `
        <tr>
            <td>${new Date(o.order_date).toLocaleDateString()}</td>
            <td>${o.order_number}</td>
            <td>${o.customer?.git_number || ''}</td>
            <td>${o.customer?.name || 'Cash Customer'}</td>
            <td>${o.customer?.state || ''}</td>
            <td class="text-right">${formatIndianRupees(Number(o.gst_rate))}%</td>
            <td class="text-right">${formatIndianRupees(Number(o.subtotal))}</td>
            <td class="text-right">${igst > 0 ? formatIndianRupees(igst) : '-'}</td>
            <td class="text-right">${cgst > 0 ? formatIndianRupees(cgst) : '-'}</td>
            <td class="text-right">${sgst > 0 ? formatIndianRupees(sgst) : '-'}</td>
        </tr>
       `;
    }).join('') : '';

    return `
    <html>
      <head>
        <title>${reportTitle} - ${periodLabel}</title>
        <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Helvetica', sans-serif; font-size: 10pt; color: #333; line-height: 1.4; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .header h1 { margin: 0; font-size: 18pt; text-transform: uppercase; }
            .header .meta { text-align: right; }
            .header .meta div { font-weight: bold; }
            
            .biz-info { margin-bottom: 20px; }
            .biz-info h3 { margin: 0 0 5px 0; font-size: 14pt; }
            .biz-info p { margin: 0; color: #666; }

            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9pt; }
            th { border: 1px solid #999; padding: 8px; background: #f0f0f0; text-align: left; font-weight: bold; }
            td { border: 1px solid #ddd; padding: 6px 8px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            
            .summary-box { border: 1px solid #333; padding: 15px; margin-bottom: 20px; background: #fafafa; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px dotted #ccc; padding-bottom: 2px; }
            .summary-row:last-child { border: none; font-weight: bold; font-size: 11pt; margin-top: 10px; }

            .footer { margin-top: 30px; font-size: 8pt; color: #999; border-top: 1px solid #eee; padding-top: 10px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
            <div>
                <h1>${reportTitle}</h1>
                <div>Period: ${periodLabel}</div>
            </div>
            <div class="meta">
                <div>FY ${year}-${Number(year) + 1}</div>
                <div>Generated: ${new Date().toLocaleDateString()}</div>
            </div>
        </div>

        <div class="biz-info">
            <h3>${businessProfile?.businessName || 'Business Name'}</h3>
            <p>GSTIN: <strong>${businessProfile?.gstin || '-'}</strong></p>
            <p>${businessProfile?.address || ''}, ${businessProfile?.city || ''} - ${businessProfile?.pincode || ''}</p>
        </div>

        ${breakdown.length > 0 ? `
            <div class="summary-box">
                <h4 style="margin-top:0;">Tax Liability Summary</h4>
                <div class="summary-row"><span>Total Taxable Value</span><span>₹${formatIndianRupees(totalTaxable)}</span></div>
                <div class="summary-row"><span>IGST Output</span><span>₹${formatIndianRupees(totalIGST)}</span></div>
                <div class="summary-row"><span>CGST Output</span><span>₹${formatIndianRupees(totalCGST)}</span></div>
                <div class="summary-row"><span>SGST Output</span><span>₹${formatIndianRupees(totalSGST)}</span></div>
                <div class="summary-row"><span>Total Tax Payable</span><span>₹${formatIndianRupees(totalTax)}</span></div>
            </div>
        ` : ''}

        ${type === 'GSTR1' ? `
            <h3>B2B & B2C Invoices</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 80px;">Date</th>
                        <th style="width: 100px;">Invoice No</th>
                        <th>GSTIN</th>
                        <th>Customer Name</th>
                        <th style="width: 80px;">Place</th>
                        <th class="text-right" style="width: 50px;">Rate</th>
                        <th class="text-right" style="width: 100px;">Taxable Ref</th>
                        <th class="text-right" style="width: 80px;">IGST</th>
                        <th class="text-right" style="width: 80px;">CGST</th>
                        <th class="text-right" style="width: 80px;">SGST</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                    <tr style="background:#f9f9f9; font-weight:bold;">
                        <td colspan="6" class="text-right">TOTAL</td>
                        <td class="text-right">${formatIndianRupees(totalTaxable)}</td>
                        <td class="text-right">${formatIndianRupees(totalIGST)}</td>
                        <td class="text-right">${formatIndianRupees(totalCGST)}</td>
                        <td class="text-right">${formatIndianRupees(totalSGST)}</td>
                    </tr>
                </tbody>
            </table>
        ` : `
            <h3>GSTR-3B Summary</h3>
            <p>This is a summarized view of your monthly return liabilities.</p>
             <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th class="text-right">Taxable Value</th>
                        <th class="text-right">IGST</th>
                        <th class="text-right">CGST</th>
                        <th class="text-right">SGST</th>
                        <th class="text-right">Cess</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Outward Supplies (Sales)</td>
                        <td class="text-right">${formatIndianRupees(totalTaxable)}</td>
                        <td class="text-right">${formatIndianRupees(totalIGST)}</td>
                        <td class="text-right">${formatIndianRupees(totalCGST)}</td>
                        <td class="text-right">${formatIndianRupees(totalSGST)}</td>
                        <td class="text-right">0.00</td>
                    </tr>
                     <tr>
                        <td>Inward Supplies (ITC)</td>
                        <td class="text-right">-</td>
                        <td class="text-right">-</td>
                        <td class="text-right">-</td>
                        <td class="text-right">-</td>
                        <td class="text-right">-</td>
                    </tr>
                     <tr>
                        <td><strong>Net Tax Payable</strong></td>
                        <td class="text-right">-</td>
                        <td class="text-right"><strong>${formatIndianRupees(totalIGST)}</strong></td>
                        <td class="text-right"><strong>${formatIndianRupees(totalCGST)}</strong></td>
                        <td class="text-right"><strong>${formatIndianRupees(totalSGST)}</strong></td>
                        <td class="text-right">0.00</td>
                    </tr>
                </tbody>
            </table>
        `}

        <div class="footer">
            Generated by SterlingFlow ERP on ${new Date().toLocaleString()}
        </div>
      </body>
    </html>
  `;
}
