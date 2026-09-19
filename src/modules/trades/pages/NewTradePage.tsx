import { Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import { STRATEGIES, EMOTIONS } from '@/modules/shared/utils/constants';
import { formatRupiah, formatUSD } from '@/modules/shared/utils/formatters';
import { calculateTradePnL, getTradeQuantityLabel, getAggregatedOpenPositions } from '@/modules/trades/calculations';
import CustomSelect from '@/modules/shared/components/CustomSelect';
import CustomDatePicker from '@/modules/shared/components/CustomDatePicker';
import RichTextEditor from '@/modules/shared/components/RichTextEditor';
import CurrencyInput from '@/modules/shared/components/CurrencyInput';
import { format } from 'date-fns';

export default function NewTradePage() {
  const { addTrade, updateTrade, allTrades, settings, portfolios, activePortfolioId, tradeFormDraft, setTradeFormDraft, deleteTradingPlan } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const { alert, confirm } = useDialog();

  const [form, setForm] = useState(() => {
    if (tradeFormDraft) return tradeFormDraft;
    const plan = location.state?.plan;
    const action = location.state?.action;
    const trade = location.state?.trade;

    if (action === 'buy_existing' && trade) {
      return {
        tradeMode: 'BUY',
        selectedTradeId: trade.id,
        assetType: trade.assetType || 'stock',
        market: trade.market || 'ID',
        stockCode: trade.stockCode || '',
        dateBuy: new Date().toISOString().split('T')[0],
        dateSell: '',
        buyPrice: '',
        sellPrice: '',
        lots: '',
        buyFee: trade.market === 'US' ? (settings.defaultBuyFeeUS || 0) : (settings.defaultBuyFee || 0.15),
        sellFee: trade.market === 'US' ? (settings.defaultSellFeeUS || 0) : (settings.defaultSellFee || 0.25),
        strategy: trade.strategy || '',
        reasonEntry: '',
        reasonExit: '',
        emotion: '',
        rating: 0,
        tags: trade.tags ? trade.tags.join(', ') : '',
        notes: '',
        setupImageUrl: '',
        portfolioId: trade.portfolioId || activePortfolioId || 'default',
      };
    }

    if (action === 'sell_existing' && trade) {
      const compositeKey = `${trade.stockCode}_${trade.portfolioId || 'default'}_${trade.market || 'ID'}_${trade.assetType || 'stock'}`;
      return {
        tradeMode: 'SELL',
        selectedTradeId: compositeKey,
        assetType: trade.assetType || 'stock',
        market: trade.market || 'ID',
        stockCode: trade.stockCode || '',
        dateBuy: trade.dateBuy || '',
        dateSell: new Date().toISOString().split('T')[0],
        buyPrice: trade.buyPrice != null ? String(trade.buyPrice) : '',
        sellPrice: '',
        lots: trade.lots != null ? String(trade.lots) : '',
        buyFee: trade.buyFee || 0,
        sellFee: trade.market === 'US' ? (settings.defaultSellFeeUS || 0) : (settings.defaultSellFee || 0.25),
        strategy: trade.strategy || '',
        reasonEntry: trade.reasonEntry || '',
        reasonExit: '',
        emotion: '',
        rating: 0,
        tags: trade.tags ? trade.tags.join(', ') : '',
        notes: '',
        setupImageUrl: '',
        portfolioId: trade.portfolioId || activePortfolioId || 'default',
      };
    }

    return {
      tradeMode: 'BUY',
      selectedTradeId: '',
      assetType: 'stock',
      market: plan?.market || 'ID',
      stockCode: plan?.stockCode || '',
      dateBuy: plan?.createdAt ? plan.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
      dateSell: plan?.dateSell || '',
      buyPrice: plan?.entryPrice != null ? String(plan.entryPrice) : '',
      sellPrice: plan?.sellPrice != null && Number(plan.sellPrice) > 0 ? String(plan.sellPrice) : '',
      lots: plan?.lots != null ? String(plan.lots) : '',
      buyFee: settings.defaultBuyFee || 0.15,
      sellFee: settings.defaultSellFee || 0.25,
      strategy: plan?.strategy || '',
      reasonEntry: plan?.reason || '',
      reasonExit: '',
      emotion: '',
      rating: 0,
      tags: plan ? 'rencana-trading' : '',
      notes: '',
      setupImageUrl: '',
      portfolioId: plan?.portfolioId || activePortfolioId || 'default',
    };
  });

  const isLockedFromExisting = location.state?.action === 'buy_existing' || location.state?.action === 'sell_existing';

  useEffect(() => {
    setTradeFormDraft(form);
  }, [form, setTradeFormDraft]);

  const isFormDirty = () => {
    const plan = location.state?.plan;
    const initialForm = {
      assetType: 'stock',
      market: plan?.market || 'ID',
      stockCode: plan?.stockCode || '',
      buyPrice: plan?.entryPrice != null ? String(plan.entryPrice) : '',
      sellPrice: '',
      lots: plan?.lots != null ? String(plan.lots) : '',
      strategy: plan?.strategy || '',
      reasonEntry: plan?.reason || '',
      reasonExit: '',
      emotion: '',
      rating: 0,
      tags: plan ? 'rencana-trading' : '',
      notes: '',
      setupImageUrl: '',
      portfolioId: plan?.portfolioId || activePortfolioId || 'default',
    };

    return (
      form.market !== initialForm.market ||
      form.assetType !== initialForm.assetType ||
      form.stockCode !== initialForm.stockCode ||
      form.buyPrice !== initialForm.buyPrice ||
      form.sellPrice !== initialForm.sellPrice ||
      form.lots !== initialForm.lots ||
      form.strategy !== initialForm.strategy ||
      form.reasonEntry !== initialForm.reasonEntry ||
      form.reasonExit !== initialForm.reasonExit ||
      form.emotion !== initialForm.emotion ||
      form.rating !== initialForm.rating ||
      form.tags !== initialForm.tags ||
      form.notes !== initialForm.notes ||
      form.setupImageUrl !== initialForm.setupImageUrl ||
      form.portfolioId !== initialForm.portfolioId
    );
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (settings.behaviorDoubleConfirmExit && isFormDirty()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [settings.behaviorDoubleConfirmExit, form]);

  const handleCancel = async () => {
    if (settings.behaviorDoubleConfirmExit && isFormDirty()) {
      const isConfirmed = await confirm('Apakah Anda yakin ingin membatalkan transaksi ini? Data yang belum disimpan akan hilang.', {
        title: 'Batalkan Transaksi',
        confirmText: 'Ya, Batalkan',
        cancelText: 'Kembali',
        severity: 'warning'
      });
      if (!isConfirmed) {
        return;
      }
    }
    setTradeFormDraft(null);
    navigate('/trades');
  };

  const tradesOnDate = allTrades.filter((trade) => trade.dateBuy === form.dateBuy);
  const dailyLimitReached = settings.behaviorDailyTradeLimitEnabled && tradesOnDate.length >= (settings.behaviorDailyTradeLimit || 3);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.tradeMode === 'SELL') {
      if (!form.selectedTradeId || !form.dateSell || !form.sellPrice || !form.lots) {
        await alert('Posisi terbuka, tanggal jual, harga jual, dan jumlah lot wajib diisi', { title: 'Formulir Belum Lengkap', severity: 'warning' });
        return;
      }

      const [stockCode, portfolioId, market, assetType] = form.selectedTradeId.split('_');

      const openTradesToSell = allTrades
        .filter((t: any) => !t.sellPrice && !t.dateSell && t.stockCode === stockCode && (t.portfolioId || 'default') === portfolioId && t.market === market && (t.assetType || 'stock') === assetType)
        .sort((a: any, b: any) => new Date(a.dateBuy).getTime() - new Date(b.dateBuy).getTime());

      if (openTradesToSell.length === 0) return;

      const totalOpenLots = openTradesToSell.reduce((sum: number, t: any) => sum + t.lots, 0);
      let remainingSellLots = parseFloat(form.lots);

      if (remainingSellLots <= 0 || remainingSellLots > totalOpenLots) {
        await alert('Jumlah lot tidak valid atau melebihi jumlah lot yang dimiliki.', { title: 'Gagal Menyimpan', severity: 'warning' });
        return;
      }

      if (settings.behaviorRequireReason && !form.reasonExit?.trim()) {
        await alert('Penyimpanan diblokir: Anda wajib mengisi alasan exit.', { title: 'Gagal Menyimpan', severity: 'warning' });
        return;
      }

      if (remainingSellLots < totalOpenLots) {
        const isSplitConfirmed = await confirm(`Anda menjual ${remainingSellLots} dari ${totalOpenLots} lot. Sisa ${totalOpenLots - remainingSellLots} lot akan tetap terbuka. Lanjutkan?`, {
          title: 'Konfirmasi Jual Sebagian',
          confirmText: 'Ya, Lanjutkan',
          cancelText: 'Batal'
        });
        if (!isSplitConfirmed) return;
      }

      for (const openTrade of openTradesToSell) {
        if (remainingSellLots <= 0) break;
        
        if (remainingSellLots >= openTrade.lots) {
          // Full sell of this specific trade
          updateTrade(openTrade.id, {
            sellPrice: parseFloat(form.sellPrice),
            dateSell: form.dateSell,
            sellFee: parseFloat(form.sellFee),
            reasonExit: form.reasonExit,
            notes: openTrade.notes ? `${openTrade.notes}\n- Jual seluruh ${openTrade.lots} lot pada ${form.dateSell}` : `- Jual seluruh ${openTrade.lots} lot pada ${form.dateSell}`
          });
          remainingSellLots -= openTrade.lots;
        } else {
          // Partial sell of this specific trade
          const remainingOpenLots = openTrade.lots - remainingSellLots;
          
          addTrade({
            ...openTrade,
            id: undefined,
            lots: remainingSellLots,
            sellPrice: parseFloat(form.sellPrice),
            dateSell: form.dateSell,
            sellFee: parseFloat(form.sellFee),
            reasonExit: form.reasonExit,
            notes: openTrade.notes ? `${openTrade.notes}\n- Jual sebagian ${remainingSellLots} lot pada ${form.dateSell}` : `- Jual sebagian ${remainingSellLots} lot pada ${form.dateSell}`
          });

          updateTrade(openTrade.id, {
            lots: remainingOpenLots,
            notes: openTrade.notes ? `${openTrade.notes}\n- Sisa ${remainingOpenLots} lot setelah jual sebagian pada ${form.dateSell}` : `- Sisa ${remainingOpenLots} lot setelah jual sebagian pada ${form.dateSell}`
          });

          remainingSellLots = 0;
        }
      }

      setTradeFormDraft(null);
      navigate('/trades');
      return;
    }

    if (!form.stockCode || !form.dateBuy || !form.buyPrice || !form.lots) {
      await alert('Kode saham, tanggal beli, harga beli, dan jumlah wajib diisi', {
        title: 'Formulir Belum Lengkap',
        severity: 'warning'
      });
      return;
    }

    if (dailyLimitReached) {
      await alert(`Penyimpanan diblokir: Batas transaksi harian (${settings.behaviorDailyTradeLimit}) untuk tanggal ${form.dateBuy} telah tercapai.`, {
        title: 'Batas Harian Tercapai',
        severity: 'danger'
      });
      return;
    }

    if (settings.behaviorRequireStrategy && !form.strategy) {
      await alert('Penyimpanan diblokir: Anda wajib memilih strategi trading.', {
        title: 'Gagal Menyimpan',
        severity: 'warning'
      });
      return;
    }

    if (settings.behaviorRequireReason && !form.reasonEntry.trim()) {
      await alert('Penyimpanan diblokir: Anda wajib mengisi alasan entry.', {
        title: 'Gagal Menyimpan',
        severity: 'warning'
      });
      return;
    }

    if (settings.behaviorBlockNegativeEmotion && form.emotion && ['fearful', 'greedy', 'revenge', 'doubtful', 'fomo'].includes(form.emotion)) {
      await alert('Penyimpanan diblokir: Anda dilarang menyimpan transaksi saat terdeteksi emosi negatif.', {
        title: 'Gagal Menyimpan',
        severity: 'danger'
      });
      return;
    }

    const isMutualFund = form.assetType === 'mutual_fund';
    const isSBN = form.assetType === 'sbn';
    const isMutualFundOrSBN = isMutualFund || isSBN;
    const normalizedStockCode = isMutualFundOrSBN ? form.stockCode.trim() : form.stockCode.toUpperCase();
    
    // Trades are now always created as separate records to preserve transaction history.
    // Portfolio view will dynamically aggregate them.

    addTrade({
      ...form,
      assetType: form.assetType || 'stock',
      market: form.market,
      stockCode: form.assetType === 'mutual_fund' || form.assetType === 'sbn' ? form.stockCode.trim() : form.stockCode.toUpperCase(),
      buyPrice: parseFloat(form.buyPrice),
      sellPrice: form.sellPrice ? parseFloat(form.sellPrice) : null,
      lots: parseFloat(form.lots),
      buyFee: parseFloat(form.buyFee),
      sellFee: parseFloat(form.sellFee),
      rating: form.rating,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      setupImageUrl: form.setupImageUrl ? form.setupImageUrl.trim() : '',
    });

    const planId = location.state?.plan?.id;
    if (planId) {
      deleteTradingPlan(planId);
    }

    setTradeFormDraft(null);
    navigate('/trades');
  };

  const isUS = form.market === 'US';
  const isMutualFund = form.assetType === 'mutual_fund';
  const isSBN = form.assetType === 'sbn';
  const isMutualFundOrSBN = isMutualFund || isSBN;
  const lots = parseFloat(form.lots) || 0;
  const buyPrice = parseFloat(form.buyPrice) || 0;
  const sellPrice = parseFloat(form.sellPrice) || 0;
  const shares = isMutualFundOrSBN ? lots : (isUS ? lots : lots * 100);
  const totalBuy = buyPrice * shares;
  const totalSell = sellPrice * shares;
  const buyComm = totalBuy * (parseFloat(form.buyFee) / 100);
  const sellComm = totalSell * (parseFloat(form.sellFee) / 100);
  const pnl = sellPrice ? totalSell - totalBuy - buyComm - sellComm : 0;
  const pnlPct = totalBuy > 0 ? (pnl / totalBuy) * 100 : 0;

  const formatMoney = isUS ? formatUSD : formatRupiah;
  const capital = isUS ? (settings.initialCapitalUS ?? 1000) : (settings.initialCapital ?? 10000000);
  const maxPosVal = capital * ((settings.behaviorMaxPositionSizePercent ?? 20) / 100);
  const isOverSized = settings.behaviorMaxPositionSizeWarning && totalBuy > maxPosVal;
  const strategiesList = settings.customStrategies || STRATEGIES;
  const emotionsList = settings.customEmotions || EMOTIONS;
  const saveLabel = `Simpan Transaksi${dailyLimitReached ? ' (Diblokir)' : ''}`;
  const quantityLabel = getTradeQuantityLabel({ assetType: form.assetType, market: form.market });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catat Transaksi Baru</h1>
          <p className="page-subtitle">Catat detail transaksi trading Anda</p>
        </div>
        <button className="btn btn-ghost" onClick={handleCancel}>Kembali</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="floating-form-actions">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary" style={{ minWidth: 180 }} disabled={dailyLimitReached}>
              {saveLabel}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>
              Batal
            </button>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><h3 className="card-title">Detail Transaksi</h3></div>
              <div className="card-body">
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Tipe Transaksi</label>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="tradeMode"
                        checked={form.tradeMode !== 'SELL'}
                        onChange={() => setForm(prev => ({ ...prev, tradeMode: 'BUY' }))}
                        disabled={isLockedFromExisting}
                      />
                      Beli Baru / Average
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="tradeMode"
                        checked={form.tradeMode === 'SELL'}
                        onChange={() => setForm(prev => ({ ...prev, tradeMode: 'SELL', dateSell: prev.dateSell || new Date().toISOString().split('T')[0] }))}
                        disabled={isLockedFromExisting}
                      />
                      Jual (Tutup Posisi)
                    </label>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Pilih Portofolio</label>
                  <div style={{ pointerEvents: isLockedFromExisting ? 'none' : 'auto', opacity: isLockedFromExisting ? 0.6 : 1 }}>
                    <CustomSelect
                      value={form.portfolioId}
                      onChange={(value) => set('portfolioId', value)}
                      options={portfolios.map((p: any) => ({ value: p.id, label: p.name }))}
                      placeholder="Pilih portofolio..."
                    />
                  </div>
                </div>

                {form.tradeMode === 'SELL' ? (
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">Pilih Posisi Terbuka</label>
                    <div style={{ pointerEvents: isLockedFromExisting ? 'none' : 'auto', opacity: isLockedFromExisting ? 0.6 : 1 }}>
                      <CustomSelect
                        value={form.selectedTradeId || ''}
                        onChange={(val) => {
                          const aggregatedOpenTrades = getAggregatedOpenPositions(allTrades);
                          const t = aggregatedOpenTrades.find((trade: any) => `${trade.stockCode}_${trade.portfolioId || 'default'}_${trade.market || 'ID'}_${trade.assetType || 'stock'}` === val);
                          if (t) {
                            setForm(prev => ({
                              ...prev,
                              selectedTradeId: val,
                              stockCode: t.stockCode,
                              lots: String(t.lots),
                              portfolioId: t.portfolioId || 'default',
                              market: t.market,
                              assetType: t.assetType || 'stock'
                            }));
                          }
                        }}
                        options={[
                          { value: '', label: 'Pilih posisi terbuka...' },
                          ...getAggregatedOpenPositions(allTrades)
                             .filter((t: any) => t.portfolioId === (form.portfolioId || 'default'))
                             .map((t: any) => ({ 
                               value: `${t.stockCode}_${t.portfolioId || 'default'}_${t.market || 'ID'}_${t.assetType || 'stock'}`, 
                               label: `${t.stockCode} - ${t.lots} ${getTradeQuantityLabel(t)} @ ${formatMoney(t.buyPrice)}` 
                             }))
                        ]}
                      />
                    </div>
                  </div>
                ) : null}

                {form.tradeMode === 'BUY' && (
                  <>
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label">Jenis Aset</label>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="assetType"
                        checked={form.assetType !== 'mutual_fund'}
                        onChange={() => {
                          setForm((prev) => ({
                            ...prev,
                            assetType: 'stock',
                            market: prev.market === 'US' ? 'US' : 'ID',
                            buyFee: prev.market === 'US' ? (settings.defaultBuyFeeUS || 0) : (settings.defaultBuyFee || 0.15),
                            sellFee: prev.market === 'US' ? (settings.defaultSellFeeUS || 0) : (settings.defaultSellFee || 0.25),
                          }));
                        }}
                        disabled={isLockedFromExisting}
                      />
                      Saham
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="assetType"
                        checked={form.assetType === 'mutual_fund'}
                        onChange={() => {
                          setForm((prev) => ({
                            ...prev,
                            assetType: 'mutual_fund',
                            // Do not force market to 'ID', allow both 'ID' and 'US' for mutual funds
                            buyFee: 0,
                            sellFee: 0,
                          }));
                        }}
                        disabled={isLockedFromExisting}
                      />
                      Reksadana
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="assetType"
                        checked={form.assetType === 'sbn'}
                        onChange={() => {
                          setForm((prev) => ({
                            ...prev,
                            assetType: 'sbn',
                            market: 'ID',
                            buyFee: 0,
                            sellFee: 0,
                          }));
                        }}
                        disabled={isLockedFromExisting}
                      />
                      SBN
                    </label>
                  </div>
                </div>
                  </>
                )}

                {form.tradeMode === 'BUY' && (
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">Pilih Pasar</label>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="market"
                        checked={form.market === 'ID'}
                        onChange={() => {
                          setForm((prev) => ({
                            ...prev,
                            market: 'ID',
                            buyFee: settings.defaultBuyFee || 0.15,
                            sellFee: settings.defaultSellFee || 0.25
                          }));
                        }}
                        disabled={isLockedFromExisting}
                      />
                      Indonesia (IDR)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="market"
                        checked={form.market === 'US'}
                        onChange={() => {
                          setForm((prev) => ({
                            ...prev,
                            market: 'US',
                            buyFee: settings.defaultBuyFeeUS || 0,
                            sellFee: settings.defaultSellFeeUS || 0
                          }));
                        }}
                        disabled={isLockedFromExisting}
                      />
                      Amerika (USD)
                    </label>
                  </div>
                  {isMutualFundOrSBN ? (
                    <div style={{ fontSize: '0.75rem', marginTop: 6, color: 'var(--text-muted)' }}>
                      {isSBN ? 'SBN dicatat dalam satuan unit.' : 'Reksadana dicatat dalam satuan unit.'}
                    </div>
                  ) : null}
                </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{isMutualFund ? 'Nama / Kode Reksadana *' : isSBN ? 'Seri SBN *' : 'Kode Saham *'}</label>
                    <input
                      className="form-input"
                      placeholder={isMutualFund ? 'Contoh: Sucorinvest Money Market Fund' : isSBN ? 'Contoh: SR019' : isUS ? 'Contoh: AAPL' : 'Contoh: BBCA'}
                      value={form.stockCode}
                      onChange={e => set('stockCode', isMutualFundOrSBN ? e.target.value : e.target.value.toUpperCase())}
                      style={isMutualFundOrSBN ? undefined : { textTransform: 'uppercase' }}
                      disabled={form.tradeMode === 'SELL' || isLockedFromExisting}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      {isMutualFundOrSBN ? 'Jumlah Unit *' : isUS ? 'Jumlah Lembar (Shares) *' : 'Jumlah Lot *'}
                    </label>
                    <input
                      type="number"
                      step={isMutualFundOrSBN || isUS ? 'any' : '1'}
                      className="form-input"
                      placeholder={isMutualFundOrSBN ? 'Contoh: 1250.45' : isUS ? 'Contoh: 1.5' : 'Contoh: 10'}
                      value={form.lots}
                      onChange={e => set('lots', e.target.value)}
                      min={isMutualFundOrSBN || isUS ? '0.0001' : '1'}
                    />
                  </div>
                </div>

                <div className="form-row">
                  {form.tradeMode === 'BUY' && (
                    <div className="form-group">
                      <label className="form-label">Tanggal Beli *</label>
                      <CustomDatePicker 
                        value={form.dateBuy} 
                        onChange={(date) => set('dateBuy', format(date, 'yyyy-MM-dd'))} 
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">{form.tradeMode === 'SELL' ? 'Tanggal Jual *' : 'Tanggal Jual'}</label>
                    <CustomDatePicker 
                      value={form.dateSell} 
                      onChange={(date) => set('dateSell', format(date, 'yyyy-MM-dd'))} 
                      placeholder="Belum dijual"
                    />
                  </div>
                </div>

                <div className="form-row">
                  {form.tradeMode === 'BUY' && (
                    <div className="form-group">
                      <label className="form-label">{isMutualFund ? 'NAB Beli per Unit *' : isSBN ? 'Harga Beli per Unit *' : 'Harga Beli (per lembar) *'}</label>
                      <CurrencyInput
                        market={form.market}
                        value={form.buyPrice}
                        onChange={val => set('buyPrice', val)}
                        placeholder={isMutualFund ? 'Contoh: 1287.35' : isSBN ? 'Contoh: 1000000' : isUS ? 'Contoh: 150.5' : 'Contoh: 8500'}
                      />
                      {totalBuy > 0 ? (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          Estimasi Total Beli: {formatMoney(totalBuy)}
                        </div>
                      ) : null}
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">{form.tradeMode === 'SELL' ? (isMutualFund ? 'NAB Jual per Unit *' : isSBN ? 'Harga Jual per Unit *' : 'Harga Jual (per lembar) *') : (isMutualFund ? 'NAB Jual per Unit' : isSBN ? 'Harga Jual per Unit' : 'Harga Jual (per lembar)')}</label>
                    <CurrencyInput
                      market={form.market}
                      value={form.sellPrice}
                      onChange={val => set('sellPrice', val)}
                      placeholder="Kosongkan jika masih hold"
                    />
                    {totalSell > 0 ? (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Estimasi Total Jual: {formatMoney(totalSell)}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="form-row">
                  {form.tradeMode === 'BUY' && (
                    <div className="form-group">
                      <label className="form-label">Fee Beli (%)</label>
                      <input type="number" className="form-input" step="0.01" value={form.buyFee} onChange={e => set('buyFee', e.target.value)} />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Fee Jual (%)</label>
                    <input type="number" className="form-input" step="0.01" value={form.sellFee} onChange={e => set('sellFee', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><h3 className="card-title">Analisis & Catatan</h3></div>
              <div className="card-body">
                {form.tradeMode === 'BUY' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Strategi</label>
                      <CustomSelect
                        value={form.strategy}
                        onChange={(value) => set('strategy', value)}
                        options={[
                          { value: '', label: 'Pilih strategi...' },
                          ...strategiesList.map((strategy: string) => ({ value: strategy, label: strategy }))
                        ]}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Emosi</label>
                      <CustomSelect
                        value={form.emotion}
                        onChange={(value) => set('emotion', value)}
                        options={[
                          { value: '', label: 'Pilih emosi...' },
                          ...emotionsList.map((emotion: any) => ({ value: emotion.value, label: emotion.label }))
                        ]}
                      />
                      {form.emotion && ['fearful', 'greedy', 'revenge', 'doubtful', 'fomo'].includes(form.emotion) && (settings.behaviorNegativeEmotionWarning || settings.behaviorBlockNegativeEmotion) ? (
                        <div style={{
                          marginTop: 6,
                          fontSize: '0.8rem',
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: settings.behaviorBlockNegativeEmotion ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: settings.behaviorBlockNegativeEmotion ? 'var(--accent-red)' : 'var(--accent-yellow)',
                          border: `1px solid ${settings.behaviorBlockNegativeEmotion ? 'var(--accent-red)' : 'var(--accent-yellow)'}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2
                        }}>
                          <strong>{settings.behaviorBlockNegativeEmotion ? 'Blokir Disiplin' : 'Kesadaran Emosi'}</strong>
                          <span>
                            {settings.behaviorBlockNegativeEmotion
                              ? 'Mode disiplin ketat aktif. Simpan diblokir karena terdeteksi emosi negatif.'
                              : `Peringatan: Anda trading saat merasa ${emotionsList.find((item) => item.value === form.emotion)?.label || form.emotion}. Tetap disiplin!`}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {form.tradeMode === 'BUY' && (
                  <div className="form-group">
                    <label className="form-label">Alasan Entry</label>
                    <RichTextEditor placeholder="Kenapa beli saham ini?" value={form.reasonEntry} onChange={val => set('reasonEntry', val)} minHeight="100px" />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Alasan Exit</label>
                  <RichTextEditor placeholder="Kenapa jual saham ini?" value={form.reasonExit} onChange={val => set('reasonExit', val)} minHeight="100px" />
                </div>

                <div className="form-group">
                  <label className="form-label">Rating Trade (1-5)</label>
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`star ${form.rating >= star ? 'filled' : ''}`}
                        onClick={() => set('rating', form.rating === star ? 0 : star)}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Custom Tags</label>
                  <input className="form-input" placeholder="Pisahkan dengan koma (contoh: bca, dividend)" value={form.tags} onChange={e => set('tags', e.target.value)} />
                </div>

                {form.tradeMode === 'BUY' && (
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">Tautan Gambar Setup Chart (URL)</label>
                    <input className="form-input" placeholder="Contoh: https://s3.tradingview.com/x/xxxxxx.png" value={form.setupImageUrl} onChange={e => set('setupImageUrl', e.target.value)} />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Catatan Tambahan</label>
                  <RichTextEditor placeholder="Lessons learned, catatan lain..." value={form.notes} onChange={val => set('notes', val)} minHeight="120px" />
                </div>
              </div>
            </div>

          </div>

          <div>
            <div className="card" style={{ position: 'sticky', top: 'calc(var(--header-height) + 24px)' }}>
              <div className="card-header"><h3 className="card-title">Preview Kalkulasi</h3></div>
              <div className="card-body">
                <div className="calc-result" style={{ marginTop: 0, background: 'transparent', border: 'none', padding: 0 }}>
                  <div className="calc-result-row">
                    <span className="calc-result-label">{isMutualFund ? 'Produk' : 'Kode Saham'}</span>
                    <span className="calc-result-value">{form.stockCode || '-'}</span>
                  </div>
                  <div className="calc-result-row">
                    <span className="calc-result-label">Jenis Aset</span>
                    <span className="calc-result-value">{isMutualFund ? 'Reksadana' : 'Saham'}</span>
                  </div>
                  <div className="calc-result-row">
                    <span className="calc-result-label">Jumlah {quantityLabel}</span>
                    <span className="calc-result-value">
                      {shares.toLocaleString(isMutualFund ? 'id-ID' : 'en-US', { maximumFractionDigits: 4 })}
                    </span>
                  </div>
                  <div className="calc-result-row">
                    <span className="calc-result-label">{isMutualFund ? 'NAB Beli per Unit' : isSBN ? 'Harga Beli per Unit' : 'Harga Beli per Lembar'}</span>
                    <span className="calc-result-value">{buyPrice > 0 ? formatMoney(buyPrice) : '-'}</span>
                  </div>
                  <div className="calc-result-row">
                    <span className="calc-result-label">Estimasi Total Beli</span>
                    <span className="calc-result-value">{formatMoney(totalBuy)}</span>
                  </div>
                  {sellPrice > 0 ? (
                    <>
                      <div className="calc-result-row">
                        <span className="calc-result-label">{isMutualFund ? 'NAB Jual per Unit' : isSBN ? 'Harga Jual per Unit' : 'Harga Jual per Lembar'}</span>
                        <span className="calc-result-value">{formatMoney(sellPrice)}</span>
                      </div>
                      <div className="calc-result-row">
                        <span className="calc-result-label">Estimasi Total Jual</span>
                        <span className="calc-result-value">{formatMoney(totalSell)}</span>
                      </div>
                      <div className="calc-result-row">
                        <span className="calc-result-label">Total Fee</span>
                        <span className="calc-result-value">{formatMoney(buyComm + sellComm)}</span>
                      </div>
                      <div className="calc-result-row" style={{ borderBottom: 'none', paddingTop: 16 }}>
                        <span className="calc-result-label" style={{ fontSize: '1rem', fontWeight: 600 }}>Profit/Loss</span>
                        <div style={{ textAlign: 'right' }}>
                          <div className={`calc-result-value big ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {pnl >= 0 ? '+' : ''}{formatMoney(pnl)}
                          </div>
                          <div className={`${pnl >= 0 ? 'text-profit' : 'text-loss'}`} style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}
                  {!sellPrice && buyPrice > 0 ? (
                    <div style={{ padding: '16px 0 0', color: 'var(--accent-yellow)', fontSize: '0.85rem' }}>
                      Posisi masih terbuka (belum ada harga jual)
                    </div>
                  ) : null}
                  {isOverSized ? (
                    <div style={{
                      marginTop: 16,
                      fontSize: '0.8rem',
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: 'var(--accent-yellow)',
                      border: '1px solid var(--accent-yellow)',
                    }}>
                      <strong>Ukuran Posisi Tinggi</strong>: Pembelian ({formatMoney(totalBuy)}) melebihi {settings.behaviorMaxPositionSizePercent}% dari modal awal ({formatMoney(capital)}).
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {dailyLimitReached ? (
              <div style={{
                marginTop: 20,
                fontSize: '0.85rem',
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--accent-red)',
                border: '1px solid var(--accent-red)',
              }}>
                <strong>Batas Transaksi Tercapai</strong>: Anda telah mencatat {tradesOnDate.length} transaksi pada tanggal {form.dateBuy}. Batas harian Anda adalah {settings.behaviorDailyTradeLimit}. Simpan transaksi baru diblokir.
              </div>
            ) : null}
          </div>
        </div>

        <div className="mobile-sticky-actions">
          <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={dailyLimitReached}>
            {saveLabel}
          </button>
          <button type="button" className="btn btn-secondary btn-lg" onClick={handleCancel}>
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
