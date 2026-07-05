const fs = require('fs');
const path = require('path');
const file = 'e:/FullStuck-web-developer/jurnal-saham/src/modules/shared/context/DataContext.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /import type \{ AppSettings, Portfolio \} from '@\/modules\/shared\/types\/index';/,
  `import type { AppSettings, Portfolio, Trade, Cashflow, Dividend, WatchlistItem, Note } from '@/modules/shared/types/index';
export interface TradingPlan { id: string; createdAt: string; [key: string]: any; }
export interface BsjpTrade { id: string; createdAt: string; [key: string]: any; }
export interface ToastItem { id: string; message: string; type: string; }
export interface DataContextType {
  trades: Trade[]; allTrades: Trade[]; addTrade: (trade: Partial<Trade>) => Trade | null; updateTrade: (id: string, updates: Partial<Trade>) => void; deleteTrade: (id: string) => void; updateTrades: (ids: string[], updates: Partial<Trade> & { tagsAppend?: string[] }) => void; deleteTrades: (ids: string[]) => void; getTradeById: (id: string) => Trade | undefined;
  watchlist: WatchlistItem[]; addWatchlistItem: (item: Partial<WatchlistItem>) => void; updateWatchlistItem: (id: string, updates: Partial<WatchlistItem>) => void; deleteWatchlistItem: (id: string) => void;
  notes: Note[]; addNote: (note: Partial<Note>) => void; updateNote: (id: string, updates: Partial<Note>) => void; deleteNote: (id: string) => void;
  cashflows: Cashflow[]; allCashflows: Cashflow[]; addCashflow: (cf: Partial<Cashflow>) => Cashflow | null; updateCashflow: (id: string, updates: Partial<Cashflow>) => Cashflow | null; deleteCashflow: (id: string) => Cashflow | null;
  dividends: Dividend[]; allDividends: Dividend[]; addDividend: (div: Partial<Dividend>) => void; deleteDividend: (id: string) => void;
  settings: AppSettings; updateSettings: (updates: Partial<AppSettings>) => void;
  marketPrices: Record<string, number>; updateMarketPrice: (stockCode: string, price: string | number) => void; fetchLivePrices: (stockCodes: string[]) => Promise<void>;
  portfolios: Portfolio[]; activePortfolioId: string; addPortfolio: (name: string, description?: string, financeAccountId?: string) => Portfolio | null; updatePortfolio: (id: string, updates: Partial<Portfolio>) => void; deletePortfolio: (id: string) => void; reorderPortfolios: (orderedIds: string[]) => Portfolio[] | null; selectPortfolio: (id: string) => void;
  tradingPlans: TradingPlan[]; addTradingPlan: (plan: Partial<TradingPlan>) => void; deleteTradingPlan: (id: string) => void;
  ipoEvents: IpoEvent[]; ipoEntries: IpoEntry[]; ipoAccounts: IpoAccount[]; addIpoEvent: any; updateIpoEvent: any; deleteIpoEvent: any; reorderIpoEvents: any; reorderIpoAccounts: any; addIpoAccount: any; updateIpoAccount: any; toggleIpoAccountActive: any; deleteIpoAccount: any; addIpoEntry: any; updateIpoEntry: any; deleteIpoEntry: any; batchAddIpoEntries: any; batchDeleteIpoEntries: any; batchUpdateIpoEntries: any;
  bsjpTrades: BsjpTrade[]; addBsjpTrade: (trade: Partial<BsjpTrade>) => BsjpTrade | null; updateBsjpTrade: (id: string, updates: Partial<BsjpTrade>) => void; deleteBsjpTrade: (id: string) => void;
  financeAccounts: FinanceAccount[]; financeTransactions: FinanceTransaction[]; addFinanceAccount: (account: Partial<FinanceAccount>) => FinanceAccount | null; updateFinanceAccount: (id: string, updates: Partial<FinanceAccount>) => FinanceAccount | null; toggleFinanceAccountActive: (id: string) => FinanceAccount | null; deleteFinanceAccount: (id: string) => FinanceAccount | null; reorderFinanceAccounts: (orderedIds: string[]) => FinanceAccount[] | null;
  addFinanceTransaction: (transaction: Partial<FinanceTransaction>) => FinanceTransaction | null; updateFinanceTransaction: (id: string, updates: Partial<FinanceTransaction>) => FinanceTransaction | null; deleteFinanceTransaction: (id: string) => FinanceTransaction | null; createFinanceTransfer: (transfer: any) => any; createFinancePortfolioTransfer: (transfer: any) => any; createPortfolioToFinanceTransfer: (transfer: any) => any; getFinanceTransactionsByAccount: (accountId: string) => FinanceTransaction[]; getFinanceAccountCurrentBalance: (accountId: string) => number; getFinanceSummary: () => any;
  dataLoading: boolean; dataError: string; databaseSetupError: string; usedLocalCacheFallback: boolean; exportData: () => any; importData: (data: any) => Promise<void>; clearData: () => Promise<void>;
  toasts: ToastItem[]; showToast: (message: string, type?: string) => void;
  tradeFormDraft: any; setTradeFormDraft: (val: any) => void; tradeEditDraft: any; setTradeEditDraft: (val: any) => void; noteFormDraft: any; setNoteFormDraft: (val: any) => void; watchlistFormDraft: any; setWatchlistFormDraft: (val: any) => void; cashflowFormDraft: any; setCashflowFormDraft: (val: any) => void; dividendFormDraft: any; setDividendFormDraft: (val: any) => void; calculatorActiveTab: string; setCalculatorActiveTab: (val: string) => void; calculatorDrafts: any; setCalculatorDrafts: (val: any) => void; canWrite: boolean;
}`
);

