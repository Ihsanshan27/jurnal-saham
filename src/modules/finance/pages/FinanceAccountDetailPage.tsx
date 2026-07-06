import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, Landmark, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import CurrencyInput from '@/modules/shared/components/CurrencyInput';
import SelectionToggleCard from '@/modules/shared/components/SelectionToggleCard';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import { useTableSort } from '@/modules/shared/hooks/useTableSort';
import { formatDate, formatRupiah } from '@/modules/shared/utils/formatters';
import { FINANCE_TRANSACTION_TYPE_OPTIONS, getFinanceTransactionAmountForDisplay, getFinanceTransactionTypeLabel } from '@/modules/finance/utils/finance';
import { calculatePortfolioAssetIdrEquivalent, calculatePortfolioAssetMetrics } from '@/modules/trades/calculations';
import CustomSelect from '@/modules/shared/components/CustomSelect';
import CustomDatePicker from '@/modules/shared/components/CustomDatePicker';
import { format } from 'date-fns';
import '@/modules/finance/finance.css';

function createInitialTransactionForm(activePortfolioId: string) {
  return {
    type: 'income',
    amount: '',
    adjustmentDirection: 'increase',
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: '',
    linkToCashflow: false,
    linkedPortfolioId: activePortfolioId || 'default',
  };
}

function createInitialTransferForm() {
  return {
    toAccountId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  };
}

function createInitialPortfolioTransferForm(activePortfolioId: string) {
  return {
    portfolioId: activePortfolioId || 'default',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  };
}

function createInitialPortfolioWithdrawalForm(activePortfolioId: string) {
  return {
    portfolioId: activePortfolioId || 'default',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  };
}

function getLinkedPortfolioOverview(accountId: string, portfolios: any[], allTrades: any[], allCashflows: any[], allDividends: any[], settings: any, marketPrices: any) {
  const linkedPortfolios = portfolios.filter((portfolio: any) => portfolio.financeAccountId === accountId);

  const totalLinkedPortfolioBalance = linkedPortfolios.reduce((sum: number, portfolio: any) => {
    const scopedTrades = allTrades.filter((item: any) => (item.portfolioId || 'default') === portfolio.id);
    const scopedCashflows = allCashflows.filter((item: any) => (item.portfolioId || 'default') === portfolio.id);
    const scopedDividends = allDividends.filter((item: any) => (item.portfolioId || 'default') === portfolio.id);

    const idMetrics = calculatePortfolioAssetMetrics(
      scopedTrades,
      scopedCashflows,
      scopedDividends,
      portfolio.id === 'default' ? settings.initialCapital : 0,
      marketPrices,
      'ID',
    );

    const usMetrics = calculatePortfolioAssetMetrics(
      scopedTrades,
      scopedCashflows,
      scopedDividends,
      portfolio.id === 'default' ? (settings.initialCapitalUS ?? 1000) : 0,
      marketPrices,
      'US',
    );

    return sum + calculatePortfolioAssetIdrEquivalent(idMetrics, usMetrics, settings.usdToIdrRate);
  }, 0);

  return {
    linkedPortfolios,
    totalLinkedPortfolioBalance,
  };
}

