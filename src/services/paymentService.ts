import { recordPayment, getCustomerStatement, getAssetLedgers } from './accountingService';
import { cacheStore } from './cacheStore';

export const addCustomerPayment = async (ledgerId: string, amount: number, mode: string, note: string) => {
    return await recordPayment(ledgerId, amount, mode, note);
};

export const getCustomerLedgerEntries = async (ledgerId: string, startDate?: string, endDate?: string) => {
    return await getCustomerStatement(ledgerId, startDate, endDate);
};

export const getCustomersForPayment = async () => {
    return await getAssetLedgers();
};
