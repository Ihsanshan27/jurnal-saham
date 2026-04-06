import { useState } from 'react';
import { calcProfitLoss, calcBrokerFee, calcAveragePrice, calcPositionSize, calcTargetPrice } from '../utils/calculations';
import { formatRupiah } from '../utils/formatters';

const TABS = [
  { id: 'pnl', label: '💰 Profit/Loss', icon: '💰' },
  { id: 'fee', label: '🏦 Fee Broker', icon: '🏦' },
  { id: 'avg', label: '📊 Average', icon: '📊' },
  { id: 'position', label: '📐 Position Sizing', icon: '📐' },
  { id: 'target', label: '🎯 Target Harga', icon: '🎯' },
];

function ResultRow({ label, value, className, big }) {
  return (
    <div className="calc-result-row">
      <span className="calc-result-label">{label}</span>
      <span className={`calc-result-value ${big ? 'big' : ''} ${className || ''}`}>{value}</span>
    </div>
  );
}

function PnLCalculator() {
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [lots, setLots] = useState('');
  const [buyFee, setBuyFee] = useState('0.15');
  const [sellFee, setSellFee] = useState('0.25');

  const bp = parseFloat(buyPrice) || 0;
  const sp = parseFloat(sellPrice) || 0;
  const l = parseInt(lots) || 0;
  const result = bp > 0 && sp > 0 && l > 0
    ? calcProfitLoss({ buyPrice: bp, sellPrice: sp, lots: l, buyFee: parseFloat(buyFee), sellFee: parseFloat(sellFee) })
    : null;

  const reset = () => { setBuyPrice(''); setSellPrice(''); setLots(''); };

  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Harga Beli (per lembar)</label>
          <input type="number" className="form-input" placeholder="8500" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Harga Jual (per lembar)</label>
          <input type="number" className="form-input" placeholder="9200" value={sellPrice} onChange={e => setSellPrice(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Jumlah Lot</label>
          <input type="number" className="form-input" placeholder="10" value={lots} onChange={e => setLots(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Fee Beli / Jual (%)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" className="form-input" step="0.01" value={buyFee} onChange={e => setBuyFee(e.target.value)} />
            <input type="number" className="form-input" step="0.01" value={sellFee} onChange={e => setSellFee(e.target.value)} />
          </div>
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={reset} style={{ marginBottom: 16 }}>🔄 Reset</button>
      {result && (
        <div className="calc-result">
          <ResultRow label="Jumlah Lembar" value={`${result.shares.toLocaleString('id-ID')}`} />
          <ResultRow label="Total Beli" value={formatRupiah(result.totalBuy)} />
          <ResultRow label="Total Jual" value={formatRupiah(result.totalSell)} />
          <ResultRow label="Fee Beli" value={formatRupiah(result.buyCommission)} />
          <ResultRow label="Fee Jual" value={formatRupiah(result.sellCommission)} />
          <ResultRow label="Total Fee" value={formatRupiah(result.totalFee)} />
          <ResultRow label="Profit / Loss" value={`${formatRupiah(result.pnl)} (${result.pnlPercent >= 0 ? '+' : ''}${result.pnlPercent.toFixed(2)}%)`} className={result.pnl >= 0 ? 'text-profit' : 'text-loss'} big />
        </div>
      )}
    </div>
  );
}

function FeeCalculator() {
  const [price, setPrice] = useState('');
  const [lots, setLots] = useState('');
  const [buyFeeP, setBuyFeeP] = useState('0.15');
  const [sellFeeP, setSellFeeP] = useState('0.15');
  const [ppn, setPpn] = useState('11');

  const p = parseFloat(price) || 0;
  const l = parseInt(lots) || 0;
  const result = p > 0 && l > 0
    ? calcBrokerFee({ price: p, lots: l, buyFeePercent: parseFloat(buyFeeP), sellFeePercent: parseFloat(sellFeeP), ppnPercent: parseFloat(ppn) })
    : null;

  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Harga Saham</label>
          <input type="number" className="form-input" placeholder="8500" value={price} onChange={e => setPrice(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Jumlah Lot</label>
          <input type="number" className="form-input" placeholder="10" value={lots} onChange={e => setLots(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Fee Beli (%)</label>
          <input type="number" className="form-input" step="0.01" value={buyFeeP} onChange={e => setBuyFeeP(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Fee Jual (%)</label>
          <input type="number" className="form-input" step="0.01" value={sellFeeP} onChange={e => setSellFeeP(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">PPN (%)</label>
          <input type="number" className="form-input" step="0.1" value={ppn} onChange={e => setPpn(e.target.value)} />
        </div>
      </div>
      {result && (
        <div className="calc-result">
          <ResultRow label="Nilai Transaksi" value={formatRupiah(result.totalValue)} />
          <div style={{ padding: '8px 0 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Biaya Beli</div>
          <ResultRow label="Komisi" value={formatRupiah(result.buyCommission)} />
          <ResultRow label="PPN" value={formatRupiah(result.buyPPN)} />
          <ResultRow label="Total Biaya Beli" value={formatRupiah(result.totalBuyFee)} />
          <div style={{ padding: '8px 0 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Biaya Jual</div>
          <ResultRow label="Komisi" value={formatRupiah(result.sellCommission)} />
          <ResultRow label="PPN" value={formatRupiah(result.sellPPN)} />
          <ResultRow label="PPh Final (0.1%)" value={formatRupiah(result.pphSell)} />
          <ResultRow label="Total Biaya Jual" value={formatRupiah(result.totalSellFee)} />
          <ResultRow label="TOTAL BIAYA" value={formatRupiah(result.totalFee)} className="text-loss" big />
        </div>
      )}
    </div>
  );
}

function AverageCalculator() {
  const [purchases, setPurchases] = useState([{ price: '', lots: '' }, { price: '', lots: '' }]);

  const addRow = () => setPurchases(p => [...p, { price: '', lots: '' }]);
  const removeRow = (i) => setPurchases(p => p.filter((_, idx) => idx !== i));
  const updateRow = (i, key, val) => {
    setPurchases(p => p.map((row, idx) => idx === i ? { ...row, [key]: val } : row));
  };

  const parsed = purchases.map(p => ({ price: parseFloat(p.price) || 0, lots: parseInt(p.lots) || 0 }));
  const hasData = parsed.some(p => p.price > 0 && p.lots > 0);
  const result = hasData ? calcAveragePrice(parsed) : null;

  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Masukkan daftar pembelian untuk menghitung harga rata-rata:
      </div>
      {purchases.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'end', marginBottom: 8 }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            {i === 0 && <label className="form-label">Harga</label>}
            <input type="number" className="form-input" placeholder="8500" value={p.price} onChange={e => updateRow(i, 'price', e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            {i === 0 && <label className="form-label">Lot</label>}
            <input type="number" className="form-input" placeholder="10" value={p.lots} onChange={e => updateRow(i, 'lots', e.target.value)} />
          </div>
          {purchases.length > 2 && (
            <button className="btn btn-ghost btn-icon" onClick={() => removeRow(i)} style={{ marginBottom: 2 }}>✕</button>
          )}
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" onClick={addRow} style={{ marginTop: 8 }}>➕ Tambah Pembelian</button>

      {result && (
        <div className="calc-result">
          <ResultRow label="Harga Rata-rata" value={`Rp ${Math.round(result.avgPrice).toLocaleString('id-ID')}`} className="text-profit" big />
          <ResultRow label="Total Lot" value={`${result.totalLots} lot`} />
          <ResultRow label="Total Lembar" value={`${result.totalShares.toLocaleString('id-ID')}`} />
          <ResultRow label="Total Investasi" value={formatRupiah(result.totalValue)} />
        </div>
      )}
    </div>
  );
}

function PositionSizeCalculator() {
  const [capital, setCapital] = useState('');
  const [risk, setRisk] = useState('2');
  const [entry, setEntry] = useState('');
  const [stopLoss, setStopLoss] = useState('');

  const c = parseFloat(capital) || 0;
  const r = parseFloat(risk) || 0;
  const ep = parseFloat(entry) || 0;
  const sl = parseFloat(stopLoss) || 0;
  const result = c > 0 && r > 0 && ep > 0 && sl > 0
    ? calcPositionSize({ capital: c, riskPercent: r, entryPrice: ep, stopLoss: sl })
    : null;

  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Modal Tersedia (Rp)</label>
          <input type="number" className="form-input" placeholder="10000000" value={capital} onChange={e => setCapital(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Risiko per Trade (%)</label>
          <input type="number" className="form-input" step="0.1" placeholder="2" value={risk} onChange={e => setRisk(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Harga Entry</label>
          <input type="number" className="form-input" placeholder="8500" value={entry} onChange={e => setEntry(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Harga Stop Loss</label>
          <input type="number" className="form-input" placeholder="8200" value={stopLoss} onChange={e => setStopLoss(e.target.value)} />
        </div>
      </div>
      {result && (
        <div className="calc-result">
          <ResultRow label="Jumlah Lot Ideal" value={`${result.lots} lot (${result.shares} lembar)`} className="text-profit" big />
          <ResultRow label="Total Investasi" value={formatRupiah(result.totalInvestment)} />
          <ResultRow label="Nilai Risiko" value={formatRupiah(result.riskAmount)} className="text-loss" />
          <ResultRow label="Risiko per Lembar" value={formatRupiah(result.riskPerShare)} />
        </div>
      )}
    </div>
  );
}

function TargetPriceCalculator() {
  const [buyPrice, setBuyPrice] = useState('');
  const [targetPct, setTargetPct] = useState('');
  const [buyFee, setBuyFee] = useState('0.15');
  const [sellFee, setSellFee] = useState('0.25');

  const bp = parseFloat(buyPrice) || 0;
  const tp = parseFloat(targetPct) || 0;
  const result = bp > 0 && tp !== 0
    ? calcTargetPrice({ buyPrice: bp, targetPercent: tp, buyFee: parseFloat(buyFee), sellFee: parseFloat(sellFee) })
    : null;

  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Harga Beli</label>
          <input type="number" className="form-input" placeholder="8500" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Target Profit (%)</label>
          <input type="number" className="form-input" step="0.1" placeholder="5" value={targetPct} onChange={e => setTargetPct(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Fee Beli (%)</label>
          <input type="number" className="form-input" step="0.01" value={buyFee} onChange={e => setBuyFee(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Fee Jual (%)</label>
          <input type="number" className="form-input" step="0.01" value={sellFee} onChange={e => setSellFee(e.target.value)} />
        </div>
      </div>
      {result && (
        <div className="calc-result">
          <ResultRow label="Harga Jual Target" value={`Rp ${Math.round(result.targetPrice).toLocaleString('id-ID')}`} className="text-profit" big />
          <ResultRow label="Estimasi Profit/Lot" value={formatRupiah(result.profitPerLot)} className={result.profitPerLot >= 0 ? 'text-profit' : 'text-loss'} />
          <ResultRow label="Fee per Lot" value={formatRupiah(result.feePerLot)} />
        </div>
      )}
    </div>
  );
}

export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState('pnl');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🧮 Kalkulator Saham</h1>
          <p className="page-subtitle">Hitung profit/loss, fee, average, dan position sizing</p>
        </div>
      </div>

      <div className="calc-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`calc-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          {activeTab === 'pnl' && <PnLCalculator />}
          {activeTab === 'fee' && <FeeCalculator />}
          {activeTab === 'avg' && <AverageCalculator />}
          {activeTab === 'position' && <PositionSizeCalculator />}
          {activeTab === 'target' && <TargetPriceCalculator />}
        </div>
      </div>
    </div>
  );
}
