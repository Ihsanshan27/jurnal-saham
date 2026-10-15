import { FinanceAccount, FinanceTransaction, FinanceTransactionType } from '@/modules/finance/types/finance';
import { getFinanceTransactionAmountForDisplay, getFinanceTransactionTypeLabel } from '@/modules/finance/utils/finance';
import { formatDate, formatDateTime, formatRupiah, formatUSD } from '@/modules/shared/utils/formatters';

export interface ParsedLedgerRow {
  id?: string;
  date: string;
  type: FinanceTransactionType;
  amount: number;
  description: string;
  category?: string;
  notes?: string;
  rawIn?: number;
  rawOut?: number;
  isDuplicate?: boolean;
  duplicateReason?: string;
  isValid: boolean;
  validationError?: string;
}

export interface ParseLedgerResult {
  rows: ParsedLedgerRow[];
  totalValid: number;
  totalDuplicate: number;
  totalInvalid: number;
  totalIn: number;
  totalOut: number;
  error?: string;
}

/**
 * Robust CSV tokenizer respecting quotes, escaped quotes, delimiters (, ; \t) and newlines
 */
export function parseCSVTokenizer(text: string): string[][] {
  const cleanText = text.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return [];

  // Auto-detect delimiter from first line
  const firstLine = cleanText.split(/\r?\n/)[0] || '';
  const countSemicolon = (firstLine.match(/;/g) || []).length;
  const countComma = (firstLine.match(/,/g) || []).length;
  const countTab = (firstLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (countSemicolon > countComma && countSemicolon > countTab) delimiter = ';';
  else if (countTab > countComma && countTab > countSemicolon) delimiter = '\t';

  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip next escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRecord.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRecord.push(currentCell.trim());
      currentCell = '';
      if (currentRecord.some((c) => c.length > 0)) {
        records.push(currentRecord);
      }
      currentRecord = [];
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentCell.trim());
    if (currentRecord.some((c) => c.length > 0)) {
      records.push(currentRecord);
    }
  }

  return records;
}

/**
 * Normalizes various currency & amount string representations into number
 * Handles: "Rp 1.500.000,00", "1,500,000.00", "(50.000)", "-15000", "25000 CR"
 */
export function parseCurrencyAmount(raw: any): { value: number; indicator?: 'CR' | 'DB' } {
  if (typeof raw === 'number') return { value: isNaN(raw) ? 0 : raw };
  if (!raw) return { value: 0 };

  let str = String(raw).trim();
  let indicator: 'CR' | 'DB' | undefined;

  // Check CR / DB indicator
  if (/(\bCR\b|\bK\b)/i.test(str)) {
    indicator = 'CR';
    str = str.replace(/(\bCR\b|\bK\b)/gi, '').trim();
  } else if (/(\bDB\b|\bD\b)/i.test(str)) {
    indicator = 'DB';
    str = str.replace(/(\bDB\b|\bD\b)/gi, '').trim();
  }

  // Handle parentheses as negative: (1000) -> -1000
  let isNegative = false;
  if (/^\(.*\)$/.test(str)) {
    isNegative = true;
    str = str.replace(/^\(|\)$/g, '').trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.replace(/^-/, '').trim();
  }

  // Remove currency prefixes
  str = str.replace(/^(Rp|IDR|USD|\$)\s*/i, '').trim();

  // Distinguish comma vs dot:
  // Indonesian: 1.250.000,50 (comma is decimal)
  // US/Standard: 1,250,000.50 (dot is decimal)
  if (str.includes(',') && str.includes('.')) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Indonesian style: dot is thousand separator, comma is decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US style: comma is thousand separator, dot is decimal
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Only commas
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Decimal comma: 1500,50
      str = parts[0].replace(/\./g, '') + '.' + parts[1];
    } else {
      // Thousands comma: 1,500,000
      str = str.replace(/,/g, '');
    }
  } else if (str.includes('.')) {
    // Only dots: could be 1.500.000 (ID thousands) or 1500.50 (decimal)
    const parts = str.split('.');
    if (parts.length > 2) {
      // Multiple dots -> thousand separators: 1.500.000
      str = str.replace(/\./g, '');
    } else if (parts.length === 2 && parts[1].length === 3) {
      // Exactly 3 digits after dot -> probably thousand separator: 150.000
      str = str.replace(/\./g, '');
    }
  }

  const num = parseFloat(str);
  const cleanNum = isNaN(num) ? 0 : num;
  return {
    value: isNegative ? -Math.abs(cleanNum) : cleanNum,
    indicator,
  };
}

