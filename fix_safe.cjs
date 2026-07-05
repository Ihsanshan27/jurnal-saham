const fs = require('fs');
const file = 'e:/FullStuck-web-developer/jurnal-saham/src/modules/shared/context/DataContext.tsx';
let content = fs.readFileSync(file, 'utf8');

// replace the import line safely
content = content.replace(
  /import type \{ AppSettings, Portfolio, Trade, Cashflow, Dividend, WatchlistItem, Note \} from '@\/modules\/shared\/types\/index';/,
  "import type { AppSettings, Portfolio, Trade, Cashflow, Dividend, WatchlistItem, Note, BsjpTrade, TradingPlan } from '@/modules/shared/types/index';"
);

// remove the dummy interfaces safely
content = content.replace(/export interface TradingPlan \{ id: string; createdAt: string; \[key: string\]: any; \}\n/g, '');
content = content.replace(/export interface BsjpTrade \{ id: string; createdAt: string; \[key: string\]: any; \}\n/g, '');

// fix function return signatures safely
content = content.replace(/const addTrade = \(trade: Partial<Trade>\) => \{/g, 'const addTrade = (trade: Partial<Trade>): any => {');
content = content.replace(/const addCashflow = \(cf: Partial<Cashflow>\) => \{/g, 'const addCashflow = (cf: Partial<Cashflow>): any => {');
content = content.replace(/const addFinanceAccount = \(account: Partial<FinanceAccount>\) => \{/g, 'const addFinanceAccount = (account: Partial<FinanceAccount>): any => {');
content = content.replace(/const addFinanceTransaction = \(transaction: Partial<FinanceTransaction>\) => \{/g, 'const addFinanceTransaction = (transaction: Partial<FinanceTransaction>): any => {');
content = content.replace(/const addBsjpTrade = \(trade: Partial<BsjpTrade>\) => \{/g, 'const addBsjpTrade = (trade: Partial<BsjpTrade>): any => {');

// Fix update methods
content = content.replace(/const updateFinanceAccount = \(id: string, updates: Partial<FinanceAccount>\) => \{/g, 'const updateFinanceAccount = (id: string, updates: Partial<FinanceAccount>): any => {');
content = content.replace(/const updateCashflow = \(id: string, updates: Partial<Cashflow>\) => \{/g, 'const updateCashflow = (id: string, updates: Partial<Cashflow>): any => {');

// fix array destructuring issues safely
content = content.replace(/const updated = \[newTrade, \.\.\.allTrades\];/g, 'const updated = [newTrade as any, ...allTrades];');
content = content.replace(/const updated = \[newDiv, \.\.\.allDividends\];/g, 'const updated = [newDiv as any, ...allDividends];');
content = content.replace(/const updated = \[newPlan, \.\.\.tradingPlans\];/g, 'const updated = [newPlan as any, ...tradingPlans];');
content = content.replace(/const updated = \[newTrade, \.\.\.bsjpTrades\];/g, 'const updated = [newTrade as any, ...bsjpTrades];');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed imports and signatures safely');
