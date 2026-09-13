import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Landmark, List, TrendingUp } from 'lucide-react';
import { useData } from '@/modules/shared/context/DataContext';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import { useTableSort } from '@/modules/shared/hooks/useTableSort';
import { formatDate, formatRupiah } from '@/modules/shared/utils/formatters';
import { getFinanceTransactionAmountForDisplay, getFinanceTransactionTypeLabel } from '@/modules/finance/utils/finance';
import CustomSelect from '@/modules/shared/components/CustomSelect';
import CustomDatePicker from '@/modules/shared/components/CustomDatePicker';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import '@/modules/finance/finance.css';

export default function FinanceGlobalTransactionsPage() {
  const { financeTransactions, financeAccounts, allDividends, allTrades, allCashflows, portfolios, settings } = useData();
  const blurStyle = usePrivacyStyle();
  const getFinanceTransactionAmountForDisplay = (t: any) => {
    const rawAmount = Number(t.amount) || 0;
    if (t.type === 'expense') return -rawAmount;
    if (t.type === 'transfer_out') return -rawAmount;
    if (t.type === 'adjustment') return rawAmount; // adjustment carries its own sign
    return rawAmount; // income, transfer_in
  };
  const usdToIdrRate = settings?.usdToIdrRate ?? 16200;
  const [viewMode, setViewMode] = useState<'ledger' | 'cashflow'>('ledger');
  
  // Ledger Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');

  // Cashflow Filters
  const [cfDateFrom, setCfDateFrom] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [cfDateTo, setCfDateTo] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [cfExcludedAccounts, setCfExcludedAccounts] = useState<Set<string>>(new Set());
  const [cfExcludedPortfolios, setCfExcludedPortfolios] = useState<Set<string>>(new Set());
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string>('ALL');

  const [presets] = useState<any[]>(() => {
    const saved = localStorage.getItem('wealth_presets');
    return saved ? JSON.parse(saved) : [];
  });

  const handlePresetChange = (value: string) => {
    setActivePresetId(value);
    if (value === 'ALL') {
      setCfExcludedAccounts(new Set());
      setCfExcludedPortfolios(new Set());
    } else if (value !== 'CUSTOM') {
      const preset = presets.find(p => p.id === value);
      if (preset) {
        setCfExcludedAccounts(new Set(preset.excludedFinanceAccountIds || []));
        setCfExcludedPortfolios(new Set(preset.excludedPortfolioIds || []));
      }
    }
  };

  const setPresetRange = (preset: 'month' | 'year' | 'all') => {
    const now = new Date();
    if (preset === 'month') {
      setCfDateFrom(format(startOfMonth(now), 'yyyy-MM-dd'));
      setCfDateTo(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (preset === 'year') {
      setCfDateFrom(format(startOfYear(now), 'yyyy-MM-dd'));
      setCfDateTo(format(endOfYear(now), 'yyyy-MM-dd'));
    } else {
      setCfDateFrom('');
      setCfDateTo('');
    }
  };

  const accountOptions = [
    { value: 'all', label: 'Semua Rekening' },
    ...financeAccounts.map((acc: any) => ({
      value: acc.id,
      label: acc.name
    }))
  ];

  // ===================== LEDGER VIEW =====================
  const { filteredTransactions, saldoAwal, saldoAkhir, totalDebit, totalKredit } = useMemo(() => {
    const activeAccounts = accountFilter === 'all' 
      ? financeAccounts 
      : financeAccounts.filter((a: any) => a.id === accountFilter);
    
    const baseOpeningBalance = activeAccounts.reduce((sum: number, a: any) => sum + (Number(a.openingBalance) || 0), 0);

    const accountTransactions = financeTransactions.filter((item: any) => {
      if (accountFilter !== 'all' && item.accountId !== accountFilter) return false;
      return true;
    }).sort((a: any, b: any) => {
      const dateA = new Date(a.date + 'T' + (a.createdAt ? a.createdAt.split('T')[1] : '00:00:00')).getTime();
      const dateB = new Date(b.date + 'T' + (b.createdAt ? b.createdAt.split('T')[1] : '00:00:00')).getTime();
      return dateA - dateB;
    });

    let currentBalance = baseOpeningBalance;
    const transactionsWithBalance = accountTransactions.map((t: any) => {
      currentBalance += getFinanceTransactionAmountForDisplay(t);
      return { ...t, runningBalance: currentBalance };
    });

    let calculatedSaldoAwal = baseOpeningBalance;
    if (dateFrom) {
      const beforeDateFrom = transactionsWithBalance.filter((t: any) => t.date < dateFrom);
      if (beforeDateFrom.length > 0) {
        calculatedSaldoAwal = beforeDateFrom[beforeDateFrom.length - 1].runningBalance;
      }
    }

    let calculatedSaldoAkhir = currentBalance;
    if (dateTo) {
      const upToDateTo = transactionsWithBalance.filter((t: any) => t.date <= dateTo);
      if (upToDateTo.length > 0) {
        calculatedSaldoAkhir = upToDateTo[upToDateTo.length - 1].runningBalance;
      } else {
        calculatedSaldoAkhir = calculatedSaldoAwal;
      }
    }

    let totalDebit = 0;
    let totalKredit = 0;

    const finalFiltered = transactionsWithBalance.filter((item: any) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (dateFrom && item.date < dateFrom) return false;
      if (dateTo && item.date > dateTo) return false;
      
      const amount = getFinanceTransactionAmountForDisplay(item);
      if (amount < 0) totalDebit += Math.abs(amount);
      else totalKredit += amount;
      
      return true;
    });

    return { 
      filteredTransactions: finalFiltered, 
      saldoAwal: calculatedSaldoAwal, 
      saldoAkhir: calculatedSaldoAkhir,
      totalDebit,
      totalKredit
    };
  }, [financeTransactions, financeAccounts, dateFrom, dateTo, typeFilter, accountFilter]);

  const { sortConfig, sortedItems, requestSort } = useTableSort(filteredTransactions, {
    initialKey: 'date',
    initialDirection: 'desc',
    getValue: (item: any, key: 'date' | 'type' | 'description' | 'amount') => item[key] || '',
    tieBreaker: (left: any, right: any) => new Date(right.createdAt || right.date).getTime() - new Date(left.createdAt || left.date).getTime(),
  });

  // ===================== CASH FLOW VIEW =====================
  const cashflowData = useMemo(() => {
    const periodTransactions = financeTransactions.filter((item: any) => {
      if (cfExcludedAccounts.has(item.accountId)) return false;
      if (cfDateFrom && item.date < cfDateFrom) return false;
      if (cfDateTo && item.date > cfDateTo) return false;
      return true;
    });

    // 1. Operating Activities
    let operatingIncome = 0;
    let operatingExpense = 0;
    
    // 2. Investing Activities
    let investingInflow = 0; // Hasil Jual Saham
    let investingOutflow = 0; // Pembelian Saham
    let dividendInflow = 0; // Dividen yang masuk ke portofolio

    // 3. Financing & Internal Transfers
    let internalTransfersIn = 0; // Termasuk Pencairan dari RDN ke Bank
    let internalTransfersOut = 0; // Termasuk Top Up dari Bank ke RDN
    
    // Uncategorized Adjustments
    let adjustmentsInflow = 0;
    let adjustmentsOutflow = 0;

    periodTransactions.forEach((t: any) => {
      const rawAmount = Number(t.amount) || 0;
      
      switch (t.type) {
        case 'income':
          if (t.linkedPortfolioId) {
            internalTransfersIn += rawAmount; // Pencairan (Withdrawal) ke bank
          } else {
            operatingIncome += rawAmount;
          }
          break;
        case 'expense':
          if (t.linkedPortfolioId) {
            internalTransfersOut += rawAmount; // Top up (Deposit) ke RDN
          } else {
            operatingExpense += rawAmount;
          }
          break;
        case 'transfer_in':
          if (t.transferGroupId) {
            internalTransfersIn += rawAmount;
          } else {
            // Withdrawal from portfolio is technically a transfer_in without transferGroupId if it's external, 
            // but let's check linkedPortfolioId logic based on how finance module creates it.
            // Actually, Portfolio to Finance creates a transaction with type 'income' or 'transfer_in'. 
            // We'll rely on the description or linkedCashflowId if we want to be very strict, 
            // but usually in this app, portfolio withdraw is type 'transfer_in' with linkedCashflowId or just 'income'.
            // Let's broadly categorize non-group transfer_in as investing inflow if it has linkedPortfolioId, else internal.
            if (t.linkedPortfolioId) investingInflow += rawAmount;
            else internalTransfersIn += rawAmount;
          }
          break;
        case 'transfer_out':
          if (t.transferGroupId) {
            internalTransfersOut += rawAmount;
          } else {
            if (t.linkedPortfolioId) investingOutflow += rawAmount;
            else internalTransfersOut += rawAmount;
          }
          break;
        case 'adjustment':
          if (rawAmount > 0) adjustmentsInflow += rawAmount;
          else adjustmentsOutflow += Math.abs(rawAmount);
          break;
      }
    });

    // 4. Tambahkan Arus Kas RDN (Dompet Trading)
    const periodCashflows = allCashflows.filter((cf: any) => {
      if (cfExcludedPortfolios.has(cf.portfolioId || 'default')) return false;
      if (cfDateFrom && cf.date < cfDateFrom) return false;
      if (cfDateTo && cf.date > cfDateTo) return false;
      return true;
    });

    periodCashflows.forEach((cf: any) => {
      const isUS = cf.market === 'US';
      const amount = Number(cf.amount) || 0;
      const amountIdr = isUS ? amount * usdToIdrRate : amount;

      if (cf.type === 'deposit') {
        internalTransfersIn += amountIdr; // Inflow ke RDN
      } else if (cf.type === 'withdraw') {
        internalTransfersOut += amountIdr; // Outflow dari RDN
      }
    });

    const periodDividends = allDividends.filter((div: any) => {
      if (cfExcludedPortfolios.has(div.portfolioId || 'default')) return false;
      const divDate = div.payDate || (div.createdAt ? div.createdAt.split('T')[0] : '');
      if (cfDateFrom && divDate < cfDateFrom) return false;
      if (cfDateTo && divDate > cfDateTo) return false;
      return true;
    });

    periodDividends.forEach((div: any) => {
      const amount = Number(div.amount) || 0;
      const amountIdr = div.market === 'US' ? amount * usdToIdrRate : amount;
      dividendInflow += amountIdr;
    });

    // Hitung Pembelian & Penjualan Saham (Investing Activities)
    allTrades.forEach((trade: any) => {
      if (cfExcludedPortfolios.has(trade.portfolioId || 'default')) return;

      const isUS = trade.market === 'US';
      const isMutualFund = trade.assetType === 'mutual_fund';
      const shares = isMutualFund ? trade.lots : (isUS ? trade.lots : trade.lots * 100);

      // Buy (Outflow)
      if (trade.dateBuy && trade.dateBuy >= cfDateFrom && trade.dateBuy <= cfDateTo) {
        const buyAmount = trade.buyPrice * shares + (trade.buyFee || 0);
        investingOutflow += isUS ? buyAmount * usdToIdrRate : buyAmount;
      }

      // Sell (Inflow)
      if (trade.dateSell && trade.dateSell >= cfDateFrom && trade.dateSell <= cfDateTo) {
        const sellAmount = (trade.sellPrice || 0) * shares - (trade.sellFee || 0);
        investingInflow += isUS ? sellAmount * usdToIdrRate : sellAmount;
      }
    });

    const netOperating = operatingIncome - operatingExpense;
    const netInvesting = investingInflow + dividendInflow - investingOutflow;
    const netInternal = internalTransfersIn - internalTransfersOut + adjustmentsInflow - adjustmentsOutflow;
    
    const netCashFlow = netOperating + netInvesting + netInternal;

    return {
      operating: { income: operatingIncome, expense: operatingExpense, net: netOperating },
      investing: { inflow: investingInflow, outflow: investingOutflow, dividendInflow, net: netInvesting },
      financing: { inflow: internalTransfersIn + adjustmentsInflow, outflow: internalTransfersOut + adjustmentsOutflow, net: netInternal },
      netCashFlow
    };
  }, [financeTransactions, allCashflows, allDividends, allTrades, cfDateFrom, cfDateTo, cfExcludedAccounts, cfExcludedPortfolios, usdToIdrRate]);

  return (
    <div>
      <div className="finance-ledger-toolbar">
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <Link to="/finance" className="btn btn-secondary">
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ArrowLeft size={16} />
                Kembali ke Finance Tracker
              </span>
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="text-zinc-600 dark:text-zinc-400">
              <Landmark size={28} />
            </div>
            <div>
              <h1 className="page-title" style={{ marginBottom: 4 }}>Pusat Transaksi Global</h1>
              <p className="page-subtitle">Lihat semua mutasi dari seluruh rekening atau pantau Laporan Arus Kas bulanan Anda.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="finance-composer-tabs" style={{ marginBottom: 24, maxWidth: 600 }}>
        <button
          type="button"
          className={`finance-composer-tab ${viewMode === 'ledger' ? 'is-active' : ''}`}
          onClick={() => setViewMode('ledger')}
        >
          <span className="finance-composer-tab-title"><List size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 6 }}/>Buku Besar (General Ledger)</span>
          <span className="finance-composer-tab-desc">Semua transaksi dari seluruh rekening</span>
        </button>
        <button
          type="button"
          className={`finance-composer-tab ${viewMode === 'cashflow' ? 'is-active' : ''}`}
          onClick={() => setViewMode('cashflow')}
        >
          <span className="finance-composer-tab-title"><TrendingUp size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 6 }}/>Laporan Arus Kas</span>
          <span className="finance-composer-tab-desc">Analisis pemasukan dan pengeluaran</span>
        </button>
      </div>

      {viewMode === 'ledger' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Buku Besar Semua Rekening</h3>
          </div>
          <div className="card-body">
            <div className="finance-ledger-toolbar">
              <div className="finance-inline-form">
                <div className="form-group" style={{ minWidth: 200 }}>
                  <label className="form-label">Rekening</label>
                  <CustomSelect
                    value={accountFilter}
                    onChange={setAccountFilter}
                    options={accountOptions}
                  />
                </div>
                <div className="form-group" style={{ minWidth: 170 }}>
                  <label className="form-label" htmlFor="finance-filter-type">Filter Tipe</label>
                  <CustomSelect
                    value={typeFilter}
                    onChange={(value) => setTypeFilter(value)}
                    options={[
                      { value: 'all', label: 'Semua' },
                      { value: 'income', label: 'Pemasukan' },
                      { value: 'expense', label: 'Pengeluaran' },
                      { value: 'adjustment', label: 'Adjustment' },
                      { value: 'transfer_in', label: 'Transfer Masuk' },
                      { value: 'transfer_out', label: 'Transfer Keluar' }
                    ]}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-filter-from">Dari</label>
                  <CustomDatePicker
                    value={dateFrom}
                    onChange={(date) => setDateFrom(format(date, 'yyyy-MM-dd'))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-filter-to">Sampai</label>
                  <CustomDatePicker
                    value={dateTo}
                    onChange={(date) => setDateTo(format(date, 'yyyy-MM-dd'))}
                  />
                </div>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => { setTypeFilter('all'); setDateFrom(''); setDateTo(''); setAccountFilter('all'); }}>
                Reset Filter
              </button>
            </div>

            {sortedItems.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 8px' }}>
                <div className="empty-state-icon"><List size={40} /></div>
                <div className="empty-state-title">Tidak ada transaksi</div>
                <div className="empty-state-desc">Belum ada mutasi yang sesuai dengan kriteria filter Anda.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, backgroundColor: 'var(--bg-card-hover)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                  <div>
                    <div className="finance-helper-text" style={{ marginBottom: 4, fontWeight: 600 }}>Saldo Awal {dateFrom ? `(${formatDate(dateFrom)})` : ''}</div>
                    <div style={{ ...blurStyle, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-color)' }}>{formatRupiah(saldoAwal)}</div>
                  </div>
                  <div>
                    <div className="finance-helper-text" style={{ marginBottom: 4, fontWeight: 600 }}>Total Uang Keluar (Debit)</div>
                    <div style={{ ...blurStyle, fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-red)' }}>{formatRupiah(totalDebit)}</div>
                  </div>
                  <div>
                    <div className="finance-helper-text" style={{ marginBottom: 4, fontWeight: 600 }}>Total Uang Masuk (Kredit)</div>
                    <div style={{ ...blurStyle, fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-green)' }}>{formatRupiah(totalKredit)}</div>
                  </div>
                  <div>
                    <div className="finance-helper-text" style={{ marginBottom: 4, fontWeight: 600 }}>Saldo Akhir {dateTo ? `(${formatDate(dateTo)})` : ''}</div>
                    <div style={{ ...blurStyle, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-color)' }}>{formatRupiah(saldoAkhir)}</div>
                  </div>
                </div>
                
                <div className="table-container" style={{ border: 'none', margin: 0 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th><SortableTableHeader label="Tanggal" sortKey="date" sortConfig={sortConfig} onSort={requestSort} /></th>
                        <th>Keterangan</th>
                        <th style={{ textAlign: 'right' }}>Debit (Keluar)</th>
                        <th style={{ textAlign: 'right' }}>Kredit (Masuk)</th>
                        <th style={{ textAlign: 'right' }}>Saldo Akhir</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ backgroundColor: 'var(--bg-card-hover)', fontWeight: 600 }}>
                        <td colSpan={4}>Saldo Awal {dateFrom ? `(${formatDate(dateFrom)})` : ''}</td>
                        <td style={{ textAlign: 'right' }}><div style={blurStyle}>{formatRupiah(saldoAwal)}</div></td>
                      </tr>
                      {sortedItems.map((transaction: any) => {
                        const signedAmount = getFinanceTransactionAmountForDisplay(transaction);
                        const isDebit = signedAmount < 0;
                        const isCredit = signedAmount > 0;
                      const account = financeAccounts.find((item: any) => item.id === transaction.accountId);
                      const counterparty = transaction.counterpartyAccountId
                        ? financeAccounts.find((item: any) => item.id === transaction.counterpartyAccountId)
                        : null;

                      return (
                        <tr key={transaction.id}>
                          <td>
                            <div>{formatDate(transaction.date)}</div>
                            {transaction.createdAt && (
                              <div className="finance-helper-text" style={{ fontSize: '0.75rem', marginTop: 2 }}>
                                {format(new Date(transaction.createdAt), 'HH:mm')}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontWeight: 600 }}>{transaction.description || '-'}</span>
                              <span className="finance-pill" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>{getFinanceTransactionTypeLabel(transaction.type)}</span>
                            </div>
                            <div className="finance-helper-text" style={{ fontSize: '0.8rem' }}>
                              <span style={{ fontWeight: 500, color: 'var(--text-color)' }}>{account?.name || 'Unknown'}</span>
                              {account?.institutionName ? ` (${account.institutionName})` : ''}
                              {counterparty ? ` ➔ ${counterparty.name}` : ''}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ color: isDebit ? 'var(--accent-red)' : 'var(--text-muted)', ...blurStyle }}>
                              {isDebit ? formatRupiah(Math.abs(signedAmount)) : '-'}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ color: isCredit ? 'var(--accent-green)' : 'var(--text-muted)', ...blurStyle }}>
                              {isCredit ? formatRupiah(signedAmount) : '-'}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 600, ...blurStyle }}>{formatRupiah(transaction.runningBalance)}</div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ backgroundColor: 'var(--bg-card-hover)', fontWeight: 600 }}>
                      <td colSpan={4}>Saldo Akhir {dateTo ? `(${formatDate(dateTo)})` : ''}</td>
                      <td style={{ textAlign: 'right' }}><div style={blurStyle}>{formatRupiah(saldoAkhir)}</div></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'cashflow' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h3 className="card-title">Laporan Arus Kas (Cash Flow Statement)</h3>
            <div className="finance-inline-form" style={{ margin: 0, alignItems: 'center' }}>
              {presets.length > 0 && (
                <div className="form-group" style={{ margin: 0, minWidth: 160 }}>
                  <CustomSelect
                    value={activePresetId}
                    onChange={handlePresetChange}
                    options={[
                      { value: 'ALL', label: 'Semua Aset' },
                      ...presets.map(p => ({ value: p.id, label: p.name })),
                      ...(activePresetId === 'CUSTOM' ? [{ value: 'CUSTOM', label: 'Kustom', disabled: true }] : [])
                    ]}
                  />
                </div>
              )}
              <div className="form-group" style={{ margin: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAccountModalOpen(true)}>
                  Rekening: {financeAccounts.length - cfExcludedAccounts.size}/{financeAccounts.length}
                </button>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <CustomDatePicker
                  value={cfDateFrom}
                  onChange={(date) => setCfDateFrom(format(date, 'yyyy-MM-dd'))}
                />
              </div>
              <div className="form-group" style={{ margin: 0, alignSelf: 'center' }}>-</div>
              <div className="form-group" style={{ margin: 0 }}>
                <CustomDatePicker
                  value={cfDateTo}
                  onChange={(date) => setCfDateTo(format(date, 'yyyy-MM-dd'))}
                />
              </div>
              <div className="finance-actions" style={{ marginTop: 0 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPresetRange('month')}>Bulan Ini</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPresetRange('year')}>Tahun Ini</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPresetRange('all')}>Semua Waktu</button>
              </div>
            </div>
          </div>
          <div className="card-body">
            <p className="finance-helper-text" style={{ marginBottom: 24 }}>
              Laporan arus kas mengelompokkan pergerakan uang Anda ke dalam 3 aktivitas utama berdasarkan prinsip keuangan.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Operating Activities */}
              <div className="bento-card">
                <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                  Arus Kas dari Aktivitas Operasional
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Pemasukan Operasional (Income)</span>
                  <span style={blurStyle}>{formatRupiah(cashflowData.operating.income)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span>Pengeluaran Operasional (Expense)</span>
                  <span style={{ color: 'var(--accent-red)', ...blurStyle }}>({formatRupiah(cashflowData.operating.expense)})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: 12, borderTop: '1px dashed var(--border-color)' }}>
                  <span>Kas Bersih dari Aktivitas Operasional</span>
                  <span className={cashflowData.operating.net >= 0 ? 'text-profit' : 'text-loss'} style={blurStyle}>
                    {formatRupiah(cashflowData.operating.net)}
                  </span>
                </div>
              </div>

              {/* Investing Activities */}
              <div className="bento-card">
                <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                  Arus Kas dari Aktivitas Investasi
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Penjualan Aset (Saham/Reksadana)</span>
                  <span style={blurStyle}>{formatRupiah(cashflowData.investing.inflow)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Dividen Diterima</span>
                  <span style={blurStyle}>{formatRupiah(cashflowData.investing.dividendInflow)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span>Pembelian Aset (Saham/Reksadana)</span>
                  <span style={{ color: 'var(--accent-red)', ...blurStyle }}>({formatRupiah(cashflowData.investing.outflow)})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: 12, borderTop: '1px dashed var(--border-color)' }}>
                  <span>Kas Bersih dari Aktivitas Investasi</span>
                  <span className={cashflowData.investing.net >= 0 ? 'text-profit' : 'text-loss'} style={blurStyle}>
                    {formatRupiah(cashflowData.investing.net)}
                  </span>
                </div>
              </div>

              {/* Financing Activities */}
              <div className="bento-card">
                <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                  Arus Kas dari Aktivitas Internal / Penyesuaian
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Transfer Masuk & Penyesuaian (+)</span>
                  <span style={blurStyle}>{formatRupiah(cashflowData.financing.inflow)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span>Transfer Keluar & Penyesuaian (-)</span>
                  <span style={{ color: 'var(--accent-red)', ...blurStyle }}>({formatRupiah(cashflowData.financing.outflow)})</span>
                </div>
                <div className="finance-helper-text" style={{ marginBottom: 12, fontSize: '0.8rem' }}>
                  Aktivitas ini idealnya netral (0) karena uang hanya berpindah antar rekening Anda sendiri, kecuali ada penyesuaian saldo manual.
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: 12, borderTop: '1px dashed var(--border-color)' }}>
                  <span>Kas Bersih dari Aktivitas Internal</span>
                  <span className={cashflowData.financing.net >= 0 ? 'text-profit' : 'text-loss'} style={blurStyle}>
                    {formatRupiah(cashflowData.financing.net)}
                  </span>
                </div>
              </div>

              {/* Net Cash Flow Summary */}
              <div className="bento-card" style={{ background: 'var(--bg-card-hover)', border: '2px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.2rem', fontWeight: 800 }}>
                  <span>Kenaikan (Penurunan) Kas Bersih Periode Ini</span>
                  <span className={cashflowData.netCashFlow >= 0 ? 'text-profit' : 'text-loss'} style={blurStyle}>
                    {formatRupiah(cashflowData.netCashFlow)}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {isAccountModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 400, maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">Filter Data Cashflow</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsAccountModalOpen(false)}>Tutup</button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Pilih Dompet (Trading)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {portfolios.map((p: any) => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        className="form-checkbox"
                        checked={!cfExcludedPortfolios.has(p.id)}
                        onChange={() => {
                          setActivePresetId('CUSTOM');
                          setCfExcludedPortfolios(prev => {
                            const next = new Set(prev);
                            if (next.has(p.id)) next.delete(p.id);
                            else next.add(p.id);
                            return next;
                          });
                        }} 
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Pilih Rekening Bank & E-Wallet</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {financeAccounts.map((acc: any) => (
                    <label key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        className="form-checkbox"
                        checked={!cfExcludedAccounts.has(acc.id)}
                        onChange={() => {
                          setActivePresetId('CUSTOM');
                          setCfExcludedAccounts(prev => {
                            const next = new Set(prev);
                            if (next.has(acc.id)) next.delete(acc.id);
                            else next.add(acc.id);
                            return next;
                          });
                        }} 
                      />
                      {acc.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({acc.institutionName})</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setCfExcludedAccounts(new Set()); setCfExcludedPortfolios(new Set()); setActivePresetId('CUSTOM'); }}>Pilih Semua</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