/**
 * Normalizes various date formats into YYYY-MM-DD
 * Handles: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD/MM/YY, DD MMM YYYY
 */
export function normalizeDateString(raw: string): string | null {
  if (!raw) return null;
  const str = raw.trim();

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) {
      const currentCentury = Math.floor(new Date().getFullYear() / 100) * 100;
      year = String(currentCentury + parseInt(year, 10));
    }
    return `${year}-${month}-${day}`;
  }

  // Try standard JS Date parsing fallback
  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) {
    const d = new Date(timestamp);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return null;
}

const COLUMN_ALIASES = {
  date: ['tanggal', 'date', 'tgl', 'transactiondate', 'tgltransaksi', 'waktu', 'valuedate', 'postdate', 'postingdate', 'tglvaluta'],
  description: ['keterangan', 'deskripsi', 'description', 'uraian', 'rincian', 'transaksi', 'memo', 'narration', 'detail', 'remarks', 'uraiantransaksi'],
  category: ['kategori', 'category', 'pos', 'jenistransaksi', 'tipepengeluaran'],
  type: ['tipe', 'type', 'jenistransaksi', 'arah'],
  inAmount: ['masuk', 'uangmasuk', 'debit', 'debet', 'cr', 'credit', 'kreditmasuk', 'in', 'penerimaan', 'setoran'],
  outAmount: ['keluar', 'uangkeluar', 'kredit', 'db', 'debitkeluar', 'out', 'pengeluaran', 'penarikan'],
  singleAmount: ['jumlah', 'nominal', 'amount', 'mutasi', 'nilai', 'transaksi'],
  indicator: ['crdb', 'dbcr', 'dk', 'kd', 'indicator', 'mutasitrp', 'dc'],
  notes: ['catatan', 'notes', 'note', 'keterangantambahan', 'pesan'],
};

function cleanHeaderKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parses raw CSV content into validated Ledger rows
 */