content = content.replace(/const DataContext = createContext\(null\);/, 'const DataContext = createContext<DataContextType | null>(null);');

content = content.replace(/const \[allTrades, setAllTrades\] = useState\(\[\]\);/, 'const [allTrades, setAllTrades] = useState<Trade[]>([]);');
content = content.replace(/const \[watchlist, setWatchlist\] = useState\(\[\]\);/, 'const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);');
content = content.replace(/const \[notes, setNotes\] = useState\(\[\]\);/, 'const [notes, setNotes] = useState<Note[]>([]);');
content = content.replace(/const \[allCashflows, setAllCashflows\] = useState\(\[\]\);/, 'const [allCashflows, setAllCashflows] = useState<Cashflow[]>([]);');
content = content.replace(/const \[allDividends, setAllDividends\] = useState\(\[\]\);/, 'const [allDividends, setAllDividends] = useState<Dividend[]>([]);');
content = content.replace(/const \[tradingPlans, setTradingPlans\] = useState\(\[\]\);/, 'const [tradingPlans, setTradingPlans] = useState<TradingPlan[]>([]);');
content = content.replace(/const \[bsjpTrades, setBsjpTrades\] = useState<any\[\]>\(\[\]\);/, 'const [bsjpTrades, setBsjpTrades] = useState<BsjpTrade[]>([]);');
content = content.replace(/const \[toasts, setToasts\] = useState\(\[\]\);/, 'const [toasts, setToasts] = useState<ToastItem[]>([]);');

