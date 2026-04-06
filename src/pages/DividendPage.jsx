import { useState } from 'react';
import { useData } from '../context/DataContext';
import { formatRupiah, formatDate } from '../utils/formatters';

export default function DividendPage() {
  const { dividends, addDividend, deleteDividend } = useData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    stockCode: '',
    shareCount: '',
    dividendPerShare: '',
    cumDate: '',
    payDate: '',
    notes: ''
  });

  const totalDividendValue = dividends.reduce((s, d) => s + (d.totalAmount || 0), 0);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.stockCode || !form.shareCount || !form.dividendPerShare) return;
    
    const count = parseInt(form.shareCount) || 0;
    const dps = parseFloat(form.dividendPerShare) || 0;
    const total = count * dps;

    addDividend({
      ...form,
      stockCode: form.stockCode.toUpperCase(),
      shareCount: count,
      dividendPerShare: dps,
      totalAmount: total,
    });
    
    setForm({ stockCode: '', shareCount: '', dividendPerShare: '', cumDate: '', payDate: '', notes: '' });
    setShowForm(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Hapus rekam dividen ini?')) deleteDividend(id);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💰 Dividend Tracker</h1>
          <p className="page-subtitle">Pantau pasif income dari pembagian keuntungan saham Anda</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Batal' : '➕ Catat Dividen'}
        </button>
      </div>

      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--accent-green-dim)' }}>📈</div>
          <div className="stat-card-label">Total Dividen Diterima</div>
          <div className="stat-card-value text-profit">{formatRupiah(totalDividendValue)}</div>
          <div className="stat-card-change positive">Akan riil dan masuk ke Realized Equity</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--accent-purple-dim)' }}>🧾</div>
          <div className="stat-card-label">Jumlah Catatan Dividen</div>
          <div className="stat-card-value">{dividends.length} kali</div>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24, animation: 'fadeInUp 0.3s ease' }}>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Kode Saham *</label>
                  <input className="form-input" placeholder="BBCA" value={form.stockCode} onChange={e => set('stockCode', e.target.value.toUpperCase())} style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah Lembar Dimiliki *</label>
                  <input type="number" className="form-input" placeholder="1000" value={form.shareCount} onChange={e => set('shareCount', e.target.value)} />
                  <div style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--text-muted)' }}>1 lot = 100 lembar</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Dividen per Lembar (Rp) *</label>
                  <input type="number" className="form-input" step="0.1" placeholder="42.5" value={form.dividendPerShare} onChange={e => set('dividendPerShare', e.target.value)} />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Cum Date</label>
                  <input type="date" className="form-input" value={form.cumDate} onChange={e => set('cumDate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pay Date (Tgl Cair)</label>
                  <input type="date" className="form-input" value={form.payDate} onChange={e => set('payDate', e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Catatan Tambahan</label>
                <input className="form-input" placeholder="Dividen final 2025, buat beli cilok" value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>

              {parseInt(form.shareCount) > 0 && parseFloat(form.dividendPerShare) > 0 && (
                <div className="calc-result" style={{ marginBottom: 16 }}>
                  <div className="calc-result-row">
                    <span className="calc-result-label">Estimasi Total Dividen Diterima</span>
                    <span className="calc-result-value big text-profit">
                      {formatRupiah(parseInt(form.shareCount) * parseFloat(form.dividendPerShare))}
                    </span>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary">💾 Simpan Catatan Dividen</button>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3 className="card-title">Riwayat Penerimaan Dividen</h3></div>
        {dividends.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-state-icon">💰</div>
            <div className="empty-state-title">Belum ada rekam dividen</div>
            <div className="empty-state-desc">Catat setiap dividen yang Anda terima untuk membuktikan efektivitas passive income Anda!</div>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', margin: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Kode Saham</th>
                  <th>Lembar</th>
                  <th>Rp / Lembar</th>
                  <th>Total Diterima</th>
                  <th>Cum Date</th>
                  <th>Pay Date</th>
                  <th>Catatan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {dividends.sort((a,b) => new Date(b.payDate || b.createdAt) - new Date(a.payDate || a.createdAt)).map(div => (
                  <tr key={div.id}>
                    <td><strong>{div.stockCode}</strong></td>
                    <td>{div.shareCount.toLocaleString('id-ID')}</td>
                    <td>{formatRupiah(div.dividendPerShare)}</td>
                    <td style={{ fontWeight: 600 }} className="text-profit">
                      +{formatRupiah(div.totalAmount)}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{div.cumDate ? formatDate(div.cumDate) : '-'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{div.payDate ? formatDate(div.payDate) : '-'}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{div.notes || '-'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(div.id)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
