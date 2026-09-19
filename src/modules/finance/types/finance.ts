export type FinanceAccountType = 'bank' | 'ewallet';

export type FinanceTransactionType =
  | 'income'
  | 'expense'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment';

export interface FinanceAccount {
  id: string;
  name: string;
  institutionName: string;
  type: FinanceAccountType;
  currency: 'IDR' | 'USD';
  openingBalance: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FinanceTransaction {
  id: string;
  accountId: string;
  type: FinanceTransactionType;
  amount: number;
  date: string;
  description: string;
  notes?: string;
  counterpartyAccountId?: string;
  linkedCashflowId?: string;
  linkedPortfolioId?: string;
  cashflowSyncMode?: 'mirror' | 'transfer_to_portfolio' | 'transfer_from_portfolio';
  category?: string;
  tags?: string[];
  transferGroupId?: string;
  exchangeRate?: number;
  targetAmount?: number;
  createdAt: string;
  updatedAt?: string;
}