export function parseLedgerCsv(
  csvText: string,
  accountId: string,
  existingTransactions: FinanceTransaction[] = []
): ParseLedgerResult {
  const records = parseCSVTokenizer(csvText);
  if (records.length < 2) {
    return {
      rows: [],
      totalValid: 0,
      totalDuplicate: 0,
      totalInvalid: 0,
      totalIn: 0,
      totalOut: 0,
      error: 'File CSV harus memiliki minimal 1 baris header dan 1 baris data.',
    };
  }

  const rawHeaders = records[0];
  const cleanedHeaders = rawHeaders.map(cleanHeaderKey);

  const findColIndex = (aliases: string[]): number => {
    return cleanedHeaders.findIndex((h) => aliases.some((a) => h.includes(a) || a.includes(h)));
  };

  const idxDate = findColIndex(COLUMN_ALIASES.date);
  const idxDesc = findColIndex(COLUMN_ALIASES.description);
  const idxCat = findColIndex(COLUMN_ALIASES.category);
  const idxType = findColIndex(COLUMN_ALIASES.type);
  const idxIn = findColIndex(COLUMN_ALIASES.inAmount);
  const idxOut = findColIndex(COLUMN_ALIASES.outAmount);
  const idxSingle = findColIndex(COLUMN_ALIASES.singleAmount);
  const idxIndicator = findColIndex(COLUMN_ALIASES.indicator);
  const idxNotes = findColIndex(COLUMN_ALIASES.notes);

  if (idxDate === -1) {
    return {
      rows: [],
      totalValid: 0,
      totalDuplicate: 0,
      totalInvalid: 0,
      totalIn: 0,
      totalOut: 0,
      error: 'Kolom Tanggal (Date/Tanggal/Tgl) tidak ditemukan di baris header CSV.',
    };
  }

  const hasAmountCol = idxIn !== -1 || idxOut !== -1 || idxSingle !== -1;
  if (!hasAmountCol) {
    return {
      rows: [],
      totalValid: 0,
      totalDuplicate: 0,
      totalInvalid: 0,
      totalIn: 0,
      totalOut: 0,
      error: 'Kolom Jumlah mutasi tidak ditemukan. Harap sertakan kolom Masuk/Keluar, Debit/Kredit, atau Jumlah.',
    };
  }

  const rows: ParsedLedgerRow[] = [];
  let totalIn = 0;
  let totalOut = 0;

  for (let i = 1; i < records.length; i++) {
    const cols = records[i];
    if (cols.length === 0 || cols.every((c) => !c.trim())) continue;

    const rawDate = cols[idxDate] || '';
    const date = normalizeDateString(rawDate);
    const description = (idxDesc !== -1 ? cols[idxDesc] : '') || 'Transaksi Mutasi';
    const category = idxCat !== -1 ? cols[idxCat]?.trim() : '';
    const notes = idxNotes !== -1 ? cols[idxNotes]?.trim() : '';
    const rawTypeVal = idxType !== -1 ? cols[idxType]?.toLowerCase().trim() : '';

    let type: FinanceTransactionType = 'expense';
    let amount = 0;
    let rawIn = 0;
    let rawOut = 0;

    if (idxIn !== -1 || idxOut !== -1) {
      const inVal = idxIn !== -1 ? parseCurrencyAmount(cols[idxIn]).value : 0;
      const outVal = idxOut !== -1 ? parseCurrencyAmount(cols[idxOut]).value : 0;
      rawIn = Math.abs(inVal);
      rawOut = Math.abs(outVal);

      if (rawIn > 0 && rawOut === 0) {
        amount = rawIn;
        type = 'income';
      } else if (rawOut > 0 && rawIn === 0) {
        amount = rawOut;
        type = 'expense';
      } else if (rawIn > 0 && rawOut > 0) {
        // Both filled: choose larger or default to in
        if (rawIn >= rawOut) {
          amount = rawIn;
          type = 'income';
        } else {
          amount = rawOut;
          type = 'expense';
        }
      }
    } else if (idxSingle !== -1) {
      const parsedAmount = parseCurrencyAmount(cols[idxSingle]);
      const rawIndicator = idxIndicator !== -1 ? cols[idxIndicator]?.toUpperCase().trim() : '';
      const indicator = parsedAmount.indicator || (rawIndicator.includes('CR') ? 'CR' : rawIndicator.includes('DB') ? 'DB' : undefined);

      if (indicator === 'CR') {
        type = 'income';
        amount = Math.abs(parsedAmount.value);
        rawIn = amount;
      } else if (indicator === 'DB') {
        type = 'expense';
        amount = Math.abs(parsedAmount.value);
        rawOut = amount;
      } else if (parsedAmount.value < 0) {
        type = 'expense';
        amount = Math.abs(parsedAmount.value);
        rawOut = amount;
      } else {
        type = 'income';
        amount = Math.abs(parsedAmount.value);
        rawIn = amount;
      }
    }

    // Override type if explicit type column matches valid FinanceTransactionType
    if (rawTypeVal) {
      if (rawTypeVal.includes('income') || rawTypeVal.includes('pemasukan') || rawTypeVal.includes('masuk')) {
        type = 'income';
      } else if (rawTypeVal.includes('expense') || rawTypeVal.includes('pengeluaran') || rawTypeVal.includes('keluar')) {
        type = 'expense';
      } else if (rawTypeVal.includes('transfer_in') || rawTypeVal.includes('transfer masuk')) {
        type = 'transfer_in';
      } else if (rawTypeVal.includes('transfer_out') || rawTypeVal.includes('transfer keluar')) {
        type = 'transfer_out';
      } else if (rawTypeVal.includes('adjustment') || rawTypeVal.includes('penyesuaian')) {
        type = 'adjustment';
      }
    }

    // Validation
    let isValid = true;
    let validationError: string | undefined;

    if (!date) {
      isValid = false;
      validationError = `Format tanggal "${rawDate}" tidak valid.`;
    } else if (amount <= 0) {
      isValid = false;
      validationError = 'Nominal mutasi harus lebih besar dari 0.';
    }

    if (isValid) {
      if (type === 'income' || type === 'transfer_in') totalIn += amount;
      else if (type === 'expense' || type === 'transfer_out') totalOut += amount;
    }

    rows.push({
      date: date || rawDate,
      type,
      amount,
      description,
      category: category || undefined,
      notes: notes || undefined,
      rawIn,
      rawOut,
      isValid,
      validationError,
      isDuplicate: false,
    });
  }

  // Duplicate Check against existing transactions in this account
  let totalDuplicate = 0;
  const scopedExisting = existingTransactions.filter((t) => t.accountId === accountId);

  rows.forEach((row) => {
    if (!row.isValid) return;

    const duplicateMatch = scopedExisting.find((ex) => {
      if (ex.date !== row.date) return false;
      const exAmount = Math.abs(Number(ex.amount) || 0);
      if (Math.abs(exAmount - row.amount) > 0.01) return false;

      // Check description similarity (or if one contains the other)
      const descA = (ex.description || '').toLowerCase().trim();
      const descB = (row.description || '').toLowerCase().trim();
      if (descA === descB) return true;
      if (descA && descB && (descA.includes(descB) || descB.includes(descA))) return true;

      return false;
    });

    if (duplicateMatch) {
      row.isDuplicate = true;
      row.duplicateReason = `Cocok dengan transaksi "${duplicateMatch.description}" pada ${duplicateMatch.date}`;
      totalDuplicate++;
    }
  });

  const totalValid = rows.filter((r) => r.isValid && !r.isDuplicate).length;
  const totalInvalid = rows.filter((r) => !r.isValid).length;

  return {
    rows,
    totalValid,
    totalDuplicate,
    totalInvalid,
    totalIn,
    totalOut,
  };
}