export default function FinanceAccountDetailPage() {
  const { id } = useParams();
  const {
    portfolios,
    activePortfolioId,
    financeAccounts,
    allTrades,
    allCashflows,
    allDividends,
    settings,
    marketPrices,
    addFinanceTransaction,
    updateFinanceTransaction,
    deleteFinanceTransaction,
    createFinanceTransfer,
    createFinancePortfolioTransfer,
    createPortfolioToFinanceTransfer,
    getFinanceTransactionsByAccount,
    getFinanceAccountCurrentBalance,
  } = useData();
  const { confirm } = useDialog();
  const blurStyle = usePrivacyStyle();
  const account = financeAccounts.find((item: any) => item.id === id);
  const accountTransactions = useMemo(() => getFinanceTransactionsByAccount(id), [getFinanceTransactionsByAccount, id]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composerMode, setComposerMode] = useState<'transaction' | 'transfer' | 'to_portfolio' | 'from_portfolio'>('transaction');
  const [transactionForm, setTransactionForm] = useState(() => createInitialTransactionForm(activePortfolioId));
  const [transferForm, setTransferForm] = useState(createInitialTransferForm());
  const [portfolioTransferForm, setPortfolioTransferForm] = useState(() => createInitialPortfolioTransferForm(activePortfolioId));
  const [portfolioWithdrawalForm, setPortfolioWithdrawalForm] = useState(() => createInitialPortfolioWithdrawalForm(activePortfolioId));
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    setTransactionForm((prev) => ({ ...prev, linkedPortfolioId: activePortfolioId || 'default' }));
    setPortfolioTransferForm((prev) => ({ ...prev, portfolioId: prev.portfolioId || activePortfolioId || 'default' }));
    setPortfolioWithdrawalForm((prev) => ({ ...prev, portfolioId: prev.portfolioId || activePortfolioId || 'default' }));
  }, [activePortfolioId]);

  const filteredTransactions = useMemo(() => {
    return accountTransactions.filter((item: any) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (dateFrom && item.date < dateFrom) return false;
      if (dateTo && item.date > dateTo) return false;
      return true;
    });
  }, [accountTransactions, dateFrom, dateTo, typeFilter]);

  const { sortConfig, sortedItems, requestSort } = useTableSort(filteredTransactions, {
    initialKey: 'date',
    initialDirection: 'desc',
    getValue: (item: any, key: 'date' | 'type' | 'description' | 'amount') => item[key] || '',
    tieBreaker: (left: any, right: any) => new Date(right.createdAt || right.date).getTime() - new Date(left.createdAt || left.date).getTime(),
  });

  const balance = account ? getFinanceAccountCurrentBalance(account.id) : 0;
  const linkedCount = accountTransactions.filter((item: any) => Boolean(item.linkedCashflowId)).length;
  const counterpartyOptions = financeAccounts.filter((item: any) => item.id !== id && item.isActive !== false);
  const linkedPortfolioOverview = useMemo(() => (
    account
      ? getLinkedPortfolioOverview(account.id, portfolios, allTrades, allCashflows, allDividends, settings, marketPrices)
      : { linkedPortfolios: [], totalLinkedPortfolioBalance: 0 }
  ), [account, portfolios, allTrades, allCashflows, allDividends, settings, marketPrices]);
  const combinedBalance = balance + linkedPortfolioOverview.totalLinkedPortfolioBalance;

  if (!account) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Landmark size={48} /></div>
        <div className="empty-state-title">Rekening tidak ditemukan</div>
        <div className="empty-state-desc">Rekening mungkin sudah dinonaktifkan atau id-nya tidak valid.</div>
        <Link to="/finance" className="btn btn-primary">Kembali ke Finance Tracker</Link>
      </div>
    );
  }

  const resetTransactionForm = () => {
    setEditingId(null);
    setComposerMode('transaction');
    setTransactionForm(createInitialTransactionForm(activePortfolioId));
  };

  const handleTransactionChange = (key: string, value: string | boolean) => {
    setTransactionForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTransferChange = (key: string, value: string) => {
    setTransferForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePortfolioTransferChange = (key: string, value: string) => {
    setPortfolioTransferForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePortfolioWithdrawalChange = (key: string, value: string) => {
    setPortfolioWithdrawalForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTransactionSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const rawAmount = Number(transactionForm.amount) || 0;
    const amount = transactionForm.type === 'adjustment'
      ? (transactionForm.adjustmentDirection === 'decrease' ? -Math.abs(rawAmount) : Math.abs(rawAmount))
      : Math.abs(rawAmount);

    const payload = {
      accountId: account.id,
      type: transactionForm.type,
      amount,
      date: transactionForm.date,
      description: transactionForm.description,
      category: transactionForm.category,
      linkToCashflow: Boolean(transactionForm.linkToCashflow),
      linkedPortfolioId: transactionForm.linkedPortfolioId,
    };

    if (editingId) {
      updateFinanceTransaction(editingId, payload);
    } else {
      addFinanceTransaction(payload);
    }

    resetTransactionForm();
  };

  const handleEditTransaction = (transaction: any) => {
    if (transaction.transferGroupId) return;
    setComposerMode('transaction');
    setEditingId(transaction.id);
    setTransactionForm({
      type: transaction.type,
      amount: String(Math.abs(transaction.amount || 0)),
      adjustmentDirection: transaction.amount < 0 ? 'decrease' : 'increase',
      date: transaction.date,
      description: transaction.description || '',
      category: transaction.category || '',
      linkToCashflow: Boolean(transaction.linkedCashflowId),
      linkedPortfolioId: transaction.linkedPortfolioId || activePortfolioId || 'default',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTransaction = async (transaction: any) => {
    const isConfirmed = await confirm(
      transaction.transferGroupId
        ? 'Transfer ini akan dihapus dari rekening asal dan tujuan sekaligus.'
        : 'Apakah Anda yakin ingin menghapus transaksi finance ini?',
      {
        title: transaction.transferGroupId ? 'Hapus Transfer Internal' : 'Hapus Transaksi Finance',
        severity: 'danger',
        confirmText: 'Hapus',
      },
    );

    if (isConfirmed) {
      deleteFinanceTransaction(transaction.id);
    }
  };

  const handleTransferSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    createFinanceTransfer({
      fromAccountId: account.id,
      toAccountId: transferForm.toAccountId,
      amount: transferForm.amount,
      date: transferForm.date,
      description: transferForm.description,
    });
    setTransferForm(createInitialTransferForm());
  };

  const handlePortfolioTransferSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    createFinancePortfolioTransfer({
      accountId: account.id,
      portfolioId: portfolioTransferForm.portfolioId,
      amount: portfolioTransferForm.amount,
      date: portfolioTransferForm.date,
      description: portfolioTransferForm.description,
    });
    setPortfolioTransferForm(createInitialPortfolioTransferForm(activePortfolioId));
  };

  const handlePortfolioWithdrawalSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    createPortfolioToFinanceTransfer({
      accountId: account.id,
      portfolioId: portfolioWithdrawalForm.portfolioId,
      amount: portfolioWithdrawalForm.amount,
      date: portfolioWithdrawalForm.date,
      description: portfolioWithdrawalForm.description,
    });
    setPortfolioWithdrawalForm(createInitialPortfolioWithdrawalForm(activePortfolioId));
  };

  const composerOptions = [
    { value: 'transaction', title: editingId ? 'Edit Mutasi' : 'Mutasi Biasa', description: 'Pemasukan, pengeluaran, atau adjustment.' },
    { value: 'transfer', title: 'Antar Rekening', description: 'Pindah dana antar bank atau e-wallet.' },
    { value: 'to_portfolio', title: 'Ke Dompet Trading', description: 'Top up modal dari rekening ke portofolio.' },
    { value: 'from_portfolio', title: 'Dari Dompet Trading', description: 'Tarik dana dari portofolio ke rekening.' },
  ] as const;

  return (
    <div>
      <div className="finance-ledger-toolbar">
        <div>
          <Link to="/finance" className="btn btn-secondary" style={{ marginBottom: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={16} />
              Kembali ke Daftar Rekening
            </span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="text-zinc-600 dark:text-zinc-400">
              <Landmark size={28} />
            </div>
            <div>
              <h1 className="page-title" style={{ marginBottom: 4 }}>{account.name}</h1>
              <p className="page-subtitle">{account.institutionName} • {account.type === 'bank' ? 'Bank Account' : 'E-Wallet Ledger'}</p>
            </div>
          </div>
        </div>
        <div style={{ minWidth: 260 }}>
          <div className="stat-card">
            <div className="stat-card-label">Saldo Berjalan</div>
            <div className="stat-card-value" style={blurStyle}>{formatRupiah(balance)}</div>
            <div className="finance-summary-note">{accountTransactions.length} transaksi • {linkedCount} linked ke trading</div>
          </div>
        </div>
      </div>

      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-label">Saldo Awal</div>
          <div className="stat-card-value" style={blurStyle}>{formatRupiah(account.openingBalance || 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Status Rekening</div>
          <div className="stat-card-value">{account.isActive ? 'Aktif' : 'Nonaktif'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Transaksi Linked</div>
          <div className="stat-card-value">{linkedCount}</div>
        </div>
      </div>

      {linkedPortfolioOverview.linkedPortfolios.length > 0 ? (
        <div className="card" style={{ marginBottom: 24, border: '1px solid rgba(59,130,246,0.18)' }}>
          <div className="card-body">
            <div style={{ marginBottom: 16 }}>
              <h3 className="card-title" style={{ marginBottom: 4 }}>Ringkasan Rekening + Dompet</h3>
              <p className="analytics-secondary-text">Rekening ini terhubung ke {linkedPortfolioOverview.linkedPortfolios.length} dompet.</p>
            </div>
            <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 12 }}>
              <div className="stat-card">
                <div className="stat-card-label">Saldo Bank</div>
                <div className="stat-card-value" style={blurStyle}>{formatRupiah(balance)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Saldo Dompet Terkait</div>
                <div className="stat-card-value" style={blurStyle}>{formatRupiah(linkedPortfolioOverview.totalLinkedPortfolioBalance)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Total Keseluruhan</div>
                <div className="stat-card-value text-profit" style={blurStyle}>{formatRupiah(combinedBalance)}</div>
              </div>
            </div>
            <div className="finance-helper-text">
              Dompet terkait: {linkedPortfolioOverview.linkedPortfolios.map((portfolio: any) => portfolio.name).join(', ')}
            </div>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <div style={{ marginBottom: 16 }}>
            <h3 className="card-title" style={{ marginBottom: 4 }}>Pusat Input Transaksi</h3>
            <p className="analytics-secondary-text">Pilih dulu aksi yang ingin dilakukan, lalu isi form yang muncul. Halaman jadi lebih ringkas tanpa kehilangan fungsi.</p>
          </div>

          <div className="finance-composer-tabs">
            {composerOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`finance-composer-tab ${composerMode === option.value ? 'is-active' : ''}`}
                onClick={() => setComposerMode(option.value)}
              >
                <span className="finance-composer-tab-title">{option.title}</span>
                <span className="finance-composer-tab-desc">{option.description}</span>
              </button>
            ))}
          </div>

          {composerMode === 'transaction' ? (
            <form onSubmit={handleTransactionSubmit}>
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>{editingId ? 'Edit Mutasi Ledger' : 'Catat Mutasi Ledger'}</h4>
                <div className="finance-helper-text">Gunakan pemasukan, pengeluaran, atau adjustment untuk mutasi kas non-transfer.</div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-transaction-type">Jenis Transaksi</label>
                  <CustomSelect
                    value={transactionForm.type}
                    onChange={(value) => handleTransactionChange('type', value)}
                    options={FINANCE_TRANSACTION_TYPE_OPTIONS}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-transaction-amount">Nominal *</label>
                  <CurrencyInput
                    id="finance-transaction-amount"
                    value={transactionForm.amount}
                    onChange={(value) => handleTransactionChange('amount', value)}
                    placeholder="1.000.000"
                  />
                  <div className="finance-helper-text">
                    {transactionForm.type === 'adjustment' ? 'Adjustment mendukung naik atau turun saldo.' : 'Nominal otomatis diperlakukan sebagai nilai positif.'}
                  </div>
                </div>
              </div>

              {transactionForm.type === 'adjustment' ? (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="finance-adjustment-direction">Arah Adjustment</label>
                    <CustomSelect
                      value={transactionForm.adjustmentDirection}
                      onChange={(value) => handleTransactionChange('adjustmentDirection', value)}
                      options={[
                        { value: 'increase', label: 'Tambah Saldo' },
                        { value: 'decrease', label: 'Kurangi Saldo' }
                      ]}
                    />
                  </div>
                </div>
              ) : null}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-transaction-date">Tanggal *</label>
                  <CustomDatePicker
                    value={transactionForm.date}
                    onChange={(date) => handleTransactionChange('date', format(date, 'yyyy-MM-dd'))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-transaction-category">Kategori</label>
                  <input id="finance-transaction-category" className="form-input" value={transactionForm.category} onChange={(event) => handleTransactionChange('category', event.target.value)} placeholder="Gaji, kebutuhan, refund, dana trading, dst." />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-transaction-description">Deskripsi *</label>
                  <input id="finance-transaction-description" className="form-input" value={transactionForm.description} onChange={(event) => handleTransactionChange('description', event.target.value)} placeholder="Top up, bayar tagihan, alokasi modal, dll." required />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <SelectionToggleCard
                  checked={Boolean(transactionForm.linkToCashflow)}
                  onToggle={() => handleTransactionChange('linkToCashflow', !Boolean(transactionForm.linkToCashflow))}
                  title="Link ke cashflow trading"
                  description="Aktifkan jika transaksi ini juga perlu tercatat di cashflow portofolio trading."
                  compact
                />
              </div>

              {transactionForm.linkToCashflow ? (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="finance-transaction-portfolio">Portofolio Trading</label>
                    <CustomSelect
                      value={transactionForm.linkedPortfolioId}
                      onChange={(value) => handleTransactionChange('linkedPortfolioId', value)}
                      options={portfolios.map((portfolio: any) => ({ value: portfolio.id, label: portfolio.name }))}
                    />
                  </div>
                </div>
              ) : null}

              <div className="finance-actions">
                <button type="submit" className="btn btn-primary">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Save size={16} />
                    {editingId ? 'Update Transaksi' : 'Simpan Transaksi'}
                  </span>
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetTransactionForm}>Reset</button>
              </div>
            </form>
          ) : null}

          {composerMode === 'transfer' ? (
            <form onSubmit={handleTransferSubmit}>
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>Transfer Antar Rekening</h4>
                <div className="finance-helper-text">Sistem otomatis membuat pasangan transfer masuk dan keluar agar saldo global tetap netral.</div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Dari Rekening</label>
                  <input className="form-input" value={account.name} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-transfer-target">Ke Rekening *</label>
                  <CustomSelect
                    value={transferForm.toAccountId}
                    onChange={(value) => handleTransferChange('toAccountId', value)}
                    options={[
                      { value: '', label: 'Pilih rekening tujuan' },
                      ...counterpartyOptions.map((item: any) => ({
                        value: item.id,
                        label: `${item.name} • ${item.institutionName}`
                      }))
                    ]}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-transfer-amount">Nominal *</label>
                  <CurrencyInput
                    id="finance-transfer-amount"
                    value={transferForm.amount}
                    onChange={(value) => handleTransferChange('amount', value)}
                    placeholder="1.000.000"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-transfer-date">Tanggal *</label>
                  <CustomDatePicker
                    value={transferForm.date}
                    onChange={(date) => handleTransferChange('date', format(date, 'yyyy-MM-dd'))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-transfer-description">Deskripsi</label>
                  <input id="finance-transfer-description" className="form-input" value={transferForm.description} onChange={(event) => handleTransferChange('description', event.target.value)} placeholder="Pindah dana ke e-wallet / ke rekening utama" />
                </div>
              </div>
              <div className="finance-actions">
                <button type="submit" className="btn btn-primary">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ArrowRightLeft size={16} />
                    Simpan Transfer
                  </span>
                </button>
              </div>
            </form>
          ) : null}

          {composerMode === 'to_portfolio' ? (
            <form onSubmit={handlePortfolioTransferSubmit}>
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>Transfer ke Dompet Trading</h4>
                <div className="finance-helper-text">Dana keluar dari rekening ini, lalu masuk ke dompet trading sebagai cashflow deposit.</div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Dari Rekening</label>
                  <input className="form-input" value={account.name} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-portfolio-transfer-target">Ke Dompet *</label>
                  <CustomSelect
                    value={portfolioTransferForm.portfolioId}
                    onChange={(value) => handlePortfolioTransferChange('portfolioId', value)}
                    options={portfolios.map((portfolio: any) => ({ value: portfolio.id, label: portfolio.name }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-portfolio-transfer-amount">Nominal *</label>
                  <CurrencyInput
                    id="finance-portfolio-transfer-amount"
                    value={portfolioTransferForm.amount}
                    onChange={(value) => handlePortfolioTransferChange('amount', value)}
                    placeholder="1.000.000"
                  />
                  <div className="finance-helper-text">Ledger rekening tercatat sebagai pengeluaran, sementara dompet menerima dana masuk.</div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-portfolio-transfer-date">Tanggal *</label>
                  <CustomDatePicker
                    value={portfolioTransferForm.date}
                    onChange={(date) => handlePortfolioTransferChange('date', format(date, 'yyyy-MM-dd'))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-portfolio-transfer-description">Deskripsi</label>
                  <input
                    id="finance-portfolio-transfer-description"
                    className="form-input"
                    value={portfolioTransferForm.description}
                    onChange={(event) => handlePortfolioTransferChange('description', event.target.value)}
                    placeholder="Top up modal trading / pindah dana ke dompet"
                  />
                </div>
              </div>
              <div className="finance-actions">
                <button type="submit" className="btn btn-primary">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ArrowRightLeft size={16} />
                    Transfer ke Dompet
                  </span>
                </button>
              </div>
            </form>
          ) : null}

          {composerMode === 'from_portfolio' ? (
            <form onSubmit={handlePortfolioWithdrawalSubmit}>
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>Tarik Dana dari Dompet Trading</h4>
                <div className="finance-helper-text">Dana keluar dari dompet trading lalu masuk ke rekening finance ini.</div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-portfolio-withdrawal-source">Dari Dompet *</label>
                  <CustomSelect
                    value={portfolioWithdrawalForm.portfolioId}
                    onChange={(value) => handlePortfolioWithdrawalChange('portfolioId', value)}
                    options={portfolios.map((portfolio: any) => ({ value: portfolio.id, label: portfolio.name }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ke Rekening</label>
                  <input className="form-input" value={account.name} disabled />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-portfolio-withdrawal-amount">Nominal *</label>
                  <CurrencyInput
                    id="finance-portfolio-withdrawal-amount"
                    value={portfolioWithdrawalForm.amount}
                    onChange={(value) => handlePortfolioWithdrawalChange('amount', value)}
                    placeholder="1.000.000"
                  />
                  <div className="finance-helper-text">Dompet trading akan tercatat sebagai cashflow keluar, sementara rekening ini menerima pemasukan.</div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-portfolio-withdrawal-date">Tanggal *</label>
                  <CustomDatePicker
                    value={portfolioWithdrawalForm.date}
                    onChange={(date) => handlePortfolioWithdrawalChange('date', format(date, 'yyyy-MM-dd'))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-portfolio-withdrawal-description">Deskripsi</label>
                  <input
                    id="finance-portfolio-withdrawal-description"
                    className="form-input"
                    value={portfolioWithdrawalForm.description}
                    onChange={(event) => handlePortfolioWithdrawalChange('description', event.target.value)}
                    placeholder="Tarik profit / pindah dana dari dompet trading"
                  />
                </div>
              </div>
              <div className="finance-actions">
                <button type="submit" className="btn btn-primary">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ArrowRightLeft size={16} />
                    Tarik ke Rekening
                  </span>
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Ledger Rekening</h3>
        </div>
        <div className="card-body">
          <div className="finance-ledger-toolbar">
            <div className="finance-inline-form">
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
            <button type="button" className="btn btn-secondary" onClick={() => { setTypeFilter('all'); setDateFrom(''); setDateTo(''); }}>
              Reset Filter
            </button>
          </div>

          {sortedItems.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 8px' }}>
              <div className="empty-state-icon"><Plus size={40} /></div>
              <div className="empty-state-title">Belum ada mutasi ledger</div>
              <div className="empty-state-desc">Tambahkan transaksi biasa atau transfer agar histori rekening ini mulai terbentuk.</div>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none', margin: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th><SortableTableHeader label="Tanggal" sortKey="date" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th><SortableTableHeader label="Tipe" sortKey="type" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th><SortableTableHeader label="Deskripsi" sortKey="description" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th><SortableTableHeader label="Nominal" sortKey="amount" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((transaction: any) => {
                    const signedAmount = getFinanceTransactionAmountForDisplay(transaction);
                    const amountClass = signedAmount >= 0 ? 'positive' : 'negative';
                    const counterparty = transaction.counterpartyAccountId
                      ? financeAccounts.find((item: any) => item.id === transaction.counterpartyAccountId)
                      : null;

                    return (
                      <tr key={transaction.id}>
                        <td>{formatDate(transaction.date)}</td>
                        <td>
                          <div className="finance-pill">{getFinanceTransactionTypeLabel(transaction.type)}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{transaction.description || '-'}</div>
                          <div className="finance-helper-text">
                            {transaction.category || 'Tanpa kategori'}
                            {counterparty ? ` • ${counterparty.name}` : ''}
                            {transaction.linkedCashflowId ? ' • Linked cashflow' : ''}
                          </div>
                        </td>
                        <td>
                          <div className={`finance-table-amount ${amountClass}`} style={blurStyle}>
                            {signedAmount > 0 ? '+' : ''}{formatRupiah(signedAmount)}
                          </div>
                        </td>
                        <td>
                          <div className="finance-actions">
                            {!transaction.transferGroupId ? (
                              <button type="button" className="btn btn-ghost" onClick={() => handleEditTransaction(transaction)}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Pencil size={16} />
                                  Edit
                                </span>
                              </button>
                            ) : null}
                            <button type="button" className="btn btn-ghost" onClick={() => handleDeleteTransaction(transaction)}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Trash2 size={16} />
                                Hapus
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
