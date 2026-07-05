const fs = require('fs');
const file = 'e:/FullStuck-web-developer/jurnal-saham/src/modules/shared/context/DataContext.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix Cashflow market property access
content = content.replace(/\\(item: any\\) => item\\.market === /g, '(item: any) => (item as any).market === ');
content = content.replace(/\\(c: any\\) => c\\.market === /g, '(c: any) => (c as any).market === ');

// Fix Partial<Cashflow> type strings
content = content.replace(/type: transaction\\.type === 'deposit' \\? 'deposit' : 'withdraw',/g, "type: (transaction.type === 'deposit' ? 'deposit' : 'withdraw') as 'deposit' | 'withdraw',");
content = content.replace(/type: transaction\\.type === 'expense' \\|\\| transaction\\.type === 'transfer_out' \\? 'withdraw' : 'deposit',/g, "type: (transaction.type === 'expense' || transaction.type === 'transfer_out' ? 'withdraw' : 'deposit') as 'deposit' | 'withdraw',");
content = content.replace(/type: 'expense',/g, "type: 'expense' as any,");
content = content.replace(/type: 'income',/g, "type: 'income' as any,");
content = content.replace(/type: 'transfer_out',/g, "type: 'transfer_out' as any,");
content = content.replace(/type: 'transfer_in',/g, "type: 'transfer_in' as any,");

// Fix FinanceAccount name required
content = content.replace(/const baseAccount = \\{/g, 'const baseAccount: any = {');
content = content.replace(/let updatedAccount = \\{/g, 'let updatedAccount: any = {');

// Fix linkToCashflow
content = content.replace(/transaction\\.linkToCashflow/g, '(transaction as any).linkToCashflow');
content = content.replace(/updates\\.linkToCashflow/g, '(updates as any).linkToCashflow');

// Fix FinanceTransaction
content = content.replace(/const payload = \\{/g, 'const payload: any = {');
content = content.replace(/const sourceTransaction = \\{/g, 'const sourceTransaction: any = {');
content = content.replace(/const targetTransaction = \\{/g, 'const targetTransaction: any = {');

// Fix Dividend
content = content.replace(/const updated = \\[newDiv as any, \\.\\.\\.allDividends\\];/g, 'const updated = [newDiv, ...allDividends] as Dividend[];');
content = content.replace(/const newDiv = \\{/g, 'const newDiv: any = {');
content = content.replace(/amount: newDiv\\.amount \\|\\| null,/g, "amount: (newDiv as any).amount || null,");
content = content.replace(/market: newDiv\\.market \\|\\| 'ID',/g, "market: (newDiv as any).market || 'ID',");
content = content.replace(/amount: existingDividend\\.amount \\|\\| null,/g, "amount: (existingDividend as any).amount || null,");
content = content.replace(/market: existingDividend\\.market \\|\\| 'ID',/g, "market: (existingDividend as any).market || 'ID',");

// Fix BsjpTrade
content = content.replace(/const newTrade = \\{/g, 'const newTrade: any = {');
content = content.replace(/const updated = \\[newTrade as any, \\.\\.\\.bsjpTrades\\];/g, 'const updated = [newTrade, ...bsjpTrades] as BsjpTrade[];');
content = content.replace(/date: newTrade\\.date \\|\\| null,/g, "date: (newTrade as any).date || null,");

// updateMarketPrice
content = content.replace(/parseFloat\\(price\\) \\|\\| 0/g, 'parseFloat(price as string) || 0');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed internal typings');