/**
 * Downloads a standard CSV template for Account Ledger mutations
 */
export function downloadLedgerTemplateCsv(): void {
  const headers = ['Tanggal', 'Tipe', 'Kategori', 'Keterangan', 'Masuk', 'Keluar', 'Catatan'];
  const sampleRows = [
    ['2026-10-01', 'income', 'Gaji', 'Gaji Bulanan Oktober', '15000000', '0', 'Payroll transfer'],
    ['2026-10-02', 'expense', 'Makan', 'Makan Siang Resto', '0', '85000', 'Family lunch'],
    ['2026-10-05', 'expense', 'Investasi', 'Deposit RDN Saham', '0', '5000000', 'Top up BCA Sekuritas'],
    ['2026-10-10', 'income', 'Dividen', 'Dividen BBCA Q3', '750000', '0', 'Masuk ke rekening'],
    ['2026-10-12', 'expense', 'Tagihan', 'Listrik PLN & Internet', '0', '650000', 'Auto debit bulanan'],
  ];

  const csvContent =
    '\uFEFF' +
    [
      headers.join(','),
      ...sampleRows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `template_impor_mutasi_rekening.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports account ledger transactions to a cleanly formatted CSV file with UTF-8 BOM
 */
export function exportAccountLedgerToCsv(
  account: FinanceAccount,
  transactions: any[],
  options: {
    periodLabel?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
): void {
  const headers = [
    'Tanggal',
    'Tipe',
    'Kategori',
    'Keterangan',
    'Masuk (Debit)',
    'Keluar (Kredit)',
    'Saldo Berjalan',
    'Catatan',
  ];

  const rows = transactions.map((t) => {
    const signedAmount = getFinanceTransactionAmountForDisplay(t);
    const isDebit = signedAmount > 0;
    const isCredit = signedAmount < 0;
    const masuk = isDebit ? Math.abs(signedAmount) : 0;
    const keluar = isCredit ? Math.abs(signedAmount) : 0;
    const typeLabel = getFinanceTransactionTypeLabel(t.type);

    return [
      t.date || '',
      typeLabel,
      t.category || '',
      t.description || '',
      masuk ? String(masuk) : '0',
      keluar ? String(keluar) : '0',
      t.runningBalance !== undefined ? String(t.runningBalance) : '',
      t.notes ? t.notes.replace(/<[^>]*>/g, '') : '',
    ];
  });

  const csvContent =
    '\uFEFF' +
    [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

  const safeAccountName = (account.name || 'rekening').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const period = options.periodLabel
    ? options.periodLabel.toLowerCase().replace(/[^a-z0-9]/g, '_')
    : options.dateFrom && options.dateTo
    ? `${options.dateFrom}_sd_${options.dateTo}`
    : 'semua_mutasi';

  const dateNow = new Date().toISOString().split('T')[0];
  const fileName = `mutasi_${safeAccountName}_${period}_${dateNow}.csv`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports multi-account global ledger transactions to a CSV file
 */
export function exportGlobalLedgerToCsv(
  transactions: any[],
  accounts: FinanceAccount[],
  options: {
    periodLabel?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
): void {
  const headers = [
    'Tanggal',
    'Rekening',
    'Institusi',
    'Mata Uang',
    'Tipe',
    'Kategori',
    'Keterangan',
    'Debit (Masuk)',
    'Kredit (Keluar)',
    'Catatan',
  ];

  const accountMap = new Map<string, FinanceAccount>();
  accounts.forEach((a) => accountMap.set(a.id, a));

  const rows = transactions.map((t) => {
    const acc = accountMap.get(t.accountId);
    const signedAmount = getFinanceTransactionAmountForDisplay(t);
    const isDebit = signedAmount > 0;
    const isCredit = signedAmount < 0;
    const masuk = isDebit ? Math.abs(signedAmount) : 0;
    const keluar = isCredit ? Math.abs(signedAmount) : 0;
    const typeLabel = getFinanceTransactionTypeLabel(t.type);

    return [
      t.date || '',
      acc?.name || 'Rekening',
      acc?.institutionName || '',
      acc?.currency || 'IDR',
      typeLabel,
      t.category || '',
      t.description || '',
      masuk ? String(masuk) : '0',
      keluar ? String(keluar) : '0',
      t.notes ? t.notes.replace(/<[^>]*>/g, '') : '',
    ];
  });

  const csvContent =
    '\uFEFF' +
    [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

  const period = options.periodLabel
    ? options.periodLabel.toLowerCase().replace(/[^a-z0-9]/g, '_')
    : options.dateFrom && options.dateTo
    ? `${options.dateFrom}_sd_${options.dateTo}`
    : 'semua_rekening';

  const dateNow = new Date().toISOString().split('T')[0];
  const fileName = `buku_besar_global_${period}_${dateNow}.csv`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface StatementPdfOptions {
  saldoAwal: number;
  saldoAkhir: number;
  totalDebit: number;
  totalKredit: number;
  dateFrom?: string;
  dateTo?: string;
  periodLabel?: string;
}

/**
 * Generates an authentic Indonesian bank mutation statement and triggers browser Print to PDF
 */
export function exportAccountLedgerToPdf(
  account: FinanceAccount,
  transactions: any[],
  options: StatementPdfOptions
): void {
  const isUSD = account.currency === 'USD';
  const formatMoney = (val: number) => (isUSD ? formatUSD(val) : formatRupiah(val));
  const printTimeStr = formatDateTime(new Date().toISOString());

  const periodDisplay =
    options.dateFrom && options.dateTo
      ? `${formatDate(options.dateFrom)} s/d ${formatDate(options.dateTo)}`
      : options.dateFrom
      ? `Mulai ${formatDate(options.dateFrom)}`
      : options.dateTo
      ? `Sampai ${formatDate(options.dateTo)}`
      : options.periodLabel || 'Semua Riwayat Mutasi';

  // Sort chronologically for authentic bank statement view
  const sortedTransactions = [...transactions].sort((a, b) => {
    const timeA = new Date(a.date + 'T' + (a.createdAt ? a.createdAt.split('T')[1] : '00:00:00')).getTime();
    const timeB = new Date(b.date + 'T' + (b.createdAt ? b.createdAt.split('T')[1] : '00:00:00')).getTime();
    return timeA - timeB;
  });

  const tableRowsHtml = sortedTransactions
    .map((t, idx) => {
      const signedAmount = getFinanceTransactionAmountForDisplay(t);
      const isDebit = signedAmount > 0;
      const isCredit = signedAmount < 0;
      const debetKeluar = isCredit ? Math.abs(signedAmount) : 0;
      const kreditMasuk = isDebit ? Math.abs(signedAmount) : 0;
      const desc = escapeHtml(t.description || '-');
      const cat = escapeHtml(t.category || '-');
      const notes = t.notes ? `<div style="font-size: 9px; color: #64748b; margin-top: 2px;">${escapeHtml(t.notes.replace(/<[^>]*>/g, ''))}</div>` : '';
      const runningBalanceDisplay = t.runningBalance !== undefined ? formatMoney(t.runningBalance) : '-';

      return `
        <tr>
          <td style="text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="white-space: nowrap;">${formatDate(t.date)}</td>
          <td>
            <div style="font-weight: 600; color: #0f172a;">${desc}</div>
            ${notes}
          </td>
          <td style="color: #475569;">${cat}</td>
          <td class="text-right" style="color: ${debetKeluar ? '#dc2626' : '#94a3b8'};">
            ${debetKeluar ? formatMoney(debetKeluar) : '-'}
          </td>
          <td class="text-right" style="color: ${kreditMasuk ? '#16a34a' : '#94a3b8'};">
            ${kreditMasuk ? formatMoney(kreditMasuk) : '-'}
          </td>
          <td class="text-right" style="font-weight: 600; color: #0f172a;">
            ${runningBalanceDisplay}
          </td>
        </tr>
      `;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Mutasi Rekening - ${escapeHtml(account.name)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 24px;
      font-size: 11px;
      line-height: 1.4;
      background: #ffffff;
    }
    .no-print-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 10px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .btn-action {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .statement-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .brand-name {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      text-transform: uppercase;
    }
    .statement-title {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .header-right {
      text-align: right;
    }
    .app-title {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .print-date {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 2px;
    }
    .meta-card {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px 24px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 16px;
      margin-bottom: 14px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      border-bottom: 1px dashed #e2e8f0;
      padding: 3px 0;
    }
    .meta-lbl {
      color: #64748b;
      font-weight: 500;
    }
    .meta-val {
      color: #0f172a;
      font-weight: 600;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .summary-item {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      background: #ffffff;
    }
    .summary-lbl {
      font-size: 9px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 3px;
    }
    .summary-val {
      font-size: 12.5px;
      font-weight: 700;
      color: #0f172a;
    }
    table.statement-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    table.statement-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 7px 8px;
      border-top: 1px solid #94a3b8;
      border-bottom: 1px solid #94a3b8;
      font-size: 9.5px;
      text-transform: uppercase;
    }
    table.statement-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 10px;
      vertical-align: top;
    }
    table.statement-table tr:nth-child(even) {
      background-color: #fafbfc;
    }
    .text-right {
      text-align: right;
    }
    .initial-row {
      background-color: #f8fafc !important;
      font-weight: 600;
    }
    .footer-note {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      font-size: 9px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print-bar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div>
      <strong>Pratinjau Dokumen Mutasi Rekening</strong>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
        Pilih <em>"Save as PDF"</em> atau printer Anda di jendela cetak.
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn-action" onclick="window.print()">Cetak / Simpan PDF</button>
      <button class="btn-action" style="background: #64748b;" onclick="window.close()">Tutup</button>
    </div>
  </div>

  <div class="statement-header">
    <div>
      <div class="brand-name">${escapeHtml(account.institutionName || 'BANK STATEMENT')}</div>
      <div class="statement-title">Rekening Koran / Mutasi Rekening</div>
    </div>
    <div class="header-right">
      <div class="app-title">JURNAL SAHAM FINANCE</div>
      <div class="print-date">Dicetak: ${printTimeStr}</div>
    </div>
  </div>

  <div class="meta-card">
    <div class="meta-row">
      <span class="meta-lbl">Nama Rekening:</span>
      <span class="meta-val">${escapeHtml(account.name)}</span>
    </div>
    <div class="meta-row">
      <span class="meta-lbl">Periode Mutasi:</span>
      <span class="meta-val">${escapeHtml(periodDisplay)}</span>
    </div>
    <div class="meta-row">
      <span class="meta-lbl">Institusi:</span>
      <span class="meta-val">${escapeHtml(account.institutionName)}</span>
    </div>
    <div class="meta-row">
      <span class="meta-lbl">Mata Uang:</span>
      <span class="meta-val">${escapeHtml(account.currency)}</span>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-item">
      <div class="summary-lbl">Saldo Awal</div>
      <div class="summary-val">${formatMoney(options.saldoAwal)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-lbl">Total Uang Masuk (Kredit)</div>
      <div class="summary-val" style="color: #16a34a;">${formatMoney(options.totalDebit)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-lbl">Total Uang Keluar (Debit)</div>
      <div class="summary-val" style="color: #dc2626;">${formatMoney(options.totalKredit)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-lbl">Saldo Akhir</div>
      <div class="summary-val">${formatMoney(options.saldoAkhir)}</div>
    </div>
  </div>

  <table class="statement-table">
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">No</th>
        <th style="width: 75px;">Tanggal</th>
        <th>Keterangan / Uraian</th>
        <th style="width: 100px;">Kategori</th>
        <th class="text-right" style="width: 110px;">Debit (Keluar)</th>
        <th class="text-right" style="width: 110px;">Kredit (Masuk)</th>
        <th class="text-right" style="width: 120px;">Saldo</th>
      </tr>
    </thead>
    <tbody>
      <tr class="initial-row">
        <td style="text-align: center;">-</td>
        <td style="white-space: nowrap;">${options.dateFrom ? formatDate(options.dateFrom) : '-'}</td>
        <td colspan="4"><em>SALDO AWAL PERIODE</em></td>
        <td class="text-right">${formatMoney(options.saldoAwal)}</td>
      </tr>
      ${tableRowsHtml}
      <tr style="background: #f1f5f9; font-weight: 700; border-top: 1px solid #94a3b8;">
        <td colspan="4" style="text-align: right; padding-right: 12px;">TOTAL MUTASI:</td>
        <td class="text-right" style="color: #dc2626;">${formatMoney(options.totalKredit)}</td>
        <td class="text-right" style="color: #16a34a;">${formatMoney(options.totalDebit)}</td>
        <td class="text-right">${formatMoney(options.saldoAkhir)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer-note">
    <div>Catatan: Dokumen mutasi rekening ini dihasilkan secara otomatis oleh sistem Jurnal Saham.</div>
    <div>Total Transaksi: ${sortedTransactions.length}</div>
  </div>
</body>
</html>`;

  // Open in new tab or popup window and trigger print
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 450);
  } else {
    // Hidden iframe fallback if popup was blocked
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 2000);
      }, 450);
    }
  }
}


