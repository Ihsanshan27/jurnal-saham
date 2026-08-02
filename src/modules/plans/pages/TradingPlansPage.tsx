import { FileText, BarChart, AlertTriangle, Save, Clipboard } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import { calculatePortfolioBalance } from '@/modules/trades/calculations';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import { formatRupiah, formatUSD } from '@/modules/shared/utils/formatters';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import { useTableSort } from '@/modules/shared/hooks/useTableSort';
import { useTranslation } from '@/modules/shared/i18n/useTranslation';
import CustomSelect from '@/modules/shared/components/CustomSelect';
import * as Icons from 'lucide-react';

export default function TradingPlansPage() {
  const {
    tradingPlans,
    addTradingPlan,
    updateTradingPlan,
    deleteTradingPlan,
    portfolios,
    activePortfolioId,
    trades,
    cashflows,
    dividends,
    settings,
    canWrite,
    marketPrices,
    fetchLivePrices
  } = useData();
  const { t } = useTranslation();
  
  useEffect(() => {
    const codes = [...new Set(tradingPlans.map((p: any) => p.market === 'US' ? `${p.stockCode}.US` : p.stockCode))].filter(Boolean);
    if (codes.length > 0 && fetchLivePrices) {
      fetchLivePrices(codes);
    }
  }, [tradingPlans]); // fetch once when plans change
  
  const getRecommendation = (plan: any, currentPrice: number | undefined) => {
    const price = currentPrice || 0;
    const { entryPrice, stopLoss, targetProfit } = plan;

    if (price <= 0) return { text: t('plans.status.waiting'), color: 'var(--text-secondary)', bg: 'var(--bg-input)' };
    
    // Stop Loss Hit
    if (price <= stopLoss) {
      return { text: t('plans.status.cut'), color: 'var(--accent-red)', bg: 'var(--accent-red-dim)' };
    }
    
    // Buy Area (1% below to 2% above entry)
    const lowerBuy = entryPrice * 0.99;
    const upperBuy = entryPrice * 1.02;
    if (price >= lowerBuy && price <= upperBuy) {
      return { text: t('plans.status.buyArea'), color: 'var(--accent-blue)', bg: 'var(--accent-blue-dim)' };
    }
    
    // Take Profit Hit
    if (price >= targetProfit) {
      return { text: t('plans.status.takeProfit'), color: 'var(--accent-green)', bg: 'var(--accent-green-dim)' };
    }
    
    // Almost Take Profit (95% to TP)
    const almostTp = entryPrice + ((targetProfit - entryPrice) * 0.95);
    if (price >= almostTp && price < targetProfit) {
      return { text: t('plans.status.readyTp'), color: 'var(--accent-yellow)', bg: 'var(--accent-yellow-dim)' };
    }
    
    // Holding (Between buy area and almost TP)
    if (price > upperBuy && price < almostTp) {
      return { text: t('plans.status.hold'), color: 'var(--text-primary)', bg: 'rgba(148, 163, 184, 0.15)' };
    }
    
    return { text: t('plans.status.waitSee'), color: 'var(--text-secondary)', bg: 'var(--bg-input)' };
  };

  const navigate = useNavigate();
  const { alert, confirm } = useDialog();

  const DRAFT_KEY = 'trading_plan_form_draft';
  const DRAFT_OPEN_KEY = 'trading_plan_form_open';
  const EDIT_ID_KEY = 'trading_plan_edit_id';

  // Persist form state across navigation using sessionStorage
  const [showForm, setShowFormState] = useState<boolean>(
    () => sessionStorage.getItem(DRAFT_OPEN_KEY) === 'true'
  );

  const [editingId, setEditingIdState] = useState<string | null>(
    () => sessionStorage.getItem(EDIT_ID_KEY)
  );

  const setEditingId = (id: string | null) => {
    setEditingIdState(id);
    if (id) {
      sessionStorage.setItem(EDIT_ID_KEY, id);
    } else {
      sessionStorage.removeItem(EDIT_ID_KEY);
    }
  };

  const [form, setFormState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      return saved ? JSON.parse(saved) : {
        stockCode: '',
        market: 'ID',
        entryPrice: '',
        stopLoss: '',
        targetProfit: '',
        riskPercent: settings.defaultRiskPercent || 2,
        portfolioId: activePortfolioId || 'default',
        reason: '',
        planDate: new Date().toISOString().split('T')[0],
      };
    } catch {
      return {
        stockCode: '',
        market: 'ID',
        entryPrice: '',
        stopLoss: '',
        targetProfit: '',
        riskPercent: settings.defaultRiskPercent || 2,
        portfolioId: activePortfolioId || 'default',
        reason: '',
        planDate: new Date().toISOString().split('T')[0],
      };
    }
  });

  const setShowForm = (v: boolean) => {
    setShowFormState(v);
    sessionStorage.setItem(DRAFT_OPEN_KEY, String(v));
  };

  const set = (key: string, value: any) => setFormState(prev => {
    const next = { ...prev, [key]: value };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    return next;
  });

  const clearDraft = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(DRAFT_OPEN_KEY);
    sessionStorage.removeItem(EDIT_ID_KEY);
    setEditingIdState(null);
    setFormState({
      stockCode: '',
      market: 'ID',
      entryPrice: '',
      stopLoss: '',
      targetProfit: '',
      riskPercent: settings.defaultRiskPercent || 2,
      portfolioId: activePortfolioId || 'default',
      reason: '',
      planDate: new Date().toISOString().split('T')[0],
    });
    setShowFormState(false);
  };

  const activePort = portfolios.find(p => p.id === form.portfolioId) || portfolios[0] || { id: 'default', name: 'Utama' };

  // Calculate Buying Power for risk calculations
  const buyingPower = useMemo(() => {
    const pTrades = trades.filter((t: any) => (t.portfolioId || 'default') === activePort.id);
    const pCashflows = cashflows.filter((c: any) => (c.portfolioId || 'default') === activePort.id);
    const pDividends = dividends.filter((d: any) => (d.portfolioId || 'default') === activePort.id);

    const isUS = form.market === 'US';
    const initialCap = activePort.id === 'default' ? (isUS ? (settings.initialCapitalUS ?? 1000) : (settings.initialCapital ?? 10000000)) : 0;

    const stats = calculatePortfolioBalance(
      pTrades.filter((t: any) => isUS ? t.market === 'US' : t.market !== 'US'),
      pCashflows.filter((c: any) => isUS ? c.market === 'US' : c.market !== 'US'),
      pDividends.filter((d: any) => isUS ? d.market === 'US' : d.market !== 'US'),
      initialCap
    );
    return stats.buyingPower;
  }, [trades, cashflows, dividends, activePort.id, form.market, settings]);

  // Real-time calculations
  const entry = parseFloat(form.entryPrice) || 0;
  const sl = parseFloat(form.stopLoss) || 0;
  const tp = parseFloat(form.targetProfit) || 0;
  const riskPct = parseFloat(form.riskPercent as any) || 0;

  const riskPerShare = entry - sl;
  const rewardPerShare = tp - entry;

  const rrRatio = riskPerShare > 0 && rewardPerShare > 0 ? (rewardPerShare / riskPerShare) : 0;
  
  // Modal yang dialokasikan (Capital Allocation)
  const allocatedCapital = Math.min(buyingPower * (riskPct / 100), buyingPower);

  const rawShares = entry > 0 ? (allocatedCapital / entry) : 0;
  
  const isUS = form.market === 'US';
  const calculatedLots = isUS ? rawShares : Math.floor(rawShares / 100);
  const actualShares = isUS ? calculatedLots : calculatedLots * 100;
  const requiredCapital = actualShares * entry;
  const actualRiskAmount = actualShares * riskPerShare;

  const formatMoney = isUS ? formatUSD : formatRupiah;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.stockCode || !form.entryPrice || !form.stopLoss || !form.targetProfit) {
      await alert('Mohon isi semua field yang wajib.', {
        title: 'Formulir Belum Lengkap',
        severity: 'warning'
      });
      return;
    }
    if (sl >= entry) {
      await alert('Stop Loss harus lebih rendah dari harga Entry.', {
        title: 'Validasi Rencana',
        severity: 'warning'
      });
      return;
    }
    if (tp <= entry) {
      await alert('Target Profit harus lebih tinggi dari harga Entry.', {
        title: 'Validasi Rencana',
        severity: 'warning'
      });
      return;
    }

    const payload = {
      ...form,
      stockCode: form.stockCode.toUpperCase(),
      entryPrice: entry,
      stopLoss: sl,
      targetProfit: tp,
      riskPercent: riskPct,
      lots: parseFloat(calculatedLots.toFixed(2)),
      rrRatio: parseFloat(rrRatio.toFixed(2)),
      requiredCapital: parseFloat(requiredCapital.toFixed(2)),
    };

    if (editingId) {
      updateTradingPlan(editingId, payload);
    } else {
      addTradingPlan(payload);
    }

    clearDraft();
  };

  const handleEdit = (plan: any) => {
    setEditingId(plan.id);
    setFormState({
      stockCode: plan.stockCode || '',
      market: plan.market || 'ID',
      entryPrice: plan.entryPrice ? String(plan.entryPrice) : '',
      stopLoss: plan.stopLoss ? String(plan.stopLoss) : '',
      targetProfit: plan.targetProfit ? String(plan.targetProfit) : '',
      riskPercent: plan.riskPercent != null ? plan.riskPercent : (settings.defaultRiskPercent || 2),
      portfolioId: plan.portfolioId || activePortfolioId || 'default',
      reason: plan.reason || '',
      planDate: plan.planDate || new Date().toISOString().split('T')[0],
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConvert = (plan: any) => {
    // Navigate to new trade form with prefilled plan state
    navigate('/trades/new', { state: { plan } });
  };

  const blurStyle = usePrivacyStyle();
  const { sortConfig, sortedItems: sortedTradingPlans, requestSort } = useTableSort(tradingPlans, {
    initialKey: 'createdAt',
    initialDirection: 'desc',
    getValue: (plan: any, key: string) => plan[key] || '',
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const totalPages = Math.ceil(sortedTradingPlans.length / itemsPerPage);
  
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedPlans = sortedTradingPlans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"> {t('plans.title')}</h1>
          <p className="page-subtitle">{t('plans.subtitle')}</p>
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={() => {
            if (showForm) clearDraft();
            else setShowForm(true);
          }}>
            {showForm ? <Icons.X size={16} /> : <Icons.Plus size={16} />}
            {showForm ? t('common.cancel') : t('plans.newBtn')}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3 className="card-title">{editingId ? t('plans.form.edit') : t('plans.form.add')}</h3></div>
          <div className="card-body">
            <form onSubmit={handleAdd}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('plans.form.market')}</label>
                  <CustomSelect
                    value={form.market}
                    onChange={(value) => set('market', value)}
                    options={[
                      { value: 'ID', label: t('plans.form.marketID') },
                      { value: 'US', label: t('plans.form.marketUS') }
                    ]}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('plans.form.date')}</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.planDate}
                    onChange={e => set('planDate', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('plans.form.code')} *</label>
                  <input
                    className="form-input"
                    placeholder="BBCA"
                    value={form.stockCode}
                    onChange={e => set('stockCode', e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('plans.form.portfolio')}</label>
                  <CustomSelect
                    value={form.portfolioId}
                    onChange={(value) => set('portfolioId', value)}
                    options={portfolios.map((p) => ({ value: p.id, label: p.name }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('plans.form.entry')} *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="8500"
                    value={form.entryPrice}
                    onChange={e => set('entryPrice', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('plans.form.sl')} *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="8000"
                    value={form.stopLoss}
                    onChange={e => set('stopLoss', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('plans.form.tp')} *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="9500"
                    value={form.targetProfit}
                    onChange={e => set('targetProfit', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('plans.form.riskPct')}</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={form.riskPercent}
                    onChange={e => set('riskPercent', e.target.value)}
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {t('plans.form.buyingPower')}: <span style={blurStyle}>{formatMoney(buyingPower)}</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('plans.form.reason')}</label>
                  <textarea
                    className="form-textarea"
                    placeholder={t('plans.form.reasonPlaceholder')}
                    value={form.reason}
                    onChange={e => set('reason', e.target.value)}
                    style={{ minHeight: 42 }}
                  />
                </div>
              </div>

              {/* Position Preview */}
              {entry > 0 && sl > 0 && tp > 0 && (
                <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}> {t('plans.preview.title')}</h4>
                  <div className="form-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t('plans.preview.rr')}</div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: rrRatio >= 2 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                        1 : {rrRatio.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t('plans.preview.allocation')} ({form.riskPercent}%)</div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-blue)', ...blurStyle }}>
                        {formatMoney(allocatedCapital)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t('plans.preview.qty')}</div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        {calculatedLots.toFixed(2)} {isUS ? t('plans.preview.shares') : t('plans.preview.lots')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t('plans.preview.risk')}</div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-red)', ...blurStyle }}>
                        {formatMoney(actualRiskAmount)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t('plans.preview.capital')}</div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', ...blurStyle }}>
                        {formatMoney(requiredCapital)}
                      </div>
                    </div>
                  </div>
                  {requiredCapital > allocatedCapital && (
                    <div style={{ color: 'var(--accent-yellow)', fontSize: '0.75rem', marginTop: 10, fontWeight: 500 }}>
                      ⚠️ {t('plans.preview.warning')}
                    </div>
                  )}
                </div>
              )}

              <button type="submit" className="btn btn-primary"> {t('plans.form.save')}</button>
            </form>
          </div>
        </div>
      )}

      {/* Plan list */}
      {tradingPlans.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Clipboard size={16} /> </div>
          <div className="empty-state-title">{t('plans.empty.title')}</div>
          <div className="empty-state-desc">{t('plans.empty.desc')}</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>{t('common.no')}</th>
                <th><SortableTableHeader label={t('plans.table.code')} sortKey="stockCode" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label={t('plans.table.date')} sortKey="planDate" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label={t('plans.table.market')} sortKey="market" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label={t('plans.table.entry')} sortKey="entryPrice" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label={t('plans.table.sl')} sortKey="stopLoss" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label={t('plans.table.tp')} sortKey="targetProfit" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label={t('plans.table.rr')} sortKey="rrRatio" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th>{t('plans.table.currentPrice')}</th>
                <th>{t('plans.table.status')}</th>
                <th><SortableTableHeader label={t('plans.table.lots')} sortKey="lots" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label={t('plans.table.capital')} sortKey="requiredCapital" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label={t('plans.table.note')} sortKey="reason" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th style={{ width: 140 }}>{t('common.action')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPlans.map((plan: any, index: number) => {
                const planIsUS = plan.market === 'US';
                const fMoney = planIsUS ? formatUSD : formatRupiah;
                return (
                  <tr key={plan.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td><strong>{plan.stockCode}</strong></td>
                    <td style={{ fontSize: '0.85rem' }}>{plan.planDate ? new Date(plan.planDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                    <td><span className={`badge ${planIsUS ? 'badge-blue' : 'badge-green'}`}>{plan.market || 'ID'}</span></td>
                    <td>{fMoney(plan.entryPrice)}</td>
                    <td className="text-loss">{fMoney(plan.stopLoss)}</td>
                    <td className="text-profit">{fMoney(plan.targetProfit)}</td>
                    <td style={{ fontWeight: 600 }}>1 : {plan.rrRatio}</td>
                    <td>
                      {marketPrices[plan.stockCode] ? (
                        <span style={{ fontWeight: 600 }}>{fMoney(marketPrices[plan.stockCode])}</span>
                      ) : '-'}
                    </td>
                    <td>
                      {(() => {
                        const rec = getRecommendation(plan, marketPrices[plan.stockCode]);
                        return (
                          <span style={{ 
                            color: rec.color, 
                            fontWeight: 600, 
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            background: rec.bg,
                            borderRadius: '12px'
                          }}>
                            {rec.text}
                          </span>
                        );
                      })()}
                    </td>
                    <td>{plan.lots} {planIsUS ? t('plans.preview.shares') : t('plans.preview.lots')}</td>
                    <td style={blurStyle}>{fMoney(plan.requiredCapital)}</td>
                    <td style={{ maxWidth: 180, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{plan.reason || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {canWrite && (
                          <>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleConvert(plan)}
                              title="Konversi rencana ini ke transaksi nyata"
                              style={{ padding: '4px 8px', fontSize: '0.75rem', height: 26 }}
                            >
                              {t('plans.btn.openTrade')}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleEdit(plan)}
                              title="Edit rencana trading ini"
                              style={{ padding: '4px 6px', height: 26 }}
                            >
                              <Icons.Edit2 size={14} />
                            </button>
                          </>
                        )}
                        <button
                          className="btn btn-ghost btn-sm text-loss"
                          onClick={async () => {
                            const isConfirmed = await confirm(t('plans.delete.confirm'), {
                              title: t('plans.delete.title'),
                              severity: 'danger',
                              confirmText: t('common.delete')
                            });
                            if (isConfirmed) {
                              deleteTradingPlan(plan.id);
                            }
                          }}
                          style={{ padding: '4px 6px', height: 26 }}
                        >
                          <Icons.Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t('plans.pagination.show')}</span>
              <select 
                className="form-input" 
                style={{ width: 64, padding: '4px 8px', height: 30, fontSize: '0.85rem' }}
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button 
                className="btn btn-ghost btn-sm" 
                disabled={currentPage <= 1} 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Halaman {currentPage} dari {Math.max(1, totalPages)}
              </span>
              <button 
                className="btn btn-ghost btn-sm" 
                disabled={currentPage >= totalPages || totalPages === 0} 
                onClick={() => setCurrentPage(p => Math.min(Math.max(1, totalPages), p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
