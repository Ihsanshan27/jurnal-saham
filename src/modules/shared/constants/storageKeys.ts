export const ALL_STORAGE_KEYS = [
  'trades',
  'watchlist',
  'notes',
  'cashflows',
  'dividends',
  'settings',
  'marketPrices',
  'portfolios',
  'tradingPlans',
  'ipoEvents',
  'ipoEntries',
  'ipoAccounts',
  'bsjpTrades',
  'financeAccounts',
  'financeTransactions',
  'assets',
] as const;

export type StorageKey = (typeof ALL_STORAGE_KEYS)[number];
