import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useData } from '@/modules/shared/context/DataContext';
import { formatRupiah, formatCompactNumber } from '@/modules/shared/utils/formatters';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import StatCard from '@/modules/shared/components/StatCard';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import { useTableSort } from '@/modules/shared/hooks/useTableSort';
import { calculatePortfolioBalance, calculateUnrealizedPnL } from '@/modules/trades/calculations';
import CustomSelect from '@/modules/shared/components/CustomSelect';
import { Wallet, Landmark, Eye, EyeOff, CheckCircle, Trash2 } from 'lucide-react';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#F43F5E', '#06B6D4', '#EC4899', '#84CC16'];

interface WealthPreset {
  id: string;
  name: string;
  excludedFinanceAccountIds: string[];
  excludedPortfolioIds: string[];
}

export default function WealthDashboardPage() {
  const { allTrades: trades, allCashflows: cashflows, allDividends: dividends, settings, updateSettings, marketPrices, portfolios, financeAccounts, getFinanceAccountCurrentBalance } = useData();
  const blurStyle = usePrivacyStyle();
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('ALL');
  
  const [excludedFinanceAccountIds, setExcludedFinanceAccountIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('wealth_excludedFinanceAccountIds');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  const [excludedPortfolioIds, setExcludedPortfolioIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('wealth_excludedPortfolioIds');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [activePresetId, setActivePresetId] = useState<string>('ALL');

  const [presets, setPresets] = useState<WealthPreset[]>(() => {
    const saved = localStorage.getItem('wealth_presets');
    return saved ? JSON.parse(saved) : [];
  });

  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [modalExcludedPortfolios, setModalExcludedPortfolios] = useState<Set<string>>(new Set());
  const [modalExcludedAccounts, setModalExcludedAccounts] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('wealth_excludedFinanceAccountIds', JSON.stringify(Array.from(excludedFinanceAccountIds)));
  }, [excludedFinanceAccountIds]);

  useEffect(() => {
    localStorage.setItem('wealth_excludedPortfolioIds', JSON.stringify(Array.from(excludedPortfolioIds)));
  }, [excludedPortfolioIds]);

  useEffect(() => {
    localStorage.setItem('wealth_presets', JSON.stringify(presets));
  }, [presets]);

  const handlePresetChange = (value: string) => {
    setActivePresetId(value);
    if (value === 'ALL') {
      setExcludedFinanceAccountIds(new Set());
      setExcludedPortfolioIds(new Set());
    } else if (value !== 'CUSTOM') {
      const preset = presets.find(p => p.id === value);
      if (preset) {
        setExcludedFinanceAccountIds(new Set(preset.excludedFinanceAccountIds));
        setExcludedPortfolioIds(new Set(preset.excludedPortfolioIds));
      }
    }
  };

  const openPresetModal = () => {
    setNewPresetName('');
    setModalExcludedPortfolios(new Set());
    setModalExcludedAccounts(new Set());
    setIsPresetModalOpen(true);
  };

  const handleSaveNewPreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: WealthPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      excludedFinanceAccountIds: Array.from(modalExcludedAccounts),
      excludedPortfolioIds: Array.from(modalExcludedPortfolios),
    };
    setPresets(prev => [...prev, newPreset]);
    setActivePresetId(newPreset.id);
    setExcludedFinanceAccountIds(modalExcludedAccounts);
    setExcludedPortfolioIds(modalExcludedPortfolios);
    setIsPresetModalOpen(false);
  };

  const handleDeletePreset = (id: string) => {
    setDeleteConfirmId(id);
  };

  const executeDelete = () => {
    if (deleteConfirmId) {
      setPresets(prev => prev.filter(p => p.id !== deleteConfirmId));
      setActivePresetId('ALL');
      setExcludedFinanceAccountIds(new Set());
      setExcludedPortfolioIds(new Set());
      setDeleteConfirmId(null);
    }
  };

  const toggleFinanceAccount = (id: string) => {
    setActivePresetId('CUSTOM');
    setExcludedFinanceAccountIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePortfolio = (id: string) => {
    setActivePresetId('CUSTOM');
    setExcludedPortfolioIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const usdToIdrRate = settings.usdToIdrRate ?? 16200;

  // 1. Calculate Open Positions Across ALL Portfolios
  const consolidatedOpenTrades = useMemo(() => {
    return trades
      .filter((trade) => !trade.dateSell || trade.sellPrice == null)
      .map((trade) => {
        const isUS = trade.market === 'US';
        const isMutualFund = trade.assetType === 'mutual_fund';
        const shares = isMutualFund ? trade.lots : (isUS ? trade.lots : trade.lots * 100);
        
        let buyPriceInIdr = trade.buyPrice;
        if (isUS) buyPriceInIdr = trade.buyPrice * usdToIdrRate;

        const totalBuyInIdr = buyPriceInIdr * shares;
        
        let currentPrice = (marketPrices && marketPrices[trade.stockCode]) || trade.sellPrice || 0;
        let currentPriceInIdr = currentPrice;
        if (isUS && currentPrice > 0) currentPriceInIdr = currentPrice * usdToIdrRate;

        let floatingPnLIdr = 0;
        let floatingPnLPercent = 0;
        if (currentPrice > 0) {
           const unrealized = calculateUnrealizedPnL(trade.buyPrice, currentPrice, trade.lots, trade.buyFee, trade.market || 'ID', trade.assetType || 'stock');
           floatingPnLPercent = unrealized.pnlPercent;
           floatingPnLIdr = isUS ? unrealized.pnl * usdToIdrRate : unrealized.pnl;
        }

        const portfolioName = portfolios.find(p => p.id === (trade.portfolioId || 'default'))?.name || 'Default';

        return { 
          ...trade, 
          shares, 
          buyPriceInIdr, 
          totalBuyInIdr, 
          currentPriceInIdr, 
          floatingPnLIdr, 
          floatingPnLPercent,
          portfolioName,
          isUS
        };
      });
  }, [trades, marketPrices, usdToIdrRate, portfolios]);

  const filteredOpenTrades = useMemo(() => {
    if (selectedPortfolioId === 'ALL') return consolidatedOpenTrades;
    return consolidatedOpenTrades.filter(t => (t.portfolioId || 'default') === selectedPortfolioId);
  }, [consolidatedOpenTrades, selectedPortfolioId]);

  const { sortConfig, sortedItems: sortedOpenTrades, requestSort } = useTableSort(filteredOpenTrades, {
    initialKey: 'portfolioName',
    getValue: (trade: any, key: string) => {
      return trade[key] || 0;
    },
  });

  // 2. Calculate Portfolio Stats
  const portfolioStats = useMemo(() => {
    const result: { id: string, name: string, equity: number, bp: number, inv: number, float: number }[] = [];
    
    portfolios.forEach(p => {
      const isDefault = p.id === 'default';
      const idInit = isDefault ? (settings.initialCapital ?? 10000000) : 0;
      const usInit = isDefault ? (settings.initialCapitalUS ?? 1000) : 0;
      
      const pTrades = trades.filter(t => t.portfolioId === p.id || (!t.portfolioId && isDefault));
      const pCashflows = cashflows.filter(c => c.portfolioId === p.id || (!c.portfolioId && isDefault));
      const pDividends = dividends.filter(d => d.portfolioId === p.id || (!d.portfolioId && isDefault));
      
      const pIdTrades = pTrades.filter(t => t.market !== 'US');
      const pIdCash = pCashflows.filter(c => (c as any).market !== 'US');
      const pIdDiv = pDividends.filter(d => (d as any).market !== 'US');
      const idStats = calculatePortfolioBalance(pIdTrades, pIdCash, pIdDiv, idInit);

      const pUsTrades = pTrades.filter(t => t.market === 'US');
      const pUsCash = pCashflows.filter(c => (c as any).market === 'US');
      const pUsDiv = pDividends.filter(d => (d as any).market === 'US');
      const usStats = calculatePortfolioBalance(pUsTrades, pUsCash, pUsDiv, usInit);

      const bp = idStats.buyingPower + (usStats.buyingPower * usdToIdrRate);
      
      const openForP = consolidatedOpenTrades.filter(t => (t.portfolioId || 'default') === p.id);
      const inv = openForP.reduce((sum, t) => sum + t.totalBuyInIdr, 0);
      const float = openForP.reduce((sum, t) => sum + t.floatingPnLIdr, 0);

      const equity = bp + inv + float;
      result.push({ id: p.id, name: p.name, equity, bp, inv, float });
    });

    return result.sort((a, b) => b.equity - a.equity);
  }, [portfolios, trades, cashflows, dividends, settings, usdToIdrRate, consolidatedOpenTrades]);

  const totalTradingEquity = useMemo(() => {
    return portfolioStats
      .filter(p => !excludedPortfolioIds.has(p.id))
      .reduce((sum, p) => sum + p.equity, 0);
  }, [portfolioStats, excludedPortfolioIds]);

  // 3. Calculate Bank Balances
  const totalBankBalance = useMemo(() => {
    // Only active finance accounts and not excluded
    return financeAccounts
      .filter(a => a.isActive !== false && !excludedFinanceAccountIds.has(a.id))
      .reduce((sum, a) => sum + (getFinanceAccountCurrentBalance(a.id) || 0), 0);
  }, [financeAccounts, getFinanceAccountCurrentBalance, excludedFinanceAccountIds]);

  // 4. Calculate Net Worth
  const netWorth = totalTradingEquity + totalBankBalance;

  const pieData = useMemo(() => {
    return [
      { name: 'Trading Portfolios', value: totalTradingEquity },
      { name: 'Bank & E-Wallet', value: totalBankBalance }
    ].filter(d => d.value > 0);
  }, [totalTradingEquity, totalBankBalance]);

  // 5. Portfolio Distribution
  const portfolioDistribution = useMemo(() => {
    return portfolioStats
      .filter(p => p.equity > 0 && !excludedPortfolioIds.has(p.id))
      .map(p => ({ name: p.name, value: p.equity }));
  }, [portfolioStats, excludedPortfolioIds]);

  // 6. Cash vs Invested
  const cashVsInvestedData = useMemo(() => {
    const includedStats = portfolioStats.filter(p => !excludedPortfolioIds.has(p.id));
    const cashValue = includedStats.reduce((sum, p) => sum + p.bp, 0);
    const investedValue = includedStats.reduce((sum, p) => sum + p.inv + p.float, 0);

    return [
      { name: 'Kas (Buying Power)', value: Math.max(0, cashValue) },
      { name: 'Investasi Saham', value: Math.max(0, investedValue) }
    ].filter(d => d.value > 0);
  }, [portfolioStats, excludedPortfolioIds]);

  // 7. IDR vs USD
  const currencyDistribution = useMemo(() => {
    const includedTrades = trades.filter(t => !excludedPortfolioIds.has(t.portfolioId || 'default'));
    const includedCashflows = cashflows.filter(c => !excludedPortfolioIds.has(c.portfolioId || 'default'));
    const includedDividends = dividends.filter(d => !excludedPortfolioIds.has(d.portfolioId || 'default'));
    const includedOpen = consolidatedOpenTrades.filter(t => !excludedPortfolioIds.has(t.portfolioId || 'default'));
    
    // For IDR, if default is excluded, initialCapital should be 0
    const includeDefault = !excludedPortfolioIds.has('default');

    const idTrades = includedTrades.filter(t => t.market !== 'US');
    const idCashflows = includedCashflows.filter(c => (c as any).market !== 'US');
    const idDividends = includedDividends.filter(d => (d as any).market !== 'US');
    const idInit = includeDefault ? (settings.initialCapital ?? 10000000) : 0;
    const idStats = calculatePortfolioBalance(idTrades, idCashflows, idDividends, idInit);
    const idOpen = includedOpen.filter(t => !t.isUS);
    const idInvested = idOpen.reduce((sum, t) => sum + t.totalBuyInIdr, 0);
    const idFloat = idOpen.reduce((sum, t) => sum + t.floatingPnLIdr, 0);
    const idTradingEquity = idStats.buyingPower + idInvested + idFloat;

    const usTrades = includedTrades.filter(t => t.market === 'US');
    const usCashflows = includedCashflows.filter(c => (c as any).market === 'US');
    const usDividends = includedDividends.filter(d => (d as any).market === 'US');
    const usInit = includeDefault ? (settings.initialCapitalUS ?? 1000) : 0;
    const usStats = calculatePortfolioBalance(usTrades, usCashflows, usDividends, usInit);
    const usOpen = includedOpen.filter(t => t.isUS);
    const usInvested = usOpen.reduce((sum, t) => sum + t.totalBuyInIdr, 0);
    const usFloat = usOpen.reduce((sum, t) => sum + t.floatingPnLIdr, 0);
    const usTradingEquity = (usStats.buyingPower * usdToIdrRate) + usInvested + usFloat;

    const totalIdr = totalBankBalance + idTradingEquity;
    const totalUsd = usTradingEquity;

    return [
      { name: 'Rupiah (IDR)', value: Math.max(0, totalIdr) },
      { name: 'Dollar (USD)', value: Math.max(0, totalUsd) }
    ].filter(d => d.value > 0);

  }, [trades, cashflows, dividends, settings, usdToIdrRate, consolidatedOpenTrades, totalBankBalance, excludedPortfolioIds]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            Wealth Dashboard
            <button
              onClick={() => updateSettings({ privacyMode: !settings.privacyMode })}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                padding: 4,
                borderRadius: '50%',
                transition: 'background var(--transition-fast)'
              }}
              title={settings.privacyMode ? "Tampilkan Nominal" : "Sembunyikan Nominal"}
            >
              {settings.privacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </h1>
          <p className="page-subtitle">Pantau seluruh kekayaan Anda di satu tempat</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: '12px 16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Tampilan Preset:</span>
        
        <div style={{ width: 240 }}>
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

        {activePresetId !== 'ALL' && activePresetId !== 'CUSTOM' && (
          <button 
            className="btn btn-sm btn-ghost" 
            onClick={() => handleDeletePreset(activePresetId)}
            title="Hapus preset ini"
            style={{ color: 'var(--text-loss)', padding: '6px' }}
          >
            <Trash2 size={16} />
          </button>
        )}

        <button className="btn btn-sm btn-primary" style={{ marginLeft: 'auto' }} onClick={openPresetModal}>
          + Buat Preset Baru
        </button>
      </div>

      {isPresetModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 400, maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header"><h3 className="card-title">Buat Preset Baru</h3></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">Nama Preset</label>
                <input type="text" className="form-input" value={newPresetName} onChange={e => setNewPresetName(e.target.value)} placeholder="Misal: Aset Pribadi" autoFocus />
              </div>
              
              <div>
                <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Pilih Dompet (Trading)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto', padding: 8, border: '1px solid var(--border-color)', borderRadius: 8 }}>
                  {portfolios.map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" className="form-checkbox" checked={!modalExcludedPortfolios.has(p.id)} onChange={() => {
                        setModalExcludedPortfolios(prev => {
                          const next = new Set(prev);
                          if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                          return next;
                        });
                      }} />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Pilih Rekening Bank & E-Wallet</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto', padding: 8, border: '1px solid var(--border-color)', borderRadius: 8 }}>
                  {financeAccounts.filter(a => a.isActive !== false).map(a => (
                    <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" className="form-checkbox" checked={!modalExcludedAccounts.has(a.id)} onChange={() => {
                        setModalExcludedAccounts(prev => {
                          const next = new Set(prev);
                          if (next.has(a.id)) next.delete(a.id); else next.add(a.id);
                          return next;
                        });
                      }} />
                      {a.name}
                    </label>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button className="btn btn-ghost" onClick={() => setIsPresetModalOpen(false)}>Batal</button>
                <button className="btn btn-primary" onClick={handleSaveNewPreset} disabled={!newPresetName.trim()}>Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 320, maxWidth: '90%' }}>
            <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 className="card-title" style={{ color: 'var(--accent-red)' }}>Hapus Preset</h3>
            </div>
            <div className="card-body" style={{ paddingTop: 16 }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.95rem' }}>
                Apakah Anda yakin ingin menghapus preset ini? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setDeleteConfirmId(null)}>Batal</button>
                <button className="btn btn-danger" onClick={executeDelete}>Hapus</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bento-grid" style={{ marginBottom: 24 }}>
        <div className="bento-col-4">
          <StatCard
            icon={CheckCircle}
            label="Total Net Worth"
            value={formatRupiah(netWorth)}
            bgColor="var(--accent-purple-dim)"
            valueStyle={{ ...blurStyle, fontSize: '1.8rem', fontWeight: 700 }}
          />
        </div>
        <div className="bento-col-4">
          <StatCard
            icon={Wallet}
            label="Trading Equity (Total)"
            value={formatRupiah(totalTradingEquity)}
            bgColor="var(--accent-blue-dim)"
            valueStyle={blurStyle}
          />
        </div>
        <div className="bento-col-4">
          <StatCard
            icon={Landmark}
            label="Bank & E-Wallet (Total)"
            value={formatRupiah(totalBankBalance)}
            bgColor="var(--accent-green-dim)"
            valueStyle={blurStyle}
          />
        </div>
      </div>

      <div className="grid-3" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Alokasi Kekayaan</h3></div>
          <div className="card-body" style={{ height: 300 }}>
            {netWorth > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={2}>
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatRupiah(value)} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-secondary)' }} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.8rem' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 16px', marginTop: '-20px' }}>
                  {pieData.map((item, index) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[index % COLORS.length] }} />
                      <span>{item.name}</span>
                      <span style={{ fontWeight: 600, ...blurStyle }}>{((item.value / netWorth) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
               <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                 Belum ada data aset
               </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Dompet Trading</h3></div>
          <div className="table-container" style={{ border: 'none', maxHeight: 300, overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>Aktif</th>
                  <th>Nama Dompet</th>
                  <th style={{ textAlign: 'right' }}>Ekuitas</th>
                </tr>
              </thead>
              <tbody>
                {portfolioStats.map((portfolio) => (
                  <tr key={portfolio.id} style={{ opacity: excludedPortfolioIds.has(portfolio.id) ? 0.5 : 1 }}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        className="form-checkbox"
                        checked={!excludedPortfolioIds.has(portfolio.id)}
                        onChange={() => togglePortfolio(portfolio.id)}
                      />
                    </td>
                    <td><strong>{portfolio.name}</strong></td>
                    <td style={{ textAlign: 'right', fontWeight: 600, ...blurStyle }}>
                      {formatRupiah(portfolio.equity)}
                    </td>
                  </tr>
                ))}
                {portfolioStats.length === 0 && (
                   <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data dompet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Rekening Bank & E-Wallet</h3></div>
          <div className="table-container" style={{ border: 'none', maxHeight: 300, overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>Aktif</th>
                  <th>Nama Rekening</th>
                  <th style={{ textAlign: 'right' }}>Saldo Terkini</th>
                </tr>
              </thead>
              <tbody>
                {financeAccounts.filter(a => a.isActive !== false).map((account) => {
                  const balance = getFinanceAccountCurrentBalance(account.id);
                  return (
                    <tr key={account.id} style={{ opacity: excludedFinanceAccountIds.has(account.id) ? 0.5 : 1 }}>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          className="form-checkbox"
                          checked={!excludedFinanceAccountIds.has(account.id)}
                          onChange={() => toggleFinanceAccount(account.id)}
                        />
                      </td>
                      <td><strong>{account.name}</strong></td>
                      <td style={{ textAlign: 'right', fontWeight: 600, ...blurStyle }}>
                        {formatRupiah(balance || 0)}
                      </td>
                    </tr>
                  );
                })}
                {financeAccounts.filter(a => a.isActive !== false).length === 0 && (
                   <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data rekening</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid-3" style={{ alignItems: 'start', marginTop: 24 }}>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Sebaran Ekuitas Dompet</h3></div>
          <div className="card-body" style={{ minHeight: 320, display: 'flex', flexDirection: 'column' }}>
            {portfolioDistribution.length > 0 ? (
              <>
                <div style={{ height: 220, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={portfolioDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={2}>
                        {portfolioDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatRupiah(value)} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-secondary)' }} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.8rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 12px', paddingTop: 16 }}>
                  {portfolioDistribution.map((item, index) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[index % COLORS.length] }} />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
               <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Belum ada data ekuitas dompet</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Kas vs Investasi Saham</h3></div>
          <div className="card-body" style={{ minHeight: 320, display: 'flex', flexDirection: 'column' }}>
            {cashVsInvestedData.length > 0 ? (
              <>
                <div style={{ height: 220, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={cashVsInvestedData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={0}>
                        <Cell fill="var(--accent-green)" />
                        <Cell fill="var(--accent-blue)" />
                      </Pie>
                      <Tooltip formatter={(value: number) => formatRupiah(value)} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-secondary)' }} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.8rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 12px', paddingTop: 16 }}>
                  {cashVsInvestedData.map((item, index) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: index === 0 ? 'var(--accent-green)' : 'var(--accent-blue)' }} />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
               <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Belum ada data trading</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Distribusi Mata Uang</h3></div>
          <div className="card-body" style={{ height: 320, padding: '16px 16px 16px 0' }}>
            {currencyDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currencyDistribution} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(val) => `Rp ${formatCompactNumber(val)}`} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip formatter={(value: number) => formatRupiah(value)} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-secondary)' }} cursor={{ fill: 'var(--bg-secondary)' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.8rem' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {currencyDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#3B82F6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : (
               <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Belum ada data mata uang</div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <h3 className="card-title">Posisi Terbuka (Trading)</h3>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            <button
              onClick={() => setSelectedPortfolioId('ALL')}
              className={`btn btn-sm ${selectedPortfolioId === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Semua Dompet
            </button>
            {portfolios.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPortfolioId(p.id)}
                className={`btn btn-sm ${selectedPortfolioId === p.id ? 'btn-primary' : 'btn-ghost'}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th><SortableTableHeader label="Kode" sortKey="stockCode" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Dompet" sortKey="portfolioName" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Market" sortKey="isUS" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Harga Beli" sortKey="buyPriceInIdr" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Qty (Lots)" sortKey="lots" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Total Investasi" sortKey="totalBuyInIdr" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Floating P/L" sortKey="floatingPnLIdr" sortConfig={sortConfig} onSort={requestSort} /></th>
              </tr>
            </thead>
            <tbody>
              {sortedOpenTrades.map((trade) => (
                <tr key={trade.id}>
                  <td><strong>{trade.stockCode}</strong></td>
                  <td><span className="badge">{trade.portfolioName}</span></td>
                  <td>{trade.isUS ? <span className="badge badge-warning">US</span> : <span className="badge badge-info">ID</span>}</td>
                  <td style={blurStyle}>{formatRupiah(trade.buyPriceInIdr)}</td>
                  <td>{trade.lots}</td>
                  <td style={blurStyle}>{formatRupiah(trade.totalBuyInIdr)}</td>
                  <td>
                    {trade.currentPriceInIdr > 0 ? (
                      <div style={blurStyle}>
                        <div className={trade.floatingPnLIdr >= 0 ? 'text-profit' : 'text-loss'} style={{ fontWeight: 600 }}>
                          {trade.floatingPnLIdr > 0 ? '+' : ''}{formatRupiah(trade.floatingPnLIdr)}
                        </div>
                        <div className={trade.floatingPnLIdr >= 0 ? 'text-profit' : 'text-loss'} style={{ fontSize: '0.8rem' }}>
                          {(trade.floatingPnLPercent || 0).toFixed(2)}%
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
              {sortedOpenTrades.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                    Tidak ada posisi terbuka di dompet manapun.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