content = content.replace(/const applyData = useCallback\(\(data\) => \{/, 'const applyData = useCallback((data: any) => {');
content = content.replace(/const showToast = useCallback\(\(message, type = 'success'\) => \{/, 'const showToast = useCallback((message: string, type: string = "success") => {');
content = content.replace(/const ensureWritable = useCallback\(\(\) => \{/, 'const ensureWritable = useCallback((): boolean => {');
content = content.replace(/const logUserActivity = useCallback\(\(action, targetType, targetId, metadata = \{\}\) => \{/, 'const logUserActivity = useCallback((action: string, targetType: string, targetId: string, metadata: any = {}) => {');

content = content.replace(/const saveTrades = useCallback\(\(newTrades\) => \{/, 'const saveTrades = useCallback((newTrades: Trade[]) => {');
content = content.replace(/const addTrade = \(trade\) => \{/, 'const addTrade = (trade: Partial<Trade>) => {');
content = content.replace(/const updateTrade = \(id, updates\) => \{/, 'const updateTrade = (id: string, updates: Partial<Trade>) => {');
content = content.replace(/const deleteTrade = \(id\) => \{/, 'const deleteTrade = (id: string) => {');
content = content.replace(/const updateTrades = \(ids, updates\) => \{/, 'const updateTrades = (ids: string[], updates: Partial<Trade> & { tagsAppend?: string[] }) => {');
content = content.replace(/const deleteTrades = \(ids\) => \{/, 'const deleteTrades = (ids: string[]) => {');
content = content.replace(/const getTradeById = \(id\) => allTrades.find\(t => t.id === id\);/, 'const getTradeById = (id: string) => allTrades.find(t => t.id === id);');

content = content.replace(/const addWatchlistItem = \(item\) => \{/, 'const addWatchlistItem = (item: Partial<WatchlistItem>) => {');
content = content.replace(/const updateWatchlistItem = \(id, updates\) => \{/, 'const updateWatchlistItem = (id: string, updates: Partial<WatchlistItem>) => {');
content = content.replace(/const deleteWatchlistItem = \(id\) => \{/, 'const deleteWatchlistItem = (id: string) => {');

content = content.replace(/const addNote = \(note\) => \{/, 'const addNote = (note: Partial<Note>) => {');
content = content.replace(/const updateNote = \(id, updates\) => \{/, 'const updateNote = (id: string, updates: Partial<Note>) => {');
content = content.replace(/const deleteNote = \(id\) => \{/, 'const deleteNote = (id: string) => {');

content = content.replace(/const createCashflowRecord = useCallback\(\(cf, options: any = \{\}\) => \{/, 'const createCashflowRecord = useCallback((cf: Partial<Cashflow>, options: any = {}) => {');
content = content.replace(/const updateCashflowRecord = useCallback\(\(id, updates, options: any = \{\}\) => \{/, 'const updateCashflowRecord = useCallback((id: string, updates: Partial<Cashflow>, options: any = {}) => {');
content = content.replace(/const deleteCashflowRecord = useCallback\(\(id, options: any = \{\}\) => \{/, 'const deleteCashflowRecord = useCallback((id: string, options: any = {}) => {');
content = content.replace(/const addCashflow = \(cf\) => \{/, 'const addCashflow = (cf: Partial<Cashflow>) => {');
content = content.replace(/const updateCashflow = \(id, updates\) => \{/, 'const updateCashflow = (id: string, updates: Partial<Cashflow>) => {');
content = content.replace(/const deleteCashflow = \(id\) => \{/, 'const deleteCashflow = (id: string) => {');

content = content.replace(/const saveFinanceAccounts = useCallback\(\(nextAccounts\) => \{/, 'const saveFinanceAccounts = useCallback((nextAccounts: FinanceAccount[]) => {');
content = content.replace(/const saveFinanceTransactions = useCallback\(\(nextTransactions\) => \{/, 'const saveFinanceTransactions = useCallback((nextTransactions: FinanceTransaction[]) => {');

content = content.replace(/const buildCashflowPayloadFromFinanceTransaction = useCallback\(\(transaction\) => \{/, 'const buildCashflowPayloadFromFinanceTransaction = useCallback((transaction: any) => {');
content = content.replace(/const upsertLinkedCashflowForFinanceTransaction = useCallback\(\(transaction\) => \{/, 'const upsertLinkedCashflowForFinanceTransaction = useCallback((transaction: any) => {');
content = content.replace(/const removeLinkedCashflowForFinanceTransaction = useCallback\(\(transaction\) => \{/, 'const removeLinkedCashflowForFinanceTransaction = useCallback((transaction: any) => {');

content = content.replace(/const addFinanceAccount = \(account\) => \{/, 'const addFinanceAccount = (account: Partial<FinanceAccount>) => {');
content = content.replace(/const updateFinanceAccount = \(id, updates\) => \{/, 'const updateFinanceAccount = (id: string, updates: Partial<FinanceAccount>) => {');
content = content.replace(/const toggleFinanceAccountActive = \(id\) => \{/, 'const toggleFinanceAccountActive = (id: string) => {');
content = content.replace(/const deleteFinanceAccount = \(id\) => \{/, 'const deleteFinanceAccount = (id: string) => {');

content = content.replace(/const addFinanceTransaction = \(transaction\) => \{/, 'const addFinanceTransaction = (transaction: Partial<FinanceTransaction>) => {');
content = content.replace(/const updateFinanceTransaction = \(id, updates\) => \{/, 'const updateFinanceTransaction = (id: string, updates: Partial<FinanceTransaction>) => {');
content = content.replace(/const deleteFinanceTransaction = \(id\) => \{/, 'const deleteFinanceTransaction = (id: string) => {');

content = content.replace(/const createFinancePortfolioTransfer = \(transfer\) => \{/, 'const createFinancePortfolioTransfer = (transfer: any) => {');
content = content.replace(/const createPortfolioToFinanceTransfer = \(transfer\) => \{/, 'const createPortfolioToFinanceTransfer = (transfer: any) => {');
content = content.replace(/const createFinanceTransfer = \(transfer\) => \{/, 'const createFinanceTransfer = (transfer: any) => {');

content = content.replace(/const addDividend = \(div\) => \{/, 'const addDividend = (div: Partial<Dividend>) => {');
content = content.replace(/const deleteDividend = \(id\) => \{/, 'const deleteDividend = (id: string) => {');

content = content.replace(/const addPortfolio = \(name, description = '', financeAccountId = ''\) => \{/, 'const addPortfolio = (name: string, description: string = "", financeAccountId: string = "") => {');
content = content.replace(/const updatePortfolio = \(id, updates\) => \{/, 'const updatePortfolio = (id: string, updates: Partial<Portfolio>) => {');
content = content.replace(/const deletePortfolio = \(id\) => \{/, 'const deletePortfolio = (id: string) => {');
content = content.replace(/const selectPortfolio = \(id\) => \{/, 'const selectPortfolio = (id: string) => {');

content = content.replace(/const addTradingPlan = \(plan\) => \{/, 'const addTradingPlan = (plan: Partial<TradingPlan>) => {');
content = content.replace(/const deleteTradingPlan = \(id\) => \{/, 'const deleteTradingPlan = (id: string) => {');

content = content.replace(/const addBsjpTrade = \(trade\) => \{/, 'const addBsjpTrade = (trade: Partial<BsjpTrade>) => {');
content = content.replace(/const updateBsjpTrade = \(id, updates\) => \{/, 'const updateBsjpTrade = (id: string, updates: Partial<BsjpTrade>) => {');
content = content.replace(/const deleteBsjpTrade = \(id\) => \{/, 'const deleteBsjpTrade = (id: string) => {');

content = content.replace(/const updateSettings = \(updates\) => \{/, 'const updateSettings = (updates: Partial<AppSettings>) => {');
content = content.replace(/const updateMarketPrice = \(stockCode, price\) => \{/, 'const updateMarketPrice = (stockCode: string, price: string | number) => {');
content = content.replace(/const importData = async \(data\) => \{/, 'const importData = async (data: any) => {');

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully refactored DataContext.tsx');
