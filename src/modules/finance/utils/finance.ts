import type { FinanceAccount, FinanceTransaction, FinanceTransactionType } from '@/modules/finance/types/finance';

export const FINANCE_ACCOUNT_TYPE_OPTIONS = [
  { value: 'bank', label: 'Bank' },
  { value: 'ewallet', label: 'E-Wallet' },
] as const;

export const FINANCE_TRANSACTION_TYPE_OPTIONS = [
  { value: 'income', label: 'Pemasukan' },
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'adjustment', label: 'Adjustment' },
] as const;

export function getFinanceTransactionDelta(transaction: Pick<FinanceTransaction, 'type' | 'amount'>) {
  const amount = Number(transaction.amount) || 0;

  switch (transaction.type) {
    case 'income':
    case 'transfer_in':
      return Math.abs(amount);
    case 'expense':
    case 'transfer_out':
      return -Math.abs(amount);
    case 'adjustment':
      return amount;
    default:
      return 0;
  }
}

export function getFinanceTransactionAmountForDisplay(transaction: Pick<FinanceTransaction, 'type' | 'amount'>) {
  const delta = getFinanceTransactionDelta(transaction);
  return delta === 0 ? 0 : delta;
}

export function getFinanceAccountBalance(account: Pick<FinanceAccount, 'openingBalance' | 'id'>, transactions: FinanceTransaction[]) {
  const openingBalance = Number(account.openingBalance) || 0;
  const netTransactions = transactions
    .filter((item) => item.accountId === account.id)
    .reduce((total, item) => total + getFinanceTransactionDelta(item), 0);

  return openingBalance + netTransactions;
}

export function buildFinanceOverview(accounts: FinanceAccount[], transactions: FinanceTransaction[], usdToIdrRate: number = 16200) {
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const activeAccounts = accounts.filter((account) => account.isActive);

  const totalBalance = accounts.reduce((total, account) => {
    const bal = getFinanceAccountBalance(account, transactions);
    const rate = account.currency === 'USD' ? usdToIdrRate : 1;
    return total + (bal * rate);
  }, 0);

  const getTxRate = (item: FinanceTransaction) => {
    const acc = accountMap.get(item.accountId);
    return acc?.currency === 'USD' ? (item.exchangeRate || usdToIdrRate) : 1;
  };

  const totalIncome = transactions
    .filter((item) => item.type === 'income')
    .reduce((total, item) => total + (Math.abs(Number(item.amount) || 0) * getTxRate(item)), 0);

  const totalExpense = transactions
    .filter((item) => item.type === 'expense')
    .reduce((total, item) => total + (Math.abs(Number(item.amount) || 0) * getTxRate(item)), 0);

  const totalLinkedToTrading = transactions
    .filter((item) => Boolean(item.linkedCashflowId))
    .reduce((total, item) => total + (Math.abs(Number(item.amount) || 0) * getTxRate(item)), 0);

  return {
    totalBalance,
    totalIncome,
    totalExpense,
    totalLinkedToTrading,
    activeAccounts: activeAccounts.length,
    inactiveAccounts: accounts.length - activeAccounts.length,
    transactionCount: transactions.length,
  };
}

export function isTransferTransaction(type: FinanceTransactionType) {
  return type === 'transfer_in' || type === 'transfer_out';
}

export function getFinanceTransactionTypeLabel(type: FinanceTransactionType) {
  switch (type) {
    case 'income':
      return 'Pemasukan';
    case 'expense':
      return 'Pengeluaran';
    case 'transfer_in':
      return 'Transfer Masuk';
    case 'transfer_out':
      return 'Transfer Keluar';
    case 'adjustment':
      return 'Adjustment';
    default:
      return type;
  }
}
