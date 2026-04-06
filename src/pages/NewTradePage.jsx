import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { STRATEGIES, EMOTIONS } from '../utils/constants';

export default function NewTradePage() {
  const { addTrade, settings } = useData();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    stockCode: '',
    dateBuy: '',
    dateSell: '',
    buyPrice: '',
    sellPrice: '',
    lots: '',
    buyFee: settings.defaultBuyFee || 0.15,
    sellFee: settings.defaultSellFee || 0.25,
    strategy: '',
    reasonEntry: '',
    reasonExit: '',
    emotion: '',
    rating: 0,
    notes: '',
  });

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.stockCode || !form.dateBuy || !form.buyPrice || !form.lots) {
      alert('Kode saham, tanggal beli, harga beli, dan jumlah lot wajib diisi');
      return;
    }
    addTrade({
      ...form,
      stockCode: form.stockCode.toUpperCase(),
      buyPrice: parseFloat(form.buyPrice),
      sellPrice: form.sellPrice ? parseFloat(form.sellPrice) : null,
      lots: parseInt(form.lots),
      buyFee: parseFloat(form.buyFee),
      sellFee: parseFloat(form.sellFee),
      rating: form.rating,
    });
    navigate('/trades');
  };

  // Auto-calc preview
  const lots = parseInt(form.lots) || 0;
  const buyPrice = parseFloat(form.buyPrice) || 0;
  const sellPrice = parseFloat(form.sellPrice) || 0;
  const shares = lots * 100;
  const totalBuy = buyPrice * shares;
  const totalSell = sellPrice * shares;
  const buyComm = totalBuy * (parseFloat(form.buyFee) / 100);
  const sellComm = totalSell * (parseFloat(form.sellFee) / 100);
  const pnl = sellPrice ? totalSell - totalBuy - buyComm - sellComm : 0;
  const pnlPct = totalBuy > 0 ? (pnl / totalBuy) * 100 : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📝 Catat Transaksi Baru</h1>
          <p className="page-subtitle">Catat detail transaksi trading Anda</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/trades')}>← Kembali</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Left: Form */}
          <div>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><h3 className="card-title">Detail Transaksi</h3></div>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Kode Saham *</label>
                    <input
                      className="form-input"
                      placeholder="Contoh: BBCA"
                      value={form.stockCode}
                      onChange={e => set('stockCode', e.target.value.toUpperCase())}
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jumlah Lot *</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Contoh: 10"
                      value={form.lots}
                      onChange={e => set('lots', e.target.value)}
                      min="1"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tanggal Beli *</label>
                    <input type="date" className="form-input" value={form.dateBuy} onChange={e => set('dateBuy', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal Jual</label>
                    <input type="date" className="form-input" value={form.dateSell} onChange={e => set('dateSell', e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Harga Beli (per lembar) *</label>
                    <input type="number" className="form-input" placeholder="Contoh: 8500" value={form.buyPrice} onChange={e => set('buyPrice', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Harga Jual (per lembar)</label>
                    <input type="number" className="form-input" placeholder="Kosongkan jika masih hold" value={form.sellPrice} onChange={e => set('sellPrice', e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Fee Beli (%)</label>
                    <input type="number" className="form-input" step="0.01" value={form.buyFee} onChange={e => set('buyFee', e.target.value)} />
                  </div>
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
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Strategi</label>
                    <select className="form-select" value={form.strategy} onChange={e => set('strategy', e.target.value)}>
                      <option value="">Pilih strategi...</option>
                      {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Emosi</label>
                    <select className="form-select" value={form.emotion} onChange={e => set('emotion', e.target.value)}>
                      <option value="">Pilih emosi...</option>
                      {EMOTIONS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Alasan Entry</label>
                  <textarea className="form-textarea" placeholder="Kenapa beli saham ini?" value={form.reasonEntry} onChange={e => set('reasonEntry', e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Alasan Exit</label>
                  <textarea className="form-textarea" placeholder="Kenapa jual saham ini?" value={form.reasonExit} onChange={e => set('reasonExit', e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Rating Trade (1-5)</label>
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map(n => (
                      <span
                        key={n}
                        className={`star ${form.rating >= n ? 'filled' : ''}`}
                        onClick={() => set('rating', form.rating === n ? 0 : n)}
                      >★</span>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Catatan Tambahan</label>
                  <textarea className="form-textarea" placeholder="Lessons learned, catatan lain..." value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <div>
            <div className="card" style={{ position: 'sticky', top: 'calc(var(--header-height) + 24px)' }}>
              <div className="card-header"><h3 className="card-title">📊 Preview Kalkulasi</h3></div>
              <div className="card-body">
                <div className="calc-result" style={{ marginTop: 0, background: 'transparent', border: 'none', padding: 0 }}>
                  <div className="calc-result-row">
                    <span className="calc-result-label">Kode Saham</span>
                    <span className="calc-result-value">{form.stockCode || '-'}</span>
                  </div>
                  <div className="calc-result-row">
                    <span className="calc-result-label">Jumlah Lembar</span>
                    <span className="calc-result-value">{shares.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="calc-result-row">
                    <span className="calc-result-label">Total Beli</span>
                    <span className="calc-result-value">Rp {totalBuy.toLocaleString('id-ID')}</span>
                  </div>
                  {sellPrice > 0 && (
                    <>
                      <div className="calc-result-row">
                        <span className="calc-result-label">Total Jual</span>
                        <span className="calc-result-value">Rp {totalSell.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="calc-result-row">
                        <span className="calc-result-label">Total Fee</span>
                        <span className="calc-result-value">Rp {Math.round(buyComm + sellComm).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="calc-result-row" style={{ borderBottom: 'none', paddingTop: 16 }}>
                        <span className="calc-result-label" style={{ fontSize: '1rem', fontWeight: 600 }}>Profit/Loss</span>
                        <div style={{ textAlign: 'right' }}>
                          <div className={`calc-result-value big ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {pnl >= 0 ? '+' : ''}Rp {Math.round(pnl).toLocaleString('id-ID')}
                          </div>
                          <div className={`${pnl >= 0 ? 'text-profit' : 'text-loss'}`} style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  {!sellPrice && buyPrice > 0 && (
                    <div style={{ padding: '16px 0 0', color: 'var(--accent-yellow)', fontSize: '0.85rem' }}>
                      ⏳ Posisi masih terbuka (belum ada harga jual)
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }}>
                💾 Simpan Transaksi
              </button>
              <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('/trades')}>
                Batal
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
