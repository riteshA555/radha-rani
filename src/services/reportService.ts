import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const formatLedgerForExport = (ledgerName: string, transactions: any[]) => {
    return transactions.map(t => ({
        Date: t.date,
        Description: t.description || '',
        'Debit (DR)': t.debit || 0,
        'Credit (CR)': t.credit || 0,
        Balance: (t.debit || 0) - (t.credit || 0)
    }));
};
